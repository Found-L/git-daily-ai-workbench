# 发布与升级策略

本文档定义 `git-daily-ai-workbench` 的正式交付方式、版本发布约定，以及升级与回滚的最小操作流程。

## 1. 正式交付方式

本仓库按 **应用** 交付，不按 **npm 包** 发布。

当前正式支持的交付方式如下：

1. **源码检出 + 本地启动**
   - 面向个人用户
   - 使用仓库源码、`pnpm launch` 和本地数据目录运行
2. **Docker / Compose 自托管**
   - 面向服务器部署或团队共享
   - 默认在仓库目录内执行 `docker compose up -d`
3. **GitHub Release**
   - 作为版本记录和发布说明入口
   - 用于表达“哪个提交/标签是一版正式可用版本”
   - 不承诺提供桌面安装包，也不替代 Docker 或源码启动

## 2. 当前不做的发布方式

- **npm 包发布**：仓库是私有 Web 应用，不是复用型库。
- **公共镜像仓库强依赖**：当前允许本地 build，不要求必须推送 Docker Hub / GHCR。
- **桌面客户端安装包**：不在当前发布范围。

## 3. GitHub Release 约定

若启用正式版本发布，建议遵循以下最小约定：

- 使用语义化版本号，例如 `v0.2.0`
- 每个 Release 至少包含：
  - 版本摘要
  - 主要变更
  - 升级步骤
  - 如有破坏性变更，必须单独标注
- Release 对应一个 Git tag，并指向 `main` 上已验证通过的提交

## 4. Docker 分发策略

当前 Docker 策略如下：

- **默认方式**：在仓库目录内本地构建并启动
  - `docker compose up -d --build`
- **镜像标签策略**：暂不强制；只有在引入镜像仓库后再定义 `latest` / 版本标签规则
- **镜像仓库推送**：暂不纳入当前范围

这意味着当前优先保证：

- 仓库内 `Dockerfile` 和 `compose.yaml` 可直接使用
- 用户不依赖外部镜像仓库也能部署
- 版本管理以 Git tag / GitHub Release 为主，而不是镜像 tag 为主

## 5. 升级流程

### 源码启动模式

1. 备份 `data/db/workbench.db` 与 `data/cache/`
2. 拉取最新代码：`git pull`
3. 安装依赖：`corepack pnpm install`
4. 重新启动：`pnpm launch`

### Docker / Compose 模式

1. 备份 `data/db/workbench.db` 与 `data/cache/`
2. 拉取最新代码：`git pull`
3. 重新构建并启动：`docker compose up -d --build`

## 6. 回滚流程

### 源码启动模式

1. 切回上一个稳定 tag 或 commit
2. 如有必要，恢复备份的 `data/db/workbench.db` 与 `data/cache/`
3. 重新执行 `corepack pnpm install`
4. 启动：`pnpm launch`

### Docker / Compose 模式

1. 切回上一个稳定 tag 或 commit
2. 执行 `docker compose up -d --build`
3. 如有必要，恢复备份的 `data/db/workbench.db` 与 `data/cache/`

## 7. 何时再扩展范围

只有出现以下需求时，才建议继续扩展发布体系：

- 需要固定版本镜像并跨机器复用
- 需要自动生成 GitHub Release
- 需要把 Docker 镜像推送到 GHCR / Docker Hub
- 需要给非技术用户提供安装包级别的分发方式
