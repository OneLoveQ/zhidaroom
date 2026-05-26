<script setup lang="ts">
import type { AiLearningDiagnosisRecordView } from '../types';

defineProps<{
  title: string;
  items: AiLearningDiagnosisRecordView[];
}>();

function sourceLabel(source: AiLearningDiagnosisRecordView['source']): string {
  return source === 'model' ? '大模型' : '规则兜底';
}

function rangeLabel(item: AiLearningDiagnosisRecordView): string {
  if (!item.rangeFrom && !item.rangeTo) return '全部时间';
  return `${item.rangeFrom || '开始'} 至 ${item.rangeTo || '今天'}`;
}
</script>

<template>
  <section class="history-list">
    <header>
      <b>{{ title }}</b>
      <small>{{ items.length }} 条</small>
    </header>
    <article v-for="item in items.slice(0, 3)" :key="item.id">
      <div>
        <span>{{ item.createdAt.slice(0, 16).replace('T', ' ') }}</span>
        <span>{{ sourceLabel(item.source) }} / {{ rangeLabel(item) }}</span>
      </div>
      <p>{{ item.diagnosis[0] }}</p>
      <small v-if="item.recommendations.length">建议：{{ item.recommendations[0] }}</small>
    </article>
    <p v-if="!items.length" class="empty">暂无生成历史。</p>
  </section>
</template>
