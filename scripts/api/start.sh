#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

mkdir -p "${ROOT_DIR}/logs"
API_PORT="${API_PORT:-3001}" npm run start --prefix "${ROOT_DIR}/services/api-server"

