import { run } from "./action.js";
import * as util from "./util.js";

if (util.shouldRun()) {
  run();
}
