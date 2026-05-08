# Vue 3 + Vite Best Practices

## Current Implementation ✅

### Build Configuration (vite.config.js)
- ✅ Manual chunk splitting for optimal caching
- ✅ Cache-busting with content hashes
- ✅ CSS code splitting enabled
- ✅ Console/debugger removal in production
- ✅ Compression reporting enabled
- ✅ Path aliases (`@/` for `src/`)
- ✅ Dev tools only in development
- ✅ Modern browser target (es2020)

### Component Patterns
- ✅ Script setup syntax (modern approach)
- ✅ Lazy loading for routes
- ✅ Lazy loading for CodeMirror (485KB)
- ✅ Proper component cleanup (beforeUnmount)

### Performance
- ✅ Code splitting (vendor, editor, utils)
- ✅ Lazy imports for heavy dependencies
- ✅ Query result caching
- ✅ Resource hints (preconnect, dns-prefetch)

## Recommended Improvements

### 1. Component Structure

**Use Composition API + Script Setup**
```vue
<!-- ✅ Good (current in some files) -->
<script setup>
import { ref, computed } from 'vue'
const count = ref(0)
const doubled = computed(() => count.value * 2)
</script>

<!-- ❌ Avoid Options API for new code -->
<script>
export default {
  data() { return { count: 0 } }
}
</script>
```

**Props Validation**
```vue
<script setup>
// ✅ Good - with validation
defineProps({
  title: {
    type: String,
    required: true,
    validator: (value) => value.length > 0
  }
})

// ❌ Avoid - no validation
defineProps(['title'])
</script>
```

### 2. Vite Config Optimizations

**Add these to vite.config.js:**

```javascript
export default defineConfig({
  // Build optimizations
  build: {
    rollupOptions: {
      output: {
        // More granular chunking
        manualChunks(id) {
          // Separate node_modules by package
          if (id.includes('node_modules')) {
            const match = id.match(/node_modules\/(@?[^/]+)/);
            if (match) {
              const packageName = match[1];
              // Group Vue ecosystem
              if (['vue', 'vue-router', '@vue'].some(n => packageName.includes(n))) {
                return 'vendor-vue';
              }
              // Keep editor separate (large)
              if (packageName.includes('codemirror') || packageName.includes('@codemirror')) {
                return 'vendor-editor';
              }
              // Utils bucket for smaller libraries
              return 'vendor-utils';
            }
          }
        }
      }
    }
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['vue', 'vue-router', 'axios'],
    exclude: ['@codemirror/*'] // Don't pre-bundle (lazy loaded)
  },

  // Preview server config
  preview: {
    port: 8080,
    strictPort: true
  }
})
```

### 3. Component Best Practices

**Computed vs Methods**
```vue
<script setup>
import { ref, computed } from 'vue'

const items = ref([1, 2, 3])

// ✅ Good - cached, reactive
const total = computed(() => items.value.reduce((a, b) => a + b, 0))

// ❌ Avoid - recalculated every render
const getTotal = () => items.value.reduce((a, b) => a + b, 0)
</script>
```

**Use v-memo for Expensive Renders**
```vue
<!-- Cache component rendering based on dependencies -->
<div v-memo="[queryResult, isLoading]">
  <pre>{{ queryResult }}</pre>
</div>
```

**Async Component Loading**
```javascript
// router/index.js
const routes = [
  {
    path: '/about',
    component: () => import('../views/AboutView.vue'), // ✅ Lazy loaded
    meta: { title: 'About' }
  }
]
```

### 4. Composables Pattern

**Create reusable logic (src/composables/)**
```javascript
// composables/useQueryCache.js
import { ref } from 'vue'

export function useQueryCache(maxSize = 50) {
  const cache = ref(new Map())

  const get = (key) => cache.value.get(key)
  
  const set = (key, value) => {
    if (cache.value.size >= maxSize) {
      const firstKey = cache.value.keys().next().value
      cache.value.delete(firstKey)
    }
    cache.value.set(key, value)
  }

  const has = (key) => cache.value.has(key)
  const clear = () => cache.value.clear()

  return { get, set, has, clear }
}
```

**Usage:**
```vue
<script setup>
import { useQueryCache } from '@/composables/useQueryCache'

const queryCache = useQueryCache(50)
</script>
```

### 5. Performance Optimizations

**Virtual Scrolling for Large Lists**
```bash
npm install vue-virtual-scroller
```

