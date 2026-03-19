"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import {
  ArrowLeftOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FireOutlined,
  LineChartOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import ReactMarkdown from "react-markdown";

import { ReportCharts } from "@/components/report-charts";
import type { StructuredDailySummary } from "@/lib/types";

type StructuredReportView = {
  periodLabel: string;
  timezone: string;
  branchScope: string[];
  authorScope: {
    names: string[];
    emails: string[];
  };
  totals?: {
    commits?: number;
    authors?: number;
    additions?: number;
    deletions?: number;
    filesTouched?: number;
  };
  dailySummaries: StructuredDailySummary[];
  topAuthors?: Array<{
    name: string;
    commits: number;
  }>;
  hotspots?: Array<{
    file: string;
    touches: number;
  }>;
  commitReferences?: Array<{
    shortHash: string;
    authorName: string;
    committedAt: string;
    subject: string;
    files?: string[];
  }>;
};

const { Paragraph, Text, Title } = Typography;

function getPeriodLabel(period: string) {
  if (period === "day") {
    return "日报";
  }

  if (period === "week") {
    return "周报";
  }

  return "月报";
}

function buildDailySummaryMarkdown(dailySummaries: StructuredDailySummary[]) {
  if (dailySummaries.length === 0) {
    return "";
  }

  return `## 每日事项清单\n\n${dailySummaries
    .map(
      (day) =>
        `${day.label}\n\n${day.items.map((item, index) => `${index + 1}. ${item}`).join("\n")}`,
    )
    .join("\n\n")}`;
}

function normalizeReportMarkdown(markdown: string, dailySummaries: StructuredDailySummary[]) {
  if (dailySummaries.length === 0) {
    return markdown;
  }

  const normalizedDailySummary = buildDailySummaryMarkdown(dailySummaries);
  const summarySectionPattern = /##\s*每日事项清单[\s\S]*?(?=\n##\s|$)/;

  if (summarySectionPattern.test(markdown)) {
    return markdown.replace(summarySectionPattern, normalizedDailySummary);
  }

  return `${normalizedDailySummary}\n\n${markdown}`;
}

