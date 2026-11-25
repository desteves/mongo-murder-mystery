import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';

const isProd = process.env.NODE_ENV === 'production';

// Inline the (small) entry stylesheet into index.html: a render-blocking request for ~12 kB costs more than the bytes.
function inlineEntryCss() {
  return {
    name: 'inline-entry-css',
    enforce: 'post',
    apply: 'build',
    generateBundle(_, bundle) {
      const html = bundle['index.html'];
      if (!html || html.type !== 'asset') return;
      let source = String(html.source);
      for (const [name, asset] of Object.entries(bundle)) {
        if (asset.type !== 'asset' || !/^assets\/index-.*\.css$/.test(name)) continue;
        const link = new RegExp(`<link[^>]*rel="stylesheet"[^>]*href="[^"]*${name.split('/').pop()}"[^>]*>`);
        if (link.test(source)) {
          source = source.replace(link, () => `<style>${asset.source}</style>`);
          delete bundle[name];
        }
      }
      html.source = source;
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 8080,
    open: false, // Don't auto-open browser
    cors: true
  },
  preview: {
    port: 8080,
    strictPort: true
  },
  plugins: [
    vue({
      script: {
        defineModel: true, // Enable defineModel macro
        propsDestructure: true // Enable props destructuring
      }
    }),
    !isProd && vueDevTools(),
    inlineEntryCss(),
  ].filter(Boolean),
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ['vue', 'vue-router', 'axios', 'prismjs'],
    exclude: ['@codemirror/autocomplete', '@codemirror/basic-setup', '@codemirror/lang-javascript', '@codemirror/language']
  },
  // server: {
  //   proxy: {
  //     // This will proxy requests from `/eval` to the target server
  //     '/api': {
  //       target: 'http://localhost:3000',
  //       changeOrigin: true,
  //       rewrite: (path) => path.replace(/^\/api/, ''),
  //     },
  //   },
  // },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    sourcemap: false,
    target: 'es2022', // Modern browsers only: no legacy transforms or polyfills
    minify: 'esbuild',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    assetsInlineLimit: 4096, // Inline assets < 4KB as base64
    cssMinify: 'esbuild', // Use esbuild for CSS minification (faster)
    rollupOptions: {
      output: {
        // Better chunking strategy for optimal caching
        manualChunks(id) {
          if (id.includes('node_modules/vue') || id.includes('node_modules/vue-router')) {
            return 'vendor-vue';
          }
          if (id.includes('node_modules/codemirror') || id.includes('node_modules/@codemirror')) {
            return 'vendor-editor';
          }
          // Keep prismjs in main bundle to ensure proper initialization order
          if (id.includes('node_modules/axios')) {
            return 'vendor-utils';
          }
        },
        // Better file naming for cache busting
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Enable compression reporting
    reportCompressedSize: true
  },
  esbuild: isProd ? {
    drop: ['console', 'debugger'],
    legalComments: 'none' // Remove comments in production
  } : undefined
});
