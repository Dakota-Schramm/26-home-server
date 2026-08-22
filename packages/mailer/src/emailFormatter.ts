import type { MailPayload, ScrapeResult } from "@home-server/shared";

function renderSuccessSection(result: ScrapeResult & { ok: true }): string {
  if (result.jobs.length === 0) {
    return `<p style="font-family:sans-serif;color:#6b7280;font-style:italic">No listings found.</p>`;
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
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f9fafb">
          <th style="padding:8px 12px;font-family:sans-serif;font-size:12px;text-align:left;color:#6b7280;text-transform:uppercase">Position</th>
          <th style="padding:8px 12px;font-family:sans-serif;font-size:12px;text-align:left;color:#6b7280;text-transform:uppercase">Location</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderErrorSection(result: ScrapeResult & { ok: false }): string {
  return `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px 16px;font-family:sans-serif;font-size:14px;color:#991b1b">
      Failed to scrape: ${result.error}
    </div>`;
}

export function format(payload: MailPayload): { subject: string; html: string } {
  const result = payload.results[0];

  const subject = result.ok
    ? `${result.jobs.length} new job postings from ${result.company}`
    : `Failed to scrape ${result.company}`;

  const body = result.ok ? renderSuccessSection(result) : renderErrorSection(result);

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="max-width:700px;margin:0 auto;padding:24px;background:#ffffff">
  ${body}
</body>
</html>`;

  return { subject, html };
}
