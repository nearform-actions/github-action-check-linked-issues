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

  if (excludeBranches.length) {
    const sourceBranch = github.context.payload.pull_request.head.ref;

    if (excludeBranches.some((p) => minimatch(sourceBranch, p))) {
      core.notice("source branch matched the exclude pattern, exiting...");
      return false;
    }
  }

  const excludeLabels = parseCSV(
    core.getInput("exclude-labels", {
      required: false,
    })
  );
  if (excludeLabels.length) {
    const labels = github.context.payload.pull_request.labels || [];
    if (labels.some(({ name }) => excludeLabels.includes(name))) {
      core.notice("excluded label was found, exiting...");
      return false;
    }
  }
  return true;
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
          body
          closingIssuesReferences(first: 100) {
            totalCount
            nodes {
              number
              repository {
                nameWithOwner
              }
            }
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

async function getIssues({ owner, repo, issueIds, octokit }) {
  const issues = [];

  for (const issue_number of issueIds) {
    try {
      let issue = await octokit.rest.issues.get({
        owner,
        repo,
        issue_number,
      });

      if (issue) {
        core.debug(`Found issue in PR Body ${issue_number}`);
        issues.push(issue_number);
      }
    } catch {
      core.debug(`#${issue_number} is not a valid issue.`);
    }
  }

  return issues;
}

function extractLocalIssues(body) {
  const regex =
    /(close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved) #(\d+)/gim;
  const issues = [];
  let match;

  while ((match = regex.exec(body.toLowerCase()))) {
    // eslint-disable-next-line no-unused-vars
    const [str, action, issueNumber] = match;
    issues.push(issueNumber);
  }

  return issues;
}

function extractExternalIssues(body) {
  const regex =
    /\b(close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s*(https?:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+))/gim;
  const issues = [];
  let match;

  while ((match = regex.exec(body.toLowerCase()))) {
    // eslint-disable-next-line no-unused-vars
    const [str, action, url, owner, repo, issueNumber] = match;
    issues.push({ owner, repo, issueNumber });
  }

  return issues;
}

export async function getBodyValidIssue({
  body,
  octokit,
  repoOwner,
  repoName,
}) {
  let issues = [];
  if (!body) {
    return issues;
  }

  // loading issues from the PR's repo
  const internalIssues = extractLocalIssues(body);
  if (internalIssues.length) {
    const loadedInternalIssues = await getIssues({
      owner: repoOwner,
      repo: repoName,
      issueIds: internalIssues,
      octokit,
    });
    issues = loadedInternalIssues.map(
      (issueNumber) => `${repoOwner}/${repoName}#${issueNumber}`
    );
  }

  // loading external issues
  const externalIssues = extractExternalIssues(body);
  if (externalIssues.length) {
    const { owner, repo } = externalIssues.at(0);
    const loadedExternalIssues = await getIssues({
      owner,
      repo,
      issueIds: externalIssues.map((issue) => issue.issueNumber),
      octokit,
    });
    issues = [
      ...issues,
      ...loadedExternalIssues.map(
        (issue, i) =>
          `${externalIssues.at(i).owner}/${externalIssues.at(i).repo}#${issue}`
      ),
    ];
  }

  return issues;
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
  const issues = await octokit.paginate(
    "GET /repos/{owner}/{repo}/issues/{prNumber}/comments",
    {
      owner: repoOwner,
      repo: repoName,
      prNumber,
    }
  );

  return filterLinkedIssuesComments(issues);
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
