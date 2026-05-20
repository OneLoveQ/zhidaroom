<script setup lang="ts">
import { computed } from 'vue';
import { BarChart3, BrainCircuit, Clock3 } from 'lucide-vue-next';
import type { OptionKey, QuestionParticipantView, QuestionStatsView, ScreenQuestionView } from '../types';

const props = defineProps<{
  question: ScreenQuestionView;
  stats: QuestionStatsView;
  participants: QuestionParticipantView[];
}>();

const optionKeys: OptionKey[] = ['A', 'B', 'C', 'D'];
const answeredRate = computed(() => props.stats.total ? Math.round((props.stats.answered / props.stats.total) * 100) : 0);
const correctRate = computed(() => Math.round(props.stats.correctRate * 100));
const answeredParticipants = computed(() => props.participants.filter((item) => item.answered));
const unansweredParticipants = computed(() => props.participants.filter((item) => !item.answered));

function optionPercent(key: OptionKey): number {
  return props.stats.answered ? Math.round((props.stats.optionStats[key] / props.stats.answered) * 100) : 0;
}

function displayStudentName(name: string): string {
  return name.split('#')[0] || name;
}
</script>

<template>
  <section class="live-classroom">
    <section class="summary compact-summary">
      <div><Clock3 :size="22" /><span>答题进度</span><strong>{{ answeredRate }}%</strong></div>
      <div><BarChart3 :size="22" /><span>已答 / 总数</span><strong>{{ stats.answered }} / {{ stats.total }}</strong></div>
      <div><BrainCircuit :size="22" /><span>正确率</span><strong>{{ correctRate }}%</strong></div>
    </section>

    <article class="question-panel question-focus">
      <p class="question-index">当前题目</p>
      <h2>{{ question.stem }}</h2>
      <div class="options">
        <div v-for="key in optionKeys" :key="key">
          <b>{{ key }}</b><span>{{ question.options[key] }}</span>
        </div>
      </div>
    </article>

    <section class="collection-row">
      <article class="stats-panel">
        <h2>选项统计</h2>
        <div class="bars">
          <div v-for="key in optionKeys" :key="key" class="bar-row">
            <b>{{ key }}</b><div class="track"><span :style="{ width: `${optionPercent(key)}%` }"></span></div><strong>{{ stats.optionStats[key] }}</strong>
          </div>
        </div>
      </article>
      <article class="roster-block-panel answered">
        <h2>已扫码 {{ answeredParticipants.length }} 人</h2>
        <div class="student-block-grid">
          <div v-for="item in answeredParticipants" :key="item.studentId" class="student-block done">
            <b>{{ displayStudentName(item.displayName) }}</b>
            <span>已扫码</span>
          </div>
          <div v-if="!answeredParticipants.length" class="student-block empty"><b>等待采集</b><span>暂无</span></div>
        </div>
      </article>
      <article class="roster-block-panel missing-roster">
        <h2>未扫码 {{ unansweredParticipants.length }} 人</h2>
        <div class="student-block-grid">
          <div v-for="item in unansweredParticipants" :key="item.studentId" class="student-block pending">
            <b>{{ displayStudentName(item.displayName) }}</b>
            <span>待扫码</span>
          </div>
          <div v-if="!unansweredParticipants.length" class="student-block complete"><b>已全部采集</b><span>完成</span></div>
        </div>
      </article>
    </section>
  </section>
</template>
