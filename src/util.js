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

  return !excludeBranches.some((p) => minimatch(sourceBranch, p));
}
