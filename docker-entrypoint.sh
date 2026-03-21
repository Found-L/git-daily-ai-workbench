#!/bin/sh
set -e

# 确保数据目录存在
mkdir -p /data/db /data/cache /data/runtime

# 初始化/迁移数据库（对已有数据库安全，幂等）
echo "正在初始化数据库..."
node scripts/prisma-db-push.mjs

echo "启动 Git 日报 AI 工作台..."
exec node server.js
