// src/types/api.ts
export interface User {
  id: string
  username: string
  name: string
  email: string
  role: 'applicant' | 'reviewer' | 'project_manager' | 'admin'
  department?: string
  title?: string
  research_field?: string
  phone?: string
  status: 'active' | 'inactive' | 'pending'
  last_login?: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  applicant_id: string
  project_code?: string
  title: string
  category: '基础研究' | '应用研究' | '技术开发' | '成果转化' | '平台建设' | '其他'
  research_field: string
  keywords?: string
  abstract: string
  background?: string
  objectives: string
  methodology?: string
  expected_outcomes?: string
  budget_total: number
  duration_months: number
  status:
    | 'draft'
    | 'submitted'
    | 'under_review'
    | 'approved'
    | 'rejected'
    | 'in_progress'
    | 'stage_review'
    | 'completed'
    | 'terminated'
  current_stage?: number
  submit_date?: string
  start_date?: string
  end_date?: string
  approval_date?: string
  completion_date?: string
  remarks?: string
  created_at: string
  updated_at: string
}

export interface ProjectBudget {
  id: string
  project_id: string
  category:
    | '设备费'
    | '材料费'
    | '测试费'
    | '差旅费'
    | '会议费'
    | '劳务费'
    | '专家咨询费'
    | '出版费'
    | '管理费'
    | '其他'
    | '总计'
  item_name: string
  description?: string
  amount: number
  justification?: string
  sequence?: number
  created_at: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id?: string
  name: string
  department?: string
  title?: string
  role: 'principal' | 'co_researcher' | 'research_assistant' | 'student' | 'other'
  responsibility?: string
  workload_percentage?: number
  join_date?: string
  leave_date?: string
  created_at: string
}

// API响应格式
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
// src/types/api.ts - 确保这个文件存在且语法正确
export interface ProjectAchievement {
  id?: string
  projectId: string
  achievementName: string
  type: string
  description?: string
  attachment?: string
  status: string
  createdAt?: string
  updatedAt?: string
}

export interface AchievementTransfer {
  id?: string
  achievementId: string
  transferType: string
  recipient?: string
  amount?: number
  contractNumber?: string
  status: string
  createdAt?: string
  updatedAt?: string
}
