import type { MailPayload, ScrapeResult } from "@home-server/shared";
import { VercelScraper } from "./scrapers/vercel";
import { MozillaScraper } from "./scrapers/mozilla";
import { AppleScraper } from "./scrapers/apple";
import { sendToMailer } from "./mailerClient";

const scrapers = [
  { company: "Vercel", instance: new VercelScraper() },
  { company: "Mozilla", instance: new MozillaScraper() },
  { company: "Apple", instance: new AppleScraper() },
];

export async function run(): Promise<void> {
  console.log("[scraper] starting run");

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

  const payload: MailPayload = {
    results,
    triggeredAt: new Date().toISOString(),
  };

  try {
    await sendToMailer(payload);
    console.log("[scraper] payload sent to mailer");
  } catch (err) {
    console.error("[scraper] could not reach mailer:", err);
    process.exit(1);
  }
}
