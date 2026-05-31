#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${ROOT_DIR}/logs"
PID_FILE="${LOG_DIR}/local-dev.pids"

mkdir -p "${LOG_DIR}"
: > "${PID_FILE}"

start_service() {
  local name="$1"
  local port="$2"
  shift 2
  if lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "==> ${name} 端口 ${port} 已被占用，跳过启动"
    return
  fi
  echo "==> 启动 ${name}"
  (
    cd "${ROOT_DIR}"
    bash "$@"
  ) &
  local pid="$!"
  echo "${pid} ${name}" >> "${PID_FILE}"
}

stop_services() {
  if [[ ! -f "${PID_FILE}" ]]; then
    return
  fi
  echo
  echo "==> 正在停止本地服务"
  while read -r pid name; do
    if [[ -n "${pid:-}" ]] && kill -0 "${pid}" 2>/dev/null; then
      echo "停止 ${name} (${pid})"
      kill "${pid}" 2>/dev/null || true
    fi
  done < "${PID_FILE}"
  rm -f "${PID_FILE}"
}

trap stop_services INT TERM EXIT

echo "==> 智答课堂 AI 本地开发环境"
echo "日志目录：${LOG_DIR}"
echo

start_service "API 服务" 3001 "scripts/api/dev.sh"
start_service "官网首页" 5176 "scripts/web/homepage.sh" dev
start_service "教师管理端" 5173 "scripts/web/teacher-dev.sh"
start_service "课堂大屏端" 5174 "scripts/web/screen-dev.sh"
start_service "平台后台" 5175 "scripts/admin-console/run.sh" dev
start_service "手机扫码端" 5177 "scripts/mobile/scanner-dev.sh"

echo
echo "==> 启动命令已发出，稍等几秒后访问："
echo "API 健康检查：http://localhost:3001/api/health"
echo "官网首页：http://localhost:5176/"
echo "教师管理端：http://localhost:5173/teacher/"
echo "课堂大屏端：http://localhost:5174/screen/"
echo "平台后台：http://localhost:5175/admin/"
echo "手机扫码端：http://localhost:5177/scanner/"
echo "测试码页面：http://localhost:5177/scanner/?testCodes"
echo
echo "按 Ctrl+C 可停止全部本地服务。"

wait
