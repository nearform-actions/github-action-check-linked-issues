import * as core from "@actions/core";
import * as github from "@actions/github";
import { run } from "./action.js";

jest.mock("@actions/core");
jest.mock("@actions/github");

it("should fail when called with an unsupported event type", async () => {
  // eslint-disable-next-line
  github.context = { eventName: "WHATEVER", payload: {} };

  await run();

  expect(core.setFailed).toHaveBeenCalledWith(
    `This action can only run on "pull_request", but "WHATEVER" was received. Please check your workflow.`
  );
});

it("should return the number of linked issues and delete previous github-actions comments", async () => {
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

  await run();

  expect(core.setOutput).toHaveBeenCalledWith("linked_issues_count", 1);
  expect(core.debug).toHaveBeenCalledWith(`1 Comments deleted.`);
});

it("should fail when no linked issues are found and add comment into PR", async () => {
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

  await run();

  expect(core.setFailed).toHaveBeenCalledWith(
    `No linked issues found. Please add the corresponding issues in the pull request description.`
  );
  expect(core.debug).toHaveBeenCalledWith("Comment added for fake-pr-id PR");
});
