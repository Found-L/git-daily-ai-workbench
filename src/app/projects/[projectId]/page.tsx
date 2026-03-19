import { notFound } from "next/navigation";

import { ProjectDetailShell } from "@/components/project-detail-shell";
import { resolveCurrentReference } from "@/lib/period";
import { getProjectDetail } from "@/lib/project-service";
import { parseJsonArray } from "@/lib/serialization";
import { formatLocalDateTime } from "@/lib/utils";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProjectDetail(projectId);

  if (!project) {
    notFound();
  }

  const defaultPeriod = project.defaultPeriod as "day" | "week" | "month";
  const initialReference = resolveCurrentReference(defaultPeriod, project.timezone);

  return (
    <ProjectDetailShell
      project={{
        id: project.id,
        name: project.name,
        sourceType: project.sourceType,
        defaultPeriod,
        timezone: project.timezone,
        initialReference,
        repoSource: project.repoSource,
        branchRule: {
          mode: (project.branchRule?.mode ?? "all") as "all" | "selected",
          selectedBranches: parseJsonArray(project.branchRule?.selectedBranchesJson),
        },
        authorRule: {
          names: parseJsonArray(project.authorRule?.namesJson),
          emails: parseJsonArray(project.authorRule?.emailsJson),
        },
        llmProfile: project.llmProfile,
        branchSnapshot: parseJsonArray(project.syncRuns[0]?.branchSnapshotJson),
        syncRuns: project.syncRuns.map((syncRun) => ({
          id: syncRun.id,
          status: syncRun.status,
          message: syncRun.message,
          commitCount: syncRun.commitCount,
          startedAtLabel: formatLocalDateTime(syncRun.startedAt, "zh-CN", project.timezone),
        })),
        reports: project.reports.map((report) => ({
          id: report.id,
          period: report.period,
          status: report.status,
          createdAtLabel: formatLocalDateTime(report.createdAt, "zh-CN", project.timezone),
          totalCommits: report.totalCommits,
        })),
      }}
    />
  );
}
