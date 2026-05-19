<script setup lang="ts">
import { computed } from 'vue';
import { ArrowRight, Camera, FileText, RefreshCw } from 'lucide-vue-next';
import type { OptionKey, QuestionParticipantView, QuestionStatsView, QuestionView } from '../types';
import './result-analysis.css';

const props = defineProps<{
  question: QuestionView;
  stats: QuestionStatsView | null;
  participants: QuestionParticipantView[];
  canGoNext: boolean;
  loading?: boolean;
}>();

const emit = defineEmits<{
  refresh: [];
  rescan: [];
  nextQuestion: [];
  openReport: [];
  newRun: [];
}>();

const optionKeys: OptionKey[] = ['A', 'B', 'C', 'D'];

const total = computed(() => props.stats?.total ?? props.participants.length);
const answered = computed(() => props.stats?.answered ?? props.participants.filter((item) => item.answered).length);
const correct = computed(() => props.participants.filter((item) => item.isCorrect).length);
const wrongParticipants = computed(() =>
  props.participants.filter((item) => item.answered && item.isCorrect === false)
);
const unansweredParticipants = computed(() => props.participants.filter((item) => !item.answered));
const correctParticipants = computed(() => props.participants.filter((item) => item.isCorrect));
const correctPercent = computed(() => Math.round((props.stats?.correctRate ?? 0) * 100));
const completionPercent = computed(() => total.value ? Math.round((answered.value / total.value) * 100) : 0);
const topWrongOption = computed(() => {
  const entries = optionKeys
    .filter((key) => key !== props.question.answer)
    .map((key) => ({ key, count: props.stats?.optionStats[key] ?? 0 }))
    .sort((a, b) => b.count - a.count);
  return entries[0]?.count ? entries[0] : null;
});
const suggestion = computed(() => {
  if (!answered.value) {
    return '先继续扫码，收齐更多答案后再判断讲解重点。';
  }
  if (correctPercent.value < 60) {
    return '建议暂停进入讲解，先请答错学生说明思路，再回到关键知识点。';
  }
  if (wrongParticipants.value.length) {
    return '可以针对答错名单做快速追问，确认是概念误解还是审题失误。';
  }
  return '本题掌握较好，可以进入下一题或安排更高阶追问。';
});

function optionPercent(key: OptionKey): number {
  const count = props.stats?.optionStats[key] ?? 0;
  return answered.value ? Math.round((count / answered.value) * 100) : 0;
}

function studentAnswerText(item: QuestionParticipantView): string {
  if (!item.answered) {
    return '未答';
  }
  return `选 ${item.selectedOption ?? '-'}，正确答案 ${props.question.answer}`;
}
</script>

<template>
  <section class="analysis-hero">
    <div>
      <p>扫码结果分析</p>
      <h2>{{ question.stem }}</h2>
    </div>
    <button type="button" class="icon-button" :disabled="loading" @click="emit('refresh')">
      <RefreshCw :size="18" />
    </button>
  </section>

  <section class="analysis-metrics">
    <div>
      <span>正确率</span>
      <strong>{{ correctPercent }}%</strong>
    </div>
    <div>
      <span>完成度</span>
      <strong>{{ completionPercent }}%</strong>
    </div>
    <div>
      <span>答错</span>
      <strong>{{ wrongParticipants.length }}</strong>
    </div>
    <div>
      <span>未答</span>
      <strong>{{ unansweredParticipants.length }}</strong>
    </div>
  </section>

  <section class="panel option-analysis">
    <div class="analysis-title">
      <h2>选项分布</h2>
      <span>正确答案 {{ question.answer }}</span>
    </div>
    <div class="option-bars">
      <div v-for="key in optionKeys" :key="key" class="option-row" :class="{ correct: key === question.answer }">
        <b>{{ key }}</b>
        <div class="bar-track"><i :style="{ width: `${optionPercent(key)}%` }"></i></div>
        <span>{{ stats?.optionStats[key] ?? 0 }} 人</span>
      </div>
    </div>
    <p class="analysis-note">
      {{ topWrongOption ? `主要干扰项是 ${topWrongOption.key}，共有 ${topWrongOption.count} 人选择。` : suggestion }}
    </p>
  </section>

  <section class="panel group-list wrong">
    <h2>答错 {{ wrongParticipants.length }} 人</h2>
    <div class="student-list">
      <span v-for="item in wrongParticipants" :key="item.studentId">
        <b>{{ item.displayName }}</b><em>{{ studentAnswerText(item) }}</em>
      </span>
      <span v-if="!wrongParticipants.length">暂无答错学生</span>
    </div>
  </section>

  <section class="panel group-list missing">
    <h2>未答 {{ unansweredParticipants.length }} 人</h2>
    <div class="student-list">
      <span v-for="item in unansweredParticipants" :key="item.studentId">
        <b>{{ item.displayName }}</b><em>{{ item.cardCode }}</em>
      </span>
      <span v-if="!unansweredParticipants.length">已全部完成</span>
    </div>
  </section>

  <section class="panel group-list">
    <h2>答对 {{ correct }} 人</h2>
    <div class="student-list">
      <span v-for="item in correctParticipants" :key="item.studentId">
        <b>{{ item.displayName }}</b><em>{{ studentAnswerText(item) }}</em>
      </span>
      <span v-if="!correctParticipants.length">暂无答对记录</span>
    </div>
  </section>

  <section class="panel teaching-action">
    <h2>课堂处理建议</h2>
    <p>{{ suggestion }}</p>
  </section>

  <section class="analysis-actions">
    <button type="button" class="secondary" @click="emit('rescan')"><Camera :size="18" />继续扫码</button>
    <button type="button" :disabled="!canGoNext" @click="emit('nextQuestion')"><ArrowRight :size="18" />下一题</button>
    <button type="button" class="secondary full" @click="emit('openReport')"><FileText :size="18" />整堂课累计报告</button>
    <button type="button" class="full" @click="emit('newRun')">新增测试</button>
  </section>
</template>
