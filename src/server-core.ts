import { generateKeyPairSync } from "node:crypto";
import { createServer, type Server } from "node:http";

import { Probot, createNodeMiddleware } from "probot";

import app from "./index.js";
import type { RuntimeEnv } from "./env.js";

export type DiscussionVoteServer = {
  probot: Probot;
  server: Server;
};

export async function createDiscussionVoteServer(env: RuntimeEnv): Promise<DiscussionVoteServer> {
  const appId = env.appId ?? (env.dryRun ? 1 : undefined);
  const privateKey = env.privateKey ?? (env.dryRun ? generateEphemeralPrivateKey() : undefined);
  const probot = new Probot({
    appId,
    privateKey,
    secret: env.webhookSecret,
    webhookPath: env.webhookPath,
    logLevel: env.logLevel,
  });

  if (env.dryRun) {
    probot.log.info("Dry-run mode is enabled. Incoming discussions will be evaluated but not updated.");
  }

  const middleware = await createNodeMiddleware(app, {
    probot,
    webhooksPath: env.webhookPath,
  });

  const server = createServer((request, response) => {
    void middleware(request, response, () => {
      response.statusCode = 404;
      response.end("Not found");
    });
  });

  return {
    probot,
    server,
  };
}

function generateEphemeralPrivateKey(): string {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: {
      type: "pkcs1",
      format: "pem",
    },
  });

  return privateKey;
}
