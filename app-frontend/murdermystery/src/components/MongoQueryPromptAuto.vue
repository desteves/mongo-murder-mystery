<template>
  <div class="mongoqueryitem">
    <h3>{{ title }}</h3>
    <div>
      {{ subtitle }}
    </div>

    <!-- USES CODEMIRROR CUSTOM MONGODB AUTOCOMPLETIONS -->
    <div class="editor" ref="editor" role="group" :aria-label="title">
      <!-- Shown until the editor module has loaded (and for the layout: same height, so nothing shifts) -->
      <pre v-if="!editorInstance" class="editor-placeholder" tabindex="0" @focus="loadEditor(true)" @click="loadEditor(true)">{{ preFilledText }}</pre>
    </div>

    <div class="button-group">
      <button @click="runQuery" :disabled="isLoading">
        {{ isLoading ? 'RUNNING...' : 'RUN' }}
      </button>
      <button @click="resetQuery" :disabled="isLoading">RESET</button>
      <span class="run-hint">or press <kbd>Ctrl</kbd>/<kbd>&#8984;</kbd> + <kbd>Enter</kbd></span>
    </div>

    <!-- A clue was matched: say what it is and what to do next -->
    <div v-if="showClue && clue" class="clue-message" role="status">
      <b>🎉 {{ clue.title }}</b>
      <p>{{ clue.next }} Your clue is saved in the Incident Notes checklist.</p>
    </div>

    <!-- Errors: what happened and a concrete next step -->
    <div v-if="errorInfo" class="error-help" role="alert">
      <b>{{ errorInfo.summary }}</b>
      <p>💡 {{ errorInfo.hint }}</p>
    </div>

    <div v-if="queryResult && !errorInfo" class="result-meta">
      <span>{{ resultSummary }}</span>
      <span class="result-actions">
        <button v-if="tableRows" class="link-button" @click="view = view === 'json' ? 'table' : 'json'">
          {{ view === 'json' ? 'Table view' : 'JSON view' }}
        </button>
        <button class="link-button" @click="copyResult">{{ copied ? 'Copied!' : 'Copy' }}</button>
      </span>
    </div>

    <div v-if="queryResult" class="query-result">
      <!-- Safe text rendering with Prism syntax highlighting applied via ref -->
      <pre v-if="view === 'json' || !tableRows" ref="codeBlock" class="language-json">{{ queryResult }}</pre>
      <div v-else class="table-wrap">
        <table class="result-table">
          <thead><tr><th v-for="col in tableRows.columns" :key="col">{{ col }}</th></tr></thead>
          <tbody>
            <tr v-for="(row, i) in tableRows.rows" :key="i"><td v-for="col in tableRows.columns" :key="col">{{ row[col] }}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="sr-only" aria-live="polite">{{ statusText }}</div>
  </div>
</template>

