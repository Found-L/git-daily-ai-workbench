"use client";

import { useRouter } from "next/navigation";
import { useDeferredValue, useState } from "react";

import {
  ArrowRightOutlined,
  BranchesOutlined,
  FolderOpenOutlined,
  SearchOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";

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

export function DashboardShell({
  projects,
  defaultTimezone,
}: {
  projects: ProjectCard[];
  defaultTimezone: string;
}) {
  const router = useRouter();
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
    <main className="page-wrap">
      <section className="page-section">
        <Row align="top" gutter={[24, 24]}>
          <Col xs={24} xl={13}>
            <Card styles={{ body: { padding: 32 } }}>
              <Space orientation="vertical" size={20} style={{ width: "100%" }}>
                <Tag color="blue" style={{ alignSelf: "flex-start", marginInlineEnd: 0, paddingInline: 12, paddingBlock: 6 }}>
                  Git + AI Report Desk
                </Tag>

                <Title level={1} style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", lineHeight: 1.02, margin: 0 }}>
                  把提交历史整理成真正可读的日报。
                </Title>

                <Paragraph style={{ fontSize: 18, marginBottom: 0 }} type="secondary">
                  连接本地仓库或远程 Git URL，按作者和分支筛选，自动汇总日、周、月提交，并在配置模型后生成中文 AI Markdown 报告。
                </Paragraph>

                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={8}>
                    <Card size="small">
                      <Statistic title="已配置项目" value={projects.length} />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card size="small">
                      <Statistic title="已有同步记录" value={projects.filter((item) => item.lastSync).length} />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card size="small">
                      <Statistic
                        styles={{ content: { fontSize: 20 } }}
                        title="默认时区"
                        value={defaultTimezone}
                      />
                    </Card>
                  </Col>
                </Row>
              </Space>
            </Card>
          </Col>

          <Col xs={24} xl={11}>
            <Card
              styles={{ body: { padding: 32 } }}
              title={<Title level={3} style={{ margin: 0 }}>新建项目</Title>}
            >
              <Paragraph style={{ marginTop: 0 }} type="secondary">
                第一版支持本地仓库路径和远程 Git URL。AI 配置留空时，系统会自动输出规则版 Markdown 摘要。
              </Paragraph>
              <ProjectForm defaultTimezone={defaultTimezone} submitLabel="创建项目" />
            </Card>
          </Col>
        </Row>
      </section>

      <section className="page-section">
        <Card styles={{ body: { padding: 32 } }}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Title level={3} style={{ margin: 0 }}>
                项目列表
              </Title>
              <Paragraph style={{ marginBottom: 0, marginTop: 8 }} type="secondary">
                按项目查看同步进度、报告状态和当前过滤条件。
              </Paragraph>
            </div>

            <Input
              allowClear
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="输入项目名、作者名或邮箱"
              prefix={<SearchOutlined />}
              size="large"
              style={{ maxWidth: 360 }}
              value={keyword}
            />
          </div>

          <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
            {filteredProjects.map((project) => (
              <Col key={project.id} xs={24} xl={12}>
                <Card
                  hoverable
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Text type="secondary">
                          {project.sourceType === "local" ? "本地仓库" : "远程仓库"}
                        </Text>
                        <Title level={4} style={{ marginBottom: 0, marginTop: 8 }}>
                          {project.name}
                        </Title>
                      </div>
                      <Tag color="blue">{getPeriodLabel(project.defaultPeriod)}</Tag>
                    </div>

                    <Space size={[8, 8]} wrap>
                      <Tag icon={<BranchesOutlined />} style={{ marginInlineEnd: 0 }}>
                        {project.selectedBranches.length > 0 ? `${project.selectedBranches.length} 个指定分支` : "全部分支"}
                      </Tag>
                      <Tag icon={<FolderOpenOutlined />} style={{ marginInlineEnd: 0 }}>
                        {project.authorNames.length + project.authorEmails.length > 0
                          ? `${project.authorNames.length + project.authorEmails.length} 个作者过滤器`
                          : "全部作者"}
                      </Tag>
                      <Tag icon={<SyncOutlined />} style={{ marginInlineEnd: 0 }}>
                        {project.timezone}
                      </Tag>
                    </Space>

                    <Row gutter={[12, 12]}>
                      <Col xs={24} md={12}>
                        <Card size="small">
                          <Text type="secondary">最近同步</Text>
                          <Paragraph style={{ marginBottom: 0, marginTop: 8 }}>
                            {project.lastSync
                              ? `${project.lastSync.status} · ${formatLocalDateTime(project.lastSync.startedAt, "zh-CN", project.timezone)}`
                              : "还没有同步记录"}
                          </Paragraph>
                        </Card>
                      </Col>
                      <Col xs={24} md={12}>
                        <Card size="small">
                          <Text type="secondary">最近报告</Text>
                          <Paragraph style={{ marginBottom: 0, marginTop: 8 }}>
                            {project.lastReport
                              ? `${getPeriodLabel(project.lastReport.period)} · ${formatLocalDateTime(project.lastReport.createdAt, "zh-CN", project.timezone)}`
                              : "还没有生成报告"}
                          </Paragraph>
                        </Card>
                      </Col>
                    </Row>

                    <Button icon={<ArrowRightOutlined />} type="link">
                      打开项目
                    </Button>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>

          {filteredProjects.length === 0 ? (
            <Empty
              description="当前没有匹配的项目，试试换个关键词，或者先新建一个仓库配置。"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ marginTop: 32 }}
            />
          ) : null}
        </Card>
      </section>
    </main>
  );
}
