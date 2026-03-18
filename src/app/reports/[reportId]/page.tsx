import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Download } from "lucide-react";

import { getReportDetail, parseStructuredJson } from "@/lib/project-service";
import type { StructuredReport } from "@/lib/types";
import { formatLocalDateTime } from "@/lib/utils";

function getPeriodLabel(period: string) {
  if (period === "day") {
    return "日报";
  }

  if (period === "week") {
    return "周报";
  }

  return "月报";
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const report = await getReportDetail(reportId);

  if (!report) {
    notFound();
  }

  const structured = parseStructuredJson(report.structuredJson) as StructuredReport;

  return (
    <main className="page-wrap space-y-8">
      <section className="panel rounded-[2rem] p-6 lg:p-8">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)]"
          href={`/projects/${report.project.id}`}
        >
          <ArrowLeft className="h-4 w-4" />
          返回项目详情
        </Link>

        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
              {getPeriodLabel(report.period)}
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-[-0.05em]">{report.project.name}</h1>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              {formatLocalDateTime(report.createdAt, "zh-CN", report.timezone)} · {report.totalCommits} 条提交 · 状态 {report.status}
            </p>
          </div>

          <Link
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white"
            href={`/api/reports/${report.id}/markdown`}
          >
            <Download className="h-4 w-4" />
            下载 Markdown
          </Link>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <aside className="space-y-6">
          <div className="panel rounded-[2rem] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">结构化统计</p>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-[var(--line)] bg-white/70 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">提交数</dt>
                <dd className="mt-2 text-3xl font-bold">{structured.totals?.commits ?? report.totalCommits}</dd>
              </div>
              <div className="rounded-[1.4rem] border border-[var(--line)] bg-white/70 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">作者数</dt>
                <dd className="mt-2 text-3xl font-bold">{structured.totals?.authors ?? 0}</dd>
              </div>
              <div className="rounded-[1.4rem] border border-[var(--line)] bg-white/70 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">新增行数</dt>
                <dd className="mt-2 text-3xl font-bold">{structured.totals?.additions ?? 0}</dd>
              </div>
              <div className="rounded-[1.4rem] border border-[var(--line)] bg-white/70 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">删除行数</dt>
                <dd className="mt-2 text-3xl font-bold">{structured.totals?.deletions ?? 0}</dd>
              </div>
            </dl>
          </div>

          <div className="panel rounded-[2rem] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">热点文件</p>
            <div className="mt-4 space-y-3">
              {structured.hotspots?.length ? (
                structured.hotspots.map((hotspot) => (
                  <div
                    className="rounded-[1.4rem] border border-[var(--line)] bg-white/70 px-4 py-3"
                    key={hotspot.file}
                  >
                    <p className="break-all text-sm font-semibold">{hotspot.file}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{hotspot.touches} 次变更</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--muted)]">没有热点文件数据。</p>
              )}
            </div>
          </div>

          <div className="panel rounded-[2rem] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">提交引用</p>
            <div className="mt-4 space-y-3">
              {structured.commitReferences?.length ? (
                structured.commitReferences.map((commit) => (
                  <div
                    className="rounded-[1.4rem] border border-[var(--line)] bg-white/70 px-4 py-3"
                    key={commit.hash}
                  >
                    <p className="mono text-sm font-semibold">{commit.shortHash}</p>
                    <p className="mt-1 text-sm text-[var(--foreground)]">{commit.subject}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {commit.authorName} · {commit.committedAt}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--muted)]">没有提交引用数据。</p>
              )}
            </div>
          </div>
        </aside>

        <article className="panel rounded-[2rem] p-6 lg:p-8">
          <div className="markdown-body">
            <ReactMarkdown>{report.markdown}</ReactMarkdown>
          </div>
        </article>
      </section>
    </main>
  );
}
