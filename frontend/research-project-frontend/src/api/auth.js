// src/api/auth.js
import api from './index'

// 用户认证相关API
export const authAPI = {
  // 用户登录
  login(data) {
    return api.post('/api/auth/login', data)
  },

  // 用户注册
  register(data) {
    return api.post('/api/auth/register', data)
  },

  // 获取当前用户信息
  getProfile() {
    return api.get('/api/auth/profile')
  },

  // 刷新token
  refreshToken() {
    return api.post('/api/auth/refresh')
  },

  // 退出登录
  logout() {
    return api.post('/api/auth/logout')
  },

  // 修改密码
  changePassword(data) {
    return api.post('/api/auth/change-password', data)
  },

  // 忘记密码
  forgotPassword(email) {
    return api.post('/api/auth/forgot-password', { email })
  },

  // 重置密码
  resetPassword(data) {
    return api.post('/api/auth/reset-password', data)
  },
}
// 添加命名导出（兼容现有代码）
export const login = (data) => authAPI.login(data)
export const register = (data) => authAPI.register(data)
export const getProfile = () => authAPI.getProfile()
export const logout = () => authAPI.logout()
export const changePassword = (data) => authAPI.changePassword(data)
// 测试数据库连接
export const testDatabase = {
  // 测试连接
  testConnection() {
    return api.get('/api/db/test')
  },

  // 获取所有表
  getTables() {
    return api.get('/api/tables')
  },

  // 获取表数据
  getTableData(tableName, params = {}) {
    return api.get(`/api/table/${tableName}`, { params })
  },

  // 获取统计信息
  getStats() {
    return api.get('/api/stats')
  },

  // 搜索
  search(params) {
    return api.get('/api/search', { params })
  },
}
