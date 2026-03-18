import { notFound } from "next/navigation";

import { ProjectDetailShell } from "@/components/project-detail-shell";
import { getProjectDetail } from "@/lib/project-service";
import { parseJsonArray } from "@/lib/serialization";

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

  return (
    <ProjectDetailShell
      project={{
        id: project.id,
        name: project.name,
        sourceType: project.sourceType,
        defaultPeriod: project.defaultPeriod as "day" | "week" | "month",
        timezone: project.timezone,
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
          startedAt: syncRun.startedAt.toISOString(),
        })),
        reports: project.reports.map((report) => ({
          id: report.id,
          period: report.period,
          status: report.status,
          createdAt: report.createdAt.toISOString(),
          totalCommits: report.totalCommits,
        })),
      }}
    />
  );
}
