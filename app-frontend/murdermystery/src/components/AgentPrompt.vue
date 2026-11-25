<template>
  <div class="mongoqueryitem">
    <h3>Browse through the Murder Mystery in plain English</h3>
    <div>
      Describe what you want to find. We'll search the mystery data for you.
    </div>

    <textarea v-model="userPrompt" :placeholder="placeholder" class="query-textarea" maxlength="512"
      aria-label="Your question for the agent" @keydown.ctrl.enter.prevent="runPrompt"
      @keydown.meta.enter.prevent="runPrompt"></textarea>

    <div class="chips" role="group" aria-label="Example questions">
      <span class="chips-label">Try one:</span>
      <button v-for="example in examples" :key="example" type="button" class="chip" @click="useExample(example)">
        {{ example }}
      </button>
    </div>

    <div class="button-group">
      <button @click="runPrompt" :disabled="loading">ASK</button>
      <button @click="resetPrompt">RESET</button>
      <span class="run-hint">or press <kbd>Ctrl</kbd>/<kbd>&#8984;</kbd> + <kbd>Enter</kbd></span>
    </div>

    <div class="query-result plain-result" aria-live="polite">
      <div v-if="loading" class="plain-text">💭 Thinking...</div>
      <div v-else-if="resultsText" class="plain-text">{{ resultsText }}</div>
    </div>

    <details v-if="queries.length" class="how">
      <summary>How the agent got this answer ({{ queries.length }} {{ queries.length === 1 ? 'query' : 'queries' }})</summary>
      <ol>
        <li v-for="(q, i) in queries" :key="i">
          <code>{{ toShell(q) }}</code><span v-if="q.isError" class="failed"> (that one failed)</span>
        </li>
      </ol>
      <p class="how-note">
        The agent only reads the game data. You can run find, count and distinct queries like these yourself in the
        <router-link to="/#experienced">query box</router-link>.
      </p>
    </details>
  </div>
</template>

<script>
import apiService from '@/services/api';
import { toShell } from '@/lib/shell.js';

export default {
  name: 'AgentPrompt',
  data() {
    return {
      userPrompt: '',
      resultsText: null,
      loading: false,
      sessionId: null,
      queries: [],
      examples: [
        'Find the crime that happened on January 15, 2018 in MongoDB City',
        'Show me the witnesses mentioned in the crime report',
        'Find all suspects and their details',
        'What events did the main suspect attend?',
      ],
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
    toShell,
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

    useExample(example) {
      this.userPrompt = example;
      this.runPrompt();
    },

    async runPrompt() {
      if (this.loading) return;
      this.resultsText = null;
      this.queries = [];
      this.loading = true;

      try {
        // Use API service with session ID for conversation memory
        const data = await apiService.sendAgentPrompt(this.userPrompt, this.sessionId);
        const reply = typeof data?.reply === 'string' ? data.reply : JSON.stringify(data);
        this.resultsText = reply;
        this.queries = Array.isArray(data?.queries) ? data.queries : [];

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
      this.queries = [];
      this.loading = false;
    }
  }
};
</script>

<style scoped>
.chips { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin-top: 0.75rem; }
.chips-label { font-size: 0.9rem; }
.chip { margin: 0; padding: 0.3rem 0.7rem; border-radius: 999px; background: transparent; color: var(--link-color); border: 1px solid var(--link-color); font-weight: normal; width: auto; }
.chip:hover { background: var(--nav-active-bg-color); color: var(--header-color); }
.run-hint { margin-left: 0.5rem; font-size: 0.85rem; opacity: 0.8; }
kbd { border: 1px solid #999; border-radius: 3px; padding: 0 0.3rem; font-size: 0.8rem; background: #f4f4f4; color: #222; }
.how { margin-top: 1rem; }
.how summary { cursor: pointer; color: var(--link-color); }
.how ol { padding-left: 1.5rem; margin-top: 0.5rem; }
.how code { overflow-wrap: anywhere; }
.how-note { margin-top: 0.5rem; font-size: 0.9rem; }
.failed { color: #b00020; }
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
