import { LearningAnalysisRange } from './models/report.models.js';

export function isInLearningRange(createdAt: string, range?: LearningAnalysisRange): boolean {
  const time = new Date(createdAt).getTime();
  if (Number.isNaN(time)) return true;
  const from = range?.from ? startOfDay(range.from) : undefined;
  const to = range?.to ? endOfDay(range.to) : undefined;
  return (!from || time >= from.getTime()) && (!to || time <= to.getTime());
}

function startOfDay(value: string): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: string): Date {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}
