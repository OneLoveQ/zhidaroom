<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { BookOpenCheck, Building2, GraduationCap, LogOut, Search, Shield, UsersRound, Video } from 'lucide-vue-next';
import { api } from './api';
import type { AdminClassView, AdminQuestionView, AdminSessionView, AdminStudentView, AdminUserView, AdminWorkspaceView, AuthUserView, UserStatus } from './types';

type PageKey = 'overview' | 'users' | 'workspaces' | 'classes' | 'questions' | 'sessions';

const pages = [
  { key: 'overview', label: '总览', icon: Shield },
  { key: 'users', label: '用户管理', icon: UsersRound },
  { key: 'workspaces', label: '空间管理', icon: Building2 },
  { key: 'classes', label: '班级学生', icon: GraduationCap },
  { key: 'questions', label: '题库总览', icon: BookOpenCheck },
  { key: 'sessions', label: '课堂记录', icon: Video }
] as const;
const page = ref<PageKey>('overview'), authChecked = ref(false), loading = ref(false), failed = ref('');
const currentUser = ref<AuthUserView | null>(null), keyword = ref('');
const loginForm = reactive({ email: '', password: '' });
const users = ref<AdminUserView[]>([]), workspaces = ref<AdminWorkspaceView[]>([]);
const classes = ref<AdminClassView[]>([]), students = ref<AdminStudentView[]>([]);
const questions = ref<AdminQuestionView[]>([]), sessions = ref<AdminSessionView[]>([]);
const selectedClass = ref<AdminClassView | null>(null);

const isAdmin = computed(() => currentUser.value?.role === 'platform_admin');
const pageTitle = computed(() => pages.find((item) => item.key === page.value)?.label ?? '总览');
const totals = computed(() => ({
  users: users.value.length,
  workspaces: workspaces.value.length,
  classes: classes.value.length,
  students: classes.value.reduce((sum, item) => sum + item.studentCount, 0),
  questions: questions.value.length,
  sessions: sessions.value.length
}));
const filteredUsers = computed(() => filterRows(users.value, ['email', 'displayName', 'school', 'subject']));
const filteredWorkspaces = computed(() => filterRows(workspaces.value, ['name', 'ownerName', 'ownerEmail']));
const filteredClasses = computed(() => filterRows(classes.value, ['grade', 'name', 'workspaceName']));
const filteredQuestions = computed(() => filterRows(questions.value, ['subject', 'grade', 'stem', 'workspaceName']));
const filteredSessions = computed(() => filterRows(sessions.value, ['title', 'subject', 'teacherName', 'workspaceName']));

onMounted(() => void bootstrap());

async function bootstrap(): Promise<void> {
  try {
    currentUser.value = (await api.me()).user;
    if (isAdmin.value) await refreshAll();
  } catch {
    currentUser.value = null;
  } finally {
    authChecked.value = true;
  }
}

async function login(): Promise<void> {
  await run(async () => {
    currentUser.value = (await api.login(loginForm.email, loginForm.password)).user;
    if (!isAdmin.value) throw new Error('当前账号不是平台总管理员');
    await refreshAll();
  });
}

async function refreshAll(): Promise<void> {
  [users.value, workspaces.value, classes.value, questions.value, sessions.value] = await Promise.all([
    api.users(), api.workspaces(), api.classes(), api.questions(), api.sessions()
  ]);
}

async function logout(): Promise<void> {
  await api.logout();
  currentUser.value = null;
}

async function toggleUserStatus(user: AdminUserView): Promise<void> {
  const status: UserStatus = user.status === 'active' ? 'disabled' : 'active';
  await run(async () => {
    await api.updateUserStatus(user.id, status);
    users.value = users.value.map((item) => item.id === user.id ? { ...item, status } : item);
  });
}

async function openStudents(classItem: AdminClassView): Promise<void> {
  await run(async () => {
    selectedClass.value = classItem;
    students.value = await api.students(classItem.id);
  });
}

async function run(action: () => Promise<void>): Promise<void> {
  loading.value = true; failed.value = '';
  try { await action(); } catch (error) { failed.value = error instanceof Error ? error.message : String(error); }
  finally { loading.value = false; }
}

function filterRows<T extends Record<string, unknown>>(rows: T[], keys: Array<keyof T>): T[] {
  const value = keyword.value.trim().toLowerCase();
  if (!value) return rows;
  return rows.filter((row) => keys.some((key) => String(row[key] ?? '').toLowerCase().includes(value)));
}

function statusLabel(status: string): string {
  return status === 'disabled' ? '停用' : '启用';
}
</script>

