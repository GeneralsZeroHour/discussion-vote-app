import type { ApplicationFunction } from "probot";
import { z } from "zod";

import { handleDiscussionEvent } from "./discussion-handler.js";

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
        await context.octokit.graphql(updateDiscussionTitleMutation, {
          discussionId: discussionNodeId,
          title: nextTitle,
        });
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
