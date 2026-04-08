import { computeDiscussionTitleUpdate, type DiscussionDetails } from "./discussion-title.js";

export type DiscussionEventInput = {
  action: string;
  discussion: DiscussionDetails;
  dryRun: boolean;
  updateTitle: (input: { discussionNodeId: string; nextTitle: string }) => Promise<void>;
  log: (level: "info" | "warn", message: string, details: Record<string, unknown>) => void;
};

export type DiscussionEventResult =
  | {
      status: "skipped";
      reason: "no-change" | "missing-node-id";
      currentTitle: string;
      nextTitle: string;
      summarySuffix: string | null;
    }
  | {
      status: "dry-run";
      currentTitle: string;
      nextTitle: string;
      summarySuffix: string | null;
    }
  | {
      status: "updated";
      currentTitle: string;
      nextTitle: string;
      summarySuffix: string | null;
    };

export async function handleDiscussionEvent(
  input: DiscussionEventInput,
): Promise<DiscussionEventResult> {
  const titleUpdate = computeDiscussionTitleUpdate(input.discussion);
  const logDetails = {
    action: input.action,
    discussionNumber: input.discussion.number,
    discussionUrl: input.discussion.htmlUrl,
    previousTitle: titleUpdate.currentTitle,
    nextTitle: titleUpdate.nextTitle,
    summarySuffix: titleUpdate.summarySuffix,
  };

  if (!titleUpdate.shouldUpdate) {
    input.log("info", "Skipping title update because no change is needed.", {
      action: input.action,
      discussionNumber: input.discussion.number,
      discussionUrl: input.discussion.htmlUrl,
    });
    return {
      status: "skipped",
      reason: "no-change",
      currentTitle: titleUpdate.currentTitle,
      nextTitle: titleUpdate.nextTitle,
      summarySuffix: titleUpdate.summarySuffix,
    };
  }

  if (input.dryRun) {
    input.log("info", "Dry-run mode is enabled, so the discussion title was not updated.", logDetails);
    return {
      status: "dry-run",
      currentTitle: titleUpdate.currentTitle,
      nextTitle: titleUpdate.nextTitle,
      summarySuffix: titleUpdate.summarySuffix,
    };
  }

  if (!input.discussion.nodeId) {
    input.log("warn", "Skipping title update because the discussion node id is missing.", {
      action: input.action,
      discussionNumber: input.discussion.number,
      discussionUrl: input.discussion.htmlUrl,
    });
    return {
      status: "skipped",
      reason: "missing-node-id",
      currentTitle: titleUpdate.currentTitle,
      nextTitle: titleUpdate.nextTitle,
      summarySuffix: titleUpdate.summarySuffix,
    };
  }

  await input.updateTitle({
    discussionNodeId: input.discussion.nodeId,
    nextTitle: titleUpdate.nextTitle,
  });

  input.log("info", "Updated discussion title with vote summary.", logDetails);

  return {
    status: "updated",
    currentTitle: titleUpdate.currentTitle,
    nextTitle: titleUpdate.nextTitle,
    summarySuffix: titleUpdate.summarySuffix,
  };
}

