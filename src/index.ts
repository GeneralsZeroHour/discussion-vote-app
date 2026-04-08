import type { ApplicationFunction } from "probot";
import { z } from "zod";

import { handleDiscussionEvent } from "./discussion-handler.js";
import {
  rememberGraphQlCooldown,
  throwIfGraphQlCooldownActive,
  toGraphQlRateLimitError,
} from "./rate-limit.js";

const updateDiscussionTitleMutation = `
  mutation UpdateDiscussionTitle($discussionId: ID!, $title: String!) {
    updateDiscussion(input: { discussionId: $discussionId, title: $title }) {
      discussion {
        id
        title
        url
      }
    }
  }
`;

const discussionPayloadSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string().nullable().optional(),
  html_url: z.string().optional(),
  node_id: z.string().optional(),
});

const app: ApplicationFunction = (appInstance) => {
  appInstance.on(["discussion.created", "discussion.edited"], async (context) => {
    const dryRun = process.env.DRY_RUN === "true";
    const discussion = discussionPayloadSchema.parse(context.payload.discussion);
    await handleDiscussionEvent({
      action: context.payload.action,
      discussion: {
        number: discussion.number,
        title: discussion.title,
        body: discussion.body,
        htmlUrl: discussion.html_url,
        nodeId: discussion.node_id,
      },
      dryRun,
      updateTitle: async ({ discussionNodeId, nextTitle }) => {
        throwIfGraphQlCooldownActive();

        try {
          await context.octokit.graphql(updateDiscussionTitleMutation, {
            discussionId: discussionNodeId,
            title: nextTitle,
          });
        } catch (error) {
          const rateLimitError = toGraphQlRateLimitError(error);

          if (rateLimitError) {
            rememberGraphQlCooldown(rateLimitError.retryAfterSeconds);
            throw rateLimitError;
          }

          throw error;
        }
      },
      log: (level, message, details) => {
        if (level === "warn") {
          context.log.warn(details, message);
          return;
        }

        context.log.info(details, message);
      },
    });
  });
};

export default app;
