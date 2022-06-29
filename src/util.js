import * as core from "@actions/core";
import * as github from "@actions/github";
import minimatch from "minimatch";

function parseCSV(value) {
  if (value.trim() === "") return [];
  return value.split(",").map((p) => p.trim());
}

function addMetadata(data) {
  // metadata to identify the comment was made by this action
  // https://github.com/probot/metadata#how-it-works
  return `<!-- metadata = ${JSON.stringify(data)} -->`;
}

export function shouldRun() {
  const excludeBranches = parseCSV(
    core.getInput("exclude-branches", {
      required: false,
    })
  );

  if (!excludeBranches.length) return true;

  const sourceBranch = github.context.payload.pull_request.head.ref;

  const result = excludeBranches.some((p) => minimatch(sourceBranch, p));

  if (result) {
    core.notice("source branch matched the exclude pattern, exiting...");
  }

  return !result;
}

export function addComment({ octokit, prId, body }) {
  return octokit.graphql(
    `
        mutation addCommentWhenMissingLinkIssues($subjectId: ID!, $body: String!) {
          addComment(input:{subjectId: $subjectId, body: $body}) {
            clientMutationId
          }
        }
      `,
    {
      subjectId: prId,
      body: `${body} ${addMetadata({ action: "linked_issue" })}`,
    }
  );
}

export function getLinkedIssues({ octokit, prNumber, repoOwner, repoName }) {
  return octokit.graphql(
    `
    query getLinkedIssues($owner: String!, $name: String!, $number: Int!) {
      repository(owner: $owner, name: $name) {
        pullRequest(number: $number) {
          id
          closingIssuesReferences {
            totalCount
          }
        }
      }
    }
    `,
    {
      owner: repoOwner,
      name: repoName,
      number: prNumber,
    }
  );
}

function filterLinkedIssuesComments(issues = []) {
  return issues.filter((issue) => {
    // it will only filter comments made by this action
    const match = issue?.body?.match(/<!-- metadata = (.*) -->/);

    if (match) {
      const actionName = JSON.parse(match[1])["action"];
      return actionName === "linked_issue";
    }
  });
}

export async function getPrComments({
  octokit,
  repoName,
  prNumber,
  repoOwner,
}) {
  const comments = await octokit.paginate(
    "GET /repos/{owner}/{repo}/issues/{prNumber}/comments",
    {
      owner: repoOwner,
      repo: repoName,
      prNumber,
    }
  );

  const filtered = filterLinkedIssuesComments(comments);
  console.log({ comments, filtered });
  return filtered;
}

export function deleteLinkedIssueComments(octokit, comments) {
  return Promise.all(
    comments.map(({ node_id }) =>
      octokit.graphql(
        `
      mutation deleteCommentLinkedIssue($id: ID!) {
        deleteIssueComment(input: {id: $id }) {
          clientMutationId
        }
      }
      `,
        {
          id: node_id,
        }
      )
    )
  );
}
