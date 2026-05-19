<script setup lang="ts">
import { reactive, ref } from 'vue';
import { ImagePlus, Plus } from 'lucide-vue-next';
import { api } from '../../api';
import { readFileAsDataUrl } from '../../camera-frame';
import { createEmptyQuestionDraft, toQuestionPayload, type QuestionDraft } from '../../question-form';
import type { AiGeneratedQuestionItem, CreateQuestionPayload, QuestionView } from '../../types';
import { aiFailureMessage, successMessage, thinkingMessage, type AiQuestionAction } from '../../../../../packages/ai-question-feedback';
import './question-creator.css';

const props = defineProps<{ subject: string; grade: string }>();
const emit = defineEmits<{ saved: [question: QuestionView] }>();
const mode = ref<'manual' | 'image' | 'text'>('manual');
const loading = ref(false);
const failed = ref('');
const notice = ref('AI 生成题目需确认后才会加入题库。');
const imageInput = ref<HTMLInputElement | null>(null);
const candidates = ref<AiGeneratedQuestionItem[]>([]);
const draft = reactive(createEmptyQuestionDraft());
const params = reactive({ difficulty: '基础', count: 1, knowledgePoint: '', description: '', instruction: '' });

async function saveManual(): Promise<void> {
  await runAction(async () => {
    draft.subject = props.subject;
    draft.grade = props.grade;
    const saved = await api.createQuestion(toQuestionPayload(draft));
    Object.assign(draft, createEmptyQuestionDraft(props.subject, props.grade));
    emit('saved', saved);
    notice.value = successMessage('manual');
  }, 'manual');
}

