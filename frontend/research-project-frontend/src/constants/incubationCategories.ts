/** 与数据库 IncubationProgress.service_categories SET 成员一致 */
export const SERVICE_CATEGORY_KEYS = ['tech', 'business', 'ip', 'resource', 'incubation'] as const
export type ServiceCategoryKey = (typeof SERVICE_CATEGORY_KEYS)[number]

export const SERVICE_CATEGORY_OPTIONS: {
  key: ServiceCategoryKey
  title: string
  examples: string
}[] = [
  { key: 'tech', title: '技术支持', examples: '中试放大、工艺优化、技术攻关、场景验证' },
  { key: 'business', title: '商业赋能', examples: '市场调研、商业模式设计、商业计划书、路演辅导' },
  { key: 'ip', title: '知识产权', examples: '专利布局、风险排查、技术交易、合同审查' },
  { key: 'resource', title: '资源对接', examples: '投融资、政府项目申报、产业链对接、中试基地' },
  { key: 'incubation', title: '创业孵化', examples: '公司注册、园区入驻、创业导师、财务法务咨询' },
]

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategoryKey, string> = {
  tech: '技术支持',
  business: '商业赋能',
  ip: '知识产权',
  resource: '资源对接',
  incubation: '创业孵化',
}

/** 解析 SET / 逗号字符串为 key 列表 */
export function parseServiceCategories(raw: string | null | undefined): ServiceCategoryKey[] {
  if (raw == null || raw === '') return []
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter((k): k is ServiceCategoryKey =>
      (SERVICE_CATEGORY_KEYS as readonly string[]).includes(k),
    )
}

/** 中文顿号拼接，用于详情/弹窗一行展示 */
export function formatServiceCategoriesDisplay(raw: string | null | undefined): string {
  const keys = parseServiceCategories(raw)
  if (!keys.length) return ''
  return keys.map((k) => SERVICE_CATEGORY_LABELS[k] || k).join('、')
}
