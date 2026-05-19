import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { ImportQuestionsDto } from './dto/import-questions.dto.js';
import { QuestionView } from './models/question.models.js';
import { QuestionsService } from './questions.service.js';
import { AuthenticatedRequest } from '../../common/auth/auth-request.js';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  createQuestion(@Body() dto: CreateQuestionDto, @Req() request: AuthenticatedRequest): Promise<QuestionView> {
    return this.questionsService.createQuestion(dto, request.auth?.workspaceId, request.auth?.userId);
  }

  @Get()
  listQuestions(@Req() request: AuthenticatedRequest): Promise<QuestionView[]> {
    return this.questionsService.listQuestions(request.auth?.workspaceId);
  }

  @Post('import')
  importQuestions(
    @Body() dto: ImportQuestionsDto,
    @Req() request: AuthenticatedRequest
  ): Promise<{ importedCount: number; items: QuestionView[] }> {
    return this.questionsService.importQuestions(dto, request.auth?.workspaceId, request.auth?.userId);
  }

  @Put(':questionId')
  updateQuestion(
    @Param('questionId') questionId: string,
    @Body() dto: CreateQuestionDto
  ): Promise<QuestionView> {
    return this.questionsService.updateQuestion(questionId, dto);
  }

  @Delete(':questionId')
  deleteQuestion(@Param('questionId') questionId: string): Promise<{ deleted: true }> {
    return this.questionsService.deleteQuestion(questionId);
  }
}
