import { summarizeApprovalTable, updateTitleWithSummary } from "./vote-summary.js";

export type DiscussionDetails = {
  number: number;
  title: string;
  body?: string | null;
  htmlUrl?: string;
  nodeId?: string;
};

export type DiscussionTitleComputation = {
  currentTitle: string;
  nextTitle: string;
  summarySuffix: string | null;
  shouldUpdate: boolean;
};

export function computeDiscussionTitleUpdate(
  discussion: DiscussionDetails,
): DiscussionTitleComputation {
  const currentTitle = discussion.title;
  const summarySuffix = summarizeApprovalTable(discussion.body ?? "");
  const nextTitle = updateTitleWithSummary(currentTitle, summarySuffix);

  return {
    currentTitle,
    nextTitle,
    summarySuffix,
    shouldUpdate: nextTitle !== currentTitle,
  };
}

