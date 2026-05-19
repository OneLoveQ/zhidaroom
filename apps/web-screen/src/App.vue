<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import QRCode from 'qrcode';
import { BarChart3, BrainCircuit, Clock3, ExternalLink, LogOut, QrCode, Radio } from 'lucide-vue-next';
import { api } from './api';
import { useRosterReadiness } from './composables/use-roster-readiness';
import type { AuthUserView, DisplayPairingView, HistoryReportItem, OptionKey, ScreenState } from './types';
import AuthGate from './components/AuthGate.vue';
import BindWaiting from './components/BindWaiting.vue';
import HistoryBoard from './components/HistoryBoard.vue';
import QrModal from './components/QrModal.vue';
import ReportBoard from './components/ReportBoard.vue';

const optionKeys: OptionKey[] = ['A', 'B', 'C', 'D'];
const displayIdKey = 'zhida.displayId';
const boundSessionKey = 'zhida.boundSessionId';
const emptyStats = { total: 0, answered: 0, unanswered: 0, optionStats: { A: 0, B: 0, C: 0, D: 0 }, correctRate: 0 };
const state = reactive<ScreenState>({
  session: null,
  question: null,
  stats: emptyStats,
  report: null,
  participants: [],
  mobileBindUrl: '',
  stage: 'unbound'
});
const failed = ref('');
const lastUpdated = ref('等待课堂绑定');
const pairing = ref<DisplayPairingView | null>(null);
const pairingQrImageUrl = ref('');
const qrDialogOpen = ref(false);
const qrDialogImageUrl = ref('');
const qrDialogUrl = ref('');
const historyReports = ref<HistoryReportItem[]>([]);
const historySessionId = ref('');
const authChecked = ref(false);
const currentUser = ref<AuthUserView | null>(null);
const { checkingRosterData, hasRosterData, refreshRosterReadiness } = useRosterReadiness();
let refreshTimer: number | undefined;

const params = new URLSearchParams(window.location.search);
const showRealNames = params.get('showRealNames') === 'true';
const title = computed(() => state.session?.title || '智答课堂大屏');
const isHistoryReview = computed(() => Boolean(historySessionId.value && state.session?.id === historySessionId.value));
const answeredRate = computed(() => state.stats.total ? Math.round((state.stats.answered / state.stats.total) * 100) : 0);
const answeredParticipants = computed(() => state.participants.filter((item) => item.answered));
const unansweredParticipants = computed(() => state.participants.filter((item) => !item.answered));
function optionPercent(key: OptionKey): number {
  return state.stats.answered ? Math.round((state.stats.optionStats[key] / state.stats.answered) * 100) : 0;
}
async function resolveSessionId(): Promise<string | null> {
  const sessionId = params.get('sessionId');
  if (sessionId) return sessionId;
  if (historySessionId.value) return historySessionId.value;
  const boundSessionId = window.localStorage.getItem(boundSessionKey);
  if (boundSessionId) return boundSessionId;
  const classroomCode = params.get('classroomCode');
  if (!classroomCode) return null;
  const session = await api.getSessionByCode(classroomCode);
  return session.id;
}
async function loadLiveData(): Promise<void> {
  const sessionId = await resolveSessionId();
  if (!sessionId) {
    await loadPairing();
    return;
  }
  const live = await api.getLiveState(sessionId, showRealNames).catch(async (error) => {
    window.localStorage.removeItem(boundSessionKey);
    throw error;
  });
  state.session = live.session;
  state.question = live.currentQuestion;
  state.stats = live.stats;
  state.participants = live.participants;
  state.mobileBindUrl = live.mobileBindUrl;
  state.stage = live.stage;
  state.report = live.stage === 'session_report' ? await api.getReport(sessionId).catch(() => null) : state.report;
  lastUpdated.value = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  failed.value = '';
}
async function loadPairing(): Promise<void> {
  await refreshRosterReadiness();
  await loadHistoryReports();
  state.stage = 'unbound';
  state.mobileBindUrl = '';
  const next = pairing.value?.pairCode
    ? await api.getDisplayPairing(pairing.value.pairCode)
    : await api.createDisplayPairing(getDisplayId());
  pairing.value = next.status === 'expired' ? await api.createDisplayPairing(getDisplayId()) : next;
  pairingQrImageUrl.value = await createQrDataUrl(pairing.value.pairUrl, 260);
  if (pairing.value.status === 'bound' && pairing.value.sessionId) {
    window.localStorage.setItem(boundSessionKey, pairing.value.sessionId);
    await loadLiveData();
    return;
  }
  lastUpdated.value = `配对码 ${pairing.value.pairCode}`;
  failed.value = '';
}

