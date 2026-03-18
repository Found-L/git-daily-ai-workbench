import { access } from "node:fs/promises";
import { constants } from "node:fs";

import { BUNDLED_GIT } from "@/lib/paths";

async function fileExists(filePath: string) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function resolveGitBinary() {
  const configured = process.env.GIT_BINARY;
  if (configured && (await fileExists(configured))) {
    return configured;
  }

  if (await fileExists(BUNDLED_GIT)) {
    return BUNDLED_GIT;
  }

  return "git";
}