**Debounce/Throttle**
```vue
<script setup>
import { ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'

const search = ref('')
const debouncedSearch = useDebounceFn((value) => {
  // API call here
}, 300)
</script>
```

**Web Workers for Heavy Computation**
```javascript
// workers/jsonParser.worker.js
self.onmessage = (e) => {
  const result = JSON.parse(e.data)
  self.postMessage(result)
}
```

### 6. State Management

**For small apps: Composables**
```javascript
// stores/useAuth.js (lightweight)
import { ref } from 'vue'

const apiKey = ref(null)

export function useAuth() {
  const setApiKey = (key) => apiKey.value = key
  const clearApiKey = () => apiKey.value = null
  
  return { apiKey, setApiKey, clearApiKey }
}
```

**For larger apps: Pinia**
```bash
npm install pinia
```

### 7. Type Safety (Optional but Recommended)

**JSDoc for Type Hints**
```vue
<script setup>
/**
 * @typedef {Object} QueryResult
 * @property {string} query
 * @property {any} data
 * @property {number} timestamp
 */

/** @type {import('vue').Ref<QueryResult | null>} */
const result = ref(null)
</script>
```

**Or TypeScript**
```vue
<script setup lang="ts">
interface QueryResult {
  query: string
  data: any
  timestamp: number
}

const result = ref<QueryResult | null>(null)
</script>
```

### 8. Environment Variables

**Always prefix with VITE_**
```bash
# .env.production
VITE_API_URL=https://api.production.com
VITE_API_KEY=prod-key

# Access in code
const apiUrl = import.meta.env.VITE_API_URL
```

**Type-safe env vars:**
```typescript
// src/env.d.ts
interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_API_KEY: string
}
```

### 9. Asset Optimization

**Image optimization:**
```javascript
// vite.config.js
import { imagetools } from 'vite-imagetools'

export default defineConfig({
  plugins: [
    vue(),
    imagetools()
  ]
})
```

**Use WebP format:**
```vue
<picture>
  <source srcset="/img/hero.webp" type="image/webp">
  <img src="/img/hero.jpg" alt="Hero">
</picture>
```

### 10. Testing Best Practices

**Unit tests with Vitest:**
```bash
npm install -D vitest @vue/test-utils
```

**Component test:**
```javascript
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import MongoQueryPrompt from './MongoQueryPromptAuto.vue'

describe('MongoQueryPrompt', () => {
  it('renders properly', () => {
    const wrapper = mount(MongoQueryPrompt, {
      props: { title: 'Test' }
    })
    expect(wrapper.text()).toContain('Test')
  })
})
```

### 11. Security

**CSP Headers (vite-plugin-html)**
```javascript
import { createHtmlPlugin } from 'vite-plugin-html'

export default defineConfig({
  plugins: [
    createHtmlPlugin({
      inject: {
        data: {
          csp: "default-src 'self'; script-src 'self' 'unsafe-inline'"
        }
      }
    })
  ]
})
```

**Avoid v-html (XSS risk)**
```vue
<!-- ❌ Dangerous -->
<div v-html="userContent"></div>

<!-- ✅ Safe -->
<div>{{ userContent }}</div>
```

### 12. Monitoring & Analytics

**Error tracking:**
```javascript
// main.js
import * as Sentry from '@sentry/vue'

Sentry.init({
  app,
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE
})
```

**Performance monitoring:**
```javascript
// Track Core Web Vitals
import { onCLS, onFID, onLCP } from 'web-vitals'

onCLS(console.log)
onFID(console.log)
onLCP(console.log)
```

## Project-Specific Recommendations

### Current Project
1. ✅ Already using lazy loading for CodeMirror
2. ✅ Query caching implemented
3. ✅ Resource hints added
4. ⚠️ Consider extracting query cache to composable
5. ⚠️ Consider adding v-memo to expensive renders
6. ⚠️ Add unit tests with Vitest
7. ⚠️ Consider adding error boundary for CodeMirror

### Quick Wins
1. Add `optimizeDeps` to vite.config.js
2. Extract cache logic to composable
3. Add v-memo to query results
4. Add loading skeletons for better UX
5. Add error boundaries for third-party components

## Resources
- [Vue 3 Docs](https://vuejs.org/)
- [Vite Docs](https://vitejs.dev/)
- [Vue Performance](https://vuejs.org/guide/best-practices/performance.html)
- [Vite Performance](https://vitejs.dev/guide/performance.html)
