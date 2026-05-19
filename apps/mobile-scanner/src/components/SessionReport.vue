<script setup lang="ts">
import { computed, ref } from 'vue';
import { ArrowLeft, RefreshCw, Sparkles, X } from 'lucide-vue-next';
import type { AiDiagnosisItem, AiDiagnosisResult, SessionReportView, StudentRankingItem } from '../types';
import './session-report.css';

const props = defineProps<{
  report: SessionReportView;
  diagnosis: AiDiagnosisResult | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  back: [];
  refresh: [];
  diagnose: [];
}>();

const diagnosisMap = computed(() => {
  return new Map((props.diagnosis?.items ?? []).map((item) => [item.questionId, item]));
});
const weakQuestions = computed(() =>
  [...props.report.questions].sort((a, b) => a.stats.correctRate - b.stats.correctRate).slice(0, 3)
);
const highRiskCount = computed(() =>
  (props.diagnosis?.items ?? []).filter((item) => item.riskLevel === 'high').length
);
const averagePercent = computed(() => Math.round(props.report.averageCorrectRate * 100));
const answeredTotal = computed(() => props.report.questions.reduce((sum, item) => sum + item.stats.answered, 0));
const expectedTotal = computed(() => props.report.questions.reduce((sum, item) => sum + item.stats.total, 0));
const selectedStudent = ref<StudentRankingItem | null>(null);

function percent(value: number): number {
  return Math.round(value * 100);
}

function riskText(item?: AiDiagnosisItem): string {
  if (!item) return '待诊断';
  return { low: '低风险', medium: '中风险', high: '高风险' }[item.riskLevel];
}
</script>

<template>
  <section class="report-top">
    <button type="button" class="icon-button" @click="emit('back')"><ArrowLeft :size="18" /></button>
    <div>
      <p>整节课报告</p>
      <h2>{{ report.title }}</h2>
    </div>
    <button type="button" class="icon-button" :disabled="loading" @click="emit('refresh')"><RefreshCw :size="18" /></button>
  </section>

  <section class="report-metrics">
    <div><span>平均正确率</span><strong>{{ averagePercent }}%</strong></div>
    <div><span>题目数</span><strong>{{ report.questionCount }}</strong></div>
    <div><span>作答量</span><strong>{{ answeredTotal }}/{{ expectedTotal }}</strong></div>
    <div><span>高风险题</span><strong>{{ highRiskCount }}</strong></div>
  </section>

  <section class="panel ai-summary">
    <div>
      <h2>AI 诊断</h2>
      <p>{{ diagnosis?.notice || report.aiNotice }}</p>
    </div>
    <button type="button" :disabled="loading" @click="emit('diagnose')"><Sparkles :size="18" />生成诊断</button>
  </section>

  <section class="panel weak-list">
    <h2>优先讲评</h2>
    <article v-for="item in weakQuestions" :key="item.questionId">
      <b>{{ percent(item.stats.correctRate) }}%</b>
      <div>
        <strong>{{ item.stem }}</strong>
        <span>{{ item.evidence }}</span>
      </div>
    </article>
  </section>

  <section class="panel student-ranking-list">
    <h2>学生正确率</h2>
    <button v-for="(item, index) in report.studentRankings" :key="item.studentId" type="button" @click="selectedStudent = item">
      <b>{{ index + 1 }}</b>
      <span>{{ item.displayName }}</span>
      <em>{{ item.correctCount }}/{{ item.totalQuestionCount }}</em>
      <strong>{{ percent(item.correctRate) }}%</strong>
    </button>
  </section>

  <section class="panel question-report-list">
    <h2>逐题复盘</h2>
    <article v-for="item in report.questions" :key="item.questionId">
      <header>
        <strong>{{ item.stem }}</strong>
        <span>{{ riskText(diagnosisMap.get(item.questionId)) }}</span>
      </header>
      <div class="mini-bars">
        <i :style="{ width: `${percent(item.stats.correctRate)}%` }"></i>
      </div>
      <dl>
        <div><dt>正确率</dt><dd>{{ percent(item.stats.correctRate) }}%</dd></div>
        <div><dt>正确答案</dt><dd>{{ item.answer }}</dd></div>
        <div><dt>未答</dt><dd>{{ item.stats.unanswered }}</dd></div>
      </dl>
      <p>{{ diagnosisMap.get(item.questionId)?.mainMisconception || item.misconception }}</p>
      <p>{{ diagnosisMap.get(item.questionId)?.teachingSuggestion || item.teachingSuggestion }}</p>
    </article>
  </section>

  <div v-if="selectedStudent" class="detail-mask" @click.self="selectedStudent = null">
    <section class="detail-dialog">
      <header>
        <div>
          <p>学生作答详情</p>
          <h2>{{ selectedStudent.displayName }} · {{ percent(selectedStudent.correctRate) }}%</h2>
        </div>
        <button type="button" class="icon-button" @click="selectedStudent = null"><X :size="18" /></button>
      </header>
      <div class="student-answer-list">
        <article v-for="(answer, index) in selectedStudent.answers" :key="`${answer.runId}-${answer.questionId}`" :class="{ wrong: answer.answered && !answer.isCorrect }">
          <header>
            <b>第 {{ index + 1 }} 题</b>
            <span>{{ answer.runTitle || '本次评测' }}</span>
          </header>
          <p>{{ answer.stem }}</p>
          <small>
            {{ answer.answered ? `选择 ${answer.selectedOption}` : '未作答' }}
            / 正确答案 {{ answer.answer }}
            / {{ answer.isCorrect ? '正确' : '错误' }}
          </small>
        </article>
      </div>
    </section>
  </div>
</template>
