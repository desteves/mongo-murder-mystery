<template>
  <div class="mongoqueryitem">
    <h3>{{ title }}</h3>
    <div>
      {{ subtitle }}
    </div>

    <!-- USES CODEMIRROR CUSTOM MONGODB AUTOCOMPLETIONS -->
    <div class="editor-container">
    </div>

    <div class="button-group">
      <button @click="runQuery">RUN</button>
      <button @click="resetQuery">RESET</button>
    </div>

    <!-- Conditionally display this div when showClue is true -->
    <div v-if="showClue" class="clue-message">
      <br /><br />
      <b>
        🎉 Woo-hoo! Clue matched! You're on fire! 🔥 Well done, detective! 🕵️‍♂️🎉
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
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { EditorView, basicSetup } from '@codemirror/basic-setup';
import { javascript } from '@codemirror/lang-javascript';  // For JavaScript mode
import { autocompletion, completeFromList } from '@codemirror/autocomplete';

export default {
  name: 'MongoQueryPromptWithCodeMirrorEditor',
  data() {
    return {
      code: '',  // Two-way data binding for textarea content
      editorInstance: null,
    };
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
    initCodeMirror() {
      // Create the CodeMirror editor instance
      this.editorInstance = new EditorView({
        state: EditorState.create({
          doc: this.code,  // Set the initial code in the editor
          extensions: [
            basicSetup,  // Adds the basic setup (keybindings, etc.)
            javascript(),  // Set the language mode to JavaScript (or MongoDB specific)
            autocompletion({
              override: [
                completeFromList(['find', 'insert', 'update', 'delete', 'aggregate'])  // Custom completions for MongoDB-like queries
              ]
            }),
          ]
        }),
        parent: this.$refs.editor,  // Attach to the div element
      });
    },
  },
};
</script>

<style scoped>
.editor-container {
  position: relative;
}

.CodeMirror {
  width: 100%;
  height: 200px;
  font-size: 14px;
  border: 1px solid #ccc;
}
</style>