import axios from "axios";
import * as cheerio from "cheerio";
import type { JobListing } from "@home-server/shared";

export abstract class BaseScraper {
  protected async fetch(url: string): Promise<cheerio.CheerioAPI> {
    const response = await axios.get<string>(url, {
      timeout: 15_000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });
    return cheerio.load(response.data);
  }

  abstract scrape(): Promise<JobListing[]>;
}
