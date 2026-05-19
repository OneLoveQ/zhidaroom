import { Module } from '@nestjs/common';
import { QuestionsController } from './questions.controller.js';
import { QuestionsService } from './questions.service.js';
import { SqliteQuestionsRepository } from './repositories/sqlite-questions.repository.js';

@Module({
  controllers: [QuestionsController],
  providers: [
    QuestionsService,
    {
      provide: 'QuestionsRepository',
      useClass: SqliteQuestionsRepository
    }
  ],
  exports: [QuestionsService]
})
export class QuestionsModule {}
