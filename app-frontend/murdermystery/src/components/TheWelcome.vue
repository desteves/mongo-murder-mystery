<template>
  <WelcomeItem>
    <!-- <template #icon>
      <NewIcon />
    </template> -->
    <template #heading>
      <div id="new">
        <a href="#new">🍼 New to MongoDB?</a>
      </div>
    </template>
    <div>
      This exercise is a way to practice MongoDB skills (rather than a full tutorial). If you've never tried MongoDB,
      check out the
      <router-link class="boldlink" to="/walkthrough#start">walkthrough</router-link>. If you want to learn a lot about
      MongoDB, you may prefer
      a
      complete (free) course like
      <a class="boldlink" href="https://learn.mongodb.com/learning-paths/introduction-to-mongodb"
        target="_blank">Introduction to
        MongoDB</a>.
    </div><br />
    <div>
      Ready to go? Jump in!
    </div>
  </WelcomeItem>

  <WelcomeItem>
    <!-- <template #icon>
      <ExploreIcon />
    </template> -->
    <template #heading>

      <div id="experienced">
        <a href="#experienced">👩‍💻 Experienced sleuths start here</a>
      </div>

    </template>
    <h2 id="explore">
      <a href="#explore">🗺️ Explore the Database Structure</a>
    </h2>
    <div>
      Experienced MongoDB users can often infer the structure of any database by querying it. We use a tool called
      <code>mongosh</code> to find out what's in the Murder Mystery database.
    </div>
    <MongoQueryPrompt title="Find the list of collections (places where data is stored)." subtitle="This command works in mongosh. There are many other ways to access the database but this is a popular one and it's one we'll continue to use here.

      When you're ready, click 'RUN'. The results will show you all the names of the collections in the database."
      preFilledText="db.getCollectionNames()" />
    <div>
      Next, let's see what each collection contains.
    </div>
    <MongoQueryPrompt title="See the details of the crime collection"
      subtitle="Change &quot;crime&quot; to see other collections. You'll need to keep those quotes around the collection name so MongoDB can recognize them properly. Click 'RESET' if you get stuck."
      preFilledText='db["crime"].find().limit(1)' />
  </WelcomeItem>
  <WelcomeItem>
    <!-- <template #icon>
      <SolutionIcon />
    </template> -->
    <template #heading>
      <div id="go">
        <a href="#go">🧩 The rest is up to you!</a>
      </div>
    </template>
    <div>
      Think you can solve this? Give it a try!
    </div>
    <a class="boldlink" href="#" @click.prevent="toggleImage">Click here to show the Schema diagram.</a>
    <img v-if="showImage" :src="mdbSchemaImage" alt="MongoDB Schema" @click="toggleZoom"
      :class="{ zoomed: isZoomed }" />
    <div>
      <br />
      Need extra help? Follow the <router-link class="boldlink" to="/walkthrough#start">Walkthrough.</router-link>
    </div>
    <MongoQueryPrompt title="Solve the muder mystery"
      subtitle="It will take more than one query to solve everything, but you can just keep editing this box, keeping notes on your results along the way. When you think you know the answer, go to the next section. Ensure to dig down all the way to uncover the evil mastermind behind it all." />
  </WelcomeItem>

  <WelcomeItem>
    <template #heading>
      <div id="solution">
        <a href="#solution">🎯 Check your solution</a>
      </div>
    </template>
    <MongoQueryPrompt title="Whodunnit?"
      subtitle="Update &quot;Jack&quot; to check if you guessed correctly. If the answer is correct, you'll see a congratulatory message. 🔐 This is a highly restricted collection that will only permit you to check the name of your suspect.🔐 "
      preFilledText='db["solution"].find({ "name": "Jack" })' />
    Don't forget to <a class="boldlink" href="/about#social">brag</a> once you have solved the
    intriguing crime.
  </WelcomeItem>
</template>

<script setup>
import { ref } from 'vue';
import WelcomeItem from './WelcomeItem.vue';
import MongoQueryPrompt from './MongoQueryPrompt.vue';

// Import the image file
import mdbSchemaImage from '@/assets/mdb-schema.png';

// Reactive references to track image visibility and zoom state
const showImage = ref(false);
const isZoomed = ref(false);

// Method to toggle image visibility
const toggleImage = () => {
  showImage.value = !showImage.value;
  isZoomed.value = false; // Reset zoom state when toggling visibility
};

// Method to toggle zoom state
const toggleZoom = () => {
  isZoomed.value = !isZoomed.value;
};
</script>

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