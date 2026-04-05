// src/types/statistics.ts
export interface StatisticsFilter {
  period?: 'week' | 'month' | 'quarter' | 'year' | 'custom'
  startDate?: string
  endDate?: string
  dimension?: 'type' | 'project' | 'author' | 'status'
  projectIds?: string[]
  types?: string[]
  statuses?: string[]
  sortBy?: 'count_desc' | 'count_asc' | 'rate_desc' | 'time_desc'
}
