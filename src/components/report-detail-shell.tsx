"use client";

import {
  ArrowLeftOutlined,
  DownloadOutlined,
  FireOutlined,
  LineChartOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Card, Col, Descriptions, Row, Space, Statistic, Tag, Typography } from "antd";
import ReactMarkdown from "react-markdown";

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
  const authorScope = [...structured.authorScope.names, ...structured.authorScope.emails];

  return (
    <main className="page-wrap">
      <section className="page-section">
        <Card className="hero-card" styles={{ body: { padding: 32 } }}>
          <Space orientation="vertical" size={20} style={{ width: "100%" }}>
            <Button href={`/projects/${report.project.id}`} icon={<ArrowLeftOutlined />} type="link">
              返回项目详情
            </Button>

            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <Space size={[8, 8]} wrap>
                  <Tag color="processing">{getPeriodLabel(report.period)}</Tag>
                  <Tag>{report.status}</Tag>
                </Space>
                <Title level={2} style={{ marginBottom: 0, marginTop: 12 }}>
                  {report.project.name}
                </Title>
                <Paragraph style={{ marginBottom: 0, marginTop: 12 }} type="secondary">
                  先看最终 Markdown 结果，统计、热点文件和提交引用放在下方作为补充信息。
                </Paragraph>
              </div>

              <Space size="middle" wrap>
                <Text type="secondary">
                  {report.createdAtLabel} · {report.totalCommits} 条提交
                </Text>
                <Button
                  href={`/api/reports/${report.id}/markdown`}
                  icon={<DownloadOutlined />}
                  size="large"
                  type="primary"
                >
                  下载 Markdown
                </Button>
              </Space>
            </div>
          </Space>
        </Card>
      </section>

      <section className="page-section">
        <Card className="report-article-card" title="最终报告">
          <div className="report-article markdown-body">
            <ReactMarkdown>{report.markdown}</ReactMarkdown>
          </div>
        </Card>
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

              {structured.topAuthors && structured.topAuthors.length > 0 ? (
                <Card title="主要作者">
                  <Space size={[8, 8]} wrap>
                    {structured.topAuthors.map((author) => (
                      <Tag key={author.name}>
                        {author.name} · {author.commits} 次提交
                      </Tag>
                    ))}
                  </Space>
                </Card>
              ) : null}
            </Space>
          </Col>

          <Col xs={24} xl={14}>
            <Card title="提交引用">
              <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                {structured.commitReferences && structured.commitReferences.length > 0 ? (
                  structured.commitReferences.map((commit) => (
                    <Card className="metric-card" key={`${commit.shortHash}-${commit.committedAt}`} size="small">
                      <Space orientation="vertical" size={8} style={{ width: "100%" }}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <Text className="mono" strong>
                            {commit.shortHash}
                          </Text>
                          <Text type="secondary">
                            {commit.authorName} · {commit.committedAt}
                          </Text>
                        </div>
                        <Text>{commit.subject}</Text>
                        {commit.files && commit.files.length > 0 ? (
                          <Space size={[8, 8]} wrap>
                            {commit.files.map((file) => (
                              <Tag key={`${commit.shortHash}-${file}`}>{file}</Tag>
                            ))}
                          </Space>
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
