export interface ClassEntity {
  id: string;
  workspaceId: string;
  schoolId: string;
  grade: string;
  name: string;
  headTeacherId: string;
  createdAt: Date;
}

export interface StudentEntity {
  id: string;
  workspaceId: string;
  classId: string;
  studentNo: string;
  nameRaw: string;
  nameEncrypted: string;
  cardCode: string;
  status: 'active' | 'disabled';
  createdAt: Date;
}

export interface ClassView {
  id: string;
  workspaceId: string;
  schoolId: string;
  grade: string;
  name: string;
  headTeacherId: string;
  createdAt: string;
}

export interface StudentView {
  id: string;
  classId: string;
  studentNo: string;
  displayName: string;
  cardCode: string;
  status: string;
}

export interface ImportStudentsResult {
  importedCount: number;
  failedCount: number;
  errors: Array<{
    rowNo: number;
    message: string;
  }>;
}

export interface ClassesRepository {
  saveClass(entity: ClassEntity): Promise<void>;
  listClasses(workspaceId?: string): Promise<ClassEntity[]>;
  findClassById(classId: string): Promise<ClassEntity | undefined>;
  deleteClass(classId: string): Promise<void>;
  saveStudents(students: StudentEntity[]): Promise<void>;
  saveStudent(student: StudentEntity): Promise<void>;
  findStudentById(studentId: string): Promise<StudentEntity | undefined>;
  deleteStudent(studentId: string): Promise<void>;
  listStudents(classId: string): Promise<StudentEntity[]>;
  findStudentByNo(classId: string, studentNo: string): Promise<StudentEntity | undefined>;
  findStudentByCard(classId: string, cardCode: string): Promise<StudentEntity | undefined>;
}
