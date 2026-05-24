<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { api, toChineseError } from '../api/client';
import { downloadExcel, readCell, readExcelRows, type ExcelRow } from '../excel';
import type { CreateQuestionPayload, QuestionView } from '../types';
import AiQuestionPanel from './question-bank/AiQuestionPanel.vue';
import './management.css';

const emit = defineEmits<{ questionReady: [questionId: string] }>();
const questions = ref<QuestionView[]>([]);
const selectedQuestionId = ref('');
const editorOpen = ref(false);
const knowledgeText = ref('');
const message = ref('题库列表支持筛选、Excel 导入导出和模板下载。');
const failed = ref('');
const importInput = ref<HTMLInputElement | null>(null);
const filters = reactive({ keyword: '', subject: '', grade: '', difficulty: '' });
const form = reactive<CreateQuestionPayload>({
  subject: '数学',
  grade: '七年级',
  stem: '',
  options: { A: '', B: '', C: '', D: '' },
  answer: 'A',
  explanation: '',
  knowledgePoints: [''],
  difficulty: '基础'
});

const subjects = computed(() => uniqueOptions(questions.value.map((question) => question.subject)));
const grades = computed(() => uniqueOptions(questions.value.map((question) => question.grade)));
const filteredQuestions = computed(() => questions.value.filter((question) => {
  const keyword = filters.keyword.trim().toLowerCase();
  const matchesKeyword = !keyword || [
    question.stem,
    question.explanation ?? '',
    ...(question.knowledgePoints ?? [])
  ].some((value) => value.toLowerCase().includes(keyword));
  return matchesKeyword
    && (!filters.subject || question.subject === filters.subject)
    && (!filters.grade || question.grade === filters.grade)
    && (!filters.difficulty || question.difficulty === filters.difficulty);
}));

onMounted(() => void refreshQuestions());

async function refreshQuestions(): Promise<void> {
  questions.value = await api.listQuestions();
}

function selectQuestion(question: QuestionView): void {
  editorOpen.value = true;
  selectedQuestionId.value = question.id;
  form.subject = question.subject ?? '数学';
  form.grade = question.grade ?? '七年级';
  form.stem = question.stem;
  form.options = { ...question.options };
  form.answer = question.answer;
  form.explanation = question.explanation ?? '';
  form.knowledgePoints = question.knowledgePoints?.length ? [...question.knowledgePoints] : [''];
  knowledgeText.value = form.knowledgePoints.join('，');
  form.difficulty = question.difficulty ?? '基础';
  emit('questionReady', question.id);
}

async function saveQuestion(): Promise<void> {
  await runAction(async () => {
    const payload = normalizeQuestion();
    const saved = selectedQuestionId.value
      ? await api.updateQuestion(selectedQuestionId.value, payload)
      : await api.createQuestion(payload);
    await refreshQuestions();
    selectQuestion(saved);
    message.value = '题目已保存。';
  });
}

async function handleAiSaved(count: number): Promise<void> {
  await refreshQuestions();
  message.value = `AI 候选题已确认入库 ${count} 道。`;
}

async function removeQuestion(questionId: string): Promise<void> {
  await runAction(async () => {
    await api.deleteQuestion(questionId);
    selectedQuestionId.value = '';
    await refreshQuestions();
    message.value = '题目已删除。';
  });
}

async function importQuestions(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) {
    return;
  }
  await runAction(async () => {
    const rows = await readExcelRows(file);
    const result = await api.importQuestions(rows.map(toQuestionPayload));
    await refreshQuestions();
    message.value = `已从 Excel 导入 ${result.importedCount} 道题。`;
  });
}

function exportQuestions(): void {
  downloadExcel('题库列表.xlsx', '题库列表', filteredQuestions.value.map((question) => ({
    学科: question.subject ?? '',
    年级: question.grade ?? '',
    题干: question.stem,
    选项A: question.options.A,
    选项B: question.options.B,
    选项C: question.options.C,
    选项D: question.options.D,
    正确答案: question.answer,
    解析: question.explanation ?? '',
    知识点: question.knowledgePoints?.join('，') ?? '',
    难度: question.difficulty ?? '基础'
  })));
}

function downloadTemplate(): void {
  downloadExcel('题库导入模板.xlsx', '题目模板', [{
    学科: '数学',
    年级: '七年级',
    题干: '测试题',
    选项A: 'A选项',
    选项B: 'B选项',
    选项C: 'C选项',
    选项D: 'D选项',
    正确答案: 'A',
    解析: '解析内容',
    知识点: '知识点1，知识点2',
    难度: '基础'
  }]);
}

function resetForm(): void {
  editorOpen.value = true;
  selectedQuestionId.value = '';
  form.subject = '数学';
  form.grade = '七年级';
  form.stem = '';
  form.options = { A: '', B: '', C: '', D: '' };
  form.answer = 'A';
  form.explanation = '';
  knowledgeText.value = '';
  form.difficulty = '基础';
}

function closeEditor(): void {
  editorOpen.value = false;
  resetForm();
  editorOpen.value = false;
}

function normalizeQuestion(): CreateQuestionPayload {
  const knowledgePoints = splitKnowledge(knowledgeText.value);
  if (!knowledgePoints.length) {
    throw new Error('请至少填写一个知识点');
  }
  return { ...form, knowledgePoints };
}

