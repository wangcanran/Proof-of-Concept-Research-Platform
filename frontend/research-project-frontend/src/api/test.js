// src/api/test.js
import { statisticsAPI } from './statistics'

// 测试API连接
const testAPI = async () => {
  console.log('🧪 开始测试报表统计API连接...')

  try {
    // 测试获取项目列表
    const projects = await statisticsAPI.getProjectsForFilter()
    console.log(
      '✅ 获取项目列表:',
      projects.success ? '成功' : '失败',
      projects.data?.data?.length || 0,
    )

    // 测试获取统计摘要
    const summary = await statisticsAPI.getAchievementSummary({ period: 'month' })
    console.log('✅ 获取统计摘要:', summary.success ? '成功' : '失败', summary.data?.data?.summary)

    // 测试获取趋势数据
    const trend = await statisticsAPI.getAchievementTrend(30)
    console.log('✅ 获取趋势数据:', trend.success ? '成功' : '失败', trend.data?.data?.length || 0)

    console.log('🎉 所有API测试完成！')
  } catch (error) {
    console.error('❌ API测试失败:', error)
  }
}

// 运行测试
testAPI()
