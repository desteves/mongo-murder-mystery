<script setup>
import { RouterLink, RouterView } from 'vue-router'
import HelloWorld from './components/HelloWorld.vue'
import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import apiService from '@/services/api'
import { registerWebMcpTools } from '@/lib/webmcp.js'

// Offer the page's tools to in-browser AI agents (WebMCP); a no-op in browsers without it.
const router = useRouter()
let unregisterTools = () => {}
onMounted(() => {
  unregisterTools = registerWebMcpTools({ api: apiService, go: (path) => router.push(path) })
})
onBeforeUnmount(() => unregisterTools())
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
