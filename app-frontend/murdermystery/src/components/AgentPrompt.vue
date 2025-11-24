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

    <div v-if="resultsText" class="query-result">
      <b>Result</b>
      <pre ref="resultsBlock" class="language-json" v-html="resultsText"></pre>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import Prism from 'prismjs';
import 'prismjs/themes/prism.css';
import 'prismjs/components/prism-json.min.js';

export default {
  name: 'AgentPrompt',
  data() {
    return {
      userPrompt: '',
      resultsText: null,
      apiUrl: import.meta.env.VITE_MMM_API_BASE_URL ?? 'http://localhost:3000',
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

      const MAX_PROMPT_LENGTH = 512;
      if (typeof this.userPrompt !== 'string' || !this.userPrompt.trim()) {
        this.resultsText = JSON.stringify({ msg: 'Prompt is empty or undefined.' }, null, 2);
        return false;
      }
      if (this.userPrompt.length > MAX_PROMPT_LENGTH) {
        this.resultsText = JSON.stringify({ msg: 'Prompt is too large.' }, null, 2);
        return false;
      }

      axios.post(`${this.apiUrl}/agent`, { prompt: this.userPrompt })
        .then(response => {
          this.resultsText = JSON.stringify(response.data, null, 2);
          this.$nextTick(() => {
            this.highlightCode('resultsBlock');
          });
        })
        .catch(error => {
          const payload = error.response && error.response.data
            ? error.response.data
            : { error: 'Failed to fetch data' };
          this.resultsText = JSON.stringify(payload, null, 2);
          this.$nextTick(() => {
            this.highlightCode('resultsBlock');
          });
        });
    },
    resetPrompt() {
      this.userPrompt = '';
      this.resultsText = null;
    },
    highlightCode(refName) {
      const codeBlock = this.$refs[refName];
      if (codeBlock) {
        Prism.highlightElement(codeBlock);
      }
    }
  }
};
</script>
