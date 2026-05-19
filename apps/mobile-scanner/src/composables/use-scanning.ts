import { computed, onBeforeUnmount, ref, type ComputedRef, type Ref } from 'vue';
import { ScanSession } from '../../../../services/cv-service/src/scan-session';
import { api } from '../api';
import { captureGrayFrame } from '../camera-frame';
import type { AssessmentRunView, QuestionView, SessionDetailView } from '../types';

interface ScanningOptions {
  session: Ref<SessionDetailView | null>;
  activeRun: Ref<AssessmentRunView | null>;
  currentQuestion: ComputedRef<QuestionView | undefined>;
  refreshProgress: () => Promise<void>;
  setMessage: (text: string) => void;
  setFailed: (text: string) => void;
}

export function useScanning(options: ScanningOptions) {
  const scanner = ref<ScanSession | null>(null);
  const stream = ref<MediaStream | null>(null);
  const scanning = ref(false);
  const uploading = ref(false);
  const decoded = ref('等待识别');
  const confirmed = ref('暂无确认答案');
  const scanLogs = ref<string[]>([]);
  const timer = ref<number>();
  const videoRef = ref<HTMLVideoElement | null>(null);
  const canvasRef = ref<HTMLCanvasElement | null>(null);
  const canScan = computed(() => Boolean(options.session.value?.status === 'active' && options.currentQuestion.value));

  onBeforeUnmount(() => {
    stopScan(false);
    stopCamera();
  });

  async function startScan(): Promise<void> {
    const session = options.session.value;
    const question = options.currentQuestion.value;
    if (!session || !question) {
      options.setFailed('请先生成课堂并选择题目');
      return;
    }
    try {
      options.setFailed('');
      await api.updateStage(session.id, 'scanning', question.id);
      await ensureCamera();
      resetScanner();
      scanning.value = true;
      timer.value = window.setInterval(() => void scanFrame(), 220);
      options.setMessage('正在实时扫描，学生举起图案即可录入。');
    } catch (error) {
      options.setFailed(error instanceof Error ? error.message : String(error));
    }
  }

  function stopScan(refresh = true): void {
    scanning.value = false;
    if (timer.value) {
      window.clearInterval(timer.value);
      timer.value = undefined;
    }
    if (refresh) void options.refreshProgress();
  }

  function resetScanner(): void {
    scanner.value = options.currentQuestion.value
      ? new ScanSession(options.currentQuestion.value.id, 'mobile_teacher_scanner')
      : null;
    decoded.value = '等待识别';
    confirmed.value = '暂无确认答案';
  }

  async function uploadPending(): Promise<void> {
    const session = options.session.value;
    if (!scanner.value?.hasPendingAnswers() || uploading.value || !session) return;
    try {
      uploading.value = true;
      const payload = scanner.value.createUploadPayload();
      if (options.activeRun.value) payload.runId = options.activeRun.value.id;
      const result = await api.uploadAnswers(session.id, payload);
      scanner.value.acknowledgeAnswers(payload.answers.map((answer) => answer.cardCode));
      result.errors.forEach((item) => pushLog(`${item.cardCode} ${item.message}`));
      await options.refreshProgress();
      options.setMessage(`已上传 ${result.acceptedCount} 条，失败 ${result.failedCount} 条。`);
    } catch (error) {
      options.setFailed(error instanceof Error ? error.message : String(error));
    } finally {
      uploading.value = false;
    }
  }

  async function ensureCamera(): Promise<void> {
    if (!stream.value) {
      stream.value = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
    }
    if (!videoRef.value) return;
    videoRef.value.srcObject = stream.value;
    await videoRef.value.play();
  }

  function stopCamera(): void {
    stream.value?.getTracks().forEach((track) => track.stop());
    stream.value = null;
  }

  async function scanFrame(): Promise<void> {
    if (!videoRef.value || !canvasRef.value || !scanner.value) return;
    const image = captureGrayFrame(videoRef.value, canvasRef.value);
    if (!image) return;
    const result = scanner.value.acceptFrame(image);
    const decodedItems = result.decodedList ?? (result.decoded ? [result.decoded] : []);
    decoded.value = decodedItems.length
      ? decodedItems.slice(0, 4).map((item) => `${item.cardCode}/${item.selectedOption}`).join('、')
      : result.reason ?? '未识别';
    const confirmedItems = result.confirmedList ?? (result.confirmed ? [result.confirmed] : []);
    if (!confirmedItems.length) return;
    confirmed.value = confirmedItems.map((item) => `${item.cardCode} 选择 ${item.selectedOption}`).join('、');
    confirmedItems.slice(0, 6).forEach((item) => pushLog(`${item.cardCode} 选择 ${item.selectedOption}`));
    await uploadPending();
  }

  function pushLog(text: string): void {
    scanLogs.value = [`${new Date().toLocaleTimeString('zh-CN', { hour12: false })} ${text}`, ...scanLogs.value].slice(0, 6);
  }

  return {
    canScan,
    canvasRef,
    confirmed,
    decoded,
    resetScanner,
    scanLogs,
    scanning,
    startScan,
    stopCamera,
    stopScan,
    uploadPending,
    uploading,
    videoRef
  };
}
