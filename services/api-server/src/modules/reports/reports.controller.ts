import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ClassLearningAnalysisView,
  LearningAnalysisRange,
  SessionReportView,
  StudentLearningDetailView
} from './models/report.models.js';
import { ReportsService } from './reports.service.js';

@Controller('sessions/:sessionId/report')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  getSessionReport(@Param('sessionId') sessionId: string): Promise<SessionReportView> {
    return this.reportsService.getSessionReport(sessionId);
  }
}

@Controller('reports')
export class LearningReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('classes/:classId/learning')
  getClassLearningAnalysis(
    @Param('classId') classId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('subject') subject?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ): Promise<ClassLearningAnalysisView> {
    return this.reportsService.getClassLearningAnalysis(classId, toRange(from, to, subject, limit, offset));
  }

  @Get('classes/:classId/students/:studentId/learning')
  getStudentLearningAnalysis(
    @Param('classId') classId: string,
    @Param('studentId') studentId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('subject') subject?: string
  ): Promise<StudentLearningDetailView> {
    return this.reportsService.getStudentLearningAnalysis(classId, studentId, toRange(from, to, subject));
  }
}

function toRange(
  from?: string,
  to?: string,
  subject?: string,
  limit?: string,
  offset?: string
): LearningAnalysisRange | undefined {
  const parsedLimit = limit ? Number(limit) : undefined;
  const parsedOffset = offset ? Number(offset) : undefined;
  return from || to || subject || parsedLimit || parsedOffset
    ? {
        from,
        to,
        subject,
        limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
        offset: Number.isFinite(parsedOffset) ? parsedOffset : undefined
      }
    : undefined;
}
