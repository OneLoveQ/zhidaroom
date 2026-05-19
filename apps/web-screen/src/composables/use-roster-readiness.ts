import { ref } from 'vue';
import { api } from '../api';

export function useRosterReadiness() {
  const hasRosterData = ref(false);
  const checkingRosterData = ref(false);

  async function refreshRosterReadiness(): Promise<void> {
    checkingRosterData.value = true;
    try {
      const classes = await api.listClasses();
      if (!classes.length) {
        hasRosterData.value = false;
        return;
      }
      const counts = await Promise.all(classes.map(async (item) => (await api.listStudents(item.id)).length));
      hasRosterData.value = counts.some((count) => count > 0);
    } finally {
      checkingRosterData.value = false;
    }
  }

  return { checkingRosterData, hasRosterData, refreshRosterReadiness };
}
