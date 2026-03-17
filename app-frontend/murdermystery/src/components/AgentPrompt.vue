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
import apiService from '@/services/api';

export default {
  name: 'AgentPrompt',
  data() {
    return {
      userPrompt: '',
      resultsText: null,
      loading: false,
    };
  },
  computed: {
    placeholder() {
      return 'e.g. Show me the collections';
    }
  },
  methods: {
    async runPrompt() {
      this.resultsText = null;
      this.loading = true;

      try {
        // Use API service which handles validation
        const data = await apiService.sendAgentPrompt(this.userPrompt);
        const reply = typeof data?.reply === 'string' ? data.reply : JSON.stringify(data);
        this.resultsText = reply;
      } catch (error) {
        // Use user-friendly error message from API service
        this.resultsText = error.userMessage || error.message || 'Failed to get response from agent';
      } finally {
        this.loading = false;
      }
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
