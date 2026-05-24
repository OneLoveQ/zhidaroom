#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

mkdir -p "${ROOT_DIR}/logs"
npm run dev --prefix "${ROOT_DIR}/services/api-server" 2>&1 | tee "${ROOT_DIR}/logs/api-server.log"
