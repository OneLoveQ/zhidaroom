<script setup lang="ts">
import { computed } from 'vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { useReportScope } from '../composables/use-report-scope';
import type { OptionKey, SessionReportView } from '../types';

const props = defineProps<{ report: SessionReportView }>();
const optionKeys: OptionKey[] = ['A', 'B', 'C', 'D'];
const reportRef = computed(() => props.report);
const {
  currentReportItem,
  reportAnsweredTotal,
  reportQuestionPosition,
  reportRunGroups,
  scopedRankings,
  scopedReportCorrectRate,
  scopedReportQuestions,
  scopedReportTitle,
  selectedReportRunId,
  shiftReportQuestion
} = useReportScope(reportRef);

function reportOptionPercent(key: OptionKey): number {
  const stats = currentReportItem.value?.stats;
  return stats?.answered ? Math.round((stats.optionStats[key] / stats.answered) * 100) : 0;
}
</script>

<template>
  <section class="report-board">
    <div class="report-heading">
      <div>
        <p class="eyebrow">{{ selectedReportRunId === 'all' ? '整堂评测分析' : '单次评测分析' }}</p>
        <h2>{{ scopedReportTitle }}</h2>
        <div class="report-switcher">
          <button type="button" :class="{ selected: selectedReportRunId === 'all' }" @click="selectedReportRunId = 'all'">整堂评测</button>
          <button v-for="(run, index) in reportRunGroups" :key="run.id" type="button" :class="{ selected: selectedReportRunId === run.id }" @click="selectedReportRunId = run.id">第 {{ index + 1 }} 次评测</button>
        </div>
      </div>
      <div class="report-metrics">
        <div><span>评测正确率</span><strong>{{ scopedReportCorrectRate }}%</strong></div>
        <div><span>题目数</span><strong>{{ scopedReportQuestions.length }}</strong></div>
        <div><span>作答次数</span><strong>{{ reportAnsweredTotal }}</strong></div>
      </div>
    </div>
    <div class="report-layout">
      <aside class="ranking-panel">
        <h3>正确率排行榜</h3>
        <div class="ranking-list">
          <div v-for="(item, index) in scopedRankings" :key="item.studentId" class="ranking-row">
            <b>{{ index + 1 }}</b>
            <span>{{ item.displayName }}</span>
            <em>{{ item.correctCount }}/{{ item.totalQuestionCount }}</em>
            <strong>{{ Math.round(item.correctRate * 100) }}%</strong>
          </div>
        </div>
      </aside>
      <article class="question-review" v-if="currentReportItem">
        <div class="review-toolbar">
          <button type="button" @click="shiftReportQuestion(-1)"><ChevronLeft :size="24" />上一题</button>
          <span>{{ currentReportItem.runTitle || scopedReportTitle }} · 第 {{ reportQuestionPosition.current }} / {{ reportQuestionPosition.total }} 题</span>
          <button type="button" @click="shiftReportQuestion(1)">下一题<ChevronRight :size="24" /></button>
        </div>
        <h3>{{ currentReportItem.stem }}</h3>
        <div class="review-options">
          <div v-for="key in optionKeys" :key="key" :class="{ answer: key === currentReportItem.answer }">
            <b>{{ key }}</b><span>{{ currentReportItem.options[key] }}</span><em>{{ currentReportItem.stats.optionStats[key] }} 人 · {{ reportOptionPercent(key) }}%</em>
          </div>
        </div>
        <div class="explanation-panel">
          <strong>正确答案：{{ currentReportItem.answer }}</strong>
          <p>{{ currentReportItem.explanation }}</p>
          <small>{{ currentReportItem.teachingSuggestion }}</small>
        </div>
        <div class="wrong-answer-panel">
          <div><h3>错答学生</h3><span>{{ currentReportItem.wrongAnswers.length }} 人</span></div>
          <div v-if="currentReportItem.wrongAnswers.length" class="wrong-answer-list">
            <div v-for="item in currentReportItem.wrongAnswers" :key="item.studentId">
              <b>{{ item.displayName }}</b><span>{{ item.cardCode }} / 选择 {{ item.selectedOption }}</span>
            </div>
          </div>
          <p v-else>这道题没有错答学生，可以快速进入下一题讲评。</p>
        </div>
      </article>
    </div>
  </section>
</template>
