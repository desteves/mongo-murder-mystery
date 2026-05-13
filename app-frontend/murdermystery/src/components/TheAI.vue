<template>
  <WelcomeItem>
    <template #heading>
      <div id="ai-intro">
        <a href="#ai-intro">✨ AI Track: Solve with Your Agent Sidekick</a>
      </div>
    </template>

    <div>
      Welcome to the AI Track! Instead of writing MongoDB queries yourself, you'll solve the murder mystery by prompting your AI Agent to investigate for you. Your agent can query the database via an MCP server and report back what it finds.
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
      Prompt your agent to help you solve the murder mystery! Start by finding the crime scene report for the murder on January 15, 2018 in MongoDB City, then follow the clues to track down suspects and witnesses.
    </div>
    <br />
    <div>
      <strong>Example questions to get started:</strong>
      <ul>
        <li>"Find the crime that happened on January 15, 2018 in MongoDB City"</li>
        <li>"Show me the witnesses for this crime"</li>
        <li>"List all suspects in the database"</li>
        <li>"What events did [suspect name] attend?"</li>
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
      <strong>How the agent works:</strong> Your prompts are sent to an AI that can only access the murder mystery database through an MCP server. It can list collections, find documents, count records, run aggregations, and dynamically generate Vector Search queries to find semantically similar documents.
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
