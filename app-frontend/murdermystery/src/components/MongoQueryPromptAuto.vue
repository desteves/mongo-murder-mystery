<template>
  <div class="mongoqueryitem">
    <h3>{{ title }}</h3>
    <div>
      {{ subtitle }}
    </div>

    <!-- USES CODEMIRROR CUSTOM MONGODB AUTOCOMPLETIONS -->
    <div class="editor" ref="editor"></div>

    <div class="button-group">
      <button @click="runQuery" :disabled="isLoading">
        {{ isLoading ? 'RUNNING...' : 'RUN' }}
      </button>
      <button @click="resetQuery" :disabled="isLoading">RESET</button>
    </div>

    <!-- Conditionally display this div when showClue is true -->
    <div v-if="showClue" class="clue-message">
      <br /><br />
      <b>
        🎉 Woo-hoo, a clue was matched! You're on fire! 🔥 Well done, detective! Keep at it. 🕵️‍♂️🎉
      </b>
      <br /><br />
    </div>

    <div v-if="queryResult" class="query-result">
      <!-- Safe text rendering with Prism syntax highlighting applied via ref -->
      <pre ref="codeBlock" class="language-json">{{ queryResult }}</pre>
    </div>
  </div>
</template>

<script>
import apiService from '@/services/api';
// Import JSON language support (Prism is already global from main.js)
import 'prismjs/components/prism-json.min.js';

// Lazy load CodeMirror to reduce initial bundle size
let codeMirrorModules = null;
const loadCodeMirror = async () => {
  if (!codeMirrorModules) {
    const [
      { basicSetup, EditorView },
      { autocompletion },
      { javascript },
      { mongoCompletions }
    ] = await Promise.all([
      import('codemirror'),
      import('@codemirror/autocomplete'),
      import('@codemirror/lang-javascript'),
      import('../utils/mongoUtils')
    ]);
    codeMirrorModules = { basicSetup, EditorView, autocompletion, javascript, mongoCompletions };
  }
  return codeMirrorModules;
};

export default {
  name: 'MongoQueryPromptAuto',
  props: {
    title: {
      type: String,
      required: true
    },
    subtitle: {
      type: String,
      required: true
    },
    preFilledText: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      queryResult: null,
      showClue: false,
      editorInstance: null,
      isLoading: false,
      errorMessage: null,
      queryCache: new Map() // Cache query results
    };
  },
  computed: {
    placeholder() {
      return this.preFilledText ? '' : 'Enter your query here...';
    }
  },
  watch: {
    async preFilledText(newValue) {
      if (this.editorInstance) {
        const { EditorView } = await loadCodeMirror();
        this.editorInstance.setState(EditorView.state.of({ doc: newValue }));
      }
    }
  },
  mounted() {
    this.initCodeMirror();
  },
  beforeUnmount() {
    // Cleanup editor instance
    if (this.editorInstance) {
      this.editorInstance.destroy();
    }
  },
  methods: {
    async runQuery() {
      this.showClue = false;
      this.queryResult = null;
      this.errorMessage = null;
      this.isLoading = true;

      try {
        const queryText = this.editorInstance.state.doc.toString();

        if (!queryText || typeof queryText !== 'string') {
          this.queryResult = JSON.stringify({ msg: 'Query must be text.' }, null, 2);
          this.isLoading = false;
          return;
        }

        const MAX_QUERY_LENGTH = 1024;
        if (queryText.length > MAX_QUERY_LENGTH) {
          this.queryResult = JSON.stringify({ msg: 'Query is too large.' }, null, 2);
          this.isLoading = false;
          return;
        }

        const normalizedQueryText = queryText
          .normalize('NFC')
          .replace(/[\n\t]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const encodedQueryStr = encodeURIComponent(normalizedQueryText);

        // Check cache first
        if (this.queryCache.has(encodedQueryStr)) {
          const data = this.queryCache.get(encodedQueryStr);
          this.queryResult = JSON.stringify(data, null, 2);
          this.$nextTick(() => this.highlightCode());
          this.isLoading = false;
          return;
        }

        // Use API service
        const data = await apiService.executeQuery(encodedQueryStr);

        // Cache the result (limit cache size to 50 entries)
        if (this.queryCache.size >= 50) {
          const firstKey = this.queryCache.keys().next().value;
          this.queryCache.delete(firstKey);
        }
        this.queryCache.set(encodedQueryStr, data);

        // Check for clue
        if (typeof data === 'object' && data !== null && data?.[0]?.isClue) {
          delete data[0].isClue;
          this.showClue = true;
        }

        this.queryResult = JSON.stringify(data, null, 2);
        this.$nextTick(() => {
          this.highlightCode();
        });
      } catch (error) {
        // Use user-friendly error message from API service
        const errorMsg = error.userMessage || error.message || 'Failed to execute query';
        this.queryResult = JSON.stringify({ error: errorMsg }, null, 2);
        this.errorMessage = errorMsg;
        this.$nextTick(() => {
          this.highlightCode();
        });
      } finally {
        this.isLoading = false;
      }
    },
    resetQuery() {
      this.editorInstance.dispatch({
        changes: { from: 0, to: this.editorInstance.state.doc.length, insert: this.preFilledText } // Reset content to preFilledText
      });
      this.queryResult = null;
      this.showClue = false; // Reset the clue display
    },
    highlightCode() {
      // Apply syntax highlighting using Prism.js (global)
      const codeBlock = this.$refs.codeBlock;
      if (codeBlock && codeBlock.textContent && window.Prism) {
        // Only highlight if not already highlighted
        if (!codeBlock.classList.contains('highlighted')) {
          window.Prism.highlightElement(codeBlock);
          codeBlock.classList.add('highlighted');
        }
      }
    },
    async initCodeMirror() {
      // Lazy load CodeMirror modules
      const { basicSetup, EditorView, autocompletion, javascript, mongoCompletions } = await loadCodeMirror();

      // Create the CodeMirror editor instance
      this.editorInstance = new EditorView({
        doc: this.preFilledText, // Initialize with preFilledText
        extensions: [
          basicSetup,
          autocompletion({
            override: [mongoCompletions],
            activateOnTyping: true,
            activateOnCompletion: () => true,
            autoTrigger: "always"
          }),
          javascript()
        ],
        parent: this.$refs.editor, // Attach only to the editor container
      });
    },
  },
};
</script>

<style scoped></style>