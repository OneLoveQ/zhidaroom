import { SqliteService } from '../../common/sqlite/sqlite.service.js';
import { LearningAnalysisRange } from '../reports/models/report.models.js';
import {
  AiLearningDiagnosisRecordView,
  AiLearningDiagnosisResult
} from './models/ai.models.js';

interface SaveOptions {
  classId?: string;
  studentId?: string;
  range?: LearningAnalysisRange;
}

interface DiagnosisRow {
  id: string;
  scope: string;
  target_id: string;
  class_id: string | null;
  student_id: string | null;
  source: string;
  status: string;
  range_from: string | null;
  range_to: string | null;
  diagnosis_json: string;
  recommendations_json: string;
  created_at: string;
}

export function saveLearningDiagnosis(
  sqlite: SqliteService | undefined,
  result: AiLearningDiagnosisResult,
  options: SaveOptions
): void {
  if (!sqlite) return;
  sqlite.db.prepare(`
    INSERT INTO ai_diagnosis_records
      (id, scope, target_id, class_id, student_id, source, status, range_from, range_to,
       diagnosis_json, recommendations_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    result.record.id,
    result.scope,
    result.targetId,
    options.classId ?? null,
    options.studentId ?? null,
    result.source,
    result.record.status,
    options.range?.from ?? null,
    options.range?.to ?? null,
    JSON.stringify(result.diagnosis),
    JSON.stringify(result.recommendations),
    result.generatedAt
  );
}

export function listLearningDiagnosisRecords(
  sqlite: SqliteService | undefined,
  scope: AiLearningDiagnosisRecordView['scope'],
  targetId: string
): AiLearningDiagnosisRecordView[] {
  if (!sqlite) return [];
  return sqlite.db.prepare(`
    SELECT * FROM ai_diagnosis_records
    WHERE scope = ? AND target_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(scope, targetId).map((row) => toLearningRecord(row as unknown as DiagnosisRow));
}

function toLearningRecord(row: DiagnosisRow): AiLearningDiagnosisRecordView {
  return {
    id: row.id,
    scope: row.scope === 'student' ? 'student' : 'class',
    targetId: row.target_id,
    classId: row.class_id ?? undefined,
    studentId: row.student_id ?? undefined,
    source: row.source === 'model' ? 'model' : 'rule',
    status: row.status === 'success' ? 'success' : 'fallback',
    rangeFrom: row.range_from ?? undefined,
    rangeTo: row.range_to ?? undefined,
    diagnosis: JSON.parse(row.diagnosis_json) as string[],
    recommendations: JSON.parse(row.recommendations_json) as string[],
    createdAt: row.created_at
  };
}
