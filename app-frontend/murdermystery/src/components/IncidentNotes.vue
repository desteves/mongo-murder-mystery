<template>
  <div class="incident-notes">
    <div class="incident-notes__header">
      <div class="incident-notes__title">📓 Incident Notes</div>
      <div class="incident-notes__actions">
        <button class="notes-button" @click="undo" :disabled="!canUndo">UNDO</button>
        <button class="notes-button danger" @click="clearNotes" :disabled="!notes && !canUndo">CLEAR</button>
      </div>
    </div>
    <p class="incident-notes__helper">
      Paste key findings from your query results so they stay handy while you investigate.
    </p>
    <textarea
      class="incident-notes__textarea"
      :value="notes"
      :maxlength="MAX_LENGTH"
      rows="10"
      @input="handleInput"
      placeholder="Drop your clues here. They will stick around even if you refresh."
    ></textarea>
    <div class="incident-notes__footer">
      <span>{{ remainingChars }} characters left</span>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';

const STORAGE_KEY = 'incident-notes';
const HISTORY_KEY = 'incident-notes-history';
const MAX_LENGTH = 999;
const MAX_HISTORY = 3;

const notes = ref('');
const history = ref([]);

const remainingChars = computed(() => MAX_LENGTH - notes.value.length);
const canUndo = computed(() => history.value.length > 0);

const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, notes.value);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value));
  } catch (error) {
    console.error('Unable to save notes', error);
  }
};

const pushToHistory = (value) => {
  if (value === undefined || value === null) return;
  if (history.value[history.value.length - 1] === value) return;
  if (history.value.length >= MAX_HISTORY) {
    history.value.shift();
  }
  history.value.push(value);
};

const handleInput = (event) => {
  const incoming = event.target.value.slice(0, MAX_LENGTH);
  if (incoming === notes.value) return;
  pushToHistory(notes.value);
  notes.value = incoming;
  persist();
};

const undo = () => {
  if (!history.value.length) return;
  const previous = history.value.pop();
  notes.value = previous || '';
  persist();
};

const clearNotes = () => {
  if (!notes.value && !history.value.length) return;
  pushToHistory(notes.value);
  notes.value = '';
  persist();
};

onMounted(() => {
  try {
    const savedNotes = localStorage.getItem(STORAGE_KEY);
    const savedHistory = localStorage.getItem(HISTORY_KEY);

    if (savedNotes !== null) {
      notes.value = savedNotes.slice(0, MAX_LENGTH);
    }

    if (savedHistory) {
      const parsed = JSON.parse(savedHistory);
      if (Array.isArray(parsed)) {
        history.value = parsed.slice(-MAX_HISTORY);
      }
    }

    // Re-save to ensure trimmed values are persisted.
    persist();
  } catch (error) {
    console.error('Unable to load saved notes', error);
  }
});
</script>

<style scoped>
.incident-notes {
  border: 1px solid #ccc;
  padding: 1rem;
  border-radius: 0.75rem;
  max-width: 640px;
  width: 100%;
  margin: 0;
  background: var(--body-bg);
  color: var(--text-color);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.incident-notes__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.incident-notes__title {
  font-weight: bold;
  color: var(--header-color);
}

.incident-notes__actions {
  display: flex;
  gap: 0.5rem;
}

.incident-notes__helper {
  margin: 0.5rem 0 0.75rem;
}

.incident-notes__textarea {
  width: 100%;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #ccc;
  background-color: #d8f0cfdf;
  color: var(--text-color);
  font-size: 1rem;
  font-family: 'Courier New', Courier, monospace;
  resize: vertical;
  min-height: 12rem;
  outline: none;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.incident-notes__textarea:focus {
  border-color: #33c24b;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1), 0 0 6px rgba(51, 194, 75, 0.5);
}

.incident-notes__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: var(--header-color);
  flex-wrap: wrap;
  gap: 0.5rem;
}

.notes-button {
  background-color: #266133;
  color: #fff;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.notes-button:hover:not(:disabled) {
  background-color: #68ed4e;
}

.notes-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.notes-button.danger {
  background-color: #8c1c13;
}

.notes-button.danger:hover:not(:disabled) {
  background-color: #b22217;
}
</style>
