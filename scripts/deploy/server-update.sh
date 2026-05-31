#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/zhidaroom}"
NODE_BIN_DIR="${NODE_BIN_DIR:-/www/server/nodejs/v22.22.3/bin}"
API_PM2_NAME="${API_PM2_NAME:-api_server}"
BT_NODE_SCRIPT="${BT_NODE_SCRIPT:-/www/server/nodejs/vhost/scripts/api_server.sh}"
BT_NODE_PID_FILE="${BT_NODE_PID_FILE:-/www/server/nodejs/vhost/pids/api_server.pid}"

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
./scripts/web/homepage.sh install
./scripts/web/teacher-install.sh
./scripts/web/screen-install.sh
./scripts/mobile/scanner-install.sh
./scripts/admin-console/run.sh install

echo "==> 构建服务与前端"
ensure_executable_permissions
./scripts/api/build.sh
./scripts/web/homepage.sh build
./scripts/web/teacher-build.sh
./scripts/web/screen-build.sh
./scripts/mobile/scanner-build.sh
./scripts/admin-console/run.sh build

echo "==> 重启 API"
if [ -f "${BT_NODE_SCRIPT}" ]; then
  if [ -f "${BT_NODE_PID_FILE}" ]; then
    kill "$(cat "${BT_NODE_PID_FILE}")" 2>/dev/null || true
  fi
  bash "${BT_NODE_SCRIPT}"
elif command -v pm2 >/dev/null 2>&1; then
  if pm2 describe "${API_PM2_NAME}" >/dev/null 2>&1; then
    pm2 restart "${API_PM2_NAME}"
  else
    echo "未找到 PM2 项目 ${API_PM2_NAME}，请在宝塔 Node 项目中重启 API。"
  fi
else
  echo "当前 PATH 中没有 pm2，请在宝塔 Node 项目中重启 API。"
fi

echo "==> 更新完成"
