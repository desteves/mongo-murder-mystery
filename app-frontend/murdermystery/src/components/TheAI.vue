<template>
  <div>
    <SelfTimer />
  </div>


  <WelcomeItem>

    <template #heading>
      <div id="plot">
        <a href="#plot"> 🍿 The Plot</a>
      </div>
    </template>


    <div> Uh Oh! There's been a murder in MongoDB City, and the detective needs your help. The detective gave you the
      crime scene report, but
      you
      somehow lost it. Tsk tsk! You vaguely remember that the crime was a 💀​murder💀​ that occurred sometime on 🗓️
      ​January
      15th,
      2018,​🗓️
      and
      that it took place in 📍 ​MongoDB City📍​. Start by retrieving the corresponding crime scene report from the
      police
      department’s
      database. <br /> <br />
      This website is designed as a fun game with self-directed
      lessons
      to
      learn
      MongoDB concepts and commands.
    </div>
    <br />

  </WelcomeItem>

  <section>
    <h1>Use AI</h1>
    <p>
      Ask questions about the MongoDB Murder Mystery data. Your prompt will be sent to your intern helper, an AI Agent,
      which can only query the Atlas-backed database via the configured MCP server.
    </p>
    <AgentPrompt  />
  </section>

  <section>
    <h2>How to use the Agent</h2>
    <p>
      The Agent is locked to the Murder Mystery Atlas database. It can list collections, find documents, count, or run
      aggregations. It cannot touch any other database or service.
    </p>
    <ul>
      <li>Keep prompts short (&lt;512 chars).</li>
      <li>Mention the collection you want (crime, person, event, or suspect).</li>
      <li>Specify simple filters like dates, names, or IDs.</li>
    </ul>

    <h3>Sample prompts</h3>
    <ul>
      <li>"List the collections in the murder mystery database."</li>
      <li>"Find the crime on January 15 2018 in MongoDB City."</li>
      <li>"Count crimes by location to see the top hotspots."</li>
      <li>"Show people connected to the main suspect."</li>
    </ul>

    <h3>Secure MCP setup</h3>
    <p>
      The Agent talks to an MCP server that you configure. Set <code>MCP_SERVER_URL</code> to the HTTP MCP endpoint
      (e.g., your Cloud Run URL) and <code>MDB_MCP_CONNECTION_STRING</code> to a read-only Atlas connection string.
      The Agent will initialize a session, connect with that string, and refuse to call any tool outside the approved
      list (list-databases, list-collections, find, aggregate, count).
    </p>

    <h3>Troubleshooting</h3>
    <ul>
      <li>If the Agent says it cannot connect, check that <code>MDB_MCP_CONNECTION_STRING</code> is set and reachable.</li>
      <li>If prompts are rejected, ensure they are under 512 characters and mention the murder mystery data.</li>
      <li>Only HTTP MCP requests to your configured server are allowed; other services are blocked.</li>
    </ul>
  </section>
</template>

<script setup>
import AgentPrompt from './AgentPrompt.vue';
</script>
