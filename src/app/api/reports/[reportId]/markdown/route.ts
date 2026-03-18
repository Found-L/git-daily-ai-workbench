import { NextResponse } from "next/server";

import { getReportDetail } from "@/lib/project-service";

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

  return new NextResponse(report.markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(report.project.name)}-${report.period}-${report.id}.md"`,
    },
  });
}
