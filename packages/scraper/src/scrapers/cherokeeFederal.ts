import axios from "axios";
import type { JobListing } from "@home-server/shared";
import { BaseScraper } from "./base";

const API_URL =
  "https://ibtcjb.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions";
const JOB_BASE_URL =
  "https://ibtcjb.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/careers/job";
const PAGE_SIZE = 100;

// Curated filter set carried over from the user's saved search URL - United
// States (country-level location), Remote workplace type, and the
// "Information Technology Services" category facet (name confirmed via the
// API's own categoriesFacet response). Intentionally narrow: this tracks that
// specific filtered result set, not the full Cherokee Federal job board.
const SITE_NUMBER = "CX_2";
const LOCATION_ID = "300000000471434";
const CATEGORY_FACET_ID = "300000018439305";
const WORKPLACE_TYPE_FACET = "ORA_REMOTE";

interface OracleRequisition {
  Id: string;
  Title: string;
  PrimaryLocation?: string;
  WorkplaceType?: string;
}

interface OracleJobsPage {
  TotalJobsCount: number;
  requisitionList: OracleRequisition[];
}

interface OracleJobsResponse {
  items: OracleJobsPage[];
}

export class CherokeeFederalScraper extends BaseScraper {
  static readonly company = "Cherokee Federal";

  private async fetchPage(offset: number): Promise<OracleJobsPage> {
    const finder =
      `findReqs;siteNumber=${SITE_NUMBER},` +
      `facetsList=WORK_LOCATIONS;WORKPLACE_TYPES;TITLES;CATEGORIES;ORGANIZATIONS;POSTING_DATES;FLEX_FIELDS;LOCATIONS,` +
      `limit=${PAGE_SIZE},offset=${offset},lastSelectedFacet=WORKPLACE_TYPES,` +
      `locationId=${LOCATION_ID},selectedCategoriesFacet=${CATEGORY_FACET_ID},` +
      `selectedWorkplaceTypesFacet=${WORKPLACE_TYPE_FACET},sortBy=POSTING_DATES_DESC`;
    // requisitionList is omitted from the response entirely without this expand
    // param - confirmed by comparing against the real browser request.
    const expand =
      "requisitionList.workLocation,requisitionList.otherWorkLocations," +
      "requisitionList.secondaryLocations,flexFieldsFacet.values," +
      "requisitionList.requisitionFlexFields";
    const url = `${API_URL}?onlyData=true&expand=${encodeURIComponent(expand)}&finder=${encodeURIComponent(finder)}`;

    const response = await axios.get<OracleJobsResponse>(url, {
      timeout: 15_000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });
    return response.data.items[0];
  }

  async scrape(): Promise<JobListing[]> {
    const now = new Date().toISOString();
    const requisitions: OracleRequisition[] = [];

    let offset = 0;
    let total: number | undefined;

    for (;;) {
      const page = await this.fetchPage(offset);
      if (total === undefined) total = page.TotalJobsCount;

      if (!page.requisitionList || page.requisitionList.length === 0) break;
      requisitions.push(...page.requisitionList);

      offset += PAGE_SIZE;
      if (offset >= total) break;
    }

    return requisitions.map((req) => ({
      title: req.Title,
      url: `${JOB_BASE_URL}/${req.Id}/`,
      location:
        [req.PrimaryLocation, req.WorkplaceType && `(${req.WorkplaceType})`]
          .filter(Boolean)
          .join(" ") || undefined,
      company: CherokeeFederalScraper.company,
      scrapedAt: now,
    }));
  }
}
