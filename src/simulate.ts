import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { z } from "zod";

import { computeDiscussionTitleUpdate } from "./discussion-title.js";

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

function main(): void {
  const fixturePath = resolve(
    process.cwd(),
    process.argv[2] ?? "fixtures/discussion-edited.sample.json",
  );
  const raw = readFileSync(fixturePath, "utf8");
  const payload = webhookFixtureSchema.parse(JSON.parse(raw));
  const result = computeDiscussionTitleUpdate({
    number: payload.discussion.number,
    title: payload.discussion.title,
    body: payload.discussion.body,
    htmlUrl: payload.discussion.html_url,
    nodeId: payload.discussion.node_id,
  });

  console.log(`Fixture: ${fixturePath}`);
  console.log(`Action: ${payload.action}`);
  console.log(`Discussion #${payload.discussion.number}`);
  console.log(`Current title: ${result.currentTitle}`);
  console.log(`Summary suffix: ${result.summarySuffix ?? "(none)"}`);
  console.log(`Next title: ${result.nextTitle}`);
  console.log(`Would update title: ${result.shouldUpdate ? "yes" : "no"}`);
}

main();

