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
    `This action can only run on "pull_request_target" and "pull_request", but "WHATEVER" was received. Please check your workflow.`
  );
});

test.each([
  ["pull_request", 1],
  ["pull_request_target", 1],
])(
  "should return the number of linked issues and delete previous comments from linked_issues action while listening %p event",
  async (eventName, result) => {
    // eslint-disable-next-line
  github.context = {
      eventName,
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

    expect(core.setOutput).toHaveBeenCalledWith("linked_issues_count", result);
    expect(core.debug).toHaveBeenCalledWith(`${result} Comment(s) deleted.`);
  }
);

test.each([["pull_request"], ["pull_request_target"]])(
  "should fail when no linked issues are found and add comment into PR while listening %p event",
  async (eventName) => {
    // eslint-disable-next-line
  github.context = {
      eventName,
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
  }
);

test.each([["pull_request"], ["pull_request_target"]])(
  "should not add new comment when core input comment is not defined while listening %p event",
  async (eventName) => {
    // eslint-disable-next-line
  github.context = {
      eventName,
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
  }
);
