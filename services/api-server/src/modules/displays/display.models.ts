export type DisplayPairingStatus = 'waiting' | 'bound' | 'expired';

export interface DisplayPairingEntity {
  pairCode: string;
  displayId: string;
  workspaceId?: string;
  teacherUserId?: string;
  sessionId?: string;
  status: DisplayPairingStatus;
  expiresAt: Date;
  createdAt: Date;
  boundAt?: Date;
}

export interface DisplayPairingView {
  pairCode: string;
  displayId: string;
  workspaceId?: string;
  teacherUserId?: string;
  pairUrl: string;
  status: DisplayPairingStatus;
  sessionId?: string;
  expiresAt: string;
  createdAt: string;
  boundAt?: string;
}

export interface DisplayPairingsRepository {
  save(entity: DisplayPairingEntity): Promise<void>;
  findByPairCode(pairCode: string): Promise<DisplayPairingEntity | undefined>;
  findLatestByDisplayId(displayId: string): Promise<DisplayPairingEntity | undefined>;
}
