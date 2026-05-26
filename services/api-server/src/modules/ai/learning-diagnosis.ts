import {
  ClassLearningAnalysisView,
  StudentLearningDetailView
} from '../reports/models/report.models.js';
import { AiLearningDiagnosisResult } from './models/ai.models.js';
import { extractJsonObject } from './utils/json-extractor.js';

interface LearningDiagnosisPayload {
  diagnosis: string[];
  recommendations: string[];
}

interface RunLearningDiagnosisOptions {
  scope: AiLearningDiagnosisResult['scope'];
  targetId: string;
  prompt: string;
  fallbackDiagnosis: string[];
  fallbackRecommendations: string[];
  type: AiLearningDiagnosisResult['record']['type'];
  complete: (prompt: string) => Promise<string>;
  createRecord: (
    type: AiLearningDiagnosisResult['record']['type'],
    status: AiLearningDiagnosisResult['record']['status'],
    source: AiLearningDiagnosisResult['record']['source'],
    sessionId?: string
  ) => AiLearningDiagnosisResult['record'];
}

export async function runLearningDiagnosis(
  options: RunLearningDiagnosisOptions
): Promise<AiLearningDiagnosisResult> {
  try {
    const parsed = parseLearningDiagnosis(await options.complete(options.prompt));
    const record = options.createRecord(options.type, 'success', 'model', options.targetId);
    return createRuleLearningDiagnosis(
      options.scope,
      options.targetId,
      parsed.diagnosis,
      parsed.recommendations,
      'model',
      record.createdAt,
      record
    );
  } catch (error) {
    if (!(error instanceof ServiceUnavailableException || error instanceof BadGatewayException)) {
      throw error;
    }
    const record = options.createRecord(options.type, 'fallback', 'rule', options.targetId);
    return createRuleLearningDiagnosis(
      options.scope,
      options.targetId,
      options.fallbackDiagnosis,
      options.fallbackRecommendations,
      'rule',
      record.createdAt,
      record
    );
  }
}

export function buildClassLearningPrompt(analysis: ClassLearningAnalysisView): string {
  const payload = {
    className: analysis.className,
    summary: analysis.summary,
    weakKnowledgePoints: analysis.knowledgePoints.slice(0, 8),
    attentionStudents: analysis.students
      .filter((item) => item.status !== '稳定')
      .slice(0, 10)
      .map((item) => ({
        displayName: item.displayName,
        correctRate: item.correctRate,
        missedCount: item.missedCount,
        weakKnowledgePoints: item.weakKnowledgePoints
      })),
    recentSessions: analysis.recentSessions
  };
  return [
    '你是中小学课堂学情分析专家。',
    '请基于班级累计答题统计，生成给教师课后复盘使用的诊断。',
    '可以使用学生姓名，因为教师端已明确需要原始姓名用于跟进。',
    '必须只输出 JSON，不要输出 Markdown，不要输出解释性前后缀。',
    'JSON 格式为 {"diagnosis":["..."],"recommendations":["..."]}。',
    'diagnosis 输出 3 条以内，聚焦事实和问题。',
    'recommendations 输出 3 条以内，给出下一节课可执行动作。',
    `统计数据：${JSON.stringify(payload)}`
  ].join('\n');
}

export function buildStudentLearningPrompt(detail: StudentLearningDetailView): string {
  const payload = {
    className: detail.className,
    student: {
      displayName: detail.displayName,
      studentNo: detail.studentNo
    },
    summary: detail.summary,
    weakKnowledgePoints: detail.weakKnowledgePoints,
    recentAnswers: detail.recentAnswers.slice(0, 12).map((item) => ({
      stem: item.stem,
      answer: item.answer,
      selectedOption: item.selectedOption,
      answered: item.answered,
      isCorrect: item.isCorrect,
      knowledgePoints: item.knowledgePoints
    }))
  };
  return [
    '你是中小学教师的个性化学情诊断助手。',
    '请基于单个学生的累计答题记录，生成教师可用于个别辅导的诊断。',
    '必须只输出 JSON，不要输出 Markdown，不要输出解释性前后缀。',
    'JSON 格式为 {"diagnosis":["..."],"recommendations":["..."]}。',
    'diagnosis 输出 3 条以内，指出学习表现、主要薄弱点和参与情况。',
    'recommendations 输出 3 条以内，给出可执行的补救建议。',
    `学生数据：${JSON.stringify(payload)}`
  ].join('\n');
}

export function parseLearningDiagnosis(content: string): LearningDiagnosisPayload {
  const parsed = extractJsonObject<LearningDiagnosisPayload>(content);
  return {
    diagnosis: normalizeLines(parsed.diagnosis),
    recommendations: normalizeLines(parsed.recommendations)
  };
}

export function createRuleLearningDiagnosis(
  scope: AiLearningDiagnosisResult['scope'],
  targetId: string,
  lines: string[],
  recommendations: string[],
  source: AiLearningDiagnosisResult['source'],
  generatedAt: string,
  record: AiLearningDiagnosisResult['record']
): AiLearningDiagnosisResult {
  return {
    scope,
    targetId,
    generatedAt,
    source,
    diagnosis: normalizeLines(lines),
    recommendations: normalizeLines(recommendations),
    record,
    notice: 'AI 生成内容，请教师审核后使用。'
  };
}

export function classFallbackRecommendations(analysis: ClassLearningAnalysisView): string[] {
  const weak = analysis.knowledgePoints.filter((item) => item.status !== '掌握较好').slice(0, 3);
  const attention = analysis.students.filter((item) => item.status !== '稳定').slice(0, 5);
  return [
    weak.length ? `下节课先用 5 分钟复盘 ${weak.map((item) => item.name).join('、')}。` : '下节课可安排 1 道迁移题检查稳定性。',
    attention.length ? `优先查看 ${attention.map((item) => item.displayName).join('、')} 的错题明细。` : '保持当前节奏，继续观察最近课堂趋势。',
    '对错误率最高的题目补充一道同知识点变式练习。'
  ];
}

export function studentFallbackRecommendations(detail: StudentLearningDetailView): string[] {
  const weak = detail.weakKnowledgePoints.slice(0, 3);
  return [
    weak.length ? `先针对 ${weak.map((item) => item.name).join('、')} 做 2 道基础订正。` : '继续用课堂小测观察是否稳定掌握。',
    detail.summary.participationRate < 0.7 ? '先确认课堂扫码是否稳定，避免把漏扫误判为不会。' : '请学生口头说明最近错题的解题理由。',
    '下一次课堂结束后对比个人正确率和未答次数变化。'
  ];
}

function normalizeLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 5);
}
import {
  BadGatewayException,
  ServiceUnavailableException
} from '@nestjs/common';
