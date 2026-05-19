#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

mkdir -p "${ROOT_DIR}/data"
export DATABASE_URL="${DATABASE_URL:-file:../../../data/zhida.dev.db}"

"${ROOT_DIR}/scripts/api/prisma-prepare.sh"
cd "${ROOT_DIR}/services/api-server"
npm exec -- prisma db push