async function generateText(): Promise<void> {
  await runAction(async () => {
    if (!params.knowledgePoint.trim() && !params.description.trim()) throw new Error('请填写知识点或文本描述');
    const result = await api.generateQuestions({
      subject: props.subject,
      grade: props.grade,
      knowledgePoint: params.knowledgePoint || '教师描述',
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
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  await runAction(async () => {
    const result = await api.recognizeQuestionImageCandidates({
      imageDataUrl: await readFileAsDataUrl(file),
      subject: props.subject,
      grade: props.grade,
      difficulty: params.difficulty,
      count: params.count,
      instruction: params.instruction
    });
    candidates.value = normalizeCandidates(result.items?.length ? result.items : result.item ? [result.item] : []);
    notice.value = successMessage('image', candidates.value.length);
  }, 'image');
}

async function confirmCandidate(index: number): Promise<void> {
  await runAction(async () => {
    const saved = await api.createQuestion(toPayload(candidates.value[index]));
    candidates.value.splice(index, 1);
    emit('saved', saved);
    notice.value = '候选题已确认加入题库。';
  }, 'save');
}

function removeCandidate(index: number): void {
  candidates.value.splice(index, 1);
}

function normalizeCandidates(items: AiGeneratedQuestionItem[]): AiGeneratedQuestionItem[] {
  return items.map((item) => ({
    ...item,
    subject: item.subject || props.subject,
    grade: item.grade || props.grade,
    difficulty: ['基础', '巩固', '提升'].includes(item.difficulty) ? item.difficulty : '基础',
    knowledgePoints: item.knowledgePoints?.length ? item.knowledgePoints : [params.knowledgePoint || '课堂检测']
  }));
}

function toPayload(item: AiGeneratedQuestionItem): CreateQuestionPayload {
  if (!item.stem || !item.options.A || !item.options.B || !item.options.C || !item.options.D) throw new Error('候选题不完整');
  if (!item.explanation || !item.knowledgePoints.length) throw new Error('候选题缺少解析或知识点');
  return { subject: item.subject, grade: item.grade, stem: item.stem, options: item.options, answer: item.answer, explanation: item.explanation, knowledgePoints: item.knowledgePoints, difficulty: item.difficulty };
}

async function runAction(action: () => Promise<void>, actionType: AiQuestionAction): Promise<void> {
  failed.value = '';
  notice.value = thinkingMessage(actionType);
  loading.value = true;
  try { await action(); } catch (error) { failed.value = aiFailureMessage(error); } finally { loading.value = false; }
}
</script>

<template>
  <section class="panel">
    <div class="section-title"><h2>新增题目</h2><p :class="{ error: failed }">{{ failed || notice }}</p></div>
    <div v-if="loading" class="ai-status"><span></span>{{ notice }}</div>
    <div class="creator-tabs">
      <button type="button" :class="{ active: mode === 'manual' }" @click="mode = 'manual'"><Plus :size="17" />手动</button>
      <button type="button" :class="{ active: mode === 'image' }" @click="mode = 'image'"><ImagePlus :size="17" />拍照 AI</button>
      <button type="button" :class="{ active: mode === 'text' }" @click="mode = 'text'">描述生成</button>
    </div>
    <template v-if="mode === 'manual'">
      <textarea v-model="draft.stem" rows="3" placeholder="题干"></textarea>
      <div class="option-grid"><input v-model="draft.optionA" placeholder="选项 A" /><input v-model="draft.optionB" placeholder="选项 B" /><input v-model="draft.optionC" placeholder="选项 C" /><input v-model="draft.optionD" placeholder="选项 D" /></div>
      <label>正确答案<select v-model="draft.answer"><option>A</option><option>B</option><option>C</option><option>D</option></select></label>
      <input v-model="draft.knowledgeText" placeholder="知识点，多个用逗号分隔" />
      <textarea v-model="draft.explanation" rows="2" placeholder="解析"></textarea>
      <button type="button" :disabled="loading" @click="saveManual">校验并加入题库</button>
    </template>
    <template v-else>
      <div class="candidate-grid"><select v-model="params.difficulty"><option>基础</option><option>巩固</option><option>提升</option></select><input v-model.number="params.count" type="number" min="1" max="5" placeholder="数量" /></div>
      <textarea v-if="mode === 'text'" v-model="params.knowledgePoint" rows="2" placeholder="知识点"></textarea>
      <textarea v-if="mode === 'text'" v-model="params.description" rows="3" placeholder="文本或口述转写内容"></textarea>
      <textarea v-if="mode === 'image'" v-model="params.instruction" rows="2" placeholder="拍照补充要求，可为空"></textarea>
      <div class="creator-actions"><button v-if="mode === 'text'" type="button" :disabled="loading" @click="generateText">AI 生成候选题</button><button v-if="mode === 'image'" type="button" :disabled="loading" @click="imageInput?.click()">拍照/上传识别</button></div>
    </template>
    <div v-if="candidates.length" class="candidate-list">
      <article v-for="(item, index) in candidates" :key="index" class="candidate-card">
        <h3>候选题 {{ index + 1 }}</h3>
        <textarea v-model="item.stem" rows="3" placeholder="题干"></textarea>
        <div class="candidate-grid"><input v-model="item.options.A" placeholder="A" /><input v-model="item.options.B" placeholder="B" /><input v-model="item.options.C" placeholder="C" /><input v-model="item.options.D" placeholder="D" /></div>
        <div class="candidate-grid"><select v-model="item.answer"><option>A</option><option>B</option><option>C</option><option>D</option></select><select v-model="item.difficulty"><option>基础</option><option>巩固</option><option>提升</option></select></div>
        <textarea v-model="item.explanation" rows="2" placeholder="解析"></textarea>
        <input :value="item.knowledgePoints.join('，')" placeholder="知识点" @input="item.knowledgePoints = ($event.target as HTMLInputElement).value.split(/[，,]/).map((value) => value.trim()).filter(Boolean)" />
        <div class="creator-actions"><button type="button" @click="confirmCandidate(index)">确认加入并选用</button><button type="button" class="secondary" @click="removeCandidate(index)">删除</button></div>
      </article>
    </div>
    <input ref="imageInput" class="hidden-file" type="file" accept="image/*" capture="environment" @change="handleImage" />
  </section>
</template>
