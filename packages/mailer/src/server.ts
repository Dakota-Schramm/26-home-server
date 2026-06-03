import express, { Request, Response } from "express";
import type { MailPayload } from "@home-server/shared";
import { format } from "./emailFormatter";
import { send } from "./emailSender";

export function createApp(): express.Application {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post("/notify", async (req: Request, res: Response) => {
    const body = req.body as MailPayload;

    if (!Array.isArray(body?.results) || typeof body?.triggeredAt !== "string") {
      res.status(400).json({ error: "Invalid payload: expected { results, triggeredAt }" });
      return;
    }

    try {
      const { subject, html } = format(body);
      await send(subject, html);
      console.log(`[mailer] sent "${subject}"`);
      res.json({ ok: true });
    } catch (err) {
      console.error("[mailer] failed to send email:", err);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  return app;
}
