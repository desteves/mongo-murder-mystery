import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';

const isProd = process.env.NODE_ENV === 'production';

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 8080
  },
  plugins: [
    vue(),
    !isProd && vueDevTools(),
  ].filter(Boolean),
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
    target: 'es2020', // Modern browsers only
    minify: 'esbuild',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Better chunking strategy for optimal caching
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router'],
          'vendor-editor': ['codemirror', '@codemirror/autocomplete', '@codemirror/lang-javascript', '@codemirror/language', '@codemirror/basic-setup'],
          'vendor-utils': ['axios', 'prismjs']
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
