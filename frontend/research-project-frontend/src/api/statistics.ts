// src/api/statistics.ts
import api from './index'
import { getApiOrigin } from '@/utils/request'

// 统计数据类型定义
export interface AchievementSummary {
  total: number
  approved: number
  pending: number
  rejected: number
  approvalRate: number
  growthRate: number
  totalCompare: number
  approvedCompare: number
  pendingCompare: number
  rateCompare: number
  startDate?: string
  endDate?: string
}

export interface DistributionData {
  type: string
  label: string
  count: number
  percentage: number
}

export interface TrendData {
  date: string
  total: number
  approved: number
  pending: number
  rejected: number
  rate: number
}

export interface RankData {
  id: string
  name: string
  project_code?: string
  count: number
  approved_count?: number
  rate: number
}

export interface DetailedData {
  type: string
  type_label: string
  total: number
  approved: number
  pending: number
  rejected: number
  approval_rate: number
  avg_review_time: number
  trend: number
}

export interface ProjectOption {
  id: string
  name: string
  code: string
}

export interface FilterParams {
  period?: string
  start_date?: string
  end_date?: string
  dimension?: string
  project_ids?: string
  types?: string[]
  statuses?: string[]
  sort_by?: string
}

// 构建查询参数
const buildQueryParams = (params: FilterParams): URLSearchParams => {
  const queryParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          queryParams.append(key, value.join(','))
        }
      } else {
        queryParams.append(key, value.toString())
      }
    }
  })

  return queryParams
}

// 统计API
export const statisticsAPI = {
  // 获取成果统计摘要
  async getAchievementSummary(params: FilterParams) {
    const queryParams = buildQueryParams(params)
    const queryString = queryParams.toString()
    const url = `/api/reports/achievements/summary${queryString ? `?${queryString}` : ''}`

    return api.get<{
      success: boolean
      data: {
        summary: AchievementSummary
        timeRange: {
          start: string
          end: string
          period: string
        }
      }
    }>(url)
  },

  // 获取成果分布数据
  async getAchievementDistribution(params: FilterParams) {
    const queryParams = buildQueryParams(params)
    const queryString = queryParams.toString()
    const url = `/api/reports/achievements/distribution${queryString ? `?${queryString}` : ''}`

    return api.get<{
      success: boolean
      data: DistributionData[]
      dimension: string
      total: number
    }>(url)
  },

  // 获取成果趋势数据
  async getAchievementTrend(period: number = 30, groupBy: string = 'day') {
    return api.get<{
      success: boolean
      data: TrendData[]
      period: number
      group_by: string
    }>(`/api/reports/achievements/trend?period=${period}&group_by=${groupBy}`)
  },

  // 获取项目成果排名
  async getProjectRanking(limit: number = 10, orderBy: string = 'count') {
    return api.get<{
      success: boolean
      data: RankData[]
      limit: number
      order_by: string
    }>(`/api/reports/projects/ranking?limit=${limit}&order_by=${orderBy}`)
  },

  // 获取详细统计表格数据
  async getDetailedStatistics(
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'total',
    sortOrder: string = 'desc',
    start_date?: string,
    end_date?: string,
  ) {
    const params: Record<string, any> = {
      page,
      limit,
      sort_by: sortBy,
      sort_order: sortOrder,
    }

    if (start_date) params.start_date = start_date
    if (end_date) params.end_date = end_date

    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      queryParams.append(key, value.toString())
    })

    return api.get<{
      success: boolean
      data: {
        table_data: DetailedData[]
        summary: {
          avg_approval_rate: number
          avg_review_time: number
          total_items: number
        }
        pagination: {
          page: number
          limit: number
          total: number
          pages: number
        }
      }
    }>(`/api/reports/achievements/detailed?${queryParams.toString()}`)
  },

  // 导出报表数据
  async exportReport(reportType: string = 'achievements', filters: Record<string, any> = {}) {
    const queryParams = new URLSearchParams()
    queryParams.append('report_type', reportType)

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString())
      }
    })

    return api.get<{
      success: boolean
      data: any[]
      filename: string
      count: number
    }>(`/api/reports/export?${queryParams.toString()}`)
  },

  // 获取项目列表（用于筛选）
  async getProjectsForFilter() {
    return api.get<{
      success: boolean
      data: Array<{ id: string; title: string; project_code: string }>
    }>('/api/projects')
  },

  // 获取支出统计
  async getExpenditureStats() {
    return api.get<{
      success: boolean
      data: {
        total_expenditure: number
        pending_amount: number
        pending_count: number
        approved_amount: number
        approved_count: number
        avg_amount: number
        total_trend: number
      }
    }>('/api/expenditures/stats')
  },

  // 获取支出分类统计
  async getExpenditureCategoryStats() {
    return api.get<{
      success: boolean
      data: Array<{
        category: string
        count: number
        total_amount: number
        percentage: number
      }>
    }>('/api/expenditures/category-stats')
  },

  // 获取预算统计
  async getFundingStats() {
    return api.get<{
      success: boolean
      data: {
        total_budget: number
        used_amount: number
        available_balance: number
        used_percentage: number
        pending_applications: number
        pending_reimbursements: number
      }
    }>('/api/funding/stats')
  },

  // 获取预算分类统计
  async getBudgetCategoryStats(project_id?: string) {
    const params: Record<string, any> = {}
    if (project_id) params.project_id = project_id

    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      queryParams.append(key, value.toString())
    })

    const queryString = queryParams.toString()
    const url = `/api/budget/categories${queryString ? `?${queryString}` : ''}`

    return api.get<{
      success: boolean
      data: Array<{
        id: string
        name: string
        budget: number
        used: number
        balance: number
        percentage: number
        status: string
        record_count: number
        draft_amount: number
        submitted_amount: number
      }>
    }>(url)
  },
}

// 通用API配置
export const API_CONFIG = {
  baseURL: getApiOrigin(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
}
