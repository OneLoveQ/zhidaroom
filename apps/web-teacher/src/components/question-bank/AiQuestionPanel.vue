<script setup lang="ts">
import { reactive, ref } from 'vue';
import { api } from '../../api/client';
import type { AiGeneratedQuestionItem, CreateQuestionPayload } from '../../types';
import { aiFailureMessage, successMessage, thinkingMessage, type AiQuestionAction } from '../../../../../packages/ai-question-feedback';
import './ai-question-panel.css';

const emit = defineEmits<{ saved: [count: number] }>();
const mode = ref<'manual' | 'image' | 'text'>('manual');
const loading = ref(false);
const failed = ref('');
const notice = ref('AI 生成题目必须经老师确认后才会加入题库。');
const imageInput = ref<HTMLInputElement | null>(null);
const candidates = ref<AiGeneratedQuestionItem[]>([]);
const params = reactive({
  subject: '语文',
  grade: '四年级',
  difficulty: '基础',
  count: 1,
  knowledgePoint: '',
  description: '',
  instruction: ''
});

async function generateFromText(): Promise<void> {
  await runAi(async () => {
    if (!params.knowledgePoint.trim() && !params.description.trim()) {
      throw new Error('请填写知识点或文本描述');
    }
    const result = await api.generateQuestions({
      subject: params.subject,
      grade: params.grade,
      knowledgePoint: params.knowledgePoint || '教师文本描述',
      description: params.description,
      count: params.count,
      difficulty: params.difficulty,
      questionType: 'single_choice'
    });
    candidates.value = normalizeCandidates(result.items);
    notice.value = successMessage('text', candidates.value.length);
  }, 'text');
}

async function handleImage(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  await runAi(async () => {
    const result = await api.recognizeQuestionImage({
      imageDataUrl: await readFileAsDataUrl(file),
      subject: params.subject,
      grade: params.grade,
      difficulty: params.difficulty,
      count: params.count,
      instruction: params.instruction
    });
    candidates.value = normalizeCandidates(result.items?.length ? result.items : result.item ? [result.item] : []);
    notice.value = successMessage('image', candidates.value.length);
  }, 'image');
  (event.target as HTMLInputElement).value = '';
}

async function confirmCandidate(index: number): Promise<void> {
  const item = candidates.value[index];
  await saveCandidates([item]);
  candidates.value.splice(index, 1);
}

async function confirmAll(): Promise<void> {
  await saveCandidates(candidates.value);
  candidates.value = [];
}

function removeCandidate(index: number): void {
  candidates.value.splice(index, 1);
}

async function saveCandidates(items: AiGeneratedQuestionItem[]): Promise<void> {
  await runAi(async () => {
    for (const item of items) await api.createQuestion(toQuestionPayload(item));
    emit('saved', items.length);
    notice.value = successMessage('save', items.length);
  }, 'save');
}

function toQuestionPayload(item: AiGeneratedQuestionItem): CreateQuestionPayload {
  const payload: CreateQuestionPayload = {
    subject: item.subject,
    grade: item.grade,
    stem: item.stem,
    options: item.options,
    answer: item.answer,
    explanation: item.explanation,
    knowledgePoints: item.knowledgePoints,
    difficulty: item.difficulty
  };
  if (!payload.stem || !payload.options.A || !payload.options.B || !payload.options.C || !payload.options.D) {
    throw new Error('候选题缺少题干或 ABCD 选项');
  }
  if (!payload.explanation || !payload.knowledgePoints.length) {
    throw new Error('候选题缺少解析或知识点');
  }
  return payload;
}

function normalizeCandidates(items: AiGeneratedQuestionItem[]): AiGeneratedQuestionItem[] {
  return items.map((item) => ({
    ...item,
    subject: item.subject || params.subject,
    grade: item.grade || params.grade,
    difficulty: ['基础', '巩固', '提升'].includes(item.difficulty) ? item.difficulty : '基础',
    knowledgePoints: item.knowledgePoints?.length ? item.knowledgePoints : [params.knowledgePoint || '课堂检测']
  }));
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
}

