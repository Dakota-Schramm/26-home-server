import { config } from "./config";
import { run } from "./runner";
import { startScheduler } from "./scheduler";

startScheduler(config.cronSchedule, run);
