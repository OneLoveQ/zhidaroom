#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

required_dirs=(
  "apps"
  "services"
  "packages"
  "docs"
  "discuss"
  "scripts"
  "logs"
  "deploy"
  "tests"
)

for dir in "${required_dirs[@]}"; do
  if [[ ! -d "${ROOT_DIR}/${dir}" ]]; then
    echo "缺少目录: ${dir}" >&2
    exit 1
  fi
done

echo "项目基础目录检查通过。"

