import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { z } from "zod";

import { handleDiscussionEvent } from "./discussion-handler.js";
import { loadProjectEnv } from "./project-env.js";

const webhookFixtureSchema = z.object({
  action: z.string(),
  discussion: z.object({
    number: z.number(),
    title: z.string(),
    body: z.string().nullable().optional(),
    html_url: z.string().optional(),
    node_id: z.string().optional(),
  }),
});

async function main(): Promise<void> {
  loadProjectEnv();

  const fixturePath = resolve(
    process.cwd(),
    process.argv[2] ?? "fixtures/discussion-edited.sample.json",
  );
  const payload = webhookFixtureSchema.parse(
    JSON.parse(readFileSync(fixturePath, "utf8")),
  );
  const result = await handleDiscussionEvent({
    action: payload.action,
    discussion: {
      number: payload.discussion.number,
      title: payload.discussion.title,
      body: payload.discussion.body,
      htmlUrl: payload.discussion.html_url,
      nodeId: payload.discussion.node_id,
    },
    dryRun: true,
    updateTitle: async () => {
      throw new Error("updateTitle should not be called during dry-run smoke tests.");
    },
    log: (level, message, details) => {
      const serializedDetails = JSON.stringify(details);
      console.log(`${level.toUpperCase()} ${message} ${serializedDetails}`);
    },
  });

  console.log(`Fixture: ${fixturePath}`);
  console.log(`Action: ${payload.action}`);
  console.log(`Delivery id: ${randomUUID()}`);
  console.log(`Current title: ${result.currentTitle}`);
  console.log(`Summary suffix: ${result.summarySuffix ?? "(none)"}`);
  console.log(`Next title: ${result.nextTitle}`);
  console.log(`Status: ${result.status}`);
  console.log("Smoke test passed.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
