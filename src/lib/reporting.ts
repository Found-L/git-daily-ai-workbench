import OpenAI from "openai";
import { formatInTimeZone } from "date-fns-tz";

import type {
  CommitRecordView,
  PeriodWindow,
  StructuredDailySummary,
  StructuredReport,
} from "@/lib/types";
import { shortHash } from "@/lib/utils";

type SummaryCandidate = {
  rendered: string;
  similarityTokens: string[];
  topicTokens: string[];
};

const MERGE_NOISE_PATTERNS = [
  /^merge (remote-tracking )?branch /i,
  /^merge pull request #\d+/i,
  /^merged? in /i,
] as const;

const STOP_TOKENS = new Set([
  "feat",
  "fix",
  "docs",
  "chore",
  "build",
  "test",
  "ci",
  "refactor",
  "update",
  "improve",
  "add",
  "新增",
  "修复",
  "优化",
  "调整",
  "补充",
  "完善",
  "统一",
  "支持",
  "处理",
  "改进",
  "清理",
  "重构",
  "merge",
  "branch",
  "代码",
  "问题",
  "流程",
  "逻辑",
]);

function groupCount(values: string[]) {
  const map = new Map<string, number>();

  for (const value of values) {
    map.set(value, (map.get(value) ?? 0) + 1);
  }

  return [...map.entries()].sort((left, right) => right[1] - left[1]);
}

function formatWeekday(value: Date, timezone: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    weekday: "long",
    timeZone: timezone,
  }).format(value);
}

function hasChinese(text: string) {
  return /[\u4e00-\u9fff]/.test(text);
}

function detectRepoLanguage(commits: CommitRecordView[]) {
  let zhScore = 0;
  let enScore = 0;

  for (const commit of commits) {
    if (hasChinese(commit.subject)) {
      zhScore += 1;
    } else {
      enScore += 1;
    }
  }

  return zhScore >= enScore ? "zh" : "en";
}

function stripConventionalPrefix(subject: string) {
  const trimmed = subject.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return "";
  }

  return trimmed.replace(/^[a-z]+(?:\([^)]+\))?!?:\s*/i, "");
}

function isPureMergeNoise(commit: CommitRecordView) {
  const subject = commit.subject.trim();
  const body = commit.body?.trim() ?? "";

  if (MERGE_NOISE_PATTERNS.some((pattern) => pattern.test(subject))) {
    return true;
  }

  if (/^merge /i.test(subject) && body.length === 0) {
    return true;
  }

  return false;
}

function normalizeChineseSummary(summary: string) {
  return summary
    .replace(/[。；;]+$/g, "")
    .replace(/^修复一下/i, "修复")
    .replace(/^新增一个/i, "新增")
    .replace(/^补充一下/i, "补充")
    .trim();
}

function normalizeEnglishSummary(summary: string) {
  const cleaned = summary.replace(/[.]+$/g, "").trim();
  const normalized = cleaned.replace(/\s+/g, " ");
  if (!normalized) {
    return "补充本次改动说明";
  }

  const parts = normalized.split(" ");
  const first = parts[0]?.toLowerCase() ?? "";
  const rest = parts.slice(1).join(" ").trim().replace(/\band\b/gi, "与");
  const verbMap: Record<string, string> = {
    add: "新增",
    create: "新增",
    introduce: "新增",
    implement: "实现",
    support: "支持",
    fix: "修复",
    resolve: "修复",
    handle: "处理",
    improve: "优化",
    optimize: "优化",
    polish: "优化",
    tighten: "优化",
    tune: "优化",
    update: "调整",
    adjust: "调整",
    refactor: "重构",
    rework: "重构",
    cleanup: "清理",
    clean: "清理",
    remove: "移除",
    delete: "移除",
    drop: "移除",
    document: "补充文档",
    docs: "补充文档",
    bump: "升级",
    upgrade: "升级",
  };
  const action = verbMap[first];

  if (!action) {
    return `处理 ${normalized}`;
  }

  if (!rest) {
    return action;
  }

  if (action === "补充文档") {
    return `补充 ${rest} 的文档说明`;
  }

  return `${action} ${rest}`;
}

function normalizeCommitSummary(summary: string, repoLanguage: "zh" | "en") {
  const stripped = stripConventionalPrefix(summary);
  if (!stripped) {
    return "补充本次改动说明";
  }

  if (hasChinese(stripped) || repoLanguage === "zh") {
    return normalizeChineseSummary(stripped);
  }

  return normalizeEnglishSummary(stripped);
}

