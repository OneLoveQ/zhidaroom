<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { BarChart3, Plus, X } from 'lucide-vue-next';
import type { QuestionReportItem, SessionReportView } from '../types';
import './run-summary.css';

const props = defineProps<{
  report: SessionReportView;
  runId: string;
  runTitle: string;
  runCount: number;
  loading?: boolean;
}>();

const emit = defineEmits<{
  newRun: [];
  openSessionReport: [];
  refresh: [];
}>();

const selectedRunId = ref(props.runId);
const selectedQuestion = ref<QuestionReportItem | null>(null);
const runGroups = computed(() => {
  const groups = new Map<string, { id: string; title: string; questions: QuestionReportItem[] }>();
  props.report.questions.forEach((item, index) => {
    const id = item.runId ?? `legacy-${index}`;
    const group = groups.get(id) ?? {
      id,
      title: item.runTitle || `第 ${groups.size + 1} 次评测`,
      questions: []
    };
    group.questions.push(item);
    groups.set(id, group);
  });
  return Array.from(groups.values());
});
const selectedRun = computed(() =>
  runGroups.value.find((item) => item.id === selectedRunId.value) ?? runGroups.value.at(-1)
);
const questions = computed(() => selectedRun.value?.questions ?? []);
const averageCorrectRate = computed(() => {
  if (!questions.value.length) return 0;
  const total = questions.value.reduce((sum, item) => sum + item.stats.correctRate, 0);
  return Math.round((total / questions.value.length) * 100);
});
const answeredCount = computed(() => questions.value.reduce((sum, item) => sum + item.stats.answered, 0));
const weakQuestions = computed(() => questions.value.filter((item) => item.stats.correctRate < 0.7));
watch(() => props.runId, (runId) => { selectedRunId.value = runId; });
</script>

<template>
  <section class="run-summary-hero">
    <div>
      <p>本轮测试综合情况</p>
      <h2>{{ selectedRun?.title || runTitle }}</h2>
    </div>
    <button type="button" class="secondary" :disabled="loading" @click="emit('refresh')">刷新</button>
  </section>

  <section v-if="runGroups.length > 1" class="panel run-switcher">
    <h2>历史评测</h2>
    <button v-for="(run, index) in runGroups" :key="run.id" type="button" :class="{ selected: run.id === selectedRun?.id }" @click="selectedRunId = run.id">
      <span>第 {{ index + 1 }} 次评测</span>
      <strong>{{ run.title }}</strong>
    </button>
  </section>

  <section class="analysis-actions">
    <button type="button" @click="emit('newRun')"><Plus :size="18" />新增测试</button>
    <button v-if="runCount > 1" type="button" class="secondary" @click="emit('openSessionReport')">
      <BarChart3 :size="18" />整堂分析
    </button>
  </section>

  <section class="run-summary-metrics">
    <div><span>本轮正确率</span><strong>{{ averageCorrectRate }}%</strong></div>
    <div><span>题目数</span><strong>{{ questions.length }}</strong></div>
    <div><span>作答次数</span><strong>{{ answeredCount }}</strong></div>
  </section>

  <section class="panel run-question-list">
    <h2>逐题情况</h2>
    <article v-for="(item, index) in questions" :key="`${item.runId}-${item.questionId}`" role="button" tabindex="0" @click="selectedQuestion = item" @keydown.enter="selectedQuestion = item">
      <header>
        <b>第 {{ index + 1 }} 题</b>
        <span>{{ Math.round(item.stats.correctRate * 100) }}%</span>
      </header>
      <p>{{ item.stem }}</p>
      <small>{{ item.evidence }}</small>
      <em>{{ item.explanation }}</em>
    </article>
  </section>

  <section v-if="weakQuestions.length" class="panel run-question-list weak">
    <h2>需要讲评</h2>
    <article v-for="item in weakQuestions" :key="item.questionId">
      <p>{{ item.misconception }}</p>
      <em>{{ item.teachingSuggestion }}</em>
    </article>
  </section>

  <div v-if="selectedQuestion" class="detail-mask" @click.self="selectedQuestion = null">
    <section class="detail-dialog">
      <header>
        <div>
          <p>错答明细</p>
          <h2>{{ selectedQuestion.stem }}</h2>
        </div>
        <button type="button" class="icon-button" @click="selectedQuestion = null"><X :size="18" /></button>
      </header>
      <div class="wrong-students">
        <div v-for="item in selectedQuestion.wrongAnswers" :key="item.studentId">
          <b>{{ item.displayName }}</b>
          <span>{{ item.cardCode }} / 选择 {{ item.selectedOption }}</span>
        </div>
        <p v-if="!selectedQuestion.wrongAnswers.length">这道题没有错答学生。</p>
      </div>
    </section>
  </div>
</template>
