<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { BookOpenCheck, ExternalLink, GraduationCap, LogOut } from 'lucide-vue-next';
import { api } from './api/client';
import AuthGate from './components/AuthGate.vue';
import ClassManagement from './components/ClassManagement.vue';
import QuestionBank from './components/QuestionBank.vue';
import type { AuthUserView } from './types';

type PageKey = 'classes' | 'questions';

const activePage = ref<PageKey>('classes');
const currentUser = ref<AuthUserView | null>(null);
const authChecked = ref(false);
const message = ref('管理班级、学生与答题码发放。');

const pages = [
  { key: 'classes', label: '班级与学生', icon: GraduationCap },
  { key: 'questions', label: '题库管理', icon: BookOpenCheck }
] as const;

const pageTitle = computed(() => pages.find((page) => page.key === activePage.value)?.label ?? '班级与学生');
const pageStatus = computed(() => activePage.value === 'classes'
  ? '管理班级、学生与答题码发放。'
  : '维护题库、AI 出题和 Excel 导入导出。');

onMounted(() => void loadCurrentUser());

async function loadCurrentUser(): Promise<void> {
  try {
    currentUser.value = (await api.me()).user;
  } catch {
    currentUser.value = null;
  } finally {
    authChecked.value = true;
  }
}

async function logout(): Promise<void> {
  await api.logout();
  currentUser.value = null;
}

function switchPage(page: PageKey): void {
  activePage.value = page;
  message.value = pageStatus.value;
}

function markClassReady(): void {
  message.value = '班级数据已更新，可回到大屏扫码创建课堂。';
}

function markQuestionReady(): void {
  message.value = '题库数据已更新，可在手机端新建评测时选用。';
}

function openScreenPage(): void {
  const url = window.location.port === '5173'
    ? `${window.location.protocol}//${window.location.hostname}:5174/`
    : `${window.location.origin}/screen/`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
</script>

<template>
  <AuthGate v-if="authChecked && !currentUser" @authenticated="currentUser = $event" />
  <main v-else-if="currentUser" class="shell">
    <aside class="sidebar">
      <div>
        <p class="eyebrow">智答课堂 AI</p>
        <h1>教师课堂控制台</h1>
      </div>
      <nav class="main-nav">
        <button
          v-for="page in pages"
          :key="page.key"
          type="button"
          :class="{ active: activePage === page.key }"
          @click="switchPage(page.key)"
        >
          <component :is="page.icon" :size="18" />
          <span>{{ page.label }}</span>
        </button>
      </nav>
      <div class="sidebar-actions">
        <button class="ghost" type="button" @click="openScreenPage">
          <ExternalLink :size="18" />
          返回大屏
        </button>
        <button class="ghost" type="button" @click="logout">
          <LogOut :size="18" />
          退出登录
        </button>
      </div>
    </aside>
    <section class="workspace">
      <header class="topbar">
        <div>
          <p class="eyebrow">基础数据管理</p>
          <h2>{{ pageTitle }}</h2>
          <small>{{ currentUser.displayName }} / {{ currentUser.workspaceName }}</small>
        </div>
        <div class="status">{{ message || pageStatus }}</div>
      </header>
      <ClassManagement v-if="activePage === 'classes'" @class-ready="markClassReady" />
      <QuestionBank v-else @question-ready="markQuestionReady" />
    </section>
  </main>
</template>
