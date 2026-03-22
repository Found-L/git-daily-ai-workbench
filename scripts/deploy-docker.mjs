import { mkdirSync } from "node:fs";
import path from "node:path";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const projectRoot = path.resolve(new URL("..", import.meta.url).pathname);
const dataRoot = path.join(projectRoot, "data");
const requiredDirs = [
  path.join(dataRoot, "db"),
  path.join(dataRoot, "cache"),
  path.join(dataRoot, "runtime"),
];

function printHelp() {
  console.log(`用法：pnpm docker:deploy [--pull]\n\n选项：\n  --pull    构建前先尝试拉取基础镜像\n  --help    显示帮助`);
}

async function ensureDockerAvailable() {
  try {
    await execFileAsync("docker", ["--version"], {
      cwd: projectRoot,
      windowsHide: true,
    });
  } catch {
    throw new Error("未检测到 Docker，请先安装 Docker Desktop 或 Docker Engine。");
  }

  try {
    await execFileAsync("docker", ["compose", "version"], {
      cwd: projectRoot,
      windowsHide: true,
    });
  } catch {
    throw new Error("未检测到 docker compose，请确认当前 Docker 环境已启用 Compose。");
  }
}

function ensureDataDirectories() {
  for (const dir of requiredDirs) {
    mkdirSync(dir, { recursive: true });
  }
}

function runDockerCompose(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["compose", ...args], {
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

      reject(new Error(`docker compose 执行失败，退出码 ${code ?? "unknown"}。`));
    });
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help")) {
    printHelp();
    return;
  }

  const shouldPull = args.includes("--pull");

  console.log("正在检查 Docker 环境...");
  await ensureDockerAvailable();

  console.log("正在准备持久化目录...");
  ensureDataDirectories();

  if (shouldPull) {
    console.log("正在预拉取基础镜像...");
    await runDockerCompose(["build", "--pull"]);
  }

  console.log("正在启动 Docker 工作台...");
  await runDockerCompose(["up", "-d", "--build"]);
  console.log("Docker 工作台已部署完成。可使用 docker compose ps 查看状态。");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "部署失败";
  console.error(`部署 Docker 工作台失败：${message}`);
  process.exitCode = 1;
});
