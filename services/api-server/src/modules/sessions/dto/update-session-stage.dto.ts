import { IsIn, IsOptional, IsString } from 'class-validator';
import { SessionStage } from '../models/session.models.js';

const stages: SessionStage[] = [
  'binding',
  'scanning',
  'question_complete',
  'question_result',
  'session_report'
];

export class UpdateSessionStageDto {
  @IsIn(stages)
  stage!: SessionStage;

  @IsOptional()
  @IsString()
  questionId?: string;
}
