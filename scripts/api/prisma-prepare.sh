#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
API_DIR="${ROOT_DIR}/services/api-server"
ENGINES_DIR="${API_DIR}/node_modules/@prisma/engines"

os_name="$(uname -s)"
arch_name="$(uname -m)"

if [[ "${os_name}" != "Darwin" || "${arch_name}" != "arm64" ]]; then
  exit 0
fi

schema_engine="${ENGINES_DIR}/schema-engine-darwin-arm64"

if [[ -x "${schema_engine}" ]]; then
  exit 0
fi

engine_version="$(
  node -e "console.log(require('${API_DIR}/node_modules/@prisma/engines-version').enginesVersion)"
)"

mkdir -p "${ENGINES_DIR}" /private/tmp/zhida-prisma-engine

echo "准备 Prisma schema engine: ${engine_version}"
curl -k -L \
  "https://binaries.prisma.sh/all_commits/${engine_version}/darwin-arm64/schema-engine.gz" \
  -o /private/tmp/zhida-prisma-engine/schema-engine.gz

gunzip -f /private/tmp/zhida-prisma-engine/schema-engine.gz
cp /private/tmp/zhida-prisma-engine/schema-engine "${schema_engine}"
chmod +x "${schema_engine}"

