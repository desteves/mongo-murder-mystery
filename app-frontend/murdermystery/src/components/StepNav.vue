<template>
  <div class="stepnav" role="navigation" aria-label="Walkthrough progress">
    <ol>
      <li v-for="(step, i) in steps" :key="step.id">
        <a :href="'#' + step.id" :class="{ active: active === step.id, done: i < activeIndex }"
          :aria-current="active === step.id ? 'step' : undefined" @click.prevent="go(step.id)">
          <span class="num">{{ i < activeIndex ? '✓' : i + 1 }}</span> {{ step.label }}
        </a>
      </li>
    </ol>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

// The lesson sections of the walkthrough, in order (their ids are on the page headings).
const steps = [
  { id: 'vocab', label: 'Vocabulary' },
  { id: 'query', label: 'Queries' },
  { id: 'find', label: 'find()' },
  { id: 'advanced', label: 'Digging deeper' },
  { id: 'go', label: 'Solve it' },
  { id: 'solution', label: 'Check' },
];

const active = ref('');
const activeIndex = computed(() => Math.max(0, steps.findIndex((s) => s.id === active.value)));
let observer;

const go = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  history.replaceState(null, '', '#' + id);
};

onMounted(() => {
  // A step is "current" while its heading is in the upper part of the screen.
  observer = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) active.value = e.target.id;
  }, { rootMargin: '-10% 0px -70% 0px' });
  for (const s of steps) {
    const el = document.getElementById(s.id);
    if (el) observer.observe(el);
  }
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<style scoped>
.stepnav { position: sticky; top: 0; z-index: 50; background: var(--body-bg); padding: 0.5rem 0; border-bottom: 1px solid var(--link-color); }
ol { list-style: none; display: flex; flex-wrap: wrap; gap: 0.25rem 0.75rem; padding: 0; margin: 0; font-size: 0.9rem; }
a { text-decoration: none; font-weight: normal; padding: 0.2rem 0.5rem; border-radius: 999px; display: inline-block; }
a.active { background: var(--nav-active-bg-color); color: var(--header-color); font-weight: bold; }
a.done { opacity: 0.8; }
.num { display: inline-block; min-width: 1.2rem; text-align: center; font-weight: bold; }
</style>
