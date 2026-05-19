<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { Camera, Square, UploadCloud } from 'lucide-vue-next';
import { api } from './api';
import { createClassroomCode } from './session-code';
import { applyTeacherPrefs, saveTeacherPrefs } from './teacher-prefs';
import { useScanning } from './composables/use-scanning';
import type { AiDiagnosisResult, AssessmentRunView, ClassView, QuestionParticipantView, QuestionStatsView, QuestionView, SessionDetailView, SessionReportView, SessionStage } from './types';
import ClassroomSetup from './components/ClassroomSetup.vue';
import NewRunSetup from './components/NewRunSetup.vue';
import ResultAnalysis from './components/ResultAnalysis.vue';
import RunSummary from './components/RunSummary.vue';
import SessionReport from './components/SessionReport.vue';
import TestCodes from './TestCodes.vue';
const params = new URLSearchParams(window.location.search);
const subjects = ['语文', '数学', '英语', '科学', '道德与法治'], testCodesMode = params.has('testCodes');
const displayPairCodeKey = 'zhida.displayPairCode', mobileSessionKey = 'zhida.mobileSessionId', mobileBindTokenKey = 'zhida.mobileBindToken';
const classes = ref<ClassView[]>([]);
const questions = ref<QuestionView[]>([]);
const session = ref<SessionDetailView | null>(null);
const activeRun = ref<AssessmentRunView | null>(null);
const participants = ref<QuestionParticipantView[]>([]);
const stats = ref<QuestionStatsView | null>(null);
const report = ref<SessionReportView | null>(null), diagnosis = ref<AiDiagnosisResult | null>(null);
const selectedQuestionIds = ref<string[]>([]), newRunQuestionIds = ref<string[]>([]);
const activeQuestionId = ref(''), stage = ref<SessionStage>('binding');
const reportLoading = ref(false);
const analysisOpen = ref(false), reportOpen = ref(false), newRunOpen = ref(false);
const progressTimer = ref<number>();
const message = ref('请先新建课堂。'), failed = ref('');
const newRunTitle = ref('');
const form = reactive({ classId: '', subject: '语文', teacherName: '' });
const selectedClass = computed(() => classes.value.find((item) => item.id === form.classId));
const selectedGrade = computed(() => selectedClass.value?.grade ?? '一年级');
const filteredQuestions = computed(() => questions.value.filter((item) => !form.subject || item.subject === form.subject));
const runQuestionIds = computed(() => activeRun.value?.questionIds ?? session.value?.questionIds ?? []);
const runQuestions = computed(() => session.value?.questions.filter((item) => runQuestionIds.value.includes(item.id)) ?? []);
const currentQuestion = computed(() => session.value?.questions.find((item) => item.id === activeQuestionId.value) ?? session.value?.questions.find((item) => item.id === runQuestionIds.value[0]));
const activeQuestionIndex = computed(() => runQuestionIds.value.findIndex((id) => id === currentQuestion.value?.id));
const canGoNextQuestion = computed(() => activeQuestionIndex.value >= 0 && activeQuestionIndex.value < runQuestionIds.value.length - 1);
const completedRunCount = computed(() => new Set((report.value?.questions ?? []).map((item) => item.runId).filter(Boolean)).size);
const showRunSummary = computed(() => Boolean(analysisOpen.value && activeRun.value?.status === 'completed' && report.value));
const canCreate = computed(() => Boolean(form.classId && form.subject && form.teacherName && selectedQuestionIds.value.length));
const canStartNewRun = computed(() => Boolean(newRunTitle.value.trim() && newRunQuestionIds.value.length));
const scannerRuntime = useScanning({ session, activeRun, currentQuestion, refreshProgress, setMessage, setFailed });
const { canScan, canvasRef, confirmed, decoded, scanLogs, scanning, uploading, videoRef } = scannerRuntime;
onMounted(() => { if (!testCodesMode) void initialize(); });
onBeforeUnmount(() => { scannerRuntime.stopScan(false); scannerRuntime.stopCamera(); stopProgressPolling(); });
async function initialize(): Promise<void> {
  const pairCode = params.get('displayPairCode');
  if (pairCode) {
    window.localStorage.setItem(displayPairCodeKey, pairCode);
    api.setDisplayPairing(pairCode);
  }
  const storedPairCode = window.localStorage.getItem(displayPairCodeKey);
  if (!pairCode && storedPairCode) api.setDisplayPairing(storedPairCode);
  const boundSessionId = params.get('sessionId') ?? window.localStorage.getItem(mobileSessionKey);
  const bindToken = params.get('bindToken') ?? window.localStorage.getItem(mobileBindTokenKey);
  if (boundSessionId && bindToken) {
    window.localStorage.setItem(mobileSessionKey, boundSessionId);
    window.localStorage.setItem(mobileBindTokenKey, bindToken);
    api.setMobileBinding(boundSessionId, bindToken);
  }
  await loadSetupData();
  if (boundSessionId && bindToken) await bindSession(boundSessionId);
  else if (boundSessionId) failed.value = '课堂二维码缺少绑定令牌，请重新从大屏扫码进入。';
  else if (pairCode) message.value = '已连接大屏，请创建课堂完成绑定。';
}
async function loadSetupData(): Promise<void> {
  await runAction(async () => {
    const [nextClasses, nextQuestions] = await Promise.all([api.listClasses(), api.listQuestions()]);
    classes.value = nextClasses;
    questions.value = nextQuestions;
    applyTeacherPrefs(form, nextClasses, subjects);
    message.value = nextClasses.length ? '请选择班级和题目后生成课堂。' : '请先在教师端导入班级。';
  });
}
async function bindSession(sessionId: string): Promise<void> {
  await runAction(async () => {
    applyLiveState(await api.getLiveState(sessionId));
    startProgressPolling();
    message.value = '已通过大屏二维码绑定课堂。';
  });
}
async function createClassroom(): Promise<void> {
  await runAction(async () => {
    const classView = selectedClass.value;
    if (!classView || !canCreate.value) throw new Error('请填写教师名称，并选择班级和题目');
    const sessions = await api.listSessions();
    const title = createClassroomCode(new Date(), classView, form.subject, sessions);
    saveTeacherPrefs(form);
    const created = await api.createSession({ classId: classView.id, title, mode: 'exit_ticket', questionIds: selectedQuestionIds.value, teacherName: form.teacherName.trim(), subject: form.subject, classroomCode: title });
    session.value = await api.startSession(created.id);
    const run = await api.createRun(session.value.id, { title: '第 1 次评测', type: 'exit_ticket', questionIds: selectedQuestionIds.value });
    activeRun.value = await api.startRun(session.value.id, run.id);
    await api.updateStage(session.value.id, 'binding', session.value.questions[0]?.id);
    await bindDisplayIfNeeded(session.value.id);
    activeQuestionId.value = session.value.questions[0]?.id || '';
    resetScanner();
    await refreshProgress();
    startProgressPolling();
    message.value = `课堂 ${title} 已开始。`;
  });
}

