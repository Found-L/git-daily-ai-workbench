import { NextResponse } from "next/server";

import { runProjectSync } from "@/lib/project-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const syncRun = await runProjectSync(projectId);
    return NextResponse.json({
      syncRun,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "同步失败",
      },
      {
        status: 500,
      },
    );
  }
}
