<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { api } from '../api/client';
import { downloadClassCardsPdf } from '../card-pdf';
import { downloadExcel, readCell, readExcelRows, type ExcelRow } from '../excel';
import type { ClassView, StudentImportItem, StudentView, UpdateStudentPayload } from '../types';
import './management.css';

const emit = defineEmits<{ classReady: [classId: string] }>();
const classes = ref<ClassView[]>([]);
const students = ref<StudentView[]>([]);
const selectedClassId = ref('');
const editingStudentId = ref('');
const studentKeyword = ref('');
const message = ref('请选择班级后维护学生名单。');
const failed = ref('');
const pdfLoading = ref(false);
const classImportInput = ref<HTMLInputElement | null>(null);
const studentImportInput = ref<HTMLInputElement | null>(null);
const classForm = reactive({ grade: '七年级', name: '' });
const studentForm = reactive<UpdateStudentPayload>({
  studentNo: '', name: '', cardCode: '', status: 'active'
});

const selectedClass = computed(() => classes.value.find((item) => item.id === selectedClassId.value));
const activeStudentCount = computed(() => students.value.filter((student) => student.status === 'active').length);
const filteredStudents = computed(() => {
  const keyword = studentKeyword.value.trim().toLowerCase();
  if (!keyword) {
    return students.value;
  }
  return students.value.filter((student) =>
    [student.studentNo, student.displayName, student.cardCode, student.status]
      .some((value) => value.toLowerCase().includes(keyword))
  );
});
function statusLabel(status: StudentView['status']): string {
  return status === 'active' ? '启用' : '停用';
}

onMounted(() => void refreshClasses());

async function refreshClasses(): Promise<void> {
  classes.value = await api.listClasses();
}

async function selectClass(classId: string): Promise<void> {
  selectedClassId.value = classId;
  emit('classReady', classId);
  students.value = await api.listStudents(classId);
  const current = classes.value.find((item) => item.id === classId);
  if (current) {
    classForm.grade = current.grade;
    classForm.name = current.name;
  }
}

async function saveClass(): Promise<void> {
  await runAction(async () => {
    const saved = selectedClassId.value
      ? await api.updateClass(selectedClassId.value, classForm)
      : await api.createClass(classForm);
    await refreshClasses();
    await selectClass(saved.id);
    classForm.name = '';
    message.value = `已保存 ${saved.grade}${saved.name}`;
  });
}

async function removeClass(classId: string): Promise<void> {
  await runAction(async () => {
    await api.deleteClass(classId);
    if (selectedClassId.value === classId) {
      selectedClassId.value = '';
      students.value = [];
      resetStudentForm();
    }
    await refreshClasses();
    message.value = '班级已删除。';
  });
}

async function saveStudent(): Promise<void> {
  await runAction(async () => {
    if (!selectedClassId.value) {
      throw new Error('请先选择班级');
    }
    const wasEditing = Boolean(editingStudentId.value);
    if (wasEditing) {
      await api.updateStudent(selectedClassId.value, editingStudentId.value, studentForm);
    } else {
      await api.createStudent(selectedClassId.value, studentForm);
    }
    students.value = await api.listStudents(selectedClassId.value);
    resetStudentForm();
    message.value = wasEditing ? '学生信息已更新。' : '学生已新增。';
  });
}

function editStudent(student: StudentView): void {
  editingStudentId.value = student.id;
  studentForm.studentNo = student.studentNo;
  studentForm.name = student.displayName;
  studentForm.cardCode = student.cardCode;
  studentForm.status = student.status;
}

async function removeStudent(studentId: string): Promise<void> {
  await runAction(async () => {
    await api.deleteStudent(selectedClassId.value, studentId);
    students.value = await api.listStudents(selectedClassId.value);
    resetStudentForm();
    message.value = '学生已删除。';
  });
}

async function importClasses(event: Event): Promise<void> {
  await runFileAction(event, async (file) => {
    const rows = await readExcelRows(file);
    for (const row of rows) {
      const grade = readCell(row, ['年级', 'grade']);
      const name = readCell(row, ['班级名称', '班级', 'name']);
      if (grade && name) {
        await api.createClass({ grade, name });
      }
    }
    await refreshClasses();
    message.value = `已导入 ${rows.length} 个班级。`;
  });
}

async function importStudents(event: Event): Promise<void> {
  await runFileAction(event, async (file) => {
    if (!selectedClassId.value) {
      throw new Error('请先选择班级');
    }
    const rows = await readExcelRows(file);
    const items = rows.map(toStudentImportItem);
    const result = await api.importStudents(selectedClassId.value, items);
    students.value = await api.listStudents(selectedClassId.value);
    message.value = `学生导入成功 ${result.importedCount} 人，失败 ${result.failedCount} 行。`;
  });
}

function exportClasses(): void {
  downloadExcel('班级列表.xlsx', '班级列表', classes.value.map((item) => ({
    年级: item.grade,
    班级名称: item.name
  })));
}

function exportStudents(): void {
  const className = selectedClass.value ? `${selectedClass.value.grade}${selectedClass.value.name}` : '学生列表';
  downloadExcel(`${className}.xlsx`, '学生列表', filteredStudents.value.map((student) => ({
    学号: student.studentNo,
    姓名: student.displayName,
    答题卡编号: student.cardCode,
    状态: statusLabel(student.status)
  })));
}

function downloadClassTemplate(): void {
  downloadExcel('班级导入模板.xlsx', '班级模板', [{ 年级: '七年级', 班级名称: '1班' }]);
}

function downloadStudentTemplate(): void {
  downloadExcel('学生导入模板.xlsx', '学生模板', [
    { 学号: '20260101', 姓名: '张三', 答题卡编号: 'C001' }
  ]);
}

