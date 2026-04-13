// src/utils/request.js
import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

// 未配置 VITE_API_BASE_URL 时：开发仍连本机 3002；生产构建后与当前页面同域（避免打成 localhost）
function defaultApiOrigin() {
  if (import.meta.env.DEV) return 'http://localhost:3002'
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin
  return 'http://localhost:3002'
}

// 统一为「主机 + 端口」，路径里自带 /api/...，避免出现 /api/api/... 导致 404
function normalizeApiBaseUrl(raw) {
  const fallback = defaultApiOrigin()
  if (!raw || typeof raw !== 'string' || !String(raw).trim()) return fallback
  let u = raw.trim().replace(/\/+$/, '')
  if (u.toLowerCase().endsWith('/api')) {
    u = u.slice(0, -4)
  }
  return u || fallback
}

/**
 * 生产环境：若页面用 IP/域名访问，但构建产物里仍打进 localhost:3002，则强制用当前站点 origin，
 * 避免「环境变量文件对了、旧 JS 仍连 localhost」导致注册失败。
 */
function resolveApiOrigin() {
  if (import.meta.env.DEV) {
    return normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL)
  }
  const raw = String(import.meta.env.VITE_API_BASE_URL ?? '').trim()
  // 生产：用户用真实 IP/域名打开页面时，只要未配置独立 API 域名，或 env 仍指向环回地址，一律与页面同源（配合 Nginx 反代 /api），避免旧构建或错误 env 仍请求 localhost:3002
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    const pageIsRealHost = host !== 'localhost' && host !== '127.0.0.1'
    if (pageIsRealHost) {
      if (!raw || /localhost|127\.0\.0\.1/.test(raw)) {
        return window.location.origin
      }
      return normalizeApiBaseUrl(raw)
    }
  }
  const base = raw ? normalizeApiBaseUrl(raw) : defaultApiOrigin()
  if (typeof window !== 'undefined') {
    const bakedPointsToLoopback =
      base.includes('localhost') || base.includes('127.0.0.1')
    const pageIsRealHost =
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    if (bakedPointsToLoopback && pageIsRealHost) {
      return window.location.origin
    }
  }
  return base
}

// 创建 axios 实例（每次请求拦截器会再次 resolve，防止旧缓存 JS）
const service = axios.create({
  baseURL: resolveApiOrigin(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器：只从 localStorage 取 token
service.interceptors.request.use(
  (config) => {
    if (!import.meta.env.DEV) {
      config.baseURL = resolveApiOrigin()
    }
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

/** 后端根地址（不含 /api） */
export function getApiOrigin() {
  return resolveApiOrigin()
}

/** 含 /api 前缀，如 http://host:port/api */
export function getApiBaseUrl() {
  return `${getApiOrigin()}/api`
}

export { normalizeApiBaseUrl }
export default service
