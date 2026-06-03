import type { JobListing } from "@home-server/shared";
import { BaseScraper } from "./base";

const BASE_URL = "https://jobs.apple.com";
const SEARCH_URL = `${BASE_URL}/en-us/search?team=apps-and-frameworks-SFTWR-AF`;

export class AppleScraper extends BaseScraper {
  async scrape(): Promise<JobListing[]> {
    const $ = await this.fetch(SEARCH_URL);
    const now = new Date().toISOString();
    const jobs: JobListing[] = [];

    $("div.results_table tbody tr td a").each((_i, el) => {
      const title = $(el).text().trim();
      const href = $(el).attr("href") ?? "";
      if (!title) return;

      const url = href.startsWith("http") ? href : `${BASE_URL}${href}`;
      jobs.push({ title, url, company: "Apple", scrapedAt: now });
    });

    return jobs;
  }
}
