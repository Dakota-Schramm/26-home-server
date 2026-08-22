import type { JobListing } from "@home-server/shared";
import { BaseScraper } from "./base";

const BASE_URL = "https://www.riotgames.com";
const CAREERS_URL = `${BASE_URL}/en/work-with-us`;

// Riot's own job taxonomy - "Software Engineering Group" is the direct analog
// of a Software Engineer role (Software/Staff/Principal/Senior Engineer,
// Software Engineering Manager, etc). Adjacent crafts like QA, Data/ML, and
// Infrastructure were left out since they're distinct disciplines rather than
// software engineering itself.
const SOFTWARE_CRAFT_ID = "software-engineering-group";

interface RiotJobPosting {
  title: string;
  office?: string;
  craftId?: string;
  url: string;
}

export class RiotScraper extends BaseScraper {
  static readonly company = "Riot Games";

  async scrape(): Promise<JobListing[]> {
    const $ = await this.fetch(CAREERS_URL);
    const now = new Date().toISOString();

    const raw = $(".js-job-list-wrapper").attr("data-props");
    if (!raw) return [];

    const { jobs } = JSON.parse(raw) as { jobs: RiotJobPosting[] };

    return jobs
      .filter((job) => job.craftId === SOFTWARE_CRAFT_ID)
      .map((job) => ({
        title: job.title.trim(),
        url: `${BASE_URL}${job.url}`,
        location: job.office || undefined,
        company: RiotScraper.company,
        scrapedAt: now,
      }));
  }
}
