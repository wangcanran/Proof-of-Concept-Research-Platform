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

export const ENTERPRISE_ACHIEVEMENT_TYPES = [
  { value: 'tech_cooperation', label: '技术合作' },
  { value: 'qualification_certification', label: '资质认定' },
]

/** 申请人可选的企业服务成果类型（仅技术合作） */
export const APPLICANT_ENTERPRISE_ACHIEVEMENT_TYPES = ENTERPRISE_ACHIEVEMENT_TYPES.filter(
  (t) => t.value === 'tech_cooperation',
)

export const enterpriseServiceAchievementAPI = {
  getEligibleProjects: () => api.get('/enterprise-service-achievements/eligible-projects'),
  getServiceProviders: () => api.get('/enterprise-service-achievements/service-providers'),
  list: (params?: Record<string, unknown>) => api.get('/enterprise-service-achievements', { params }),
  get: (id: string) => api.get(`/enterprise-service-achievements/${id}`),
  create: (data: Record<string, unknown>) => api.post('/enterprise-service-achievements', data),
  uploadFile: async (achievementId: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('achievement_id', achievementId)
    const token = localStorage.getItem('token')
    const res = await fetch(`${getApiBaseUrl()}/enterprise-service-achievements/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    })
    return res.json()
  },
}

export const assistantEnterpriseServiceAPI = {
  list: (params?: Record<string, unknown>) => api.get('/assistant/enterprise-service-achievements/list', { params }),
  review: (id: string, data: { recommendation: string; comment: string }) =>
    api.post(`/assistant/enterprise-service-achievements/${id}/review`, data),
}
