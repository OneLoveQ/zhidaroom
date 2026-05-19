#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-}"

if [ -z "${TARGET_DIR}" ]; then
  echo "用法: $0 <项目目录>" >&2
  exit 1
fi

if [ -f "${TARGET_DIR}/package-lock.json" ]; then
  npm ci --prefix "${TARGET_DIR}"
else
  npm install --prefix "${TARGET_DIR}"
fi
