<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { BarChart3, Brain, Download, RefreshCcw, UsersRound } from 'lucide-vue-next';
import { api, toChineseError } from '../api/client';
import { downloadExcel, type ExcelRow } from '../excel';
import DiagnosisHistory from './DiagnosisHistory.vue';
import SessionReportPanel from './SessionReportPanel.vue';
import StudentLearningDetailPanel from './StudentLearningDetailPanel.vue';
import type {
  AiLearningDiagnosisRecordView,
  AiLearningDiagnosisResult,
  ClassLearningAnalysisView,
  ClassView,
  SessionReportView,
  StudentLearningDetailView
} from '../types';
import './learning-analysis.css';

const classes = ref<ClassView[]>([]);
const selectedClassId = ref('');
const analysis = ref<ClassLearningAnalysisView | null>(null);
const studentDetail = ref<StudentLearningDetailView | null>(null);
const sessionReport = ref<SessionReportView | null>(null);
const classAi = ref<AiLearningDiagnosisResult | null>(null);
const studentAi = ref<AiLearningDiagnosisResult | null>(null);
const classHistory = ref<AiLearningDiagnosisRecordView[]>([]);
const studentHistory = ref<AiLearningDiagnosisRecordView[]>([]);
const loading = ref(false);
const failed = ref('');
const dateFrom = ref('');
const dateTo = ref('');
const selectedSubject = ref('');
const recentSessionLimit = ref(20);
const subjectOptions = ['全部', '数学', '语文', '英语', '科学', '道德与法治', '综合'];

const weakStudents = computed(() =>
  analysis.value?.students.filter((item) => item.status !== '稳定').slice(0, 12) ?? []
);
const range = computed(() => ({
  from: dateFrom.value || undefined,
  to: dateTo.value || undefined,
  subject: selectedSubject.value || undefined,
  limit: recentSessionLimit.value,
  offset: 0
}));
const hasMoreSessions = computed(() =>
  Boolean(analysis.value && analysis.value.recentSessions.length < analysis.value.totalRecentSessionCount)
);

onMounted(() => void loadClasses());

async function loadClasses(): Promise<void> {
  await runAction(async () => {
    classes.value = await api.listClasses();
    selectedClassId.value = classes.value[0]?.id ?? '';
    if (selectedClassId.value) await refreshAnalysis();
  });
}

async function refreshAnalysis(resetDetail = true): Promise<void> {
  if (!selectedClassId.value) {
    analysis.value = null;
    return;
  }
  await runAction(async () => {
    analysis.value = await api.getClassLearningAnalysis(selectedClassId.value, range.value);
    if (resetDetail) {
      studentDetail.value = null;
      sessionReport.value = null;
      classAi.value = null;
      studentAi.value = null;
    }
    classHistory.value = await api.listClassLearningHistory(selectedClassId.value);
    if (resetDetail) studentHistory.value = [];
  });
}

async function changeFilter(): Promise<void> {
  recentSessionLimit.value = 20;
  await refreshAnalysis();
}

async function loadMoreSessions(): Promise<void> {
  recentSessionLimit.value += 20;
  await refreshAnalysis(false);
}

async function selectSession(sessionId: string): Promise<void> {
  await runAction(async () => {
    sessionReport.value = await api.getSessionReport(sessionId);
  });
}

async function selectStudent(studentId: string): Promise<void> {
  if (!selectedClassId.value) return;
  await runAction(async () => {
    studentDetail.value = await api.getStudentLearningAnalysis(selectedClassId.value, studentId, range.value);
    studentAi.value = null;
    studentHistory.value = await api.listStudentLearningHistory(selectedClassId.value, studentId);
  });
}

async function generateClassAi(): Promise<void> {
  if (!selectedClassId.value) return;
  await runAction(async () => {
    classAi.value = await api.diagnoseClassLearning(selectedClassId.value, range.value);
    classHistory.value = await api.listClassLearningHistory(selectedClassId.value);
  });
}

