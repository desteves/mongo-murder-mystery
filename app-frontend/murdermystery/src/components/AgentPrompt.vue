<template>
  <div class="mongoqueryitem">
    <h3>Browse through the Murder Mystery in plain English</h3>
    <div>
      Describe what you want to find. We'll search the mystery data for you.
    </div>

    <textarea v-model="userPrompt" :placeholder="placeholder" class="query-textarea"></textarea>

    <div class="button-group">
      <button @click="runPrompt">ASK</button>
      <button @click="resetPrompt">RESET</button>
    </div>

    <div class="query-result plain-result">
      <div v-if="loading" class="plain-text">💭 Thinking...</div>
      <div v-else-if="resultsText" class="plain-text">{{ resultsText }}</div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'AgentPrompt',
  data() {
    return {
      userPrompt: '',
      resultsText: null,
      // apiUrl: import.meta.env.VITE_MMM_API_BASE_URL ?? 'http://localhost:3000',
      apiUrl: 'https://mmm-be-1020079043644.us-central1.run.app',
      loading: false,
    };
  },
  computed: {
    placeholder() {
      return 'e.g. Show me the collections';
    }
  },
  methods: {
    runPrompt() {
      this.resultsText = null;
      this.loading = true;

      const MAX_PROMPT_LENGTH = 512;
      if (typeof this.userPrompt !== 'string' || !this.userPrompt.trim()) {
        this.resultsText = 'Prompt is empty or undefined.';
        this.loading = false;
        return false;
      }
      if (this.userPrompt.length > MAX_PROMPT_LENGTH) {
        this.resultsText = 'Prompt is too large.';
        this.loading = false;
        return false;
      }

      axios.post(`${this.apiUrl}/agent`, { prompt: this.userPrompt })
        .then(response => {
          const data = response.data;
          // Detect misconfigured endpoints that return HTML
          if (typeof data === 'string' && data.toLowerCase().includes('<!doctype html')) {
            this.resultsText = 'The agent endpoint is misconfigured.';
            return;
          }
          const reply = typeof data?.reply === 'string' ? data.reply : JSON.stringify(data);
          this.resultsText = reply;
        })
        .catch(error => {
          const payload = error.response && error.response.data
            ? error.response.data
            : { error: 'Failed to fetch data' };
          this.resultsText = payload.err || payload.error || JSON.stringify(payload);
        })
        .finally(() => {
          this.loading = false;
        });
    },
    resetPrompt() {
      this.userPrompt = '';
      this.resultsText = null;
      this.loading = false;
    }
  }
};
</script>

<style scoped>
.plain-result {
  background: #f4f4f4;
  border: 1px solid black;
  color: teal;
  font-family: inherit;
}
.plain-text {
  color: teal;
  white-space: pre-wrap;
  font-size: 1.05rem;
}
</style>
