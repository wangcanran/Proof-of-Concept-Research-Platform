// src/api/users.ts
import axios from 'axios'
import { getApiBaseUrl } from '@/utils/request'

const API_BASE_URL = getApiBaseUrl()

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

axiosInstance.interceptors.response.use(
  (response) => {
    // 如果后端返回的是统一格式 { success, data, message }
    if (response.data && typeof response.data.success === 'boolean') {
      return response.data
    }
    // 否则包装成统一格式
    return {
      success: true,
      data: response.data,
    }
  },
  (error) => {
    console.error('User API Error:', error.response?.data || error.message)
    return {
      success: false,
      error: error.response?.data?.message || error.message || '请求失败',
    }
  },
)

export const userAPI = {
  // 获取当前用户信息 - 使用正确的API路径
  async getCurrentUser() {
    const response = await axiosInstance.get('/auth/profile') // 改为 /auth/profile
    return response
  },

  // 搜索用户
  async searchUsers(query: string) {
    const response = await axiosInstance.get('/user', { params: { search: query } })
    return response
  },

  // 更新用户信息
  async updateUser(id: string, data: any) {
    const response = await axiosInstance.put(`/user/${id}`, data)
    return response
  },

  // 获取用户统计
  async getUserStats() {
    const response = await axiosInstance.get('/stats')
    return response
  },
}