async function loadHistoryReports(): Promise<void> {
  const sessions = (await api.listSessions())
    .filter((item) => item.stage === 'session_report' || item.status === 'ended')
    .slice(0, 12);
  const reports = await Promise.all(sessions.map(async (session) => {
    const report = await api.getReport(session.id).catch(() => null);
    return report ? { session, report } : null;
  }));
  historyReports.value = reports.filter((item): item is HistoryReportItem => Boolean(item));
}

function getDisplayId(): string {
  const existing = window.localStorage.getItem(displayIdKey);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.localStorage.setItem(displayIdKey, created);
  return created;
}

async function exitClassroom(): Promise<void> {
  const displayId = getDisplayId();
  await api.unbindDisplay(displayId).catch(() => null);
  window.localStorage.removeItem(boundSessionKey);
  if (params.get('sessionId') || params.get('classroomCode')) {
    window.history.replaceState({}, '', window.location.pathname);
    params.delete('sessionId');
    params.delete('classroomCode');
  }
  historySessionId.value = '';
  state.session = null;
  state.question = null;
  state.stats = emptyStats;
  state.report = null;
  state.participants = [];
  state.mobileBindUrl = '';
  pairing.value = null;
  await loadPairing();
}

async function openHistoryReport(sessionId: string): Promise<void> {
  historySessionId.value = sessionId;
  await loadLiveData();
}

function openAdminPage(): void {
  window.location.assign(createAdminUrl());
}

function createAdminUrl(): string {
  if (window.location.port === '5174') {
    return `${window.location.protocol}//${window.location.hostname}:5173/`;
  }
  return `${window.location.origin}/teacher/`;
}

async function openCurrentQr(): Promise<void> {
  if (!state.mobileBindUrl) return;
  await openQrDialog(state.mobileBindUrl);
}

async function openHistoryQr(sessionId: string): Promise<void> {
  const binding = await api.getBinding(sessionId);
  await openQrDialog(binding.mobileBindUrl);
}

async function openQrDialog(url: string): Promise<void> {
  qrDialogUrl.value = url;
  qrDialogImageUrl.value = await createQrDataUrl(url, 260);
  qrDialogOpen.value = true;
}

function createQrDataUrl(text: string, width: number): Promise<string> {
  return QRCode.toDataURL(text, {
    width,
    margin: 2,
    color: { dark: '#111c24', light: '#ffffff' },
    errorCorrectionLevel: 'M'
  });
}

async function startScreen(): Promise<void> {
  try {
    await loadLiveData();
    refreshTimer = window.setInterval(() => {
      void loadLiveData().catch((error) => {
        failed.value = error instanceof Error ? error.message : String(error);
      });
    }, 1000);
  } catch (error) {
    failed.value = error instanceof Error ? error.message : String(error);
  }
}

async function checkAuth(): Promise<void> {
  try {
    currentUser.value = (await api.me()).user;
    await startScreen();
  } catch {
    currentUser.value = null;
  } finally {
    authChecked.value = true;
  }
}

async function handleAuthenticated(user: AuthUserView): Promise<void> {
  currentUser.value = user;
  await startScreen();
}

onMounted(async () => {
  await checkAuth();
});

onUnmounted(() => {
  if (refreshTimer) window.clearInterval(refreshTimer);
});
</script>

