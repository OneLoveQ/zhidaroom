import { describe, expect, it } from 'vitest';
import { ClassesService } from '../src/modules/classes/classes.service.js';
import { InMemoryClassesRepository } from '../src/modules/classes/repositories/in-memory-classes.repository.js';

function createService(): ClassesService {
  return new ClassesService(new InMemoryClassesRepository());
}

describe('ClassesService', () => {
  it('创建班级并导入学生和答题卡绑定', async () => {
    const service = createService();
    const createdClass = await service.createClass({ grade: '七年级', name: '1班' });

    const result = await service.importStudents(createdClass.id, {
      students: [
        { studentNo: '20260101', name: '张三', cardCode: 'C001' },
        { studentNo: '20260102', name: '李四', cardCode: 'C002' }
      ]
    });

    const students = await service.listStudents(createdClass.id);

    expect(result.importedCount).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(students).toHaveLength(2);
    expect(students[0]?.displayName).not.toBe('张三');
    expect(students[0]?.cardCode).toBe('C001');
    expect((await service.listStudents(createdClass.id, true))[0]?.displayName).toBe('张三');
  });

  it('导入时返回重复学号和重复卡号的错误行号', async () => {
    const service = createService();
    const createdClass = await service.createClass({ grade: '七年级', name: '1班' });

    await service.importStudents(createdClass.id, {
      students: [{ studentNo: '20260101', name: '张三', cardCode: 'C001' }]
    });

    const result = await service.importStudents(createdClass.id, {
      students: [
        { studentNo: '20260101', name: '王五', cardCode: 'C002' },
        { studentNo: '20260103', name: '赵六', cardCode: 'C001' }
      ]
    });

    expect(result.importedCount).toBe(0);
    expect(result.failedCount).toBe(2);
    expect(result.errors).toEqual([
      { rowNo: 1, message: '学号在班级内已存在' },
      { rowNo: 2, message: '答题卡编号在本班已绑定' }
    ]);
  });

  it('允许不同班级复用同一套答题卡编号', async () => {
    const service = createService();
    const firstClass = await service.createClass({ grade: '一年级', name: '1班' });
    const secondClass = await service.createClass({ grade: '二年级', name: '3班' });

    await service.importStudents(firstClass.id, {
      students: [{ studentNo: '1001', name: '张三', cardCode: 'C001' }]
    });
    const result = await service.importStudents(secondClass.id, {
      students: [{ studentNo: '2001', name: '李四', cardCode: 'C001' }]
    });

    expect(result).toMatchObject({ importedCount: 1, failedCount: 0 });
    expect(await service.findStudentByCard(firstClass.id, 'C001')).toMatchObject({ studentNo: '1001' });
    expect(await service.findStudentByCard(secondClass.id, 'C001')).toMatchObject({ studentNo: '2001' });
  });

  it('支持班级和学生的修改删除', async () => {
    const service = createService();
    const createdClass = await service.createClass({ grade: '七年级', name: '1班' });
    const createdStudent = await service.createStudent(createdClass.id, {
      studentNo: '20260101',
      name: '张三',
      cardCode: 'C001',
      status: 'active'
    });

    expect(await service.updateClass(createdClass.id, { grade: '八年级', name: '2班' })).toMatchObject({
      grade: '八年级',
      name: '2班'
    });
    expect(createdStudent.displayName).toBe('张三');
    expect(await service.updateStudent(createdStudent.id, {
      studentNo: '20260109',
      name: '张小三',
      cardCode: 'C009',
      status: 'active'
    })).toMatchObject({
      studentNo: '20260109',
      displayName: '张小三',
      cardCode: 'C009'
    });

    expect(await service.deleteStudent(createdStudent.id)).toEqual({ deleted: true });
    expect(await service.listStudents(createdClass.id)).toHaveLength(0);
    expect(await service.deleteClass(createdClass.id)).toEqual({ deleted: true });
    expect(await service.listClasses()).toHaveLength(0);
  });
});
