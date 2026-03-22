# Git 日报 AI 工作台

把 Git 提交历史整理成可读的日报、周报、月报。支持本地仓库与远程 Git URL，AI 配置可选，缺省时自动回退规则版摘要。

---

## 发布与交付方式

这个仓库按 **应用** 交付，不按 **npm 包** 发布。

当前正式支持的交付方式只有以下三种：

1. **源码检出 + 本地启动**：默认方式，适合个人在本机直接运行。
2. **Docker / Compose 自托管**：适合服务器部署、团队共享和可重复运行环境。
3. **GitHub Release**（可选，后续可补）：适合提供版本化说明、发布记录和下载入口。

> `package.json` 当前保持 `private: true`，这表示仓库本身不是 npm 可复用包，而是一个可运行的 Web 工作台应用。

## 运行方式

### 方式一：本地启动（个人使用）

**前提**：系统已安装 [Node.js 22 LTS](https://nodejs.org/) 和 [Git](https://git-scm.com/)。

```sh
# 1. 安装依赖（首次执行）
corepack pnpm install

# 2. 启动工作台（自动构建 + 自动打开浏览器）
pnpm launch
```

启动后浏览器会自动打开工作台首页。

**停止**

```sh
pnpm stop
```

**Windows 用户**：可以直接双击根目录下的 `启动工作台.vbs` 启动，`停止工作台.vbs` 停止，不会弹出命令行窗口。

**数据位置**

| 类型 | 默认路径 |
|---|---|
| 数据库 | `data/db/` |
| 仓库缓存 | `data/cache/` |
| 运行日志 | `data/runtime/` |

所有数据均保存在项目根目录的 `data/` 下，不会上传到任何服务器。

---

### 方式二：Docker 自托管部署（服务器 / 团队共享）

**前提**：服务器已安装 [Docker](https://docs.docker.com/get-docker/) 和 Docker Compose。

```sh
# 1. 进入部署目录（建议固定到服务器某个路径下）
cd /opt/git-daily-ai-workbench    # 或任意你选择的目录

# 2. 拉取或复制项目代码到此目录，然后复制环境变量模板
cp .env.example .env
# 按需修改 .env（PORT、数据目录等，默认值通常够用）

# 3. 一键启动
docker compose up -d
```

服务启动后访问 `http://<服务器IP>:3000`。

**停止 / 重启**

```sh
docker compose down      # 停止（数据不丢失）
docker compose restart   # 重启
```

**升级**

```sh
docker compose down
docker compose build --pull
docker compose up -d
```

数据库、仓库缓存均持久化到宿主机 `./data/` 目录，重建容器不会丢失数据。

**关于本地仓库路径（进阶）**

Docker 部署默认推荐使用远程 Git URL。如需读取宿主机本地仓库，在 `compose.yaml` 的 `volumes` 里取消以下注释并修改路径：

```yaml
- /path/to/your/repos:/repos:ro
```

然后在工作台配置页填写 `/repos/your-repo` 作为本地路径。

---

## 核心功能

- **项目管理**：支持本地路径或远程 Git URL，可配置作者过滤、分支范围、时区、默认报告周期。
- **Git 采集**：通过 Git CLI 拉取提交记录，保存到本地 SQLite。
- **报告生成**：输出结构化统计图表和 Markdown 日报，支持网页查看与下载。
- **AI 汇总**：兼容 OpenAI 接口格式，可配置自定义 `baseUrl`、`apiKey`、`model`；不配置时自动回退规则版摘要。

---

## 环境变量

复制 `.env.example` 为 `.env`，按需修改。常用变量：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `3000` | 服务端口 |
| `DATABASE_URL` | `file:./data/db/workbench.db` | SQLite 路径 |
| `APP_CACHE_ROOT` | `./data/cache` | 仓库缓存目录 |
| `GIT_BINARY` | 自动探测 | 指定 Git 可执行文件路径 |

---

## 常见问题

**启动时提示"未检测到可用的 Git"**  
请先安装系统 Git。Windows 用户也可以运行 `.\scripts\bootstrap-tooling.ps1` 下载便携版工具链，然后改用 `.\scripts\with-tooling.ps1 pnpm launch`。

**端口被占用**  
修改 `.env` 里的 `PORT`，或停止占用该端口的其他程序。

**Docker 容器数据在哪**  
所有持久化数据在宿主机 `./data/` 目录下，与容器生命周期无关。

**如何备份**  
直接备份 `data/db/workbench.db`（本地版路径为 `data/db/workbench.db`）和 `data/cache/`。

---

## 开发说明

```sh
corepack pnpm install    # 安装依赖
corepack pnpm dev        # 开发模式（热更新）
corepack pnpm lint       # 代码检查
corepack pnpm test       # 单元测试
corepack pnpm test:e2e   # E2E 测试（需要先 build）
```

**Windows 便携工具链**（无系统 Node / Git 时）

```powershell
.\scripts\bootstrap-tooling.ps1          # 下载便携工具链（首次）
.\scripts\with-tooling.ps1 pnpm install  # 安装依赖
.\scripts\with-tooling.ps1 pnpm dev      # 开发模式
```

**目录约定**

| 目录 | 内容 |
|---|---|
| `src/app` | Next.js 页面与 API 路由 |
| `src/components` | 交互组件 |
| `src/lib` | Git 采集、报告生成、数据库、工具 |
| `prisma` | SQLite schema |
| `scripts` | 启动脚本、工具链脚本 |
| `tests/e2e` | Playwright 冒烟测试 |
