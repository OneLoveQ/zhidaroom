import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { SessionReportView } from '../reports/models/report.models.js';
import { MimoClient } from './clients/mimo.client.js';
import { GenerateQuestionsDto } from './dto/generate-questions.dto.js';
import { RecognizeQuestionImageDto } from './dto/recognize-question-image.dto.js';
import {
  AiDiagnosisItem,
  AiDiagnosisResult,
  AiGenerationRecord,
  GeneratedQuestionItem,
  GenerateQuestionsResult,
  RecognizeQuestionImageResult
} from './models/ai.models.js';
import { extractJsonObject } from './utils/json-extractor.js';

@Injectable()
export class AiService {
  private readonly records: AiGenerationRecord[] = [];

  constructor(private readonly mimoClient: MimoClient) {}

  async generateQuestions(
    dto: GenerateQuestionsDto
  ): Promise<GenerateQuestionsResult> {
    const content = await this.mimoClient.complete(this.buildPrompt(dto));
    const parsed = extractJsonObject<{ items: GeneratedQuestionItem[] }>(content);

    if (!Array.isArray(parsed.items)) {
      throw new BadGatewayException('AI 输出格式不符合题目生成要求');
    }
    const items = parsed.items.map((item) => this.normalizeGeneratedQuestion(item));

    return {
      items: items.map((item) => ({
        ...item,
        aiGenerated: true,
        reviewStatus: 'pending'
      })),
      record: this.createRecord('question_generation', 'success', 'model'),
      notice: 'AI 生成内容，请教师审核后使用。'
    };
  }

  async recognizeQuestionImage(
    dto: RecognizeQuestionImageDto
  ): Promise<RecognizeQuestionImageResult> {
    const content = await this.mimoClient.completeVision(
      this.buildImageQuestionPrompt(dto),
      dto.imageDataUrl
    );
    const parsed = extractJsonObject<{ item?: GeneratedQuestionItem; items?: GeneratedQuestionItem[] }>(content);

    const rawItems = parsed.items?.length ? parsed.items : parsed.item ? [parsed.item] : [];
    const items = rawItems.map((item) => this.normalizeGeneratedQuestion(item));
    if (!items.length) {
      throw new BadGatewayException('AI 输出格式不符合题目生成要求');
    }

    return {
      item: {
        ...items[0],
        aiGenerated: true,
        reviewStatus: 'pending'
      },
      items: items.map((item) => ({ ...item, aiGenerated: true, reviewStatus: 'pending' })),
      record: this.createRecord('question_image_recognition', 'success', 'model'),
      notice: 'AI 识别内容，请教师审核后使用。'
    };
  }

  async diagnoseSessionReport(report: SessionReportView): Promise<AiDiagnosisResult> {
    try {
      const content = await this.mimoClient.complete(this.buildDiagnosisPrompt(report));
      const parsed = extractJsonObject<{ items: AiDiagnosisItem[] }>(content);
      if (!Array.isArray(parsed.items)) {
        throw new BadGatewayException('AI 输出格式不符合课堂诊断要求');
      }
      const record = this.createRecord('session_diagnosis', 'success', 'model', report.sessionId);
      return this.createDiagnosisResult(report.sessionId, parsed.items, record, 'model');
    } catch (error) {
      if (!(error instanceof ServiceUnavailableException || error instanceof BadGatewayException)) {
        throw error;
      }
      const record = this.createRecord('session_diagnosis', 'fallback', 'rule', report.sessionId);
      return this.createDiagnosisResult(
        report.sessionId,
        this.createRuleDiagnosis(report),
        record,
        'rule'
      );
    }
  }

  listRecords(): AiGenerationRecord[] {
    return [...this.records];
  }

  private buildPrompt(dto: GenerateQuestionsDto): string {
    return [
      '你是中小学学科教研专家和 AI 教学助手。',
      '请根据教师输入生成适合纸质答题卡作答的课堂检测题，题目必须是标准 ABCD 单选题。',
      '必须只输出 JSON，不要输出 Markdown，不要输出解释性前后缀。',
      'JSON 格式为 {"items":[...]}。',
      '每道题必须包含 stem、options、answer、explanation、knowledgePoints、difficulty、commonMistakes。',
      'options 必须包含 A、B、C、D 四个字段。',
      'answer 必须是 A、B、C、D 之一。',
      '题目不得超纲，不得有歧义，答案必须唯一。',
      '四个选项必须互斥，不要使用“以上都对”“以上都不对”“无法判断”等模糊选项。',
      '解析必须说明正确答案为什么正确，并简要指出其他选项的问题。',
      `学科：${dto.subject}`,
      `年级：${dto.grade}`,
      `教材版本：${dto.textbookVersion ?? '未指定'}`,
      `知识点：${dto.knowledgePoint}`,
      `教师描述：${dto.description ?? '未提供'}`,
      `题目数量：${dto.count}`,
      `难度：${dto.difficulty}`,
      `题型：${dto.questionType}`
    ].join('\n');
  }

