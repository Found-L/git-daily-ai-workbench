"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ProjectFormValues = {
  id?: string;
  name: string;
  sourceType: "local" | "remote";
  localPath: string;
  remoteUrl: string;
  cacheDir: string;
  branchMode: "all" | "selected";
  selectedBranches: string;
  authorNames: string;
  authorEmails: string;
  defaultPeriod: "day" | "week" | "month";
  timezone: string;
  llmBaseUrl: string;
  llmApiKey: string;
  llmModel: string;
  llmTemperature: string;
};

const defaultValues = (timezone: string): ProjectFormValues => ({
  name: "",
  sourceType: "local",
  localPath: "",
  remoteUrl: "",
  cacheDir: "",
  branchMode: "all",
  selectedBranches: "",
  authorNames: "",
  authorEmails: "",
  defaultPeriod: "day",
  timezone,
  llmBaseUrl: "",
  llmApiKey: "",
  llmModel: "",
  llmTemperature: "0.3",
});

export function ProjectForm({
  initialValues,
  defaultTimezone,
  submitLabel,
  compact = false,
}: {
  initialValues?: Partial<ProjectFormValues>;
  defaultTimezone: string;
  submitLabel: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProjectFormValues>({
    ...defaultValues(defaultTimezone),
    ...initialValues,
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const update = (key: keyof ProjectFormValues, value: string) => {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const payload = (await response.json()) as {
        error?: string;
        project?: {
          id: string;
        };
      };

      if (!response.ok || !payload.project) {
        setError(payload.error ?? "保存项目失败");
        return;
      }

      setFeedback("项目配置已保存");
      router.refresh();

      if (!values.id) {
        router.push(`/projects/${payload.project.id}`);
      }
    });
  };

  const gridClasses = compact ? "grid gap-4 md:grid-cols-2" : "grid gap-4 lg:grid-cols-2";

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className={gridClasses}>
        {values.id ? <input name="id" type="hidden" value={values.id} /> : null}

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--muted)]">项目名称</span>
          <input
            className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--accent)]"
            value={values.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="例如：团队平台主仓"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--muted)]">默认统计周期</span>
          <select
            className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 outline-none"
            value={values.defaultPeriod}
            onChange={(event) => update("defaultPeriod", event.target.value)}
          >
            <option value="day">日报</option>
            <option value="week">周报</option>
            <option value="month">月报</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--muted)]">仓库来源</span>
          <select
            className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 outline-none"
            value={values.sourceType}
            onChange={(event) => update("sourceType", event.target.value)}
          >
            <option value="local">本地仓库</option>
            <option value="remote">远程 Git URL</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--muted)]">时区</span>
          <input
            className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--accent)]"
            value={values.timezone}
            onChange={(event) => update("timezone", event.target.value)}
            placeholder="Asia/Shanghai"
          />
        </label>

        {values.sourceType === "local" ? (
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-[var(--muted)]">本地仓库路径</span>
            <input
              className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--accent)]"
              value={values.localPath}
              onChange={(event) => update("localPath", event.target.value)}
              placeholder="D:\code\my-repo"
            />
          </label>
        ) : (
          <>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-[var(--muted)]">远程仓库 URL</span>
              <input
                className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                value={values.remoteUrl}
                onChange={(event) => update("remoteUrl", event.target.value)}
                placeholder="https://github.com/org/repo.git"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-[var(--muted)]">缓存目录</span>
              <input
                className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                value={values.cacheDir}
                onChange={(event) => update("cacheDir", event.target.value)}
                placeholder="留空则使用 .cache/repos/<projectId>"
              />
            </label>
          </>
        )}

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--muted)]">分支模式</span>
          <select
            className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 outline-none"
            value={values.branchMode}
            onChange={(event) => update("branchMode", event.target.value)}
          >
            <option value="all">全部分支</option>
            <option value="selected">指定分支</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--muted)]">作者名</span>
          <input
            className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--accent)]"
            value={values.authorNames}
            onChange={(event) => update("authorNames", event.target.value)}
            placeholder="多个作者可用逗号或换行分隔"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--muted)]">作者邮箱</span>
          <input
            className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--accent)]"
            value={values.authorEmails}
            onChange={(event) => update("authorEmails", event.target.value)}
            placeholder="多个邮箱可用逗号或换行分隔"
          />
        </label>

        {values.branchMode === "selected" ? (
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-[var(--muted)]">指定分支</span>
            <textarea
              className="min-h-28 w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--accent)]"
              value={values.selectedBranches}
              onChange={(event) => update("selectedBranches", event.target.value)}
              placeholder={"main\ndevelop\nrelease/2026.03"}
            />
          </label>
        ) : null}
      </div>

      <div className="space-y-3 rounded-[1.75rem] border border-[var(--line)] bg-[var(--paper-strong)] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">AI 配置</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              支持 OpenAI-compatible 接口。留空时会退回规则版 Markdown 报告。
            </p>
          </div>
          <Link
            className="text-sm font-semibold text-[var(--accent)]"
            href="https://platform.openai.com/docs/overview"
          >
            OpenAI 文档
          </Link>
        </div>

        <div className={gridClasses}>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-[var(--muted)]">Base URL</span>
            <input
              className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--accent)]"
              value={values.llmBaseUrl}
              onChange={(event) => update("llmBaseUrl", event.target.value)}
              placeholder="https://api.openai.com/v1"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-[var(--muted)]">模型</span>
            <input
              className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--accent)]"
              value={values.llmModel}
              onChange={(event) => update("llmModel", event.target.value)}
              placeholder="gpt-5.4 或兼容模型"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-[var(--muted)]">Temperature</span>
            <input
              className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--accent)]"
              value={values.llmTemperature}
              onChange={(event) => update("llmTemperature", event.target.value)}
              placeholder="0.3"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-[var(--muted)]">API Key</span>
            <input
              className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--accent)]"
              type="password"
              value={values.llmApiKey}
              onChange={(event) => update("llmApiKey", event.target.value)}
              placeholder="sk-..."
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-deep)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "保存中..." : submitLabel}
        </button>
        {feedback ? <p className="text-sm font-semibold text-[var(--emerald)]">{feedback}</p> : null}
        {error ? <p className="text-sm font-semibold text-[var(--accent-deep)]">{error}</p> : null}
      </div>
    </form>
  );
}
