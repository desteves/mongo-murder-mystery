<template>
  <WelcomeItem>
    <template #heading>
      <div id="ai-intro">
        <a href="#ai-intro">✨ AI Track: Solve with Your Agent Sidekick</a>
      </div>
    </template>

    <div>
      Welcome to the AI Track! Get help from an AI assistant that understands MongoDB investigation techniques and can guide you through solving the mystery. Note: The agent provides guidance and query suggestions but doesn't access the game data directly - you'll still need to run queries on the main page.
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
      <strong>How the agent works:</strong> Your prompts are sent to an AI that helps with investigation techniques and can perform vector search on AI-enhanced data. The agent does NOT have direct access to the game database (crime, person, event, suspect data) - it works with the mmm_AI database for semantic search and conversation history only.
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
        <li>"What MongoDB query would find crimes in a specific city?"</li>
        <li>"How do I search for people by address in MongoDB?"</li>
        <li>"Explain how to use aggregation to connect suspects and events"</li>
        <li>"What's the best way to find witnesses for a crime?"</li>
      </ul>
      <em>Note: The agent provides guidance but doesn't access game data directly. Use the main page query editor to run actual database queries.</em>
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