async function bindDisplayIfNeeded(sessionId: string): Promise<void> {
  const pairCode = window.localStorage.getItem(displayPairCodeKey);
  if (!pairCode) return;
  await api.bindDisplayPairing(pairCode, sessionId);
  const binding = await api.getBinding(sessionId);
  api.setMobileBinding(sessionId, binding.bindToken);
  window.localStorage.setItem(mobileSessionKey, sessionId);
  window.localStorage.setItem(mobileBindTokenKey, binding.bindToken);
  clearDisplayPairingState();
}
async function handleQuestionSaved(question: QuestionView, target: 'classroom' | 'run'): Promise<void> {
  questions.value = await api.listQuestions();
  const selected = target === 'run' ? newRunQuestionIds : selectedQuestionIds;
  selected.value = Array.from(new Set([...selected.value, question.id]));
  message.value = '题目已确认加入题库并选用。';
}
function toggleQuestion(questionId: string): void {
  selectedQuestionIds.value = selectedQuestionIds.value.includes(questionId)
    ? selectedQuestionIds.value.filter((id) => id !== questionId)
    : [...selectedQuestionIds.value, questionId];
}
async function startScan(): Promise<void> {
  await scannerRuntime.startScan();
}
function stopScan(refresh = true): void {
  scannerRuntime.stopScan(refresh);
}
function openAnalysis(): void {
  stopScan();
  analysisOpen.value = true;
  if (session.value && currentQuestion.value) void api.updateStage(session.value.id, 'question_result', currentQuestion.value.id);
}
function resumeScan(): void {
  analysisOpen.value = false;
  void startScan();
}
async function uploadPending(): Promise<void> {
  await scannerRuntime.uploadPending();
}
async function refreshProgress(): Promise<void> {
  if (!session.value || !currentQuestion.value) return;
  applyLiveState(await api.getLiveState(session.value.id));
}
function applyLiveState(live: Awaited<ReturnType<typeof api.getLiveState>>): void {
  const previousQuestionId = activeQuestionId.value;
  session.value = live.session;
  activeRun.value = live.activeRun ?? activeRun.value;
  stage.value = live.stage;
  activeQuestionId.value = live.currentQuestion.id;
  stats.value = live.stats;
  participants.value = live.participants;
  if (previousQuestionId !== live.currentQuestion.id) { analysisOpen.value = false; reportOpen.value = false; resetScanner(); }
  if (live.activeRun?.status === 'completed' && !newRunOpen.value && !reportOpen.value) {
    stopScan(false);
    analysisOpen.value = true;
    newRunOpen.value = false;
    if (!report.value?.questions.some((item) => item.runId === live.activeRun?.id)) void refreshReport();
    message.value = `${live.activeRun.title} 已完成，请查看本轮综合情况。`;
    return;
  }
  if (previousQuestionId && previousQuestionId !== live.currentQuestion.id) {
    message.value = '本题已收齐，已自动进入下一题。';
  }
  if (live.stage === 'question_complete') { stopScan(false); message.value = '本题扫码完成，请大家放下码。'; }
  if (live.stage === 'session_report' && !reportOpen.value && !newRunOpen.value) { stopScan(false); void openReport(); }
}
async function openReport(): Promise<void> {
  await runAction(async () => {
    if (!session.value) return;
    stopScan(false);
    reportLoading.value = true;
    report.value = await api.getSessionReport(session.value.id);
    reportOpen.value = true;
  }, () => { reportLoading.value = false; });
}
async function startNewRun(): Promise<void> {
  if (!session.value) return;
  await runAction(async () => {
    stopScan(false);
    const runs = await api.listRuns(session.value!.id);
    const questionIds = newRunQuestionIds.value.length ? newRunQuestionIds.value : runQuestionIds.value;
    const run = await api.createRun(session.value!.id, {
      title: newRunTitle.value.trim() || `第 ${runs.length + 1} 次评测`,
      type: 'exit_ticket',
      questionIds
    });
    activeRun.value = await api.startRun(session.value!.id, run.id);
    activeQuestionId.value = activeRun.value.currentQuestionId || activeRun.value.questionIds[0] || '';
    analysisOpen.value = false;
    reportOpen.value = false;
    newRunOpen.value = false;
    report.value = null;
    resetScanner();
    await refreshProgress();
    message.value = `${activeRun.value.title} 已开启，可以开始扫码。`;
  });
}
async function openNewRunSetup(): Promise<void> {
  const count = session.value ? (await api.listRuns(session.value.id)).length : 0;
  newRunTitle.value = `第 ${count + 1} 次评测`;
  newRunQuestionIds.value = [];
  analysisOpen.value = false; reportOpen.value = false; newRunOpen.value = true;
}
function openSessionReport(): void {
  analysisOpen.value = false;
  void openReport();
}
function toggleNewRunQuestion(questionId: string): void {
  newRunQuestionIds.value = newRunQuestionIds.value.includes(questionId)
    ? newRunQuestionIds.value.filter((id) => id !== questionId)
    : [...newRunQuestionIds.value, questionId];
}
async function refreshReport(): Promise<void> {
  if (!session.value) return;
  await runAction(async () => {
    reportLoading.value = true;
    report.value = await api.getSessionReport(session.value!.id);
  }, () => { reportLoading.value = false; });
}
async function diagnoseReport(): Promise<void> {
  if (!session.value) return;
  await runAction(async () => {
    reportLoading.value = true;
    diagnosis.value = await api.diagnoseSession(session.value!.id);
  }, () => { reportLoading.value = false; });
}
function chooseActiveQuestion(questionId: string): void {
  activeQuestionId.value = questionId;
  analysisOpen.value = false;
  reportOpen.value = false;
  resetScanner();
  if (session.value && activeRun.value) void api.setRunQuestion(session.value.id, activeRun.value.id, questionId);
  if (session.value) void api.updateStage(session.value.id, 'scanning', questionId);
  void refreshProgress();
}
function goNextQuestion(): void {
  if (!session.value || !canGoNextQuestion.value) return;
  chooseActiveQuestion(runQuestionIds.value[activeQuestionIndex.value + 1]);
}
function startProgressPolling(): void {
  stopProgressPolling();
  progressTimer.value = window.setInterval(() => void refreshProgress(), 2500);
}
function stopProgressPolling(): void {
  if (!progressTimer.value) return;
  window.clearInterval(progressTimer.value);
  progressTimer.value = undefined;
}
function resetScanner(): void {
  scannerRuntime.resetScanner();
}
async function runAction(action: () => Promise<void>, done?: () => void): Promise<void> {
  failed.value = '';
  try {
    await action();
  } catch (error) {
    failed.value = error instanceof Error ? error.message : String(error);
    if (failed.value.includes('大屏配对码已失效')) clearDisplayPairingState();
  } finally {
    done?.();
  }
}
function clearDisplayPairingState(): void { window.localStorage.removeItem(displayPairCodeKey); api.clearDisplayPairing(); if (params.has('displayPairCode')) { params.delete('displayPairCode'); window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`); } }
function setMessage(text: string): void { message.value = text; }
function setFailed(text: string): void { failed.value = text; }
</script>
<template>
  <TestCodes v-if="testCodesMode" />
  <main v-else class="scanner-shell">
    <header class="hero">
      <p>教师扫码端</p>
      <h1>{{ session ? session.title : '新建课堂' }}</h1>
      <span :class="{ error: failed }">{{ failed || message }}</span>
    </header>
    <ClassroomSetup v-if="!session" :classes="classes" :subjects="subjects" :form="form" :questions="filteredQuestions" :selected-question-ids="selectedQuestionIds" :can-create="canCreate" @toggle-question="toggleQuestion" @question-saved="handleQuestionSaved($event, 'classroom')" @create-classroom="createClassroom" />
    <template v-if="session">
      <section v-if="!reportOpen && !newRunOpen && activeRun?.status !== 'completed'" class="panel question-tabs">
        <button v-for="item in runQuestions" :key="item.id" type="button" :class="{ selected: currentQuestion?.id === item.id }" @click="chooseActiveQuestion(item.id)">{{ item.stem }}</button>
      </section>
      <SessionReport v-if="reportOpen && report" :report="report" :diagnosis="diagnosis" :loading="reportLoading" @back="reportOpen = false" @refresh="refreshReport" @diagnose="diagnoseReport" />
      <NewRunSetup v-else-if="newRunOpen" :title="newRunTitle" :questions="filteredQuestions" :selected-question-ids="newRunQuestionIds" :can-start="canStartNewRun" :subject="form.subject" :grade="selectedGrade" @update-title="newRunTitle = $event" @toggle-question="toggleNewRunQuestion" @question-saved="handleQuestionSaved($event, 'run')" @cancel="newRunOpen = false" @start="startNewRun" />
      <RunSummary v-else-if="showRunSummary && report && activeRun" :report="report" :run-id="activeRun.id" :run-title="activeRun.title" :run-count="completedRunCount" :loading="reportLoading" @refresh="refreshReport" @new-run="openNewRunSetup" @open-session-report="openSessionReport" />
      <ResultAnalysis v-else-if="analysisOpen && currentQuestion" :question="currentQuestion" :stats="stats" :participants="participants" :can-go-next="canGoNextQuestion" :loading="uploading || reportLoading" @refresh="refreshProgress" @rescan="resumeScan" @next-question="goNextQuestion" @open-report="openReport" @new-run="openNewRunSetup" />
      <section v-else-if="stage === 'question_complete'" class="panel complete-mobile"><h2>扫码完成</h2><p>请大家放下码，系统正在进入下一题。</p></section>
      <template v-else>
        <section class="camera-card"><video ref="videoRef" playsinline muted /><div class="scan-frame"></div><canvas ref="canvasRef"></canvas></section>
        <section class="actions"><button v-if="!scanning" type="button" :disabled="!canScan" @click="startScan"><Camera :size="19" />开始扫描</button><button v-else type="button" class="secondary" @click="stopScan()"><Square :size="18" />停止</button><button type="button" class="secondary" :disabled="uploading" @click="uploadPending"><UploadCloud :size="18" />补传缓存</button></section>
        <section class="progress-cards"><div><span>已采集</span><strong>{{ stats?.answered ?? 0 }}</strong></div><div class="missing"><span>未采集</span><strong>{{ stats?.unanswered ?? 0 }}</strong></div><div><span>班级人数</span><strong>{{ stats?.total ?? 0 }}</strong></div></section>
        <section class="panel result-grid"><div><span>最近识别</span><strong>{{ decoded }}</strong></div><div><span>确认答案</span><strong>{{ confirmed }}</strong></div></section><section class="actions"><button type="button" :disabled="!currentQuestion" @click="openAnalysis">查看统计分析</button></section><section class="panel log-panel"><h2>最近记录</h2><p v-for="log in scanLogs" :key="log">{{ log }}</p><p v-if="!scanLogs.length">等待扫描记录</p></section>
      </template>
    </template>
  </main>
</template>
