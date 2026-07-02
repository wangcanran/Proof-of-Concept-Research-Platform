export const CONNECTION_REQUEST_STATUSES = ['pending', 'confirmed', 'deferred', 'rejected'] as const
export type ConnectionRequestStatus = (typeof CONNECTION_REQUEST_STATUSES)[number]

export const CONNECTION_REQUEST_STATUS_LABELS: Record<ConnectionRequestStatus, string> = {
  pending: '待处理',
  confirmed: '已确认对接',
  deferred: '暂缓对接',
  rejected: '不合适',
}

export const CONNECTION_REQUEST_STATUS_TYPES: Record<ConnectionRequestStatus, string> = {
  pending: 'warning',
  confirmed: 'success',
  deferred: 'info',
  rejected: 'danger',
}

export function connectionStatusLabel(status?: string | null): string {
  if (!status) return '—'
  return CONNECTION_REQUEST_STATUS_LABELS[status as ConnectionRequestStatus] || status
}