async function generateStudentAi(): Promise<void> {
  if (!selectedClassId.value || !studentDetail.value) return;
  await runAction(async () => {
    studentAi.value = await api.diagnoseStudentLearning(
      selectedClassId.value,
      studentDetail.value!.studentId,
      range.value
    );
    studentHistory.value = await api.listStudentLearningHistory(
      selectedClassId.value,
      studentDetail.value!.studentId
    );
  });
}

function exportAnalysis(): void {
  if (!analysis.value) return;
  const rows: ExcelRow[] = [
    { 类型: '班级概览', 项目: '班级', 数值: analysis.value.className },
    { 类型: '班级概览', 项目: '学科', 数值: selectedSubject.value || '全部' },
    { 类型: '班级概览', 项目: '时间范围', 数值: rangeLabel() },
    { 类型: '班级概览', 项目: '平均正确率', 数值: percent(analysis.value.summary.averageCorrectRate) },
    { 类型: '班级概览', 项目: '参与率', 数值: percent(analysis.value.summary.participationRate) },
    ...analysis.value.knowledgePoints.map((item) => ({
      类型: '知识点', 项目: item.name, 数值: percent(item.correctRate), 状态: item.status
    })),
    ...analysis.value.students.map((item) => ({
      类型: '学生', 项目: item.displayName, 学号: item.studentNo,
      正确率: percent(item.correctRate), 未答: item.missedCount, 状态: item.status,
      薄弱点: item.weakKnowledgePoints.join('、')
    }))
  ];
  downloadExcel(`${analysis.value.className}-学情分析.xlsx`, '学情分析', rows);
}

