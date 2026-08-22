import type { JobListing } from "@home-server/shared";
import { BaseScraper } from "./base";

const JOBS_URL = "https://careers.nintendo.com/jobs";

// Nintendo's own "Job Field" taxonomy (also exposed as the "department" filter
// in their UI) - "Software Development" is the direct analog of a Software
// Engineer role. A handful of genuine engineering titles (e.g. "Tools Engineer")
// sit under the broader "Game Development" field instead, but that field also
// covers non-engineering roles like Game Designer, so it's left out to keep the
// filter matching Nintendo's own "software" bucket rather than cherry-picking
// titles across families.
const SOFTWARE_JOB_FIELDS = new Set(["Software Development", "Software Development - Games"]);

interface NintendoJobPosting {
  title: string;
  absolute_url: string;
  location?: { name?: string };
  metadata?: Record<string, { value?: unknown }>;
}

export class NintendoScraper extends BaseScraper {
  static readonly company = "Nintendo";

  async scrape(): Promise<JobListing[]> {
    const $ = await this.fetch(JOBS_URL);
    const now = new Date().toISOString();

    const raw = $("#__NEXT_DATA__").html();
    if (!raw) return [];

    const data = JSON.parse(raw) as { props: { pageProps: { jobs: NintendoJobPosting[] } } };
    const jobs = data.props.pageProps.jobs;

    return jobs
      .filter((job) => {
        const jobField = job.metadata?.["Job Field"]?.value;
        return typeof jobField === "string" && SOFTWARE_JOB_FIELDS.has(jobField.trim());
      })
      .map((job) => ({
        title: job.title.trim(),
        url: job.absolute_url,
        location: job.location?.name || undefined,
        company: NintendoScraper.company,
        scrapedAt: now,
      }));
  }
}
