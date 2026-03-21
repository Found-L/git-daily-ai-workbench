import { mkdirSync, readFileSync, rmSync, writeFileSync, openSync } from "node:fs";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const projectRoot = path.resolve(new URL("..", import.meta.url).pathname);
const runtimeDir = path.join(projectRoot, "data", "runtime");
const runtimeFile = path.join(runtimeDir, "local-server.json");
const logFile = path.join(runtimeDir, "local-server.log");
const defaultPort = Number.parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.HOST ?? "127.0.0.1";

mkdirSync(runtimeDir, { recursive: true });

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function readRuntimeState() {
  try {
    return JSON.parse(readFileSync(runtimeFile, "utf8"));
  } catch {
    return null;
  }
}

function removeRuntimeState() {
  rmSync(runtimeFile, { force: true });
}

async function isUrlReady(url) {
  try {
    const response = await fetch(url, {
      headers: {
        "cache-control": "no-cache",
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function ensurePortAvailable(startPort) {
  for (let port = startPort; port < startPort + 20; port += 1) {
    const available = await new Promise((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => {
        server.close(() => resolve(true));
      });
      server.listen(port, host);
    });

    if (available) {
      return port;
    }
  }

  throw new Error("未找到可用端口，请先关闭占用中的本地服务后重试。");
}

function runNodeScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: projectRoot,
      stdio: "inherit",
      windowsHide: true,
      env: process.env,
    });

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }

      reject(new Error(`${path.basename(scriptPath)} 执行失败，退出码 ${code ?? "unknown"}。`));
    });
  });
}

async function ensureBuildExists() {
  try {
    await access(path.join(projectRoot, ".next", "BUILD_ID"), constants.F_OK);
  } catch {
    console.log("首次启动，正在构建正式版本...");
    await runNodeScript(path.join(projectRoot, "node_modules", "next", "dist", "bin", "next"), ["build"]);
  }
}

function openBrowser(url) {
  const platform = process.platform;
  if (platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
    return;
  }

  if (platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
}

async function ensureGitAvailable() {
  const configured = process.env.GIT_BINARY;
  if (configured) {
    try {
      await access(configured, constants.F_OK);
      return; // configured binary exists, we're good
    } catch {
      // fall through to system git check
    }
  }

  try {
    await execFileAsync(configured ?? "git", ["--version"], { windowsHide: true });
  } catch {
    throw new Error(
      "未检测到可用的 Git。请先安装系统 Git，或在 Windows 下先运行 scripts/bootstrap-tooling.ps1。",
    );
  }
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await isUrlReady(url)) {
      return;
    }

    await wait(1000);
  }

  throw new Error(`本地服务启动超时。请查看日志：${logFile}`);
}

async function main() {
  const existingState = readRuntimeState();
  if (existingState?.pid && existingState?.url && isPidAlive(existingState.pid)) {
    if (await isUrlReady(existingState.url)) {
      console.log(`工作台已在运行，正在打开 ${existingState.url}`);
      openBrowser(existingState.url);
      return;
    }
  }

  removeRuntimeState();

  console.log("正在准备本地工作台...");
  await ensureGitAvailable();
  await runNodeScript(path.join(projectRoot, "scripts", "prisma-db-push.mjs"));
  await ensureBuildExists();
  const port = await ensurePortAvailable(defaultPort);
  const url = `http://${host}:${port}`;

  const logFd = openSync(logFile, "a");
  const child = spawn(
    process.execPath,
    [path.join(projectRoot, "node_modules", "next", "dist", "bin", "next"), "start", "--hostname", host, "--port", `${port}`],
    {
      cwd: projectRoot,
      detached: true,
      stdio: ["ignore", logFd, logFd],
      windowsHide: true,
      env: {
        ...process.env,
        HOST: host,
        PORT: `${port}`,
      },
    },
  );

  child.unref();
  writeFileSync(
    runtimeFile,
    JSON.stringify(
      {
        pid: child.pid,
        port,
        host,
        url,
        launchedAt: new Date().toISOString(),
        logFile,
      },
      null,
      2,
    ),
  );

  await waitForServer(url);
  console.log(`本地工作台已启动：${url}`);
  openBrowser(url);
}

main().catch((error) => {
  removeRuntimeState();
  const message = error instanceof Error ? error.message : "启动失败";
  console.error(`启动 Git 日报 AI 工作台失败：${message}`);
  process.exitCode = 1;
});
