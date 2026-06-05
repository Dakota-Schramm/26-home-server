import type { MailPayload, ScrapeResult } from "@home-server/shared";
import { VercelScraper } from "./scrapers/vercel";
import { MozillaScraper } from "./scrapers/mozilla";
import { AppleScraper } from "./scrapers/apple";
import { sendToMailer } from "./mailerClient";
import { openDb, getChangedJobs, upsertJobs, getScraperLastRan, upsertScraperRun } from "./db";
import { config } from "./config";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export const scrapers = [
  { id: 1, company: "Vercel", instance: new VercelScraper() },
  { id: 2, company: "Mozilla", instance: new MozillaScraper() },
  { id: 3, company: "Apple", instance: new AppleScraper() },
];

export async function runScraper(id: number): Promise<void> {
  const scraper = scrapers.find((s) => s.id === id);
  if (!scraper) throw new Error(`No scraper with id ${id}`);

  const { company, instance } = scraper;
  const db = openDb(config.dbPath);

  const lastRanAt = getScraperLastRan(db, id);
  if (lastRanAt) {
    const elapsed = Date.now() - new Date(lastRanAt).getTime();
    if (elapsed < TWENTY_FOUR_HOURS_MS) {
      console.log(`[scraper] ${company}: skipping, last ran ${Math.round(elapsed / 60_000)} min ago`);
      return;
    }
  }

  console.log(`[scraper] ${company}: starting`);

  let result: ScrapeResult;
  let jobs = [];

  try {
    const scraped = await instance.scrape();
    jobs = getChangedJobs(db, scraped);

    if (scraped.length === 0) {
      console.warn(`[scraper] ${company}: 0 jobs found (selector may have changed)`);
    } else {
      console.log(`[scraper] ${company}: ${scraped.length} jobs, ${jobs.length} new/updated`);
    }

    result = { ok: true, company, jobs };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[scraper] ${company} failed: ${error}`);
    result = { ok: false, company, error };
  }

  if (result.ok && result.jobs.length === 0) {
    upsertScraperRun(db, id, company);
    return;
  }

  const payload: MailPayload = {
    results: [result],
    triggeredAt: new Date().toISOString(),
  };

  try {
    await sendToMailer(payload);
    console.log(`[scraper] ${company}: payload sent to mailer`);
    if (result.ok) upsertJobs(db, result.jobs);
    upsertScraperRun(db, id, company);
  } catch (err) {
    console.error(`[scraper] could not reach mailer:`, err);
    process.exit(1);
  }
}
