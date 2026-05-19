import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ReportsService } from '../reports/reports.service.js';
import { AiService } from './ai.service.js';
import { GenerateQuestionsDto } from './dto/generate-questions.dto.js';
import { RecognizeQuestionImageDto } from './dto/recognize-question-image.dto.js';
import {
  AiDiagnosisResult,
  AiGenerationRecord,
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

  @Get('records')
  listRecords(): AiGenerationRecord[] {
    return this.aiService.listRecords();
  }
}
