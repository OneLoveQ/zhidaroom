import { Injectable } from '@nestjs/common';
import { SqliteService } from '../../../common/sqlite/sqlite.service.js';
import {
  ClassEntity,
  ClassesRepository,
  StudentEntity
} from '../models/class.models.js';

interface ClassRow {
  id: string;
  workspace_id: string | null;
  school_id: string;
  grade: string;
  name: string;
  head_teacher_id: string;
  created_at: string;
}

interface StudentRow {
  id: string;
  workspace_id: string | null;
  class_id: string;
  student_no: string;
  name_raw: string;
  name_encrypted: string;
  card_code: string;
  status: string;
  created_at: string;
}

@Injectable()
export class SqliteClassesRepository implements ClassesRepository {
  constructor(private readonly sqlite: SqliteService) {}

  async saveClass(entity: ClassEntity): Promise<void> {
    this.sqlite.db.prepare(`
      INSERT INTO classes (id, workspace_id, school_id, grade, name, head_teacher_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET grade = excluded.grade, name = excluded.name, workspace_id = excluded.workspace_id
    `).run(entity.id, entity.workspaceId, entity.schoolId, entity.grade, entity.name, entity.headTeacherId, entity.createdAt.toISOString());
  }

  async listClasses(workspaceId?: string): Promise<ClassEntity[]> {
    const sql = workspaceId
      ? 'SELECT * FROM classes WHERE workspace_id = ? ORDER BY grade, name'
      : 'SELECT * FROM classes ORDER BY grade, name';
    return this.sqlite.db
      .prepare(sql)
      .all(...(workspaceId ? [workspaceId] : []))
      .map((row) => this.toClassEntity(row as unknown as ClassRow));
  }

  async findClassById(classId: string): Promise<ClassEntity | undefined> {
    const row = this.sqlite.db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);
    return row ? this.toClassEntity(row as unknown as ClassRow) : undefined;
  }

  async deleteClass(classId: string): Promise<void> {
    this.sqlite.db.prepare('DELETE FROM classes WHERE id = ?').run(classId);
  }

  async saveStudents(students: StudentEntity[]): Promise<void> {
    const insert = this.sqlite.db.prepare(`
      INSERT INTO students
        (id, workspace_id, class_id, student_no, name_raw, name_encrypted, card_code, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.sqlite.db.exec('BEGIN');
    try {
      students.forEach((student) => insert.run(...this.studentValues(student)));
      this.sqlite.db.exec('COMMIT');
    } catch (error) {
      this.sqlite.db.exec('ROLLBACK');
      throw error;
    }
  }

  async saveStudent(student: StudentEntity): Promise<void> {
    this.sqlite.db.prepare(`
      INSERT INTO students
        (id, workspace_id, class_id, student_no, name_raw, name_encrypted, card_code, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        student_no = excluded.student_no,
        name_raw = excluded.name_raw,
        name_encrypted = excluded.name_encrypted,
        card_code = excluded.card_code,
        status = excluded.status
    `).run(...this.studentValues(student));
  }

  async findStudentById(studentId: string): Promise<StudentEntity | undefined> {
    const row = this.sqlite.db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
    return row ? this.toStudentEntity(row as unknown as StudentRow) : undefined;
  }

  async deleteStudent(studentId: string): Promise<void> {
    this.sqlite.db.prepare('DELETE FROM students WHERE id = ?').run(studentId);
  }

  async listStudents(classId: string): Promise<StudentEntity[]> {
    return this.sqlite.db
      .prepare('SELECT * FROM students WHERE class_id = ? ORDER BY student_no')
      .all(classId)
      .map((row) => this.toStudentEntity(row as unknown as StudentRow));
  }

  async findStudentByNo(
    classId: string,
    studentNo: string
  ): Promise<StudentEntity | undefined> {
    const row = this.sqlite.db
      .prepare('SELECT * FROM students WHERE class_id = ? AND student_no = ?')
      .get(classId, studentNo);
    return row ? this.toStudentEntity(row as unknown as StudentRow) : undefined;
  }

  async findStudentByCard(classId: string, cardCode: string): Promise<StudentEntity | undefined> {
    const row = this.sqlite.db
      .prepare('SELECT * FROM students WHERE class_id = ? AND card_code = ?')
      .get(classId, cardCode);
    return row ? this.toStudentEntity(row as unknown as StudentRow) : undefined;
  }

  private studentValues(student: StudentEntity): string[] {
    return [
      student.id,
      student.workspaceId,
      student.classId,
      student.studentNo,
      student.nameRaw,
      student.nameEncrypted,
      student.cardCode,
      student.status,
      student.createdAt.toISOString()
    ];
  }

  private toClassEntity(row: ClassRow): ClassEntity {
    return {
      id: row.id,
      workspaceId: row.workspace_id ?? 'demo_workspace',
      schoolId: row.school_id,
      grade: row.grade,
      name: row.name,
      headTeacherId: row.head_teacher_id,
      createdAt: new Date(row.created_at)
    };
  }

  private toStudentEntity(row: StudentRow): StudentEntity {
    return {
      id: row.id,
      workspaceId: row.workspace_id ?? 'demo_workspace',
      classId: row.class_id,
      studentNo: row.student_no,
      nameRaw: row.name_raw,
      nameEncrypted: row.name_encrypted,
      cardCode: row.card_code,
      status: row.status === 'disabled' ? 'disabled' : 'active',
      createdAt: new Date(row.created_at)
    };
  }
}
