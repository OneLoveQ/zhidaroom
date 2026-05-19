import { Module } from '@nestjs/common';
import { ReportsModule } from '../reports/reports.module.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { MimoClient } from './clients/mimo.client.js';

@Module({
  imports: [ReportsModule],
  controllers: [AiController],
  providers: [AiService, MimoClient]
})
export class AiModule {}
