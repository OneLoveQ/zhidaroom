import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { SqliteService } from '../../common/sqlite/sqlite.service.js';
import { AuthContext } from '../auth/models/auth.models.js';
import type {
  AdminClassView,
  AdminQuestionView,
  AdminSessionView,
  AdminStudentView,
  AdminUserView,
  AdminWorkspaceView
} from './admin.models.js';

type StatusValue = 'active' | 'disabled';
type RoleValue = 'teacher' | 'platform_admin';

@Injectable()
export class AdminService {
  constructor(private readonly sqlite: SqliteService) {}

  assertAdmin(auth?: AuthContext): void {
    if (auth?.role !== 'platform_admin') throw new ForbiddenException('需要平台总管理员权限');
  }

  listUsers(): AdminUserView[] {
    return this.sqlite.db.prepare(`
      SELECT u.*, w.id AS workspace_id, w.name AS workspace_name, w.type AS workspace_type,
        COUNT(DISTINCT c.id) AS class_count,
        COUNT(DISTINCT st.id) AS student_count,
        COUNT(DISTINCT q.id) AS question_count,
        COUNT(DISTINCT s.id) AS session_count
      FROM users u
      LEFT JOIN workspaces w ON w.owner_user_id = u.id
      LEFT JOIN classes c ON c.workspace_id = w.id
      LEFT JOIN students st ON st.workspace_id = w.id
      LEFT JOIN questions q ON q.workspace_id = w.id
      LEFT JOIN sessions s ON s.workspace_id = w.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `).all().map((row) => toAdminUser(row as Record<string, unknown>));
  }

