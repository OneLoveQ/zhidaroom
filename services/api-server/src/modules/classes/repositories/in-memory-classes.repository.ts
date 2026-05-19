import { Injectable } from '@nestjs/common';
import {
  ClassEntity,
  ClassesRepository,
  StudentEntity
} from '../models/class.models.js';
import { JsonStore } from '../../../common/storage/json-store.js';

interface ClassesState {
  classes: ClassEntity[];
  students: StudentEntity[];
}

@Injectable()
export class InMemoryClassesRepository implements ClassesRepository {
  private readonly classes = new Map<string, ClassEntity>();
  private readonly students = new Map<string, StudentEntity>();
  private readonly store = new JsonStore();

  constructor() {
    const state = this.store.read<ClassesState>('classes', {
      classes: [],
      students: []
    });
    state.classes.forEach((item) => {
      this.classes.set(item.id, this.hydrateClass(item));
    });
    state.students.forEach((item) => {
      this.students.set(item.id, this.hydrateStudent(item));
    });
  }

  async saveClass(entity: ClassEntity): Promise<void> {
    this.classes.set(entity.id, entity);
    this.persist();
  }

  async listClasses(): Promise<ClassEntity[]> {
    return Array.from(this.classes.values());
  }

  async findClassById(classId: string): Promise<ClassEntity | undefined> {
    return this.classes.get(classId);
  }

  async deleteClass(classId: string): Promise<void> {
    this.classes.delete(classId);
    Array.from(this.students.values())
      .filter((student) => student.classId === classId)
      .forEach((student) => this.students.delete(student.id));
    this.persist();
  }

  async saveStudents(students: StudentEntity[]): Promise<void> {
    students.forEach((student) => {
      this.students.set(student.id, student);
    });
    this.persist();
  }

  async saveStudent(student: StudentEntity): Promise<void> {
    this.students.set(student.id, student);
    this.persist();
  }

  async findStudentById(studentId: string): Promise<StudentEntity | undefined> {
    return this.students.get(studentId);
  }

  async deleteStudent(studentId: string): Promise<void> {
    this.students.delete(studentId);
    this.persist();
  }

  async listStudents(classId: string): Promise<StudentEntity[]> {
    return Array.from(this.students.values()).filter(
      (student) => student.classId === classId
    );
  }

  async findStudentByNo(classId: string, studentNo: string): Promise<StudentEntity | undefined> {
    return (await this.listStudents(classId)).find(
      (student) => student.studentNo === studentNo
    );
  }

  async findStudentByCard(classId: string, cardCode: string): Promise<StudentEntity | undefined> {
    return (await this.listStudents(classId)).find((student) => student.cardCode === cardCode);
  }

  private persist(): void {
    this.store.write('classes', {
      classes: Array.from(this.classes.values()),
      students: Array.from(this.students.values())
    });
  }

  private hydrateClass(entity: ClassEntity): ClassEntity {
    return { ...entity, createdAt: new Date(entity.createdAt) };
  }

  private hydrateStudent(entity: StudentEntity): StudentEntity {
    return { ...entity, createdAt: new Date(entity.createdAt) };
  }
}
