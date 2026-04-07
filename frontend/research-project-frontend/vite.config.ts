// vite.config.ts
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3000, // 前端端口保持3000
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3002', // 与 research_api.js 默认端口一致
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, '') // 如果后端API不需要/api前缀，去掉这行
      },
    },
  },
})
