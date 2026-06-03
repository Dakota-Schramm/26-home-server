function require_env(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

export const config = {
  port: parseInt(process.env.PORT ?? "3001", 10),
  smtp: {
    host: require_env("SMTP_HOST"),
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    user: require_env("SMTP_USER"),
    pass: require_env("SMTP_PASS"),
  },
  email: {
    from: require_env("EMAIL_FROM"),
    to: require_env("EMAIL_TO"),
  },
};
