import { NextResponse } from "next/server";

import { deleteReport, getReportDetail, parseStructuredJson } from "@/lib/project-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await params;
  const report = await getReportDetail(reportId);

  if (!report) {
    return NextResponse.json(
      {
        error: "Report not found",
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await params;
    const report = await deleteReport(reportId);

    return NextResponse.json({
      ok: true,
      projectId: report.projectId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete report",
      },
      {
        status: 500,
      },
    );
  }
}
