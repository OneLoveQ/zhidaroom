<script setup lang="ts">
import { Brain } from 'lucide-vue-next';
import DiagnosisHistory from './DiagnosisHistory.vue';
import type {
  AiLearningDiagnosisRecordView,
  AiLearningDiagnosisResult,
  StudentLearningDetailView
} from '../types';

defineProps<{
  detail: StudentLearningDetailView;
  ai: AiLearningDiagnosisResult | null;
  history: AiLearningDiagnosisRecordView[];
  loading: boolean;
  percent: (value: number) => string;
}>();

defineEmits<{ generate: [] }>();
</script>

<template>
  <article class="panel student-detail">
    <div class="panel-title">
      <h3><Brain :size="18" /> {{ detail.displayName }} 的个人诊断</h3>
      <button type="button" :disabled="loading" @click="$emit('generate')">生成</button>
    </div>
    <section class="student-metrics">
      <div><span>正确率</span><b>{{ percent(detail.summary.correctRate) }}</b></div>
      <div><span>参与率</span><b>{{ percent(detail.summary.participationRate) }}</b></div>
      <div><span>未答</span><b>{{ detail.summary.missedCount }}</b></div>
    </section>
    <p v-for="item in (ai?.diagnosis ?? detail.aiDiagnosis)" :key="item">{{ item }}</p>
    <div v-if="ai?.recommendations.length" class="recommendations">
      <b>建议动作</b>
      <span v-for="item in ai.recommendations" :key="item">{{ item }}</span>
    </div>
    <small v-if="ai">来源：{{ ai.source === 'model' ? '大模型' : '规则兜底' }}</small>
    <DiagnosisHistory title="个人诊断历史" :items="history" />
    <div v-if="detail.weakKnowledgePoints.length" class="tag-list">
      <span v-for="item in detail.weakKnowledgePoints" :key="item.name">
        {{ item.name }} 错 {{ item.wrongCount }} 次
      </span>
    </div>
    <table v-if="detail.recentAnswers.length" class="analysis-table compact">
      <thead><tr><th>题目</th><th>作答</th><th>结果</th></tr></thead>
      <tbody>
        <tr v-for="answer in detail.recentAnswers" :key="`${answer.sessionId}-${answer.questionId}`">
          <td><b>{{ answer.stem }}</b><span>{{ answer.sessionTitle }}</span></td>
          <td>{{ answer.selectedOption || '-' }} / {{ answer.answer }}</td>
          <td>{{ answer.answered ? (answer.isCorrect ? '正确' : '错误') : '未答' }}</td>
        </tr>
      </tbody>
    </table>
  </article>
</template>
