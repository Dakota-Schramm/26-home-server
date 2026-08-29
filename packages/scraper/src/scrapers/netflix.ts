import axios from "axios";
import type { JobListing } from "@home-server/shared";
import { BaseScraper } from "./base";

const API_URL = "https://explore.jobs.netflix.net/api/apply/v2/jobs";
const JOB_BASE_URL = "https://explore.jobs.netflix.net/careers/job";
const DOMAIN = "netflix.com";
const LOCATION = "Remote";
const SORT_BY = "new";
// Eightfold (the ATS behind explore.jobs.netflix.net) caps `num` at 10 per
// request regardless of what's requested, so pagination via start/num is required.
const PAGE_SIZE = 10;

interface EightfoldPosition {
  id: number;
  name: string;
  location?: string;
  canonicalPositionUrl?: string;
}

interface EightfoldJobsResponse {
  count: number;
  positions: EightfoldPosition[];
}

export class NetflixScraper extends BaseScraper {
  static readonly company = "Netflix";

  private async fetchJson(start: number): Promise<EightfoldJobsResponse> {
    const response = await axios.get<EightfoldJobsResponse>(API_URL, {
      timeout: 15_000,
      params: { domain: DOMAIN, location: LOCATION, sort_by: SORT_BY, start, num: PAGE_SIZE },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });
    return response.data;
  }

  async scrape(): Promise<JobListing[]> {
    const now = new Date().toISOString();
    const positions: EightfoldPosition[] = [];

    let start = 0;
    let count: number | undefined;

    for (;;) {
      const page = await this.fetchJson(start);
      if (count === undefined) count = page.count;

      if (page.positions.length === 0) break;
      positions.push(...page.positions);

      start += PAGE_SIZE;
      if (start >= count) break;
    }

    return positions.map((position) => ({
      title: position.name,
      url: position.canonicalPositionUrl ?? `${JOB_BASE_URL}/${position.id}`,
      location: position.location || undefined,
      company: NetflixScraper.company,
      scrapedAt: now,
    }));
  }
}
