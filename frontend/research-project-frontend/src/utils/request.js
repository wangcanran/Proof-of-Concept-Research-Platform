// src/utils/request.js
import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

// 统一为「主机 + 端口」，路径里自带 /api/...，避免出现 /api/api/... 导致 404
function normalizeApiBaseUrl(raw) {
  const fallback = 'http://localhost:3002'
  if (!raw || typeof raw !== 'string') return fallback
  let u = raw.trim().replace(/\/+$/, '')
  if (u.toLowerCase().endsWith('/api')) {
    u = u.slice(0, -4)
  }
  return u || fallback
}

// 创建 axios 实例
const service = axios.create({
  baseURL: normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器：只从 localStorage 取 token
service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    console.log('📤 请求发送:', config.method, config.url)
    return config
  },
  (error) => Promise.reject(error),
)

// 响应拦截器：只处理 HTTP 状态
service.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    const status = error.response?.status
    const url = error.config?.url

    console.error('❌ 请求失败:', status, url)

    if (status === 401) {
      if ((url && url.includes('/auth')) || url.includes('/login')) {
        localStorage.clear()
        router.push('/login')
        ElMessage.error('登录已失效，请重新登录')
      } else {
        ElMessage.error('身份验证失败，请重试')
      }
    } else if (status === 404) {
      //ElMessage.error(`接口不存在: ${url}`)
    } else if (status === 500) {
      console.error('服务器返回内容:', error.response.data)
      //ElMessage.error(`服务器内部错误: ${error.response.data?.message || '未知原因'}`)
    } else {
      ElMessage.error(error.message || '网络错误')
    }

    return Promise.reject(error)
  },
)

export { normalizeApiBaseUrl }
export default service
