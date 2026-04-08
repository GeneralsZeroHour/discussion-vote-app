import { readRuntimeEnv } from "../../../src/env.js";
import { loadProjectEnv } from "../../../src/project-env.js";
import { createDiscussionVoteMiddleware } from "../../../src/server-core.js";

loadProjectEnv();

export default await createDiscussionVoteMiddleware(readRuntimeEnv()).then(
  ({ middleware }) => middleware,
);
