import { NextResponse } from "next/server";

import { getReportDetail, parseStructuredJson } from "@/lib/project-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await params;
  const report = await getReportDetail(reportId);

  if (!report) {
    return NextResponse.json(
      {
        error: "报告不存在",
      },
      {
        status: 404,
      },
    );
  }

  return NextResponse.json({
    report: {
      id: report.id,
      markdown: report.markdown,
      structured: parseStructuredJson(report.structuredJson),
      status: report.status,
      period: report.period,
      createdAt: report.createdAt,
      project: {
        id: report.project.id,
        name: report.project.name,
      },
    },
  });
}
