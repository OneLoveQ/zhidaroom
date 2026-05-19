import { Module } from '@nestjs/common';
import { ClassesModule } from '../classes/classes.module.js';
import { QuestionsModule } from '../questions/questions.module.js';
import { RunsModule } from '../runs/runs.module.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { AnswersController } from './answers.controller.js';
import { AnswersService } from './answers.service.js';
import { SqliteAnswersRepository } from './repositories/sqlite-answers.repository.js';

@Module({
  imports: [ClassesModule, QuestionsModule, SessionsModule, RunsModule],
  controllers: [AnswersController],
  providers: [
    AnswersService,
    {
      provide: 'AnswersRepository',
      useClass: SqliteAnswersRepository
    }
  ],
  exports: [AnswersService]
})
export class AnswersModule {}
