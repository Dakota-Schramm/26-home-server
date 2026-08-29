import axios from "axios";
import type { JobListing } from "@home-server/shared";
import { BaseScraper } from "./base";

const API_URL = "https://boards-api.greenhouse.io/v1/boards/pokemoncareers/jobs?content=true";

// Curated filter set carried over from the user's saved board URL
// (job-boards.greenhouse.io/pokemoncareers?departments[]=...) - Information
// Technology - IT, Information Security, and Product Engineering (names
// confirmed via the board's own /departments endpoint). Intentionally narrow:
// this tracks that specific filtered view, not the full Pokémon Company
// International job board.
const TARGET_DEPARTMENT_IDS = new Set([4004663003, 4004689003, 4004666003]);

interface GreenhouseDepartment {
  id: number;
}

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location?: { name?: string };
  departments?: GreenhouseDepartment[];
}

interface GreenhouseJobsResponse {
  jobs: GreenhouseJob[];
}

export class PokemonScraper extends BaseScraper {
  static readonly company = "The Pokémon Company International";

  private async fetchJson(): Promise<GreenhouseJobsResponse> {
    const response = await axios.get<GreenhouseJobsResponse>(API_URL, {
      timeout: 15_000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });
    return response.data;
  }

  async scrape(): Promise<JobListing[]> {
    const now = new Date().toISOString();
    const { jobs } = await this.fetchJson();

    const filtered = jobs.filter((job) =>
      job.departments?.some((department) => TARGET_DEPARTMENT_IDS.has(department.id)),
    );

    return filtered.map((job) => ({
      title: job.title,
      url: job.absolute_url,
      location: job.location?.name || undefined,
      company: PokemonScraper.company,
      scrapedAt: now,
    }));
  }
}
