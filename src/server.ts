import { readRuntimeEnv } from "./env.js";
import { loadProjectEnv } from "./project-env.js";
import { createDiscussionVoteServer } from "./server-core.js";

async function main(): Promise<void> {
  loadProjectEnv();
  const env = readRuntimeEnv();
  const { probot, server } = await createDiscussionVoteServer(env);

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
