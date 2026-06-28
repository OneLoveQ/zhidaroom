#!/usr/bin/env bash
set -euo pipefail

API_BASE="${MIMO_API_BASE:-https://token-plan-cn.xiaomimimo.com/v1}"
MODEL="${MIMO_MODEL:-mimo-v2.5-pro}"

if [[ -z "${MIMO_API_KEY:-}" ]]; then
  echo "请先设置 MIMO_API_KEY 环境变量。"
  exit 1
fi

node --input-type=module <<'NODE'
import { request } from 'node:https';
import { URL } from 'node:url';

const apiBase = process.env.MIMO_API_BASE ?? 'https://token-plan-cn.xiaomimimo.com/v1';
const apiKey = process.env.MIMO_API_KEY;
const model = process.env.MIMO_MODEL ?? 'mimo-v2.5-pro';
const allowInsecureTls = process.env.MIMO_ALLOW_INSECURE_TLS === 'true';

function post(path, payload) {
  const url = new URL(`${apiBase}${path}`);
  const body = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: url.hostname,
        port: url.port ? Number(url.port) : 443,
        path: `${url.pathname}${url.search}`,
        method: 'POST',
        rejectUnauthorized: !allowInsecureTls,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          try {
            resolve({ status: res.statusCode, data: JSON.parse(text) });
          } catch {
            reject(new Error(`响应无法解析：${res.statusCode} ${text.slice(0, 120)}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const textResult = await post('/chat/completions', {
    model,
    messages: [
      { role: 'system', content: '只输出 JSON。' },
      { role: 'user', content: '输出 {"ok":true,"model":"当前模型"}' }
    ],
    response_format: { type: 'json_object' }
  });

  const imageDataUrl =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
  const visionResult = await post('/chat/completions', {
    model,
    messages: [
      { role: 'system', content: '只输出 JSON。' },
      {
        role: 'user',
        content: [
          { type: 'text', text: '判断是否收到图片，输出 {"hasImage":true}' },
          { type: 'image_url', image_url: { url: imageDataUrl } }
        ]
      }
    ],
    response_format: { type: 'json_object' }
  });

  console.log(JSON.stringify({
    textStatus: textResult.status,
    textContent: textResult.data.choices?.[0]?.message?.content ?? textResult.data.error,
    visionStatus: visionResult.status,
    visionContent: visionResult.data.choices?.[0]?.message?.content ?? visionResult.data.error
  }, null, 2));
}

await main();
NODE
