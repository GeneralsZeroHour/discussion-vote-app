import { readRuntimeEnv } from "../../../src/env.js";
import { loadProjectEnv } from "../../../src/project-env.js";
import { createDiscussionVoteMiddleware } from "../../../src/server-core.js";

loadProjectEnv();

const middlewarePromise = createDiscussionVoteMiddleware(readRuntimeEnv()).then(
  ({ middleware }) => middleware,
);

export default async function handler(
  request: Parameters<Awaited<typeof middlewarePromise>>[0],
  response: Parameters<Awaited<typeof middlewarePromise>>[1],
): Promise<void> {
  const middleware = await middlewarePromise;

  await middleware(request, response, () => {
    response.statusCode = 404;
    response.end("Not found");
  });
}
