import { BadGatewayException } from '@nestjs/common';

export function extractJsonObject<T>(content: string): T {
  const trimmed = content.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');

  if (start < 0 || end < start) {
    throw new BadGatewayException('AI 输出不是 JSON 对象');
  }

  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as T;
  } catch {
    throw new BadGatewayException('AI 输出 JSON 解析失败');
  }
}

