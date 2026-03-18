"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { ArrowRight, GitBranch, Sparkles } from "lucide-react";

import { ProjectForm } from "@/components/project-form";
import { formatLocalDateTime } from "@/lib/utils";

type ProjectCard = {
  id: string;
  name: string;
  sourceType: string;
  defaultPeriod: string;
  timezone: string;
  selectedBranches: string[];
  authorNames: string[];
  authorEmails: string[];
  updatedAt: string;
  lastSync: {
    status: string;
    message: string | null;
    startedAt: string;
  } | null;
  lastReport: {
    id: string;
    status: string;
    period: string;
    createdAt: string;
  } | null;
};

export function DashboardShell({
  projects,
  defaultTimezone,
}: {
  projects: ProjectCard[];
  defaultTimezone: string;
}) {
  const [keyword, setKeyword] = useState("");
  const deferredKeyword = useDeferredValue(keyword);

  const filteredProjects = projects.filter((project) => {
    const query = deferredKeyword.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return [project.name, ...project.authorNames, ...project.authorEmails]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  return (
    <main className="page-wrap space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="panel rounded-[2rem] px-6 py-8 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-[var(--accent-deep)]">
            <Sparkles className="h-4 w-4" />
            Git + AI Report Desk
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-[-0.05em] text-[var(--foreground)] md:text-6xl">
            把提交历史整理成你真正能读的日报。
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--muted)] md:text-lg">
            连接本地仓库或远程 Git URL，按作者与分支筛选，自动汇总日/周/月提交，并在配置好模型后生成中文 AI Markdown 报告。
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/60 p-4">
              <p className="text-3xl font-bold tracking-[-0.04em]">{projects.length}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">已配置项目</p>
            </div>
            <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/60 p-4">
              <p className="text-3xl font-bold tracking-[-0.04em]">
                {projects.filter((item) => item.lastSync).length}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">已有同步记录</p>
            </div>
            <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/60 p-4">
              <p className="text-lg font-bold tracking-[-0.04em]">{defaultTimezone}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">默认时区</p>
            </div>
          </div>
        </div>

        <div className="panel rounded-[2rem] p-6 lg:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">新建项目</p>
          <h2 className="mt-3 text-2xl font-bold tracking-[-0.04em]">添加新的仓库监控配置</h2>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            第一版支持本地仓库路径和远程 Git URL。AI 配置为空时，系统会自动输出规则版 Markdown 摘要。
          </p>

          <div className="mt-6">
            <ProjectForm defaultTimezone={defaultTimezone} submitLabel="创建项目" />
          </div>
        </div>
      </section>

      <section className="panel rounded-[2rem] p-6 lg:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">项目列表</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em]">按项目查看同步与报告状态</h2>
          </div>

          <label className="block w-full max-w-md space-y-2">
            <span className="text-sm font-semibold text-[var(--muted)]">搜索项目 / 作者</span>
            <input
              className="w-full rounded-full border border-[var(--line)] bg-white/70 px-4 py-3 outline-none transition focus:border-[var(--accent)]"
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="输入项目名、作者名或邮箱"
              value={keyword}
            />
          </label>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {filteredProjects.map((project) => (
            <Link
              className="group rounded-[1.75rem] border border-[var(--line)] bg-white/70 p-5 transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_18px_40px_rgba(68,42,23,0.08)]"
              href={`/projects/${project.id}`}
              key={project.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                    {project.sourceType === "local" ? "本地仓库" : "远程仓库"}
                  </p>
                  <h3 className="mt-2 text-2xl font-bold tracking-[-0.04em]">{project.name}</h3>
                </div>
                <div className="rounded-full border border-[var(--line)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-deep)]">
                  {project.defaultPeriod === "day"
                    ? "日报"
                    : project.defaultPeriod === "week"
                      ? "周报"
                      : "月报"}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 text-sm text-[var(--muted)]">
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] px-3 py-1">
                  <GitBranch className="h-4 w-4" />
                  {project.selectedBranches.length > 0
                    ? `${project.selectedBranches.length} 个指定分支`
                    : "全部分支"}
                </span>
                <span className="rounded-full border border-[var(--line)] px-3 py-1">
                  {project.authorNames.length + project.authorEmails.length > 0
                    ? `${project.authorNames.length + project.authorEmails.length} 个作者过滤器`
                    : "全部作者"}
                </span>
                <span className="rounded-full border border-[var(--line)] px-3 py-1">{project.timezone}</span>
              </div>

              <dl className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--paper)] px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">最近同步</dt>
                  <dd className="mt-2 text-sm leading-7 text-[var(--foreground)]">
                    {project.lastSync
                      ? `${project.lastSync.status} · ${formatLocalDateTime(project.lastSync.startedAt, "zh-CN", project.timezone)}`
                      : "还没有同步记录"}
                  </dd>
                </div>
                <div className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--paper)] px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">最近报告</dt>
                  <dd className="mt-2 text-sm leading-7 text-[var(--foreground)]">
                    {project.lastReport
                      ? `${project.lastReport.period} · ${formatLocalDateTime(project.lastReport.createdAt, "zh-CN", project.timezone)}`
                      : "还没有生成报告"}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-deep)]">
                打开项目
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>

        {filteredProjects.length === 0 ? (
          <div className="mt-8 rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/45 px-5 py-10 text-center text-sm text-[var(--muted)]">
            当前没有匹配的项目，试试换个关键词或先新建一个仓库配置。
          </div>
        ) : null}
      </section>
    </main>
  );
}
