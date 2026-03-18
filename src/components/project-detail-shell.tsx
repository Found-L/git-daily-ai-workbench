"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { ArrowLeft, Download, RefreshCw, WandSparkles } from "lucide-react";

import { ProjectForm } from "@/components/project-form";
import { formatLocalDateTime, maskSecret } from "@/lib/utils";

type ProjectDetail = {
  id: string;
  name: string;
  sourceType: string;
  defaultPeriod: "day" | "week" | "month";
  timezone: string;
  repoSource: {
    localPath: string | null;
    remoteUrl: string | null;
    cacheDir: string | null;
  } | null;
  branchRule: {
    mode: "all" | "selected";
    selectedBranches: string[];
  };
  authorRule: {
    names: string[];
    emails: string[];
  };
  llmProfile: {
    baseUrl: string | null;
    apiKey: string | null;
    model: string | null;
    temperature: number;
  } | null;
  branchSnapshot: string[];
  syncRuns: Array<{
    id: string;
    status: string;
    message: string | null;
    commitCount: number;
    startedAt: string;
  }>;
  reports: Array<{
    id: string;
    period: string;
    status: string;
    createdAt: string;
    totalCommits: number;
  }>;
};

function getPeriodLabel(period: string) {
  if (period === "day") {
    return "日报";
  }

  if (period === "week") {
    return "周报";
  }

  return "月报";
}

