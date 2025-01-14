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

      <li> The application runs in two Google CloudRun services deployed via CloudBuild with Cloudflare CDN/HTTPS.
      </li>
      <li>The front end is Vite. </li>
      <li>The backend is Javascript which talks to a <a
          href="https://www.mongodb.com/cloud/atlas/register?utm_campaign=devrel&utm_source=third-party&utm_medium=cta&utm_content=mmm&utm_term=diana.esteves"
          target="_blank"> 🆓 MongoDB Atlas Cluster </a> via the mongodb js driver. It receives the
        queries from the front end as encoded strings and translates them. The backend only accepts a very limited
        mongosh-like
        commands and by NO means it reflects its full capabilities. </li>

    </ul>

  </WelcomeItem>

  <WelcomeItem>


    <template #heading>
      <div id=" social">
        <a href="#social">Social Media</a>
      </div>
    </template>

    Did you find out <b>whodunnit?</b> Share your achievement on social and tag
    us!

    <ul>
      <li> <a class="boldlink" href="https://x.com/intent/post" target="_blank">
          Share on X
        </a><b>COPY AND PASTE: </b><br /> <br />

        🕵️‍♂️🔍🙌 #MysterySolved It was...shhhhh! Can you find out #whodunnit? Go to mongomudermystery.com TY @MongoDB
        @null_string #LoveYourDevelopers

        <br /> <br />

      </li>


      <li>
        <a class="boldlink"
          href="https://www.linkedin.com/shareArticle?mini=true&url=https://mongomurdermystery.com&title=Can%20you%20find%20out%20whodunnit%20&summary=I%20sure%20did&source=MongoMurderMystery"
          target="_blank">
          Share on LinkedIn
        </a>

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
        experience when migrating from SQL to MongoDB, I encourage you to read out my
        <a href="https://medium.com/mongodb/3-pitfalls-to-avoid-when-migrating-postgresql-to-mongodb-f40ef2f7cf15"> Medium article </a>
      </li>
      <li>
        I tried to keep the flow as close as possible to the SQL Version of the Murder Mystery as that was the
        inspiration behind this project.
      </li>
      <li>
        MIT License
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