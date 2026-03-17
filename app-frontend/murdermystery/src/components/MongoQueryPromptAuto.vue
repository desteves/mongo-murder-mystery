<template>
  <div class="mongoqueryitem">
    <h3>{{ title }}</h3>
    <div>
      {{ subtitle }}
    </div>

    <!-- USES CODEMIRROR CUSTOM MONGODB AUTOCOMPLETIONS -->
    <div class="editor" ref="editor"></div>

    <div class="button-group">
      <button @click="runQuery">RUN</button>
      <button @click="resetQuery">RESET</button>
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
      <!-- Use v-html to render the formatted JSON inside pre with syntax highlighting -->
      <pre ref="codeBlock" class="language-json" v-html="queryResult"></pre>
    </div>
  </div>
</template>

<script>
import apiService from '@/services/api';
import Prism from 'prismjs';
import 'prismjs/themes/prism.css'; // Import Prism theme
import 'prismjs/components/prism-json.min.js'; // Import JSON language support for Prism

import { basicSetup, EditorView } from "codemirror";
import { autocompletion } from "@codemirror/autocomplete";
import { javascript } from "@codemirror/lang-javascript";
import { mongoCompletions } from "../utils/mongoUtils";

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
      errorMessage: null
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

        // Use API service
        const data = await apiService.executeQuery(encodedQueryStr);

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
      // Apply syntax highlighting using Prism.js
      const codeBlock = this.$refs.codeBlock;
      if (codeBlock) {
        Prism.highlightElement(codeBlock);
      }
    },
    initCodeMirror() {
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