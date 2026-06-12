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

  // 更新个人资料
  updateProfile(data) {
    return api.put('/api/auth/profile', data)
  },

  // 专家擅长领域
  updateExpertDomains(domainIds) {
    return api.put('/api/auth/expert-domains', { domain_ids: domainIds })
  },

  // 专家类型（技术 / 投资 / 产业）
  updateExpertTypes(expertTypes) {
    return api.put('/api/auth/expert-types', { expert_types: expertTypes })
  },

  // 研究领域字典
  getResearchDomains() {
    return api.get('/api/research-domains')
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
export const updateProfile = (data) => authAPI.updateProfile(data)
export const updateExpertDomains = (domainIds) => authAPI.updateExpertDomains(domainIds)
export const updateExpertTypes = (expertTypes) => authAPI.updateExpertTypes(expertTypes)
export const getResearchDomains = () => authAPI.getResearchDomains()
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
