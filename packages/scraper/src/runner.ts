import type { MailPayload, ScrapeResult } from "@home-server/shared";
import { VercelScraper } from "./scrapers/vercel";
import { MozillaScraper } from "./scrapers/mozilla";
import { AppleScraper } from "./scrapers/apple";
import { sendToMailer } from "./mailerClient";
import { openDb, filterNewJobs, markJobsSeen } from "./db";
import { config } from "./config";

const scrapers = [
  { company: "Vercel", instance: new VercelScraper() },
  { company: "Mozilla", instance: new MozillaScraper() },
  { company: "Apple", instance: new AppleScraper() },
];

export async function run(): Promise<void> {
  console.log("[scraper] starting run");

  const db = openDb(config.dbPath);

  const settled = await Promise.allSettled(
    scrapers.map(({ company, instance }) =>
      instance
        .scrape()
        .then((jobs) => {
          if (jobs.length === 0) {
            console.warn(`[scraper] ${company}: 0 jobs found (selector may have changed)`);
          } else {
            console.log(`[scraper] ${company}: ${jobs.length} jobs`);
          }
          return { ok: true as const, company, jobs };
        })
        .catch((err: Error) => {
          console.error(`[scraper] ${company} failed: ${err.message}`);
          return { ok: false as const, company, error: err.message };
        })
    )
  );

  const results: ScrapeResult[] = settled.map((s) =>
    s.status === "fulfilled" ? s.value : { ok: false, company: "unknown", error: String(s.reason) }
  );

  const filteredResults: ScrapeResult[] = results.map((result) => {
    if (!result.ok) return result;
    const newJobs = filterNewJobs(db, result.jobs);
    console.log(`[scraper] ${result.company}: ${newJobs.length} new (of ${result.jobs.length} total)`);
    return { ...result, jobs: newJobs };
  });

  const newJobs = filteredResults.flatMap((r) => (r.ok ? r.jobs : []));

  if (newJobs.length === 0) {
    console.log("[scraper] no new jobs, skipping email");
    return;
  }

  const payload: MailPayload = {
    results: filteredResults,
    triggeredAt: new Date().toISOString(),
  };

  try {
    await sendToMailer(payload);
    console.log("[scraper] payload sent to mailer");
    markJobsSeen(db, newJobs);
  } catch (err) {
    console.error("[scraper] could not reach mailer:", err);
    process.exit(1);
  }
}
