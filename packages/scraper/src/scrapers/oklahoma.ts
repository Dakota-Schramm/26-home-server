import axios from "axios";
import type { JobListing } from "@home-server/shared";
import { BaseScraper } from "./base";

const API_URL = "https://okgov.wd1.myworkdayjobs.com/wday/cxs/okgov/okgovjobs/jobs";
const JOB_BASE_URL = "https://okgov.wd1.myworkdayjobs.com/en-US/okgovjobs";
const PAGE_SIZE = 20;

// Oklahoma's internal job classification for the Information Systems occupational
// group ("B" prefix codes). Verified by cross-referencing currently posted IT/dev
// titles (e.g. "PeopleSoft Developer", "OneLink Application Developer") against the
// jobFamily facet returned by the API - it's more robust than title keyword matching
// since it tracks the employer's own classification rather than wording.
const IT_JOB_FAMILY_IDS = [
  "7a8d2de4e0861000d103079720510000", // B23 - I.S. Network Technician
  "7a8d2de4e0861000d1026c95ac0a0000", // B25 - GIS Specialist
  "db817f4684b01000b9e1b58d19280000", // B27 - IS Computer Support Specialist
  "4762f90a20a610014e8a9e4390630000", // B29 - IS Server Support Specialist
  "7a8d2de4e0861000d1051c40cfe80000", // B51 - I.S. Applications Specialist
  "30f55b54da8f1000d00e8be9ec3c0000", // B55 - Information Systems Services
];

interface WorkdayJobPosting {
  title: string;
  externalPath: string;
  locationsText?: string;
}

interface WorkdayJobsResponse {
  total: number;
  jobPostings: WorkdayJobPosting[];
}

export class OklahomaScraper extends BaseScraper {
  static readonly company = "State of Oklahoma";

  private async fetchJson(offset: number): Promise<WorkdayJobsResponse> {
    const response = await axios.post<WorkdayJobsResponse>(
      API_URL,
      {
        appliedFacets: { jobFamily: IT_JOB_FAMILY_IDS },
        limit: PAGE_SIZE,
        offset,
        searchText: "",
      },
      {
        timeout: 15_000,
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
      },
    );
    return response.data;
  }

  async scrape(): Promise<JobListing[]> {
    const now = new Date().toISOString();
    const postings: WorkdayJobPosting[] = [];

    let offset = 0;
    let total: number | undefined;

    for (;;) {
      const page = await this.fetchJson(offset);
      // Workday only returns an accurate `total` on the first page - later pages
      // report 0 even though jobPostings is still populated, so it must be
      // captured once and reused.
      if (total === undefined) total = page.total;

      if (page.jobPostings.length === 0) break;
      postings.push(...page.jobPostings);

      offset += PAGE_SIZE;
      if (offset >= total) break;
    }

    return postings.map((posting) => ({
      title: posting.title,
      url: `${JOB_BASE_URL}${posting.externalPath}`,
      location: posting.locationsText || undefined,
      company: OklahomaScraper.company,
      scrapedAt: now,
    }));
  }
}
