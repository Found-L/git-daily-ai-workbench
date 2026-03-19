"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import {
  ArrowLeftOutlined,
  BranchesOutlined,
  DownloadOutlined,
  FileTextOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
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
    <main className="page-wrap">
      <section className="page-section">
        <Card styles={{ body: { padding: 32 } }}>
          <Space orientation="vertical" size={20} style={{ width: "100%" }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/")} type="link">
              返回项目列表
            </Button>

            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                  {project.sourceType === "local" ? "本地仓库" : "远程仓库"}
                </Tag>
                <Title level={2} style={{ marginBottom: 0, marginTop: 12 }}>
                  {project.name}
                </Title>
                <Paragraph style={{ marginBottom: 0, marginTop: 12 }} type="secondary">
                  分支规则：
                  {project.branchRule.mode === "all" ? "全部分支" : project.branchRule.selectedBranches.join(", ")}
                  {" · "}
                  作者规则：
                  {project.authorRule.names.length + project.authorRule.emails.length > 0
                    ? [...project.authorRule.names, ...project.authorRule.emails].join(", ")
                    : "全部作者"}
                </Paragraph>
              </div>

              <Space size="middle" wrap>
                <Button
                  disabled={currentAction !== null}
                  icon={<SyncOutlined spin={currentAction === "sync"} />}
                  onClick={runSync}
                  size="large"
                >
                  {currentAction === "sync" ? "同步中..." : "同步仓库"}
                </Button>

                <Space.Compact size="large">
                  <Select
                    onChange={(value) => setReportPeriod(value)}
                    options={periodOptions.map((item) => ({ ...item }))}
                    style={{ minWidth: 128 }}
                    value={reportPeriod}
                  />
                  <Button
                    disabled={currentAction !== null}
                    icon={<FileTextOutlined />}
                    loading={currentAction === "report"}
                    onClick={generateReport}
                    type="primary"
                  >
                    {currentAction === "report" ? "生成中..." : "生成报告"}
                  </Button>
                </Space.Compact>
              </Space>
            </div>

            {status ? <Alert showIcon title={status} type="success" /> : null}
            {error ? <Alert showIcon title={error} type="error" /> : null}
          </Space>
        </Card>
      </section>

      <section className="page-section">
        <Row gutter={[24, 24]}>
          <Col xs={24} xl={14}>
            <Card
              styles={{ body: { padding: 32 } }}
              title={<Title level={3} style={{ margin: 0 }}>项目配置</Title>}
            >
              <Paragraph style={{ marginTop: 0 }} type="secondary">
                编辑仓库源、作者过滤器以及 AI 参数，保存后会直接影响后续同步和报告生成。
              </Paragraph>

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
            </Card>
          </Col>

          <Col xs={24} xl={10}>
            <Space orientation="vertical" size="large" style={{ width: "100%" }}>
              <Card title="运行状态">
                <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                  <Card size="small">
                    <Space orientation="vertical" size={4}>
                      <Text type="secondary">仓库地址</Text>
                      <Text>{project.repoSource?.localPath ?? project.repoSource?.remoteUrl ?? "未配置"}</Text>
                    </Space>
                  </Card>

                  <Card size="small">
                    <Space orientation="vertical" size={4}>
                      <Text type="secondary">AI 模型</Text>
                      <Text>
                        {project.llmProfile?.model ?? "未配置"} · {maskSecret(project.llmProfile?.apiKey)}
                      </Text>
                    </Space>
                  </Card>

                  <Card size="small">
                    <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                      <Text type="secondary">最近发现的分支</Text>
                      <Space size={[8, 8]} wrap>
                        {project.branchSnapshot.length > 0 ? (
                          project.branchSnapshot.map((branch) => (
                            <Tag icon={<BranchesOutlined />} key={branch} style={{ marginInlineEnd: 0 }}>
                              {branch}
                            </Tag>
                          ))
                        ) : (
                          <Text type="secondary">尚未同步，暂时没有分支快照。</Text>
                        )}
                      </Space>
                    </Space>
                  </Card>
                </Space>
              </Card>

              <Card
                title="报告历史"
                extra={
                  project.reports[0] ? (
                    <Button href={`/api/reports/${project.reports[0].id}/markdown`} icon={<DownloadOutlined />} type="link">
                      下载最近 Markdown
                    </Button>
                  ) : null
                }
              >
                <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                  {project.reports.length > 0 ? (
                    project.reports.map((report) => (
                      <Link href={`/reports/${report.id}`} key={report.id}>
                        <Card hoverable size="small">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <Title level={5} style={{ marginBottom: 0 }}>
                                {getPeriodLabel(report.period)}
                              </Title>
                              <Paragraph style={{ marginBottom: 0, marginTop: 4 }} type="secondary">
                                {formatLocalDateTime(report.createdAt, "zh-CN", project.timezone)} · {report.totalCommits} 条提交
                              </Paragraph>
                            </div>
                            <Tag color="blue">{report.status}</Tag>
                          </div>
                        </Card>
                      </Link>
                    ))
                  ) : (
                    <Empty
                      description="还没有生成过报告。可以先同步仓库，再点击“生成报告”。"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  )}
                </Space>
              </Card>

              <Card title="同步历史">
                <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                  {project.syncRuns.length > 0 ? (
                    project.syncRuns.map((syncRun) => (
                      <Card key={syncRun.id} size="small">
                        <Space orientation="vertical" size={4} style={{ width: "100%" }}>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <Text strong>{syncRun.status}</Text>
                            <Tag color="processing">{syncRun.commitCount} 条提交</Tag>
                          </div>
                          <Text type="secondary">
                            {formatLocalDateTime(syncRun.startedAt, "zh-CN", project.timezone)}
                          </Text>
                          {syncRun.message ? <Paragraph style={{ marginBottom: 0 }}>{syncRun.message}</Paragraph> : null}
                        </Space>
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
    </main>
  );
}
