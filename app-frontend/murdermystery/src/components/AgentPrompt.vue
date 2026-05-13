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
      sessionId: null,
    };
  },
  mounted() {
    // Generate or retrieve session ID from localStorage
    this.sessionId = this.getOrCreateSessionId();
  },
  computed: {
    placeholder() {
      return 'e.g. Show me the collections';
    }
  },
  methods: {
    /**
     * Generate or retrieve session ID for conversation memory
     */
    getOrCreateSessionId() {
      const STORAGE_KEY = 'mmm_agent_session_id';
      let sessionId = localStorage.getItem(STORAGE_KEY);

      if (!sessionId) {
        // Generate new session ID using crypto.randomUUID or fallback
        sessionId = this.generateSessionId();
        localStorage.setItem(STORAGE_KEY, sessionId);
      }

      return sessionId;
    },

    /**
     * Generate a unique session ID
     */
    generateSessionId() {
      // Use crypto.randomUUID if available (modern browsers)
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }

      // Fallback for older browsers
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },

    async runPrompt() {
      this.resultsText = null;
      this.loading = true;

      try {
        // Use API service with session ID for conversation memory
        const data = await apiService.sendAgentPrompt(this.userPrompt, this.sessionId);
        const reply = typeof data?.reply === 'string' ? data.reply : JSON.stringify(data);
        this.resultsText = reply;

        // Update session ID if backend returned one
        if (data?.sessionId) {
          this.sessionId = data.sessionId;
        }
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
