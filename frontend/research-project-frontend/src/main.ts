// main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/index.scss'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/workbench-element.css'

// 创建应用
const app = createApp(App)

// 配置 Pinia
const pinia = createPinia()
app.use(pinia)

// 配置 Element Plus
app.use(ElementPlus)

// 配置路由
app.use(router)

// Vue 错误处理器
app.config.errorHandler = (err: any, instance, info) => {
  console.error('Vue 错误捕获:', err?.message || err)
}

// 挂载应用
app.mount('#app')
