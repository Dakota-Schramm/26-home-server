import Database from "better-sqlite3";
import type { JobListing } from "@home-server/shared";

let _db: Database.Database | null = null;

export function openDb(path: string): Database.Database {
  if (_db) return _db;

  _db = new Database(path);
  _db.exec(`
    CREATE TABLE IF NOT EXISTS seen_jobs (
      url TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT,
      first_seen_at TEXT NOT NULL
    )
  `);

  return _db;
}

export function filterNewJobs(db: Database.Database, jobs: JobListing[]): JobListing[] {
  const stmt = db.prepare<[string], { url: string }>("SELECT url FROM seen_jobs WHERE url = ?");
  return jobs.filter((job) => !stmt.get(job.url));
}

export function markJobsSeen(db: Database.Database, jobs: JobListing[]): void {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO seen_jobs (url, title, company, location, first_seen_at) VALUES (@url, @title, @company, @location, @first_seen_at)"
  );
  const insertMany = db.transaction((batch: JobListing[]) => {
    for (const job of batch) {
      insert.run({
        url: job.url,
        title: job.title,
        company: job.company,
        location: job.location ?? null,
        first_seen_at: job.scrapedAt,
      });
    }
  });
  insertMany(jobs);
}
