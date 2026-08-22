import { readdirSync } from "fs";
import { basename, extname, join } from "path";
import type { JobListing, MailPayload, ScrapeResult } from "@home-server/shared";
import { sendToMailer } from "./mailerClient";
import { openDb, getChangedJobs, upsertJobs, getScraperLastRan, upsertScraperRun } from "./db";
import { config } from "./config";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const SCRAPERS_DIR = join(__dirname, "scrapers");
const SHARED_FILES = new Set(["base", "cheerio", "playwright"]);

interface Scraper {
  scrape(): Promise<JobListing[]>;
}

interface ScraperConstructor {
  new (): Scraper;
  company: string;
}

function loadScrapers(): { company: string; instance: Scraper }[] {
  const names = readdirSync(SCRAPERS_DIR)
    .filter((file) => (file.endsWith(".ts") || file.endsWith(".js")) && !file.endsWith(".d.ts"))
    .map((file) => basename(file, extname(file)))
    .filter((name) => !SHARED_FILES.has(name))
    .sort();

  return names.map((name) => {
    const exported = Object.values(require(`./scrapers/${name}`) as Record<string, unknown>);
    const ScraperClass = exported.find(
      (value): value is ScraperConstructor => typeof value === "function"
    );
    if (!ScraperClass) throw new Error(`scrapers/${name} must export a scraper class`);

    return { company: ScraperClass.company, instance: new ScraperClass() };
  });
}

export const scrapers = loadScrapers();

export async function runScraper(company: string): Promise<void> {
  const scraper = scrapers.find((s) => s.company === company);
  if (!scraper) throw new Error(`No scraper for company "${company}"`);

  const { instance } = scraper;
  const db = openDb(config.dbPath);

  const lastRanAt = getScraperLastRan(db, company);
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
    upsertScraperRun(db, company);
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
    upsertScraperRun(db, company);
  } catch (err) {
    console.error(`[scraper] could not reach mailer:`, err);
    process.exit(1);
  }
}
