// src/types/user.ts
export interface User {
  id: number
  username: string
  email: string
  role: 'applicant' | 'reviewer' | 'admin' | 'project_manager'
  status: 'active' | 'inactive'
  created_at: string
  last_login?: string
}

export interface UserForm {
  username: string
  password: string
  email: string
  role: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  total?: number
  message?: string
}

export interface PaginationParams {
  page: number
  limit: number
  search?: string
  role?: string
  sort?: string
  order?: 'asc' | 'desc'
}
