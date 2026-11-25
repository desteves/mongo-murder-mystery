<template>
  <div>
    <h1 class="site-title">MongoDB Murder Mystery</h1>
    <div class="subtitle" ref="subtitle">
      🧐 Can you find out <b>whodunnit</b> ?
      <!-- The LCP element: preloaded in index.html, sized so the page does not shift when it arrives -->
      <img class="responsive-img" src="/hero-560.webp" srcset="/hero-480.webp 480w, /hero-560.webp 560w, /hero-1120.webp 1120w"
        sizes="(max-width: 700px) 100vw, 560px" width="560" height="377" fetchpriority="high" decoding="async"
        alt="Illustration depicting an investigation using MongoDB" />
    </div>
  </div>
</template>
<style scoped>
a {
  text-decoration: none;
  font-weight: bold;
}
</style>
