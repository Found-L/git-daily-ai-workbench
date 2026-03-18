import OpenAI from "openai";
import { formatInTimeZone } from "date-fns-tz";

import type { CommitRecordView, PeriodWindow, StructuredReport } from "@/lib/types";
import { shortHash } from "@/lib/utils";

function groupCount(values: string[]) {
  const map = new Map<string, number>();

  for (const value of values) {
    map.set(value, (map.get(value) ?? 0) + 1);
  }

  return [...map.entries()].sort((left, right) => right[1] - left[1]);
}

export function filterCommitsForReport(params: {
  commits: CommitRecordView[];
  window: PeriodWindow;
  authorNames: string[];
  authorEmails: string[];
}) {
  const allowedNames = new Set(params.authorNames.map((value) => value.toLowerCase()));
  const allowedEmails = new Set(params.authorEmails.map((value) => value.toLowerCase()));

  return params.commits.filter((commit) => {
    const inWindow = commit.committedAt >= params.window.start && commit.committedAt <= params.window.end;
    if (!inWindow) {
      return false;
    }

    const allowAllAuthors = allowedNames.size === 0 && allowedEmails.size === 0;
    if (allowAllAuthors) {
      return true;
    }

    return (
      allowedNames.has(commit.authorName.toLowerCase()) ||
      allowedEmails.has(commit.authorEmail.toLowerCase())
    );
  });
}

function collectHighlights(commits: CommitRecordView[]) {
  if (commits.length === 0) {
    return ["本周期没有符合条件的提交。"];
  }

  return commits
    .slice(0, 5)
    .map((commit) => `${commit.subject} (${shortHash(commit.hash)})`)
    .filter(Boolean);
}

function inferRisks(commits: CommitRecordView[], hotspots: Array<{ file: string; touches: number }>) {
  const riskSignals: string[] = [];
  if (commits.length >= 25) {
    riskSignals.push("提交量较高，建议人工复核关键需求是否已经完整联调。");
  }

  const infraTouches = hotspots.filter((item) =>
    /schema|config|env|workflow|deploy|auth/i.test(item.file),
  );
  if (infraTouches.length > 0) {
    riskSignals.push("涉及配置或基础设施文件，发布前建议复查环境差异与凭据配置。");
  }

  const revertLike = commits.some((commit) => /revert|rollback|hotfix/i.test(commit.subject));
  if (revertLike) {
    riskSignals.push("存在回滚或热修关键字，建议回看上下游影响。");
  }

  return riskSignals.length > 0 ? riskSignals : ["未发现明显高风险信号，建议关注热点文件的回归测试。"];
}

function inferNextSteps(commits: CommitRecordView[], hotspots: Array<{ file: string; touches: number }>) {
  const suggestions = new Set<string>();

  if (commits.length > 0) {
    suggestions.add("确认本周期提交是否都已补充测试或验收记录。");
  }

  if (hotspots[0]) {
    suggestions.add(`优先回归热点文件 ${hotspots[0].file} 相关流程。`);
  }

  if (commits.some((commit) => /api|route|service/i.test(commit.subject))) {
    suggestions.add("检查接口变更是否同步影响前端、文档与调用方。");
  }

  return [...suggestions];
}