export function ProjectDetailShell({ project }: { project: ProjectDetail }) {
  const router = useRouter();
  const [reportPeriod, setReportPeriod] = useState(project.defaultPeriod);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<"sync" | "report" | null>(null);

  const runSync = () => {
    setStatus(null);
    setError(null);
    setCurrentAction("sync");
    startTransition(async () => {
      const response = await fetch(`/api/projects/${project.id}/sync`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "同步失败");
        setCurrentAction(null);
        return;
      }

      setStatus("仓库同步完成");
      setCurrentAction(null);
      router.refresh();
    });
  };

  const generateReport = () => {
    setStatus(null);
    setError(null);
    setCurrentAction("report");
    startTransition(async () => {
      const response = await fetch(`/api/projects/${project.id}/reports/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          period: reportPeriod,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        report?: {
          id: string;
        };
      };

      if (!response.ok || !payload.report) {
        setError(payload.error ?? "报告生成失败");
        setCurrentAction(null);
        return;
      }

      setStatus("报告已生成，正在跳转到详情页");
      setCurrentAction(null);
      router.refresh();
      router.push(`/reports/${payload.report.id}`);
    });
  };

  return (
    <main className="page-wrap space-y-8">
      <section className="panel rounded-[2rem] p-6 lg:p-8">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)]" href="/">
          <ArrowLeft className="h-4 w-4" />
          返回项目列表
        </Link>

        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
              {project.sourceType === "local" ? "本地仓库" : "远程仓库"}
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-[-0.05em]">{project.name}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              分支规则：
              {project.branchRule.mode === "all" ? "全部分支" : project.branchRule.selectedBranches.join(", ")}
              {" · "}
              作者规则：
              {project.authorRule.names.length + project.authorRule.emails.length > 0
                ? [...project.authorRule.names, ...project.authorRule.emails].join(", ")
                : "全部作者"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/80 px-5 py-3 text-sm font-semibold"
              disabled={currentAction !== null}
              onClick={runSync}
              type="button"
            >
              <RefreshCw className={`h-4 w-4 ${currentAction === "sync" ? "animate-spin" : ""}`} />
              {currentAction === "sync" ? "同步中..." : "同步仓库"}
            </button>
            <div className="flex items-center gap-3 rounded-full border border-[var(--line)] bg-white/80 px-3 py-2">
              <select
                className="bg-transparent text-sm outline-none"
                onChange={(event) => setReportPeriod(event.target.value as "day" | "week" | "month")}
                value={reportPeriod}
              >
                <option value="day">日报</option>
                <option value="week">周报</option>
                <option value="month">月报</option>
              </select>
              <button
                className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
                disabled={currentAction !== null}
                onClick={generateReport}
                type="button"
              >
                <WandSparkles className="h-4 w-4" />
                {currentAction === "report" ? "生成中..." : "生成报告"}
              </button>
            </div>
          </div>
        </div>

        {status ? <p className="mt-4 text-sm font-semibold text-[var(--emerald)]">{status}</p> : null}
        {error ? <p className="mt-4 text-sm font-semibold text-[var(--accent-deep)]">{error}</p> : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="panel rounded-[2rem] p-6 lg:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">项目配置</p>
          <h2 className="mt-3 text-2xl font-bold tracking-[-0.04em]">编辑仓库与 AI 参数</h2>
          <div className="mt-6">
            <ProjectForm
              compact
              defaultTimezone={project.timezone}
              initialValues={{
                id: project.id,
                name: project.name,
                sourceType: project.sourceType as "local" | "remote",
                localPath: project.repoSource?.localPath ?? "",
                remoteUrl: project.repoSource?.remoteUrl ?? "",
                cacheDir: project.repoSource?.cacheDir ?? "",
                branchMode: project.branchRule.mode,
                selectedBranches: project.branchRule.selectedBranches.join("\n"),
                authorNames: project.authorRule.names.join(", "),
                authorEmails: project.authorRule.emails.join(", "),
                defaultPeriod: project.defaultPeriod,
                timezone: project.timezone,
                llmBaseUrl: project.llmProfile?.baseUrl ?? "",
                llmApiKey: project.llmProfile?.apiKey ?? "",
                llmModel: project.llmProfile?.model ?? "",
                llmTemperature: `${project.llmProfile?.temperature ?? 0.3}`,
              }}
              submitLabel="更新项目配置"
            />
          </div>
        </div>

        <div className="space-y-6">
          <section className="panel rounded-[2rem] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">运行状态</p>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/70 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">仓库地址</dt>
                <dd className="mt-2 break-all text-sm text-[var(--foreground)]">
                  {project.repoSource?.localPath ?? project.repoSource?.remoteUrl ?? "未配置"}
                </dd>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/70 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">AI 模型</dt>
                <dd className="mt-2 text-sm text-[var(--foreground)]">
                  {project.llmProfile?.model ?? "未配置"} · {maskSecret(project.llmProfile?.apiKey)}
                </dd>
              </div>
            </dl>

            <div className="mt-5 rounded-[1.5rem] border border-[var(--line)] bg-white/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">最近发现的分支</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {project.branchSnapshot.length > 0 ? (
                  project.branchSnapshot.map((branch) => (
                    <span
                      className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-3 py-1 text-xs font-semibold"
                      key={branch}
                    >
                      {branch}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-[var(--muted)]">尚未同步，暂时没有分支快照。</span>
                )}
              </div>
            </div>
          </section>

          <section className="panel rounded-[2rem] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">报告历史</p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em]">最近生成的报告</h2>
              </div>
              {project.reports[0] ? (
                <Link
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-deep)]"
                  href={`/api/reports/${project.reports[0].id}/markdown`}
                >
                  <Download className="h-4 w-4" />
                  下载最近 Markdown
                </Link>
              ) : null}
            </div>

            <div className="mt-5 space-y-3">
              {project.reports.length > 0 ? (
                project.reports.map((report) => (
                  <Link
                    className="block rounded-[1.5rem] border border-[var(--line)] bg-white/70 px-4 py-4 transition hover:border-[var(--accent)]"
                    href={`/reports/${report.id}`}
                    key={report.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold">{getPeriodLabel(report.period)}</p>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {formatLocalDateTime(report.createdAt, "zh-CN", project.timezone)} · {report.totalCommits} 条提交
                        </p>
                      </div>
                      <span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold">
                        {report.status}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/40 px-4 py-8 text-sm text-[var(--muted)]">
                  还没有生成过报告。可以先同步仓库，再点击“生成报告”。
                </div>
              )}
            </div>
          </section>

          <section className="panel rounded-[2rem] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">同步历史</p>
            <div className="mt-5 space-y-3">
              {project.syncRuns.length > 0 ? (
                project.syncRuns.map((syncRun) => (
                  <div
                    className="rounded-[1.5rem] border border-[var(--line)] bg-white/70 px-4 py-4"
                    key={syncRun.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{syncRun.status}</p>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {formatLocalDateTime(syncRun.startedAt, "zh-CN", project.timezone)} · {syncRun.commitCount} 条提交
                        </p>
                      </div>
                    </div>
                    {syncRun.message ? <p className="mt-2 text-sm text-[var(--muted)]">{syncRun.message}</p> : null}
                  </div>
                ))
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/40 px-4 py-8 text-sm text-[var(--muted)]">
                  还没有同步记录。
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
