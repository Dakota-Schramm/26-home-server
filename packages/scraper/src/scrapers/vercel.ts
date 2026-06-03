import type { JobListing } from "@home-server/shared";
import { BaseScraper } from "./base";

const BASE_URL = "https://vercel.com";
const CAREERS_URL = `${BASE_URL}/careers`;

export class VercelScraper extends BaseScraper {
  async scrape(): Promise<JobListing[]> {
    const $ = await this.fetch(CAREERS_URL);
    const now = new Date().toISOString();
    const jobs: JobListing[] = [];

    $("section#positions a").each((_i, el) => {
      const title = $(el).text().trim();
      const href = $(el).attr("href") ?? "";
      if (!title) return;

      const url = href.startsWith("http") ? href : `${BASE_URL}${href}`;
      jobs.push({ title, url, company: "Vercel", scrapedAt: now });
    });

    return jobs;
  }
}
