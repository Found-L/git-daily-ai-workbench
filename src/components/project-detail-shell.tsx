"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { getISOWeek, getISOWeekYear } from "date-fns";

import {
  ArrowLeftOutlined,
  BranchesOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileTextOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Popconfirm,
  Row,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";

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

const { Paragraph, Text, Title } = Typography;

const periodOptions = [
  { label: "日报", value: "day" },
  { label: "周报", value: "week" },
  { label: "月报", value: "month" },
] as const;

function getPeriodLabel(period: string) {
  if (period === "day") {
    return "日报";
  }

  if (period === "week") {
    return "周报";
  }

  return "月报";
}

function getReferenceInputLabel(period: "day" | "week" | "month") {
  if (period === "day") {
    return "指定日期";
  }

  if (period === "week") {
    return "指定周";
  }

  return "指定月份";
}

function formatReferenceValue(period: "day" | "week" | "month", value: Dayjs) {
  if (period === "day") {
    return value.format("YYYY-MM-DD");
  }

  if (period === "month") {
    return value.format("YYYY-MM");
  }

  const date = value.toDate();
  return `${getISOWeekYear(date)}-W${String(getISOWeek(date)).padStart(2, "0")}`;
}

function createCurrentReference(period: "day" | "week" | "month", timezone: string) {
  const currentDate = dayjs(new Date().toLocaleString("sv-SE", { timeZone: timezone }).replace(" ", "T"));

  return {
    pickerValue: currentDate,
    referenceValue: formatReferenceValue(period, currentDate),
  };
}

function getReferencePickerFormat(period: "day" | "week" | "month") {
  if (period === "day") {
    return "YYYY-MM-DD";
  }

  if (period === "month") {
    return "YYYY-MM";
  }

  return (value: Dayjs) => formatReferenceValue("week", value);
}

export function ProjectDetailShell({ project }: { project: ProjectDetail }) {
  const router = useRouter();
  const initialReference = createCurrentReference(project.defaultPeriod, project.timezone);
  const [reportPeriod, setReportPeriod] = useState(project.defaultPeriod);
  const [referenceValue, setReferenceValue] = useState(initialReference.referenceValue);
  const [referencePickerValue, setReferencePickerValue] = useState<Dayjs | null>(
    initialReference.pickerValue,
  );
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<
    "sync" | "report" | "delete-project" | string | null
  >(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const hasSyncedData = project.syncRuns.length > 0;
  const hasAiConfig = Boolean(
    project.llmProfile?.baseUrl && project.llmProfile?.apiKey && project.llmProfile?.model,
  );
  const authorFilters = [...project.authorRule.names, ...project.authorRule.emails];
  const latestReport = project.reports[0];

  const resetReferenceToCurrent = (period = reportPeriod) => {
    const current = createCurrentReference(period, project.timezone);
    setReferencePickerValue(current.pickerValue);
    setReferenceValue(current.referenceValue);
  };

  const handleReferenceChange = (value: Dayjs | null) => {
    setReferencePickerValue(value);
    setReferenceValue(value ? formatReferenceValue(reportPeriod, value) : "");
  };

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

      setStatus("仓库同步完成，提交索引已更新。");
      setCurrentAction(null);
      router.refresh();
    });
  };

  const generateReport = () => {
    if (!hasSyncedData) {
      setError("请先同步仓库。系统需要先把提交索引到本地 SQLite，才能生成报告。");
      return;
    }

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
          reference: referenceValue || undefined,
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

      setStatus("报告已生成，正在跳转到结果页。");
      setCurrentAction(null);
      router.refresh();
      router.push(`/reports/${payload.report.id}`);
    });
  };

  const removeProject = () => {
    setStatus(null);
    setError(null);
    setCurrentAction("delete-project");

    startTransition(async () => {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "删除项目失败");
        setCurrentAction(null);
        return;
      }

      router.push("/");
      router.refresh();
    });
  };

  const removeReport = (reportId: string) => {
    setStatus(null);
    setError(null);
    setCurrentAction(`delete-report:${reportId}`);

    startTransition(async () => {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "删除报告失败");
        setCurrentAction(null);
        return;
      }

      setStatus("报告已删除。");
      setCurrentAction(null);
      router.refresh();
    });
  };

  return (
    <main className="page-wrap">
      <section className="page-section">
        <Card className="hero-card" styles={{ body: { padding: 32 } }}>
          <Space orientation="vertical" size={20} style={{ width: "100%" }}>
            <Button
              className="return-button"
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push("/")}
            >
              返回项目列表
            </Button>

            <div className="hero-header">
              <div className="hero-header__content">
                <Space size={[8, 8]} wrap>
                  <Tag color={project.sourceType === "local" ? "blue" : "gold"}>
                    {project.sourceType === "local" ? "本地仓库" : "远程仓库"}
                  </Tag>
                  <Tag color={hasAiConfig ? "green" : "default"}>
                    {hasAiConfig ? "已配置 AI" : "规则版摘要"}
                  </Tag>
                  <Tag color="processing">{project.timezone}</Tag>
                </Space>

                <Title level={2} style={{ marginBottom: 0, marginTop: 12 }}>
                  {project.name}
                </Title>

                <Paragraph style={{ marginBottom: 0, marginTop: 12 }} type="secondary">
                  这里只展示生成报告必需的关键信息。你可以直接按指定日期、周或月份生成，也可以在右侧管理历史报告。
                </Paragraph>
              </div>

              <div className="hero-header__panel">
                <div className="hero-toolbar">
                  <Select
                    onChange={(value) => {
                      setReportPeriod(value);
                      resetReferenceToCurrent(value);
                    }}
                    options={periodOptions.map((item) => ({ ...item }))}
                    size="large"
                    style={{ minWidth: 116 }}
                    value={reportPeriod}
                  />
                  <DatePicker
                    allowClear={false}
                    format={getReferencePickerFormat(reportPeriod)}
                    onChange={handleReferenceChange}
                    picker={reportPeriod === "day" ? undefined : reportPeriod}
                    placeholder={getReferenceInputLabel(reportPeriod)}
                    size="large"
                    style={{ minWidth: 210 }}
                    value={referencePickerValue}
                  />
                  <Button onClick={() => resetReferenceToCurrent()} size="large">
                    当前
                  </Button>
                  <Button
                    disabled={currentAction !== null || !hasSyncedData}
                    icon={<FileTextOutlined />}
                    loading={currentAction === "report"}
                    onClick={generateReport}
                    size="large"
                    type="primary"
                  >
                    {currentAction === "report" ? "生成中..." : "生成报告"}
                  </Button>
                </div>

                <div className="hero-toolbar">
                  <Button
                    disabled={currentAction !== null}
                    icon={<SyncOutlined spin={currentAction === "sync"} />}
                    onClick={runSync}
                    size="large"
                  >
                    {currentAction === "sync" ? "同步中..." : "同步仓库"}
                  </Button>
                  <Button icon={<EditOutlined />} onClick={() => setIsEditOpen(true)} size="large">
                    修改配置
                  </Button>
                  <Popconfirm
                    description="会连同同步记录和历史报告一起删除，无法恢复。"
                    okButtonProps={{ danger: true }}
                    okText="删除"
                    onConfirm={removeProject}
                    title="确认删除这个项目？"
                  >
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      loading={currentAction === "delete-project"}
                      size="large"
                    >
                      删除项目
                    </Button>
                  </Popconfirm>
                </div>
              </div>
            </div>

            <Text type="secondary">
              当前默认定位到本期的 {getReferenceInputLabel(reportPeriod)}；你也可以切换成历史某一天、某一周或某个月后再生成报告。
            </Text>

            {!hasSyncedData ? (
              <Alert
                description="首次生成前必须先同步仓库。系统只会把提交元数据索引到本地 SQLite；本地仓库不会复制工作区，远程仓库会更新本地缓存仓库。"
                showIcon
                title="当前还没有同步记录"
                type="warning"
              />
            ) : null}

            {!hasAiConfig ? (
              <Alert
                description="当前未配置 Base URL、模型和 API Key。点击“生成报告”时会自动回退到规则版 Markdown 摘要。Temperature 只影响措辞风格，不影响事实来源。"
                showIcon
                title="AI 配置为空时会走规则版摘要"
                type="info"
              />
            ) : null}

            {status ? <Alert showIcon title={status} type="success" /> : null}
            {error ? <Alert showIcon title={error} type="error" /> : null}
          </Space>
        </Card>
      </section>

      <section className="page-section">
        <Row gutter={[24, 24]}>
          <Col xs={24} xl={15}>
            <Card
              title="最近报告"
              extra={
                latestReport ? (
                  <Button
                    href={`/api/reports/${latestReport.id}/markdown`}
                    icon={<DownloadOutlined />}
                    type="link"
                  >
                    下载最新 Markdown
                  </Button>
                ) : null
              }
            >
              <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                {project.reports.length > 0 ? (
                  project.reports.map((report, index) => (
                    <Card
                      className={
                        index === 0
                          ? "report-picker-card report-picker-card--latest"
                          : "report-picker-card"
                      }
                      key={report.id}
                      size="small"
                    >
                      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                        <div>
                          <Space size={[8, 8]} wrap>
                            <Tag color={index === 0 ? "processing" : "default"}>
                              {index === 0 ? "最新结果" : "历史结果"}
                            </Tag>
                            <Tag color="blue">{getPeriodLabel(report.period)}</Tag>
                            <Tag>{report.status}</Tag>
                          </Space>
                          <Title level={5} style={{ marginBottom: 0, marginTop: 12 }}>
                            {formatLocalDateTime(report.createdAt, "zh-CN", project.timezone)}
                          </Title>
                          <Paragraph style={{ marginBottom: 0, marginTop: 6 }} type="secondary">
                            共 {report.totalCommits} 条提交。最新结果会优先突出显示，方便你快速回看真实内容。
                          </Paragraph>
                        </div>

                        <div className="report-card__footer">
                          <Space wrap>
                            <Button onClick={() => router.push(`/reports/${report.id}`)} type="primary">
                              查看结果
                            </Button>
                            <Button href={`/api/reports/${report.id}/markdown`}>下载 Markdown</Button>
                          </Space>
                          <Popconfirm
                            description="删除后只移除这次生成结果，不影响项目和同步数据。"
                            okButtonProps={{ danger: true }}
                            okText="删除"
                            onConfirm={() => removeReport(report.id)}
                            title="确认删除这份报告？"
                          >
                            <Button
                              danger
                              icon={<DeleteOutlined />}
                              loading={currentAction === `delete-report:${report.id}`}
                              type="text"
                            >
                              删除报告
                            </Button>
                          </Popconfirm>
                        </div>
                      </Space>
                    </Card>
                  ))
                ) : (
                  <Empty
                    description="还没有生成过报告。先同步仓库，再按顶部的周期和日期基准生成日报、周报或月报。"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </Space>
            </Card>
          </Col>

          <Col xs={24} xl={9}>
            <Space orientation="vertical" size="large" style={{ width: "100%" }}>
              <Card title="项目概览">
                <Descriptions
                  colon={false}
                  column={1}
                  items={[
                    {
                      key: "repo",
                      label: "仓库地址",
                      children:
                        project.repoSource?.localPath ??
                        project.repoSource?.remoteUrl ??
                        "未配置",
                    },
                    {
                      key: "branches",
                      label: "分支范围",
                      children:
                        project.branchRule.mode === "all"
                          ? "全部分支"
                          : project.branchRule.selectedBranches.join(", "),
                    },
                    {
                      key: "authors",
                      label: "作者过滤",
                      children:
                        authorFilters.length > 0 ? authorFilters.join(", ") : "全部作者",
                    },
                    {
                      key: "ai",
                      label: "AI 配置",
                      children: hasAiConfig
                        ? `${project.llmProfile?.model} · ${maskSecret(project.llmProfile?.apiKey)}`
                        : "未配置，将回退到规则版摘要",
                    },
                    {
                      key: "temperature",
                      label: "Temperature",
                      children: hasAiConfig
                        ? `${project.llmProfile?.temperature ?? 0.3}（仅影响措辞发散度）`
                        : "未设置",
                    },
                  ]}
                />

                <Card className="helper-card" size="small" style={{ marginTop: 16 }}>
                  <Space orientation="vertical" size={8}>
                    <Text strong>为什么必须先同步？</Text>
                    <Text type="secondary">
                      生成报告依赖本地 SQLite 中的提交索引。同步并不是把仓库整体塞进内存，而是把提交元数据整理进数据库，后续生成才有数据可用。
                    </Text>
                  </Space>
                </Card>

                {project.branchSnapshot.length > 0 ? (
                  <Space size={[8, 8]} style={{ marginTop: 16 }} wrap>
                    {project.branchSnapshot.map((branch) => (
                      <Tag icon={<BranchesOutlined />} key={branch}>
                        {branch}
                      </Tag>
                    ))}
                  </Space>
                ) : null}
              </Card>

              <Card title="最近同步">
                <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                  {project.syncRuns.length > 0 ? (
                    project.syncRuns.map((syncRun, index) => (
                      <Card className="metric-card" key={syncRun.id} size="small">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <Space size={[8, 8]} wrap>
                            <Tag color={index === 0 ? "processing" : "default"}>{syncRun.status}</Tag>
                            <Text strong>{syncRun.commitCount} 条提交</Text>
                          </Space>
                          <Text type="secondary">
                            {formatLocalDateTime(syncRun.startedAt, "zh-CN", project.timezone)}
                          </Text>
                        </div>
                        {syncRun.message ? (
                          <Paragraph style={{ marginBottom: 0, marginTop: 10 }} type="secondary">
                            {syncRun.message}
                          </Paragraph>
                        ) : null}
                      </Card>
                    ))
                  ) : (
                    <Empty description="还没有同步记录。" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  )}
                </Space>
              </Card>
            </Space>
          </Col>
        </Row>
      </section>

      <Drawer
        destroyOnClose
        onClose={() => setIsEditOpen(false)}
        open={isEditOpen}
        size="large"
        title="修改项目配置"
      >
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
            llmTemperature: project.llmProfile?.temperature ?? 0.3,
          }}
          onSaved={() => setIsEditOpen(false)}
          submitLabel="更新项目配置"
        />
      </Drawer>
    </main>
  );
}
