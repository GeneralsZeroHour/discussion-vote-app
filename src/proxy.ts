import SmeeClient from "smee-client";
import { z } from "zod";

import { loadProjectEnv } from "./project-env.js";

const proxyEnvSchema = z.object({
  WEBHOOK_PROXY_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(3000),
  WEBHOOK_PATH: z.string().default("/api/github/webhooks"),
});

function main(): void {
  loadProjectEnv();

  const proxyEnv = proxyEnvSchema.parse(process.env);
  const targetUrl = `http://127.0.0.1:${proxyEnv.PORT}${proxyEnv.WEBHOOK_PATH}`;
  const client = new SmeeClient({
    source: proxyEnv.WEBHOOK_PROXY_URL,
    target: targetUrl,
    logger: console,
  });
  const connection = client.start();

  console.log("Webhook forwarding started.");
  console.log(`Source: ${proxyEnv.WEBHOOK_PROXY_URL}`);
  console.log(`Target: ${targetUrl}`);

  const stop = (): void => {
    connection.close();
    process.exit(0);
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main();
