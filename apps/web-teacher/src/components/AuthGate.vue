<script setup lang="ts">
import { reactive, ref } from 'vue';
import { LogIn, UserPlus } from 'lucide-vue-next';
import { api } from '../api/client';
import type { AuthUserView } from '../types';

const emit = defineEmits<{ authenticated: [user: AuthUserView] }>();
const mode = ref<'login' | 'register'>('login');
const loading = ref(false);
const failed = ref('');
const subjects = ['语文', '数学', '英语', '道德与法治', '科学', '信息技术', '历史', '物理', '化学', '地理', '生物', '政治', '音乐', '美术'];
const form = reactive({
  email: '',
  password: '',
  confirmPassword: '',
  displayName: '',
  school: '',
  subject: '语文',
  phone: ''
});

async function submit(): Promise<void> {
  loading.value = true;
  failed.value = '';
  try {
    if (mode.value === 'register' && form.password !== form.confirmPassword) {
      failed.value = '两次输入的密码不一致';
      return;
    }
    const result = mode.value === 'login'
      ? await api.login({ email: form.email, password: form.password })
      : await api.register({
        email: form.email,
        password: form.password,
        displayName: form.displayName,
        school: form.school,
        subject: form.subject,
        phone: form.phone
      });
    emit('authenticated', result.user);
  } catch (error) {
    failed.value = error instanceof Error ? error.message : String(error);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="auth-shell">
    <section class="auth-card">
      <p class="eyebrow">智答课堂</p>
      <h1>{{ mode === 'login' ? '登录教师后台' : '创建个人账号' }}</h1>
      <p class="auth-subtitle">管理你的班级、学生、科目和题库。</p>
      <form @submit.prevent="submit">
        <label>邮箱<input v-model.trim="form.email" type="email" autocomplete="email" /></label>
        <label>密码<input v-model="form.password" type="password" autocomplete="current-password" /></label>
        <template v-if="mode === 'register'">
          <label>重复密码<input v-model="form.confirmPassword" type="password" autocomplete="new-password" /></label>
          <label>姓名<input v-model.trim="form.displayName" /></label>
          <label>学校<input v-model.trim="form.school" /></label>
          <label>教学科目<select v-model="form.subject"><option v-for="item in subjects" :key="item" :value="item">{{ item }}</option></select></label>
          <label>联系电话<input v-model.trim="form.phone" /></label>
        </template>
        <p v-if="failed" class="auth-error">{{ failed }}</p>
        <button type="submit" :disabled="loading">
          <component :is="mode === 'login' ? LogIn : UserPlus" :size="18" />
          {{ mode === 'login' ? '登录' : '注册并登录' }}
        </button>
      </form>
      <button type="button" class="auth-switch" @click="mode = mode === 'login' ? 'register' : 'login'">
        {{ mode === 'login' ? '没有账号，去注册' : '已有账号，去登录' }}
      </button>
    </section>
  </main>
</template>
