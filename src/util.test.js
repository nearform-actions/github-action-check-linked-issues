import * as core from "@actions/core";
import * as github from "@actions/github";

import {
  shouldRun,
  deleteLinkedIssueComments,
  addComment,
  getLinkedIssues,
} from "./util.js";

jest.mock("@actions/core");
jest.mock("@actions/github");

describe("shouldRun", () => {
  test.each([
    ["", "", "some-branch", true],
    ["    ", "", "some-branch", true],
    ["release/*", "", "some-branch", true],
    ["release/*", "", "release/abc", false],
    ["release/*", "", "release/beta/abc", true],
    ["release/**", "", "release/beta/abc", false],
    ["release/**,dependabot", "", "dependabot/something", true],
    ["release/**,     dependabot/**", "", "dependabot/something", false],
    ["", "test-label", "some-branch", false],
    ["", "alabel,   test-label", "some-branch", false],
    ["", "test-label-bad", "some-branch", true],
    ["", "tEsT-lAbel", "some-branch", true],
  ])(
    "should return correct value for each case",
    async (excludeBranches, excludeLabels, sourceBranch, result) => {
      core.getInput.mockImplementation((a) =>
        a === "exclude-branches" ? excludeBranches : excludeLabels
      );

      // eslint-disable-next-line
      github.context = {
        eventName: "WHATEVER",
        payload: {
          pull_request: {
            head: { ref: sourceBranch },
            labels: [{ name: "test-label" }],
          },
        },
      };
      expect(shouldRun()).toBe(result);
    }
  );
});

it("should delete comments given node ids", async () => {
  const octokit = {
    graphql: jest.fn(() => Promise.resolve()),
  };
  const comments = [
    {
      node_id: "fake-node-id1",
    },
    {
      node_id: "fake-node-id2",
    },
  ];

  await deleteLinkedIssueComments(octokit, comments);

  expect(octokit.graphql).toHaveBeenCalledTimes(2);
  expect(octokit.graphql).toHaveBeenCalledWith(
    expect.stringContaining("mutation deleteCommentLinkedIssue"),
    {
      id: "fake-node-id1",
    }
  );
  expect(octokit.graphql).toHaveBeenCalledWith(
    expect.stringContaining("mutation deleteCommentLinkedIssue"),
    {
      id: "fake-node-id2",
    }
  );
});

it("should addComment given subjectId", async () => {
  const octokit = {
    graphql: jest.fn(() => Promise.resolve()),
  };
  const prId = "fake-pr-id";
  const fakeCustomBody = "fake-comment-body";

  await addComment({ octokit, prId, body: fakeCustomBody });

  expect(octokit.graphql).toHaveBeenCalledTimes(1);
  expect(octokit.graphql).toHaveBeenCalledWith(
    expect.stringContaining("mutation addCommentWhenMissingLinkIssues"),
    {
      subjectId: "fake-pr-id",
      body: expect.stringContaining(
        'fake-comment-body <!-- metadata = {"action":"linked_issue"} -->'
      ),
    }
  );
});

it("should get linked issues by repository name and pull request number", async () => {
  const octokit = {
    graphql: jest.fn(() => Promise.resolve()),
  };
  const owner = "fake-owner";
  const name = "fake-repository-name";
  const number = "fake-pr-number";

  await getLinkedIssues({
    octokit,
    repoOwner: owner,
    repoName: name,
    prNumber: number,
  });

  expect(octokit.graphql).toHaveBeenCalledTimes(1);
  expect(octokit.graphql).toHaveBeenCalledWith(
    expect.stringContaining("query getLinkedIssues"),
    {
      owner,
      name,
      number,
    }
  );
});
