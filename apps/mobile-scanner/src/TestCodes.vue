<script setup lang="ts">
import { computed, ref } from 'vue';
import { createMarkerCells, orientCellsForAnswer } from '../../../services/cv-service/src/card-codec';
import type { OptionKey } from './types';

type TestMode = 'wall' | 'single';

interface TestCodeItem {
  cardCode: string;
  cells: number[][];
  index: number;
  option: OptionKey;
  tilt: number;
  offsetX: number;
  offsetY: number;
}

const options: OptionKey[] = ['A', 'B', 'C', 'D'];
const scannerHomeUrl = window.location.pathname.startsWith('/scanner') ? '/scanner/' : '/';
const selectedCardCode = ref('C001');
const selectedOption = ref<OptionKey>('A');
const mode = ref<TestMode>('wall');
const allCardCodes = Array.from({ length: 60 }, (_, index) => `C${String(index + 1).padStart(3, '0')}`);
const wallItems = computed(() =>
  allCardCodes.map((cardCode, index) => createTestCodeItem(cardCode, options[index % options.length], index))
);
const cells = computed(() => createAnswerCells(selectedCardCode.value, selectedOption.value));

function choose(cardCode: string, option: OptionKey): void {
  selectedCardCode.value = cardCode;
  selectedOption.value = option;
  mode.value = 'single';
}

function createTestCodeItem(cardCode: string, option: OptionKey, index: number): TestCodeItem {
  return {
    cardCode,
    cells: createAnswerCells(cardCode, option),
    index,
    option,
    tilt: [-3.2, 1.8, -1.5, 2.7, -2.1, 0.8][index % 6],
    offsetX: [-2, 1, 0, 2, -1][index % 5],
    offsetY: [0, -2, 2, 1, -1][index % 5]
  };
}

function createAnswerCells(cardCode: string, option: OptionKey): number[][] {
  const id = Number(cardCode.replace(/\D/g, ''));
  return orientCellsForAnswer(createMarkerCells(id || 1), option);
}
</script>

<template>
  <main class="test-code-shell">
    <header class="test-code-hero">
      <div>
        <p>扫码识别测试</p>
        <h1>通用答题码 C001-C060</h1>
      </div>
      <a :href="scannerHomeUrl">返回扫码端</a>
    </header>

    <section class="test-code-panel compact">
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
          60 码墙
        </button>
        <button type="button" :class="{ selected: mode === 'single' }" @click="mode = 'single'">
          单码放大
        </button>
      </div>
    </section>

    <section v-if="mode === 'wall'" class="code-wall-card">
      <div class="section-heading">
        <h2>批量扫码测试</h2>
        <span>60 个通用码，轻微角度扰动</span>
      </div>
      <div class="code-wall">
        <article
          v-for="item in wallItems"
          :key="item.cardCode"
          class="wall-code-card"
          :style="{ '--tilt': `${item.tilt}deg`, '--offset-x': `${item.offsetX}px`, '--offset-y': `${item.offsetY}px` }"
        >
          <div class="scan-code mini" aria-label="答题码">
            <span
              v-for="(cell, index) in item.cells.flat()"
              :key="index"
              :class="{ dark: cell === 1 }"
            ></span>
          </div>
          <div class="code-meta compact">
            <strong>{{ item.cardCode }}</strong>
            <span>选择 {{ item.option }}</span>
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
        <strong>{{ selectedCardCode }}</strong>
        <span>选择 {{ selectedOption }}</span>
      </div>
    </section>

    <section v-if="mode === 'single'" class="test-code-panel">
      <div class="section-heading">
        <h2>选择测试码</h2>
        <span>1-60 号</span>
      </div>
      <div class="all-code-list">
        <article v-for="cardCode in allCardCodes" :key="cardCode" class="student-code-row">
          <strong>{{ cardCode }}</strong>
          <button
            v-for="option in options"
            :key="`${cardCode}-${option}`"
            type="button"
            :class="{ selected: cardCode === selectedCardCode && option === selectedOption }"
            @click="choose(cardCode, option)"
          >
            {{ option }}
          </button>
        </article>
      </div>
    </section>
  </main>
</template>
