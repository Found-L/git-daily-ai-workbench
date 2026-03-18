import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import path from "node:path";

import type { BranchMode } from "@/lib/types";
import { resolveProjectCacheDir } from "@/lib/paths";
import { resolveGitBinary } from "@/lib/tooling";

const execFileAsync = promisify(execFile);
const RECORD_SEPARATOR = "\u001e";
const GROUP_SEPARATOR = "\u001d";
const UNIT_SEPARATOR = "\u001f";

export type GitCommit = {
  hash: string;
  authorName: string;
  authorEmail: string;
  committedAt: Date;
  subject: string;
  body: string;
  refNames: string[];
  files: string[];
  additions: number;
  deletions: number;
};

type GitProjectConfig = {
  id: string;
  name: string;
  sourceType: string;
  repoSource: {
    localPath: string | null;
    remoteUrl: string | null;
    cacheDir: string | null;
  } | null;
};

async function runGit(args: string[], cwd?: string) {
  const gitBinary = await resolveGitBinary();

  try {
    const { stdout, stderr } = await execFileAsync(gitBinary, args, {
      cwd,
      windowsHide: true,
      maxBuffer: 64 * 1024 * 1024,
      env: {
        ...process.env,
        LC_ALL: "C",
      },
    });

    return {
      stdout,
      stderr,
    };
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Git command failed with an unknown error";
    throw new Error(`Git command failed: ${args.join(" ")}\n${details}`);
  }
}

async function ensureGitRepository(repoPath: string) {
  await runGit(["rev-parse", "--is-inside-work-tree"], repoPath);
}

export async function ensureRepoReady(project: GitProjectConfig) {
  if (!project.repoSource) {
    throw new Error(`Project ${project.name} is missing repo source settings.`);
  }

  if (project.sourceType === "local") {
    const localPath = project.repoSource.localPath;
    if (!localPath) {
      throw new Error("Local repository path is empty.");
    }

    await ensureGitRepository(localPath);
    return localPath;
  }

  const remoteUrl = project.repoSource.remoteUrl;
  if (!remoteUrl) {
    throw new Error("Remote repository URL is empty.");
  }

  const cacheDir = resolveProjectCacheDir(project.id, project.repoSource.cacheDir);
  await mkdir(path.dirname(cacheDir), { recursive: true });

  if (!existsSync(path.join(cacheDir, ".git"))) {
    await runGit(["clone", "--no-tags", "--filter=blob:none", remoteUrl, cacheDir]);
  } else {
    await ensureGitRepository(cacheDir);
    await runGit(["remote", "set-url", "origin", remoteUrl], cacheDir);
    await runGit(["fetch", "--all", "--prune"], cacheDir);
  }

  return cacheDir;
}

export async function listBranches(repoPath: string) {
  const { stdout } = await runGit(
    ["for-each-ref", "--format=%(refname:short)", "refs/heads", "refs/remotes"],
    repoPath,
  );

  return stdout
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter((value) => value && !value.endsWith("/HEAD"));
}

function parseNumstatBlock(value: string) {
  const files: string[] = [];
  let additions = 0;
  let deletions = 0;

  for (const line of value.split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }

    const [additionsToken, deletionsToken, ...rest] = line.split("\t");
    if (rest.length === 0) {
      continue;
    }

    const filePath = rest.join("\t").trim();
    files.push(filePath);

    const parsedAdditions = Number.parseInt(additionsToken, 10);
    const parsedDeletions = Number.parseInt(deletionsToken, 10);

    additions += Number.isFinite(parsedAdditions) ? parsedAdditions : 0;
    deletions += Number.isFinite(parsedDeletions) ? parsedDeletions : 0;
  }

  return {
    files,
    additions,
    deletions,
  };
}

export function parseGitLogOutput(output: string): GitCommit[] {
  return output
    .split(RECORD_SEPARATOR)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [headerRaw, statsRaw = ""] = chunk.split(GROUP_SEPARATOR);
      const [hash, authorName, authorEmail, committedAtRaw, subject, body = "", refsRaw = ""] =
        headerRaw.split(UNIT_SEPARATOR);
      const parsedStats = parseNumstatBlock(statsRaw);

      return {
        hash,
        authorName,
        authorEmail,
        committedAt: new Date(committedAtRaw),
        subject,
        body: body.trim(),
        refNames: refsRaw
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        files: parsedStats.files,
        additions: parsedStats.additions,
        deletions: parsedStats.deletions,
      };
    });
}

function resolveRevisionArgs(branchMode: BranchMode, selectedBranches: string[], availableBranches: string[]) {
  if (branchMode === "all") {
    return ["--all"];
  }

  return selectedBranches.map((branch) => {
    if (availableBranches.includes(branch)) {
      return branch;
    }

    const remoteVariant = `origin/${branch}`;
    if (availableBranches.includes(remoteVariant)) {
      return remoteVariant;
    }

    return branch;
  });
}

export async function collectCommits(params: {
  repoPath: string;
  branchMode: BranchMode;
  selectedBranches: string[];
}) {
  const availableBranches = await listBranches(params.repoPath);
  const revisionArgs = resolveRevisionArgs(
    params.branchMode,
    params.selectedBranches,
    availableBranches,
  );

  const pretty = `${RECORD_SEPARATOR}%H${UNIT_SEPARATOR}%an${UNIT_SEPARATOR}%ae${UNIT_SEPARATOR}%aI${UNIT_SEPARATOR}%s${UNIT_SEPARATOR}%b${UNIT_SEPARATOR}%D${GROUP_SEPARATOR}`;
  const { stdout } = await runGit(
    ["log", ...revisionArgs, "--date=iso-strict", "--numstat", `--pretty=format:${pretty}`],
    params.repoPath,
  );

  return {
    branches: availableBranches,
    commits: parseGitLogOutput(stdout),
  };
}
