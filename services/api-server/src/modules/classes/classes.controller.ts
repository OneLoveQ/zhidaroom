import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ClassesService } from './classes.service.js';
import { CreateClassDto } from './dto/create-class.dto.js';
import { ImportStudentsDto } from './dto/import-students.dto.js';
import { UpdateClassDto } from './dto/update-class.dto.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';
import { ClassView, ImportStudentsResult, StudentView } from './models/class.models.js';
import { Req } from '@nestjs/common';
import { AuthenticatedRequest } from '../../common/auth/auth-request.js';

@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  createClass(@Body() dto: CreateClassDto, @Req() request: AuthenticatedRequest): Promise<ClassView> {
    return this.classesService.createClass(dto, request.auth?.workspaceId);
  }

  @Get()
  listClasses(@Req() request: AuthenticatedRequest): Promise<ClassView[]> {
    return this.classesService.listClasses(request.auth?.workspaceId);
  }

  @Put(':classId')
  updateClass(
    @Param('classId') classId: string,
    @Body() dto: UpdateClassDto
  ): Promise<ClassView> {
    return this.classesService.updateClass(classId, dto);
  }

  @Delete(':classId')
  deleteClass(@Param('classId') classId: string): Promise<{ deleted: true }> {
    return this.classesService.deleteClass(classId);
  }

  @Post(':classId/students/import')
  importStudents(
    @Param('classId') classId: string,
    @Body() dto: ImportStudentsDto
  ): Promise<ImportStudentsResult> {
    return this.classesService.importStudents(classId, dto);
  }

  @Post(':classId/students')
  createStudent(
    @Param('classId') classId: string,
    @Body() dto: UpdateStudentDto
  ): Promise<StudentView> {
    return this.classesService.createStudent(classId, dto);
  }

  @Get(':classId/students')
  listStudents(
    @Param('classId') classId: string,
    @Query('showRealNames') showRealNames?: string
  ): Promise<StudentView[]> {
    return this.classesService.listStudents(classId, showRealNames === 'true');
  }

  @Put(':classId/students/:studentId')
  updateStudent(
    @Param('studentId') studentId: string,
    @Body() dto: UpdateStudentDto
  ): Promise<StudentView> {
    return this.classesService.updateStudent(studentId, dto);
  }

  @Delete(':classId/students/:studentId')
  deleteStudent(@Param('studentId') studentId: string): Promise<{ deleted: true }> {
    return this.classesService.deleteStudent(studentId);
  }
}
