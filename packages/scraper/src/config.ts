function require_env(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

export const config = {
  mailerUrl: require_env("MAILER_URL"),
  dbPath: process.env.DB_PATH ?? "/data/scraper.db",
};
