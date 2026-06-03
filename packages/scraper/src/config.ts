function require_env(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

export const config = {
  mailerUrl: require_env("MAILER_URL"),
  cronSchedule: process.env.CRON_SCHEDULE ?? "0 8 * * *",
  runOnStartup: process.env.RUN_ON_STARTUP === "true",
};
