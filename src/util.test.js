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
    ["", "some-branch", true],
    ["    ", "some-branch", true],
    ["release/*", "some-branch", true],
    ["release/*", "release/abc", false],
    ["release/*", "release/beta/abc", true],
    ["release/**", "release/beta/abc", false],
    ["release/**,dependabot", "dependabot/something", true],
    ["release/**,     dependabot/**", "dependabot/something", false],
  ])(
    "should return correct value for each case",
    async (excludeBranches, sourceBranch, result) => {
      core.getInput.mockReturnValue(excludeBranches);

      // eslint-disable-next-line
      github.context = {
        eventName: "WHATEVER",
        payload: { pull_request: { head: { ref: sourceBranch } } },
      };

      expect(shouldRun()).toBe(result);
    }
  );
});

it("should delete comments given node ids", async () => {
  const oktokit = {
    graphql: jest.fn(() => Promise.resolve()),
  };
  const nodes = ["fake-node-id-1", "fake-node-id-2"];

  await deleteLinkedIssueComments(oktokit, nodes);

  expect(oktokit.graphql).toHaveBeenCalledTimes(2);
  expect(oktokit.graphql).toHaveBeenCalledWith(
    expect.stringContaining("mutation deleteCommentLinkedIssue"),
    {
      id: "fake-node-id-1",
    }
  );
  expect(oktokit.graphql).toHaveBeenCalledWith(
    expect.stringContaining("mutation deleteCommentLinkedIssue"),
    {
      id: "fake-node-id-2",
    }
  );
});

it("should addComment given subjectId", async () => {
  const oktokit = {
    graphql: jest.fn(() => Promise.resolve()),
  };
  const subjectId = "fake-subjectId";

  await addComment(oktokit, subjectId);

  expect(oktokit.graphql).toHaveBeenCalledTimes(1);
  expect(oktokit.graphql).toHaveBeenCalledWith(
    expect.stringContaining("mutation addCommentWhenMissingLinkIssues"),
    {
      subjectId: "fake-subjectId",
      body: expect.stringContaining(
        `No linked issues found. Please add the corresponding issues in the pull request description.`
      ),
    }
  );
});

it("should get linked issues by repository name and pull request number", async () => {
  const oktokit = {
    graphql: jest.fn(() => Promise.resolve()),
  };
  const owner = "fake-owner";
  const name = "fake-repository-name";
  const number = "fake-pr-number";

  await getLinkedIssues(oktokit, name, number, owner);

  expect(oktokit.graphql).toHaveBeenCalledTimes(1);
  expect(oktokit.graphql).toHaveBeenCalledWith(
    expect.stringContaining("query getLinkedIssues"),
    {
      owner,
      name,
      number,
    }
  );
});
