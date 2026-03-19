import { prisma } from "@/lib/db";
import { collectCommits, ensureRepoReady } from "@/lib/git";
import { parsePeriodReference, resolvePeriodWindow } from "@/lib/period";
import {
  buildStructuredReport,
  filterCommitsForReport,
  generateMarkdownWithAi,
  renderFallbackMarkdown,
} from "@/lib/reporting";
import { normalizeProjectInput } from "@/lib/schemas";
import {
  parseJsonArray,
  parseJsonObject,
  stringifyJsonArray,
  stringifyJsonObject,
} from "@/lib/serialization";
import type { CommitRecordView, ReportPeriod } from "@/lib/types";

export async function listProjectCards() {
  return prisma.project.findMany({
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      repoSource: true,
      branchRule: true,
      authorRule: true,
      llmProfile: true,
      syncRuns: {
        orderBy: {
          startedAt: "desc",
        },
        take: 1,
      },
      reports: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });
}

export async function getProjectDetail(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      repoSource: true,
      branchRule: true,
      authorRule: true,
      llmProfile: true,
      syncRuns: {
        orderBy: {
          startedAt: "desc",
        },
        take: 8,
      },
      reports: {
        orderBy: {
          createdAt: "desc",
        },
        take: 12,
      },
    },
  });
}

export async function getReportDetail(reportId: string) {
  return prisma.reportRun.findUnique({
    where: { id: reportId },
    include: {
      project: true,
    },
  });
}

function toCommitView(record: {
  id: string;
  hash: string;
  authorName: string;
  authorEmail: string;
  committedAt: Date;
  subject: string;
  body: string | null;
  filesJson: string;
  additions: number;
  deletions: number;
  refNamesJson: string;
}): CommitRecordView {
  return {
    id: record.id,
    hash: record.hash,
    authorName: record.authorName,
    authorEmail: record.authorEmail,
    committedAt: record.committedAt,
    subject: record.subject,
    body: record.body,
    files: parseJsonArray(record.filesJson),
    additions: record.additions,
    deletions: record.deletions,
    refNames: parseJsonArray(record.refNamesJson),
  };
}

async function persistProjectInput(payload: unknown) {
  const input = normalizeProjectInput(payload as Record<string, unknown>);
  const project = input.id
    ? await prisma.project.update({
        where: { id: input.id },
        data: {
          name: input.name,
          sourceType: input.sourceType,
          defaultPeriod: input.defaultPeriod,
          timezone: input.timezone,
        },
      })
    : await prisma.project.create({
        data: {
          name: input.name,
          sourceType: input.sourceType,
          defaultPeriod: input.defaultPeriod,
          timezone: input.timezone,
        },
      });

  await prisma.repoSource.upsert({
    where: { projectId: project.id },
    create: {
      projectId: project.id,
      localPath: input.localPath,
      remoteUrl: input.remoteUrl,
      cacheDir: input.cacheDir,
    },
    update: {
      localPath: input.localPath,
      remoteUrl: input.remoteUrl,
      cacheDir: input.cacheDir,
    },
  });

  await prisma.branchRule.upsert({
    where: { projectId: project.id },
    create: {
      projectId: project.id,
      mode: input.branchMode,
      selectedBranchesJson: stringifyJsonArray(input.selectedBranches),
    },
    update: {
      mode: input.branchMode,
      selectedBranchesJson: stringifyJsonArray(input.selectedBranches),
    },
  });

  await prisma.authorRule.upsert({
    where: { projectId: project.id },
    create: {
      projectId: project.id,
      namesJson: stringifyJsonArray(input.authorNames),
      emailsJson: stringifyJsonArray(input.authorEmails),
    },
    update: {
      namesJson: stringifyJsonArray(input.authorNames),
      emailsJson: stringifyJsonArray(input.authorEmails),
    },
  });

  await prisma.llmProfile.upsert({
    where: { projectId: project.id },
    create: {
      projectId: project.id,
      baseUrl: input.llmBaseUrl,
      apiKey: input.llmApiKey,
      model: input.llmModel,
      temperature: input.llmTemperature,
    },
    update: {
      baseUrl: input.llmBaseUrl,
      apiKey: input.llmApiKey,
      model: input.llmModel,
      temperature: input.llmTemperature,
    },
  });

  return getProjectDetail(project.id);
}

export async function upsertProjectFromPayload(payload: unknown) {
  return persistProjectInput(payload);
}

export async function deleteProject(projectId: string) {
  return prisma.project.delete({
    where: { id: projectId },
  });
}

export async function deleteReport(reportId: string) {
  return prisma.reportRun.delete({
    where: { id: reportId },
    include: {
      project: true,
    },
  });
}

