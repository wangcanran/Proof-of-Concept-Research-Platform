// src/api/dashboard.js
import api from './index'

// 仪表板API
export const dashboardAPI = {
  // 获取仪表板数据（根据用户角色）
  getDashboardData(role) {
    const endpoints = {
      APPLICANT: '/api/dashboard/applicant',
      REVIEWER: '/api/dashboard/reviewer',
      ASSISTANT: '/api/dashboard/assistant',
      ADMIN: '/api/dashboard/admin',
    }

    const endpoint = endpoints[role] || '/api/dashboard'
    return api.get(endpoint)
  },

  // 获取申请人的仪表板数据
  getApplicantDashboard() {
    return api.get('/api/dashboard/applicant')
  },

  // 获取评审专家的仪表板数据
  getReviewerDashboard() {
    return api.get('/api/dashboard/reviewer')
  },

  // 获取科研助理的仪表板数据
  getAssistantDashboard() {
    return api.get('/api/dashboard/assistant')
  },

  // 获取管理员的仪表板数据
  getAdminDashboard() {
    return api.get('/api/dashboard/admin')
  },

  // 获取统计数据
  getStatistics() {
    return api.get('/api/stats')
  },

  // 获取最近活动
  getRecentActivities(limit = 10) {
    return api.get('/api/activities', { params: { limit } })
  },

  // 获取待办事项
  getPendingTasks() {
    return api.get('/api/tasks/pending')
  },

  // 获取通知数量
  getNotificationCount() {
    return api.get('/api/notifications/count')
  },
}
