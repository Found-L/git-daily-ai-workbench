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
      reference?: string;
    };
    const period = REPORT_PERIODS.includes(payload.period as (typeof REPORT_PERIODS)[number])
      ? (payload.period as (typeof REPORT_PERIODS)[number])
      : undefined;
    const reference =
      typeof payload.reference === "string" && payload.reference.trim()
        ? payload.reference.trim()
        : undefined;

    const report = await generateProjectReport(projectId, period, reference);

    return NextResponse.json({
      report: {
        id: report.id,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Report generation failed",
      },
      {
        status: 500,
      },
    );
  }
}