function extractSimilarityTokens(text: string) {
  const asciiTokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
    .split(/\s+/)
    .filter((item) => item.length >= 2 && !STOP_TOKENS.has(item));

  const chineseSource = text.replace(/[^\u4e00-\u9fff]/g, "");
  const chineseTokens: string[] = [];

  for (let index = 0; index < chineseSource.length - 1; index += 1) {
    const token = chineseSource.slice(index, index + 2);
    if (!STOP_TOKENS.has(token)) {
      chineseTokens.push(token);
    }
  }

  return [...new Set([...asciiTokens, ...chineseTokens])];
}

function extractTopicTokens(text: string) {
  return extractSimilarityTokens(text).filter((token) => token.length >= 2).slice(0, 6);
}

function shareEnoughContext(left: SummaryCandidate, right: SummaryCandidate) {
  const shared = left.similarityTokens.filter((token) => right.similarityTokens.includes(token));
  const shorterSize = Math.min(left.similarityTokens.length, right.similarityTokens.length) || 1;

  return shared.length >= 2 || shared.length / shorterSize >= 0.6;
}

function buildTopicLabel(group: SummaryCandidate[]) {
  const counts = new Map<string, number>();

  for (const item of group) {
    for (const token of item.topicTokens) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || right[0].length - left[0].length)
    .slice(0, 2)
    .map(([token]) => token)
    .join(" / ");
}

function mergeSimilarSummaries(candidates: SummaryCandidate[]) {
  const groups: SummaryCandidate[][] = [];

  for (const candidate of candidates) {
    const targetGroup = groups.find((group) =>
      group.some((item) => shareEnoughContext(candidate, item)),
    );

    if (targetGroup) {
      targetGroup.push(candidate);
    } else {
      groups.push([candidate]);
    }
  }

  return groups.map((group) => {
    const uniqueLines = [...new Set(group.map((item) => item.rendered))];
    if (uniqueLines.length === 1) {
      return uniqueLines[0];
    }

    const topic = buildTopicLabel(group);
    if (topic) {
      return `围绕 ${topic}，完成${uniqueLines.join("、")}`;
    }

    return `集中完成：${uniqueLines.join("、")}`;
  });
}

function buildDailySummaries(commits: CommitRecordView[], timezone: string): StructuredDailySummary[] {
  const repoLanguage = detectRepoLanguage(commits);
  const groups = new Map<
    string,
    StructuredDailySummary & {
      candidates: SummaryCandidate[];
    }
  >();

  for (const commit of commits) {
    const date = formatInTimeZone(commit.committedAt, timezone, "yyyy-MM-dd");
    const weekday = formatWeekday(commit.committedAt, timezone);
    const current =
      groups.get(date) ??
      {
        date,
        weekday,
        label: `${date} ${weekday}`,
        commitCount: 0,
        additions: 0,
        deletions: 0,
        items: [],
        candidates: [],
      };

    current.commitCount += 1;
    current.additions += commit.additions;
    current.deletions += commit.deletions;

    if (!isPureMergeNoise(commit)) {
      const rendered = normalizeCommitSummary(commit.subject, repoLanguage);
      const candidate = {
        rendered,
        similarityTokens: extractSimilarityTokens(rendered),
        topicTokens: extractTopicTokens(rendered),
      };

      current.candidates.push(candidate);
    }

    groups.set(date, current);
  }

  return [...groups.values()]
    .sort((left, right) => right.date.localeCompare(left.date))
    .map(({ candidates, ...summary }) => {
      const mergedItems = mergeSimilarSummaries(candidates).slice(0, 5);

      return {
        ...summary,
        items:
          mergedItems.length > 0
            ? mergedItems
            : ["以分支合并和同步为主，没有需要单独展开的事项。"],
      };
    });
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
    const inWindow =
      commit.committedAt >= params.window.start && commit.committedAt <= params.window.end;
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

function collectHighlights(commits: CommitRecordView[], dailySummaries: StructuredDailySummary[]) {
  if (commits.length === 0) {
    return ["本周期没有符合条件的提交。"];
  }

  const dailyHighlights = dailySummaries.flatMap((item) => item.items).slice(0, 5);
  if (dailyHighlights.length > 0) {
    return dailyHighlights;
  }

  return commits
    .filter((commit) => !isPureMergeNoise(commit))
    .slice(0, 5)
    .map((commit) => `${normalizeCommitSummary(commit.subject, detectRepoLanguage(commits))} (${shortHash(commit.hash)})`)
    .filter(Boolean);
}

function inferRisks(commits: CommitRecordView[], hotspots: Array<{ file: string; touches: number }>) {
  const riskSignals: string[] = [];
  if (commits.length >= 25) {
    riskSignals.push("提交量较高，建议人工复核关键需求是否已经完成联调。");
  }

  const infraTouches = hotspots.filter((item) =>
    /schema|config|env|workflow|deploy|auth/i.test(item.file),
  );
  if (infraTouches.length > 0) {
    riskSignals.push("涉及配置或基础设施文件，发布前建议复查环境差异与凭据配置。");
  }

  const revertLike = commits.some((commit) => /revert|rollback|hotfix/i.test(commit.subject));
  if (revertLike) {
    riskSignals.push("存在回滚或热修关键词，建议回看上下游影响。");
  }

  return riskSignals.length > 0
    ? riskSignals
    : ["未发现明显高风险信号，建议优先回归热点文件相关流程。"];
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
  const dailySummaries = buildDailySummaries(params.commits, params.window.timezone);
  const repoLanguage = detectRepoLanguage(params.commits);

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
    dailySummaries,
    topAuthors: authorGroups.slice(0, 5).map(([name, commits]) => ({
      name,
      commits,
    })),
    hotspots,
    highlights: collectHighlights(params.commits, dailySummaries),
    risks: inferRisks(params.commits, hotspots),
    nextSteps: inferNextSteps(params.commits, hotspots),
    commitReferences: params.commits
      .filter((commit) => !isPureMergeNoise(commit))
      .slice(0, 30)
      .map((commit) => ({
        hash: commit.hash,
        shortHash: shortHash(commit.hash),
        authorName: commit.authorName,
        committedAt: formatInTimeZone(commit.committedAt, params.window.timezone, "yyyy-MM-dd HH:mm"),
        subject: normalizeCommitSummary(commit.subject, repoLanguage),
        files: commit.files.slice(0, 5),
      })),
  };
}

