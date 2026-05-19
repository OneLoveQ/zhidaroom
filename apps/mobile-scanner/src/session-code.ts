import type { ClassView, SessionView } from './types';

export function createClassroomCode(
  date: Date,
  classView: ClassView,
  subject: string,
  sessions: SessionView[]
): string {
  const prefix = `${formatDate(date)}-${classView.grade}${classView.name}-${subject}`;
  const nextIndex = sessions.filter((item) => item.title.startsWith(prefix)).length + 1;
  return `${prefix}${nextIndex}`;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}