  private buildImageQuestionPrompt(dto: RecognizeQuestionImageDto): string {
    return [
      '请读取图片内容，并生成适合纸质答题卡采集的标准 ABCD 单选题。',
      '图片可能是选择题，也可能是课本文字、知识点、板书、练习题或一段说明。',
      '必须只输出 JSON，不要输出 Markdown，不要输出解释性前后缀。',
      'JSON 格式为 {"items":[...]}。',
      '每个 item 必须包含 stem、options、answer、explanation、knowledgePoints、difficulty、commonMistakes。',
      'options 必须包含 A、B、C、D 四个非空字段。',
      'answer 必须是 A、B、C、D 之一，且答案唯一。',
      '如果图片本身是选择题，先识别原题，再整理或改写为标准 ABCD 单选题。',
      '如果图片不是选择题，请提炼核心知识点，并围绕该知识点生成选择题。',
      '不要使用“以上都对”“以上都不对”“无法判断”等模糊选项。',
      '题干必须完整描述问题，不能依赖“如图所示”。',
      `学科：${dto.subject}`,
      `年级：${dto.grade}`,
      `题目数量：${dto.count ?? 1}`,
      `难度：${dto.difficulty ?? '基础'}`,
      `教师补充要求：${dto.instruction ?? '未提供'}`
    ].join('\n');
  }

  private normalizeGeneratedQuestion(item: GeneratedQuestionItem): GeneratedQuestionItem {
    const normalized: GeneratedQuestionItem = {
      ...item,
      stem: item.stem?.trim(),
      options: {
        A: item.options?.A?.trim(),
        B: item.options?.B?.trim(),
        C: item.options?.C?.trim(),
        D: item.options?.D?.trim()
      },
      explanation: item.explanation?.trim(),
      knowledgePoints: (item.knowledgePoints ?? []).map((value) => value.trim()).filter(Boolean),
      difficulty: ['基础', '巩固', '提升'].includes(item.difficulty) ? item.difficulty : '基础',
      commonMistakes: (item.commonMistakes ?? []).map((value) => value.trim()).filter(Boolean)
    };
    this.validateGeneratedQuestion(normalized);
    return normalized;
  }

  private validateGeneratedQuestion(item: GeneratedQuestionItem): void {
    if (!item?.stem || !item.explanation || !item.knowledgePoints?.length) {
      throw new BadGatewayException('AI 输出缺少题干、解析或知识点');
    }
    if (!item.options?.A || !item.options.B || !item.options.C || !item.options.D) {
      throw new BadGatewayException('AI 输出缺少 ABCD 选项');
    }
    if (!['A', 'B', 'C', 'D'].includes(item.answer)) {
      throw new BadGatewayException('AI 输出答案不是 A/B/C/D');
    }
  }

  private buildDiagnosisPrompt(report: SessionReportView): string {
    const payload = report.questions.map((item) => ({
      questionId: item.questionId,
      knowledgePoints: item.knowledgePoints,
      difficulty: item.difficulty,
      answer: item.answer,
      stats: item.stats
    }));
    return [
      '你是中小学课堂形成性评价专家。',
      '请基于匿名聚合答题统计生成课堂错因诊断。',
      '不得输出学生姓名、学号、卡号或任何个人身份信息。',
      '必须只输出 JSON，不要输出 Markdown，不要输出解释性前后缀。',
      'JSON 格式为 {"items":[...]}。',
      '每个 item 必须包含 questionId、riskLevel、mainMisconception、evidence、teachingSuggestion、followUpAction。',
      'riskLevel 只能是 low、medium、high。',
      `课堂标题：${report.title}`,
      `统计数据：${JSON.stringify(payload)}`
    ].join('\n');
  }

  private createRuleDiagnosis(report: SessionReportView): AiDiagnosisItem[] {
    return report.questions.map((item) => ({
      questionId: item.questionId,
      riskLevel: this.getRiskLevel(item.stats.correctRate),
      mainMisconception: item.misconception,
      evidence: item.evidence,
      teachingSuggestion: item.teachingSuggestion,
      followUpAction: item.followUpAction
    }));
  }

  private getRiskLevel(correctRate: number): AiDiagnosisItem['riskLevel'] {
    if (correctRate >= 0.8) {
      return 'low';
    }
    if (correctRate >= 0.5) {
      return 'medium';
    }
    return 'high';
  }

  private createRecord(
    type: AiGenerationRecord['type'],
    status: AiGenerationRecord['status'],
    source: AiGenerationRecord['source'],
    sessionId?: string
  ): AiGenerationRecord {
    const record: AiGenerationRecord = {
      id: randomUUID(),
      type,
      sessionId,
      status,
      source,
      createdAt: new Date().toISOString()
    };
    this.records.push(record);
    return record;
  }

  private createDiagnosisResult(
    sessionId: string,
    items: AiDiagnosisItem[],
    record: AiGenerationRecord,
    source: AiDiagnosisResult['source']
  ): AiDiagnosisResult {
    return {
      sessionId,
      generatedAt: record.createdAt,
      source,
      items,
      record,
      notice: 'AI 生成内容，请教师审核后使用。'
    };
  }
}
