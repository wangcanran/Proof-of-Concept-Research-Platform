export const SERVICE_PROVIDER_CATEGORIES = [
  '财务',
  '法务',
  '知识产权',
  '工商注册',
  '资质申报',
  '活动策划组织',
  '文印制作',
  '投融资',
  '测试/样机代工',
] as const

export type ServiceProviderCategory = (typeof SERVICE_PROVIDER_CATEGORIES)[number]

export function parseCategoryList(category?: string | null): string[] {
  if (!category) return []
  return String(category)
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
}
