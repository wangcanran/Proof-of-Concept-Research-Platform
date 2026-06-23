// src/api/achievements.ts
import axios from 'axios'
import { getApiBaseUrl } from '@/utils/request'

const API_BASE_URL = getApiBaseUrl()

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

axiosInstance.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data.success === 'boolean') {
      return response.data
    }
    return { success: true, data: response.data }
  },
  (error) => {
    const message =
      error.response?.data?.error || error.response?.data?.message || error.message || '请求失败'
    return Promise.reject(new Error(message))
  },
)

export interface AchievementFile {
  id: string
  achievement_id?: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  sort_order?: number
  uploaded_by?: string
  created_at?: string
}

export interface Achievement {
  id: string
  title: string
  type: string
  project_id: string
  project?: {
    id: string
    title: string
    project_code: string
  }
  abstract?: string
  content?: string
  description?: string
  status: 'draft' | 'submitted' | 'verified' | 'rejected'
  achievement_date: string
  created_by: string
  created_by_name?: string
  verified_by?: string
  verified_date?: string
  verification_comment?: string
  created_at: string
  updated_at?: string
  files?: AchievementFile[]
  file_count?: number
}

export interface CreateAchievementData {
  type: string
  title: string
  project_id: string
  description?: string
  abstract?: string
  content?: string
  keywords?: string
  status?: string
  achievement_date: string
  authors?: string
  external_link?: string
}

export interface UpdateAchievementData extends Partial<CreateAchievementData> {}

export interface AchievementQueryParams {
  page?: number
  limit?: number
  search?: string
  type?: string
  status?: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
  total?: number
  page?: number
  limit?: number
}

function formatAchievementPayload(data: Partial<CreateAchievementData>) {
  const formatted = { ...data }
  if (Array.isArray(formatted.authors)) {
    formatted.authors = JSON.stringify(formatted.authors)
  } else if (formatted.authors && typeof formatted.authors === 'string' && !formatted.authors.startsWith('[')) {
    const authorsArray = formatted.authors
      .split(/[,，;；]/)
      .map((a) => a.trim())
      .filter(Boolean)
    formatted.authors = JSON.stringify(authorsArray)
  }
  return formatted
}

export const achievementAPI = {
  async getAchievements(params?: AchievementQueryParams): Promise<ApiResponse<Achievement[]>> {
    return axiosInstance.get('/achievements', { params }) as Promise<ApiResponse<Achievement[]>>
  },

  async getAchievement(id: string): Promise<ApiResponse<Achievement>> {
    return axiosInstance.get(`/achievements/${id}`) as Promise<ApiResponse<Achievement>>
  },

  async createAchievement(data: CreateAchievementData): Promise<ApiResponse<Achievement>> {
    return axiosInstance.post('/achievements', formatAchievementPayload(data)) as Promise<
      ApiResponse<Achievement>
    >
  },

  async updateAchievement(
    id: string,
    data: UpdateAchievementData,
  ): Promise<ApiResponse<Achievement>> {
    return axiosInstance.put(`/achievements/${id}`, formatAchievementPayload(data)) as Promise<
      ApiResponse<Achievement>
    >
  },

  async deleteAchievement(id: string): Promise<ApiResponse<void>> {
    return axiosInstance.delete(`/achievements/${id}`) as Promise<ApiResponse<void>>
  },

  async submitForReview(id: string): Promise<ApiResponse> {
    return axiosInstance.post(`/achievements/${id}/submit`) as Promise<ApiResponse>
  },

  async uploadFile(achievementId: string, file: File): Promise<ApiResponse<AchievementFile>> {
    const token = localStorage.getItem('token')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('achievement_id', achievementId)

    const response = await fetch(`${API_BASE_URL}/achievements/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    const data = await response.json()
    if (!response.ok || data.success === false) {
      throw new Error(data.error || data.message || '附件上传失败')
    }
    return data
  },

  async deleteFile(fileId: string): Promise<ApiResponse<void>> {
    return axiosInstance.delete(`/achievements/files/${fileId}`) as Promise<ApiResponse<void>>
  },

  async getStatistics(): Promise<ApiResponse<unknown>> {
    return axiosInstance.get('/achievements/stats') as Promise<ApiResponse<unknown>>
  },
}