<template>
  <main v-if="authChecked && !currentUser" class="login-shell">
    <section class="login-card">
      <p>智答课堂平台</p><h1>总管理员登录</h1>
      <form @submit.prevent="login">
        <label>邮箱<input v-model.trim="loginForm.email" type="email" /></label>
        <label>密码<input v-model="loginForm.password" type="password" /></label>
        <small v-if="failed">{{ failed }}</small>
        <button type="submit" :disabled="loading">登录总后台</button>
      </form>
    </section>
  </main>
  <main v-else-if="currentUser && !isAdmin" class="login-shell">
    <section class="login-card"><p>无权限</p><h1>请使用平台总管理员账号</h1><button type="button" @click="logout">退出登录</button></section>
  </main>
  <main v-else-if="currentUser" class="admin-shell">
    <aside class="sidebar">
      <div><p>智答课堂</p><h1>平台总后台</h1></div>
      <button v-for="item in pages" :key="item.key" type="button" :class="{ active: page === item.key }" @click="page = item.key">
        <component :is="item.icon" :size="18" />{{ item.label }}
      </button>
      <button type="button" class="logout" @click="logout"><LogOut :size="18" />退出登录</button>
    </aside>
    <section class="workspace">
      <header class="topbar">
        <div><p>平台数据视图</p><h2>{{ pageTitle }}</h2><small>{{ currentUser.displayName }} / {{ currentUser.email }}</small></div>
        <label class="search"><Search :size="18" /><input v-model.trim="keyword" placeholder="搜索当前页面" /></label>
      </header>
      <p v-if="failed" class="error">{{ failed }}</p>
      <section v-if="page === 'overview'" class="metrics">
        <article><span>用户</span><strong>{{ totals.users }}</strong></article><article><span>空间</span><strong>{{ totals.workspaces }}</strong></article>
        <article><span>班级</span><strong>{{ totals.classes }}</strong></article><article><span>学生</span><strong>{{ totals.students }}</strong></article>
        <article><span>题目</span><strong>{{ totals.questions }}</strong></article><article><span>课堂</span><strong>{{ totals.sessions }}</strong></article>
      </section>
      <section v-if="page === 'users'" class="table-card"><table><thead><tr><th>用户</th><th>学校/科目</th><th>空间数据</th><th>角色</th><th>状态</th><th>操作</th></tr></thead><tbody><tr v-for="user in filteredUsers" :key="user.id"><td><b>{{ user.displayName }}</b><span>{{ user.email }}</span></td><td>{{ user.school || '-' }} / {{ user.subject || '-' }}</td><td>{{ user.classCount }} 班 / {{ user.studentCount }} 生 / {{ user.questionCount }} 题</td><td>{{ user.role === 'platform_admin' ? '总管理员' : '教师' }}</td><td><i :class="user.status">{{ statusLabel(user.status) }}</i></td><td><button v-if="user.role !== 'platform_admin'" type="button" @click="toggleUserStatus(user)">{{ user.status === 'active' ? '停用' : '启用' }}</button><span v-else>受保护</span></td></tr></tbody></table></section>
      <section v-if="page === 'workspaces'" class="table-card"><table><thead><tr><th>空间</th><th>所有者</th><th>类型</th><th>数据量</th><th>创建时间</th></tr></thead><tbody><tr v-for="item in filteredWorkspaces" :key="item.id"><td><b>{{ item.name }}</b><span>{{ item.schoolName || '-' }}</span></td><td>{{ item.ownerName }} / {{ item.ownerEmail }}</td><td>{{ item.type === 'school' ? '学校空间' : '个人空间' }}</td><td>{{ item.classCount }} 班 / {{ item.studentCount }} 生 / {{ item.questionCount }} 题 / {{ item.sessionCount }} 课</td><td>{{ item.createdAt.slice(0, 10) }}</td></tr></tbody></table></section>
      <section v-if="page === 'classes'" class="table-card"><table><thead><tr><th>班级</th><th>空间</th><th>学生</th><th>创建时间</th><th>操作</th></tr></thead><tbody><tr v-for="item in filteredClasses" :key="item.id"><td><b>{{ item.grade }}{{ item.name }}</b></td><td>{{ item.workspaceName || item.workspaceId }}</td><td>{{ item.activeStudentCount }}/{{ item.studentCount }}</td><td>{{ item.createdAt.slice(0, 10) }}</td><td><button type="button" @click="openStudents(item)">查看学生</button></td></tr></tbody></table></section>
      <section v-if="page === 'questions'" class="table-card"><table><thead><tr><th>题目</th><th>空间</th><th>学科</th><th>答案</th><th>来源</th></tr></thead><tbody><tr v-for="item in filteredQuestions" :key="item.id"><td><b>{{ item.stem }}</b><span>{{ item.grade }} / {{ item.difficulty }}</span></td><td>{{ item.workspaceName || item.workspaceId }}</td><td>{{ item.subject }}</td><td>{{ item.answer }}</td><td>{{ item.aiGenerated ? 'AI' : item.source }}</td></tr></tbody></table></section>
      <section v-if="page === 'sessions'" class="table-card"><table><thead><tr><th>课堂</th><th>空间</th><th>教师/科目</th><th>状态</th><th>创建时间</th></tr></thead><tbody><tr v-for="item in filteredSessions" :key="item.id"><td><b>{{ item.title }}</b></td><td>{{ item.workspaceName || item.workspaceId }}</td><td>{{ item.teacherName || '-' }} / {{ item.subject || '-' }}</td><td>{{ item.status }} / {{ item.stage }}</td><td>{{ item.createdAt.slice(0, 10) }}</td></tr></tbody></table></section>
    </section>
    <div v-if="selectedClass" class="drawer-mask" @click.self="selectedClass = null">
      <aside class="drawer"><header><h2>{{ selectedClass.grade }}{{ selectedClass.name }}</h2><button type="button" @click="selectedClass = null">关闭</button></header><table><thead><tr><th>姓名</th><th>学号</th><th>卡号</th><th>状态</th></tr></thead><tbody><tr v-for="student in students" :key="student.id"><td>{{ student.displayName }}</td><td>{{ student.studentNo }}</td><td>{{ student.cardCode }}</td><td>{{ statusLabel(student.status) }}</td></tr></tbody></table></aside>
    </div>
  </main>
</template>
