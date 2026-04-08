import { createServer } from "node:http";

import { Probot, createNodeMiddleware } from "probot";

import app from "./index.js";
import { readRuntimeEnv } from "./env.js";

async function main(): Promise<void> {
  const env = readRuntimeEnv();
  const probot = new Probot({
    appId: env.appId,
    privateKey: env.privateKey,
    secret: env.webhookSecret,
    webhookPath: env.webhookPath,
    logLevel: env.logLevel,
  });

  if (env.dryRun) {
    probot.log.info("Dry-run mode is enabled. Incoming discussions will be evaluated but not updated.");
  }

  const middleware = createNodeMiddleware(app, {
    probot,
    webhooksPath: env.webhookPath,
  });
  const server = createServer((request, response) => {
    void middleware(request, response, () => {
      response.statusCode = 404;
      response.end("Not found");
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(env.port, () => {
      probot.log.info(
        {
          port: env.port,
          webhookPath: env.webhookPath,
        },
        "Discussion vote app is listening for webhooks.",
      );
      resolve();
    });
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
