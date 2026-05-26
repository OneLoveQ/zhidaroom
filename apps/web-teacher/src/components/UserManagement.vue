<script setup lang="ts">
import { reactive, watch } from 'vue';
import { KeyRound, Save } from 'lucide-vue-next';
import { api, toChineseError } from '../api/client';
import type { AuthUserView } from '../types';
import './user-management.css';

const props = defineProps<{ user: AuthUserView }>();
const emit = defineEmits<{ updated: [user: AuthUserView] }>();

const profile = reactive({
  displayName: '',
  school: '',
  subject: '',
  phone: ''
});
const password = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});
const state = reactive({ savingProfile: false, savingPassword: false, message: '', failed: '' });

watch(() => props.user, fillProfile, { immediate: true });

function fillProfile(user: AuthUserView): void {
  profile.displayName = user.displayName;
  profile.school = user.school ?? '';
  profile.subject = user.subject ?? '';
  profile.phone = user.phone ?? '';
}

async function saveProfile(): Promise<void> {
  await runAction('savingProfile', async () => {
    const result = await api.updateProfile({
      displayName: profile.displayName,
      school: profile.school,
      subject: profile.subject,
      phone: profile.phone
    });
    emit('updated', result.user);
    state.message = '个人信息已保存。';
  });
}

async function savePassword(): Promise<void> {
  await runAction('savingPassword', async () => {
    if (password.newPassword !== password.confirmPassword) throw new Error('两次输入的新密码不一致');
    await api.changePassword({
      currentPassword: password.currentPassword,
      newPassword: password.newPassword
    });
    password.currentPassword = '';
    password.newPassword = '';
    password.confirmPassword = '';
    state.message = '密码已修改，下次登录请使用新密码。';
  });
}

async function runAction(key: 'savingProfile' | 'savingPassword', action: () => Promise<void>): Promise<void> {
  state.failed = '';
  state.message = '';
  state[key] = true;
  try {
    await action();
  } catch (error) {
    state.failed = toChineseError(error);
  } finally {
    state[key] = false;
  }
}
</script>

<template>
  <section class="account-page">
    <article class="account-card">
      <div class="account-heading">
        <div>
          <h3>个人信息</h3>
          <p>{{ user.email }}</p>
        </div>
        <span class="role-badge">{{ user.role === 'platform_admin' ? '平台管理员' : '教师账号' }}</span>
      </div>
      <form class="account-form" @submit.prevent="saveProfile">
        <label>姓名<input v-model.trim="profile.displayName" autocomplete="name" /></label>
        <label>学校<input v-model.trim="profile.school" /></label>
        <label>教学科目<input v-model.trim="profile.subject" /></label>
        <label>联系电话<input v-model.trim="profile.phone" autocomplete="tel" /></label>
        <button type="submit" :disabled="state.savingProfile">
          <Save :size="18" />保存信息
        </button>
      </form>
    </article>

    <article class="account-card">
      <div class="account-heading">
        <div>
          <h3>修改密码</h3>
          <p>修改后当前登录状态保留，新密码会在下次登录时生效。</p>
        </div>
      </div>
      <form class="account-form" @submit.prevent="savePassword">
        <label>当前密码<input v-model="password.currentPassword" type="password" autocomplete="current-password" /></label>
        <label>新密码<input v-model="password.newPassword" type="password" autocomplete="new-password" /></label>
        <label>重复新密码<input v-model="password.confirmPassword" type="password" autocomplete="new-password" /></label>
        <button type="submit" :disabled="state.savingPassword">
          <KeyRound :size="18" />修改密码
        </button>
      </form>
    </article>

    <p v-if="state.message" class="status">{{ state.message }}</p>
    <p v-if="state.failed" class="status error">{{ state.failed }}</p>
  </section>
</template>
