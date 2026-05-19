export type AiQuestionAction = 'text' | 'image' | 'save' | 'manual';

export function thinkingMessage(action: AiQuestionAction): string {
  if (action === 'image') return 'AI 正在阅读图片并生成选择题，通常需要 10 到 30 秒，请稍候。';
  if (action === 'save') return '正在写入题库，请稍候。';
  if (action === 'manual') return '正在校验题目并写入题库。';
  return 'AI 正在根据描述生成标准 ABCD 选择题，通常需要 10 到 30 秒，请稍候。';
}

export function successMessage(action: AiQuestionAction, count = 1): string {
  if (action === 'save') return `已确认入库 ${count} 道题。`;
  if (action === 'manual') return '手动题目已加入题库。';
  return `AI 已生成 ${count} 道候选题，请老师确认后再加入题库。`;
}

export function aiFailureMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes('Failed to fetch') || raw.includes('NetworkError')) {
    return '网络连接失败：请检查当前网络、API 服务或内网穿透是否可访问。';
  }
  if (raw.includes('timeout') || raw.includes('超时')) {
    return 'AI 请求超时：图片或描述可能较复杂，请稍后重试。';
  }
  if (raw.includes('HTTP 401') || raw.includes('Unauthorized') || raw.includes('请先登录')) {
    return '接口鉴权失败：请重新登录后再试。';
  }
  if (raw.includes('HTTP 429')) {
    return 'AI 接口限流：请求过于频繁，请稍后再试。';
  }
  if (raw.includes('HTTP 500') || raw.includes('HTTP 502') || raw.includes('HTTP 503') || raw.includes('HTTP 504')) {
    return `AI 服务或 API 暂时异常：${raw}`;
  }
  return raw || 'AI 生成失败：请稍后重试。';
}
