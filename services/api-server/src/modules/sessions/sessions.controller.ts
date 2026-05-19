import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { CreateSessionDto } from './dto/create-session.dto.js';
import { UpdateSessionStageDto } from './dto/update-session-stage.dto.js';
import { SessionDetailView, SessionView } from './models/session.models.js';
import { SessionsService } from './sessions.service.js';
import { AuthenticatedRequest } from '../../common/auth/auth-request.js';

interface SessionBindingView {
  sessionId: string;
  classroomCode?: string;
  bindToken: string;
  mobileBindUrl: string;
}

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  createSession(@Body() dto: CreateSessionDto, @Req() request: AuthenticatedRequest): Promise<SessionDetailView> {
    return this.sessionsService.createSession(dto, request.auth?.workspaceId, request.auth?.userId);
  }

  @Get()
  listSessions(): Promise<SessionView[]> {
    return this.sessionsService.listSessions();
  }

  @Get('by-code/:classroomCode')
  getSessionByClassroomCode(
    @Param('classroomCode') classroomCode: string
  ): Promise<SessionDetailView> {
    return this.sessionsService.getSessionByClassroomCode(classroomCode);
  }

  @Get(':sessionId')
  getSession(@Param('sessionId') sessionId: string): Promise<SessionDetailView> {
    return this.sessionsService.getSession(sessionId);
  }

  @Get(':sessionId/binding')
  async getBinding(
    @Param('sessionId') sessionId: string
  ): Promise<SessionBindingView> {
    const session = await this.sessionsService.getSession(sessionId);
    return {
      sessionId: session.id,
      classroomCode: session.classroomCode,
      bindToken: this.sessionsService.getMobileBindToken(session.id),
      mobileBindUrl: this.sessionsService.getMobileBindUrl(session)
    };
  }

  @Post(':sessionId/stage')
  updateStage(
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateSessionStageDto
  ): Promise<SessionDetailView> {
    return this.sessionsService.updateStage(sessionId, dto);
  }

  @Post(':sessionId/start')
  startSession(@Param('sessionId') sessionId: string): Promise<SessionDetailView> {
    return this.sessionsService.startSession(sessionId);
  }

  @Post(':sessionId/end')
  endSession(@Param('sessionId') sessionId: string): Promise<SessionDetailView> {
    return this.sessionsService.endSession(sessionId);
  }
}
