<template>
  <WelcomeItem>
    <template #heading>
      <div id="ai-intro">
        <a href="#ai-intro">✨ AI Track: Solve with Your Agent Sidekick</a>
      </div>
    </template>

    <div>
      Welcome to the AI Track! Solve the murder mystery by prompting your AI Agent to investigate for you. Your agent can query the database (crime, person, event, suspect collections) and use vector search to find connections between clues.
    </div>
    <br />
    <div>
      <strong>The Plot:</strong> There's been a murder in MongoDB City, and the detective needs your help. The crime was a 💀 murder 💀 that occurred on 🗓️ January 15th, 2018 🗓️ in 📍 MongoDB City 📍. Start by prompting your agent to explore the database and find clues!
    </div>
  </WelcomeItem>

  <WelcomeItem>
    <template #heading>
      <div id="investigate">
        <a href="#investigate">🕵️ Start Your Investigation</a>
      </div>
    </template>

    <div>
      Ask your agent to investigate the murder mystery! The agent can query the database directly and use vector search to find connections. Start by finding the crime scene report for the murder on January 15, 2018 in MongoDB City, then follow the clues to track down suspects and witnesses.
    </div>
    <br />
    <div>
      <strong>Example questions to get started:</strong>
      <ul>
        <li>"Find the crime that happened on January 15, 2018 in MongoDB City"</li>
        <li>"Show me the witnesses mentioned in the crime report"</li>
        <li>"Find all suspects and their details"</li>
        <li>"What events did the main suspect attend?"</li>
        <li>"Use vector search to find people similar to the suspect"</li>
      </ul>
    </div>
    <br />
    <AgentPrompt />

    <div style="margin-top: 1rem;">
      <strong>💡 Follow the clues:</strong> The crime report will contain witness information and other details. Keep prompting your agent with specific questions about suspects, witnesses, and events to piece together what happened!
    </div>
  </WelcomeItem>

  <WelcomeItem>
    <template #heading>
      <div id="tips">
        <a href="#tips">💬 Tips for Working with Your Agent</a>
      </div>
    </template>

    <div>
      <strong>How the agent works:</strong> Your prompts are sent to an AI that can query the murder mystery database and perform vector search. The agent has access to crime, person, event, and suspect data through MCP tools, and can run semantic queries to find connections and patterns.
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
        <li>"Find the crime that happened on January 15, 2018 in MongoDB City"</li>
        <li>"Show me all people who live on Franklin Ave"</li>
        <li>"What events did the main suspect attend?"</li>
        <li>"Use vector search to find similar crime patterns"</li>
      </ul>
    </div>
  </WelcomeItem>

  <WelcomeItem>
    <template #heading>
      <div id="solution">
        <a href="#solution">🎯 Check Your Solution</a>
      </div>
    </template>

    <div>
      Once you think you've identified the killer, check your answer here. Note: Your agent can't access the solution collection (it's restricted!), so you'll need to use this direct MongoDB query to verify.
    </div>
    <br />
    <MongoQueryPromptAuto title="Whodunnit?"
      subtitle="Update &quot;Jack&quot; to check if you guessed correctly. If the answer is correct, you'll see a congratulatory message. 🔐 This is a highly restricted collection that will only permit you to check the name of your suspect.🔐 "
      preFilledText='db.solution.find({ "name": "Jack" })' />
    <br />
    <div>
      Don't forget to <a class="boldlink" href="/about#social">brag</a> once you've cracked the case! 🎉
    </div>
  </WelcomeItem>
</template>

<script setup>
import WelcomeItem from './WelcomeItem.vue';
import AgentPrompt from './AgentPrompt.vue';
import MongoQueryPromptAuto from './MongoQueryPromptAuto.vue';
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
