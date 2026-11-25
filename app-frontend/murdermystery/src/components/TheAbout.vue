<script setup>
import WelcomeItem from './WelcomeItem.vue'
import { withUtm } from '@/lib/utm.js'

const atlasUrl = withUtm('https://www.mongodb.com/cloud/atlas/register')
const introCourseUrl = withUtm('https://learn.mongodb.com/learning-paths/introduction-to-mongodb')
</script>

<template>
  <WelcomeItem>
    <template #heading>
      <div id="motivation">
        <a href="#motivation">🎯 The goal</a>
      </div>
    </template>

    <p>
      The MongoDB Murder Mystery is a free, hands-on game for learning to <b>query MongoDB</b>. You get a real database
      and a real murder to solve. There are no accounts and nothing to install: you read the data, follow the clues and
      name the killer.
    </p>
    <p><b>Who is it for?</b> Developers, analysts and students who know a little SQL (or nothing at all) and learn best by
      doing. It is practice, not a full course: if you want one, try
      <a :href="introCourseUrl" target="_blank"
        rel="noopener noreferrer">Introduction to MongoDB</a>.</p>
    <p><b>Why I built it:</b> to make learning MongoDB fun, and to practice building (and securing) a small web app in
      public.</p>
  </WelcomeItem>

  <WelcomeItem>
    <template #heading>
      <div id="learn">
        <a href="#learn">🧠 What you will learn</a>
      </div>
    </template>

    <ul>
      <li>Explore an unfamiliar database: list collections and inspect documents with <code>db.getCollectionNames()</code>
        and <code>find().limit(1)</code>.</li>
      <li>Filter, project, sort and limit results with <code>find()</code>.</li>
      <li>Follow references between collections, one clue at a time.</li>
      <li>Check each step and keep notes on what you found.</li>
      <li>(AI Track) Ask questions in plain English and see how an agent turns them into queries.</li>
    </ul>
  </WelcomeItem>

  <WelcomeItem>
    <template #heading>
      <div id="paths">
        <a href="#paths">🧭 Three ways to play</a>
      </div>
    </template>

    <ul>
      <li><router-link to="/walkthrough#start">Walkthrough</router-link>: step-by-step lessons. Best if you are new to
        MongoDB.</li>
      <li><router-link to="/#experienced">Solo</router-link>: write your own queries in the shell-style box. Best if you
        already know MongoDB.</li>
      <li><router-link to="/ai#ai-intro">AI Track</router-link> (beta): ask an AI sidekick that can query the database
        for you. Best for exploring and for seeing how natural language maps to queries.</li>
    </ul>
    <p>All three use the same crime, the same data and the same final check, so you can switch at any time.</p>
  </WelcomeItem>

  <WelcomeItem>
    <template #heading>
      <div id="limits">
        <a href="#limits">⚖️ Good to know</a>
      </div>
    </template>

    <ul>
      <li>The query box accepts a <b>small, read-only subset</b> of mongosh (finds, counts, distinct and a few helpers).
        It is deliberately limited and does not reflect everything MongoDB can do.</li>
      <li>The solution is stored separately and can only be <i>checked</i> against a name you suggest. Neither the query box nor
        the AI agent can read it.</li>
      <li><b>Privacy:</b> there are no accounts. Queries and AI prompts are logged on the server for debugging and abuse
        prevention. AI conversations are kept under a random id stored in your browser (so the agent remembers the
        conversation) and are deleted automatically after 30 days. Please do not type personal information.</li>
      <li>Requests are rate limited. If you see "too many requests", wait a minute and try again.</li>
      <li>The AI Track is in beta: answers can be wrong or incomplete, so verify them with your own queries.</li>
    </ul>
  </WelcomeItem>

  <WelcomeItem>
    <template #heading>
      <div id="tech">
        <a href="#tech">🛠️ How it works</a>
      </div>
    </template>

    <ul>
      <li>Three <b>Google Cloud Run</b> services behind Cloudflare, built and deployed by Cloud Build and described in
        Terraform: the web app (Vue + Vite, served by nginx), the API, and a
        <a href="https://github.com/mongodb-js/mongodb-mcp-server" target="_blank" rel="noopener noreferrer">MongoDB MCP
          server</a> that is private and only callable by the API.</li>
      <li>The API (Node.js, official <code>mongodb</code> driver) talks to a
        <a :href="atlasUrl" target="_blank" rel="noopener noreferrer">MongoDB Atlas</a> cluster over a private
        connection. It validates every query against an allowlist before running it, with read-only database users.</li>
      <li>The AI Track calls a large language model (<code>gpt-6-luna</code> through the Grove gateway). The model can only use a
        few read-only MongoDB tools exposed by the MCP server, and only on the game data.</li>
      <li>It is open source (MIT):
        <a href="https://github.com/desteves/mongo-murder-mystery" target="_blank" rel="noopener noreferrer">view the
          project and report issues on GitHub</a>.</li>
    </ul>
  </WelcomeItem>

  <WelcomeItem>
    <template #heading>
      <div id="social">
        <a href="#social">📣 Social media</a>
      </div>
    </template>

    <p>Did you find out <b>whodunnit?</b> Share your achievement.</p>
    <ul>
      <li>Hint: take a screenshot of the congratulatory message together with the time it took you.</li>
      <li>
        <b>Copy and paste:</b><br /><br />
        🕵️‍♂️🔍🙌 #MysterySolved It was...shhhhh! Can you find out #whodunnit? Go to mongomurdermystery.com TY
        #LoveYourDevelopers
      </li>
    </ul>
  </WelcomeItem>

  <WelcomeItem>
    <template #heading>
      <div id="credits">
        <a href="#credits">🙌 Credits</a>
      </div>
    </template>

    <ul>
      <li>Created by @desteves. The flow follows the SQL Murder Mystery, which was the inspiration for this project.</li>
      <li>The schema diagram came from migrating the SQL version with the MongoDB Relational Migrator. Hackolade is another
        popular tool for schema diagrams. To read about that migration, see my
        <a href="https://medium.com/mongodb/3-pitfalls-to-avoid-when-migrating-postgresql-to-mongodb-f40ef2f7cf15"
          target="_blank" rel="noopener noreferrer">Medium article</a>.</li>
    </ul>
  </WelcomeItem>
</template>

<style scoped>
a {
  text-decoration: none;
  font-weight: normal;
}

p {
  margin-bottom: 0.75rem;
}

ul {
  padding-left: 1.25rem;
}

li {
  margin-bottom: 0.4rem;
}
</style>
