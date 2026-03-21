import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

const DEFAULT_DATABASE_URL = "file:./dev.db";
const LEGACY_DATABASE_URL = "file:./prisma/dev.db";

// Docker standalone 模式下 node_modules 在 /app/node_modules
// 本地开发时在项目根目录的 node_modules
function resolvePrismaCli() {
  try {
    return require.resolve("prisma/build/index.js");
  } catch {
    // standalone 模式下尝试绝对路径
    const standalonePath = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
    if (existsSync(standalonePath)) {
      return standalonePath;
    }

    throw new Error(
      "prisma CLI 未找到。请确保已执行 pnpm install，或检查 Docker 镜像是否完整。",
    );
  }
}

const prismaCli = resolvePrismaCli();
const databaseUrl =
  process.env.DATABASE_URL === LEGACY_DATABASE_URL
    ? DEFAULT_DATABASE_URL
    : process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;

const result = spawnSync(
  process.execPath,
  [prismaCli, "db", "push", "--skip-generate", "--schema", "prisma/schema.prisma"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
