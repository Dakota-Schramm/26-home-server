import type { JobListing } from "@home-server/shared";
import { BaseScraper } from "./base";

const BASE_URL = "https://vercel.com";
const CAREERS_URL = `${BASE_URL}/careers`;

export class VercelScraper extends BaseScraper {
  static readonly company = "Vercel";

  async scrape(): Promise<JobListing[]> {
    const $ = await this.fetch(CAREERS_URL);
    const now = new Date().toISOString();
    const jobs: JobListing[] = [];

    $('section#positions a[data-testid^="careers/position/"]').each((_i, el) => {
      const anchor = $(el);
      const title = anchor.find('[data-testid^="careers/position-title/"]').first().text().trim();
      const location =
        anchor.find('[data-testid^="careers/position-locations/"]').first().text().trim() ||
        undefined;
      const href = anchor.attr("href") ?? "";
      if (!title) return;

      const url = href.startsWith("http") ? href : `${BASE_URL}${href}`;
      jobs.push({ title, url, location, company: VercelScraper.company, scrapedAt: now });
    });

    return jobs;
  }
}
