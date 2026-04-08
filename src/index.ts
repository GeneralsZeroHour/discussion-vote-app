import type { ApplicationFunction } from "probot";

import { summarizeApprovalTable, updateTitleWithSummary } from "./vote-summary.js";

type DiscussionPayload = {
  number: number;
  title: string;
  body?: string | null;
  html_url?: string;
  node_id?: string;
};

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

const app: ApplicationFunction = (appInstance) => {
  appInstance.on(["discussion.created", "discussion.edited"], async (context) => {
    const discussion = context.payload.discussion as DiscussionPayload;
    const currentTitle = discussion.title;
    const summarySuffix = summarizeApprovalTable(discussion.body ?? "");
    const nextTitle = updateTitleWithSummary(currentTitle, summarySuffix);

    if (nextTitle === currentTitle) {
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
      title: nextTitle,
    });

    context.log.info(
      {
        action: context.payload.action,
        discussionNumber: discussion.number,
        discussionUrl: discussion.html_url,
        previousTitle: currentTitle,
        nextTitle,
      },
      "Updated discussion title with vote summary.",
    );
  });
};

export default app;

