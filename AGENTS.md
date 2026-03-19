# AGENTS

## 项目目标

- 这是一个单用户、本地优先的 Git 日报 AI 工作台。
- 主要工作流是：配置仓库 -> 同步 Git 提交 -> 生成日/周/月报告 -> 下载 Markdown。
- AI 总结必须基于真实提交数据，不允许捏造提交、作者或风险。

## 目录约定

- `src/app`: Next.js App Router 页面与 API 路由。
- `src/components`: 交互式界面组件。
- `src/lib`: Git 采集、报告生成、数据库访问、校验与通用工具。
- `prisma`: SQLite schema。
- `tests/e2e`: Playwright 冒烟测试。
- `skills`: 项目专用 skills。

## 开发命令

- 首选系统工具链：Node.js 22 LTS（或 >= 20.9）+ Git。
- `corepack pnpm ...` 这组命令按跨平台约定维护，默认适用于 Windows、macOS、Linux。
- `pnpm` 建议通过 Corepack 运行，避免要求全局安装：
  - 安装依赖：`corepack pnpm install`
  - 推送数据库 schema：`corepack pnpm prisma:push`
  - 本地开发：`corepack pnpm dev`
  - 校验：`corepack pnpm lint`、`corepack pnpm test`
  - E2E：`corepack pnpm test:e2e`
- macOS / Linux 默认依赖系统安装的 Node.js / Git，不维护 repo-local `*.sh` bootstrap 脚本。
- `scripts/*.ps1` 仅作为 Windows 下的 repo-local 便携工具链入口，不作为 macOS / Linux 的默认方案。
- Windows 机器如果缺少系统级 Node.js / Git，可选使用 repo-local 便携工具链：
  - `.\scripts\bootstrap-tooling.ps1`
  - `.\scripts\with-tooling.ps1 pnpm install`
  - `.\scripts\with-tooling.ps1 pnpm prisma:push`
  - `.\scripts\with-tooling.ps1 pnpm dev`

## 实现边界

- 第一版不做登录系统，不做多租户，不做团队权限管理。
- 仓库来源支持本地路径和远程 Git URL，远程优先按 GitHub URL 场景验证。
- 报告默认输出中文 Markdown；没有可用 AI 配置时，必须回退到规则版摘要。

## Subagent 分工建议

- `explorer`: 用于阅读仓库结构、定位页面/API/数据模型、确认回归范围。
- `worker`: 用于独立修改单一模块，例如 Git 采集、报告生成、前端表单、测试补齐。
- 多个 worker 并行时必须显式声明负责文件，避免相互覆盖。

## MCP 与 Skills

- 推荐 MCP：GitHub、Playwright、fetch/browser。
- 已内置可用 skills：`openai-docs`、`skill-installer`、`skill-creator`。
- 项目补充 skills 位于 `skills/git-report-workflow` 与 `skills/frontend-qa`。
- 涉及 OpenAI 产品文档时优先使用 `openai-docs`，不要混用非官方来源。

## Git / GitHub 工作流

- 默认分支为 `main`。
- 功能分支统一使用 `codex/<task>` 前缀。
- 不要重置或覆盖不属于当前任务的用户修改。
- 提交前至少通过 `corepack pnpm lint` 与 `corepack pnpm test`。
- 需要推送 GitHub 时优先使用 `gh` 或标准 `git` 非交互命令。
