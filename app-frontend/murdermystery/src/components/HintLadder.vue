<template>
  <div class="hint-ladder">
    <h3>🆘 Stuck? Take a hint</h3>
    <p class="hint-intro">Hints come in three levels, from a nudge to the shape of the query. Open only as many as you need.</p>

    <div v-for="stage in stages" :key="stage.id" class="stage">
      <b>{{ stage.title }}</b>
      <ol>
        <li v-for="(hint, i) in stage.hints" :key="i">
          <span v-if="level(stage.id) > i" class="hint-text">{{ hint }}</span>
          <button v-else-if="level(stage.id) === i" class="link-button" @click="reveal(stage.id)">
            Show hint {{ i + 1 }} of {{ stage.hints.length }}
          </button>
          <span v-else class="locked">Hint {{ i + 1 }} (open the previous hint first)</span>
        </li>
      </ol>
    </div>

    <p class="hint-footer">
      Still stuck? Ask the <router-link to="/ai#ai-intro">AI Track</router-link> a question in plain English, or follow the
      <router-link to="/walkthrough#start">walkthrough</router-link>.
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const KEY = 'mmm-hints';

// No spoilers: nudge, then the fields to use, then the shape of the query (with placeholders, not answers).
const stages = [
  {
    id: 'report',
    title: '1. Find the crime scene report',
    hints: [
      'The report lives in the crime collection. List the collections first if you are not sure.',
      'Filter on the fields type, city and date. The date is stored as a number like 20180115.',
      'db.crime.find({ "type": "<type>", "city": "<city>", "date": <yyyymmdd> }) with the details from the plot.',
    ],
  },
  {
    id: 'witnesses',
    title: '2. Identify the witnesses',
    hints: [
      'The report names two witnesses. Find them in the person collection.',
      'Use the street or the first name from the report: addressStreetName, addressNumber and name are the useful fields. "The last house" means the highest number.',
      'db.person.find({ "addressStreetName": "<street>" }).sort({ "addressNumber": -1 }).limit(1), and a regular expression like /^<first name>/ for a name.',
    ],
  },
  {
    id: 'suspect',
    title: '3. Find the suspect',
    hints: [
      'Each witness has an interview field. Read both closely, and compare them.',
      'The interviews point to details you can look up in gymCheckin, socialEventCheckin and the person fields (vehicle, driversLicense). The schema diagram shows how they connect.',
      'Narrow one collection with the details from an interview (a date range, a name or a membership id), then look the people up in person. One query at a time; keep notes.',
    ],
  },
];

const state = ref(JSON.parse(localStorage.getItem(KEY) || '{}'));
const level = (id) => state.value[id] || 0;
const reveal = (id) => {
  state.value = { ...state.value, [id]: level(id) + 1 };
  try { localStorage.setItem(KEY, JSON.stringify(state.value)); } catch { /* ignore */ }
};
</script>

<style scoped>
.hint-ladder { margin-top: 1.5rem; padding: 1rem; border: 1px dashed var(--link-color); border-radius: 8px; }
.hint-intro, .hint-footer { margin: 0.5rem 0; }
.stage { margin-top: 0.75rem; }
ol { padding-left: 1.5rem; margin-top: 0.25rem; }
li { margin-bottom: 0.3rem; }
.hint-text { display: inline-block; }
.hint-text :deep(code), .hint-text { overflow-wrap: anywhere; }
.locked { opacity: 0.6; }
.link-button { background: none; color: var(--link-color); text-decoration: underline; padding: 0; margin: 0; width: auto; }
.link-button:hover { background: none; color: var(--header-color); }
</style>
