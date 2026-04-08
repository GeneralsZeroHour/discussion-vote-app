import { readRuntimeEnv } from "./env.js";
import { loadProjectEnv } from "./project-env.js";
import { createDiscussionVoteServer } from "./server-core.js";

async function main(): Promise<void> {
  loadProjectEnv();
  const env = readRuntimeEnv();
  const { probot, server } = await createDiscussionVoteServer(env);

  await new Promise<void>((resolve, reject) => {
    server.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        reject(
          new Error(
            `Port ${env.port} is already in use. Stop the other process or change PORT in .env before starting the app.`,
          ),
        );
        return;
      }

      reject(error);
    });

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
