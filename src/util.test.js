import * as core from "@actions/core";
import * as github from "@actions/github";

import { shouldRun } from "./util.js";

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
