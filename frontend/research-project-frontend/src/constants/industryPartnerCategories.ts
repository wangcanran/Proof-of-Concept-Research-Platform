export const INDUSTRY_PARTNER_ORG_CATEGORIES = [
  { value: 'enterprise', label: '企业' },
  { value: 'government', label: '政府机构' },
  { value: 'other', label: '其它' },
] as const

export type IndustryPartnerOrgCategory = (typeof INDUSTRY_PARTNER_ORG_CATEGORIES)[number]['value']

export function orgCategoryLabel(value?: string | null): string {
  const found = INDUSTRY_PARTNER_ORG_CATEGORIES.find((c) => c.value === value)
  return found?.label || value || '—'
}
