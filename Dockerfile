# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────
# 阶段 1：依赖安装
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
COPY prisma/ ./prisma/

RUN corepack pnpm install --frozen-lockfile

# ─────────────────────────────────────────────────────────────
# 阶段 2：构建
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .

# 构建时使用占位数据库 URL（实际 URL 在运行时通过环境变量注入）
ENV DATABASE_URL="file:/data/db/workbench.db"
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack pnpm build

# ─────────────────────────────────────────────────────────────
# 阶段 3：正式运行镜像
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# 安装 Git（Git 采集的硬依赖）
RUN apk add --no-cache git

RUN corepack enable

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建持久化目录（实际由 compose 挂载到宿主机）
RUN mkdir -p /data/db /data/cache /data/runtime

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/scripts/prisma-db-push.mjs ./scripts/prisma-db-push.mjs

# 启动脚本：先 db push，再启动 Next.js 服务
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
