import assert from "node:assert/strict";

import { computeDiscussionTitleUpdate } from "../src/discussion-title.js";
import {
  extractApprovalCounts,
  stripManagedSuffix,
  summarizeApprovalTable,
  updateTitleWithSummary,
} from "../src/vote-summary.js";

run("summarizeApprovalTable counts literal approval values", () => {
  const markdown = `
| Member | Approval | Comments |
|--------|----------|----------|
| Max | ✅ | |
| Mark | ✅ | |
| Mulan | ✅ | |
| Marek | ❌ | |
| Martin | ❌ | |
`;

  assert.equal(summarizeApprovalTable(markdown), "[✅ 3, ❌ 2]");
});

run("extractApprovalCounts skips empty cells and preserves first appearance order for ties", () => {
  const markdown = `
| Member | Approval | Comments |
|--------|----------|----------|
| Max | 🤷 | |
| Mark |   | |
| Mulan | ✅ | |
| Marek | 🤷 | |
| Martin | ✅ | |
`;

  assert.deepEqual(extractApprovalCounts(markdown), [
    { value: "🤷", count: 2 },
    { value: "✅", count: 2 },
  ]);
});

run("summarizeApprovalTable uses the first table with an Approval column", () => {
  const markdown = `
| Name | Status |
|------|--------|
| Intro | Draft |

| Member | Approval | Comments |
|--------|----------|----------|
| Max | ✅ | |
| Marek | ❌ | |
`;

  assert.equal(summarizeApprovalTable(markdown), "[✅ 1, ❌ 1]");
});

run("updateTitleWithSummary replaces an existing managed suffix", () => {
  const currentTitle = "Should we merge this? [✅ 2, ❌ 1]";

  assert.equal(
    updateTitleWithSummary(currentTitle, "[✅ 3, ❌ 2]"),
    "Should we merge this? [✅ 3, ❌ 2]",
  );
});

run("updateTitleWithSummary leaves the title unchanged when no summary was found", () => {
  const currentTitle = "Should we merge this? [✅ 2, ❌ 1]";

  assert.equal(updateTitleWithSummary(currentTitle, null), currentTitle);
});

run("stripManagedSuffix keeps the human-written part of the title", () => {
  assert.equal(stripManagedSuffix("Proposal title [✅ 3, ❌ 2]"), "Proposal title");
});

run("computeDiscussionTitleUpdate reports the next title for a discussion body", () => {
  const result = computeDiscussionTitleUpdate({
    number: 42,
    title: "Should we merge this?",
    body: `
| Member | Approval | Comments |
|--------|----------|----------|
| Max | ✅ | |
| Mark | ✅ | |
| Marek | ❌ | |
`,
  });

  assert.deepEqual(result, {
    currentTitle: "Should we merge this?",
    nextTitle: "Should we merge this? [✅ 2, ❌ 1]",
    summarySuffix: "[✅ 2, ❌ 1]",
    shouldUpdate: true,
  });
});

function run(name: string, assertion: () => void): void {
  try {
    assertion();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}
