export type UserRole = 'teacher' | 'platform_admin';
export type UserStatus = 'active' | 'disabled';

export interface AuthUserView {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  workspaceName: string;
}

export interface AdminUserView extends AuthUserView {
  phone?: string;
  school?: string;
  subject?: string;
  status: UserStatus;
  workspaceId?: string;
  workspaceType?: 'personal' | 'school';
  classCount: number;
  studentCount: number;
  questionCount: number;
  sessionCount: number;
  createdAt: string;
}

export interface AdminWorkspaceView {
  id: string;
  type: 'personal' | 'school';
  name: string;
  schoolName?: string;
  ownerName: string;
  ownerEmail: string;
  classCount: number;
  studentCount: number;
  questionCount: number;
  sessionCount: number;
  createdAt: string;
}

export interface AdminClassView {
  id: string;
  workspaceId: string;
  workspaceName?: string;
  grade: string;
  name: string;
  studentCount: number;
  activeStudentCount: number;
  createdAt: string;
}

export interface AdminStudentView {
  id: string;
  classId: string;
  className: string;
  studentNo: string;
  displayName: string;
  cardCode: string;
  status: UserStatus;
}

export interface AdminQuestionView {
  id: string;
  workspaceId: string;
  workspaceName?: string;
  subject: string;
  grade: string;
  stem: string;
  answer: string;
  difficulty: string;
  source: string;
  aiGenerated: boolean;
  createdAt: string;
}

export interface AdminSessionView {
  id: string;
  workspaceId: string;
  workspaceName?: string;
  title: string;
  subject?: string;
  teacherName?: string;
  status: string;
  stage: string;
  createdAt: string;
}
