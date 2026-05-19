import { Module } from '@nestjs/common';
import { AnswersModule } from '../answers/answers.module.js';
import { RunsModule } from '../runs/runs.module.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [AnswersModule, SessionsModule, RunsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService]
})
export class ReportsModule {}
