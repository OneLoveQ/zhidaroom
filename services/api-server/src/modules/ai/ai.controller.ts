import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ReportsService } from '../reports/reports.service.js';
import { AiService } from './ai.service.js';
import { GenerateQuestionsDto } from './dto/generate-questions.dto.js';
import { RecognizeQuestionImageDto } from './dto/recognize-question-image.dto.js';
import {
  AiDiagnosisResult,
  AiGenerationRecord,
  AiLearningDiagnosisRecordView,
  AiLearningDiagnosisResult,
  GenerateQuestionsResult,
  RecognizeQuestionImageResult
} from './models/ai.models.js';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly reportsService: ReportsService
  ) {}

  @Post('questions/generate')
  generateQuestions(
    @Body() dto: GenerateQuestionsDto
  ): Promise<GenerateQuestionsResult> {
    return this.aiService.generateQuestions(dto);
  }

  @Post('questions/recognize-image')
  recognizeQuestionImage(
    @Body() dto: RecognizeQuestionImageDto
  ): Promise<RecognizeQuestionImageResult> {
    return this.aiService.recognizeQuestionImage(dto);
  }

  @Post('sessions/:sessionId/diagnose')
  diagnoseSession(
    @Param('sessionId') sessionId: string
  ): Promise<AiDiagnosisResult> {
    return this.reportsService
      .getSessionReport(sessionId)
      .then((report) => this.aiService.diagnoseSessionReport(report));
  }

  @Post('reports/classes/:classId/diagnose')
  diagnoseClassLearning(
    @Param('classId') classId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('subject') subject?: string
  ): Promise<AiLearningDiagnosisResult> {
    return this.reportsService
      .getClassLearningAnalysis(classId, toRange(from, to, subject))
      .then((analysis) => this.aiService.diagnoseClassLearning(analysis, toRange(from, to, subject)));
  }

  @Post('reports/classes/:classId/students/:studentId/diagnose')
  diagnoseStudentLearning(
    @Param('classId') classId: string,
    @Param('studentId') studentId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('subject') subject?: string
  ): Promise<AiLearningDiagnosisResult> {
    return this.reportsService
      .getStudentLearningAnalysis(classId, studentId, toRange(from, to, subject))
      .then((detail) => this.aiService.diagnoseStudentLearning(detail, toRange(from, to, subject)));
  }

  @Get('reports/classes/:classId/diagnoses')
  listClassLearningHistory(
    @Param('classId') classId: string
  ): AiLearningDiagnosisRecordView[] {
    return this.aiService.listLearningDiagnosisRecords('class', classId);
  }

  @Get('reports/classes/:classId/students/:studentId/diagnoses')
  listStudentLearningHistory(
    @Param('studentId') studentId: string
  ): AiLearningDiagnosisRecordView[] {
    return this.aiService.listLearningDiagnosisRecords('student', studentId);
  }

  @Get('records')
  listRecords(): AiGenerationRecord[] {
    return this.aiService.listRecords();
  }
}

function toRange(
  from?: string,
  to?: string,
  subject?: string
): { from?: string; to?: string; subject?: string } | undefined {
  return from || to || subject ? { from, to, subject } : undefined;
}
