import { chromium } from "playwright";
import * as cheerio from "cheerio";
import type { JobListing } from "@home-server/shared";
import { PlaywrightScraper } from "./playwright";

const BASE_URL = "https://gitwit.pinpointhq.com";
const CAREERS_URL = `${BASE_URL}/`;
const TABLE_SELECTOR = ".rt-table";
const ROW_SELECTOR = '.rt-tbody .rt-tr[role="row"]';
const TARGET_LOCATION = "Tulsa, OK";

export class GitwitScraper extends PlaywrightScraper {
  static readonly company = "Gitwit";

  // Overrides the base fetch (rather than a shared hook) so the location-filter UI
  // interaction stays local to this scraper and PlaywrightScraper/DiscordScraper are untouched.
  protected async fetch(url: string, selector: string): Promise<cheerio.CheerioAPI> {
    const browser = await chromium.launch({ args: ["--disable-dev-shm-usage"] });
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

      await page
        .getByRole("button", { name: "Reject all" })
        .click({ timeout: 5_000 })
        .catch(() => {});

      await page.locator(".filter__button", { hasText: "All Locations" }).click();

      // Selecting a location fires a real /postings.json XHR, not a client-only re-render.
      const filterResponse = page.waitForResponse(
        (res) => res.url().includes("/postings.json") && res.url().includes("location_id"),
        { timeout: 15_000 },
      );
      await page.locator(".filter__dropdown-item-label", { hasText: TARGET_LOCATION }).click();

      // Only visible at mobile viewport widths; selecting the checkbox already applies the
      // filter at desktop width, but click it defensively when present.
      const applyButton = page.locator(".filter__footer button", { hasText: "Apply Filters" });
      if (await applyButton.isVisible().catch(() => false)) {
        await applyButton.click();
      }

      await filterResponse;
      // Passed as a string (evaluated in-browser) since this package's tsconfig has no DOM lib.
      await page.waitForFunction(
        `Array.from(document.querySelectorAll(${JSON.stringify(ROW_SELECTOR)})).every(
          (row) => row.getAttribute("data-location") === ${JSON.stringify(TARGET_LOCATION)}
        )`,
        undefined,
        { timeout: 15_000 },
      );

      await page.waitForSelector(selector, { timeout: 15_000 });
      const html = await page.content();
      return cheerio.load(html);
    } finally {
      await browser.close();
    }
  }

  async scrape(): Promise<JobListing[]> {
    const $ = await this.fetch(CAREERS_URL, TABLE_SELECTOR);
    const now = new Date().toISOString();
    const jobs: JobListing[] = [];

    $(ROW_SELECTOR).each((_i, el) => {
      const row = $(el);
      const link = row.find("a.hide-sm-block").first();
      const title = link.text().trim();
      const href = link.attr("href") ?? "";
      const location = row.attr("data-location") || undefined;
      if (!title || !href) return;

      const url = href.startsWith("http") ? href : `${BASE_URL}${href}`;
      jobs.push({ title, url, location, company: GitwitScraper.company, scrapedAt: now });
    });

    return jobs;
  }
}
