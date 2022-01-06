import * as core from "@actions/core";
import * as github from "@actions/github";
import minimatch from "minimatch";

function parseCSV(value) {
  if (value.trim() === "") return [];
  return value.split(",").map((p) => p.trim());
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
