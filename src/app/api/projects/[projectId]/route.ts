import { NextResponse } from "next/server";

import { deleteProject } from "@/lib/project-service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    await deleteProject(projectId);

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete project",
      },
      {
        status: 500,
      },
    );
  }
}
