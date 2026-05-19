import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { BatchAnswersDto } from './dto/batch-answers.dto.js';
import {
  AnswerBatchResult,
  QuestionParticipantView,
  QuestionStatsView,
  SessionLiveStateView
} from './models/answer.models.js';
import { AnswersService } from './answers.service.js';

@Controller('sessions/:sessionId')
export class AnswersController {
  constructor(private readonly answersService: AnswersService) {}

  @Post('answers/batch')
  submitBatch(
    @Param('sessionId') sessionId: string,
    @Body() dto: BatchAnswersDto
  ): Promise<AnswerBatchResult> {
    return this.answersService.submitBatch(sessionId, dto);
  }

  @Get('live-state')
  getLiveState(
    @Param('sessionId') sessionId: string,
    @Query('showRealNames') showRealNames?: string
  ): Promise<SessionLiveStateView> {
    return this.answersService.getLiveState(sessionId, showRealNames === 'true');
  }

  @Get('questions/:questionId/stats')
  getQuestionStats(
    @Param('sessionId') sessionId: string,
    @Param('questionId') questionId: string
  ): Promise<QuestionStatsView> {
    return this.answersService.getQuestionStats(sessionId, questionId);
  }

  @Get('questions/:questionId/participants')
  listQuestionParticipants(
    @Param('sessionId') sessionId: string,
    @Param('questionId') questionId: string,
    @Query('showRealNames') showRealNames?: string
  ): Promise<QuestionParticipantView[]> {
    return this.answersService.listQuestionParticipants(
      sessionId,
      questionId,
      showRealNames === 'true'
    );
  }
}
