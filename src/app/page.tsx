import { DashboardShell } from "@/components/dashboard-shell";
import { listProjectCards } from "@/lib/project-service";
import { parseJsonArray } from "@/lib/serialization";

export default async function HomePage() {
  const projects = await listProjectCards();
  const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai";

  return (
    <DashboardShell
      defaultTimezone={defaultTimezone}
      projects={projects.map((project) => ({
        id: project.id,
        name: project.name,
        sourceType: project.sourceType,
        defaultPeriod: project.defaultPeriod,
        timezone: project.timezone,
        selectedBranches: parseJsonArray(project.branchRule?.selectedBranchesJson),
        authorNames: parseJsonArray(project.authorRule?.namesJson),
        authorEmails: parseJsonArray(project.authorRule?.emailsJson),
        hasAiConfig: Boolean(
          project.llmProfile?.baseUrl && project.llmProfile?.apiKey && project.llmProfile?.model,
        ),
        updatedAt: project.updatedAt.toISOString(),
        lastSync: project.syncRuns[0]
          ? {
              status: project.syncRuns[0].status,
              message: project.syncRuns[0].message,
              startedAt: project.syncRuns[0].startedAt.toISOString(),
            }
          : null,
        lastReport: project.reports[0]
          ? {
              id: project.reports[0].id,
              status: project.reports[0].status,
              period: project.reports[0].period,
              createdAt: project.reports[0].createdAt.toISOString(),
            }
          : null,
      }))}
    />
  );
}
