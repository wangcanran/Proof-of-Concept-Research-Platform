// src/api/funding.ts - 修正版本
import api from './index'

// 经费管理API
export const fundingAPI = {
  // ⭐⭐⭐ 添加这个缺失的方法 ⭐⭐⭐
  // 获取经费统计
  getFundingStats() {
    return api.get('/api/funding/stats')
  },

  // 获取支出记录
  getExpenditures(params = {}) {
    // 构建查询字符串
    const queryString = new URLSearchParams(params).toString()
    return api.get(`/api/expenditures${queryString ? '?' + queryString : ''}`)
  },

  // 获取预算分类
  getBudgetCategories(params = {}) {
    const queryString = new URLSearchParams(params).toString()
    return api.get(`/api/budget/categories${queryString ? '?' + queryString : ''}`)
  },

  // 获取预算执行情况
  getBudgetExecution() {
    return api.get('/api/budget/execution')
  },

  // 获取支出趋势
  getExpenditureTrend(params = {}) {
    const queryString = new URLSearchParams(params).toString()
    return api.get(`/api/expenditures/trend${queryString ? '?' + queryString : ''}`)
  },

  // 获取用户的项目列表（用于调试）
  getUserProjects() {
    return api.get('/api/projects')
  },

  // 获取预算列表
  getBudgets(params = {}) {
    const queryString = new URLSearchParams(params).toString()
    return api.get(`/api/budgets${queryString ? '?' + queryString : ''}`)
  },

  // 项目支出统计
  getProjectExpenditureStats(projectId: string) {
    return api.get(`/api/projects/${projectId}/expenditure-stats`)
  },

  // 获取项目预算详情
  getProjectBudgets(projectId: string) {
    return api.get(`/api/projects/${projectId}/budgets`)
  },

  // 提交支出申请
  submitExpenditure(expenditureId: string) {
    return api.post(`/api/expenditures/${expenditureId}/submit`)
  },

  // 审核支出申请
  reviewExpenditure(expenditureId: string, data: { action: string; reason?: string }) {
    return api.post(`/api/expenditures/${expenditureId}/review`, data)
  },

  // 标记为已支付
  markExpenditureAsPaid(expenditureId: string) {
    return api.post(`/api/expenditures/${expenditureId}/mark-paid`)
  },

  // 取消支出申请
  cancelExpenditure(expenditureId: string) {
    return api.post(`/api/expenditures/${expenditureId}/cancel`)
  },

  // 删除支出记录
  deleteExpenditure(expenditureId: string) {
    return api.delete(`/api/expenditures/${expenditureId}`)
  },

  // 创建支出记录
  createExpenditure(data: any) {
    return api.post('/api/expenditures', data)
  },

  // 获取支出统计
  getExpenditureStats() {
    return api.get('/api/expenditures/stats')
  },

  // 获取支出分类统计
  getExpenditureCategoryStats() {
    return api.get('/api/expenditures/category-stats')
  },
}
