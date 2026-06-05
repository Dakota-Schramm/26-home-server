import { createHash } from "crypto";
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
      checksum TEXT NOT NULL,
      last_updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS scrapers (
      id INTEGER PRIMARY KEY,
      company TEXT NOT NULL,
      last_ran_at TEXT
    )
  `);

  return _db;
}

export function computeChecksum(job: JobListing): string {
  return createHash("sha256")
    .update(`${job.title}|${job.location ?? ""}|${job.description ?? ""}`)
    .digest("hex");
}

export function getChangedJobs(db: Database.Database, jobs: JobListing[]): JobListing[] {
  const stmt = db.prepare<[string], { checksum: string }>(
    "SELECT checksum FROM seen_jobs WHERE url = ?"
  );
  return jobs.flatMap((job) => {
    const row = stmt.get(job.url);
    if (!row) return [job];
    if (row.checksum !== computeChecksum(job)) return [{ ...job, isUpdate: true }];
    return [];
  });
}

export function getScraperLastRan(db: Database.Database, id: number): string | null {
  const row = db.prepare<[number], { last_ran_at: string | null }>(
    "SELECT last_ran_at FROM scrapers WHERE id = ?"
  ).get(id);
  return row?.last_ran_at ?? null;
}

export function upsertScraperRun(db: Database.Database, id: number, company: string): void {
  db.prepare(`
    INSERT INTO scrapers (id, company, last_ran_at)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET last_ran_at = excluded.last_ran_at
  `).run(id, company, new Date().toISOString());
}

export function upsertJobs(db: Database.Database, jobs: JobListing[]): void {
  const stmt = db.prepare(`
    INSERT INTO seen_jobs (url, title, company, location, checksum, last_updated_at)
    VALUES (@url, @title, @company, @location, @checksum, @last_updated_at)
    ON CONFLICT(url) DO UPDATE SET
      title = excluded.title,
      company = excluded.company,
      location = excluded.location,
      checksum = excluded.checksum,
      last_updated_at = excluded.last_updated_at
  `);
  const upsertMany = db.transaction((batch: JobListing[]) => {
    for (const job of batch) {
      stmt.run({
        url: job.url,
        title: job.title,
        company: job.company,
        location: job.location ?? null,
        checksum: computeChecksum(job),
        last_updated_at: job.scrapedAt,
      });
    }
  });
  upsertMany(jobs);
}
