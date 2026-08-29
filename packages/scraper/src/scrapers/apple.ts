import type { JobListing } from "@home-server/shared";
import { BaseScraper } from "./base";

const BASE_URL = "https://jobs.apple.com";
const SEARCH_URL = `${BASE_URL}/en-us/search?team=apps-and-frameworks-SFTWR-AF&location=united-states-USA`;

interface AppleLocation {
  name?: string;
  countryName?: string;
}

interface AppleTeam {
  teamCode?: string;
}

interface AppleJobResult {
  positionId: string;
  postingTitle: string;
  transformedPostingTitle: string;
  locations?: AppleLocation[];
  team?: AppleTeam;
}

interface AppleSearchLoaderData {
  searchResults: AppleJobResult[];
  totalRecords: number;
}

export class AppleScraper extends BaseScraper {
  static readonly company = "Apple";

  private async fetchPage(page: number): Promise<AppleSearchLoaderData> {
    const url = page === 1 ? SEARCH_URL : `${SEARCH_URL}&page=${page}`;
    const $ = await this.fetch(url);

    // Apple's careers site is a server-rendered React app; the search results
    // are embedded as JSON in this hydration script rather than in any static
    // HTML markup (no <table>/<tr> structure exists) or a separate API call.
    // The `location` query param is honored server-side here, so no browser
    // is needed to apply the location filter.
    let raw: string | undefined;
    $("script").each((_i, el) => {
      const text = $(el).html() ?? "";
      const match = text.match(/window\.__staticRouterHydrationData = JSON\.parse\("(.*)"\);/s);
      if (match) raw = match[1];
    });
    if (!raw) throw new Error("could not find __staticRouterHydrationData script");

    const data = JSON.parse(JSON.parse(`"${raw}"`));
    return data.loaderData.search as AppleSearchLoaderData;
  }

  async scrape(): Promise<JobListing[]> {
    const now = new Date().toISOString();
    const results: AppleJobResult[] = [];

    let page = 1;
    let total: number | undefined;

    for (;;) {
      const search = await this.fetchPage(page);
      if (total === undefined) total = search.totalRecords;

      if (search.searchResults.length === 0) break;
      results.push(...search.searchResults);

      page += 1;
      if (results.length >= total) break;
    }

    return results.map((job) => {
      const location = job.locations?.map((l) => l.name).filter(Boolean).join(", ") || undefined;
      const teamCode = job.team?.teamCode ?? "";
      const url = `${BASE_URL}/en-us/details/${job.positionId}/${job.transformedPostingTitle}?team=${teamCode}`;

      return {
        title: job.postingTitle,
        url,
        location,
        company: AppleScraper.company,
        scrapedAt: now,
      };
    });
  }
}
