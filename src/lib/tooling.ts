import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { BUNDLED_GIT } from "@/lib/paths";

const execFileAsync = promisify(execFile);

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

export async function ensureGitBinaryAvailable() {
  const binary = await resolveGitBinary();

  if (binary !== "git") {
    return binary;
  }

  try {
    await execFileAsync(binary, ["--version"], {
      windowsHide: true,
    });
    return binary;
  } catch {
    throw new Error(
      "未检测到可用的 Git。请先安装系统 Git，或在 Windows 下先运行 scripts/bootstrap-tooling.ps1。",
    );
  }
}
