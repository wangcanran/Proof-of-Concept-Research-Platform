// src/api/index.js
import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

// 创建axios实例
const api = axios.create({
  baseURL: 'http://localhost:3002', // 指向我们刚创建的后端API
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // 添加请求时间戳防止缓存
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
      }
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    console.error('API 错误详情:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      hasToken: !!localStorage.getItem('token'),
    })

    if (!error.response) {
      ElMessage.error('网络连接失败，请检查网络')
      return Promise.reject(error)
    }

    const { status, data } = error.response

    // 只在首次遇到 401 时处理，避免重复跳转
    if (status === 401 && !window.isHandling401) {
      window.isHandling401 = true

      console.log('检测到 401 错误，处理认证过期')

      // 显示提示
      ElMessage.error('登录状态已过期，请重新登录')

      // 统一清理所有用户相关数据
      const userDataItems = ['token', 'refreshToken', 'userInfo', 'userId', 'userRole', 'userName']

      userDataItems.forEach((item) => {
        localStorage.removeItem(item)
      })

      // 清除 sessionStorage 中的用户数据
      sessionStorage.clear()

      // 设置标记防止重复处理
      localStorage.setItem('sessionExpired', 'true')

      // 延迟跳转，避免立即重定向导致页面闪烁
      setTimeout(() => {
        // 跳转到登录页
        router.replace({
          path: '/login',
          query: {
            reason: 'session_expired',
          },
        })

        // 重置处理标记
        setTimeout(() => {
          window.isHandling401 = false
        }, 1000)
      }, 1000)
    } else if (status === 403) {
      ElMessage.error('权限不足，无法访问')
    } else if (status >= 500) {
      ElMessage.error('服务器错误，请稍后重试')
    } else {
      const message = data?.message || '请求失败'
      ElMessage.error(message)
    }

    return Promise.reject(error)
  },
)

// 导出axios实例
export default api

// 通用CRUD操作
export const crud = {
  // 获取列表
  list(resource, params = {}) {
    return api.get(`/api/${resource}`, { params })
  },

  // 获取单个
  get(resource, id) {
    return api.get(`/api/${resource}/${id}`)
  },

  // 创建
  create(resource, data) {
    return api.post(`/api/${resource}`, data)
  },

  // 更新
  update(resource, id, data) {
    return api.put(`/api/${resource}/${id}`, data)
  },

  // 删除
  delete(resource, id) {
    return api.delete(`/api/${resource}/${id}`)
  },

  // 批量操作
  batch(resource, action, data) {
    return api.post(`/api/${resource}/batch/${action}`, data)
  },
}
