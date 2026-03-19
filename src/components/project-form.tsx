"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Form,
  Input,
  InputNumber,
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
  llmTemperature: number;
};

const COMMON_TIMEZONES = [
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "Asia/Tokyo",
  "UTC",
  "Europe/London",
  "America/Los_Angeles",
  "America/New_York",
] as const;

const sourceTypeOptions = [
  { label: "本地仓库", value: "local" },
  { label: "远程 Git URL", value: "remote" },
] as const;

const branchModeOptions = [
  { label: "全部分支", value: "all" },
  { label: "指定分支", value: "selected" },
] as const;

const { Paragraph, Text, Link } = Typography;

function createDefaultValues(timezone: string): ProjectFormValues {
  return {
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
    llmTemperature: 0.3,
  };
}

function resolveInitialValues(
  defaultTimezone: string,
  initialValues?: Partial<ProjectFormValues>,
): ProjectFormValues {
  const detectedTimezone =
    typeof window === "undefined"
      ? defaultTimezone
      : Intl.DateTimeFormat().resolvedOptions().timeZone || defaultTimezone;
  const timezone = initialValues?.timezone ?? detectedTimezone;

  return {
    ...createDefaultValues(timezone),
    ...initialValues,
    timezone,
    llmTemperature:
      typeof initialValues?.llmTemperature === "number"
        ? initialValues.llmTemperature
        : Number(initialValues?.llmTemperature ?? 0.3),
  };
}

function buildTimezoneOptions(defaultTimezone: string) {
  return [...new Set([defaultTimezone, ...COMMON_TIMEZONES])].map((value) => ({
    label: value,
    value,
  }));
}

