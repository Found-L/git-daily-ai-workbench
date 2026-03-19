import { describe, expect, it } from "vitest";

import {
  buildStructuredReport,
  filterCommitsForReport,
  renderFallbackMarkdown,
} from "@/lib/reporting";
import { resolvePeriodWindow } from "@/lib/period";

const englishCommits = [
  {
    id: "1",
    hash: "abcdef1234567",
    authorName: "Alice",
    authorEmail: "alice@example.com",
    committedAt: new Date("2026-03-18T08:00:00.000Z"),
    subject: "feat: add dashboard filter panel",
    body: null,
    files: ["src/components/dashboard-shell.tsx"],
    additions: 120,
    deletions: 20,
    refNames: [],
  },
  {
    id: "2",
    hash: "1234567abcdef",
    authorName: "Bob",
    authorEmail: "bob@example.com",
    committedAt: new Date("2026-03-18T09:00:00.000Z"),
    subject: "fix: improve dashboard filter panel",
    body: null,
    files: ["src/components/dashboard-shell.tsx"],
    additions: 20,
    deletions: 2,
    refNames: [],
  },
  {
    id: "3",
    hash: "9876543210abc",
    authorName: "Bob",
    authorEmail: "bob@example.com",
    committedAt: new Date("2026-03-18T10:00:00.000Z"),
    subject: "merge branch 'main' into feature/report",
    body: "",
    files: [],
    additions: 0,
    deletions: 0,
    refNames: [],
  },
  {
    id: "4",
    hash: "bbbbb2222222",
    authorName: "Alice",
    authorEmail: "alice@example.com",
    committedAt: new Date("2026-03-18T11:00:00.000Z"),
    subject: "fix: tighten report export flow",
    body: null,
    files: ["src/app/api/reports/[reportId]/markdown/route.ts"],
    additions: 12,
    deletions: 1,
    refNames: [],
  },
];

const chineseCommits = [
  {
    id: "5",
    hash: "zzzz1111111",
    authorName: "Found-L",
    authorEmail: "found@example.com",
    committedAt: new Date("2026-03-18T08:00:00.000Z"),
    subject: "fix: 修复导出报告按钮点击失效问题",
    body: null,
    files: ["src/components/report-detail-shell.tsx"],
    additions: 30,
    deletions: 6,
    refNames: [],
  },
  {
    id: "6",
    hash: "yyyy2222222",
    authorName: "Found-L",
    authorEmail: "found@example.com",
    committedAt: new Date("2026-03-18T09:00:00.000Z"),
    subject: "docs: 补充导出流程说明文档",
    body: null,
    files: ["README.md"],
    additions: 18,
    deletions: 0,
    refNames: [],
  },
];

describe("reporting", () => {
  it("filters commits by author and date", () => {
    const window = resolvePeriodWindow("day", "UTC", new Date("2026-03-18T12:00:00.000Z"));
    const commits = filterCommitsForReport({
      commits: englishCommits,
      window,
      authorNames: ["Alice"],
      authorEmails: [],
    });

    expect(commits).toHaveLength(2);
    expect(commits.every((item) => item.authorName === "Alice")).toBe(true);
  });

  it("filters merge noise and merges similar same-day english changes", () => {
    const window = resolvePeriodWindow("day", "UTC", new Date("2026-03-18T12:00:00.000Z"));
    const structured = buildStructuredReport({
      projectName: "Git Workbench",
      window,
      branchScope: ["main"],
      authorNames: [],
      authorEmails: [],
      commits: englishCommits,
    });
    const markdown = renderFallbackMarkdown({
      projectName: "Git Workbench",
      structured,
    });

    expect(structured.dailySummaries).toHaveLength(1);
    expect(structured.dailySummaries[0]?.items).toHaveLength(2);
    expect(structured.dailySummaries[0]?.items[0]).toContain("dashboard filter panel");
    expect(structured.dailySummaries[0]?.items.join(" ")).not.toContain("Merge branch");
    expect(markdown).toContain("## 每日事项清单");
    expect(markdown).toContain("2026-03-18 星期三");
    expect(markdown).toContain("2026-03-18 星期三\n\n1. ");
  });

  it("keeps chinese repository summaries in natural chinese wording", () => {
    const window = resolvePeriodWindow("day", "UTC", new Date("2026-03-18T12:00:00.000Z"));
    const structured = buildStructuredReport({
      projectName: "中文仓库",
      window,
      branchScope: ["main"],
      authorNames: [],
      authorEmails: [],
      commits: chineseCommits,
    });

    expect(structured.dailySummaries[0]?.items).toEqual([
      "修复导出报告按钮点击失效问题",
      "补充导出流程说明文档",
    ]);
  });
});
