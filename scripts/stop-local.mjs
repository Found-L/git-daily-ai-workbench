import { readFileSync, rmSync } from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(new URL("..", import.meta.url).pathname);
const runtimeDir = path.join(projectRoot, "data", "runtime");
const runtimeFile = path.join(runtimeDir, "local-server.json");

function readRuntimeState() {
  try {
    return JSON.parse(readFileSync(runtimeFile, "utf8"));
  } catch {
    return null;
  }
}

function isPidAlive(pid) {
  if (!pid || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function main() {
  const state = readRuntimeState();

  if (!state?.pid) {
    console.log("本地工作台未运行，无需停止。");
    return;
  }

  if (!isPidAlive(state.pid)) {
    console.log("未发现正在运行的工作台进程，已清理残留状态。");
    rmSync(runtimeFile, { force: true });
    return;
  }

  try {
    process.kill(state.pid, "SIGTERM");
    console.log(`本地工作台已停止（PID ${state.pid}）。`);
  } catch {
    console.warn(`无法终止进程 ${state.pid}，可能已经退出，已清理运行状态。`);
  }

  rmSync(runtimeFile, { force: true });
}

main();
