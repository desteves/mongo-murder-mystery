<template>
  <WelcomeItem>
    <template #heading>
      <div id="ai-intro">
        <a href="#ai-intro">✨ AI Track: Solve with Your Agent Sidekick</a>
      </div>
    </template>

    <div>
      Welcome to the AI Track! Instead of writing MongoDB queries yourself, you'll solve the murder mystery by asking your AI Agent sidekick to investigate for you. Your agent can query the database via an MCP server and report back what it finds.
    </div>
    <br />
    <div>
      <strong>The Plot:</strong> There's been a murder in MongoDB City, and the detective needs your help. The crime was a 💀 murder 💀 that occurred on 🗓️ January 15th, 2018 🗓️ in 📍 MongoDB City 📍. Start by asking your agent to explore the database and find clues!
    </div>
  </WelcomeItem>

  <WelcomeItem>
    <template #heading>
      <div id="step1">
        <a href="#step1">📋 Step 1: Discover the Collections</a>
      </div>
    </template>

    <div>
      First, let's find out what data we have access to. Ask your agent to list the collections in the murder mystery database.
    </div>
    <br />
    <div>
      <strong>Try asking:</strong> "List the collections in the murder mystery database"
    </div>
    <AgentPrompt />

    <div style="margin-top: 1rem;">
      <strong>💡 What you should see:</strong> The agent will discover collections like <code>crime</code>, <code>person</code>, <code>event</code>, and <code>suspect</code>. These are the places where evidence is stored!
    </div>
  </WelcomeItem>

  <WelcomeItem>
    <template #heading>
      <div id="step2">
        <a href="#step2">🔍 Step 2: Learn the Schema</a>
      </div>
    </template>

    <div>
      Now that you know which collections exist, let's see what kind of information each one contains. Ask your agent to show you sample documents from each collection.
    </div>
    <br />
    <div>
      <strong>Try asking:</strong>
      <ul>
        <li>"Show me an example document from the crime collection"</li>
        <li>"What fields are in the person collection?"</li>
        <li>"Show me the structure of the event collection"</li>
      </ul>
    </div>
    <AgentPrompt />

    <div style="margin-top: 1rem;">
      <strong>💡 Understanding the schema:</strong> Pay attention to fields like dates, locations, names, and IDs. These will help you connect the dots and find relationships between suspects, crimes, and witnesses.
    </div>
  </WelcomeItem>

  <WelcomeItem>
    <template #heading>
      <div id="step3">
        <a href="#step3">🕵️ Step 3: Start Your Investigation</a>
      </div>
    </template>

    <div>
      Now you're ready to investigate! Ask your agent to find the crime scene report for the murder on January 15, 2018 in MongoDB City.
    </div>
    <br />
    <div>
      <strong>Try asking:</strong> "Find the crime that happened on January 15, 2018 in MongoDB City"
    </div>
    <AgentPrompt />

    <div style="margin-top: 1rem;">
      <strong>💡 Follow the clues:</strong> The crime report will contain witness information and other details. Use those to ask your agent more specific questions about suspects, witnesses, and events!
    </div>
  </WelcomeItem>

  <WelcomeItem>
    <template #heading>
      <div id="tips">
        <a href="#tips">💬 Tips for Working with Your Agent</a>
      </div>
    </template>

    <div>
      <strong>How the agent works:</strong> Your prompts are sent to an AI that can only access the murder mystery database through an MCP server. It can list collections, find documents, count records, and run aggregations.
    </div>
    <br />
    <div>
      <strong>Best practices:</strong>
      <ul>
        <li>Keep prompts under 512 characters</li>
        <li>Mention the specific collection you want to search</li>
        <li>Be specific about dates, names, or IDs when filtering</li>
        <li>Ask follow-up questions based on what you discover</li>
      </ul>
    </div>
    <br />
    <div>
      <strong>Example prompts:</strong>
      <ul>
        <li>"Count how many crimes happened in MongoDB City"</li>
        <li>"Show me all people who live on Franklin Ave"</li>
        <li>"Find events attended by suspect ID 12345"</li>
        <li>"Who were the witnesses mentioned in the crime report?"</li>
      </ul>
    </div>
  </WelcomeItem>

  <WelcomeItem>
    <template #heading>
      <div id="solution">
        <a href="#solution">🎯 Ready to Solve It?</a>
      </div>
    </template>

    <div>
      Once you think you've identified the killer, you still need to submit your answer. Unfortunately, your agent can't access the solution collection (it's restricted!). Head back to the <router-link class="boldlink" to="/#solution">main page</router-link> to check your solution using a direct MongoDB query.
    </div>
    <br />
    <div>
      Don't forget to <a class="boldlink" href="/about#social">brag</a> once you've cracked the case! 🎉
    </div>
  </WelcomeItem>
</template>

<script setup>
import WelcomeItem from './WelcomeItem.vue';
import AgentPrompt from './AgentPrompt.vue';
</script>

<style scoped>
.boldlink {
  font-weight: bold;
  text-decoration: underline;
}

a {
  text-decoration: none;
  font-weight: normal;
}

ul {
  margin-top: 0.5rem;
}
</style>
