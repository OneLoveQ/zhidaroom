<script setup lang="ts">
import { ref } from 'vue';
import { Trash2, X } from 'lucide-vue-next';
import type { HistoryReportItem } from '../types';

defineProps<{
  items: HistoryReportItem[];
}>();

const emit = defineEmits<{
  refresh: [];
  openReport: [sessionId: string];
  openQr: [sessionId: string];
  hideSession: [sessionId: string];
}>();

const pendingDelete = ref<HistoryReportItem | null>(null);

function answeredTotal(item: HistoryReportItem): number {
  return item.report.questions.reduce((sum, question) => sum + question.stats.answered, 0);
}

function confirmDelete(): void {
  if (!pendingDelete.value) return;
  emit('hideSession', pendingDelete.value.session.id);
  pendingDelete.value = null;
}
</script>

<template>
  <section class="history-board">
    <div class="history-heading">
      <div>
        <p class="eyebrow">课堂历史</p>
        <h2>历史复盘</h2>
      </div>
      <button type="button" class="qr-toggle" @click="emit('refresh')">刷新历史</button>
    </div>
    <div class="history-grid">
      <article v-for="item in items" :key="item.session.id" class="history-card">
        <p>{{ item.session.createdAt.slice(0, 10) }}</p>
        <h3>{{ item.session.title }}</h3>
        <div>
          <span>正确率 <strong>{{ Math.round(item.report.averageCorrectRate * 100) }}%</strong></span>
          <span>题目 {{ item.report.questionCount }}</span>
          <span>作答 {{ answeredTotal(item) }}</span>
        </div>
        <footer>
          <button type="button" @click="emit('openReport', item.session.id)">大屏复盘</button>
          <button type="button" class="secondary" @click="emit('openQr', item.session.id)">手机扫码复盘</button>
          <button type="button" class="danger" aria-label="隐藏课堂记录" @click="pendingDelete = item">
            <Trash2 :size="18" />隐藏
          </button>
        </footer>
      </article>
      <article v-if="!items.length" class="history-empty">
        <h3>暂无历史课堂</h3>
        <p>完成一次评测后，这里会保留可复盘的课堂记录。</p>
      </article>
    </div>
    <div v-if="pendingDelete" class="confirm-mask" @click.self="pendingDelete = null">
      <section class="confirm-dialog">
        <button type="button" class="close-button" @click="pendingDelete = null"><X :size="20" /></button>
        <p class="eyebrow">隐藏历史课堂</p>
        <h3>{{ pendingDelete.session.title }}</h3>
        <p>隐藏后不会从数据库删除，只是不再显示在大屏历史复盘列表中。</p>
        <footer>
          <button type="button" class="secondary" @click="pendingDelete = null">取消</button>
          <button type="button" class="danger" @click="confirmDelete">确认隐藏</button>
        </footer>
      </section>
    </div>
  </section>
</template>
