import { Controller, Get, Param } from '@nestjs/common';
import { SessionReportView } from './models/report.models.js';
import { ReportsService } from './reports.service.js';

@Controller('sessions/:sessionId/report')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  getSessionReport(@Param('sessionId') sessionId: string): Promise<SessionReportView> {
    return this.reportsService.getSessionReport(sessionId);
  }
}
