import { chromium } from "playwright";
import * as cheerio from "cheerio";
import type { JobListing } from "@home-server/shared";

export abstract class PlaywrightScraper {
  protected async fetch(url: string, selector: string): Promise<cheerio.CheerioAPI> {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForSelector(selector, { timeout: 15_000 });
      const html = await page.content();
      return cheerio.load(html);
    } finally {
      await browser.close();
    }
  }

  abstract scrape(): Promise<JobListing[]>;
}
