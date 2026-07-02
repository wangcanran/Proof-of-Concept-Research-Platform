import api from '@/utils/request'

export interface IndustryPartnerRow {
  id: string
  name: string
  org_category: string
  org_category_label?: string
  main_products_services?: string | null
  contact_name: string
  contact_phone: string
  description?: string | null
  domain_ids?: string[]
  domains?: { id: string; name: string }[]
  domain_names?: string[]
  created_at?: string
  updated_at?: string
}

export const industryPartnerAPI = {
  list: (params?: Record<string, unknown>) => api.get('/api/industry-partners', { params }),
  get: (id: string) => api.get(`/api/industry-partners/${id}`),
  create: (data: Record<string, unknown>) => api.post('/api/industry-partners', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/api/industry-partners/${id}`, data),
  remove: (id: string) => api.delete(`/api/industry-partners/${id}`),
}

export interface ConnectionRequestRow {
  id: string
  partner_id: string
  project_id: string
  applicant_id: string
  intention_note: string
  status: string
  status_label?: string
  partner_name?: string
  project_title?: string
  project_code?: string
  applicant_name?: string
  partner_intention?: string | null
  handle_note?: string | null
  handled_by_name?: string | null
  handled_at?: string | null
  created_at?: string
  org_category_label?: string
  main_products_services?: string | null
}

export interface ProjectApplyStatusItem {
  project_id: string
  project_code?: string
  title: string
  can_apply: boolean
  block_status?: string | null
  block_reason?: string | null
}

export const industryPartnerConnectionAPI = {
  listMine: (params?: Record<string, unknown>) =>
    api.get('/api/applicant/industry-partner-connection-requests', { params }),
  getProjectApplyStatus: (partnerId: string) =>
    api.get(`/api/applicant/industry-partners/${partnerId}/project-apply-status`),
  apply: (partnerId: string, data: { project_id: string; intention_note: string }) =>
    api.post(`/api/applicant/industry-partners/${partnerId}/connection-requests`, data),
  listForManager: (params?: Record<string, unknown>) =>
    api.get('/api/assistant/industry-partner-connection-requests', { params }),
  review: (
    id: string,
    data: { action: 'confirmed' | 'deferred' | 'rejected'; partner_intention?: string; handle_note?: string },
  ) => api.put(`/api/assistant/industry-partner-connection-requests/${id}/review`, data),
  getProjectEngaged: (projectId: string) =>
    api.get(`/api/projects/${projectId}/engaged-industry-partners`),
}
