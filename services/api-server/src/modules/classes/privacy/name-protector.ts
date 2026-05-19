import { createHash } from 'node:crypto';

export function protectStudentName(name: string): string {
  const digest = createHash('sha256').update(name).digest('hex').slice(0, 12);
  const firstChar = name.trim().at(0) ?? '学';
  return `${firstChar}同学#${digest}`;
}

