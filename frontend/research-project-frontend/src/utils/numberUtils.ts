// src/utils/numberUtils.ts
/**
 * 数字转中文大写
 */
export function numberToChinese(num: number): string {
  const chineseNums = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
  const chineseUnits = ['', '拾', '佰', '仟']
  const bigUnits = ['', '万', '亿']

  // 处理小数部分
  const integerPart = Math.floor(num)
  const decimalPart = Math.round((num - integerPart) * 100)

  // 整数部分转中文
  const integerStr = integerPart.toString()
  let result = ''

  // 每4位一组处理
  for (let i = 0; i < Math.ceil(integerStr.length / 4); i++) {
    const start = Math.max(0, integerStr.length - (i + 1) * 4)
    const end = integerStr.length - i * 4
    const group = integerStr.slice(start, end)

    let groupResult = ''
    for (let j = 0; j < group.length; j++) {
      const digit = parseInt(group[j])
      const unit = chineseUnits[group.length - j - 1]

      if (digit === 0) {
        // 处理连续的零
        if (groupResult.length === 0 || groupResult[groupResult.length - 1] !== '零') {
          groupResult += '零'
        }
      } else {
        groupResult += chineseNums[digit] + unit
      }
    }

    // 移除末尾的零
    if (groupResult.endsWith('零')) {
      groupResult = groupResult.slice(0, -1)
    }

    if (groupResult) {
      result = groupResult + bigUnits[i] + result
    }
  }

  // 处理零的情况
  if (!result) {
    result = '零'
  }

  // 添加小数部分
  if (decimalPart > 0) {
    result += '点'
    const decimalStr = decimalPart.toString().padStart(2, '0')
    for (const digit of decimalStr) {
      result += chineseNums[parseInt(digit)]
    }
  }

  result += '元整'
  return result
}

/**
 * 格式化金额显示
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
