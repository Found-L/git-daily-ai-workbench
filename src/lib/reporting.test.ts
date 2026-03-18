import { describe, expect, it } from "vitest";

import { buildStructuredReport, filterCommitsForReport, renderFallbackMarkdown } from "@/lib/reporting";
import { resolvePeriodWindow } from "@/lib/period";

const sampleCommits = [
  {
    id: "1",
    hash: "abcdef1234567",
    authorName: "Alice",
    authorEmail: "alice@example.com",
    committedAt: new Date("2026-03-18T08:00:00.000Z"),
    subject: "feat: add dashboard",
    body: null,
    files: ["src/app/page.tsx", "src/components/dashboard-shell.tsx"],
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
    subject: "fix: tighten report export",
    body: null,
    files: ["src/app/api/reports/[reportId]/markdown/route.ts"],
    additions: 20,
    deletions: 2,
    refNames: [],
  },
];

describe("reporting", () => {
  it("filters commits by author and date", () => {
    const window = resolvePeriodWindow("day", "UTC", new Date("2026-03-18T12:00:00.000Z"));
    const commits = filterCommitsForReport({
      commits: sampleCommits,
      window,
      authorNames: ["Alice"],
      authorEmails: [],
    });

    expect(commits).toHaveLength(1);
    expect(commits[0]?.authorName).toBe("Alice");
  });

  it("renders fallback markdown with required sections", () => {
    const window = resolvePeriodWindow("day", "UTC", new Date("2026-03-18T12:00:00.000Z"));
    const structured = buildStructuredReport({
      projectName: "Git Workbench",
      window,
      branchScope: ["main"],
      authorNames: ["Alice"],
      authorEmails: [],
      commits: sampleCommits,
    });
    const markdown = renderFallbackMarkdown({
      projectName: "Git Workbench",
      structured,
    });

    expect(markdown).toContain("## 周期信息");
    expect(markdown).toContain("## 提交统计");
    expect(markdown).toContain("## 原始提交引用列表");
  });
});
