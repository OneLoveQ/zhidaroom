import { Module } from '@nestjs/common';
import { SessionsModule } from '../sessions/sessions.module.js';
import { DisplaysController } from './displays.controller.js';
import { DisplaysService } from './displays.service.js';
import { SqliteDisplayPairingsRepository } from './sqlite-display-pairings.repository.js';

@Module({
  imports: [SessionsModule],
  controllers: [DisplaysController],
  providers: [
    DisplaysService,
    {
      provide: 'DisplayPairingsRepository',
      useClass: SqliteDisplayPairingsRepository
    }
  ]
})
export class DisplaysModule {}
