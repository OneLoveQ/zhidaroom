#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

mkdir -p "${ROOT_DIR}/logs"
npm run dev --prefix "${ROOT_DIR}/apps/web-screen" 2>&1 | tee "${ROOT_DIR}/logs/web-screen.log"
