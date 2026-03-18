import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { upsertProjectFromPayload } from "@/lib/project-service";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const project = await upsertProjectFromPayload(payload);

    return NextResponse.json({
      project: {
        id: project?.id,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: error.issues.map((issue) => issue.message).join("; "),
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to save project",
      },
      {
        status: 500,
      },
    );
  }
}
