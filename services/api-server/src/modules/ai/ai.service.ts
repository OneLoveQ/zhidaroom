import {
  BadGatewayException,
  Injectable,
  Optional,
  ServiceUnavailableException
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { SqliteService } from '../../common/sqlite/sqlite.service.js';
import {
  ClassLearningAnalysisView,
  LearningAnalysisRange,
  SessionReportView,
  StudentLearningDetailView
} from '../reports/models/report.models.js';
import { MimoClient } from './clients/mimo.client.js';
import { GenerateQuestionsDto } from './dto/generate-questions.dto.js';
import { RecognizeQuestionImageDto } from './dto/recognize-question-image.dto.js';
import {
  listLearningDiagnosisRecords,
  saveLearningDiagnosis
} from './diagnosis-history.js';
import {
  buildImageQuestionPrompt,
  buildQuestionPrompt,
  buildSessionDiagnosisPrompt
} from './ai-prompts.js';
import {
  buildClassLearningPrompt,
  buildStudentLearningPrompt,
  classFallbackRecommendations,
  runLearningDiagnosis,
  studentFallbackRecommendations
} from './learning-diagnosis.js';
import {
  AiDiagnosisItem,
  AiDiagnosisResult,
  AiGenerationRecord,
  AiLearningDiagnosisRecordView,
  AiLearningDiagnosisResult,
  GeneratedQuestionItem,
  GenerateQuestionsResult,
  RecognizeQuestionImageResult
} from './models/ai.models.js';
import { extractJsonObject } from './utils/json-extractor.js';

@Injectable()
export class AiService {
  private readonly records: AiGenerationRecord[] = [];

  constructor(
    private readonly mimoClient: MimoClient,
    @Optional()
    private readonly sqlite?: SqliteService
  ) {}

  async generateQuestions(
    dto: GenerateQuestionsDto
  ): Promise<GenerateQuestionsResult> {
    const content = await this.mimoClient.complete(buildQuestionPrompt(dto));
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
      buildImageQuestionPrompt(dto),
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
      const content = await this.mimoClient.complete(buildSessionDiagnosisPrompt(report));
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

  async diagnoseClassLearning(
    analysis: ClassLearningAnalysisView,
    range?: LearningAnalysisRange
  ): Promise<AiLearningDiagnosisResult> {
    const result = await runLearningDiagnosis({
      scope: 'class',
      targetId: analysis.classId,
      prompt: buildClassLearningPrompt(analysis),
      fallbackDiagnosis: analysis.aiDiagnosis,
      fallbackRecommendations: classFallbackRecommendations(analysis),
      type: 'class_learning_diagnosis',
      complete: (prompt) => this.mimoClient.complete(prompt),
      createRecord: (...args) => this.createRecord(...args)
    });
    this.saveLearningDiagnosis(result, { classId: analysis.classId, range });
    return result;
  }

  async diagnoseStudentLearning(
    detail: StudentLearningDetailView,
    range?: LearningAnalysisRange
  ): Promise<AiLearningDiagnosisResult> {
    const result = await runLearningDiagnosis({
      scope: 'student',
      targetId: detail.studentId,
      prompt: buildStudentLearningPrompt(detail),
      fallbackDiagnosis: detail.aiDiagnosis,
      fallbackRecommendations: studentFallbackRecommendations(detail),
      type: 'student_learning_diagnosis',
      complete: (prompt) => this.mimoClient.complete(prompt),
      createRecord: (...args) => this.createRecord(...args)
    });
    this.saveLearningDiagnosis(result, {
      classId: detail.classId,
      studentId: detail.studentId,
      range
    });
    return result;
  }

  listRecords(): AiGenerationRecord[] {
    return [...this.records];
  }

  listLearningDiagnosisRecords(
    scope: AiLearningDiagnosisRecordView['scope'],
    targetId: string
  ): AiLearningDiagnosisRecordView[] {
    return listLearningDiagnosisRecords(this.sqlite, scope, targetId);
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

  private saveLearningDiagnosis(
    result: AiLearningDiagnosisResult,
    options: { classId?: string; studentId?: string; range?: LearningAnalysisRange }
  ): void {
    saveLearningDiagnosis(this.sqlite, result, options);
  }
}
