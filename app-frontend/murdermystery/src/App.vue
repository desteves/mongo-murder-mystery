<script setup>
import { RouterLink, RouterView } from 'vue-router'
import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
  <a class="skip-link" href="#main">Skip to content</a>
  <header>
    <div class="wrapper">
      <nav aria-label="Main">
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/walkthrough#plot"> Walkthrough</RouterLink>
        <RouterLink to="/ai#ai-intro">✨ AI Track</RouterLink>
        <RouterLink to="/about#motivation"> About</RouterLink>
      </nav>
      <HelloWorld />
    </div>
  </header>
  <main id="main" tabindex="-1">
    <RouterView />
  </main>
</template>
