import * as core from "@actions/core";

import { run } from "./action.js";
import * as util from "./util.js";

if (!util.shouldRun()) {
  core.notice("source branch matched the exclude pattern, exiting...");
  process.exit();
}

run();