export function ReportDetailShell({
  report,
  structured,
}: {
  report: {
    id: string;
    period: string;
    status: string;
    totalCommits: number;
    createdAtLabel: string;
    markdown: string;
    project: {
      id: string;
      name: string;
    };
  };
  structured: StructuredReportView;
}) {
  const { notification } = App.useApp();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const authorScope = [...structured.authorScope.names, ...structured.authorScope.emails];
  const displayMarkdown = normalizeReportMarkdown(report.markdown, structured.dailySummaries);

  const removeReport = () => {
    setIsDeleting(true);

    startTransition(async () => {
      const response = await fetch(`/api/reports/${report.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        projectId?: string;
      };

      if (!response.ok) {
        notification.error({
          description: payload.error ?? "删除报告失败，请稍后重试。",
          message: "删除报告失败",
        });
        setIsDeleting(false);
        return;
      }

      notification.success({
        description: "当前报告已移除，不会影响项目配置与同步数据。",
        message: "报告已删除",
      });
      router.push(`/projects/${payload.projectId ?? report.project.id}`);
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
              onClick={() => router.push(`/projects/${report.project.id}`)}
            >
              返回项目详情
            </Button>

            <div className="hero-header">
              <div className="hero-header__content">
                <Space size={[8, 8]} wrap>
                  <Tag color="processing">{getPeriodLabel(report.period)}</Tag>
                  <Tag>{report.status}</Tag>
                </Space>
                <Title level={2} style={{ marginBottom: 0, marginTop: 12 }}>
                  {report.project.name}
                </Title>
                <Paragraph style={{ marginBottom: 0, marginTop: 12 }} type="secondary">
                  先看每日事项清单和图表，再按需展开完整 Markdown。这样长正文不会挡住下方统计和提交引用。
                </Paragraph>
              </div>

              <div className="hero-header__panel hero-header__panel--compact">
                <Text className="hero-header__meta" type="secondary">
                  {report.createdAtLabel} · {report.totalCommits} 条提交
                </Text>
                <div className="hero-toolbar">
                  <Button
                    href={`/api/reports/${report.id}/markdown`}
                    icon={<DownloadOutlined />}
                    size="large"
                    type="primary"
                  >
                    下载 Markdown
                  </Button>
                  <Popconfirm
                    description="删除后只移除这次生成结果，不影响项目配置和同步数据。"
                    okButtonProps={{ danger: true }}
                    okText="删除"
                    onConfirm={removeReport}
                    title="确认删除这份报告？"
                  >
                    <Button danger icon={<DeleteOutlined />} loading={isDeleting} size="large">
                      删除报告
                    </Button>
                  </Popconfirm>
                </div>
              </div>
            </div>

          </Space>
        </Card>
      </section>

      <section className="page-section">
        <Card className="daily-summary-focus-card" title="每日事项清单">
          <div className="daily-summary-focus-grid">
            {structured.dailySummaries.length > 0 ? (
              structured.dailySummaries.map((day) => (
                <Card className="daily-summary-focus-item" key={`focus-${day.date}`} size="small">
                  <Space orientation="vertical" size={12} style={{ width: "100%" }}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Text strong>{day.label}</Text>
                      <Text type="secondary">
                        {day.commitCount} 条提交 · +{day.additions} / -{day.deletions}
                      </Text>
                    </div>
                    <ol className="daily-summary-list daily-summary-list--focus">
                      {day.items.map((item) => (
                        <li key={`focus-${day.date}-${item}`}>{item}</li>
                      ))}
                    </ol>
                  </Space>
                </Card>
              ))
            ) : (
              <Text type="secondary">当前周期没有按天提炼的数据。</Text>
            )}
          </div>
        </Card>
      </section>

      <section className="page-section">
        <ReportCharts
          dailySummaries={structured.dailySummaries}
          topAuthors={structured.topAuthors ?? []}
        />
      </section>

      <section className="page-section">
        <Collapse
          className="soft-collapse report-content-collapse"
          defaultActiveKey={[]}
          items={[
            {
              children: (
                <div className="report-article markdown-body">
                  <ReactMarkdown>{displayMarkdown}</ReactMarkdown>
                </div>
              ),
              extra: <Tag color="blue">最终内容</Tag>,
              key: "full-markdown",
              label: (
                <div className="collapse-label">
                  <span className="collapse-label__title">完整 Markdown</span>
                  <span className="collapse-label__hint">默认收起，按需展开查看完整正文</span>
                </div>
              ),
            },
          ]}
        />
      </section>

      <section className="page-section">
        <Row gutter={[24, 24]}>
          <Col xs={24} xl={10}>
            <Space orientation="vertical" size="large" style={{ width: "100%" }}>
              <Card title="周期与统计">
                <Descriptions
                  colon={false}
                  column={1}
                  items={[
                    {
                      key: "period",
                      label: "时间范围",
                      children: structured.periodLabel,
                    },
                    {
                      key: "timezone",
                      label: "时区",
                      children: structured.timezone,
                    },
                    {
                      key: "branches",
                      label: "分支范围",
                      children:
                        structured.branchScope.length > 0
                          ? structured.branchScope.join(", ")
                          : "全部分支",
                    },
                    {
                      key: "authors",
                      label: "作者范围",
                      children: authorScope.length > 0 ? authorScope.join(", ") : "全部作者",
                    },
                  ]}
                />

                <div className="report-summary-grid" style={{ marginTop: 24 }}>
                  <Card className="metric-card" size="small">
                    <Statistic
                      prefix={<LineChartOutlined />}
                      title="提交数"
                      value={structured.totals?.commits ?? report.totalCommits}
                    />
                  </Card>
                  <Card className="metric-card" size="small">
                    <Statistic
                      prefix={<UserOutlined />}
                      title="作者数"
                      value={structured.totals?.authors ?? 0}
                    />
                  </Card>
                  <Card className="metric-card" size="small">
                    <Statistic
                      prefix={<LineChartOutlined />}
                      title="新增行数"
                      value={structured.totals?.additions ?? 0}
                    />
                  </Card>
                  <Card className="metric-card" size="small">
                    <Statistic
                      prefix={<LineChartOutlined />}
                      title="删除行数"
                      value={structured.totals?.deletions ?? 0}
                    />
                  </Card>
                </div>
              </Card>

              <Card title="热点文件">
                <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                  {structured.hotspots && structured.hotspots.length > 0 ? (
                    structured.hotspots.map((hotspot) => (
                      <Card className="metric-card" key={hotspot.file} size="small">
                        <Space align="start" size="middle">
                          <FireOutlined style={{ color: "#fa541c", fontSize: 18, marginTop: 4 }} />
                          <div>
                            <Text className="break-all" strong>
                              {hotspot.file}
                            </Text>
                            <Paragraph style={{ marginBottom: 0, marginTop: 6 }} type="secondary">
                              {hotspot.touches} 次触达
                            </Paragraph>
                          </div>
                        </Space>
                      </Card>
                    ))
                  ) : (
                    <Text type="secondary">没有热点文件数据。</Text>
                  )}
                </Space>
              </Card>
            </Space>
          </Col>

          <Col xs={24} xl={14}>
            <Card title="提交引用">
              <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                {structured.commitReferences && structured.commitReferences.length > 0 ? (
                  structured.commitReferences.map((commit) => (
                    <Card className="metric-card commit-card" key={`${commit.shortHash}-${commit.committedAt}`} size="small">
                      <Space orientation="vertical" size={10} style={{ width: "100%" }}>
                        <div className="commit-card__header">
                          <Text className="mono" strong>
                            {commit.shortHash}
                          </Text>
                          <Text type="secondary">
                            {commit.authorName} · {commit.committedAt}
                          </Text>
                        </div>
                        <Text className="commit-card__subject">{commit.subject}</Text>
                        {commit.files && commit.files.length > 0 ? (
                          <div className="commit-card__files">
                            {commit.files.map((file) => (
                              <Tag className="wrap-tag" key={`${commit.shortHash}-${file}`}>
                                {file}
                              </Tag>
                            ))}
                          </div>
                        ) : null}
                      </Space>
                    </Card>
                  ))
                ) : (
                  <Text type="secondary">没有提交引用数据。</Text>
                )}
              </Space>
            </Card>
          </Col>
        </Row>
      </section>
    </main>
  );
}