function renderDailySummaryBlock(dailySummaries: StructuredDailySummary[]) {
  if (dailySummaries.length === 0) {
    return "本周期没有符合条件的提交。";
  }

  return dailySummaries
    .map(
      (day) =>
        `${day.label}\n\n${day.items.map((item, index) => `${index + 1}. ${item}`).join("\n")}`,
    )
    .join("\n\n");
}

export function renderFallbackMarkdown(params: {
  projectName: string;
  structured: StructuredReport;
}) {
  const { projectName, structured } = params;
  const branchScope =
    structured.branchScope.length > 0 ? structured.branchScope.join(", ") : "全部分支";
  const authorScope =
    structured.authorScope.names.length > 0 || structured.authorScope.emails.length > 0
      ? [...structured.authorScope.names, ...structured.authorScope.emails].join(", ")
      : "全部作者";

  const hotspotLines =
    structured.hotspots.length > 0
      ? structured.hotspots.map((item) => `- ${item.file}: ${item.touches} 次触达`).join("\n")
      : "- 暂无热点文件";

  const commitLines =
    structured.commitReferences.length > 0
      ? structured.commitReferences
          .map(
            (item) =>
              `- ${item.shortHash} | ${item.committedAt} | ${item.authorName} | ${item.subject}`,
          )
          .join("\n")
      : "- 本周期没有可展示的提交引用";

  return `# ${projectName} ${structured.period === "day" ? "日报" : structured.period === "week" ? "周报" : "月报"}

## 每日事项清单

${renderDailySummaryBlock(structured.dailySummaries)}

## 周期信息

- 时间范围：${structured.periodLabel}
- 时区：${structured.timezone}
- 分支范围：${branchScope}
- 作者范围：${authorScope}

## 风险与阻塞

${structured.risks.map((item) => `- ${item}`).join("\n")}

## 下一步建议

${structured.nextSteps.map((item) => `- ${item}`).join("\n")}

## 统计信息

- 提交数：${structured.totals.commits}
- 作者数：${structured.totals.authors}
- 新增行数：${structured.totals.additions}
- 删除行数：${structured.totals.deletions}
- 触达文件数：${structured.totals.filesTouched}

## 热点文件

${hotspotLines}

## 提交引用

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
          "你是一名技术团队日报助手。请基于输入生成中文 Markdown 日报，事实只能来源于输入，不允许捏造。先输出“## 每日事项清单”，并按 `YYYY-MM-DD 星期X` 分组，每组下使用 `1. 2. 3.` 编号列出当天完成事项。需要自动忽略纯分支合并噪音，并把同一天相似的修改合并成一条更像人工日报的描述。对中文仓库保持自然中文措辞；对英文仓库请把 commit 含义整理成自然中文表达，而不是直接照抄英文原句。随后再输出“## 周期信息”“## 风险与阻塞”“## 下一步建议”“## 统计信息”“## 热点文件”“## 提交引用”。",
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