async function runAi(action: () => Promise<void>, actionType: AiQuestionAction): Promise<void> {
  failed.value = '';
  notice.value = thinkingMessage(actionType);
  loading.value = true;
  try { await action(); } catch (error) { failed.value = aiFailureMessage(error); } finally { loading.value = false; }
}
</script>

<template>
  <article class="page-card">
    <div class="table-title"><h4>新增题目</h4><p :class="{ error: failed }">{{ failed || notice }}</p></div>
    <div v-if="loading" class="ai-status"><span></span>{{ notice }}</div>
    <div class="ai-tabs">
      <button type="button" :class="{ active: mode === 'manual' }" @click="mode = 'manual'">手动输入</button>
      <button type="button" :class="{ active: mode === 'image' }" @click="mode = 'image'">拍照 + AI</button>
      <button type="button" :class="{ active: mode === 'text' }" @click="mode = 'text'">描述生成</button>
    </div>
    <div v-if="mode === 'manual'" class="candidate-card">
      <h5>手动输入</h5>
      <small>请使用下方“题目列表”的新增题目按钮录入标准 ABCD 单选题。</small>
    </div>
    <template v-else>
      <div class="form-row">
        <input v-model="params.subject" placeholder="学科" />
        <input v-model="params.grade" placeholder="年级" />
        <select v-model="params.difficulty"><option>基础</option><option>巩固</option><option>提升</option></select>
        <input v-model.number="params.count" type="number" min="1" max="5" placeholder="题目数量" />
      </div>
      <textarea v-if="mode === 'text'" v-model="params.knowledgePoint" rows="2" placeholder="知识点，例如：春风又绿江南岸中“绿”的表达效果" />
      <textarea v-if="mode === 'text'" v-model="params.description" rows="4" placeholder="文本或口述转写内容，AI 会据此生成标准 ABCD 单选题" />
      <textarea v-if="mode === 'image'" v-model="params.instruction" rows="3" placeholder="补充要求，可为空。例如：围绕图片里的知识点生成理解题" />
      <div class="candidate-actions">
        <button v-if="mode === 'text'" type="button" :disabled="loading" @click="generateFromText">AI 生成候选题</button>
        <button v-if="mode === 'image'" type="button" :disabled="loading" @click="imageInput?.click()">上传图片并识别</button>
      </div>
    </template>
    <div v-if="candidates.length" class="candidate-list">
      <div class="table-title"><h4>待确认题目</h4><button type="button" @click="confirmAll">全部确认入库</button></div>
      <section v-for="(item, index) in candidates" :key="index" class="candidate-card">
        <div class="candidate-meta">
          <input v-model="item.subject" placeholder="学科" /><input v-model="item.grade" placeholder="年级" />
          <select v-model="item.difficulty"><option>基础</option><option>巩固</option><option>提升</option></select>
          <select v-model="item.answer"><option>A</option><option>B</option><option>C</option><option>D</option></select>
        </div>
        <textarea v-model="item.stem" rows="3" placeholder="题干" />
        <div class="candidate-options">
          <input v-model="item.options.A" placeholder="选项 A" /><input v-model="item.options.B" placeholder="选项 B" />
          <input v-model="item.options.C" placeholder="选项 C" /><input v-model="item.options.D" placeholder="选项 D" />
        </div>
        <textarea v-model="item.explanation" rows="2" placeholder="解析" />
        <input :value="item.knowledgePoints.join('，')" placeholder="知识点" @input="item.knowledgePoints = ($event.target as HTMLInputElement).value.split(/[，,]/).map((value) => value.trim()).filter(Boolean)" />
        <div class="candidate-actions"><button type="button" @click="confirmCandidate(index)">确认加入题库</button><button type="button" class="secondary" @click="removeCandidate(index)">删除候选</button></div>
      </section>
    </div>
    <input ref="imageInput" class="hidden-file" type="file" accept="image/*" @change="handleImage" />
  </article>
</template>
