import { Module } from '@nestjs/common';
import { AnswersModule } from '../answers/answers.module.js';
import { ClassesModule } from '../classes/classes.module.js';
import { RunsModule } from '../runs/runs.module.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import {
  LearningReportsController,
  ReportsController
} from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [AnswersModule, ClassesModule, SessionsModule, RunsModule],
  controllers: [ReportsController, LearningReportsController],
  providers: [ReportsService],
  exports: [ReportsService]
})
export class ReportsModule {}
