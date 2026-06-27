#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

mkdir -p "${ROOT_DIR}/logs"
cd "${ROOT_DIR}/services/api-server"
npm run start
