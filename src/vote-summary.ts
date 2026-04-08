export type VoteCount = {
  value: string;
  count: number;
};

type RankedVoteCount = VoteCount & {
  firstAppearance: number;
};

const managedSuffixPattern = /\s\[(?:[^[\]]+ \d+)(?:, [^[\]]+ \d+)*\]$/u;

export function summarizeApprovalTable(markdown: string): string | null {
  const counts = extractApprovalCounts(markdown);

  if (counts.length === 0) {
    return null;
  }

  const entries = counts.map(({ value, count }) => `${value} ${count}`);

  return `[${entries.join(", ")}]`;
}

export function updateTitleWithSummary(currentTitle: string, summarySuffix: string | null): string {
  if (!summarySuffix) {
    return currentTitle;
  }

  const baseTitle = stripManagedSuffix(currentTitle).trimEnd();

  return `${baseTitle} ${summarySuffix}`.trim();
}

export function stripManagedSuffix(title: string): string {
  return title.replace(managedSuffixPattern, "");
}

export function extractApprovalCounts(markdown: string): VoteCount[] {
  const lines = markdown.split(/\r?\n/);

  for (let index = 0; index < lines.length - 1; index += 1) {
    const headerLine = lines[index];
    const separatorLine = lines[index + 1];

    if (!looksLikeTableRow(headerLine) || !looksLikeSeparatorRow(separatorLine)) {
      continue;
    }

    const headerCells = splitMarkdownTableRow(headerLine);
    const approvalIndex = headerCells.findIndex(
      (cell) => cell.trim().toLowerCase() === "approval",
    );

    if (approvalIndex === -1) {
      continue;
    }

    const counts = new Map<string, RankedVoteCount>();
    let firstAppearance = 0;

    for (let rowIndex = index + 2; rowIndex < lines.length; rowIndex += 1) {
      const rowLine = lines[rowIndex];

      if (!looksLikeTableRow(rowLine)) {
        break;
      }

      const rowCells = splitMarkdownTableRow(rowLine);
      const value = rowCells[approvalIndex]?.trim() ?? "";

      if (!value) {
        continue;
      }

      const current = counts.get(value);

      if (current) {
        current.count += 1;
        continue;
      }

      counts.set(value, {
        value,
        count: 1,
        firstAppearance,
      });
      firstAppearance += 1;
    }

    return [...counts.values()]
      .sort((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count;
        }

        return left.firstAppearance - right.firstAppearance;
      })
      .map(({ value, count }) => ({ value, count }));
  }

  return [];
}

function looksLikeTableRow(line: string): boolean {
  return line.includes("|");
}

function looksLikeSeparatorRow(line: string): boolean {
  const cells = splitMarkdownTableRow(line);

  if (cells.length === 0) {
    return false;
  }

  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, "")));
}

function splitMarkdownTableRow(line: string): string[] {
  const trimmed = line.trim();

  if (!trimmed.includes("|")) {
    return [];
  }

  const segments = trimmed.split("|");

  if (trimmed.startsWith("|")) {
    segments.shift();
  }

  if (trimmed.endsWith("|")) {
    segments.pop();
  }

  return segments.map((segment) => segment.trim());
}

