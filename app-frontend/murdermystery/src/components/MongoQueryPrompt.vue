<template>
  <br />
  <div class="mongoqueryitem">
    <h3>{{ title }}</h3>
    <div>
      {{ subtitle }}
    </div>

    <textarea v-model="queryText" :placeholder="placeholder" class="query-textarea"></textarea>
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
  <br />
</template>

<script>
import axios from 'axios';
import Prism from 'prismjs';
import 'prismjs/themes/prism.css'; // Import Prism theme
import 'prismjs/components/prism-json.min.js'; // Import JSON language support for Prism

export default {
  name: 'MongoQueryPrompt',
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
      queryText: this.preFilledText,
      queryResult: null,
      showClue: false // New reactive property to toggle the clue div
    };
  },
  computed: {
    placeholder() {
      return this.preFilledText ? '' : 'Enter your query here...';
    }
  },
  methods: {
    runQuery() {
      this.showClue = false; // Reset the clue display
      let encodedQueryStr = '';
      try {
        if (this.queryText) {
          if (typeof this.queryText !== 'string') {
            this.queryResult = JSON.stringify({ msg: 'Query must be text.' }, null, 2);
            return false;
          }

          const MAX_QUERY_LENGTH = 1024;
          if (this.queryText.length > MAX_QUERY_LENGTH) {
            this.queryResult = JSON.stringify({ msg: 'Query is too large.' }, null, 2);
            return false;
          }

          const normalizedQueryText = this.queryText
            .normalize('NFC')
            .replace(/[\n\t]+/g, ' ')
            .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
            .trim(); // Remove leading/trailing spaces
          encodedQueryStr = encodeURIComponent(normalizedQueryText);
        } else {
          this.queryResult = JSON.stringify({ msg: 'Query is empty or undefined.' }, null, 2);
          return false;
        }
      } catch (error) {
        this.queryResult = JSON.stringify({ msg: error.message }, null, 2);
        return false;
      }

      // import.meta.env.MMM_API_BASE_URL <-- meh needs at build, todo -- figure out later
      const apiUrl = "https://mmm-be-1020079043644.us-central1.run.app" // "http://localhost:3000"; //
      axios.get(`${apiUrl}/eval`, {
          params: {
            query: encodedQueryStr,
            language: 'mongosh' // Add the language query param
          },
          headers: {
            'Accept': 'application/json', // Request JSON response

          }
        })
        .then(response => {
          // Directly stringify the JSON response

          if (typeof response === 'object' &&
            response !== null &&
            response?.data?.[0]?.isClue) {
            delete response.data[0].isClue;
            // Logic here
            this.showClue = true;
          }


          this.queryResult = JSON.stringify(response.data, null, 2);
          // Trigger syntax highlighting after the HTML is rendered
          this.$nextTick(() => {
            this.highlightCode();
          });
        })
        .catch(error => {
          if (error.response && error.response.data) {
            // Stringify error response data
            this.queryResult = JSON.stringify(error.response.data, null, 2);
          } else {
            console.log(error);
            // Generic error message if no response data is available
            this.queryResult = JSON.stringify({ error: 'Failed to fetch data' }, null, 2);
          }
          this.$nextTick(() => {
            this.highlightCode();
          });
          return false;
        });
    },
    resetQuery() {
      this.queryText = this.preFilledText;
      this.queryResult = null;
      this.showClue = false; // Reset the clue display
    },
    highlightCode() {
      // Apply syntax highlighting using Prism.js
      const codeBlock = this.$refs.codeBlock;
      if (codeBlock) {
        Prism.highlightElement(codeBlock);
      }
    }
  }
};
</script>