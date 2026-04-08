import type { ApplicationFunction } from "probot";
import { z } from "zod";

import { computeDiscussionTitleUpdate } from "./discussion-title.js";

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
    const titleUpdate = computeDiscussionTitleUpdate({
      number: discussion.number,
      title: discussion.title,
      body: discussion.body,
      htmlUrl: discussion.html_url,
      nodeId: discussion.node_id,
    });

    if (!titleUpdate.shouldUpdate) {
      context.log.info(
        {
          action: context.payload.action,
          discussionNumber: discussion.number,
          discussionUrl: discussion.html_url,
        },
        "Skipping title update because no change is needed.",
      );
      return;
    }

    if (dryRun) {
      context.log.info(
        {
          action: context.payload.action,
          discussionNumber: discussion.number,
          discussionUrl: discussion.html_url,
          previousTitle: titleUpdate.currentTitle,
          nextTitle: titleUpdate.nextTitle,
          summarySuffix: titleUpdate.summarySuffix,
        },
        "Dry-run mode is enabled, so the discussion title was not updated.",
      );
      return;
    }

    if (!discussion.node_id) {
      context.log.warn(
        {
          action: context.payload.action,
          discussionNumber: discussion.number,
          discussionUrl: discussion.html_url,
        },
        "Skipping title update because the discussion node id is missing.",
      );
      return;
    }

    await context.octokit.graphql(updateDiscussionTitleMutation, {
      discussionId: discussion.node_id,
      title: titleUpdate.nextTitle,
    });

    context.log.info(
      {
        action: context.payload.action,
        discussionNumber: discussion.number,
        discussionUrl: discussion.html_url,
        previousTitle: titleUpdate.currentTitle,
        nextTitle: titleUpdate.nextTitle,
        summarySuffix: titleUpdate.summarySuffix,
      },
      "Updated discussion title with vote summary.",
    );
  });
};

export default app;
