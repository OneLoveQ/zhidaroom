import { Injectable } from '@nestjs/common';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

@Injectable()
export class SqliteService {
  readonly db: DatabaseSync;

  constructor() {
    const dbPath = resolve(process.cwd(), '../../data/zhida.dev.db');
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS classes (
        id TEXT PRIMARY KEY,
        workspace_id TEXT,
        school_id TEXT NOT NULL,
        grade TEXT NOT NULL,
        name TEXT NOT NULL,
        head_teacher_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        workspace_id TEXT,
        class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        student_no TEXT NOT NULL,
        name_raw TEXT NOT NULL,
        name_encrypted TEXT NOT NULL,
        card_code TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(class_id, student_no),
        UNIQUE(class_id, card_code)
      );
      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        workspace_id TEXT,
        creator_id TEXT NOT NULL,
        subject TEXT NOT NULL,
        grade TEXT NOT NULL,
        stem TEXT NOT NULL,
        options_json TEXT NOT NULL,
        answer TEXT NOT NULL,
        explanation TEXT NOT NULL,
        knowledge_points_json TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        source TEXT NOT NULL,
        ai_generated INTEGER NOT NULL,
        review_status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        workspace_id TEXT,
        teacher_user_id TEXT,
        teacher_id TEXT NOT NULL,
        class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        mode TEXT NOT NULL,
        status TEXT NOT NULL,
        stage TEXT,
        current_question_id TEXT,
        auto_advance_at TEXT,
        teacher_name TEXT,
        subject TEXT,
        classroom_code TEXT,
        started_at TEXT,
        ended_at TEXT,
        deleted_at TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS session_questions (
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        order_no INTEGER NOT NULL,
        PRIMARY KEY(session_id, question_id)
      );
      CREATE TABLE IF NOT EXISTS answers (
        id TEXT PRIMARY KEY,
        run_id TEXT,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        card_code TEXT NOT NULL,
        selected_option TEXT NOT NULL,
        is_correct INTEGER NOT NULL,
        recognized_at TEXT NOT NULL,
        recognition_score REAL NOT NULL,
        device_id TEXT NOT NULL,
        UNIQUE(run_id, question_id, student_id)
      );
      CREATE TABLE IF NOT EXISTS assessment_runs (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        stage TEXT NOT NULL,
        current_question_id TEXT,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS assessment_run_questions (
        run_id TEXT NOT NULL REFERENCES assessment_runs(id) ON DELETE CASCADE,
        question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        order_no INTEGER NOT NULL,
        PRIMARY KEY(run_id, question_id)
      );
      CREATE TABLE IF NOT EXISTS display_pairings (
        pair_code TEXT PRIMARY KEY,
        display_id TEXT NOT NULL,
        workspace_id TEXT,
        teacher_user_id TEXT,
        session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
        status TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        bound_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_display_pairings_display
        ON display_pairings(display_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        phone TEXT,
        school TEXT,
        subject TEXT,
        status TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'teacher',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        school_name TEXT,
        owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS workspace_members (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(workspace_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS auth_sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    this.ensureSessionColumns();
    this.ensureStudentCardScope();
    this.ensureAnswerRunColumn();
    this.ensureAnswerStudentReference();
  }

  private ensureStudentCardScope(): void {
    const indexes = this.db.prepare('PRAGMA index_list(students)').all() as Array<{ name: string; unique: number }>;
    const hasGlobalCardIndex = indexes.some((index) => {
      if (!index.unique) return false;
      const columns = this.db.prepare(`PRAGMA index_info(${index.name})`).all() as Array<{ name: string }>;
      return columns.length === 1 && columns[0]?.name === 'card_code';
    });
    const hasClassCardIndex = indexes.some((index) => index.name === 'idx_students_class_card');
    if (!hasGlobalCardIndex && hasClassCardIndex) return;
    this.db.exec(`
      PRAGMA foreign_keys = OFF;
      ALTER TABLE students RENAME TO students_legacy;
      CREATE TABLE students (
        id TEXT PRIMARY KEY,
        workspace_id TEXT,
        class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        student_no TEXT NOT NULL,
        name_raw TEXT NOT NULL,
        name_encrypted TEXT NOT NULL,
        card_code TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(class_id, student_no),
        UNIQUE(class_id, card_code)
      );
      INSERT INTO students
        (id, workspace_id, class_id, student_no, name_raw, name_encrypted, card_code, status, created_at)
      SELECT id, COALESCE(workspace_id, 'demo_workspace'), class_id, student_no, name_raw,
        name_encrypted, card_code, status, created_at
      FROM students_legacy;
      DROP TABLE students_legacy;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_students_class_card ON students(class_id, card_code);
      PRAGMA foreign_keys = ON;
    `);
  }

  private ensureSessionColumns(): void {
    [
      'ALTER TABLE classes ADD COLUMN workspace_id TEXT',
      'ALTER TABLE students ADD COLUMN workspace_id TEXT',
      'ALTER TABLE questions ADD COLUMN workspace_id TEXT',
      'ALTER TABLE sessions ADD COLUMN workspace_id TEXT',
      'ALTER TABLE sessions ADD COLUMN teacher_user_id TEXT',
      'ALTER TABLE sessions ADD COLUMN stage TEXT',
      'ALTER TABLE sessions ADD COLUMN current_question_id TEXT',
      'ALTER TABLE sessions ADD COLUMN auto_advance_at TEXT',
      'ALTER TABLE sessions ADD COLUMN deleted_at TEXT',
      'ALTER TABLE display_pairings ADD COLUMN workspace_id TEXT',
      'ALTER TABLE display_pairings ADD COLUMN teacher_user_id TEXT'
    ].forEach((statement) => {
      try {
        this.db.exec(statement);
      } catch {
        // SQLite has no IF NOT EXISTS for ADD COLUMN in this runtime.
      }
    });
    try {
      this.db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'teacher'");
    } catch {
      // SQLite has no IF NOT EXISTS for ADD COLUMN in this runtime.
    }
  }

  private ensureAnswerRunColumn(): void {
    const columns = this.db.prepare('PRAGMA table_info(answers)').all() as Array<{ name: string }>;
    if (columns.some((column) => column.name === 'run_id')) {
      return;
    }
    this.db.exec(`
      ALTER TABLE answers RENAME TO answers_legacy;
      CREATE TABLE answers (
        id TEXT PRIMARY KEY,
        run_id TEXT,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        card_code TEXT NOT NULL,
        selected_option TEXT NOT NULL,
        is_correct INTEGER NOT NULL,
        recognized_at TEXT NOT NULL,
        recognition_score REAL NOT NULL,
        device_id TEXT NOT NULL,
        UNIQUE(run_id, question_id, student_id)
      );
      INSERT INTO answers
        (id, run_id, session_id, question_id, student_id, card_code, selected_option,
         is_correct, recognized_at, recognition_score, device_id)
      SELECT id, session_id, session_id, question_id, student_id, card_code, selected_option,
        is_correct, recognized_at, recognition_score, device_id
      FROM answers_legacy;
      DROP TABLE answers_legacy;
    `);
  }

  private ensureAnswerStudentReference(): void {
    const references = this.db.prepare('PRAGMA foreign_key_list(answers)').all() as Array<{ table: string }>;
    if (!references.some((item) => item.table === 'students_legacy')) {
      return;
    }
    this.db.exec(`
      PRAGMA foreign_keys = OFF;
      ALTER TABLE answers RENAME TO answers_legacy;
      CREATE TABLE answers (
        id TEXT PRIMARY KEY,
        run_id TEXT,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        card_code TEXT NOT NULL,
        selected_option TEXT NOT NULL,
        is_correct INTEGER NOT NULL,
        recognized_at TEXT NOT NULL,
        recognition_score REAL NOT NULL,
        device_id TEXT NOT NULL,
        UNIQUE(run_id, question_id, student_id)
      );
      INSERT INTO answers
        (id, run_id, session_id, question_id, student_id, card_code, selected_option,
         is_correct, recognized_at, recognition_score, device_id)
      SELECT id, run_id, session_id, question_id, student_id, card_code, selected_option,
        is_correct, recognized_at, recognition_score, device_id
      FROM answers_legacy;
      DROP TABLE answers_legacy;
      PRAGMA foreign_keys = ON;
    `);
  }
}
