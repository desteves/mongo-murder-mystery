<template>
  <div>
    <title>MongoDB Murder Mystery</title>
    <subtitle>
      🧐 Can you find out <b>whodunnit</b> ?
      <img class="responsive-img" src="../assets/mdb-search.png"
        alt="Illustration depicting an investigation using MongoDB" />
    </subtitle>

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
        {
          property: 'og:image', content: 'https://mongomurdermystery.com/assets/mdb-search-BLE5yYrV.png' },
        { property: 'og:description', content: 'Can you find out #whodunnit?' },
        { property: 'og:url', content: 'https://mongomurdermystery.com' },
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