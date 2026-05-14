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
import { EditorView, lineNumbers, highlightActiveLineGutter, highlightSpecialChars,
         drawSelection, highlightActiveLine, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, foldGutter, indentOnInput } from '@codemirror/language';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { mongoCompletions } from '../utils/mongoUtils';
// JSON language support loaded globally in main.js

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
    preFilledText(newValue) {
      if (this.editorInstance) {
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
    initCodeMirror() {
      // Create the CodeMirror editor instance with minimal setup
      this.editorInstance = new EditorView({
        doc: this.preFilledText,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightSpecialChars(),
          history(),
          foldGutter(),
          drawSelection(),
          EditorState.allowMultipleSelections.of(true),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          highlightActiveLine(),
          keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...historyKeymap,
            ...completionKeymap
          ]),
          javascript(),
          // Custom MongoDB autocompletion
          autocompletion({
            override: [mongoCompletions],
            activateOnTyping: true
          }),
          // Light green selection highlighting
          EditorView.theme({
            "&.cm-focused .cm-selectionBackground, ::selection": {
              backgroundColor: "#d8f0cf !important"
            },
            ".cm-selectionBackground": {
              backgroundColor: "#d8f0cf !important"
            }
          })
        ],
        parent: this.$refs.editor,
      });
      console.log('CodeMirror editor initialized with MongoDB autocompletion');
    },
  },
};
</script>

<style scoped>
.editor {
  min-height: 80px;
  margin: 1rem 0;
  border: 1px solid #ccc;
  border-radius: 4px;
}

/* Ensure CodeMirror content is visible */
.editor :deep(.cm-editor) {
  min-height: 60px;
}
</style>