<script>
import apiService from '@/services/api';
import { formatResult } from '@/lib/ejson.js';
import { explainError, preflightHint, straightenQuotes } from '@/lib/errors.js';
import { recordClue, clueMessage } from '@/lib/clues.js';
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
      loadingEditor: false,
      observer: null,
      isLoading: false,
      errorMessage: null,
      queryCache: new Map(), // Cache query results
      rawData: null,
      view: 'json',
      clue: null,
      errorInfo: null,
      copied: false,
      statusText: ''
    };
  },
  computed: {
    resultSummary() {
      const d = this.rawData;
      if (!Array.isArray(d)) return 'Result';
      const n = d.length;
      return n === 30 ? '30 documents (results are capped at 30; narrow your filter or sort to see others)' : `${n} document${n === 1 ? '' : 's'}`;
    },
    // A flat table for arrays of documents; null when the result is not a list of plain objects.
    tableRows() {
      const d = this.rawData;
      if (!Array.isArray(d) || d.length === 0 || !d.every((r) => r && typeof r === 'object' && !Array.isArray(r))) return null;
      const columns = [...new Set(d.flatMap((r) => Object.keys(r)))].slice(0, 12);
      const cell = (v) => (v !== null && typeof v === 'object' ? formatResult(v).replace(/\s+/g, ' ') : String(v));
      return { columns, rows: d.map((r) => Object.fromEntries(columns.map((c) => [c, r[c] === undefined ? '' : cell(r[c])]))) };
    },
    placeholder() {
      return this.preFilledText ? '' : 'Enter your query here...';
    }
  },
  watch: {
    view() {
      this.$nextTick(() => this.highlightCode());
    },
    preFilledText(newValue) {
      if (this.editorInstance) {
        const length = this.editorInstance.state.doc.length;
        this.editorInstance.dispatch({ changes: { from: 0, to: length, insert: newValue } });
      }
    }
  },
  mounted() {
    // Load the editor only when this box is about to scroll into view (or the browser is idle soon after).
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) this.loadEditor();
      }, { rootMargin: '600px 0px' });
      this.observer.observe(this.$refs.editor);
    } else {
      this.loadEditor();
    }
  },
  beforeUnmount() {
    this.observer?.disconnect();
    // Cleanup editor instance
    if (this.editorInstance) {
      this.editorInstance.destroy();
    }
  },
  methods: {
    async runQuery() {
      this.showClue = false;
      this.clue = null;
      this.queryResult = null;
      this.rawData = null;
      this.errorMessage = null;
      this.errorInfo = null;
      this.view = 'json';
      this.statusText = '';
      this.isLoading = true;

      try {
        // Curly quotes (pasted from docs or chat apps) are never valid in a query.
        const queryText = straightenQuotes(this.currentQuery());

        if (!queryText.trim()) {
          this.errorInfo = { summary: 'Nothing to run yet.', hint: preflightHint('') };
          this.isLoading = false;
          return;
        }

        const MAX_QUERY_LENGTH = 1024;
        if (queryText.length > MAX_QUERY_LENGTH) {
          this.errorInfo = { summary: 'That query is too long.', hint: `Keep it under ${MAX_QUERY_LENGTH} characters.` };
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
          this.showEntry(this.queryCache.get(encodedQueryStr));
          this.isLoading = false;
          return;
        }

        // Use API service
        const data = await apiService.executeQuery(encodedQueryStr);

        // The API flags clue matches on the first document: true = crime report, 1 = person. Remember it with the
        // cached result (and strip it from what the player sees).
        const entry = { data, isClue: this.extractClue(data) };

        // Cache the result (limit cache size to 50 entries)
        if (this.queryCache.size >= 50) {
          const firstKey = this.queryCache.keys().next().value;
          this.queryCache.delete(firstKey);
        }
        this.queryCache.set(encodedQueryStr, entry);

        this.showEntry(entry);
      } catch (error) {
        // Use user-friendly error message from API service
        const msg = error.userMessage || error.message || 'Failed to execute query';
        const info = explainError(msg);
        const pre = preflightHint(this.currentQuery());
        this.errorInfo = pre ? { ...info, hint: `${info.hint} ${pre}` } : info;
        this.errorMessage = msg;
        this.statusText = `Error: ${info.summary}`;
      } finally {
        this.isLoading = false;
      }
    },
    extractClue(data) {
      const first = Array.isArray(data) ? data[0] : null;
      if (!first || typeof first !== 'object' || !first.isClue) return null;
      const flag = first.isClue;
      delete first.isClue;
      return flag;
    },
    showEntry(entry) {
      this.rawData = entry.data;
      if (entry.isClue) {
        this.clue = clueMessage(entry.isClue);
        this.showClue = true;
        recordClue(entry.isClue === true ? 'crime' : 'person');
      }
      this.queryResult = formatResult(entry.data);
      this.statusText = this.clue ? `${this.clue.title}. ${this.resultSummary}` : this.resultSummary;
      this.$nextTick(() => this.highlightCode());
    },
    async copyResult() {
      try {
        await navigator.clipboard.writeText(this.queryResult || '');
        this.copied = true;
        setTimeout(() => { this.copied = false; }, 1500);
      } catch {
        this.statusText = 'Could not copy: select the text and copy it manually.';
      }
    },
    resetQuery() {
      if (!this.editorInstance) { this.queryResult = null; this.errorInfo = null; this.clue = null; this.showClue = false; return; }
      this.editorInstance.dispatch({
        changes: { from: 0, to: this.editorInstance.state.doc.length, insert: this.preFilledText } // Reset content to preFilledText
      });
      this.queryResult = null;
      this.rawData = null;
      this.errorInfo = null;
      this.clue = null;
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
    currentQuery() {
      return this.editorInstance ? this.editorInstance.state.doc.toString() : this.preFilledText;
    },
    async loadEditor(focus = false) {
      if (this.editorInstance || this.loadingEditor) return;
      this.loadingEditor = true;
      this.observer?.disconnect();
      try {
        const { createEditor } = await import('@/lib/editor.js');
        this.editorInstance = createEditor({
          parent: this.$refs.editor,
          doc: this.preFilledText,
          label: this.title,
          onRun: () => this.runQuery(),
        });
        if (focus) this.editorInstance.focus();
      } finally {
        this.loadingEditor = false;
      }
    },
  },
};
</script>

<style scoped>
.editor-placeholder { margin: 0; padding: 0.4rem 0.6rem 0.4rem 2.5rem; min-height: 96px; background: #fff; color: #000; font-family: 'Courier New', Courier, monospace; font-size: 14px; line-height: 1.4; white-space: pre-wrap; overflow-wrap: anywhere; border-radius: 4px; cursor: text; }
.run-hint { margin-left: 0.5rem; font-size: 0.85rem; opacity: 0.8; }
kbd { border: 1px solid #999; border-radius: 3px; padding: 0 0.3rem; font-size: 0.8rem; background: #f4f4f4; color: #222; }
.clue-message { margin-top: 1rem; padding: 0.75rem 1rem; border-radius: 8px; background: #e6f9ee; color: #0b3d20; border: 1px solid #00a35c; }
.clue-message p { margin: 0.4rem 0 0; }
.error-help { margin-top: 1rem; padding: 0.75rem 1rem; border-radius: 8px; background: #fff3cd; color: #3b2f00; border: 1px solid #c79100; }
.error-help p { margin: 0.4rem 0 0; }
.result-meta { margin-top: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; font-size: 0.9rem; }
.result-actions { display: inline-flex; gap: 0.75rem; }
.link-button { background: none; color: var(--link-color); text-decoration: underline; padding: 0; margin: 0; width: auto; }
.link-button:hover { background: none; color: var(--header-color); }
.table-wrap { overflow: auto; max-height: 320px; }
.result-table { border-collapse: collapse; font-size: 0.85rem; color: #222; width: 100%; }
.result-table th, .result-table td { border: 1px solid #bbb; padding: 0.25rem 0.5rem; text-align: left; vertical-align: top; }
.result-table th { background: #e6f9ee; position: sticky; top: 0; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
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