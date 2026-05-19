import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module.js';
import { ClassesModule } from './modules/classes/classes.module.js';
import { QuestionsModule } from './modules/questions/questions.module.js';
import { SessionsModule } from './modules/sessions/sessions.module.js';
import { AnswersModule } from './modules/answers/answers.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { AiModule } from './modules/ai/ai.module.js';
import { SqliteModule } from './common/sqlite/sqlite.module.js';
import { DisplaysModule } from './modules/displays/displays.module.js';
import { RunsModule } from './modules/runs/runs.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AdminModule } from './modules/admin/admin.module.js';

@Module({
  imports: [
    HealthModule,
    AuthModule,
    ClassesModule,
    QuestionsModule,
    SessionsModule,
    RunsModule,
    AnswersModule,
    ReportsModule,
    AdminModule,
    AiModule,
    DisplaysModule,
    SqliteModule
  ]
})
export class AppModule {}
