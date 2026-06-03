import type { JobListing } from "@home-server/shared";
import { BaseScraper } from "./base";

const LISTINGS_URL = "https://www.mozilla.org/en-US/careers/listings/";

export class MozillaScraper extends BaseScraper {
  async scrape(): Promise<JobListing[]> {
    const $ = await this.fetch(LISTINGS_URL);
    const now = new Date().toISOString();
    const jobs: JobListing[] = [];

    $("tr.position").each((_i, row) => {
      const anchor = $(row).find("td a").first();
      const title = anchor.text().trim();
      const href = anchor.attr("href") ?? "";
      if (!title) return;

      const url = href.startsWith("http") ? href : `https://www.mozilla.org${href}`;
      const location = $(row).find("dd.job-post-location").text().trim() || undefined;

      jobs.push({ title, url, location, company: "Mozilla", scrapedAt: now });
    });

    return jobs;
  }
}
