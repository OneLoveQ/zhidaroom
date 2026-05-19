import { computed, ref, watch, type Ref } from 'vue';
import type { SessionReportView } from '../types';

type ReportQuestion = SessionReportView['questions'][number];

export function useReportScope(report: Ref<SessionReportView | null>) {
  const reportIndex = ref(0);
  const selectedReportRunId = ref('all');
  const reportRunGroups = computed(() => {
    const groups = new Map<string, { id: string; title: string; questions: ReportQuestion[] }>();
    report.value?.questions.forEach((item, index) => {
      const id = item.runId ?? `legacy-${index}`;
      const group = groups.get(id) ?? {
        id,
        title: item.runTitle || `第 ${groups.size + 1} 次评测`,
        questions: []
      };
      group.questions.push(item);
      groups.set(id, group);
    });
    return Array.from(groups.values());
  });
  const scopedReportQuestions = computed(() => {
    if (selectedReportRunId.value === 'all') return report.value?.questions ?? [];
    return reportRunGroups.value.find((item) => item.id === selectedReportRunId.value)?.questions ?? [];
  });
  const currentReportItem = computed(() =>
    scopedReportQuestions.value[reportIndex.value] ?? scopedReportQuestions.value[0]
  );
  const scopedReportTitle = computed(() =>
    selectedReportRunId.value === 'all'
      ? '整堂评测总体情况'
      : reportRunGroups.value.find((item) => item.id === selectedReportRunId.value)?.title || '本次评测'
  );
  const scopedReportCorrectRate = computed(() => {
    if (!scopedReportQuestions.value.length) return 0;
    const total = scopedReportQuestions.value.reduce((sum, item) => sum + item.stats.correctRate, 0);
    return Math.round((total / scopedReportQuestions.value.length) * 100);
  });
  const reportAnsweredTotal = computed(() =>
    scopedReportQuestions.value.reduce((sum, item) => sum + item.stats.answered, 0)
  );
  const scopedRankings = computed(() => {
    if (selectedReportRunId.value === 'all') return report.value?.studentRankings ?? [];
    return (report.value?.studentRankings ?? []).map((student) => {
      const answers = student.answers.filter((item) => item.runId === selectedReportRunId.value);
      const correctCount = answers.filter((item) => item.isCorrect).length;
      const answeredCount = answers.filter((item) => item.answered).length;
      return {
        ...student,
        answers,
        answeredCount,
        correctCount,
        totalQuestionCount: answers.length,
        correctRate: answers.length ? correctCount / answers.length : 0
      };
    }).sort((left, right) =>
      right.correctRate - left.correctRate ||
      right.answeredCount - left.answeredCount ||
      left.studentNo.localeCompare(right.studentNo)
    );
  });
  const reportQuestionPosition = computed(() => {
    const total = scopedReportQuestions.value.length;
    if (!currentReportItem.value || selectedReportRunId.value !== 'all') {
      return { current: reportIndex.value + 1, total };
    }
    const runOffset = report.value?.questions.findIndex((item) => item === currentReportItem.value) ?? reportIndex.value;
    return { current: runOffset + 1, total };
  });
  function shiftReportQuestion(step: number): void {
    const count = scopedReportQuestions.value.length;
    if (!count) return;
    reportIndex.value = (reportIndex.value + step + count) % count;
  }
  watch(() => report.value?.sessionId, () => {
    selectedReportRunId.value = reportRunGroups.value.at(-1)?.id ?? 'all';
    reportIndex.value = 0;
  });
  watch(selectedReportRunId, () => { reportIndex.value = 0; });
  return {
    currentReportItem,
    reportAnsweredTotal,
    reportIndex,
    reportQuestionPosition,
    reportRunGroups,
    scopedRankings,
    scopedReportCorrectRate,
    scopedReportQuestions,
    scopedReportTitle,
    selectedReportRunId,
    shiftReportQuestion
  };
}
