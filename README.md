# Git 日报 AI 工作台

一个单用户、本地优先的 Git 提交分析工作台。它支持配置本地仓库或远程 Git URL、作者过滤、分支范围、日报/周报/月报生成，并在有 OpenAI-compatible 配置时生成中文 AI Markdown 报告。

## 核心能力

- 项目配置：本地路径或远程仓库 URL、缓存目录、作者名/邮箱、全部分支或指定分支、默认统计周期、时区。
- Git 采集：通过 Git CLI 拉取分支和提交，保存到 SQLite。
- 报告生成：输出结构化统计和 Markdown 日报，支持网页查看与下载。
- AI 汇总：兼容 OpenAI 接口格式，可接自定义 `baseUrl`、`apiKey`、`model`。

## 本地开发

当前环境缺少系统级 Node/Git 时，可先执行 `D:\AI\git-daily-ai-workbench\scripts\bootstrap-tooling.ps1` 下载便携工具，再在 PowerShell 里临时注入 PATH：

```powershell
$env:PATH="D:\AI\git-daily-ai-workbench\.tools\node-v22.14.0-win-x64;D:\AI\git-daily-ai-workbench\.tools\mingit\cmd;D:\AI\git-daily-ai-workbench\.tools\gh\bin;$env:PATH"
$env:COREPACK_HOME="D:\AI\git-daily-ai-workbench\.tools\corepack-home"
```

然后执行：

```powershell
pnpm install
pnpm prisma:push
pnpm dev
```

## 测试与校验

```powershell
pnpm lint
pnpm test
pnpm test:e2e
```

`test:e2e` 依赖 Playwright 浏览器，首次运行前可能需要额外执行安装命令。

## 数据与缓存

- SQLite 数据库：`D:\AI\git-daily-ai-workbench\prisma\dev.db`
- 远程仓库缓存：`D:\AI\git-daily-ai-workbench\.cache\repos\<projectId>`
- Markdown 导出：通过 API 下载，不强制写入仓库

## GitHub

项目预置了 GitHub CLI 便携版 `D:\AI\git-daily-ai-workbench\.tools\gh\bin\gh.exe`。若要创建私有仓库并推送，请先完成 `gh auth login` 或提供可用 token。
