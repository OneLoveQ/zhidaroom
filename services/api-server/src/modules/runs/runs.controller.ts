import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateRunDto } from './dto/create-run.dto.js';
import { AssessmentRunView } from './models/run.models.js';
import { RunsService } from './runs.service.js';

@Controller('sessions/:sessionId/runs')
export class RunsController {
  constructor(private readonly runsService: RunsService) {}

  @Post()
  createRun(@Param('sessionId') sessionId: string, @Body() dto: CreateRunDto): Promise<AssessmentRunView> {
    return this.runsService.createRun(sessionId, dto);
  }

  @Get()
  listRuns(@Param('sessionId') sessionId: string): Promise<AssessmentRunView[]> {
    return this.runsService.listRuns(sessionId);
  }

  @Post(':runId/start')
  startRun(@Param('sessionId') sessionId: string, @Param('runId') runId: string): Promise<AssessmentRunView> {
    return this.runsService.startRun(sessionId, runId);
  }

  @Post(':runId/complete')
  completeRun(@Param('sessionId') sessionId: string, @Param('runId') runId: string): Promise<AssessmentRunView> {
    return this.runsService.completeRun(sessionId, runId);
  }

  @Post(':runId/questions/:questionId/current')
  setCurrentQuestion(
    @Param('runId') runId: string,
    @Param('questionId') questionId: string
  ): Promise<AssessmentRunView> {
    return this.runsService.setCurrentQuestion(runId, questionId);
  }
}
