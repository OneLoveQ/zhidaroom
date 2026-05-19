export interface UserEntity {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  phone?: string;
  school?: string;
  subject?: string;
  status: 'active' | 'disabled';
  createdAt: Date;
}

export interface WorkspaceEntity {
  id: string;
  type: 'personal' | 'school';
  name: string;
  schoolName?: string;
  ownerUserId: string;
  createdAt: Date;
}

export interface WorkspaceMemberEntity {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'owner' | 'admin' | 'teacher';
  status: 'active' | 'invited' | 'disabled';
  createdAt: Date;
}

export interface AuthSessionEntity {
  token: string;
  userId: string;
  workspaceId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface AuthContext {
  userId: string;
  workspaceId: string;
  email: string;
  displayName: string;
}

export interface AuthUserView {
  id: string;
  email: string;
  displayName: string;
  phone?: string;
  school?: string;
  subject?: string;
  workspaceId: string;
  workspaceName: string;
  workspaceType: WorkspaceEntity['type'];
}

export interface AuthRepository {
  saveUser(entity: UserEntity): Promise<void>;
  findUserByEmail(email: string): Promise<UserEntity | undefined>;
  findUserById(userId: string): Promise<UserEntity | undefined>;
  saveWorkspace(entity: WorkspaceEntity): Promise<void>;
  saveMember(entity: WorkspaceMemberEntity): Promise<void>;
  findDefaultWorkspace(userId: string): Promise<WorkspaceEntity | undefined>;
  saveSession(entity: AuthSessionEntity): Promise<void>;
  findSession(token: string): Promise<AuthSessionEntity | undefined>;
  deleteSession(token: string): Promise<void>;
}
