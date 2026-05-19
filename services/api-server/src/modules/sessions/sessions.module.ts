import { Module } from '@nestjs/common';
import { ClassesModule } from '../classes/classes.module.js';
import { QuestionsModule } from '../questions/questions.module.js';
import { SqliteSessionsRepository } from './repositories/sqlite-sessions.repository.js';
import { SessionsController } from './sessions.controller.js';
import { SessionsService } from './sessions.service.js';

@Module({
  imports: [ClassesModule, QuestionsModule],
  controllers: [SessionsController],
  providers: [
    SessionsService,
    {
      provide: 'SessionsRepository',
      useClass: SqliteSessionsRepository
    }
  ],
  exports: [SessionsService]
})
export class SessionsModule {}
