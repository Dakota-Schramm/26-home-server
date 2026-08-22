import type { MailPayload, ScrapeResult } from "@home-server/shared";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function renderSuccessSection(result: ScrapeResult & { ok: true }): string {
  if (result.jobs.length === 0) {
    return `
      <section style="margin-bottom:32px">
        <h2 style="font-family:sans-serif;color:#374151;border-bottom:2px solid #e5e7eb;padding-bottom:8px">${result.company}</h2>
        <p style="font-family:sans-serif;color:#6b7280;font-style:italic">No listings found.</p>
      </section>`;
  }

  const rows = result.jobs
    .map(
      (job) => `
      <tr>
        <td style="padding:8px 12px;font-family:sans-serif;font-size:14px;color:#111827">
          <a href="${job.url}" style="color:#2563eb;text-decoration:none">${job.title}</a>
          ${job.isUpdate ? `<span style="margin-left:8px;font-size:11px;font-weight:600;color:#92400e;background:#fef3c7;border:1px solid #fcd34d;border-radius:4px;padding:1px 6px">Updated</span>` : ""}
        </td>
        <td style="padding:8px 12px;font-family:sans-serif;font-size:14px;color:#6b7280">${job.location ?? "—"}</td>
      </tr>`
    )
    .join("");

  return `
    <section style="margin-bottom:32px">
      <h2 style="font-family:sans-serif;color:#374151;border-bottom:2px solid #e5e7eb;padding-bottom:8px">
        ${result.company} <span style="font-size:14px;font-weight:normal;color:#6b7280">(${result.jobs.length})</span>
      </h2>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:8px 12px;font-family:sans-serif;font-size:12px;text-align:left;color:#6b7280;text-transform:uppercase">Position</th>
            <th style="padding:8px 12px;font-family:sans-serif;font-size:12px;text-align:left;color:#6b7280;text-transform:uppercase">Location</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
}

function renderErrorSection(result: ScrapeResult & { ok: false }): string {
  return `
    <section style="margin-bottom:32px">
      <h2 style="font-family:sans-serif;color:#374151;border-bottom:2px solid #e5e7eb;padding-bottom:8px">${result.company}</h2>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px 16px;font-family:sans-serif;font-size:14px;color:#991b1b">
        Failed to scrape: ${result.error}
      </div>
    </section>`;
}

export function format(payload: MailPayload): { subject: string; html: string } {
  const date = formatDate(payload.triggeredAt);
  const successCount = payload.results.filter((r) => r.ok).length;
  const allJobs = payload.results
    .filter((r): r is ScrapeResult & { ok: true } => r.ok)
    .flatMap((r) => r.jobs);
  const newCount = allJobs.filter((j) => !j.isUpdate).length;
  const updatedCount = allJobs.filter((j) => j.isUpdate).length;

  const sections = payload.results
    .map((r) =>
      r.ok ? renderSuccessSection(r) : renderErrorSection(r as ScrapeResult & { ok: false })
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="max-width:700px;margin:0 auto;padding:24px;background:#ffffff">
  <header style="margin-bottom:32px">
    <h1 style="font-family:sans-serif;color:#111827;margin:0 0 8px">Job Listings</h1>
    <p style="font-family:sans-serif;color:#6b7280;margin:0">${date}</p>
    <p style="font-family:sans-serif;font-size:14px;color:#374151;margin:12px 0 0;background:#f3f4f6;padding:10px 14px;border-radius:6px">
      <strong>${newCount}</strong> new${updatedCount > 0 ? `, <strong>${updatedCount}</strong> updated` : ""} from <strong>${successCount}</strong> of ${payload.results.length} sources
    </p>
  </header>
  ${sections}
  <footer style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb">
    <p style="font-family:sans-serif;font-size:12px;color:#9ca3af">Scraped at ${new Date(payload.triggeredAt).toISOString()}</p>
  </footer>
</body>
</html>`;

  return {
    subject: `Job Listings — ${date}`,
    html,
  };
}
