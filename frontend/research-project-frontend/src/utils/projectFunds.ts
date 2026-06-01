/** 剩余预算（元）= 总预算 - 已花费，与后端、项目卡片一致，可为负表示超支 */
export function calcProjectFundsRemaining(
  totalBudget: number | string | null | undefined,
  spentAmount: number | string | null | undefined,
): number {
  const total = Number(totalBudget) || 0
  const spent = Number(spentAmount) || 0
  return Math.round((total - spent) * 100) / 100
}
