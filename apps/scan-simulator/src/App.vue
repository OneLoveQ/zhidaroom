<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { Copy, Play, RefreshCw, ScanLine } from 'lucide-vue-next';
import { api } from './api';
import type { BatchResultView, OptionKey, QuestionStatsView } from './types';

interface SimulatorState {
  classId: string;
  questionId: string;
  sessionId: string;
  studentCount: number;
  repeatOffset: number;
}

const state = reactive<SimulatorState>({
  classId: '',
  questionId: '',
  sessionId: '',
  studentCount: 60,
  repeatOffset: 1
});
const optionKeys: OptionKey[] = ['A', 'B', 'C', 'D'];
const loading = ref(false);
const message = ref('准备创建 60 人扫码模拟课堂。');
const failed = ref('');
const result = ref<BatchResultView | null>(null);
const stats = ref<QuestionStatsView | null>(null);

const screenUrl = computed(() => {
  if (!state.sessionId || !state.questionId) {
    return '';
  }
  return `http://localhost:5174/?sessionId=${state.sessionId}&questionId=${state.questionId}`;
});

async function runAction(label: string, action: () => Promise<void>): Promise<void> {
  loading.value = true;
  failed.value = '';
  message.value = label;
  try {
    await action();
  } catch (error) {
    failed.value = error instanceof Error ? error.message : String(error);
  } finally {
    loading.value = false;
  }
}

async function prepareDemo(): Promise<void> {
  await runAction('正在创建班级、60 名学生、题目和活动...', async () => {
    const createdClass = await api.createClass();
    await api.importStudents(createdClass.id, state.studentCount);
    const question = await api.createQuestion();
    const session = await api.createActiveSession(createdClass.id, question.id);
    state.classId = createdClass.id;
    state.questionId = question.id;
    state.sessionId = session.id;
    message.value = '已创建 60 人活动，可以提交模拟扫码结果。';
  });
}

async function submitBatch(): Promise<void> {
  await runAction('正在批量提交 60 张答题卡...', async () => {
    result.value = await api.submitAnswers(state.sessionId, state.questionId, state.studentCount);
    stats.value = await api.getStats(state.sessionId, state.questionId);
    message.value = '60 张答题卡已提交，大屏统计可刷新查看。';
  });
}

async function submitRepeat(): Promise<void> {
  await runAction('正在重复提交并覆盖最新答案...', async () => {
    result.value = await api.submitAnswers(
      state.sessionId,
      state.questionId,
      state.studentCount,
      state.repeatOffset
    );
    stats.value = await api.getStats(state.sessionId, state.questionId);
    state.repeatOffset += 1;
    message.value = '重复提交完成，同一卡号已按最新答案覆盖。';
  });
}

async function copyScreenUrl(): Promise<void> {
  if (!screenUrl.value) {
    return;
  }
  await navigator.clipboard.writeText(screenUrl.value);
  message.value = '大屏地址已复制。';
}
</script>

<template>
  <main class="shell">
    <header>
      <p class="eyebrow">智答课堂 AI</p>
      <h1>扫码模拟器</h1>
      <p class="intro">用于开发环境批量提交纸卡识别结果，验证 60 人课堂统计和重复卡号覆盖。</p>
    </header>

    <section class="toolbar">
      <button type="button" :disabled="loading || Boolean(state.sessionId)" @click="prepareDemo">
        <Play :size="18" />
        创建模拟课堂
      </button>
      <button type="button" :disabled="loading || !state.sessionId" @click="submitBatch">
        <ScanLine :size="18" />
        提交 60 人答案
      </button>
      <button type="button" :disabled="loading || !stats" @click="submitRepeat">
        <RefreshCw :size="18" />
        重复提交覆盖
      </button>
      <button type="button" :disabled="!screenUrl" @click="copyScreenUrl">
        <Copy :size="18" />
        复制大屏地址
      </button>
    </section>

    <p class="status" :class="{ error: failed }">{{ failed || message }}</p>

    <section class="grid">
      <article>
        <h2>活动信息</h2>
        <dl>
          <div><dt>学生数量</dt><dd>{{ state.studentCount }}</dd></div>
          <div><dt>班级 ID</dt><dd>{{ state.classId || '-' }}</dd></div>
          <div><dt>题目 ID</dt><dd>{{ state.questionId || '-' }}</dd></div>
          <div><dt>活动 ID</dt><dd>{{ state.sessionId || '-' }}</dd></div>
        </dl>
      </article>

      <article>
        <h2>提交结果</h2>
        <dl>
          <div><dt>成功</dt><dd>{{ result?.acceptedCount ?? '-' }}</dd></div>
          <div><dt>失败</dt><dd>{{ result?.failedCount ?? '-' }}</dd></div>
          <div><dt>已答</dt><dd>{{ stats?.answered ?? '-' }}</dd></div>
          <div><dt>正确率</dt><dd>{{ stats ? `${Math.round(stats.correctRate * 100)}%` : '-' }}</dd></div>
        </dl>
      </article>

      <article class="wide">
        <h2>匿名选项分布</h2>
        <div v-if="stats" class="bars">
          <div v-for="key in optionKeys" :key="key">
            <span>{{ key }}</span>
            <meter min="0" :max="stats.total || 1" :value="stats.optionStats[key]" />
            <b>{{ stats.optionStats[key] }}</b>
          </div>
        </div>
        <p v-else class="empty">提交后显示统计结果。</p>
        <p v-if="screenUrl" class="link">{{ screenUrl }}</p>
      </article>
    </section>
  </main>
</template>
