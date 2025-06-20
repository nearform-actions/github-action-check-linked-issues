import * as core from "@actions/core";
import * as github from "@actions/github";
import { run } from "./action.js";
import { ERROR_MESSAGE } from "./constants.js";

jest.mock("@actions/core");
jest.mock("@actions/github");
jest.mock("actions-toolkit");

afterEach(() => {
  jest.clearAllMocks();
});

it("should fail when called with an unsupported event type", async () => {
  // eslint-disable-next-line
  github.context = { eventName: "WHATEVER", payload: {} };

  await run();

  expect(core.setFailed).toHaveBeenCalledWith(
    `This action can only run on "pull_request_target" or "pull_request", but "WHATEVER" was received. Please check your workflow.`,
  );
});

test.each([
  ["pull_request", 2, ["test/repo#12345", "another/repository#456"]],
  ["pull_request_target", 2, ["test/repo#12345", "another/repository#456"]],
])(
  "should return the number of linked issues and their repos and delete previous comments from linked_issues action while listening %p event",
  async (eventName, n, issueArray) => {
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

    expect(core.setOutput).toHaveBeenNthCalledWith(1, "linked_issues_count", n);
    expect(core.setOutput).toHaveBeenNthCalledWith(2, "issues", issueArray);
    expect(core.debug).toHaveBeenCalledWith(`1 comment(s) deleted.`);
  },
);

const REPO_NAME = "repo_name";
const ORG_NAME = "org_name";
test("should return the number of linked issues and their repos using loose matching on local repository", async () => {
  // eslint-disable-next-line
  github.context = {
    looseMatching: true,
    localRepo: true,
    eventName: "pull_request",
    payload: {
      action: "opened",
      number: 123,
      repository: {
        name: REPO_NAME,
        owner: {
          login: ORG_NAME,
        },
      },
    },
  };

  await run();

  expect(core.setOutput).toHaveBeenNthCalledWith(1, "linked_issues_count", 2);
  expect(core.setOutput).toHaveBeenNthCalledWith(2, "issues", [
    `${ORG_NAME}/${REPO_NAME}#12345`,
    `${ORG_NAME}/${REPO_NAME}#456`,
  ]);
});

test("should return the number of linked issues and their repos using loose matching on external repository", async () => {
  // eslint-disable-next-line
  github.context = {
    looseMatching: true,
    externalRepo: true,
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

  await run();

  expect(core.setOutput).toHaveBeenNthCalledWith(1, "linked_issues_count", 3);
  expect(core.setOutput).toHaveBeenNthCalledWith(2, "issues", [
    "orgone/repoone#123",
    "orgtwo/repotwo#456",
    "ext_org/ext_repo#1337",
  ]);
});

test("should return the number of linked issues and their repos using loose matching on local and external repository", async () => {
  // eslint-disable-next-line
  github.context = {
    looseMatching: true,
    eventName: "pull_request",
    payload: {
      action: "opened",
      number: 123,
      repository: {
        name: REPO_NAME,
        owner: {
          login: ORG_NAME,
        },
      },
    },
  };

  await run();

  expect(core.setOutput).toHaveBeenNthCalledWith(1, "linked_issues_count", 5);
  expect(core.setOutput).toHaveBeenNthCalledWith(2, "issues", [
    `${ORG_NAME}/${REPO_NAME}#12345`,
    `${ORG_NAME}/${REPO_NAME}#67890`,
    "orgone/repoone#123",
    "orgtwo/repotwo#456",
    "ext_org/ext_repo#1337",
  ]);
});

test.each([["pull_request"], ["pull_request_target"]])(
  "should skip labeled issues check when PR is labeled with specified skip label while listening %p event",
  async (eventName) => {
    // eslint-disable-next-line
    github.context = {
      eventName,
      withLabel: "skip-linked-issues-check",
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

    core.getInput.mockReturnValue("skip-linked-issues-check");
    await run();
    expect(core.setFailed).not.toHaveBeenCalled();
    expect(core.setOutput).toHaveBeenCalledWith("check_skipped", true);
    expect(core.debug).toHaveBeenCalledWith(
      "Pull request is labeled with 'no-issue', skipping check",
    );
    expect(core.debug).toHaveBeenCalledWith(`1 comment(s) deleted.`);
  },
);

test.each([["pull_request"], ["pull_request_target"]])(
  "should fail when no linked issues are found and add comment into PR while listening %p event",
  async (eventName) => {
    const addCommentMutation =
      `mutation addCommentWhenMissingLinkIssues($subjectId: ID!, $body: String!) {
    addComment(input:{subjectId: $subjectId, body: $body}) {
      clientMutationId
    }
  }`.replace(/\s/g, "");
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

    const graphql = jest.fn(() => {
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
    });

    // eslint-disable-next-line
    github.getOctokit = jest.fn(() => {
      return {
        paginate: jest.fn(() => {
          return new Promise((resolve) =>
            resolve([
              {
                node_id: "fake-node-id",
                body: "fake comment",
              },
            ]),
          );
        }),
        graphql,
      };
    });

    // eslint-disable-next-line
    core.getBooleanInput.mockReturnValue("true");

    await run();

    const mutationQueryCall = graphql.mock.calls[1][0].replace(/\s/g, "");

    expect(mutationQueryCall).toEqual(addCommentMutation);

    expect(core.setFailed).toHaveBeenCalledWith(ERROR_MESSAGE);
    expect(core.debug).toHaveBeenCalledWith("Comment added");
  },
);

test.each([["pull_request"], ["pull_request_target"]])(
  "should fail when no linked issues are found and take no action if a comment from this action is already present while listening %p event",
  async (eventName) => {
    const addCommentMutation =
      `mutation addCommentWhenMissingLinkIssues($subjectId: ID!, $body: String!) {
    addComment(input:{subjectId: $subjectId, body: $body}) {
      clientMutationId
    }
  }`.replace(/\s/g, "");
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

    const graphql = jest.fn(() => {
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
    });

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
            ]),
          );
        }),
        graphql,
      };
    });

    // eslint-disable-next-line
    core.getBooleanInput.mockReturnValue("true");

    await run();

    expect(graphql).not.toHaveBeenCalledWith(addCommentMutation);

    expect(core.setFailed).toHaveBeenCalledWith(ERROR_MESSAGE);
  },
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
    core.getBooleanInput.mockReturnValue("");

    await run();

    expect(core.debug).not.toHaveBeenCalledWith("Comment added");
  },
);
