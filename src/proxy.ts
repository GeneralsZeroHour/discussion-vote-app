import SmeeClient from "smee-client";
import { z } from "zod";

import { loadProjectEnv } from "./project-env.js";

const proxyEnvSchema = z.object({
  WEBHOOK_PROXY_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(3000),
  WEBHOOK_PATH: z.string().default("/api/github/webhooks"),
});

async function main(): Promise<void> {
  loadProjectEnv();

  const proxyEnv = proxyEnvSchema.parse(process.env);
  const targetUrl = `http://127.0.0.1:${proxyEnv.PORT}${proxyEnv.WEBHOOK_PATH}`;
  const client = new SmeeClient({
    source: proxyEnv.WEBHOOK_PROXY_URL,
    target: targetUrl,
    logger: console,
  });
  await client.start();

  console.log("Webhook forwarding started.");
  console.log(`Source: ${proxyEnv.WEBHOOK_PROXY_URL}`);
  console.log(`Target: ${targetUrl}`);

  const stop = async (): Promise<void> => {
    await client.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void stop();
  });
  process.on("SIGTERM", () => {
    void stop();
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
