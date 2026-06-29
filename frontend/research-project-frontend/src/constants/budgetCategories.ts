/** 项目/经费预算科目（与数据库 ENUM 一致，不含「总计」） */
export const BUDGET_CATEGORY_OPTIONS = [
  { value: '', label: '请选择科目' },
  { value: '设备费', label: '设备费' },
  { value: '材料费', label: '材料费' },
  { value: '测试费', label: '测试费' },
  { value: '差旅费', label: '差旅费' },
  { value: '会议费', label: '会议费' },
  { value: '劳务费', label: '劳务费' },
  { value: '专家咨询费', label: '专家咨询费' },
  { value: '出版费', label: '出版费' },
  { value: '管理费', label: '管理费' },
  { value: '其他', label: '其他' },
] as const

export const WAN_YUAN_RATIO = 10000

export function yuanToWanDisplay(yuan: number): number {
  const y = Number(yuan) || 0
  if (y === 0) return 0
  return parseFloat((y / WAN_YUAN_RATIO).toFixed(6))
}

export function wanToYuanStore(wan: number): number {
  const w = Number(wan) || 0
  return parseFloat((w * WAN_YUAN_RATIO).toFixed(2))
}

/** 将库内金额（元）格式化为万元展示文本 */
export function formatAmountWan(yuan: number | string | null | undefined): string {
  const wan = yuanToWanDisplay(Number(yuan) || 0)
  return wan.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 6 })
}

/** 表单输入上限：库内元金额 → 万元数值 */
export function amountWanMax(yuanAmount: number | string | null | undefined): number {
  return yuanToWanDisplay(Number(yuanAmount) || 0)
}

/** 将库内金额（元）格式化为元展示文本（经费申请等直接按元填写/展示） */
export function formatAmountYuan(yuan: number | string | null | undefined): string {
  const y = Number(yuan) || 0
  return y.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export type BudgetRow = {
  category: string
  item_name: string
  description: string
  amount: number
}
