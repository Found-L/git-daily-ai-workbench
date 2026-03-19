import { notFound } from "next/navigation";

import { ReportDetailShell } from "@/components/report-detail-shell";
import { getReportDetail, parseStructuredJson } from "@/lib/project-service";
import type { StructuredReport } from "@/lib/types";
import { formatLocalDateTime } from "@/lib/utils";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const report = await getReportDetail(reportId);

  if (!report) {
    notFound();
  }

  const structured = parseStructuredJson(report.structuredJson) as StructuredReport;

  return (
    <ReportDetailShell
      report={{
        id: report.id,
        period: report.period,
        status: report.status,
        totalCommits: report.totalCommits,
        createdAtLabel: formatLocalDateTime(report.createdAt, "zh-CN", report.timezone),
        markdown: report.markdown,
        project: {
          id: report.project.id,
          name: report.project.name,
        },
      }}
      structured={{
        periodLabel: structured.periodLabel,
        timezone: structured.timezone,
        branchScope: structured.branchScope,
        authorScope: structured.authorScope,
        totals: structured.totals,
        dailySummaries: structured.dailySummaries ?? [],
        topAuthors: structured.topAuthors,
        hotspots: structured.hotspots,
        commitReferences: structured.commitReferences,
      }}
    />
  );
}
