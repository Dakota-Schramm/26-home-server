import { config } from "./config";
import { run } from "./runner";
import { startScheduler } from "./scheduler";

if (config.runOnStartup) {
  console.log("[scraper] RUN_ON_STARTUP=true — running immediately");
  run().catch((err) => {
    console.error("[scraper] startup run failed:", err);
    process.exit(1);
  });
}

startScheduler(config.cronSchedule, run);
