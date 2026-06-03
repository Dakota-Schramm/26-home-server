import axios from "axios";
import type { MailPayload } from "@home-server/shared";
import { config } from "./config";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5_000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendToMailer(payload: MailPayload): Promise<void> {
  const url = `${config.mailerUrl}/notify`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await axios.post(url, payload, { timeout: 10_000 });
      return;
    } catch (err) {
      const isLast = attempt === MAX_RETRIES;
      if (isLast) {
        throw new Error(
          `Mailer unreachable after ${MAX_RETRIES} attempts: ${(err as Error).message}`
        );
      }
      console.warn(`[scraper] mailer attempt ${attempt} failed, retrying in ${RETRY_DELAY_MS}ms...`);
      await sleep(RETRY_DELAY_MS);
    }
  }
}