export function buildStructuredReport(params: {
  projectName: string;
  window: PeriodWindow;
  branchScope: string[];
  authorNames: string[];
  authorEmails: string[];
  commits: CommitRecordView[];
}): StructuredReport {
  const authorGroups = groupCount(params.commits.map((commit) => commit.authorName));
  const hotspotGroups = groupCount(params.commits.flatMap((commit) => commit.files));
  const additions = params.commits.reduce((total, commit) => total + commit.additions, 0);
  const deletions = params.commits.reduce((total, commit) => total + commit.deletions, 0);

  const hotspots = hotspotGroups.slice(0, 8).map(([file, touches]) => ({
    file,
    touches,
  }));

  return {
    periodLabel: params.window.label,
    period: params.window.period,
    timezone: params.window.timezone,
    branchScope: params.branchScope,
    authorScope: {
      names: params.authorNames,
      emails: params.authorEmails,
    },
    totals: {
      commits: params.commits.length,
      authors: authorGroups.length,
      additions,
      deletions,
      filesTouched: hotspotGroups.length,
    },
    topAuthors: authorGroups.slice(0, 5).map(([name, commits]) => ({
      name,
      commits,
    })),
    hotspots,
    highlights: collectHighlights(params.commits),
    risks: inferRisks(params.commits, hotspots),
    nextSteps: inferNextSteps(params.commits, hotspots),
    commitReferences: params.commits.slice(0, 30).map((commit) => ({
      hash: commit.hash,
      shortHash: shortHash(commit.hash),
      authorName: commit.authorName,
      committedAt: formatInTimeZone(commit.committedAt, params.window.timezone, "yyyy-MM-dd HH:mm"),
      subject: commit.subject,
      files: commit.files.slice(0, 5),
    })),
  };
}

export function renderFallbackMarkdown(params: {
  projectName: string;
  structured: StructuredReport;
}) {
  const { projectName, structured } = params;
  const branchScope = structured.branchScope.length > 0 ? structured.branchScope.join(", ") : "全部分支";
  const authorScope =
    structured.authorScope.names.length > 0 || structured.authorScope.emails.length > 0
      ? [...structured.authorScope.names, ...structured.authorScope.emails].join(", ")
      : "全部作者";

  const hotspotLines =
    structured.hotspots.length > 0
      ? structured.hotspots.map((item) => `- ${item.file}: ${item.touches} 次触达`).join("\n")
      : "- 无";

  const authorLines =
    structured.topAuthors.length > 0
      ? structured.topAuthors.map((item) => `- ${item.name}: ${item.commits} 次提交`).join("\n")
      : "- 无";

  const commitLines =
    structured.commitReferences.length > 0
      ? structured.commitReferences
          .map(
            (item) =>
              `- ${item.shortHash} | ${item.committedAt} | ${item.authorName} | ${item.subject}`,
          )
          .join("\n")
      : "- 本周期没有提交";

  return `# ${projectName} ${structured.period === "day" ? "日报" : structured.period === "week" ? "周报" : "月报"}

## 周期信息

- 时间范围：${structured.periodLabel}
- 时区：${structured.timezone}
- 分支范围：${branchScope}
- 作者范围：${authorScope}

## 提交统计

- 提交数：${structured.totals.commits}
- 作者数：${structured.totals.authors}
- 新增行数：${structured.totals.additions}
- 删除行数：${structured.totals.deletions}
- 触达文件数：${structured.totals.filesTouched}

## 重点变更

${structured.highlights.map((item) => `- ${item}`).join("\n")}

## 热点文件

${hotspotLines}

## 作者分布

${authorLines}

## 风险与阻塞

${structured.risks.map((item) => `- ${item}`).join("\n")}

## 下一步建议

${structured.nextSteps.map((item) => `- ${item}`).join("\n")}

## 原始提交引用列表

${commitLines}
`;
}

export async function generateMarkdownWithAi(params: {
  structured: StructuredReport;
  projectName: string;
  baseUrl: string | null;
  apiKey: string | null;
  model: string | null;
  temperature: number;
}) {
  if (!params.baseUrl || !params.apiKey || !params.model) {
    return null;
  }

  const client = new OpenAI({
    baseURL: params.baseUrl,
    apiKey: params.apiKey,
  });

  const completion = await client.chat.completions.create({
    model: params.model,
    temperature: params.temperature,
    messages: [
      {
        role: "system",
        content:
          "你是一名技术团队日报助手。请根据结构化输入生成中文 Markdown 报告，必须包含：周期信息、提交统计、重点变更、风险/阻塞、下一步建议、原始提交引用列表。避免捏造事实，结论只基于输入。",
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            projectName: params.projectName,
            structured: params.structured,
          },
          null,
          2,
        ),
      },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() ?? null;
}
