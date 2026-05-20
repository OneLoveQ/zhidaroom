<script setup lang="ts">
import { computed } from 'vue';
import type { QuestionParticipantView, QuestionStatsView } from '../types';
import './scanning-roster.css';

const props = defineProps<{
  stats: QuestionStatsView | null;
  participants: QuestionParticipantView[];
}>();

const unansweredParticipants = computed(() => props.participants.filter((item) => !item.answered));
</script>

<template>
  <section class="progress-cards">
    <div><span>已采集</span><strong>{{ stats?.answered ?? 0 }}</strong></div>
    <div class="missing"><span>未采集</span><strong>{{ stats?.unanswered ?? 0 }}</strong></div>
    <div><span>班级人数</span><strong>{{ stats?.total ?? 0 }}</strong></div>
  </section>
  <section class="panel scanning-roster">
    <div class="roster-title">
      <h2>还未扫码成功</h2>
      <span>{{ unansweredParticipants.length }} 人</span>
    </div>
    <div class="roster-chip-grid">
      <span v-for="item in unansweredParticipants" :key="item.studentId">
        <b>{{ item.displayName }}</b>
        <em>{{ item.cardCode }}</em>
      </span>
      <span v-if="!unansweredParticipants.length" class="complete"><b>已全部完成</b><em>可以结束搜集</em></span>
    </div>
  </section>
</template>
