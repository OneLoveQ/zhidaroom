import type { ClassView } from './types';

const teacherPrefsKey = 'zhida.teacherScannerPrefs';

interface TeacherPrefs {
  classId?: string;
  subject?: string;
  teacherName?: string;
}

export function applyTeacherPrefs(
  form: TeacherPrefs,
  classes: ClassView[],
  subjects: string[]
): void {
  const prefs = readTeacherPrefs();
  form.classId = form.classId || getPreferredClassId(classes, prefs);
  form.subject = prefs?.subject && subjects.includes(prefs.subject)
    ? prefs.subject
    : form.subject;
  form.teacherName = form.teacherName || prefs?.teacherName || '';
}

export function saveTeacherPrefs(form: Required<TeacherPrefs>): void {
  window.localStorage.setItem(teacherPrefsKey, JSON.stringify({
    classId: form.classId,
    subject: form.subject,
    teacherName: form.teacherName.trim()
  }));
}

function getPreferredClassId(classes: ClassView[], prefs?: TeacherPrefs): string {
  if (prefs?.classId && classes.some((item) => item.id === prefs.classId)) {
    return prefs.classId;
  }
  return classes[0]?.id || '';
}

function readTeacherPrefs(): TeacherPrefs | undefined {
  try {
    return JSON.parse(window.localStorage.getItem(teacherPrefsKey) || 'null') ?? undefined;
  } catch {
    return undefined;
  }
}
