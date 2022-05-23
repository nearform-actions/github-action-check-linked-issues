import { run } from "./action.js";
import * as util from "./util.js";

console.log(`👋 Hello from ${__dirname} folder`);

if (util.shouldRun()) {
  run();
}
