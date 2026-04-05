// src/api/projects.ts
import axios from 'axios'
import type {
  Project,
  ProjectBudget,
  ProjectMember,
  ProjectStage,
  ExpenditureRecord,
  ProjectAchievement,
} from '@/types/api'

const API_BASE_URL = 'http://localhost:3002/api'

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

// 请求拦截器
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

// 响应拦截器
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
    console.error('Project API Error:', error.response?.data || error.message)
    return {
      success: false,
      error:
        error.response?.data?.message || error.response?.data?.error || error.message || '请求失败',
      status: error.response?.status,
    }
  },
)

export const projectAPI = {
  // ==================== 项目基础操作 ====================

  // 创建项目 - 统一使用复数形式
  async createProject(data: Partial<Project>) {
    const response = await axiosInstance.post('/projects', data)
    return response
  },

  // 更新项目 - 统一使用复数形式
  async updateProject(id: string, data: Partial<Project>) {
    const response = await axiosInstance.put(`/projects/${id}`, data)
    return response
  },

  // 获取项目详情 - 统一使用复数形式
  async getProject(id: string) {
    const response = await axiosInstance.get(`/projects/${id}`)
    return response
  },

  // 删除项目
  async deleteProject(id: string) {
    const response = await axiosInstance.delete(`/projects/${id}`)
    return response
  },

  // 提交项目
  async submitProject(id: string) {
    const response = await axiosInstance.put(`/projects/${id}`, { status: 'submitted' })
    return response
  },

  // 获取项目列表
  async getProjectsList(params?: {
    page?: number
    limit?: number
    status?: string
    search?: string
  }) {
    const queryParams = new URLSearchParams()
    if (params) {
      if (params.page) queryParams.append('page', params.page.toString())
      if (params.limit) queryParams.append('limit', params.limit.toString())
      if (params.status) queryParams.append('status', params.status)
      if (params.search) queryParams.append('search', params.search)
    }

    const queryString = queryParams.toString()
    const url = `/projects${queryString ? `?${queryString}` : ''}`

    const response = await axiosInstance.get(url)
    return response
  },

  // ==================== 项目进度相关 ====================

  // 获取项目进度总览（包含时间线、支出、成果等）
  async getProjectProgress(projectId: string) {
    const response = await axiosInstance.get(`/projects/${projectId}/progress`)
    return response
  },

  // 获取项目阶段
  async getProjectStages(projectId: string) {
    try {
      // 先尝试从进度API获取
      const progressResponse = await this.getProjectProgress(projectId)
      if (progressResponse.success && progressResponse.data?.stages) {
        return {
          success: true,
          data: progressResponse.data.stages,
        }
      }

      // 如果进度API没有阶段数据，尝试单独获取
      const response = await axiosInstance.get(`/projects/${projectId}/stages`)
      return response
    } catch (error) {
      console.warn('获取项目阶段失败，返回空数组')
      return {
        success: true,
        data: [],
      }
    }
  },

  // 创建项目阶段
  async createProjectStage(projectId: string, data: Partial<ProjectStage>) {
    const response = await axiosInstance.post(`/projects/${projectId}/stages`, data)
    return response
  },

  // 更新项目阶段
  async updateProjectStage(projectId: string, stageId: string, data: Partial<ProjectStage>) {
    const response = await axiosInstance.put(`/projects/${projectId}/stages/${stageId}`, data)
    return response
  },

  // ==================== 项目预算相关 ====================

  // 获取项目预算
  async getProjectBudgets(projectId: string) {
    try {
      // 从项目详情API获取预算
      const projectResponse = await this.getProject(projectId)
      if (projectResponse.success && projectResponse.data?.budgets) {
        return {
          success: true,
          data: projectResponse.data.budgets,
        }
      }

      // 如果项目详情没有预算数据，返回空数组
      console.warn('getProjectBudgets: 后端API尚未单独实现，从项目详情获取')
      return { success: true, data: [] }
    } catch (error) {
      console.warn('获取项目预算失败')
      return { success: true, data: [] }
    }
  },

  // 创建项目预算
  async createProjectBudgets(projectId: string, items: Partial<ProjectBudget>[]) {
    console.warn('createProjectBudgets: 后端API尚未单独实现')
    return { success: true, data: { projectId, items } }
  },

  // 更新项目预算
  async updateProjectBudgets(projectId: string, items: Partial<ProjectBudget>[]) {
    console.warn('updateProjectBudgets: 后端API尚未单独实现')
    return { success: true, data: { projectId, items } }
  },

  // ==================== 项目成员相关 ====================

  // 获取项目成员
  async getProjectMembers(projectId: string) {
    try {
      // 从项目详情API获取成员
      const projectResponse = await this.getProject(projectId)
      if (projectResponse.success && projectResponse.data?.members) {
        return {
          success: true,
          data: projectResponse.data.members,
        }
      }

      console.warn('getProjectMembers: 后端API尚未单独实现，从项目详情获取')
      return { success: true, data: [] }
    } catch (error) {
      console.warn('获取项目成员失败')
      return { success: true, data: [] }
    }
  },

  // 创建项目成员
  async createProjectMembers(projectId: string, members: Partial<ProjectMember>[]) {
    console.warn('createProjectMembers: 后端API尚未实现')
    return { success: true, data: { projectId, members } }
  },

  // 更新项目成员
  async updateProjectMembers(projectId: string, members: Partial<ProjectMember>[]) {
    console.warn('updateProjectMembers: 后端API尚未实现')
    return { success: true, data: { projectId, members } }
  },

  // ==================== 经费支出相关 ====================

  // 获取经费支出记录
  async getProjectExpenditures(projectId: string) {
    try {
      // 从进度API获取支出记录
      const progressResponse = await this.getProjectProgress(projectId)
      if (progressResponse.success && progressResponse.data?.expenditures) {
        return {
          success: true,
          data: progressResponse.data.expenditures,
        }
      }

      console.warn('getProjectExpenditures: 从进度API获取失败')
      return { success: true, data: [] }
    } catch (error) {
      console.warn('获取经费支出失败')
      return { success: true, data: [] }
    }
  },

  // ==================== 项目成果相关 ====================

  // 获取项目成果
  async getProjectAchievements(projectId: string) {
    try {
      // 从进度API获取成果
      const progressResponse = await this.getProjectProgress(projectId)
      if (progressResponse.success && progressResponse.data?.achievements) {
        return {
          success: true,
          data: progressResponse.data.achievements,
        }
      }

      console.warn('getProjectAchievements: 从进度API获取失败')
      return { success: true, data: [] }
    } catch (error) {
      console.warn('获取项目成果失败')
      return { success: true, data: [] }
    }
  },

  // ==================== 其他API ====================

  // 获取项目通知
  async getProjectNotifications(projectId: string) {
    try {
      // 从进度API获取通知
      const progressResponse = await this.getProjectProgress(projectId)
      if (progressResponse.success && progressResponse.data?.notifications) {
        return {
          success: true,
          data: progressResponse.data.notifications,
        }
      }

      return { success: true, data: [] }
    } catch (error) {
      return { success: true, data: [] }
    }
  },

  // 获取项目预算摘要
  async getProjectBudgetSummary(projectId: string) {
    try {
      // 从进度API获取预算摘要
      const progressResponse = await this.getProjectProgress(projectId)
      if (progressResponse.success && progressResponse.data?.budget_summary) {
        return {
          success: true,
          data: progressResponse.data.budget_summary,
        }
      }

      return {
        success: true,
        data: { total: 0, used: 0, balance: 0 },
      }
    } catch (error) {
      return {
        success: true,
        data: { total: 0, used: 0, balance: 0 },
      }
    }
  },

  // ==================== 测试API ====================

  // 测试数据库连接
  async testDatabase() {
    const response = await axiosInstance.get('/db/test')
    return response
  },

  // 测试认证
  async testAuth() {
    const response = await axiosInstance.get('/auth/profile')
    return response
  },
}