export function ProjectForm({
  initialValues,
  defaultTimezone,
  submitLabel,
  compact = false,
  onSaved,
}: {
  initialValues?: Partial<ProjectFormValues>;
  defaultTimezone: string;
  submitLabel: string;
  compact?: boolean;
  onSaved?: (projectId: string, created: boolean) => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProjectFormValues>(() =>
    resolveInitialValues(defaultTimezone, initialValues),
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const columnProps = compact ? { xs: 24, md: 12 } : { xs: 24, lg: 12 };
  const timezoneOptions = buildTimezoneOptions(defaultTimezone);

  const update = <Key extends keyof ProjectFormValues>(key: Key, value: ProjectFormValues[Key]) => {
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

      const created = !values.id;
      setFeedback(created ? "项目已创建" : "项目配置已更新");
      router.refresh();
      onSaved?.(payload.project.id, created);

      if (created) {
        router.push(`/projects/${payload.project.id}`);
      }
    });
  };

  return (
    <Form autoComplete="off" layout="vertical" onSubmitCapture={handleSubmit}>
      {values.id ? <input name="project_id" type="hidden" value={values.id} /> : null}

      <Row gutter={[16, 8]}>
        <Col {...columnProps}>
          <Form.Item label="项目名称" required>
            <Input
              autoComplete="off"
              name="project_name"
              onChange={(event) => update("name", event.target.value)}
              placeholder="例如：团队平台主仓库"
              size="large"
              value={values.name}
            />
          </Form.Item>
        </Col>

        <Col {...columnProps}>
          <Form.Item
            extra="默认使用当前设备时区，可在这里切换。生成报告时会按这个时区计算周期。"
            label="时区"
            required
          >
            <Select
              onChange={(value) => update("timezone", value)}
              options={timezoneOptions}
              showSearch
              size="large"
              value={values.timezone}
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
          <Form.Item
            extra="统计周期只在生成报告时选择。这里不再单独配置。"
            label="报告生成"
          >
            <Input disabled size="large" value="生成日报 / 周报 / 月报时再选择周期" />
          </Form.Item>
        </Col>

        {values.sourceType === "local" ? (
          <Col span={24}>
            <Form.Item
              extra="读取本地现有 Git 仓库，不会复制你的工作区目录。"
              label="本地仓库路径"
              required
            >
              <Input
                autoComplete="off"
                name="project_local_path"
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
                  autoComplete="off"
                  name="project_remote_url"
                  onChange={(event) => update("remoteUrl", event.target.value)}
                  placeholder="https://github.com/org/repo.git"
                  size="large"
                  value={values.remoteUrl}
                />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item
                extra="远程仓库会克隆到本地缓存目录；留空则使用系统默认缓存路径。"
                label="缓存目录"
              >
                <Input
                  autoComplete="off"
                  name="project_cache_dir"
                  onChange={(event) => update("cacheDir", event.target.value)}
                  placeholder="留空则使用 .cache/repos/<projectId>"
                  size="large"
                  value={values.cacheDir}
                />
              </Form.Item>
            </Col>
          </>
        )}

        <Col span={24}>
          <Collapse
            bordered={false}
            className="soft-collapse"
            items={[
              {
                key: "filters",
                label: "筛选条件（可选）",
                children: (
                  <Space orientation="vertical" size="large" style={{ width: "100%" }}>
                    <Paragraph style={{ marginBottom: 0 }} type="secondary">
                      作者名和作者邮箱按并集匹配。邮箱不是必填，只是在多人同名时更精确，不要求和作者名一一对应。
                    </Paragraph>

                    <Row gutter={[16, 8]}>
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
                        <Form.Item
                          extra="多个作者名可用逗号或换行分隔。"
                          label="作者名"
                        >
                          <Input.TextArea
                            autoSize={{ minRows: 3, maxRows: 5 }}
                            autoComplete="off"
                            name="author_name_filters"
                            onChange={(event) => update("authorNames", event.target.value)}
                            placeholder={"Found-L\nAlice"}
                            value={values.authorNames}
                          />
                        </Form.Item>
                      </Col>

                      <Col {...columnProps}>
                        <Form.Item
                          extra="多个邮箱可用逗号或换行分隔。"
                          label="作者邮箱"
                        >
                          <Input.TextArea
                            autoSize={{ minRows: 3, maxRows: 5 }}
                            autoComplete="off"
                            name="author_email_filters"
                            onChange={(event) => update("authorEmails", event.target.value)}
                            placeholder={"found@example.com\nalice@example.com"}
                            value={values.authorEmails}
                          />
                        </Form.Item>
                      </Col>

                      {values.branchMode === "selected" ? (
                        <Col span={24}>
                          <Form.Item
                            extra="每行一个分支名，也可以用逗号分隔。"
                            label="指定分支"
                          >
                            <Input.TextArea
                              autoSize={{ minRows: 3, maxRows: 6 }}
                              autoComplete="off"
                              name="selected_branch_filters"
                              onChange={(event) =>
                                update("selectedBranches", event.target.value)
                              }
                              placeholder={"main\ndevelop\nrelease/2026.03"}
                              value={values.selectedBranches}
                            />
                          </Form.Item>
                        </Col>
                      ) : null}
                    </Row>
                  </Space>
                ),
              },
              {
                key: "ai",
                label: "AI 设置（可选）",
                children: (
                    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
                    <Paragraph style={{ marginBottom: 0 }} type="secondary">
                      不填也能生成报告，系统会回退到规则版摘要。Temperature 只影响措辞的发散程度，不会改变事实来源。
                    </Paragraph>

                    <Row gutter={[16, 8]}>
                      <Col span={24}>
                        <Form.Item label="Base URL">
                          <Input
                            autoComplete="off"
                            name="llm_base_url"
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
                            autoComplete="off"
                            name="llm_model_name"
                            onChange={(event) => update("llmModel", event.target.value)}
                            placeholder="gpt-5.4 或兼容模型"
                            size="large"
                            value={values.llmModel}
                          />
                        </Form.Item>
                      </Col>

                      <Col {...columnProps}>
                        <Form.Item
                          extra="建议 0 到 0.3。值越高，措辞越活跃，但不应该改变结论事实。"
                          label="Temperature"
                        >
                          <InputNumber
                            max={2}
                            min={0}
                            onChange={(value) =>
                              update("llmTemperature", typeof value === "number" ? value : 0.3)
                            }
                            precision={1}
                            size="large"
                            step={0.1}
                            style={{ width: "100%" }}
                            value={values.llmTemperature}
                          />
                        </Form.Item>
                      </Col>

                      <Col span={24}>
                        <Form.Item label="API Key">
                          <Input.Password
                            autoComplete="new-password"
                            name="llm_api_key"
                            onChange={(event) => update("llmApiKey", event.target.value)}
                            placeholder="sk-..."
                            size="large"
                            value={values.llmApiKey}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Link href="https://platform.openai.com/docs/overview" target="_blank">
                      查看 OpenAI 文档
                    </Link>
                  </Space>
                ),
              },
            ]}
          />
        </Col>
      </Row>

      <Card className="helper-card" size="small" style={{ marginTop: 24 }}>
        <Space orientation="vertical" size={8}>
          <Text strong>生成前提示</Text>
          <Text type="secondary">
            第一次生成前必须先同步仓库。同步只会把提交元数据写入本地 SQLite；本地仓库不会复制工作区，远程仓库只会在缓存目录保留一个 Git 克隆。
          </Text>
          <Text type="secondary">
            AI 总结只基于真实 Git 提交数据生成，不会捏造提交、作者或风险。
          </Text>
        </Space>
      </Card>

      <Space orientation="vertical" size="middle" style={{ marginTop: 24, width: "100%" }}>
        <Button htmlType="submit" loading={isPending} size="large" type="primary">
          {isPending ? "保存中..." : submitLabel}
        </Button>

        {feedback ? <Alert showIcon title={feedback} type="success" /> : null}
        {error ? <Alert showIcon title={error} type="error" /> : null}
      </Space>
    </Form>
  );
}
