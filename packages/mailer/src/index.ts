import { config } from "./config";
import { createApp } from "./server";

const app = createApp();

app.listen(config.port, () => {
  console.log(`[mailer] listening on port ${config.port}`);
});
