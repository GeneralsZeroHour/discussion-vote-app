import { generateKeyPairSync } from "node:crypto";
import { createServer, type Server } from "node:http";

import type { Octokit } from "@octokit/core";
import type { EndpointDefaults } from "@octokit/types";
import { Probot, ProbotOctokit, createNodeMiddleware } from "probot";

import app from "./index.js";
import type { RuntimeEnv } from "./env.js";
import { isGraphQlRequest, rememberGraphQlCooldown } from "./rate-limit.js";

const DiscussionVoteOctokit = ProbotOctokit.defaults({
  throttle: {
    onRateLimit: (retryAfter: number, options: Required<EndpointDefaults>, octokit: Octokit) => {
      if (isGraphQlRequest(options)) {
        rememberGraphQlCooldown(retryAfter);
        octokit.log.warn(
          `GraphQL quota exhausted for "${options.method} ${options.url}". Skipping automatic retry for ${retryAfter} seconds.`,
        );
        return false;
      }

      octokit.log.warn(
        `Rate limit hit with "${options.method} ${options.url}", retrying in ${retryAfter} seconds.`,
      );
      return true;
    },
    onSecondaryRateLimit: (
      retryAfter: number,
      options: Required<EndpointDefaults>,
      octokit: Octokit,
    ) => {
      if (isGraphQlRequest(options)) {
        rememberGraphQlCooldown(retryAfter);
        octokit.log.warn(
          `Secondary GraphQL rate limit hit for "${options.method} ${options.url}". Skipping automatic retry for ${retryAfter} seconds.`,
        );
        return false;
      }

      octokit.log.warn(
        `Secondary rate limit hit with "${options.method} ${options.url}", retrying in ${retryAfter} seconds.`,
      );
      return true;
    },
  },
});

export type DiscussionVoteServer = {
  probot: Probot;
  server: Server;
};

export function createDiscussionVoteProbot(env: RuntimeEnv): Probot {
  const appId = env.appId ?? (env.dryRun ? 1 : undefined);
  const privateKey = env.privateKey ?? (env.dryRun ? generateEphemeralPrivateKey() : undefined);
  return new Probot({
    appId,
    privateKey,
    Octokit: DiscussionVoteOctokit,
    secret: env.webhookSecret,
    webhookPath: env.webhookPath,
    logLevel: env.logLevel,
  });
}

export async function createDiscussionVoteMiddleware(env: RuntimeEnv): Promise<{
  probot: Probot;
  middleware: Awaited<ReturnType<typeof createNodeMiddleware>>;
}> {
  const probot = createDiscussionVoteProbot(env);
  await probot.ready();

  if (env.dryRun) {
    probot.log.info("Dry-run mode is enabled. Incoming discussions will be evaluated but not updated.");
  }

  const middleware = await createNodeMiddleware(app, {
    probot,
    webhooksPath: env.webhookPath,
  });

  return {
    probot,
    middleware,
  };
}

export async function createDiscussionVoteServer(env: RuntimeEnv): Promise<DiscussionVoteServer> {
  const { probot, middleware } = await createDiscussionVoteMiddleware(env);

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
