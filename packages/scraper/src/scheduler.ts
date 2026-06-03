import cron from "node-cron";

export function startScheduler(schedule: string, job: () => Promise<void>): void {
  if (!cron.validate(schedule)) {
    throw new Error(`Invalid cron expression: "${schedule}"`);
  }

  console.log(`[scraper] scheduled with cron: ${schedule}`);

  cron.schedule(schedule, () => {
    job().catch((err) => {
      console.error("[scraper] unhandled error in scheduled job:", err);
    });
  });
}
