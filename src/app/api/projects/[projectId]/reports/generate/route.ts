import { NextResponse } from "next/server";

import { generateProjectReport } from "@/lib/project-service";
import { REPORT_PERIODS } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const payload = (await request.json().catch(() => ({}))) as {
      period?: string;
    };
    const period = REPORT_PERIODS.includes(payload.period as (typeof REPORT_PERIODS)[number])
      ? (payload.period as (typeof REPORT_PERIODS)[number])
      : undefined;

    const report = await generateProjectReport(projectId, period);
    return NextResponse.json({
      report: {
        id: report.id,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "报告生成失败",
      },
      {
        status: 500,
      },
    );
  }
}
