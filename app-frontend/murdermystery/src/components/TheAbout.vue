<script setup>
import WelcomeItem from './WelcomeItem.vue'

</script>

<template>
  <WelcomeItem>

    <template #heading>

      <div id="motivation">
        <a href="#motivation">Motivation</a>
      </div>

    </template>

    <ul>
      <li>Learn MongoDB in a fun way.
      </li>
      <li>Practice my web app building skills (and hopefully don't get hacked)</li>
    </ul>
  </WelcomeItem>

  <WelcomeItem>
    <template #heading>
      <div id="tech">
        <a href="#tech">Tech Stack</a>
      </div>

    </template>

    <ul>

      <li><a href="https://github.com/desteves/mongo-murder-mystery" target="_blank" rel="noopener noreferrer">
          View this project on GitHub
        </a></li>

      <li> The application runs in three Google CloudRun services deployed via CloudBuild with Cloudflare.
      </li>
      <li>The front end is Vite. </li>
      <li>The backend is Javascript which talks to a <a
          href="https://www.mongodb.com/cloud/atlas/register?utm_campaign=devrel&utm_source=third-party&utm_medium=cta&utm_content=mmm&utm_term=diana.esteves"
          target="_blank"> 🆓 MongoDB Atlas Cluster </a> via a PrivateEndpoint and uses the node mongodb native driver.
        It receives the
        queries from the front end as encoded strings and translates them. The backend only accepts a VERY limited
        mongosh-like
        commands and by NO means it reflects its full capabilities. </li>
      <li> 🆕 The LLM prompt (Agent) feature uses the <code>openai/gpt-oss-20b:free</code> model via OpenRouter.
      </li>
      <li> 🆕 The Agent uses an <a target="_blank" rel="noopener noreferrer" href="https://github.com/mongodb-js/mongodb-mcp-server">Atlas MCP Server</a> for
        tools to assist with MongoDB queries and provide intelligent responses. This is hosted in a separate CloudRun
        service. </li>
      <li>
        MIT License
      </li>
    </ul>

  </WelcomeItem>

  <WelcomeItem>

    <template #heading>
      <div id=" social">
        <a href="#social">Social Media</a>
      </div>
    </template>

    Did you find out <b>whodunnit?</b> Share your achievement on social.

    <ul>
      <li>
        Hint: Consider taking a screenshot of the congratulatory message along with the time it took you to solve the
        mystery!
      </li>
      <li>
        <b>COPY AND PASTE: </b><br /> <br />
        🕵️‍♂️🔍🙌 #MysterySolved It was...shhhhh! Can you find out #whodunnit? Go to mongomudermystery.com TY
        #LoveYourDevelopers
        <br /> <br />

      </li>

    </ul>
  </WelcomeItem>

  <WelcomeItem>

    <template #heading>

      <div id="credits">
        <a href="#credits">Credits</a>
      </div>
    </template>

    <ul>
      <li>
        The MongoDB Murder Mystery was created by @desteves. See the
        <a href="https://github.com/desteves/mongo-murder-mystery"> GitHub repository for more information. </a>
      </li>
      <li>
        The Schema diagram was taken when migrating the SQL version of this project via the MongoDB Relational
        Migrator. Another popular source for creating Schema diagrams is Hackolade. If you want to learn more about the
        experience when migrating from SQL to MongoDB, I encourage you to read my
        <a href="https://medium.com/mongodb/3-pitfalls-to-avoid-when-migrating-postgresql-to-mongodb-f40ef2f7cf15">
          Medium article </a>
      </li>
      <li>
        I tried to keep the flow as close as possible to the SQL Version of the Murder Mystery as that was the
        inspiration behind this project.
      </li>
    </ul>

  </WelcomeItem>

</template>

<style scoped>
.boldlink {
  font-weight: bold;
  text-decoration: underline;
}

a {
  text-decoration: none;
  font-weight: normal;
  /* color: inherit; */

  /* Optional: Match the link color to the surrounding text */
}
</style>
