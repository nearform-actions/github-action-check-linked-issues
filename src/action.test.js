import * as core from "@actions/core";
import * as github from "@actions/github";
import { run } from "./action.js";

jest.mock("@actions/core");
jest.mock("@actions/github");

afterEach(() => {
  jest.clearAllMocks();
});

it("should fail when called with an unsupported event type", async () => {
  // eslint-disable-next-line
  github.context = { eventName: "WHATEVER", payload: {} };

  await run();

  expect(core.setFailed).toHaveBeenCalledWith(
    `This action can only run on "pull_request_target", but "WHATEVER" was received. Please check your workflow.`
  );
});

it("should return the number of linked issues and delete previous comments from linked_issues action", async () => {
  // eslint-disable-next-line
  github.context = {
    eventName: "pull_request_target",
    payload: {
      action: "opened",
      number: 123,
      repository: {
        name: "repo_name",
        owner: {
          login: "org_name",
        },
      },
    },
  };

  await run();

  expect(core.setOutput).toHaveBeenCalledWith("linked_issues_count", 1);
  expect(core.debug).toHaveBeenCalledWith(`1 Comment(s) deleted.`);
});

it("should fail when no linked issues are found and add comment into PR", async () => {
  // eslint-disable-next-line
  github.context = {
    eventName: "pull_request_target",
    payload: {
      action: "opened",
      number: 123,
      repository: {
        name: "repo_name",
        owner: {
          login: "org_name",
        },
      },
    },
  };

  // eslint-disable-next-line
  github.getOctokit = jest.fn(() => {
    return {
      paginate: jest.fn(() => {
        return new Promise((resolve) =>
          resolve([
            {
              node_id: "fake-node-id",
              body: '<!-- metadata = {"action":"linked_issue"} -->',
            },
            {
              node_id: "fake-node-id",
              body: "fake comment",
            },
          ])
        );
      }),
      graphql: jest.fn(() => {
        return new Promise((resolve) => {
          resolve({
            repository: {
              pullRequest: {
                id: "fake-pr-id",
                closingIssuesReferences: {
                  totalCount: 0,
                },
              },
            },
          });
        });
      }),
    };
  });

  // eslint-disable-next-line
  core.getInput.mockReturnValue("true");

  await run();

  expect(core.setFailed).toHaveBeenCalledWith(
    `No linked issues found. Please add the corresponding issues in the pull request description.`
  );
  expect(core.debug).toHaveBeenCalledWith("Comment added");
});

it("should not add new comment when core input comment is not defined", async () => {
  // eslint-disable-next-line
  github.context = {
    eventName: "pull_request",
    payload: {
      action: "opened",
      number: 123,
      repository: {
        name: "repo_name",
        owner: {
          login: "org_name",
        },
      },
    },
  };

  // eslint-disable-next-line
  github.getOctokit = jest.fn(() => {
    return {
      paginate: jest.fn(),
      graphql: jest.fn(() => {
        return new Promise((resolve) => {
          resolve({
            repository: {
              pullRequest: {
                id: "fake-pr-id",
                closingIssuesReferences: {
                  totalCount: 0,
                },
              },
            },
          });
        });
      }),
    };
  });

  // eslint-disable-next-line
  core.getInput.mockReturnValue("");

  await run();

  expect(core.debug).not.toHaveBeenCalledWith("Comment added");
});
