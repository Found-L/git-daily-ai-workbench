"use client";

import { useRouter } from "next/navigation";
import { startTransition, useDeferredValue, useState } from "react";

import {
  ArrowRightOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  RobotOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Input,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";

import { ProjectForm } from "@/components/project-form";

type ProjectCard = {
  id: string;
  name: string;
  sourceType: string;
  defaultPeriod: string;
  timezone: string;
  selectedBranches: string[];
  authorNames: string[];
  authorEmails: string[];
  hasAiConfig: boolean;
  lastSync: {
    status: string;
    message: string | null;
    startedAtLabel: string;
  } | null;
  lastReport: {
    id: string;
    status: string;
    period: string;
    createdAtLabel: string;
  } | null;
  updatedAtLabel: string;
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
  const { notification } = App.useApp();
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const deferredKeyword = useDeferredValue(keyword);

  const removeProject = (projectId: string) => {
    setPendingDeleteId(projectId);

    startTransition(async () => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        notification.error({
          description: payload.error ?? "删除项目失败，请稍后重试。",
          title: "删除项目失败",
        });
        setPendingDeleteId(null);
        return;
      }

      notification.success({
        description: "项目、同步记录和历史报告已一并移除。",
        title: "项目已删除",
      });
      setPendingDeleteId(null);
      router.refresh();
    });
  };

  const filteredProjects = projects.filter((project) => {
    const query = deferredKeyword.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return [
      project.name,
      project.timezone,
      ...project.authorNames,
      ...project.authorEmails,
      ...project.selectedBranches,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  return (
    <main className="page-wrap">
      <section className="page-section">
        <Card className="hero-card" styles={{ body: { padding: 32 } }}>
          <Row align="middle" gutter={[24, 24]}>
            <Col xs={24} xl={14}>
              <Space orientation="vertical" size={20} style={{ width: "100%" }}>
                <Tag className="hero-tag">Git + AI Report Desk</Tag>

                <Title className="hero-title" level={1}>
                  把提交历史整理成真正可读的日报。
                </Title>

                <Paragraph className="hero-copy">
                  先维护项目清单，再按需同步仓库和生成报告。AI 配置可选，缺省时自动回退到规则版摘要，结论只基于真实提交。
                </Paragraph>

                <Space size="middle" wrap>
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => setIsCreateOpen(true)}
                    size="large"
                    type="primary"
                  >
                    添加项目
                  </Button>
                  <Button onClick={() => document.getElementById("project-library")?.scrollIntoView()} size="large">
                    浏览项目
                  </Button>
                </Space>
              </Space>
            </Col>

            <Col xs={24} xl={10}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={8} xl={24}>
                  <Card className="metric-card" size="small">
                    <Statistic title="已配置项目" value={projects.length} />
                  </Card>
                </Col>
                <Col xs={24} sm={8} xl={24}>
                  <Card className="metric-card" size="small">
                    <Statistic title="已有同步记录" value={projects.filter((item) => item.lastSync).length} />
                  </Card>
                </Col>
                <Col xs={24} sm={8} xl={24}>
                  <Card className="metric-card" size="small">
                    <Statistic
                      styles={{ content: { fontSize: 18 } }}
                      title="默认时区"
                      value={defaultTimezone}
                    />
                  </Card>
                </Col>
              </Row>
            </Col>
          </Row>
        </Card>
      </section>

      <section className="page-section" id="project-library">
        <Card styles={{ body: { padding: 32 } }}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Title level={3} style={{ margin: 0 }}>
                项目列表
              </Title>
              <Paragraph style={{ marginBottom: 0, marginTop: 8 }} type="secondary">
                这里只保留关键状态，配置收进项目详情页的编辑抽屉里。你可以直接打开最近报告，也可以进入项目页继续生成。
              </Paragraph>
            </div>

            <Input
              allowClear
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索项目名、作者、分支或时区"
              prefix={<SearchOutlined />}
              size="large"
              style={{ maxWidth: 380 }}
              value={keyword}
            />
          </div>

          {filteredProjects.length === 0 ? (
            <Empty
              description="当前没有匹配的项目。可以调整搜索词，或者先新增一个仓库配置。"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ marginTop: 40 }}
            >
              <Button icon={<PlusOutlined />} onClick={() => setIsCreateOpen(true)} type="primary">
                添加项目
              </Button>
            </Empty>
          ) : (
            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
              {filteredProjects.map((project) => (
                <Col key={project.id} xs={24} xl={12}>
                  <Card className="project-card" hoverable>
                    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <Space size={[8, 8]} wrap>
                            <Tag color={project.sourceType === "local" ? "blue" : "gold"}>
                              {project.sourceType === "local" ? "本地仓库" : "远程仓库"}
                            </Tag>
                            <Tag color={project.hasAiConfig ? "green" : "default"}>
                              {project.hasAiConfig ? "已配置 AI" : "规则版摘要"}
                            </Tag>
                          </Space>
                          <Title level={4} style={{ marginBottom: 0, marginTop: 12 }}>
                            {project.name}
                          </Title>
                        </div>

                        <Tag color="processing">{project.timezone}</Tag>
                      </div>

                      <div className="project-card__meta">
                        <span>
                          <ClockCircleOutlined /> 默认周期：{getPeriodLabel(project.defaultPeriod)}
                        </span>
                        <span>
                          <FolderOpenOutlined />{" "}
                          {project.selectedBranches.length > 0
                            ? `${project.selectedBranches.length} 个指定分支`
                            : "全部分支"}
                        </span>
                        <span>
                          <RobotOutlined />{" "}
                          {project.authorNames.length + project.authorEmails.length > 0
                            ? `${project.authorNames.length + project.authorEmails.length} 个作者过滤器`
                            : "全部作者"}
                        </span>
                      </div>

                      <Row gutter={[12, 12]}>
                        <Col xs={24} md={12}>
                          <Card className="metric-card" size="small">
                            <Space orientation="vertical" size={4}>
                              <Text type="secondary">最近同步</Text>
                              <Text>
                                {project.lastSync
                                  ? `${project.lastSync.status} · ${project.lastSync.startedAtLabel}`
                                  : "还没有同步记录"}
                              </Text>
                            </Space>
                          </Card>
                        </Col>
                        <Col xs={24} md={12}>
                          <Card className="metric-card" size="small">
                            <Space orientation="vertical" size={4}>
                              <Text type="secondary">最近报告</Text>
                              <Text>
                                {project.lastReport
                                  ? `${getPeriodLabel(project.lastReport.period)} · ${project.lastReport.createdAtLabel}`
                                  : "还没有生成过报告"}
                              </Text>
                            </Space>
                          </Card>
                        </Col>
                      </Row>

                      <div className="project-card__footer">
                        <div className="project-card__footer-row project-card__footer-row--actions">
                          <Space className="project-card__footer-main" size="middle" wrap>
                            <Button
                              icon={<ArrowRightOutlined />}
                              onClick={() => router.push(`/projects/${project.id}`)}
                              type="primary"
                            >
                              打开项目
                            </Button>
                            {project.lastReport ? (
                              <Button onClick={() => router.push(`/reports/${project.lastReport!.id}`)}>
                                查看最近报告
                              </Button>
                            ) : null}
                          </Space>
                        </div>

                        <div className="project-card__footer-row project-card__footer-row--meta">
                          <Text type="secondary">
                            最近更新：{project.updatedAtLabel}
                          </Text>
                          <Popconfirm
                            description="会连同同步记录和历史报告一起删除，无法恢复。"
                            okButtonProps={{ danger: true }}
                            okText="删除"
                            onConfirm={() => removeProject(project.id)}
                            title="确认删除这个项目？"
                          >
                            <Button
                              className="project-card__danger"
                              danger
                              icon={<DeleteOutlined />}
                              loading={pendingDeleteId === project.id}
                              type="text"
                            >
                              删除项目
                            </Button>
                          </Popconfirm>
                        </div>
                      </div>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Card>
      </section>

      <Drawer
        destroyOnClose
        onClose={() => setIsCreateOpen(false)}
        open={isCreateOpen}
        size="large"
        title="添加项目"
      >
        <ProjectForm
          defaultTimezone={defaultTimezone}
          onSaved={() => setIsCreateOpen(false)}
          submitLabel="创建项目"
        />
      </Drawer>
    </main>
  );
}
