import type { JobListing } from "@home-server/shared";
import { PlaywrightScraper } from "./playwright";

const BASE_URL = "https://discord.com";
const CAREERS_URL = `${BASE_URL}/careers#all-jobs`;
const JOB_SELECTOR = ".jobs-list .job-item:not(.is-clone)";

export class DiscordScraper extends PlaywrightScraper {
  static readonly company = "Discord";

  async scrape(): Promise<JobListing[]> {
    const $ = await this.fetch(CAREERS_URL, JOB_SELECTOR);
    const now = new Date().toISOString();
    const jobs: JobListing[] = [];

    $(JOB_SELECTOR).each((_i, el) => {
      const item = $(el);
      const title = item.find(".heading-28px").first().text().trim();
      const location = item.find(".paragraph-white-opacity50").first().text().trim() || undefined;
      const href = item.attr("href") ?? "";
      if (!title) return;

      const url = href.startsWith("http") ? href : `${BASE_URL}${href}`;
      jobs.push({ title, url, location, company: DiscordScraper.company, scrapedAt: now });
    });

    return jobs;
  }
}
