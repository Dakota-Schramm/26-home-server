import { scrapers, runScraper } from "./runner";

export function startScheduler(): void {
  const count = scrapers.length;
  const intervalMs = Math.floor((24 * 60 * 60 * 1000) / count);

  console.log(
    `[scraper] ${count} scrapers, interval: ${Math.round(intervalMs / 60_000)} min`
  );

  let index = 0;

  setInterval(() => {
    const { id } = scrapers[index];
    index = (index + 1) % count;
    runScraper(id).catch((err) => {
      console.error(`[scraper] unhandled error for scraper ${id}:`, err);
    });
  }, intervalMs);
}
