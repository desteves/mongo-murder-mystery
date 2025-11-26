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
    target: 'es2019',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'axios']
        }
      }
    }
  },
  esbuild: isProd ? { drop: ['console', 'debugger'] } : undefined
});
