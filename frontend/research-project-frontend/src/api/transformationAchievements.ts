import axios from 'axios'
import { getApiBaseUrl } from '@/utils/request'

const api = axios.create({ baseURL: getApiBaseUrl(), timeout: 30000 })
api.interceptors.request.use((c) => {
  const t = localStorage.getItem('token')
  if (t) c.headers.Authorization = `Bearer ${t}`
  return c
})
api.interceptors.response.use(
  (r) => (r.data?.success !== undefined ? r.data : { success: true, data: r.data }),
  (e) => Promise.reject(new Error(e.response?.data?.error || e.message)),
)

export const TRANSFORM_METHODS = [
  { value: 'tech_license', label: '技术许可' },
  { value: 'tech_transfer', label: '技术转让' },
  { value: 'equity_investment', label: '作价投资' },
  { value: 'startup_company', label: '创办企业' },
]

export const transformationAchievementAPI = {
  getEligibleProjects: () => api.get('/transformation-achievements/eligible-projects'),
  list: (params?: Record<string, unknown>) => api.get('/transformation-achievements', { params }),
  get: (id: string) => api.get(`/transformation-achievements/${id}`),
  create: (data: Record<string, unknown>) => api.post('/transformation-achievements', data),
  uploadFile: async (achievementId: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('achievement_id', achievementId)
    const token = localStorage.getItem('token')
    const res = await fetch(`${getApiBaseUrl()}/transformation-achievements/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    })
    return res.json()
  },
}

export const assistantTransformationAPI = {
  list: (params?: Record<string, unknown>) => api.get('/assistant/transformation-achievements/list', { params }),
  review: (id: string, data: { recommendation: string; comment: string }) =>
    api.post(`/assistant/transformation-achievements/${id}/review`, data),
}