  updateUserStatus(auth: AuthContext | undefined, userId: string, status: StatusValue): { ok: true } {
    this.assertAdmin(auth);
    if (!['active', 'disabled'].includes(status)) throw new BadRequestException('用户状态不正确');
    const target = this.sqlite.db.prepare('SELECT id, role FROM users WHERE id = ?').get(userId) as
      | { id: string; role: RoleValue }
      | undefined;
    if (!target) throw new BadRequestException('用户不存在');
    if (target.role === 'platform_admin') throw new BadRequestException('总管理员账号不能在这里停用');
    this.sqlite.db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userId);
    return { ok: true };
  }

  listWorkspaces(): AdminWorkspaceView[] {
    return this.sqlite.db.prepare(`
      SELECT w.*, u.display_name AS owner_name, u.email AS owner_email,
        COUNT(DISTINCT c.id) AS class_count,
        COUNT(DISTINCT st.id) AS student_count,
        COUNT(DISTINCT q.id) AS question_count,
        COUNT(DISTINCT s.id) AS session_count
      FROM workspaces w
      JOIN users u ON u.id = w.owner_user_id
      LEFT JOIN classes c ON c.workspace_id = w.id
      LEFT JOIN students st ON st.workspace_id = w.id
      LEFT JOIN questions q ON q.workspace_id = w.id
      LEFT JOIN sessions s ON s.workspace_id = w.id
      GROUP BY w.id
      ORDER BY w.created_at DESC
    `).all().map((row) => toAdminWorkspace(row as Record<string, unknown>));
  }

  listClasses(): AdminClassView[] {
    return this.sqlite.db.prepare(`
      SELECT c.*, w.name AS workspace_name,
        COUNT(st.id) AS student_count,
        SUM(CASE WHEN st.status = 'active' THEN 1 ELSE 0 END) AS active_student_count
      FROM classes c
      LEFT JOIN workspaces w ON w.id = c.workspace_id
      LEFT JOIN students st ON st.class_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all().map((row) => toAdminClass(row as Record<string, unknown>));
  }

  listStudents(classId: string): AdminStudentView[] {
    return this.sqlite.db.prepare(`
      SELECT st.*, c.grade, c.name AS class_name
      FROM students st JOIN classes c ON c.id = st.class_id
      WHERE st.class_id = ?
      ORDER BY st.student_no
    `).all(classId).map((row) => toAdminStudent(row as Record<string, unknown>));
  }

  listQuestions(): AdminQuestionView[] {
    return this.sqlite.db.prepare(`
      SELECT q.*, w.name AS workspace_name
      FROM questions q LEFT JOIN workspaces w ON w.id = q.workspace_id
      ORDER BY q.created_at DESC
    `).all().map((row) => toAdminQuestion(row as Record<string, unknown>));
  }

  listSessions(): AdminSessionView[] {
    return this.sqlite.db.prepare(`
      SELECT s.*, w.name AS workspace_name
      FROM sessions s LEFT JOIN workspaces w ON w.id = s.workspace_id
      WHERE s.deleted_at IS NULL
      ORDER BY s.created_at DESC
    `).all().map((row) => toAdminSession(row as Record<string, unknown>));
  }
}

function text(row: Record<string, unknown>, key: string): string {
  return String(row[key] ?? '');
}

function maybe(row: Record<string, unknown>, key: string): string | undefined {
  const value = text(row, key);
  return value || undefined;
}

function count(row: Record<string, unknown>, key: string): number {
  return Number(row[key] ?? 0);
}

function status(value: unknown): StatusValue {
  return value === 'disabled' ? 'disabled' : 'active';
}

function role(value: unknown): RoleValue {
  return value === 'platform_admin' ? 'platform_admin' : 'teacher';
}

function toAdminUser(row: Record<string, unknown>): AdminUserView {
  return {
    id: text(row, 'id'), email: text(row, 'email'), displayName: text(row, 'display_name'),
    phone: maybe(row, 'phone'), school: maybe(row, 'school'), subject: maybe(row, 'subject'),
    status: status(row.status), role: role(row.role), workspaceId: maybe(row, 'workspace_id'),
    workspaceName: maybe(row, 'workspace_name'), workspaceType: text(row, 'workspace_type') === 'school' ? 'school' : 'personal',
    classCount: count(row, 'class_count'), studentCount: count(row, 'student_count'),
    questionCount: count(row, 'question_count'), sessionCount: count(row, 'session_count'),
    createdAt: text(row, 'created_at')
  };
}

function toAdminWorkspace(row: Record<string, unknown>): AdminWorkspaceView {
  return {
    id: text(row, 'id'), type: text(row, 'type') === 'school' ? 'school' : 'personal',
    name: text(row, 'name'), schoolName: maybe(row, 'school_name'),
    ownerUserId: text(row, 'owner_user_id'), ownerName: text(row, 'owner_name'), ownerEmail: text(row, 'owner_email'),
    classCount: count(row, 'class_count'), studentCount: count(row, 'student_count'),
    questionCount: count(row, 'question_count'), sessionCount: count(row, 'session_count'), createdAt: text(row, 'created_at')
  };
}

function toAdminClass(row: Record<string, unknown>): AdminClassView {
  return {
    id: text(row, 'id'), workspaceId: text(row, 'workspace_id'), workspaceName: maybe(row, 'workspace_name'),
    grade: text(row, 'grade'), name: text(row, 'name'), studentCount: count(row, 'student_count'),
    activeStudentCount: count(row, 'active_student_count'), createdAt: text(row, 'created_at')
  };
}

function toAdminStudent(row: Record<string, unknown>): AdminStudentView {
  return {
    id: text(row, 'id'), workspaceId: text(row, 'workspace_id'), classId: text(row, 'class_id'),
    className: `${text(row, 'grade')}${text(row, 'class_name')}`, studentNo: text(row, 'student_no'),
    displayName: text(row, 'name_raw'), cardCode: text(row, 'card_code'), status: status(row.status)
  };
}

function toAdminQuestion(row: Record<string, unknown>): AdminQuestionView {
  return {
    id: text(row, 'id'), workspaceId: text(row, 'workspace_id'), workspaceName: maybe(row, 'workspace_name'),
    subject: text(row, 'subject'), grade: text(row, 'grade'), stem: text(row, 'stem'), answer: text(row, 'answer'),
    difficulty: text(row, 'difficulty'), source: text(row, 'source'), aiGenerated: Boolean(row.ai_generated),
    createdAt: text(row, 'created_at')
  };
}

function toAdminSession(row: Record<string, unknown>): AdminSessionView {
  return {
    id: text(row, 'id'), workspaceId: text(row, 'workspace_id'), workspaceName: maybe(row, 'workspace_name'),
    title: text(row, 'title'), subject: maybe(row, 'subject'), teacherName: maybe(row, 'teacher_name'),
    status: text(row, 'status'), stage: text(row, 'stage'), createdAt: text(row, 'created_at')
  };
}
