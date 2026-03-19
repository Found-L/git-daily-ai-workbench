import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(
        {
          error: "Project not found",
        },
        {
          status: 404,
        },
      );
    }

    const result = await prisma.reportRun.deleteMany({
      where: {
        projectId,
      },
    });

    return NextResponse.json({
      ok: true,
      deletedCount: result.count,
      projectId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to clear reports",
      },
      {
        status: 500,
      },
    );
  }
}
