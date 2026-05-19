<script setup lang="ts">
import { Radio } from 'lucide-vue-next';

defineProps<{
  hasRosterData: boolean;
  checkingRosterData: boolean;
  pairingQrImageUrl: string;
  pairUrl?: string;
}>();
</script>

<template>
  <section class="empty-bind">
    <img v-if="pairingQrImageUrl" :src="pairingQrImageUrl" alt="教师手机扫码绑定大屏" />
    <Radio v-else :size="82" />
    <h2>等待教师扫码绑定</h2>
    <p>请用教师手机微信扫码，在手机端创建课堂后大屏会自动绑定并激活。</p>
    <p v-if="!hasRosterData" class="bind-warning">
      {{ checkingRosterData ? '正在检查班级和学生数据。' : '当前还没有班级和学生数据，扫码后请先到管理页面维护数据。' }}
    </p>
    <code v-if="pairUrl">{{ pairUrl }}</code>
  </section>
</template>
