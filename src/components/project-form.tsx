"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
  Typography,
} from "antd";

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

const periodOptions = [
  { label: "日报", value: "day" },
  { label: "周报", value: "week" },
  { label: "月报", value: "month" },
] as const;

const sourceTypeOptions = [
  { label: "本地仓库", value: "local" },
  { label: "远程 Git URL", value: "remote" },
] as const;

const branchModeOptions = [
  { label: "全部分支", value: "all" },
  { label: "指定分支", value: "selected" },
] as const;

const { Paragraph, Text } = Typography;

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

  const columnProps = compact ? { xs: 24, md: 12 } : { xs: 24, lg: 12 };

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

      setFeedback(values.id ? "项目配置已更新" : "项目配置已保存");
      router.refresh();

      if (!values.id) {
        router.push(`/projects/${payload.project.id}`);
      }
    });
  };

  return (
    <Form autoComplete="off" layout="vertical" onSubmitCapture={handleSubmit}>
      {values.id ? <input name="id" type="hidden" value={values.id} /> : null}

      <Row gutter={[16, 8]}>
        <Col {...columnProps}>
          <Form.Item label="项目名称" required>
            <Input
              name="name"
              onChange={(event) => update("name", event.target.value)}
              placeholder="例如：团队平台主仓库"
              size="large"
              value={values.name}
            />
          </Form.Item>
        </Col>

        <Col {...columnProps}>
          <Form.Item label="默认统计周期" required>
            <Select
              onChange={(value) => update("defaultPeriod", value)}
              options={periodOptions.map((item) => ({ ...item }))}
              size="large"
              value={values.defaultPeriod}
            />
          </Form.Item>
        </Col>

        <Col {...columnProps}>
          <Form.Item label="仓库来源" required>
            <Select
              onChange={(value) => update("sourceType", value)}
              options={sourceTypeOptions.map((item) => ({ ...item }))}
              size="large"
              value={values.sourceType}
            />
          </Form.Item>
        </Col>

        <Col {...columnProps}>
          <Form.Item label="时区" required>
            <Input
              name="timezone"
              onChange={(event) => update("timezone", event.target.value)}
              placeholder="Asia/Shanghai"
              size="large"
              value={values.timezone}
            />
          </Form.Item>
        </Col>

        {values.sourceType === "local" ? (
          <Col span={24}>
            <Form.Item label="本地仓库路径" required>
              <Input
                name="localPath"
                onChange={(event) => update("localPath", event.target.value)}
                placeholder="D:\\code\\my-repo"
                size="large"
                value={values.localPath}
              />
            </Form.Item>
          </Col>
        ) : (
          <>
            <Col span={24}>
              <Form.Item label="远程仓库 URL" required>
                <Input
                  name="remoteUrl"
                  onChange={(event) => update("remoteUrl", event.target.value)}
                  placeholder="https://github.com/org/repo.git"
                  size="large"
                  value={values.remoteUrl}
                />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item
                extra="留空则使用 .cache/repos/<projectId>"
                label="缓存目录"
              >
                <Input
                  name="cacheDir"
                  onChange={(event) => update("cacheDir", event.target.value)}
                  placeholder="留空则使用 .cache/repos/<projectId>"
                  size="large"
                  value={values.cacheDir}
                />
              </Form.Item>
            </Col>
          </>
        )}

        <Col {...columnProps}>
          <Form.Item label="分支模式">
            <Select
              onChange={(value) => update("branchMode", value)}
              options={branchModeOptions.map((item) => ({ ...item }))}
              size="large"
              value={values.branchMode}
            />
          </Form.Item>
        </Col>

        <Col {...columnProps}>
          <Form.Item extra="多个作者可用逗号或换行分隔" label="作者名">
            <Input
              name="authorNames"
              onChange={(event) => update("authorNames", event.target.value)}
              placeholder="多个作者可用逗号或换行分隔"
              size="large"
              value={values.authorNames}
            />
          </Form.Item>
        </Col>

        <Col {...columnProps}>
          <Form.Item extra="多个邮箱可用逗号或换行分隔" label="作者邮箱">
            <Input
              name="authorEmails"
              onChange={(event) => update("authorEmails", event.target.value)}
              placeholder="多个邮箱可用逗号或换行分隔"
              size="large"
              value={values.authorEmails}
            />
          </Form.Item>
        </Col>

        {values.branchMode === "selected" ? (
          <Col span={24}>
            <Form.Item extra="每行一个分支名，或使用逗号分隔。" label="指定分支">
              <Input.TextArea
                autoSize={{ minRows: 4, maxRows: 6 }}
                name="selectedBranches"
                onChange={(event) => update("selectedBranches", event.target.value)}
                placeholder={"main\ndevelop\nrelease/2026.03"}
                value={values.selectedBranches}
              />
            </Form.Item>
          </Col>
        ) : null}
      </Row>

      <Card
        size="small"
        styles={{ body: { paddingBottom: 8 } }}
        title="AI 配置"
        extra={
          <Link href="https://platform.openai.com/docs/overview">
            <Button type="link">OpenAI 文档</Button>
          </Link>
        }
      >
        <Paragraph style={{ marginBottom: 16 }} type="secondary">
          支持 OpenAI-compatible 接口。留空时会退回规则版 Markdown 报告。
        </Paragraph>

        <Row gutter={[16, 8]}>
          <Col span={24}>
            <Form.Item label="Base URL">
              <Input
                name="llmBaseUrl"
                onChange={(event) => update("llmBaseUrl", event.target.value)}
                placeholder="https://api.openai.com/v1"
                size="large"
                value={values.llmBaseUrl}
              />
            </Form.Item>
          </Col>

          <Col {...columnProps}>
            <Form.Item label="模型">
              <Input
                name="llmModel"
                onChange={(event) => update("llmModel", event.target.value)}
                placeholder="gpt-5.4 或兼容模型"
                size="large"
                value={values.llmModel}
              />
            </Form.Item>
          </Col>

          <Col {...columnProps}>
            <Form.Item label="Temperature">
              <Input
                name="llmTemperature"
                onChange={(event) => update("llmTemperature", event.target.value)}
                placeholder="0.3"
                size="large"
                value={values.llmTemperature}
              />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item label="API Key">
              <Input.Password
                autoComplete="new-password"
                name="llmApiKey"
                onChange={(event) => update("llmApiKey", event.target.value)}
                placeholder="sk-..."
                size="large"
                value={values.llmApiKey}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Space orientation="vertical" size="middle" style={{ marginTop: 24, width: "100%" }}>
        <Button htmlType="submit" loading={isPending} size="large" type="primary">
          {isPending ? "保存中..." : submitLabel}
        </Button>

        {feedback ? <Alert showIcon title={feedback} type="success" /> : null}
        {error ? <Alert showIcon title={error} type="error" /> : null}
        <Text type="secondary">AI 总结会基于真实 Git 提交数据生成，不会伪造作者、提交或风险。</Text>
      </Space>
    </Form>
  );
}
