import * as core from "@actions/core";
import * as github from "@actions/github";
import * as toolkit from "actions-toolkit";

import { ERROR_MESSAGE } from "./constants.js";
import {
  getLinkedIssues,
  addComment,
  deleteLinkedIssueComments,
  getPrComments,
} from "./util.js";

const format = (obj) => JSON.stringify(obj, undefined, 2);

async function run() {
  toolkit.logActionRefWarning();
  toolkit.logRepoWarning();

  core.info(`
    *** ACTION RUN - START ***
    `);

  try {
    const { payload, eventName } = github.context;

    if (eventName !== "pull_request_target" && eventName !== "pull_request") {
      throw new Error(
        `This action can only run on "pull_request_target" or "pull_request", but "${eventName}" was received. Please check your workflow.`,
      );
    }

    core.debug(`
    *** PAYLOAD ***
    ${format(payload)}
    `);

    const {
      number,
      repository: { owner, name },
    } = payload;

    const token = core.getInput("github-token");
    const octokit = github.getOctokit(token);

    const data = await getLinkedIssues({
      prNumber: number,
      repoName: name,
      repoOwner: owner.login,
      octokit,
    });

    core.debug(`
    *** GRAPHQL DATA ***
    ${format(data)}
    `);

    const pullRequest = data?.repository?.pullRequest;
    const linkedIssuesCount = pullRequest?.closingIssuesReferences?.totalCount;
    const issues = (pullRequest?.closingIssuesReferences?.nodes || []).map(
      (node) => `${node.repository.nameWithOwner}#${node.number}`,
    );

    const linkedIssuesComments = await getPrComments({
      octokit,
      repoName: name,
      prNumber: number,
      repoOwner: owner.login,
    });

    core.setOutput("linked_issues_count", linkedIssuesCount);
    core.setOutput("issues", issues);

    if (!linkedIssuesCount) {
      const prId = pullRequest?.id;
      const shouldComment =
        !linkedIssuesComments.length && core.getInput("comment") && prId;

      if (shouldComment) {
        const body = core.getInput("custom-body-comment");
        await addComment({ octokit, prId, body });

        core.debug("Comment added");
      }

      core.setFailed(ERROR_MESSAGE);
    } else if (linkedIssuesComments.length) {
      await deleteLinkedIssueComments(octokit, linkedIssuesComments);
      core.debug(`${linkedIssuesComments.length} Comment(s) deleted.`);
    }
  } catch (error) {
    core.setFailed(error.message);
  } finally {
    core.info(`
    *** ACTION RUN - END ***
    `);
  }
}

export { run };
