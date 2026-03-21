import path from "node:path";

export const ROOT_DIR = process.cwd();
export const APP_DATA_DIR = path.resolve(process.env.APP_DATA_DIR ?? path.join(ROOT_DIR, "data"));
export const APP_CACHE_ROOT = path.resolve(
  process.env.APP_CACHE_ROOT ?? path.join(APP_DATA_DIR, "cache", "repos"),
);
export const APP_RUNTIME_DIR = path.resolve(
  process.env.APP_RUNTIME_DIR ?? path.join(APP_DATA_DIR, "runtime"),
);
export const DEFAULT_DATABASE_URL = "file:./dev.db";
export const DATABASE_URL =
  process.env.DATABASE_URL === "file:./prisma/dev.db"
    ? DEFAULT_DATABASE_URL
    : process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
export const DATABASE_DIR = path.join(ROOT_DIR, "prisma");
export const DEFAULT_CACHE_ROOT = APP_CACHE_ROOT;
export const BUNDLED_GIT = path.join(ROOT_DIR, ".tools", "mingit", "cmd", "git.exe");
export const BUNDLED_GH = path.join(ROOT_DIR, ".tools", "gh", "bin", "gh.exe");

export function resolveProjectCacheDir(projectId: string, configuredPath?: string | null) {
  return configuredPath && configuredPath.trim()
    ? configuredPath
    : path.join(DEFAULT_CACHE_ROOT, projectId);
}
