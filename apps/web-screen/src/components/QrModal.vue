<script setup lang="ts">
import { QrCode, X } from 'lucide-vue-next';

defineProps<{
  imageUrl: string;
  url: string;
}>();

const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <div class="qr-modal-mask" @click.self="emit('close')">
    <aside class="bind-card qr-modal">
      <button type="button" class="close-button" @click="emit('close')"><X :size="20" /></button>
      <img v-if="imageUrl" :src="imageUrl" alt="教师微信扫码进入移动端" />
      <div><QrCode :size="20" /><span>教师扫码端</span></div>
      <small>{{ url }}</small>
    </aside>
  </div>
</template>
