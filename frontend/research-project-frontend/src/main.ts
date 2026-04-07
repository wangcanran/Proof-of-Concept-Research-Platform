// main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/workbench-element.css'

console.log('🔧 开始初始化应用...')

// 简化版全局错误处理 - 避免复杂的字符串操作
const setupGlobalErrorHandling = () => {
  const originalConsoleError = console.error

  console.error = function (...args: any[]) {
    try {
      // 简化调用，避免 apply 可能的问题
      originalConsoleError(...args)
    } catch (e) {
      // 如果连最基本的 console.error 都失败，使用 alert
      alert('控制台错误输出失败: ' + String(e))
    }

    // 检查是否是路由相关的语法错误
    args.forEach((arg) => {
      if (typeof arg === 'string' && arg.includes('SyntaxError')) {
        console.warn('⚠️ 检测到语法错误，请检查组件文件')
      }
    })
  }
}

// 立即设置错误处理
setupGlobalErrorHandling()

// 创建应用
const app = createApp(App)

// 配置 Pinia
try {
  const pinia = createPinia()
  app.use(pinia)
  console.log('✅ Pinia 配置成功')
} catch (error) {
  console.error('❌ Pinia 配置失败:', error)
}

// 配置 Element Plus
try {
  app.use(ElementPlus)
  console.log('✅ Element Plus 配置成功')
} catch (error) {
  console.error('❌ Element Plus 配置失败:', error)
}

// 配置路由 - 添加额外的错误处理
try {
  app.use(router)
  console.log('✅ 路由配置成功')
} catch (error) {
  console.error('❌ 路由配置失败:', error)

  // 创建紧急回退路由
  const { createRouter, createWebHistory } = require('vue-router')
  const emergencyRouter = createRouter({
    history: createWebHistory(),
    routes: [
      {
        path: '/',
        component: { template: '<div>紧急模式: 路由系统故障</div>' },
      },
    ],
  })
  app.use(emergencyRouter)
}

// Vue 错误处理器
app.config.errorHandler = (err: any, instance, info) => {
  console.error('Vue 错误捕获:')
  console.error('- 错误:', err?.message || err)
  console.error('- 组件:', instance?.$options?.name || '未知')
  console.error('- 信息:', info)
}

// 尝试挂载应用
try {
  app.mount('#app')
  console.log('✅ 应用挂载成功')
} catch (error) {
  console.error('❌ 应用挂载失败:', error)

  // 显示紧急界面
  const appContainer = document.getElementById('app')
  if (appContainer) {
    appContainer.innerHTML = `
      <div style="padding: 40px; text-align: center;">
        <h1 style="color: #f56c6c;">应用启动失败</h1>
        <p>${error?.message || '未知错误'}</p>
        <button onclick="location.reload()" style="padding: 10px 20px; background: #1890ff; color: white; border: none; border-radius: 4px; cursor: pointer;">
          刷新页面
        </button>
        <div style="margin-top: 20px; text-align: left; background: #f5f5f5; padding: 10px; border-radius: 4px;">
          <h3>调试信息:</h3>
          <pre>${JSON.stringify(
            {
              error: error?.message,
              timestamp: new Date().toISOString(),
            },
            null,
            2,
          )}</pre>
        </div>
      </div>
    `
  }
}

console.log('🎉 应用初始化完成')
