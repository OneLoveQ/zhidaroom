import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { SessionsService } from '../sessions/sessions.service.js';
import {
  DisplayPairingEntity,
  DisplayPairingsRepository,
  DisplayPairingView
} from './display.models.js';

const PAIRING_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class DisplaysService {
  constructor(
    @Inject('DisplayPairingsRepository')
    private readonly repository: DisplayPairingsRepository,
    private readonly sessionsService: SessionsService
  ) {}

  async createOrRestorePairing(
    displayId: string,
    workspaceId?: string,
    teacherUserId?: string
  ): Promise<DisplayPairingView> {
    const latest = await this.repository.findLatestByDisplayId(displayId);
    if (latest?.status === 'bound' || (latest && !this.isExpired(latest))) {
      return this.toView(await this.refreshExpiry(latest));
    }

    const now = new Date();
    const entity: DisplayPairingEntity = {
      pairCode: this.createPairCode(),
      displayId,
      workspaceId,
      teacherUserId,
      status: 'waiting',
      expiresAt: new Date(now.getTime() + PAIRING_TTL_MS),
      createdAt: now
    };
    await this.repository.save(entity);
    return this.toView(entity);
  }

  async getPairing(pairCode: string): Promise<DisplayPairingView> {
    const entity = await this.getPairingEntity(pairCode);
    return this.toView(await this.refreshExpiry(entity));
  }

  async bindSession(pairCode: string, sessionId: string): Promise<DisplayPairingView> {
    const entity = await this.getPairingEntity(pairCode);
    if (entity.status !== 'waiting' || this.isExpired(entity)) {
      throw new BadRequestException('大屏配对码已失效，请刷新大屏重新扫码');
    }
    await this.sessionsService.getSession(sessionId);
    const updated = {
      ...entity,
      sessionId,
      status: 'bound' as const,
      boundAt: new Date()
    };
    await this.repository.save(updated);
    return this.toView(updated);
  }

  async unbindDisplay(displayId: string): Promise<DisplayPairingView> {
    const entity = await this.repository.findLatestByDisplayId(displayId);
    if (!entity) {
      throw new NotFoundException('大屏配对记录不存在');
    }
    const updated = {
      ...entity,
      sessionId: undefined,
      status: 'expired' as const,
      boundAt: undefined
    };
    await this.repository.save(updated);
    return this.toView(updated);
  }

  private async refreshExpiry(entity: DisplayPairingEntity): Promise<DisplayPairingEntity> {
    if (entity.status !== 'waiting' || !this.isExpired(entity)) {
      return entity;
    }
    const expired = { ...entity, status: 'expired' as const };
    await this.repository.save(expired);
    return expired;
  }

  private async getPairingEntity(pairCode: string): Promise<DisplayPairingEntity> {
    const entity = await this.repository.findByPairCode(pairCode);
    if (!entity) {
      throw new NotFoundException('大屏配对码不存在');
    }
    return entity;
  }

  private toView(entity: DisplayPairingEntity): DisplayPairingView {
    const params = new URLSearchParams({ displayPairCode: entity.pairCode });
    return {
      pairCode: entity.pairCode,
      displayId: entity.displayId,
      workspaceId: entity.workspaceId,
      teacherUserId: entity.teacherUserId,
      pairUrl: this.sessionsService.getScannerUrl(params),
      status: entity.status,
      sessionId: entity.sessionId,
      expiresAt: entity.expiresAt.toISOString(),
      createdAt: entity.createdAt.toISOString(),
      boundAt: entity.boundAt?.toISOString()
    };
  }

  private isExpired(entity: DisplayPairingEntity): boolean {
    return entity.expiresAt.getTime() <= Date.now();
  }

  private createPairCode(): string {
    return `D-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  }
}
