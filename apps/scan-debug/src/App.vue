<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Camera, RefreshCw, Send, ScanLine } from 'lucide-vue-next';
import {
  createMarkerCells,
  orientCellsForAnswer,
  type AnswerOption
} from '../../../services/cv-service/src/card-codec';
import { placeImageOnCanvas, renderMarkerCells } from '../../../services/cv-service/src/image-sampler';
import { ScanSession } from '../../../services/cv-service/src/scan-session';
import { uploadAnswers } from './api';

const options: AnswerOption[] = ['A', 'B', 'C', 'D'];
const form = reactive({
  cardId: 1,
  answer: 'A' as AnswerOption,
  sessionId: '',
  questionId: '',
  deviceId: 'web_scan_debug'
});
const session = ref(new ScanSession(form.questionId, form.deviceId));
const sessionKey = ref(createSessionKey());
const decoded = ref('');
const confirmed = ref('');
const payload = ref('');
const uploadResult = ref('');
const uploading = ref(false);
const error = ref('');

const cardCode = computed(() => `C${String(form.cardId).padStart(3, '0')}`);
const canUpload = computed(() => Boolean(form.sessionId && form.questionId && session.value.hasPendingAnswers()));

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  form.sessionId = params.get('sessionId') || form.sessionId;
  form.questionId = params.get('questionId') || form.questionId;
  form.deviceId = params.get('deviceId') || form.deviceId;
  resetSession();
});

function resetSession(): void {
  session.value = new ScanSession(form.questionId, form.deviceId);
  sessionKey.value = createSessionKey();
  decoded.value = '';
  confirmed.value = '';
  payload.value = '';
  uploadResult.value = '';
  error.value = '';
}

function scanOnce(): void {
  error.value = '';
  ensureSessionConfig();
  const result = session.value.acceptFrame(createFrame());
  decoded.value = JSON.stringify(result.decoded ?? { reason: result.reason }, null, 2);
  confirmed.value = JSON.stringify(result.confirmed ?? null, null, 2);
  payload.value = JSON.stringify(session.value.createUploadPayload(), null, 2);
}

function scanThreeFrames(): void {
  scanOnce();
  scanOnce();
  scanOnce();
}

async function uploadPayload(): Promise<void> {
  if (!canUpload.value) {
    return;
  }
  uploading.value = true;
  error.value = '';
  try {
    const result = await uploadAnswers(form.sessionId, session.value.drainUploadPayload());
    uploadResult.value = JSON.stringify(result, null, 2);
    payload.value = JSON.stringify(session.value.createUploadPayload(), null, 2);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : String(caught);
  } finally {
    uploading.value = false;
  }
}

function ensureSessionConfig(): void {
  const key = createSessionKey();
  if (sessionKey.value === key) {
    return;
  }
  resetSession();
}

function createSessionKey(): string {
  return `${form.questionId}:${form.deviceId}`;
}

function createFrame() {
  const marker = renderMarkerCells(
    orientCellsForAnswer(createMarkerCells(form.cardId), form.answer),
    18
  );
  return placeImageOnCanvas(marker, 260, 260, { x: 42, y: 50 });
}
</script>

<template>
  <main class="shell">
    <header>
      <p class="eyebrow">开发调试工具</p>
      <h1>扫码识别调试台</h1>
      <p>验证纸卡码制、方向识别、多帧确认和批量上传 payload。</p>
    </header>

    <section class="controls">
      <label>
        卡号
        <input v-model.number="form.cardId" min="1" max="60" type="number" />
      </label>
      <label>
        答案
        <select v-model="form.answer">
          <option v-for="option in options" :key="option" :value="option">{{ option }}</option>
        </select>
      </label>
      <label class="wide-field">
        活动 ID
        <input v-model.trim="form.sessionId" placeholder="粘贴 sessionId" type="text" />
      </label>
      <label class="wide-field">
        题目 ID
        <input v-model.trim="form.questionId" placeholder="粘贴 questionId 后重置会话" type="text" />
      </label>
      <label>
        设备 ID
        <input v-model.trim="form.deviceId" type="text" />
      </label>
      <button type="button" @click="scanOnce">
        <Camera :size="18" />
        扫一帧
      </button>
      <button type="button" @click="scanThreeFrames">
        <ScanLine :size="18" />
        连扫三帧
      </button>
      <button type="button" :disabled="uploading || !canUpload" @click="uploadPayload">
        <Send :size="18" />
        上传
      </button>
      <button type="button" class="secondary" @click="resetSession">
        <RefreshCw :size="18" />
        重置
      </button>
    </section>

    <section class="summary">
      <div><span>当前卡</span><strong>{{ cardCode }}</strong></div>
      <div><span>方向答案</span><strong>{{ form.answer }}</strong></div>
      <div><span>待上传</span><strong>{{ canUpload ? '可上传' : '等待确认' }}</strong></div>
    </section>

    <p v-if="error" class="error">{{ error }}</p>

    <section class="grid">
      <article>
        <h2>单帧解码</h2>
        <pre>{{ decoded || '等待扫描' }}</pre>
      </article>
      <article>
        <h2>确认结果</h2>
        <pre>{{ confirmed || '连续三帧一致后确认' }}</pre>
      </article>
      <article class="wide">
        <h2>待上传 Payload</h2>
        <pre>{{ payload || '等待确认结果' }}</pre>
      </article>
      <article class="wide">
        <h2>上传结果</h2>
        <pre>{{ uploadResult || '等待上传' }}</pre>
      </article>
    </section>
  </main>
</template>
