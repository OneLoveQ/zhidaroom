<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { createMarkerCells, orientCellsForAnswer } from '../../../services/cv-service/src/card-codec';
import { api } from './api';
import type { ClassView, OptionKey, StudentView } from './types';

const options: OptionKey[] = ['A', 'B', 'C', 'D'];
type TestMode = 'wall' | 'single';
const classes = ref<ClassView[]>([]);
const students = ref<StudentView[]>([]);
const selectedClassId = ref('');
const selectedCardCode = ref('');
const selectedOption = ref<OptionKey>('A');
const mode = ref<TestMode>('wall');
const loading = ref(false);
const failed = ref('');

const selectedStudent = computed(() =>
  students.value.find((student) => student.cardCode === selectedCardCode.value)
);
const selectedClass = computed(() =>
  classes.value.find((item) => item.id === selectedClassId.value)
);
const cells = computed(() => createAnswerCells(selectedCardCode.value, selectedOption.value));
const wallStudents = computed(() =>
  students.value.map((student, index) => ({
    student,
    option: options[index % options.length],
    cells: createAnswerCells(student.cardCode, options[index % options.length])
  }))
);

onMounted(() => void loadClasses());

async function loadClasses(): Promise<void> {
  await run(async () => {
    classes.value = await api.listClasses();
    selectedClassId.value = classes.value[0]?.id ?? '';
    await loadStudents();
  });
}

async function loadStudents(): Promise<void> {
  await run(async () => {
    students.value = selectedClassId.value ? await api.listStudents(selectedClassId.value) : [];
    selectedCardCode.value = students.value[0]?.cardCode ?? '';
  });
}

function choose(cardCode: string, option: OptionKey): void {
  selectedCardCode.value = cardCode;
  selectedOption.value = option;
  mode.value = 'single';
}

function createAnswerCells(cardCode: string, option: OptionKey): number[][] {
  const id = Number(cardCode.replace(/\D/g, ''));
  if (!id) {
    return createMarkerCells(1);
  }
  return orientCellsForAnswer(createMarkerCells(id), option);
}

async function run(action: () => Promise<void>): Promise<void> {
  loading.value = true;
  failed.value = '';
  try {
    await action();
  } catch (error) {
    failed.value = error instanceof Error ? error.message : String(error);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="test-code-shell">
    <header class="test-code-hero">
      <div>
        <p>扫码测试页</p>
        <h1>{{ selectedClass ? `${selectedClass.grade}${selectedClass.name}` : '答题码测试' }}</h1>
      </div>
      <a href="/">返回扫码端</a>
    </header>

    <section class="test-code-panel">
      <label>
        班级
        <select v-model="selectedClassId" @change="loadStudents">
          <option v-for="item in classes" :key="item.id" :value="item.id">
            {{ item.grade }}{{ item.name }}
          </option>
        </select>
      </label>
      <label>
        学生
        <select v-model="selectedCardCode">
          <option v-for="student in students" :key="student.id" :value="student.cardCode">
            {{ student.displayName }} / {{ student.cardCode }}
          </option>
        </select>
      </label>
      <div class="answer-switch">
        <button
          v-for="option in options"
          :key="option"
          type="button"
          :class="{ selected: selectedOption === option }"
          @click="selectedOption = option"
        >
          {{ option }}
        </button>
      </div>
      <div class="mode-switch">
        <button type="button" :class="{ selected: mode === 'wall' }" @click="mode = 'wall'">
          班级码墙
        </button>
        <button type="button" :class="{ selected: mode === 'single' }" @click="mode = 'single'">
          单码放大
        </button>
      </div>
    </section>

    <section v-if="mode === 'wall'" class="code-wall-card">
      <div class="section-heading">
        <h2>学生答题码</h2>
        <span>{{ loading ? '加载中' : `${wallStudents.length} 个` }}</span>
      </div>
      <p v-if="failed" class="test-error">{{ failed }}</p>
      <div class="code-wall">
        <article v-for="item in wallStudents" :key="item.student.id" class="wall-code-card">
          <div class="scan-code mini" aria-label="学生答题码">
            <span
              v-for="(cell, index) in item.cells.flat()"
              :key="index"
              :class="{ dark: cell === 1 }"
            ></span>
          </div>
          <div class="code-meta compact">
            <strong>{{ item.student.displayName }}</strong>
            <span>{{ item.student.cardCode }} / 选择 {{ item.option }}</span>
          </div>
        </article>
      </div>
    </section>

    <section v-else class="big-code-card">
      <div class="scan-stage">
        <div class="scan-code large" aria-label="当前答题码">
          <span
            v-for="(cell, index) in cells.flat()"
            :key="index"
            :class="{ dark: cell === 1 }"
          ></span>
        </div>
      </div>
      <div class="code-meta">
        <strong>{{ selectedStudent?.displayName ?? '未选择学生' }}</strong>
        <span>{{ selectedCardCode }} / 选择 {{ selectedOption }}</span>
      </div>
    </section>

    <section v-if="mode === 'single'" class="test-code-panel">
      <div class="section-heading">
        <h2>全部学生码</h2>
        <span>{{ loading ? '加载中' : `${students.length} 人` }}</span>
      </div>
      <p v-if="failed" class="test-error">{{ failed }}</p>
      <div class="all-code-list">
        <article v-for="student in students" :key="student.id" class="student-code-row">
          <div>
            <strong>{{ student.displayName }}</strong>
            <span>{{ student.studentNo }} / {{ student.cardCode }}</span>
          </div>
          <button
            v-for="option in options"
            :key="`${student.id}-${option}`"
            type="button"
            :class="{ selected: student.cardCode === selectedCardCode && option === selectedOption }"
            @click="choose(student.cardCode, option)"
          >
            {{ option }}
          </button>
        </article>
      </div>
    </section>
  </main>
</template>
