<template>
  <div>
    <div class="site-title">MongoDB Murder Mystery</div>
    <div class="subtitle" ref="subtitle">
      🧐 Can you find out <b>whodunnit</b> ?
      <!-- The LCP element: preloaded in index.html, sized so the page does not shift when it arrives -->
      <img class="responsive-img" src="/hero-1200.webp" srcset="/hero-640.webp 640w, /hero-1200.webp 1200w"
        sizes="(max-width: 700px) 100vw, 1200px" width="1200" height="807" fetchpriority="high" decoding="async"
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