async function runAction(action: () => Promise<void>): Promise<void> {
  loading.value = true;
  failed.value = '';
  try {
    await action();
  } catch (error) {
    failed.value = toChineseError(error);
  } finally {
    loading.value = false;
  }
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function rangeLabel(): string {
  return `${dateFrom.value || '开始'} 至 ${dateTo.value || '今天'}`;
}
</script>

<template>
  <section class="analysis-page">
    <header class="analysis-toolbar">
      <label>
        选择班级
        <select v-model="selectedClassId" @change="changeFilter">
          <option v-for="item in classes" :key="item.id" :value="item.id">
            {{ item.grade }}{{ item.name }}
          </option>
        </select>
      </label>
      <label>
        选择学科
        <select v-model="selectedSubject" @change="changeFilter">
          <option value="">全部</option>
          <option v-for="item in subjectOptions.filter((subject) => subject !== '全部')" :key="item" :value="item">
            {{ item }}
          </option>
        </select>
      </label>
      <label>
        开始日期
        <input v-model="dateFrom" type="date" @change="changeFilter" />
      </label>
      <label>
        结束日期
        <input v-model="dateTo" type="date" @change="changeFilter" />
      </label>
      <button type="button" :disabled="loading || !selectedClassId" @click="() => refreshAnalysis()">
        <RefreshCcw :size="18" />
        刷新分析
      </button>
      <button type="button" :disabled="!analysis" @click="exportAnalysis">
        <Download :size="18" />
        导出
      </button>
    </header>

    <p v-if="failed" class="status error">{{ failed }}</p>
    <p v-else-if="!classes.length" class="empty">请先在班级管理中创建班级并导入学生。</p>
    <p v-else-if="loading && !analysis" class="empty">正在汇总班级学情...</p>

    <template v-if="analysis">
      <section class="metric-grid">
        <article>
          <span>累计课堂</span>
          <strong>{{ analysis.summary.sessionCount }}</strong>
          <small>{{ analysis.summary.questionCount }} 道题</small>
        </article>
        <article>
          <span>平均正确率</span>
          <strong>{{ percent(analysis.summary.averageCorrectRate) }}</strong>
          <small>{{ analysis.summary.answeredCount }} 次有效作答</small>
        </article>
        <article>
          <span>参与率</span>
          <strong>{{ percent(analysis.summary.participationRate) }}</strong>
          <small>{{ analysis.summary.studentCount }} 名学生</small>
        </article>
        <article>
          <span>需关注</span>
          <strong>{{ analysis.summary.attentionStudentCount }}</strong>
          <small>{{ analysis.summary.weakKnowledgeCount }} 个薄弱点</small>
        </article>
      </section>

      <section class="analysis-grid">
        <article class="panel">
          <div class="panel-title">
            <h3><Brain :size="18" /> AI 班级诊断</h3>
            <button type="button" :disabled="loading" @click="generateClassAi">生成</button>
          </div>
          <p v-for="item in (classAi?.diagnosis ?? analysis.aiDiagnosis)" :key="item">{{ item }}</p>
          <div v-if="classAi?.recommendations.length" class="recommendations">
            <b>建议动作</b>
            <span v-for="item in classAi.recommendations" :key="item">{{ item }}</span>
          </div>
          <small v-if="classAi">来源：{{ classAi.source === 'model' ? '大模型' : '规则兜底' }}</small>
          <DiagnosisHistory title="班级诊断历史" :items="classHistory" />
        </article>

        <article class="panel">
          <h3><BarChart3 :size="18" /> 知识点积累</h3>
          <div v-if="analysis.knowledgePoints.length" class="knowledge-list">
            <div v-for="item in analysis.knowledgePoints.slice(0, 8)" :key="item.name">
              <span>{{ item.name }}</span>
              <meter min="0" max="1" :value="item.correctRate" />
              <b :class="item.status">{{ percent(item.correctRate) }}</b>
            </div>
          </div>
          <p v-else class="empty">暂无知识点数据。</p>
        </article>

        <article class="panel">
          <h3><UsersRound :size="18" /> 学生学情档案</h3>
          <table v-if="analysis.students.length" class="analysis-table">
            <thead><tr><th>学生</th><th>正确率</th><th>未答</th><th>状态</th></tr></thead>
            <tbody>
              <tr
                v-for="student in analysis.students.slice(0, 16)"
                :key="student.studentId"
                :class="{ selected: studentDetail?.studentId === student.studentId }"
                @click="selectStudent(student.studentId)"
              >
                <td>
                  <button type="button" class="link-button">
                    <b>{{ student.displayName }}</b><span>{{ student.studentNo }}</span>
                  </button>
                </td>
                <td>{{ percent(student.correctRate) }}</td>
                <td>{{ student.missedCount }}</td>
                <td>{{ student.status }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="empty">暂无学生答题数据。</p>
          <small v-if="weakStudents.length">优先关注：{{ weakStudents.map((item) => item.displayName).join('、') }}</small>
        </article>

        <article class="panel">
          <h3><BarChart3 :size="18" /> 最近课堂</h3>
          <div v-if="analysis.recentSessions.length" class="session-list">
            <button
              v-for="item in analysis.recentSessions"
              :key="item.sessionId"
              type="button"
              :class="{ selected: sessionReport?.sessionId === item.sessionId }"
              @click="selectSession(item.sessionId)"
            >
              <span>{{ item.title }}</span>
              <small>{{ item.subject || '未标注' }} / {{ item.createdAt.slice(0, 10) }}</small>
              <b>{{ percent(item.averageCorrectRate) }}</b>
            </button>
          </div>
          <p v-else class="empty">完成一次课堂后，这里会显示趋势。</p>
          <button
            v-if="hasMoreSessions"
            type="button"
            class="load-more-button"
            :disabled="loading"
            @click="loadMoreSessions"
          >
            加载更多课堂（{{ analysis.recentSessions.length }}/{{ analysis.totalRecentSessionCount }}）
          </button>
        </article>

        <SessionReportPanel v-if="sessionReport" :report="sessionReport" :percent="percent" />

        <StudentLearningDetailPanel
          v-if="studentDetail"
          :detail="studentDetail"
          :ai="studentAi"
          :history="studentHistory"
          :loading="loading"
          :percent="percent"
          @generate="generateStudentAi"
        />
      </section>
    </template>
  </section>
</template>
