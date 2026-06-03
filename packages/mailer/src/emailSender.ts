import nodemailer from "nodemailer";
import { config } from "./config";

const transport = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

export async function send(subject: string, html: string): Promise<void> {
  await transport.sendMail({
    from: config.email.from,
    to: config.email.to,
    subject,
    html,
  });
}
