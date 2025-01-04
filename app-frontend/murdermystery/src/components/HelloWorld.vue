<template>
  <div>
    <title>Mongo Murder Mystery</title>

    <subtitle>
      🧐 Can you find out <b>whodunnit</b> ?
      <img class="responsive-img" src="../assets/mdb-search.png"
        alt="Illustration depicting an investigation using MongoDB" />
    </subtitle>


    <br />
    <h3 id="plot">
      <a href="#plot">The Plot</a>
    </h3>
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
      MongoDB concepts and commands. Don't forget to <a href="/about#social">brag</a> once you have solved the
      intriguing crime.
    </div>
    <br />
  </div>
</template>
<script >

import { onMounted } from 'vue';
export default {
  name: 'MongoDB Murder Mystery',
  setup() {
    onMounted(() => {
      // Dynamically add Open Graph meta tags
      document.head.querySelectorAll("[property^='og:']").forEach((el) => el.remove()); // Clean up existing tags first

      const metaTags = [
        { property: 'og:title', content: 'MongoDB Murder Mystery' },
        { property: 'og:image', content: '//mongomurdermystery.com/assets/mdb-search-BLE5yYrV.png' },
        { property: 'og:description', content: 'Can you find out whodunnit?' },
        { property: 'og:url', content: '//mongomurdermystery.com' },
      ];

      metaTags.forEach(({ property, content }) => {
        const meta = document.createElement('meta');
        meta.setAttribute('property', property);
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
      });
    });
  },
};

</script>
<style scoped>
a {
  text-decoration: none;
  font-weight: bold;
  /* color: inherit; */

  /* Optional: Match the link color to the surrounding text */
}
</style>