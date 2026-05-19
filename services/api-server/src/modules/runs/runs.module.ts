import { Module } from '@nestjs/common';
import { QuestionsModule } from '../questions/questions.module.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { RunsController } from './runs.controller.js';
import { RunsService } from './runs.service.js';
import { SqliteRunsRepository } from './repositories/sqlite-runs.repository.js';

@Module({
  imports: [SessionsModule, QuestionsModule],
  controllers: [RunsController],
  providers: [
    RunsService,
    {
      provide: 'AssessmentRunsRepository',
      useClass: SqliteRunsRepository
    }
  ],
  exports: [RunsService]
})
export class RunsModule {}
