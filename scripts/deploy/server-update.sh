#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/zhidaroom}"
NODE_BIN_DIR="${NODE_BIN_DIR:-/www/server/nodejs/v22.22.3/bin}"
API_PM2_NAME="${API_PM2_NAME:-api_server}"

if [ ! -d "${APP_DIR}/.git" ]; then
  echo "未找到 Git 仓库目录: ${APP_DIR}" >&2
  exit 1
fi

if [ -d "${NODE_BIN_DIR}" ]; then
  export PATH="${NODE_BIN_DIR}:${PATH}"
fi

cd "${APP_DIR}"
mkdir -p logs data

ensure_executable_permissions() {
  find scripts -name '*.sh' -type f -exec chmod +x {} \;
  find apps services -path '*/node_modules/.bin/*' -exec chmod +x {} \; 2>/dev/null || true
  find apps services -path '*/node_modules/*/bin/*' -type f -exec chmod +x {} \; 2>/dev/null || true
}

echo "==> 备份 SQLite 数据库"
if [ -f data/zhida.dev.db ]; then
  mkdir -p data/backups
  cp data/zhida.dev.db "data/backups/zhida.dev.$(date +%Y%m%d%H%M%S).db"
fi

echo "==> 拉取最新代码"
git pull --ff-only

echo "==> 安装依赖"
ensure_executable_permissions
./scripts/api/install.sh
./scripts/web/teacher-install.sh
./scripts/web/screen-install.sh
./scripts/mobile/scanner-install.sh

echo "==> 构建服务与前端"
ensure_executable_permissions
./scripts/api/build.sh
./scripts/web/teacher-build.sh
./scripts/web/screen-build.sh
./scripts/mobile/scanner-build.sh

echo "==> 重启 API"
if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe "${API_PM2_NAME}" >/dev/null 2>&1; then
    pm2 restart "${API_PM2_NAME}"
  else
    echo "未找到 PM2 项目 ${API_PM2_NAME}，请在宝塔 Node 项目中重启 API。"
  fi
else
  echo "当前 PATH 中没有 pm2，请在宝塔 Node 项目中重启 API。"
fi

echo "==> 更新完成"
