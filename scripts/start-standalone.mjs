import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const standaloneRoot = path.join(projectRoot, ".next", "standalone");
const standaloneStaticDir = path.join(standaloneRoot, ".next", "static");
const buildStaticDir = path.join(projectRoot, ".next", "static");
const publicDir = path.join(projectRoot, "public");
const standalonePublicDir = path.join(standaloneRoot, "public");

function ensureBuildArtifacts() {
  if (!existsSync(path.join(standaloneRoot, "server.js"))) {
    throw new Error("未找到 standalone 构建产物，请先执行 pnpm build。");
  }

  if (!existsSync(buildStaticDir)) {
    throw new Error("未找到 .next/static，请先执行 pnpm build。");
  }
}

function prepareStandaloneAssets() {
  mkdirSync(path.join(standaloneRoot, ".next"), { recursive: true });

  rmSync(standaloneStaticDir, { force: true, recursive: true });
  cpSync(buildStaticDir, standaloneStaticDir, { recursive: true });

  rmSync(standalonePublicDir, { force: true, recursive: true });
  if (existsSync(publicDir)) {
    cpSync(publicDir, standalonePublicDir, { recursive: true });
  }
}

function main() {
  ensureBuildArtifacts();
  prepareStandaloneAssets();

  const child = spawn(process.execPath, [path.join(standaloneRoot, "server.js")], {
    cwd: standaloneRoot,
    stdio: "inherit",
    windowsHide: true,
    env: process.env,
  });

  child.once("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 1);
  });
}

main();
