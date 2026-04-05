<template>
  <div class="fund-overview">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>经费概览</h1>
      <div class="header-actions">
        <el-button @click="handlePrint" :loading="printing">
          <el-icon><Printer /></el-icon>
          打印报告
        </el-button>
        <el-button type="primary" @click="refreshData" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
      </div>
    </div>

    <!-- 打印内容区域 -->
    <div id="print-content" class="print-content">
      <!-- 打印头部（仅在打印时显示） -->
      <div class="print-header">
        <h1>经费概览报告</h1>
        <p>生成时间：{{ new Date().toLocaleString('zh-CN') }}</p>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>

      <!-- 统计卡片 -->
      <div v-else class="stats-cards">
        <div class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-content">
            <div class="stat-value">¥{{ formatCurrency(stats.totalBudget) }}</div>
            <div class="stat-label">总预算</div>
            <div class="stat-trend" :class="getTrendClass(stats.trend)">
              {{ stats.trend > 0 ? '+' : '' }}{{ stats.trend }}%
            </div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <div class="stat-value">¥{{ formatCurrency(stats.approvedBudget) }}</div>
            <div class="stat-label">已批准预算</div>
            <div class="stat-percent">{{ stats.approvedPercentage }}%</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-value" :class="{ warning: isLowBalance }">
              ¥{{ formatCurrency(stats.remainingAmount) }}
            </div>
            <div class="stat-label">可用余额</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📁</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.ongoingProjects }}</div>
            <div class="stat-label">进行中项目</div>
          </div>
        </div>
      </div>

      <!-- 图表区域 -->
      <div class="chart-section">
        <div class="chart-card">
          <div class="chart-header">
            <span>项目预算分配</span>
            <el-select
              v-model="selectedProject"
              placeholder="选择项目"
              size="small"
              @change="loadProjectBudget"
              style="width: 200px"
              class="no-print"
            >
              <el-option label="全部项目" value="all" />
              <el-option
                v-for="project in projects"
                :key="project.id"
                :label="project.title"
                :value="project.id"
              />
            </el-select>
          </div>
          <BudgetPieChart :data="budgetDistribution" :loading="loadingCharts" />
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <span>项目状态分布</span>
          </div>
          <ProjectStatusChart :data="projectStatusData" :loading="loadingCharts" />
        </div>
      </div>

      <!-- 预算执行情况 -->
      <div class="budget-execution">
        <div class="card-header">
          <span>项目预算执行情况</span>
          <el-button type="primary" size="small" @click="loadBudgetExecution" class="no-print">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
        <BudgetExecutionTable :data="budgetExecutionData" :loading="loadingTables" />
      </div>

      <!-- 我的项目 -->
      <div class="recent-projects">
        <div class="card-header">
          <span>我的项目</span>
          <el-link type="primary" @click="goToProjects" class="no-print">查看全部</el-link>
        </div>
        <RecentProjectsList :data="recentProjects" :loading="loadingTables" />
      </div>
    </div>

    <!-- 快速操作 - 打印时隐藏 -->
    <div class="quick-actions no-print">
      <div class="quick-action" @click="goToProjects">
        <div class="action-icon">💰</div>
        <div class="action-text">项目预算</div>
      </div>
      <div class="quick-action" @click="goToCreateProject">
        <div class="action-icon">📝</div>
        <div class="action-text">创建项目</div>
      </div>
      <div class="quick-action" @click="goToReports">
        <div class="action-icon">📊</div>
        <div class="action-text">预算报表</div>
      </div>
      <div class="quick-action" @click="goToProjects">
        <div class="action-icon">📋</div>
        <div class="action-text">项目进度</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Refresh, Printer } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import BudgetPieChart from './components/BudgetPieCard.vue'
import ProjectStatusChart from './components/ProjectStatusChart.vue'
import BudgetExecutionTable from './components/BudgetExecutionTable.vue'
import RecentProjectsList from './components/RecentProjectsList.vue'

const router = useRouter()
const API_BASE_URL = 'http://localhost:3002/api'
const api = axios.create({ baseURL: API_BASE_URL, timeout: 10000 })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
api.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error),
)

