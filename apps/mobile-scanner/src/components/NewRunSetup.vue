<script setup lang="ts">
import { ref } from 'vue';
import type { QuestionView } from '../types';
import QuestionCreator from './question-creator/QuestionCreator.vue';

defineProps<{
  title: string;
  questions: QuestionView[];
  selectedQuestionIds: string[];
  canStart: boolean;
  subject: string;
  grade: string;
}>();

const emit = defineEmits<{
  updateTitle: [value: string];
  toggleQuestion: [questionId: string];
  questionSaved: [question: QuestionView];
  cancel: [];
  start: [];
}>();
const creatorOpen = ref(false);
</script>

<template>
  <section class="panel new-run-panel">
    <div class="section-title">
      <h2>开启新评测</h2>
      <button type="button" class="secondary" @click="emit('cancel')">取消</button>
    </div>
    <label>
      评测名称
      <input :value="title" placeholder="例如 第 2 次评测" @input="emit('updateTitle', ($event.target as HTMLInputElement).value)" />
    </label>
    <div class="section-title">
      <h2>选择题目</h2>
      <button type="button" class="secondary" @click="creatorOpen = !creatorOpen">{{ creatorOpen ? '收起新增题目' : '新增题目' }}</button>
    </div>
    <div class="question-list">
      <button
        v-for="item in questions"
        :key="item.id"
        type="button"
        :class="{ selected: selectedQuestionIds.includes(item.id) }"
        @click="emit('toggleQuestion', item.id)"
      >
        <b>{{ item.subject }}</b><span>{{ item.stem }}</span>
      </button>
    </div>
    <QuestionCreator v-if="creatorOpen" :subject="subject" :grade="grade" @saved="emit('questionSaved', $event)" />
    <button type="button" :disabled="!canStart" @click="emit('start')">开始本次评测</button>
  </section>
</template>
