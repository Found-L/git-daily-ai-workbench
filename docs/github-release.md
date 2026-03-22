# GitHub Release 操作说明

本文档定义 `git-daily-ai-workbench` 的手动 GitHub Release 流程，用于在不引入自动化流水线的前提下，稳定产出版本记录与发布说明。

## 1. 适用范围

适用于以下场景：

- `main` 上已经合入一批可用变更
- 已完成基础验证（至少 `lint`、`test`、`build`）
- 需要给当前版本打 tag，并在 GitHub 上形成正式发布记录

当前 GitHub Release 的定位是：

- 作为**版本记录入口**
- 提供**发布说明、升级提示、回滚参考**
- 提供源码快照下载

它**不是**：

- npm 包发布
- Docker 镜像自动发布
- 桌面安装包分发

## 2. 发布前检查

在创建 Release 前，建议确认以下事项：

1. 工作区干净：`git status --short`
2. 当前分支为 `main`
3. 已拉到最新远端：`git pull --ff-only`
4. 通过验证：
   - `corepack pnpm lint`
   - `corepack pnpm test`
   - `corepack pnpm build`
5. README / `docs/release.md` 中没有与当前版本冲突的说明

## 3. 版本号约定

建议使用语义化版本号：

- `v0.1.0`：首次正式可用版本
- `v0.1.1`：文档、修复、小范围改进
- `v0.2.0`：包含明显能力扩展或交付方式变化

如果版本尚未稳定，可以继续使用 `0.x.y` 阶段，不必提前进入 `1.0.0`。

## 4. Tag 创建流程

在本地执行：

```sh
git checkout main
git pull --ff-only
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

说明：

- 使用带注释的 tag（`-a`）
- tag 必须指向已经验证通过的 `main` 提交
- 如发现 tag 有误，先停止继续创建 Release，确认修正策略后再处理

## 5. GitHub Release 创建流程

### 方式一：GitHub 网页

1. 打开仓库 Releases 页面
2. 选择 **Draft a new release**
3. 选择已推送的 tag，例如 `v0.1.0`
4. 填写标题，例如：`v0.1.0`
5. 填写发布说明
6. 确认后点击发布

### 方式二：GitHub CLI

```sh
gh release create v0.1.0 \
  --title "v0.1.0" \
  --notes-file docs/release-notes/v0.1.0.md
```

如果暂时没有单独的 release notes 文件，也可以先用 `--notes` 直接写摘要。

## 6. 发布说明模板

建议至少包含以下结构：

```md
## Summary
- 本版本主要做了什么
- 对用户最重要的变化是什么

## Upgrade
- 源码启动用户如何升级
- Docker 用户如何升级

## Notes
- 是否有破坏性变更
- 是否有已知限制
```

## 7. 发布后检查

发布完成后，建议确认：

1. Tag 已存在于远端
2. Release 页面可见
3. 版本标题、摘要、升级说明没有明显错误
4. 如果本次版本需要额外提醒，README 或相关文档已同步

## 8. 当前不纳入本流程的内容

以下内容暂不属于当前 GitHub Release 流程：

- 自动生成 changelog
- 自动发布 Docker 镜像到 GHCR / Docker Hub
- 自动附加二进制文件或安装包
- 基于 GitHub Actions 的一键发版流水线
