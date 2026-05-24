<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import QRCode from 'qrcode';
import { ExternalLink, LogOut, QrCode, Radio } from 'lucide-vue-next';
import { api } from './api';
import { useRosterReadiness } from './composables/use-roster-readiness';
import type { AuthUserView, DisplayPairingView, HistoryReportItem, ScreenState } from './types';
import AuthGate from './components/AuthGate.vue';
import BindWaiting from './components/BindWaiting.vue';
import HistoryBoard from './components/HistoryBoard.vue';
import LiveClassroomBoard from './components/LiveClassroomBoard.vue';
import QrModal from './components/QrModal.vue';
import ReportBoard from './components/ReportBoard.vue';

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
const appVersion = String((import.meta as unknown as { env: Record<string, string | undefined> }).env.VITE_APP_VERSION ?? 'dev');
const showRealNames = true;
const title = computed(() => state.session?.title || '智答课堂大屏');
const isHistoryReview = computed(() => Boolean(historySessionId.value && state.session?.id === historySessionId.value));
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
  const created = crypto.randomUUID(); window.localStorage.setItem(displayIdKey, created); return created;
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

async function logout(): Promise<void> {
  await api.logout();
  if (refreshTimer) window.clearInterval(refreshTimer);
  window.localStorage.removeItem(boundSessionKey);
  currentUser.value = null;
}

function openAdminPage(): void { window.location.assign(window.location.port === '5174' ? `${window.location.protocol}//${window.location.hostname}:5173/` : `${window.location.origin}/teacher/`); }

async function openCurrentQr(): Promise<void> {
  if (!state.mobileBindUrl) return;
  await openQrDialog(state.mobileBindUrl);
}

async function openHistoryQr(sessionId: string): Promise<void> {
  const binding = await api.getBinding(sessionId);
  await openQrDialog(binding.mobileBindUrl);
}

async function hideHistorySession(sessionId: string): Promise<void> {
  await api.hideSession(sessionId);
  historyReports.value = historyReports.value.filter((item) => item.session.id !== sessionId);
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

onMounted(async () => { await checkAuth(); });

onUnmounted(() => { if (refreshTimer) window.clearInterval(refreshTimer); });
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
        <small class="version-badge">v{{ appVersion }}</small>
        <button type="button" class="qr-toggle" @click="openAdminPage">
          <ExternalLink :size="20" />管理页面
        </button>
        <button type="button" class="qr-toggle" @click="logout">
          <LogOut :size="20" />退出登录
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
      @hide-session="hideHistorySession"
    />

    <section v-else-if="state.stage === 'question_complete'" class="complete-panel">
      <h2>扫码完成</h2>
      <p>请大家放下码，准备进入下一题。</p>
    </section>

    <ReportBoard v-else-if="state.stage === 'session_report' && state.report" :report="state.report" />

    <LiveClassroomBoard v-else-if="state.question" :question="state.question" :stats="state.stats" :participants="state.participants" />
  </main>
</template>
