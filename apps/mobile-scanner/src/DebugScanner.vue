<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { Camera, Square } from 'lucide-vue-next';
import { toChineseError } from './api';
import {
  captureDebugFrame,
  createDebugConfig,
  createDebugConfirmor,
  resolutionPresets,
  scanDebugFrame,
  type DebugAlgorithm,
  type DebugFrameMetrics,
  type ResolutionPreset
} from './debug-scanner-engine';
import './debug-scanner.css';

const algorithms: Array<{ value: DebugAlgorithm; label: string }> = [
  { value: 'baseline', label: '当前算法' },
  { value: 'center', label: '中心区域' },
  { value: 'adaptive', label: '自适应阈值' },
  { value: 'multiSample', label: '多点采样' },
  { value: 'fastConfirm', label: '快速确认' }
];
const resolutionKeys: ResolutionPreset[] = ['720p', '1080p', '1440p', '4k'];
const videoRef = ref<HTMLVideoElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const stream = ref<MediaStream | null>(null);
const timer = ref<number>();
const scanning = ref(false);
const failed = ref('');
const algorithm = ref<DebugAlgorithm>('baseline');
const resolution = ref<ResolutionPreset>('1080p');
const config = reactive(createDebugConfig(algorithm.value));
let confirmor = createDebugConfirmor(config);
const metrics = ref<DebugFrameMetrics | null>(null);
const frames = ref(0);
const startedAt = ref(0);
const logs = ref<string[]>([]);
const actualVideoSize = computed(() => {
  const video = videoRef.value;
  return video?.videoWidth ? `${video.videoWidth}x${video.videoHeight}` : '未启动';
});
const fps = computed(() => {
  const elapsed = startedAt.value ? (performance.now() - startedAt.value) / 1000 : 0;
  return elapsed ? Math.round(frames.value / elapsed) : 0;
});

watch(algorithm, (value) => {
  Object.assign(config, createDebugConfig(value));
  resetConfirmor();
});

onBeforeUnmount(() => stopCamera());

async function start(): Promise<void> {
  try {
    failed.value = '';
    await stopCamera();
    const preset = resolutionPresets[resolution.value];
    stream.value = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: preset.width }, height: { ideal: preset.height } },
      audio: false
    });
    if (!videoRef.value) return;
    videoRef.value.srcObject = stream.value;
    await videoRef.value.play();
    resetConfirmor();
    frames.value = 0;
    startedAt.value = performance.now();
    scanning.value = true;
    timer.value = window.setInterval(scanOnce, 160);
  } catch (error) {
    failed.value = toChineseError(error);
  }
}

async function stopCamera(): Promise<void> {
  scanning.value = false;
  if (timer.value) window.clearInterval(timer.value);
  timer.value = undefined;
  stream.value?.getTracks().forEach((track) => track.stop());
  stream.value = null;
}

function scanOnce(): void {
  if (!videoRef.value || !canvasRef.value) return;
  const image = captureDebugFrame(videoRef.value, canvasRef.value, config);
  if (!image) return;
  frames.value += 1;
  const result = scanDebugFrame(image, config, confirmor);
  metrics.value = result;
  result.confirmed.slice(0, 4).forEach((item) =>
    pushLog(`${item.cardCode} / ${item.selectedOption} / ${item.recognitionScore}`)
  );
}

function resetConfirmor(): void {
  confirmor = createDebugConfirmor(config);
  metrics.value = null;
  logs.value = [];
}

function pushLog(text: string): void {
  logs.value = [`${new Date().toLocaleTimeString('zh-CN', { hour12: false })} ${text}`, ...logs.value].slice(0, 10);
}
</script>

<template>
  <main class="debug-shell">
    <header class="debug-header">
      <div>
        <p>扫码算法实验室</p>
        <h1>真实教室稳定性测试</h1>
      </div>
      <a href="/scanner/">返回扫码端</a>
    </header>

    <section class="debug-grid">
      <article class="debug-stage">
        <video ref="videoRef" playsinline muted />
        <canvas ref="canvasRef"></canvas>
      </article>

      <aside class="debug-side">
        <section class="debug-panel">
          <h2>测试参数</h2>
          <label>算法<select v-model="algorithm"><option v-for="item in algorithms" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
          <label>分辨率<select v-model="resolution" :disabled="scanning"><option v-for="key in resolutionKeys" :key="key" :value="key">{{ resolutionPresets[key].label }}</option></select></label>
          <label>处理宽度<input v-model.number="config.maxWidth" type="number" min="360" max="1280" /></label>
          <label>中心裁切<input v-model.number="config.cropRatio" type="range" min="0.45" max="1" step="0.05" /></label>
          <label>确认帧数<input v-model.number="config.minFrames" type="number" min="1" max="5" @change="resetConfirmor" /></label>
          <div class="debug-actions">
            <button v-if="!scanning" type="button" @click="start"><Camera :size="18" />启动测试</button>
            <button v-else type="button" @click="stopCamera"><Square :size="18" />停止</button>
          </div>
          <p v-if="failed" class="debug-error">{{ failed }}</p>
        </section>

        <section class="debug-panel metrics">
          <h2>实时指标</h2>
          <div><span>实际视频</span><b>{{ actualVideoSize }}</b></div>
          <div><span>处理图像</span><b>{{ metrics?.imageSize ?? '-' }}</b></div>
          <div><span>扫描 FPS</span><b>{{ fps }}</b></div>
          <div><span>单帧耗时</span><b>{{ metrics?.frameMs ?? '-' }}ms</b></div>
          <div><span>阈值</span><b>{{ metrics?.threshold ?? '-' }}</b></div>
          <div><span>候选码</span><b>{{ metrics?.candidates ?? 0 }}</b></div>
          <div><span>解码成功</span><b>{{ metrics?.decoded.length ?? 0 }}</b></div>
          <div><span>确认成功</span><b>{{ metrics?.confirmed.length ?? 0 }}</b></div>
        </section>
      </aside>
    </section>

    <section class="debug-panel debug-log">
      <h2>最近确认</h2>
      <p v-for="item in logs" :key="item">{{ item }}</p>
      <p v-if="!logs.length">等待稳定识别结果</p>
    </section>
  </main>
</template>
