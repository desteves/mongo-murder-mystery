<script setup>
import { RouterLink, RouterView } from 'vue-router'
import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
  <header>
    <div class="wrapper">
      <nav>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/walkthrough#plot"> Walkthrough</RouterLink>
        <RouterLink to="/about#motivation"> About</RouterLink>
      </nav>
      <HelloWorld />
    </div>
  </header>
  <RouterView />
</template>