<template>
  <AuthGate v-if="authChecked && !currentUser" @authenticated="handleAuthenticated" />
  <main v-else-if="authChecked" class="screen">
    <header class="hero">
      <div>
        <p class="eyebrow">{{ state.stage === 'unbound' ? '等待绑定' : '实时课堂' }}</p>
        <h1>{{ title }}</h1>
      </div>
      <div class="hero-actions">
        <button type="button" class="qr-toggle" @click="openAdminPage">
          <ExternalLink :size="20" />管理页面
        </button>
        <button v-if="state.mobileBindUrl" type="button" class="qr-toggle" @click="openCurrentQr">
          <QrCode :size="20" />课堂二维码
        </button>
        <button v-if="state.session" type="button" class="exit-button" @click="exitClassroom">
          <LogOut :size="20" />{{ isHistoryReview ? '返回历史' : '退出课堂' }}
        </button>
      </div>
      <div class="live-state" :class="{ warn: failed }"><Radio :size="22" /><span>{{ failed || lastUpdated }}</span></div>
    </header>

    <QrModal v-if="qrDialogOpen" :image-url="qrDialogImageUrl" :url="qrDialogUrl" @close="qrDialogOpen = false" />

    <BindWaiting
      v-if="state.stage === 'unbound'"
      :has-roster-data="hasRosterData"
      :checking-roster-data="checkingRosterData"
      :pairing-qr-image-url="pairingQrImageUrl"
      :pair-url="pairing?.pairUrl"
    />

    <HistoryBoard
      v-if="state.stage === 'unbound'"
      :items="historyReports"
      @refresh="loadHistoryReports"
      @open-report="openHistoryReport"
      @open-qr="openHistoryQr"
    />

    <section v-else-if="state.stage === 'question_complete'" class="complete-panel">
      <h2>扫码完成</h2>
      <p>请大家放下码，准备进入下一题。</p>
    </section>

    <ReportBoard v-else-if="state.stage === 'session_report' && state.report" :report="state.report" />

    <template v-else>
      <section class="summary">
        <div><Clock3 :size="28" /><span>答题进度</span><strong>{{ answeredRate }}%</strong></div>
        <div><BarChart3 :size="28" /><span>已答 / 总数</span><strong>{{ state.stats.answered }} / {{ state.stats.total }}</strong></div>
        <div><BrainCircuit :size="28" /><span>正确率</span><strong>{{ Math.round(state.stats.correctRate * 100) }}%</strong></div>
      </section>
      <section class="layout" v-if="state.question">
        <article class="question-panel">
          <p class="question-index">当前题目</p>
          <h2>{{ state.question.stem }}</h2>
          <div class="options">
            <div v-for="key in optionKeys" :key="key" :class="{ answer: key === state.question.answer }">
              <b>{{ key }}</b><span>{{ state.question.options[key] }}</span>
            </div>
          </div>
        </article>
        <article class="stats-panel">
          <h2>选项统计</h2>
          <div class="bars">
            <div v-for="key in optionKeys" :key="key" class="bar-row">
              <b>{{ key }}</b><div class="track"><span :style="{ width: `${optionPercent(key)}%` }"></span></div><strong>{{ state.stats.optionStats[key] }}</strong>
            </div>
          </div>
          <p>未答 {{ state.stats.unanswered }} 人</p>
        </article>
      </section>
      <section class="roster">
        <article><h2>已答学生 {{ answeredParticipants.length }} 人</h2><div class="student-list"><div v-for="item in answeredParticipants" :key="item.studentId"><b>{{ item.displayName }}</b><span>{{ item.cardCode }} / {{ item.selectedOption }}</span></div><div v-if="!answeredParticipants.length"><b>等待采集</b><span>暂无</span></div></div></article>
        <article class="missing-roster"><h2>未采集学生 {{ unansweredParticipants.length }} 人</h2><div class="student-list pending"><div v-for="item in unansweredParticipants" :key="item.studentId"><b>{{ item.displayName }}</b><span>{{ item.cardCode }}</span></div><div v-if="!unansweredParticipants.length"><b>已全部采集</b><span>完成</span></div></div></article>
      </section>
    </template>
  </main>
</template>
