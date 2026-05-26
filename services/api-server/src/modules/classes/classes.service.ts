import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateClassDto } from './dto/create-class.dto.js';
import { ImportStudentsDto } from './dto/import-students.dto.js';
import { UpdateClassDto } from './dto/update-class.dto.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';
import {
  ClassEntity,
  ClassesRepository,
  ClassView,
  ImportStudentsResult,
  StudentEntity,
  StudentView
} from './models/class.models.js';
import { protectStudentName } from './privacy/name-protector.js';

const DEFAULT_SCHOOL_ID = 'school_demo';
const DEFAULT_TEACHER_ID = 'teacher_demo';
const DEFAULT_WORKSPACE_ID = 'demo_workspace';

@Injectable()
export class ClassesService {
  constructor(
    @Inject('ClassesRepository')
    private readonly repository: ClassesRepository
  ) {}

  async createClass(dto: CreateClassDto, workspaceId = DEFAULT_WORKSPACE_ID): Promise<ClassView> {
    const entity: ClassEntity = {
      id: randomUUID(),
      workspaceId,
      schoolId: DEFAULT_SCHOOL_ID,
      grade: dto.grade,
      name: dto.name,
      headTeacherId: DEFAULT_TEACHER_ID,
      createdAt: new Date()
    };

    await this.repository.saveClass(entity);
    return this.toClassView(entity);
  }

  async listClasses(workspaceId = DEFAULT_WORKSPACE_ID): Promise<ClassView[]> {
    return (await this.repository.listClasses(workspaceId)).map((item) => this.toClassView(item));
  }

  async findClassById(classId: string): Promise<ClassView | undefined> {
    const entity = await this.repository.findClassById(classId);
    return entity ? this.toClassView(entity) : undefined;
  }

  async updateClass(classId: string, dto: UpdateClassDto): Promise<ClassView> {
    const entity = await this.repository.findClassById(classId);
    if (!entity) {
      throw new NotFoundException('班级不存在');
    }
    const updated = { ...entity, grade: dto.grade, name: dto.name };
    await this.repository.saveClass(updated);
    return this.toClassView(updated);
  }

  async deleteClass(classId: string): Promise<{ deleted: true }> {
    if (!(await this.repository.findClassById(classId))) {
      throw new NotFoundException('班级不存在');
    }
    await this.repository.deleteClass(classId);
    return { deleted: true };
  }

  async importStudents(
    classId: string,
    dto: ImportStudentsDto
  ): Promise<ImportStudentsResult> {
    const classEntity = await this.repository.findClassById(classId);
    if (!classEntity) {
      throw new NotFoundException('班级不存在');
    }

    const errors: ImportStudentsResult['errors'] = [];
    const importedStudents: StudentEntity[] = [];

    for (const [index, student] of dto.students.entries()) {
      const rowNo = index + 1;
      if (await this.repository.findStudentByNo(classId, student.studentNo)) {
        errors.push({ rowNo, message: '学号在班级内已存在' });
        continue;
      }
      if (await this.repository.findStudentByCard(classId, student.cardCode)) {
        errors.push({ rowNo, message: '答题卡编号在本班已绑定' });
        continue;
      }

      importedStudents.push({
        id: randomUUID(),
        workspaceId: classEntity.workspaceId,
        classId,
        studentNo: student.studentNo,
        nameRaw: student.name,
        nameEncrypted: protectStudentName(student.name),
        cardCode: student.cardCode,
        status: 'active',
        createdAt: new Date()
      });
    }

    await this.repository.saveStudents(importedStudents);

    return {
      importedCount: importedStudents.length,
      failedCount: errors.length,
      errors
    };
  }

  async createStudent(classId: string, dto: UpdateStudentDto): Promise<StudentView> {
    const classEntity = await this.repository.findClassById(classId);
    if (!classEntity) {
      throw new NotFoundException('班级不存在');
    }
    await this.ensureStudentUnique(classId, dto.studentNo, dto.cardCode);

    const entity: StudentEntity = {
      id: randomUUID(),
      workspaceId: classEntity.workspaceId,
      classId,
      studentNo: dto.studentNo,
      nameRaw: dto.name,
      nameEncrypted: protectStudentName(dto.name),
      cardCode: dto.cardCode,
      status: dto.status,
      createdAt: new Date()
    };
    await this.repository.saveStudent(entity);
    return this.toStudentView(entity, true);
  }

  async listStudents(classId: string, showRealName = false): Promise<StudentView[]> {
    const classEntity = await this.repository.findClassById(classId);
    if (!classEntity) {
      throw new NotFoundException('班级不存在');
    }

    return (await this.repository.listStudents(classId)).map((item) => ({
      id: item.id,
      classId: item.classId,
      studentNo: item.studentNo,
      displayName: showRealName ? item.nameRaw : item.nameEncrypted,
      cardCode: item.cardCode,
      status: item.status
    }));
  }

  async updateStudent(studentId: string, dto: UpdateStudentDto): Promise<StudentView> {
    const entity = await this.repository.findStudentById(studentId);
    if (!entity) {
      throw new NotFoundException('学生不存在');
    }
    await this.ensureStudentUnique(entity.classId, dto.studentNo, dto.cardCode, studentId);
    const updated: StudentEntity = {
      ...entity,
      studentNo: dto.studentNo,
      nameRaw: dto.name,
      nameEncrypted: protectStudentName(dto.name),
      cardCode: dto.cardCode,
      status: dto.status
    };
    await this.repository.saveStudent(updated);
    return this.toStudentView(updated, true);
  }

  private async ensureStudentUnique(
    classId: string,
    studentNo: string,
    cardCode: string,
    ignoredStudentId?: string
  ): Promise<void> {
    const duplicatedNo = await this.repository.findStudentByNo(classId, studentNo);
    if (duplicatedNo && duplicatedNo.id !== ignoredStudentId) {
      throw new BadRequestException('学号在班级内已存在');
    }
    const duplicatedCard = await this.repository.findStudentByCard(classId, cardCode);
    if (duplicatedCard && duplicatedCard.id !== ignoredStudentId) {
      throw new BadRequestException('答题卡编号在本班已绑定');
    }
  }

  async deleteStudent(studentId: string): Promise<{ deleted: true }> {
    if (!(await this.repository.findStudentById(studentId))) {
      throw new NotFoundException('学生不存在');
    }
    await this.repository.deleteStudent(studentId);
    return { deleted: true };
  }

  async findStudentByCard(
    classId: string,
    cardCode: string
  ): Promise<StudentView | undefined> {
    const student = await this.repository.findStudentByCard(classId, cardCode);
    if (!student) {
      return undefined;
    }

    return {
      id: student.id,
      classId: student.classId,
      studentNo: student.studentNo,
      displayName: student.nameEncrypted,
      cardCode: student.cardCode,
      status: student.status
    };
  }

  private toClassView(entity: ClassEntity): ClassView {
    return {
      id: entity.id,
      workspaceId: entity.workspaceId,
      schoolId: entity.schoolId,
      grade: entity.grade,
      name: entity.name,
      headTeacherId: entity.headTeacherId,
      createdAt: entity.createdAt.toISOString()
    };
  }

  private toStudentView(entity: StudentEntity, showRealName: boolean): StudentView {
    return {
      id: entity.id,
      classId: entity.classId,
      studentNo: entity.studentNo,
      displayName: showRealName ? entity.nameRaw : entity.nameEncrypted,
      cardCode: entity.cardCode,
      status: entity.status
    };
  }
}