export async function runProjectSync(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      repoSource: true,
      branchRule: true,
    },
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  const syncRun = await prisma.syncRun.create({
    data: {
      projectId,
      status: "running",
      message: "正在扫描仓库",
    },
  });

  try {
    const repoPath = await ensureRepoReady(project);
    const selectedBranches = parseJsonArray(project.branchRule?.selectedBranchesJson);
    const branchMode = (project.branchRule?.mode ?? "all") as "all" | "selected";
    const collected = await collectCommits({
      repoPath,
      branchMode,
      selectedBranches,
    });

    await prisma.$transaction([
      prisma.commitRecord.deleteMany({
        where: {
          projectId,
        },
      }),
      prisma.commitRecord.createMany({
        data: collected.commits.map((commit) => ({
          projectId,
          syncRunId: syncRun.id,
          hash: commit.hash,
          authorName: commit.authorName,
          authorEmail: commit.authorEmail,
          committedAt: commit.committedAt,
          subject: commit.subject,
          body: commit.body,
          refNamesJson: stringifyJsonArray(commit.refNames),
          filesJson: stringifyJsonArray(commit.files),
          additions: commit.additions,
          deletions: commit.deletions,
        })),
      }),
      prisma.syncRun.update({
        where: { id: syncRun.id },
        data: {
          status: "success",
          message: `已同步 ${collected.commits.length} 条提交`,
          scannedRepoPath: repoPath,
          branchSnapshotJson: stringifyJsonArray(collected.branches),
          commitCount: collected.commits.length,
          finishedAt: new Date(),
        },
      }),
    ]);

    return prisma.syncRun.findUnique({
      where: { id: syncRun.id },
    });
  } catch (error) {
    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: "error",
        message: error instanceof Error ? error.message : "同步失败",
        finishedAt: new Date(),
      },
    });

    throw error;
  }
}

export async function generateProjectReport(
  projectId: string,
  requestedPeriod?: ReportPeriod,
  requestedReference?: string,
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      branchRule: true,
      authorRule: true,
      llmProfile: true,
      syncRuns: {
        orderBy: {
          startedAt: "desc",
        },
        take: 1,
      },
      commits: {
        orderBy: {
          committedAt: "desc",
        },
      },
    },
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  if (project.syncRuns.length === 0) {
    throw new Error("请先同步仓库。系统需要先把提交索引到本地 SQLite，才能生成报告。");
  }

  const period = requestedPeriod ?? (project.defaultPeriod as ReportPeriod);
  const referenceDate = parsePeriodReference(period, project.timezone, requestedReference);
  const window = resolvePeriodWindow(period, project.timezone, referenceDate);
  const authorNames = parseJsonArray(project.authorRule?.namesJson);
  const authorEmails = parseJsonArray(project.authorRule?.emailsJson);
  const branchScope =
    project.branchRule?.mode === "selected"
      ? parseJsonArray(project.branchRule.selectedBranchesJson)
      : [];

  const filteredCommits = filterCommitsForReport({
    commits: project.commits.map(toCommitView),
    window,
    authorNames,
    authorEmails,
  });

  const structured = buildStructuredReport({
    projectName: project.name,
    window,
    branchScope,
    authorNames,
    authorEmails,
    commits: filteredCommits,
  });

  let markdown = renderFallbackMarkdown({
    projectName: project.name,
    structured,
  });
  let status = "fallback";

  try {
    const generated = await generateMarkdownWithAi({
      structured,
      projectName: project.name,
      baseUrl: project.llmProfile?.baseUrl ?? null,
      apiKey: project.llmProfile?.apiKey ?? null,
      model: project.llmProfile?.model ?? null,
      temperature: project.llmProfile?.temperature ?? 0.3,
    });

    if (generated) {
      markdown = generated;
      status = "success";
    }
  } catch (error) {
    markdown = renderFallbackMarkdown({
      projectName: project.name,
      structured: {
        ...structured,
        risks: [
          `AI 生成失败，已回退到规则版摘要：${
            error instanceof Error ? error.message : "unknown error"
          }`,
          ...structured.risks,
        ],
      },
    });
    status = "fallback";
  }

  return prisma.reportRun.create({
    data: {
      projectId,
      period,
      rangeStart: window.start,
      rangeEnd: window.end,
      timezone: project.timezone,
      branchNamesJson: stringifyJsonArray(branchScope),
      authorNamesJson: stringifyJsonArray(authorNames),
      authorEmailsJson: stringifyJsonArray(authorEmails),
      commitHashesJson: stringifyJsonArray(filteredCommits.map((commit) => commit.hash)),
      totalCommits: filteredCommits.length,
      markdown,
      structuredJson: stringifyJsonObject(structured),
      llmProvider: project.llmProfile?.baseUrl ?? null,
      llmModel: project.llmProfile?.model ?? null,
      status,
    },
    include: {
      project: true,
    },
  });
}

export function parseStructuredJson(value: string) {
  return parseJsonObject(value, {});
}
