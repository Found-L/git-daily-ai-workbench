# Git 日报 AI 工作台

一个单用户、本地优先的 Git 提交分析工作台。它支持配置本地仓库或远程 Git URL、作者过滤、分支范围、日报/周报/月报生成，并在有 OpenAI-compatible 配置时生成中文 AI Markdown 报告。

## 核心能力

- 项目配置：本地路径或远程仓库 URL、缓存目录、作者名/邮箱、全部分支或指定分支、默认统计周期、时区。
- Git 采集：通过 Git CLI 拉取分支和提交，保存到 SQLite。
- 报告生成：输出结构化统计和 Markdown 日报，支持网页查看与下载。
- AI 汇总：兼容 OpenAI 接口格式，可接自定义 `baseUrl`、`apiKey`、`model`。

## 运行前准备

- 推荐系统已安装 Node.js 22 LTS（或 >= 20.9）和 Git。
- `pnpm` 不要求全局安装，直接使用 `corepack pnpm` 即可。
- `gh` 仅在需要登录 GitHub、创建仓库或推送时才需要。
- `corepack pnpm ...` 这一组基础开发命令是跨平台的，适用于 Windows、macOS 和 Linux。
- `scripts/*.ps1` 是 PowerShell 脚本，只用于 Windows 下的 repo-local 便携工具链，不是 macOS / Linux 的通用入口。

## 快速开始

```sh
corepack pnpm install
corepack pnpm prisma:push
corepack pnpm dev
```

如果你已经在本机启用了 `pnpm`，也可以把上面的 `corepack pnpm` 直接替换成 `pnpm`。

## macOS / Linux

macOS / Linux 默认走系统工具链，不提供 repo-local bootstrap 脚本。只要系统里有 Node.js 22 LTS（或 >= 20.9）、Git，并且 `corepack` 可用，就直接执行上面的命令。

macOS 可参考 Homebrew 方案：

```sh
brew install node git
corepack enable
corepack pnpm install
corepack pnpm prisma:push
corepack pnpm dev
```

如果需要 GitHub CLI，可额外执行 `brew install gh`。
Linux 通常使用发行版包管理器或版本管理器安装 Node.js / Git，安装完成后执行同一套 `corepack pnpm ...` 命令即可。

## 可选：Windows 便携工具链

如果当前机器是 Windows，且没有系统级 Node.js 或 Git，可以使用仓库内的 PowerShell 脚本下载并调用 repo-local 工具链。整个过程只写入当前仓库下的 `.tools`，不依赖固定盘符，也不会要求修改用户级 PATH。

```powershell
.\scripts\bootstrap-tooling.ps1
.\scripts\with-tooling.ps1 pnpm install
.\scripts\with-tooling.ps1 pnpm prisma:push
.\scripts\with-tooling.ps1 pnpm dev
```

其他常见例子：

```powershell
.\scripts\with-tooling.ps1 git --version
.\scripts\with-tooling.ps1 gh auth login
.\scripts\with-tooling.ps1 pnpm test:e2e
```

## 测试与校验

```sh
corepack pnpm lint
corepack pnpm test
corepack pnpm test:e2e
```

`test:e2e` 依赖 Playwright 浏览器，首次运行前可能需要额外执行安装命令。

## 数据与缓存

- SQLite 数据库：`./prisma/dev.db`
- 远程仓库缓存：`./.cache/repos/<projectId>`
- Markdown 导出：通过 API 下载，不强制写入仓库

## GitHub

若需要 GitHub CLI，可使用系统安装的 `gh`。Windows 用户也可以先执行 `.\scripts\bootstrap-tooling.ps1`，再通过 `.\scripts\with-tooling.ps1 gh ...` 调用 repo-local 版本。需要推送 GitHub 时，请先完成 `gh auth login` 或提供可用 token。
