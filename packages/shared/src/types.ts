export interface JobListing {
  title: string;
  url: string;
  location?: string;
  company: string;
  scrapedAt: string;
  description?: string;
  isUpdate?: boolean;
}

export type ScrapeResult =
  | { ok: true; company: string; jobs: JobListing[] }
  | { ok: false; company: string; error: string };

export interface MailPayload {
  results: ScrapeResult[];
  triggeredAt: string;
}
