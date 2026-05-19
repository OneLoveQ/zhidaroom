import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { DisplayPairingView } from './display.models.js';
import { DisplaysService } from './displays.service.js';
import { AuthenticatedRequest } from '../../common/auth/auth-request.js';

@Controller('displays')
export class DisplaysController {
  constructor(private readonly displaysService: DisplaysService) {}

  @Post('pairings')
  createPairing(
    @Body() dto: { displayId: string },
    @Req() request: AuthenticatedRequest
  ): Promise<DisplayPairingView> {
    return this.displaysService.createOrRestorePairing(
      dto.displayId,
      request.auth?.workspaceId,
      request.auth?.userId
    );
  }

  @Get('pairings/:pairCode')
  getPairing(@Param('pairCode') pairCode: string): Promise<DisplayPairingView> {
    return this.displaysService.getPairing(pairCode);
  }

  @Post('pairings/:pairCode/bind-session')
  bindSession(
    @Param('pairCode') pairCode: string,
    @Body() dto: { sessionId: string }
  ): Promise<DisplayPairingView> {
    return this.displaysService.bindSession(pairCode, dto.sessionId);
  }

  @Post(':displayId/unbind')
  unbindDisplay(@Param('displayId') displayId: string): Promise<DisplayPairingView> {
    return this.displaysService.unbindDisplay(displayId);
  }
}