function toQuestionPayload(row: ExcelRow): CreateQuestionPayload {
  const answer = readCell(row, ['正确答案', '答案', 'answer']);
  const difficulty = readCell(row, ['难度', 'difficulty']) || '基础';
  const payload: CreateQuestionPayload = {
    subject: readCell(row, ['学科', 'subject']),
    grade: readCell(row, ['年级', 'grade']),
    stem: readCell(row, ['题干', 'stem']),
    options: {
      A: readCell(row, ['选项A', 'A']),
      B: readCell(row, ['选项B', 'B']),
      C: readCell(row, ['选项C', 'C']),
      D: readCell(row, ['选项D', 'D'])
    },
    answer: answer as CreateQuestionPayload['answer'],
    explanation: readCell(row, ['解析', 'explanation']),
    knowledgePoints: splitKnowledge(readCell(row, ['知识点', 'knowledgePoints'])),
    difficulty: difficulty as CreateQuestionPayload['difficulty']
  };
  if (!payload.subject || !payload.grade || !payload.stem || !payload.explanation) {
    throw new Error('题库模板必须包含学科、年级、题干、解析');
  }
  return payload;
}

function splitKnowledge(value: string): string[] {
  return value.split(/[，,]/).map((item) => item.trim()).filter(Boolean);
}

function clearFilters(): void {
  filters.keyword = '';
  filters.subject = '';
  filters.grade = '';
  filters.difficulty = '';
}

function uniqueOptions(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort();
}

async function runAction(action: () => Promise<void>): Promise<void> {
  failed.value = '';
  try {
    await action();
  } catch (error) {
    failed.value = toChineseError(error);
  }
}
</script>

<template>
  <section class="list-page">
    <header class="page-card page-heading">
      <div><h3>题库管理</h3><p :class="{ error: failed }">{{ failed || message }}</p></div>
      <div class="toolbar">
        <button type="button" class="secondary" @click="downloadTemplate">下载模板</button>
        <button type="button" class="secondary" @click="importInput?.click()">导入 Excel</button>
        <button type="button" class="secondary" @click="exportQuestions">导出 Excel</button>
      </div>
    </header>
    <div class="summary-strip">
      <div><span>题目总数</span><strong>{{ questions.length }}</strong></div>
      <div><span>筛选结果</span><strong>{{ filteredQuestions.length }}</strong></div>
      <div><span>学科数</span><strong>{{ subjects.length }}</strong></div>
    </div>

    <AiQuestionPanel @saved="handleAiSaved" />

    <article class="page-card">
      <div class="table-title"><h4>筛选题目</h4><p>共 {{ questions.length }} 道，显示 {{ filteredQuestions.length }} 道</p></div>
      <div class="form-row">
        <input v-model="filters.keyword" placeholder="搜索题干、解析、知识点" />
        <select v-model="filters.subject"><option value="">全部学科</option><option v-for="subject in subjects" :key="subject">{{ subject }}</option></select>
        <select v-model="filters.grade"><option value="">全部年级</option><option v-for="grade in grades" :key="grade">{{ grade }}</option></select>
        <select v-model="filters.difficulty"><option value="">全部难度</option><option>基础</option><option>巩固</option><option>提升</option></select>
        <button type="button" class="secondary" @click="clearFilters">清空</button>
      </div>
    </article>

    <article class="page-card">
      <div class="table-title"><h4>题目列表</h4><button type="button" @click="resetForm">新增题目</button></div>
      <table>
        <thead><tr><th>学科</th><th>年级</th><th>难度</th><th>题干</th><th>知识点</th><th>答案</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="question in filteredQuestions" :key="question.id">
            <td>{{ question.subject }}</td><td>{{ question.grade }}</td><td>{{ question.difficulty }}</td><td class="text-cell">{{ question.stem }}</td>
            <td>{{ question.knowledgePoints?.join('，') }}</td><td>{{ question.answer }}</td>
            <td><button type="button" class="text-button" @click="selectQuestion(question)">编辑/选用</button><button type="button" class="text-danger" @click="removeQuestion(question.id)">删除</button></td>
          </tr>
          <tr v-if="!filteredQuestions.length"><td colspan="7">暂无匹配题目</td></tr>
        </tbody>
      </table>
    </article>

    <article v-if="editorOpen" class="page-card">
      <div class="table-title"><h4>{{ selectedQuestionId ? '编辑题目' : '新增题目' }}</h4><button type="button" class="secondary" @click="closeEditor">收起</button></div>
      <div class="form-row">
        <input v-model="form.subject" placeholder="学科" />
        <input v-model="form.grade" placeholder="年级" />
        <select v-model="form.difficulty"><option>基础</option><option>巩固</option><option>提升</option></select>
        <select v-model="form.answer"><option>A</option><option>B</option><option>C</option><option>D</option></select>
        <input v-model="knowledgeText" placeholder="知识点，多个用逗号分隔" />
      </div>
      <textarea v-model="form.stem" rows="3" placeholder="题干" />
      <div class="form-row option-row">
        <input v-model="form.options.A" placeholder="选项 A" /><input v-model="form.options.B" placeholder="选项 B" />
        <input v-model="form.options.C" placeholder="选项 C" /><input v-model="form.options.D" placeholder="选项 D" />
      </div>
      <textarea v-model="form.explanation" rows="2" placeholder="解析" />
      <button type="button" @click="saveQuestion">{{ selectedQuestionId ? '保存修改' : '新增题目' }}</button>
    </article>
    <input ref="importInput" class="hidden-file" type="file" accept=".xlsx,.xls" @change="importQuestions" />
  </section>
</template>
