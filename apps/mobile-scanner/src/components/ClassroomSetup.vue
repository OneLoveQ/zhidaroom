<script setup lang="ts">
import { ref } from 'vue';
import type { ClassView, QuestionView } from '../types';
import QuestionCreator from './question-creator/QuestionCreator.vue';

interface ClassroomForm {
  classId: string;
  subject: string;
  teacherName: string;
}

defineProps<{
  classes: ClassView[];
  subjects: string[];
  form: ClassroomForm;
  questions: QuestionView[];
  selectedQuestionIds: string[];
  canCreate: boolean;
}>();

const emit = defineEmits<{
  toggleQuestion: [questionId: string];
  questionSaved: [question: QuestionView];
  createClassroom: [];
}>();
const creatorOpen = ref(false);
</script>

<template>
  <section class="panel">
    <h2>课堂信息</h2>
    <label>班级<select v-model="form.classId"><option v-for="item in classes" :key="item.id" :value="item.id">{{ item.grade }}{{ item.name }}</option></select></label>
    <label>科目<select v-model="form.subject"><option v-for="item in subjects" :key="item">{{ item }}</option></select></label>
    <label>教师名称<input v-model.trim="form.teacherName" placeholder="请输入教师名称" /></label>
  </section>
  <section class="panel">
    <div class="section-title">
      <h2>选择题目</h2>
      <button type="button" class="secondary" @click="creatorOpen = !creatorOpen">{{ creatorOpen ? '收起新增题目' : '新增题目' }}</button>
    </div>
    <div class="question-list">
      <button v-for="item in questions" :key="item.id" type="button" :class="{ selected: selectedQuestionIds.includes(item.id) }" @click="emit('toggleQuestion', item.id)">
        <b>{{ item.subject }}</b><span>{{ item.stem }}</span>
      </button>
    </div>
  </section>
  <QuestionCreator v-if="creatorOpen" :subject="form.subject" :grade="classes.find((item) => item.id === form.classId)?.grade ?? '一年级'" @saved="emit('questionSaved', $event)" />
  <section class="actions"><button type="button" :disabled="!canCreate" @click="emit('createClassroom')">生成课堂并开始</button></section>
</template>
