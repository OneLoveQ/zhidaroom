<script setup lang="ts">
import { BarChart3 } from 'lucide-vue-next';
import type { SessionReportView } from '../types';

defineProps<{
  report: SessionReportView;
  percent: (value: number) => string;
}>();
</script>

<template>
  <article class="panel session-detail">
    <h3><BarChart3 :size="18" /> {{ report.title }} 课堂详情</h3>
    <section class="student-metrics">
      <div><span>题目数</span><b>{{ report.questionCount }}</b></div>
      <div><span>平均正确率</span><b>{{ percent(report.averageCorrectRate) }}</b></div>
      <div><span>参与学生</span><b>{{ report.studentRankings.length }}</b></div>
    </section>
    <div v-if="report.questions.length" class="question-detail-list">
      <article v-for="question in report.questions" :key="`${question.runId || 'base'}-${question.questionId}`">
        <header>
          <b>{{ question.stem }}</b>
          <span>{{ question.runTitle || '课堂题目' }} / {{ percent(question.stats.correctRate) }}</span>
        </header>
        <small>
          已答 {{ question.stats.answered }}/{{ question.stats.total }}，
          A {{ question.stats.optionStats.A }} · B {{ question.stats.optionStats.B }} ·
          C {{ question.stats.optionStats.C }} · D {{ question.stats.optionStats.D }}
        </small>
        <p>{{ question.teachingSuggestion }}</p>
      </article>
    </div>
    <table v-if="report.studentRankings.length" class="analysis-table compact">
      <thead><tr><th>学生</th><th>正确率</th><th>作答概览</th></tr></thead>
      <tbody>
        <tr v-for="student in report.studentRankings" :key="student.studentId">
          <td><b>{{ student.displayName }}</b><span>{{ student.studentNo }}</span></td>
          <td>{{ percent(student.correctRate) }}</td>
          <td>
            <span v-for="answer in student.answers" :key="`${student.studentId}-${answer.runId || 'base'}-${answer.questionId}`" class="answer-pill">
              {{ answer.selectedOption || '-' }}/{{ answer.answer }} {{ answer.answered ? (answer.isCorrect ? '对' : '错') : '未答' }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </article>
</template>
