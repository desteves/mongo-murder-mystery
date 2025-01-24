<template>

  <div>
    <Timer />
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


  <WelcomeItem>

    <template #heading>
      <div id="start">
        <a href="#start">👩‍🏫 MongoDB Beginner Walkthrough</a>
      </div>
    </template>
    If you're comfortable with MongoDB, you can <router-link to="/#experienced" class="boldlink">skip these
      explanations</router-link> and put your
    skills to the test!<br /><br /> Below, we introduce MongoDB concepts and just enough to solve the
    murder. If
    you'd like a more complete course to MongoDB, complete the <a
      href="https://learn.mongodb.com/learning-paths/introduction-to-mongodb?utm_campaign=devrel&utm_source=third-party&utm_medium=cta&utm_content=mmm&utm_term=diana.esteves"
      class="boldlink" target="_blank">Introduction
      to
      MongoDB</a> <br /> <br />

    All the clues to this mystery are buried in a humongous database, and you need to use MongoDB to navigate through
    this
    vast network of information. Your first step to solving the mystery is to <b>retrieve the corresponding crime
      scene</b>
    report from the police department’s database. <br /> <br />Below we'll explain the commands you
    need to know;
    whenever you are ready, you can start adapting the examples to create your own commands in search of clues in any of
    the code boxes below.

    <br /><br />
    <a href="#" class="back-to-top" v-show="showBackToTop" @click.prevent="scrollToTop" title="Back to Top">
      ⬆ Back to Top
    </a>
  </WelcomeItem>


  <WelcomeItem>

    <template #heading>
      <div id="vocab">
        <a href="#vocab">📚 Some Definitions</a>
      </div>
    </template>

    <h2 id="what-is-mongo">
      <a href="#what-is-mongo">📗 What is MongoDB?</a>
    </h2>
    MongoDB, stands for a Humongous Database, and it offers way to store and find data quickly, like information about
    people or an event. <br /><br />

    <h2 id="what-is-a-database">
      <a href="#what-is-a-database">🗂️ Wait, what is a database?</a>
    </h2>
    A database represents a system for managing data, like a big digital library.
    Databases can have varying amounts of structure. When the data resides in a single location, it
    can help
    people and computers work with the data more efficiently.<br /><br />

    <div id="collections">
      <a href="#collections">Collections and Documents</a>
    </div>
    <div>
      In MongoDB, we make groups called <b>collections</b> for things, like "people" or "events". Each collection is
      made up of many entites like "Jason X" or "Friday the 13th". These entities are called documents. <br /><br />
    </div>
    <div>
      <b>Documents</b> are JSON-like objects, or digital cards with facts written on them. For instance, a "person"
      document might be for "Jack
      the Ripper" which has a bunch of details about Jack. Each detail is represented as a field name and value. Jack's
      document may have a field for "active_year"
      with the value of 1888. The values can be simple or more complex, like a map of with coordinates to all the
      horrendous murders Jack has commited.
    </div> <br />
    <div id="nosql">
      <a href="#nosql">🕺🏻What is NoSQL?</a>
    </div>
    <div>
      Just one more thing, you may have heard that MongoDB is often thought of as a "NoSQL" kind of database. This
      means is that MongoDB has
      flexible rules about how to relate data across collections and offers flexibility on how each document should look
      like.<br /><br />

    </div>
    <h2 id="what-is-a-schema-diagram">
      <a href="#what-is-a-schema-diagram">🖼️ What is a Schema diagram?</a>
    </h2>
    A <b>Schema diagram</b> is a visual representation of the relationships among collections within a database. Each
    collection
    also
    shows which fields may appear in it's documents. You can see
    the
    Schema diagram for our MongoDB Murder Mystery database below. <br /><br />

    <div>
      <img :src="mdbSchemaImage" alt="MongoDB Schema" @click="toggleZoom" :class="{ zoomed: isZoomed }" />
    </div>
    <br /><br /> Each box represents a collection, with fields and data types.
    There are four collections in our database. Each collection has a name
    (top
    of
    the box), a list of field names (on the left) and their corresponding data types (on the right).The green key icon
    next a field indicates that
    the field is a ​primary field, and a grey link indicates that the field can be used
    as
    a reference.<br /><br />

    A <b>primary field</b> is a unique identifier for each document in a collection. Like a person's social security
    number.<br />
    A <b>reference field</b>​ can be used to relate data in one collection to data in another collection when running
    a
    query.

    <br /><br />
    <a href="#" class="back-to-top" v-show="showBackToTop" @click.prevent="scrollToTop" title="Back to Top">
      ⬆ Back to Top
    </a>
  </WelcomeItem>
  <WelcomeItem>
    <template #icon>
      <!-- <ExploreIcon /> -->
    </template>
    <template #heading>
      <div id="query">
        <a href="#query">🙋‍♀️ What is a query?</a>
      </div>
    </template>

    If you were to look at the data in our database, you would see that the collections are huge! There are so many
    documents; it simply isn’t possible to go through the collections document by document to find the clues we
    need. Who knows, by the time we're done manually searching prehaps even more murders would have occured! So, what
    are we
    supposed to do?
    <br /><br />
    This is where queries come in. <b>Queries</b> are a way for us to ask the
    database to show us specific information. These are structured in a particular format that MongoDB can understand.
    We'll use these to find all the clues
    we need.
    <br /><br />Let's try a
    few queries. <br /><br />

    <h2 id="show-collections">
      <a href="#show-collections">🫣 Showing collections</a>
    </h2>
    We'll use <code>mongosh</code>, a popular tool to send our queries to MongoDB. There are many other ways to access
    the database
    but this is a very popular one.
    <br /><br />
    For each of the boxes below,
    click "RUN" to execute the query in the box. You can edit the queries to explore
    more. If you get stuck at any point, click "RESET" to start over. <br /><br />

    <MongoQueryPrompt title="Find the list of collections (places where data is stored)." subtitle="
  The results will show you all the names of the collections in the database."
      preFilledText=" db.getCollectionNames()" />

    <h2 id="finding-documents">
      <a href="#finding-documents">🔎 Finding documents</a>
    </h2>
    Noticed the names of the collections in the previous results? These exactly match the names in our <a href="#"
      @click.prevent="toggleImage">Schema diagram. </a>
    <img v-if="showImage" :src="mdbSchemaImage" alt="MongoDB Schema" @click="toggleZoom"
      :class="{ zoomed: isZoomed }" />
    You can
    use these names to query the data in the collections. Keep in mind, they are case-sensitive.
    <MongoQueryPrompt title="How many people are there?"
      subtitle="Try changing person to any other collection to see how many documents it has."
      preFilledText='db.person.count()' />
    <MongoQueryPrompt title="What do we know about those people?"
      subtitle="If you want all the data for each document in a collection, use the 'find()' command. As you just learned, there are thousands of people, so rather than seeing all of them, we'll limit the results to just the first 3. Try changing the number."
      preFilledText='db.person.find().limit(3)' />

    Sometimes a single document can have many many fields and it can be hard scroll through all of
    these. We can specify which fields the database returns by modifying our query. Field names are also
    case sensitive.<br />

    <MongoQueryPrompt title="Only show some details about a crime."
      subtitle=" Execute the query below. See the difference? Go ahead and re-run the query with different field names and collections."
      preFilledText='db.crime.find({}, {"type": 1, "city": 1}).limit(3)' />


    <h2 id="distinct">
      <a href="#distinct">🧩 Finding possible values</a>
    </h2>
    When working with data, always see if you can find documentation that explains the database structure (like the
    <a href="#" @click.prevent="toggleImage">Schema diagram </a>
    <img v-if="showImage" :src="mdbSchemaImage" alt="MongoDB Schema" @click="toggleZoom"
      :class="{ zoomed: isZoomed }" />)
    and valid values. But sometimes that’s not available. Here we show how use the
    'disticnt()'
    command to give you a quick look at which values are in the collection for a given field. <br />
    <MongoQueryPrompt title="What are the possible types of crimes?"
      subtitle=" Feel free to substitue the field name 'type' for any other valid field name. Consult the Schema diagram as needed"
      preFilledText='db.crime.distinct("type")' />
    Look at the results and take a wild guess the type of crime we're interested in.
    <br /><br />
    <a href="#" class="back-to-top" v-show="showBackToTop" @click.prevent="scrollToTop" title="Back to Top">
      ⬆ Back to Top
    </a>
  </WelcomeItem>

  <WelcomeItem>
    <template #icon>
    </template>
    <template #heading>
      <div id="find">
        <a href="#find">🎯 The MongoDB find() Query</a>
      </div>
    </template>
    <div>
      The <b>find()</b> query is used to retrieve documents. It works against a single collection. It is broken up into
      two main
      parts.<br /><br />
      The <b>filter</b> part comes first and represents the matching criteria. This is where you can
      specify the conditions
      that
      must be met for a document to be included in the results. For example, I can have a filter to only return crimes
      that have "Austin" as their city. Omitting the filter is the same as passing
      an
      empty object {}. This means MongoDB will match all the documents in the collection! <br /><br />
      The <b>projection</b> part comes after the filter. This is where you can specify which fields
      you
      want
      to
      include or exclude
      from the results. For example, I can project only the "name" field for each person. The projection argument is
      also optional. If you don't specify a projection, all fields will be
      included in the results. <br /><br />

    </div>
    <div>
      Run the find queries below to see filtering and projecting in action.
    </div>
    <br />
    <h2 id="projection">
      <a href="#projection">📽️ Projecting fields</a>
    </h2>

    <MongoQueryPrompt title="Return only the crime type and city information."
      subtitle="Try different field names and toggling between either all 0s or all 1s. You'll quickly learn that using 0s omits the specified field(s) whereas using 1s returns the specified field(s)."
      preFilledText='db.crime.find({}, {"type": 1, "city": 1 })' />

    <h2 id="filtering">
      <a href="#filtering">🔬 Filtering documents</a>
    </h2>
    <MongoQueryPrompt
      title="Here's a simple query to get everything about a specific person. (Don't worry—all of the SSNs are made up.)"
      subtitle="Note that you need to use double quotes (&quot;) around literal text so MongoDB can tell it apart. Try to re-run the query with &quot;Yessenia Fossen&quot;, &quot;Ted Denfip&quot; or &quot;Davina Gangwer&quot;."
      preFilledText='db.person..find({ "name": "Kinsey Erickson"})' />
    <br />

    <h2 id="multiple-filters">
      <a href="#multiple-filters">🤹🏼 Multiple filters</a>
    </h2>
    You can have many filters. These are internally combined so that all filters must match for a document to be
    included in the results.

    <MongoQueryPrompt title="Show me thefts in Chicago."
      subtitle="Notice that when querying for text values, you must match the data as it is in the database. Try changing 'Chicago' to 'chicago' and running the query. Then, see if you can edit this query to find the very first clue based on the items you vaguely remebered from way at the top above (💀🗓️📍)."
      preFilledText='db.crime.find({ "type": "theft", "city": "Chicago" })' />

    Feeling super stuck? Re-read <a href="#plot"> <b>the plot</b> </a> or

    <a class="boldlink" @click="toggleHint">
      {{ hintVisible ? 'Hide Hint' : 'Show Hint' }}
    </a><br />

    <div v-if="hintVisible" class="hint-text"> <br />
      Paste the following on box above and RUN it to get your first clue. <br />
      <code>db.crime.find({"type": "murder", "city": "MongoDB City", "date": 20180115})</code>
      <br />
    </div>


    <br /><br />
    <h2 id="regex">
      <a href="#regex">🌗 Finding partial values</a>
    </h2>

    Sometimes you only know some of the search information, like only a person's first name. Or perhaps you aren't sure
    if a value is represented in all
    lowercase or all UPPERCASE or a MiXtUrE of letters. MongoDB can handle all these. It has special search
    capabilities to
    represent these uncertaintites via a regex pattern.
    <br /><br />
    A <b>regex pattern</b> is a special filter with complex rules for how a value can look like. For example, I
    can
    create a regex to ask MongoDB to give me back all people who's name start with the letter 'D' and end with the
    letter 'a', oh and also the name has to be at least 5 letters long.

    <br /><br />
    Important: When using regex patterns, don't enclose it with &quot; Instead, we'll use the forward slash symbol, /
    <br /><br />
    For our crime-solving purposes, we'll focus on creating patterns to match letters and numbers only (Sorry,
    no emojis this time). Each number and letter is refered to as a character. Here are three popular regex patterns:
    <br /><br />
    <ul>
      <li> The <code>/abc/</code> pattern matches all values that have 'abc' in it. You can substitute 'abc' with any
        other set of characters, including numbers. This would match 'abc', '123abc' and 'abc123' but not 'ab' or 'cab'.
      </li>

      <li> The
        <code>^</code> pattern means that the value should start with the
        letters and numbers after the ^ symbol. For example, <code>/^Irvin/</code> would match 'Irving' and 'Irvin'
        but
        not 'Mr Irving'.
      </li>
      <li> The
        <code>$</code> pattern indicates the value should end with the
        preceeding letters and numbers. For example, <code>/e$/</code> would match 'Jane' and 'Sue' but not 'John'
        or
        'Jenny'.
      </li>
    </ul>

    <br /><br />
    <MongoQueryPrompt title="Find all crimes in cities that start with I."
      subtitle="Try variations like /^Irvin/ and /^I/ or come up with your own. Remember, the regex pattern should be enclosed in forward slashes."
      preFilledText='db.crime.find({ "city": /^I/ })' />



    <br /><br />
    <h2 id="number-search">
      <a href="#number-search">🧮 Searching for numbers</a>
    </h2>
    MongoDB supports number comparisons when filtering values such as "less than" 100 or "greater than" 5. These
    comparisons are represented as operators. <b>Operators</b> have a special format, they start with the '$' symbol. We
    can
    use operators in our queries to, say, find all
    crimes that happened after a certain date. <br /><br />

    Common operators include:
    <ul>
      <li> The <code>$gt</code> operator to find values greater than a certain number.</li>
      <li> The <code>$lt</code> operator to find values less than a certain number.</li>
      <li> The <code>$gte</code> operator to find values greater than or equal to a certain number.</li>
      <li> The <code>$lte</code> operator to find values less than or equal to a certain number.</li>
    </ul>

    <br /> You may have noticed that all dates are represented as numbers throughout our database. This
    is intentional to make
    it easier to search and compare. For instance if you see 20241216, it means the year 2024, month of December and
    the 16th day of the month. MongoDB does offer a date type but we won't make use of those today.
    <br /><br />

    <MongoQueryPrompt title="Which crimes happened after mid January of 2018 and before mid February 2019?"
      subtitle="Change the date to see how the results change. Note that numbers should NOT be encosed in quotes."
      preFilledText='db.crime.find({"date": { $gt: 20180115, $lt: 20190215 } })' />

    <br /><br />
    <a href="#" class="back-to-top" v-show="showBackToTop" @click.prevent="scrollToTop" title="Back to Top">
      ⬆ Back to Top
    </a>
  </WelcomeItem>
  <WelcomeItem>
    <template #icon>
    </template>

    <template #heading>
      <div id="advanced">
        <a href="#advanced">⚒️ Digging a little deeper</a>
      </div>
    </template>

    <h2 id="sorting">
      <a href="#sorting">🔠 Sorting results</a>
    </h2>
    Sometimes you may want to ask more complex questions such as “Who is the oldest
    person?” or “Who is the shortest person?” As you can imagine, correctly answering these questions requires knowing
    the age or height of every person in the database.

    <br /><br />
    With a small amount of data,
    you might be able to just eyeball it, but there are thousands people in our "person" collection. So we can't just
    look over that list to find the answer. Instead, we'll use a sorting command to help us out. <br /><br />
    It's really quite intuitive: just add <code>.sort({ "field": 1 })</code> at the end of
    your <code>find()</code> query. The
    1 indicates results will show the smallest (or most recent) values first. If you want the largest (oldest) values first,
    use -1.
    <br /><br />

    <MongoQueryPrompt title="Run this query to see how to control sort order."
      subtitle="Change 1 to -1 and try sorting on other fields too.  Note we also use the limit to cut down the results to only see what we are interested in."
      preFilledText='db.person.find().sort({"driversLicense.age": -1})' />
    <br /><br />


    <h2 id="nested-fields">
      <a href="#nested-fields">🪆Searching for nested fields</a>
    </h2>
    Sometimes the data you're looking for is inside another field. You may have picked this up from the previous
    example. The <code>driversLicense</code> is a nested field. This means it has its own fields inside it. To
    search for

    data inside a nested field, you can use a dot, ".". Go back and review the <a href="#"
      @click.prevent="toggleImage">Schema diagram. </a>
    <img v-if="showImage" :src="mdbSchemaImage" alt="MongoDB Schema" @click="toggleZoom"
      :class="{ zoomed: isZoomed }" />
    to see which other fields
    are nested. In the person collection, the nested fields are "gym", "driversLicense" and "vehicle".
    <br /><br />

    <MongoQueryPrompt title="How tall is the tallest female?"
      subtitle="Sorry my fellow non-Americans, the number is shown in inches. Notice how we can put everything we've learned to optimize our results with the filter and projection parts of the query!"
      preFilledText='db.person.find({"driversLicense.gender": "female"}, { "name": 1, "driversLicense.height": 1 }).sort({"driversLicense.height": -1}).limit(1)' />


    <br /><br />
    <a href="#" class="back-to-top" v-show="showBackToTop" @click.prevent="scrollToTop" title="Back to Top">
      ⬆ Back to Top
    </a>
  </WelcomeItem>


  <WelcomeItem>

    <template #heading>

      <div id="go">
        <a href="#go">🕵🏽‍♀️ Go Get 'em!</a>
      </div>
    </template>

    You should already have solved the first clue, if not, jump back to the <a href="#multiple-filters"
      class="boldlink">
      multiple query
      filtering</a> section.
    Then, come back here.<br /><br />

    <h2 id="clue-one">
      <a href="#clue-one">🪪 Identify the witnesses</a>
    </h2>
    By now, you know enough MongoDB to identify the witnesses. Give it a try!
    <MongoQueryPrompt title="Write a query that identifies one of the witnessness."
      subtitle="There's more than one way to do it, if you get the correct name, you'll see a congratulatory message. After you identified one of the witnesses, go ahead, update your query and identify the second witness. Ensure your results only return 1 document at a time and show the name field!" />
    Feeling super duper stuck? <a @click="toggleHintTwo" class="boldlink">
      {{ hintTwoVisible ? 'Hide Hint' : 'Show Hint' }}
    </a>

    <div v-if="hintTwoVisible" class="hint-text"> <br />
      Paste the following on box above and RUN it to get your next clue. <br />
      <code>db.person.find({"addressStreetName": "Northwestern Dr"}).sort({"addressNumber": -1}).limit(1)</code>

      <br />
      Now go ahead and put a query together to find the other witness. <br />

    </div>
    <br /><br />


    <h2 id="clue-two">
      <a href="#clue-two">🧩 Find the suspect</a>
    </h2>
    Read up the witness' interview script to solve your next clue. Cross check hints to ensure the clues
    match
    the same suspect. And as always, use the <a href="#" @click.prevent="toggleImage">Schema diagram</a>
    <img v-if="showImage" :src="mdbSchemaImage" alt="MongoDB Schema" @click="toggleZoom"
      :class="{ zoomed: isZoomed }" />
    for guidance.<br />
    <MongoQueryPrompt title="Form a query to learn more about the clues from the interviews."
      subtitle="There's more than one way to do it" preFilledText='db.gymCheckin.find().limit(1)' />

    <br /><br />

    <h2 id="clue-three">
      <a href="#clue-three">🧠 Uncover the mastermind</a>
    </h2>
    There's no new MongoDB skills required to solve the mystery. Combine everything you've learned so far to crack
    down
    the
    mystery. And, use the <a href="#" @click.prevent="toggleImage">Schema diagram</a>
    <img v-if="showImage" :src="mdbSchemaImage" alt="MongoDB Schema" @click="toggleZoom"
      :class="{ zoomed: isZoomed }" />
    for guidance.

    <MongoQueryPrompt title="Solve the muder mystery"
      subtitle="It will take more than one query to find them, but you can just keep editing this box, keeping notes on your results along the way. When you think you know the answer, go to the next section. Ensure to dig all the way to uncover the evil mastermind behind it all. (Modify the query below to get started)"
      preFilledText='db.person.find({ "driversLicense.age": { $gte: 18, $lte: 21 } }).sort({ "age": -1 })' />

    <br /><br />
    <a href="#" class="back-to-top" v-show="showBackToTop" @click.prevent="scrollToTop" title="Back to Top">
      ⬆ Back to Top
    </a>
  </WelcomeItem>

  <WelcomeItem>
    <template #heading>
      <div id="solution">
        <a href="#solution">🎯 Check your solution</a>
      </div>
    </template>
    <MongoQueryPrompt title="Whodunnit?" subtitle="Update &quot;Jack&quot; to check if you guessed correctly. If the answer is correct, you' ll see a
      congratulatory message. 🔐 This is a highly restricted collection that will only permit you to check the name of
      your suspect.🔐 " preFilledText='db.solution.find({ "name" : "Jack" })' />
    Don't forget to <a class="boldlink" href="/about#social">brag</a> once you have solved the
    intriguing crime.

    <br /><br />
    <a href="#" class="back-to-top" v-show="showBackToTop" @click.prevent="scrollToTop" title="Back to Top">
      ⬆ Back to Top
    </a>

  </WelcomeItem>

</template>
<script setup>

import { ref, onMounted, onBeforeUnmount } from 'vue';
import WelcomeItem from './WelcomeItem.vue'
import MongoQueryPrompt from './MongoQueryPrompt.vue';
import Timer from "./Timer.vue";

// Import the image file
import mdbSchemaImage from '@/assets/mdb-schema.png';

// Reactive references to track image visibility and zoom state
const showImage = ref(false);
const isZoomed = ref(false);
const hintVisible = ref(false);
const hintTwoVisible = ref(false);
// Reactive reference to track button visibility
const showBackToTop = ref(false);

// Method to scroll to the top
const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
};

// Method to update button visibility based on scroll position
const handleScroll = () => {
  showBackToTop.value = window.scrollY > 100;
};

// Lifecycle hooks to add/remove event listener
onMounted(() => {
  window.addEventListener('scroll', handleScroll);
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll);
});
const toggleHintTwo = () => {

  hintTwoVisible.value = !hintTwoVisible.value;
}

const toggleHint = () => {

  hintVisible.value = !hintVisible.value;
}

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