"use client";

import {
  ArrowLeftOutlined,
  DownloadOutlined,
  FileTextOutlined,
  FireOutlined,
  LineChartOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Card, Col, List, Row, Space, Statistic, Typography } from "antd";
import ReactMarkdown from "react-markdown";

type StructuredReportView = {
  totals?: {
    commits?: number;
    authors?: number;
    additions?: number;
    deletions?: number;
  };
  hotspots?: Array<{
    file: string;
    touches: number;
  }>;
  commitReferences?: Array<{
    shortHash: string;
    authorName: string;
    committedAt: string;
    subject: string;
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
  return (
    <main className="page-wrap">
      <section className="page-section">
        <Card styles={{ body: { padding: 32 } }}>
          <Space orientation="vertical" size={20} style={{ width: "100%" }}>
            <Button href={`/projects/${report.project.id}`} icon={<ArrowLeftOutlined />} type="link">
              返回项目详情
            </Button>

            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <Text type="secondary">{getPeriodLabel(report.period)}</Text>
                <Title level={2} style={{ marginBottom: 0, marginTop: 8 }}>
                  {report.project.name}
                </Title>
                <Paragraph style={{ marginBottom: 0, marginTop: 12 }} type="secondary">
                  {report.createdAtLabel} · {report.totalCommits} 条提交 · 状态 {report.status}
                </Paragraph>
              </div>

              <Button href={`/api/reports/${report.id}/markdown`} icon={<DownloadOutlined />} size="large" type="primary">
                下载 Markdown
              </Button>
            </div>
          </Space>
        </Card>
      </section>

      <section className="page-section">
        <Row gutter={[24, 24]}>
          <Col xs={24} xl={8}>
            <Space orientation="vertical" size="large" style={{ width: "100%" }}>
              <Card title="结构化统计">
                <Row gutter={[12, 12]}>
                  <Col span={12}>
                    <Card size="small">
                      <Statistic prefix={<FileTextOutlined />} title="提交数" value={structured.totals?.commits ?? report.totalCommits} />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small">
                      <Statistic prefix={<UserOutlined />} title="作者数" value={structured.totals?.authors ?? 0} />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small">
                      <Statistic prefix={<LineChartOutlined />} title="新增行数" value={structured.totals?.additions ?? 0} />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small">
                      <Statistic prefix={<LineChartOutlined />} title="删除行数" value={structured.totals?.deletions ?? 0} />
                    </Card>
                  </Col>
                </Row>
              </Card>

              <Card title="热点文件">
                <List
                  dataSource={structured.hotspots ?? []}
                  locale={{ emptyText: "没有热点文件数据。" }}
                  renderItem={(hotspot) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<FireOutlined style={{ color: "#fa541c" }} />}
                        description={`${hotspot.touches} 次变更`}
                        title={<span className="break-all">{hotspot.file}</span>}
                      />
                    </List.Item>
                  )}
                />
              </Card>

              <Card title="提交引用">
                <List
                  dataSource={structured.commitReferences ?? []}
                  locale={{ emptyText: "没有提交引用数据。" }}
                  renderItem={(commit) => (
                    <List.Item>
                      <List.Item.Meta
                        description={`${commit.authorName} · ${commit.committedAt}`}
                        title={
                          <Space orientation="vertical" size={0}>
                            <Text className="mono" strong>
                              {commit.shortHash}
                            </Text>
                            <Text>{commit.subject}</Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Space>
          </Col>

          <Col xs={24} xl={16}>
            <Card title="Markdown 预览">
              <div className="markdown-body">
                <ReactMarkdown>{report.markdown}</ReactMarkdown>
              </div>
            </Card>
          </Col>
        </Row>
      </section>
    </main>
  );
}