const loading = ref(false)
const loadingStats = ref(false)
const loadingCharts = ref(false)
const loadingTables = ref(false)
const printing = ref(false)

const stats = ref({
  totalBudget: 0,
  approvedBudget: 0,
  remainingAmount: 0,
  approvedPercentage: 0,
  ongoingProjects: 0,
  trend: '+0.0%',
})

const projects = ref([])
const recentProjects = ref([])
const selectedProject = ref('all')
const budgetDistribution = ref([])
const projectStatusData = ref([])
const budgetExecutionData = ref([])

const formatCurrency = (amount: number) => {
  if (amount === undefined || amount === null) return '0.00'
  return `${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const getTrendClass = (trend: string) => {
  const val = parseFloat(trend)
  if (val > 0) return 'positive'
  if (val < 0) return 'negative'
  return 'neutral'
}

const isLowBalance = computed(() => {
  if (stats.value.totalBudget === 0) return false
  return stats.value.remainingAmount < stats.value.totalBudget * 0.2
})

const getBalanceStatus = (balance: number, total: number) => {
  if (total === 0) return 'info'
  const percentage = (balance / total) * 100
  if (percentage < 20) return 'danger'
  if (percentage < 40) return 'warning'
  return 'success'
}

const loadStats = async () => {
  loadingStats.value = true
  try {
    const response = await api.get('/funding/stats')
    if (response.success && response.data) {
      const data = response.data
      stats.value = {
        totalBudget: data.total_budget || 0,
        approvedBudget: data.approved_budget || 0,
        remainingAmount: data.available_balance || 0,
        approvedPercentage: data.used_percentage || 0,
        ongoingProjects: data.project_count || 0,
        trend: '+12.5%',
      }
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  } finally {
    loadingStats.value = false
  }
}

const loadProjects = async () => {
  try {
    const response = await api.get('/projects')
    if (response.success && response.data) {
      projects.value = response.data
      recentProjects.value = response.data.slice(0, 5)
    }
  } catch (error) {
    console.error('加载项目列表失败:', error)
  }
}

const loadProjectBudget = async () => {
  loadingCharts.value = true
  try {
    let budgetData = []
    if (selectedProject.value === 'all') {
      const response = await api.get('/budget/categories')
      if (response.success && response.data) {
        budgetData = response.data.map((item: any) => ({
          name: item.name || item.category,
          value: item.budget || 0,
          used: item.used || 0,
          percentage: item.percentage || 0,
        }))
      }
    } else {
      const response = await api.get(`/projects/${selectedProject.value}/budgets`)
      if (response.success && response.data) {
        const budgets = response.data.budgets || []
        const categoryMap = new Map()
        budgets.forEach((item: any) => {
          const category = item.category
          categoryMap.set(category, (categoryMap.get(category) || 0) + (item.amount || 0))
        })
        budgetData = Array.from(categoryMap.entries()).map(([name, value]) => ({
          name,
          value,
          used: 0,
          percentage: 0,
        }))
      }
    }
    budgetDistribution.value = budgetData
  } catch (error) {
    console.error('加载预算分配失败:', error)
  } finally {
    loadingCharts.value = false
  }
}

const loadProjectStatus = async () => {
  try {
    const response = await api.get('/projects')
    if (response.success && response.data) {
      const statusCount: Record<string, number> = {}
      response.data.forEach((project: any) => {
        const status = project.status
        statusCount[status] = (statusCount[status] || 0) + 1
      })
      projectStatusData.value = Object.entries(statusCount).map(([status, count]) => ({
        name: getProjectStatusText(status),
        value: count,
        status: status,
      }))
    }
  } catch (error) {
    console.error('加载项目状态失败:', error)
  }
}

const getProjectStatusText = (status: string) => {
  const map: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    under_review: '评审中',
    revision: '修改中',
    batch_review: '集中评审',
    approved: '已批准',
    incubating: '孵化中',
    completed: '已完成',
    rejected: '已驳回',
    terminated: '已终止',
  }
  return map[status] || status
}

const loadBudgetExecution = async () => {
  loadingTables.value = true
  try {
    const response = await api.get('/budget/execution')
    if (response.success && response.data) {
      budgetExecutionData.value = response.data.map((item: any) => ({
        id: item.id,
        title: item.title,
        project_code: item.project_code,
        status: item.status,
        status_text: getProjectStatusText(item.status),
        budget: item.budget,
        approved_budget: item.approved_budget,
        used: item.used,
        balance: item.balance,
        percentage: item.percentage,
      }))
    }
  } catch (error) {
    console.error('加载预算执行数据失败:', error)
  } finally {
    loadingTables.value = false
  }
}

const refreshData = async () => {
  loading.value = true
  try {
    await Promise.all([
      loadStats(),
      loadProjects(),
      loadProjectBudget(),
      loadProjectStatus(),
      loadBudgetExecution(),
    ])
    ElMessage.success('数据刷新成功')
  } catch (error) {
    console.error('刷新数据失败:', error)
    ElMessage.error('刷新数据失败')
  } finally {
    loading.value = false
  }
}

// 打印功能
const handlePrint = () => {
  printing.value = true
  setTimeout(() => {
    const printContent = document.getElementById('print-content')
    if (!printContent) {
      ElMessage.error('无法获取打印内容')
      printing.value = false
      return
    }

    const originalTitle = document.title
    document.title = '经费概览报告'

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      ElMessage.error('无法打开打印窗口')
      printing.value = false
      return
    }

    const styles = document.querySelectorAll('style')
    let stylesHtml = ''
    styles.forEach((style) => {
      stylesHtml += style.outerHTML
    })

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>经费概览报告</title>
        ${stylesHtml}
        <style>
          @media print {
            .no-print, .el-button, .header-actions, .quick-actions, .chart-header .el-select {
              display: none !important;
            }
            .print-header { display: block !important; text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #b31b1b; }
            .print-header h1 { font-size: 24px; margin-bottom: 10px; }
            .print-header p { color: #666; font-size: 12px; }
            .stats-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
            .stat-card { background: #f5f7fa; border-radius: 8px; padding: 16px; text-align: center; break-inside: avoid; }
            .stat-value { font-size: 24px; font-weight: bold; color: #b31b1b; }
            .chart-section { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; break-inside: avoid; }
            .budget-execution, .recent-projects { break-inside: avoid; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            th, td { border: 1px solid #e8e8e8; padding: 8px 12px; text-align: left; }
            th { background: #f5f7fa; }
          }
          .print-header { display: none; }
        </style>
      </head>
      <body>
        ${printContent.outerHTML}
      </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.print()
      printWindow.onafterprint = () => {
        printWindow.close()
        document.title = originalTitle
      }
    }
    printing.value = false
  }, 100)
}

const goToProjects = () => router.push('/projects')
const goToCreateProject = () => router.push('/projects/create')
const goToReports = () => router.push('/funds/reports')

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.fund-overview {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.page-header h1 {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
}
.header-actions {
  display: flex;
  gap: 12px;
}
.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.stat-card {
  display: flex;
  align-items: center;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: rgba(179,27,27,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-right: 16px;
}
.stat-content {
  flex: 1;
}
.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 4px;
}
.stat-value.warning {
  color: #ff4d4f;
}
.stat-label {
  font-size: 14px;
  color: #7f8c8d;
  margin-bottom: 4px;
}
.stat-trend {
  font-size: 12px;
  font-weight: 500;
}
.stat-trend.positive {
  color: #52c41a;
}
.stat-trend.negative {
  color: #ff4d4f;
}
.stat-percent {
  font-size: 12px;
  color: #b31b1b;
}
.chart-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.chart-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  height: 400px;
}
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.budget-execution,
.recent-projects {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.quick-action {
  background: white;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.quick-action:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.action-icon {
  font-size: 32px;
  margin-bottom: 12px;
}
.action-text {
  font-weight: 500;
  color: #2c3e50;
}
@media (max-width: 992px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  .chart-section {
    grid-template-columns: 1fr;
  }
  .quick-actions {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }
  .quick-actions {
    grid-template-columns: 1fr;
  }
}
</style>