async function downloadCardsPdf(): Promise<void> {
  await runAction(async () => {
    if (!selectedClass.value) throw new Error('请先选择班级');
    if (!students.value.length) throw new Error('当前班级暂无学生');
    pdfLoading.value = true;
    await downloadClassCardsPdf(selectedClass.value, students.value);
    message.value = '答题码 PDF 已生成。';
  }, () => { pdfLoading.value = false; });
}

function toStudentImportItem(row: ExcelRow): StudentImportItem {
  const studentNo = readCell(row, ['学号', 'studentNo']);
  const name = readCell(row, ['姓名', 'name']);
  const cardCode = readCell(row, ['答题卡编号', '卡号', 'cardCode']);
  if (!studentNo || !name || !cardCode) {
    throw new Error('学生模板必须包含学号、姓名、答题卡编号');
  }
  return { studentNo, name, cardCode };
}

async function runFileAction(event: Event, action: (file: File) => Promise<void>): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) {
    return;
  }
  await runAction(() => action(file));
}

async function runAction(action: () => Promise<void>, done?: () => void): Promise<void> {
  failed.value = '';
  try {
    await action();
  } catch (error) {
    failed.value = error instanceof Error ? error.message : String(error);
  } finally {
    done?.();
  }
}

function newClass(): void {
  selectedClassId.value = '';
  classForm.grade = '七年级';
  classForm.name = '';
  students.value = [];
  resetStudentForm();
}

function resetStudentForm(): void {
  editingStudentId.value = '';
  studentForm.studentNo = '';
  studentForm.name = '';
  studentForm.cardCode = '';
  studentForm.status = 'active';
}
</script>

<template>
  <section class="list-page">
    <header class="page-card page-heading">
      <div><h3>班级与学生</h3><p :class="{ error: failed }">{{ failed || message }}</p></div>
      <div class="toolbar">
        <button type="button" class="secondary" @click="downloadClassTemplate">班级模板</button>
        <button type="button" class="secondary" @click="classImportInput?.click()">导入班级</button>
        <button type="button" class="secondary" @click="exportClasses">导出班级</button>
      </div>
    </header>
    <div class="summary-strip">
      <div><span>班级数</span><strong>{{ classes.length }}</strong></div>
      <div><span>当前班级学生</span><strong>{{ students.length }}</strong></div>
      <div><span>启用学生</span><strong>{{ activeStudentCount }}</strong></div>
    </div>

    <article class="page-card">
      <div class="table-title"><h4>班级列表</h4><button type="button" @click="newClass">新建班级</button></div>
      <div class="form-row compact">
        <input v-model="classForm.grade" placeholder="年级" />
        <input v-model="classForm.name" placeholder="班级名称" />
        <button type="button" @click="saveClass">{{ selectedClassId ? '保存班级' : '新增班级' }}</button>
      </div>
      <table>
        <thead><tr><th>年级</th><th>班级</th><th>学生数</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="item in classes" :key="item.id" :class="{ selected: item.id === selectedClassId }">
            <td>{{ item.grade }}</td><td>{{ item.name }}</td><td>{{ item.id === selectedClassId ? students.length : '-' }}</td>
            <td><button type="button" class="text-button" @click="selectClass(item.id)">选择</button><button type="button" class="text-danger" @click="removeClass(item.id)">删除</button></td>
          </tr>
          <tr v-if="!classes.length"><td colspan="4">暂无班级数据</td></tr>
        </tbody>
      </table>
    </article>

    <article class="page-card">
      <div class="table-title">
        <div><h4>学生列表</h4><p>{{ selectedClass ? `${selectedClass.grade}${selectedClass.name}` : '请先选择班级' }}</p></div>
        <div class="toolbar">
          <input v-model="studentKeyword" placeholder="搜索学号、姓名、卡号" />
          <button type="button" class="secondary" @click="downloadStudentTemplate">学生模板</button>
          <button type="button" class="secondary" @click="studentImportInput?.click()">导入学生</button>
          <button type="button" class="secondary" @click="exportStudents">导出学生</button>
          <button type="button" class="secondary" :disabled="!selectedClass || pdfLoading" @click="downloadCardsPdf">{{ pdfLoading ? '生成中' : '下载码 PDF' }}</button>
        </div>
      </div>
      <div class="form-row">
        <input v-model="studentForm.studentNo" placeholder="学号" />
        <input v-model="studentForm.name" placeholder="姓名" />
        <input v-model="studentForm.cardCode" placeholder="答题卡编号 C001" />
        <select v-model="studentForm.status"><option value="active">启用</option><option value="disabled">停用</option></select>
        <button type="button" @click="saveStudent">{{ editingStudentId ? '保存学生' : '新增学生' }}</button>
        <button v-if="editingStudentId" type="button" class="secondary" @click="resetStudentForm">取消</button>
      </div>
      <table>
        <thead><tr><th>学号</th><th>姓名</th><th>答题卡编号</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="student in filteredStudents" :key="student.id">
            <td>{{ student.studentNo }}</td><td>{{ student.displayName }}</td><td>{{ student.cardCode }}</td><td><span class="status-pill" :class="student.status">{{ statusLabel(student.status) }}</span></td>
            <td><button type="button" class="text-button" @click="editStudent(student)">编辑</button><button type="button" class="text-danger" @click="removeStudent(student.id)">删除</button></td>
          </tr>
          <tr v-if="!filteredStudents.length"><td colspan="5">暂无学生数据</td></tr>
        </tbody>
      </table>
    </article>
    <input ref="classImportInput" class="hidden-file" type="file" accept=".xlsx,.xls" @change="importClasses" />
    <input ref="studentImportInput" class="hidden-file" type="file" accept=".xlsx,.xls" @change="importStudents" />
  </section>
</template>
