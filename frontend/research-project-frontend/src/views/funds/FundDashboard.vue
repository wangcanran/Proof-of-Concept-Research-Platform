<template>
  <div class="fund-management">
    <!-- 返回首页按钮（最上方） -->
    <div class="back-to-home">
      <el-button @click="goToDashboard" type="text">
        <el-icon><ArrowLeft /></el-icon>
        <span>返回首页</span>
      </el-button>
    </div>

    <!-- 页面标题和主要操作 -->
    <div class="page-header">
      <div class="header-main">
        <h1>经费管理</h1>
        <p class="header-subtitle">管理您的项目经费和预算</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="applyForExpenditure">
          <el-icon><Plus /></el-icon>
          申请支出
        </el-button>
        <el-button @click="viewBudgetDetails">
          <el-icon><Document /></el-icon>
          预算明细
        </el-button>
      </div>
    </div>

    <!-- 核心统计概览 -->
    <div class="stats-overview">
      <el-row :gutter="16">
        <el-col :xs="24" :sm="12" :md="6">
          <div class="stat-card">
            <div class="stat-content">
              <div class="stat-title">总预算</div>
              <div class="stat-value">¥ {{ formatAmount(statsData.totalBudget) }}</div>
              <div class="stat-trend" :class="trendClass">{{ trendPercentage }}%</div>
            </div>
            <div class="stat-icon">💰</div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <div class="stat-card">
            <div class="stat-content">
              <div class="stat-title">已使用</div>
              <div class="stat-value">¥ {{ formatAmount(statsData.usedAmount) }}</div>
              <div class="stat-percentage">{{ usedPercentage }}%</div>
            </div>
            <div class="stat-icon">📤</div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <div class="stat-card">
            <div class="stat-content">
              <div class="stat-title">可用余额</div>
              <div class="stat-value" :class="{ warning: isLowBalance }">
                ¥ {{ formatAmount(statsData.availableBalance) }}
              </div>
              <div v-if="isLowBalance" class="stat-alert">余额不足</div>
              <div v-else class="stat-percentage">{{ balancePercentage }}%</div>
            </div>
            <div class="stat-icon">📥</div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <div class="stat-card">
            <div class="stat-content">
              <div class="stat-title">项目数量</div>
              <div class="stat-value">{{ projectCount }} 个</div>
              <div class="stat-detail">
                <span>进行中: {{ ongoingProjects }}</span>
                <span>已立项: {{ approvedProjects }}</span>
              </div>
            </div>
            <div class="stat-icon">📁</div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 主要功能区 -->
    <div class="main-sections">
      <!-- 快速操作 -->
      <div class="section quick-actions">
        <div class="section-header">
          <h3>快速操作</h3>
        </div>
        <div class="actions-grid">
          <div class="action-item" @click="applyForExpenditure">
            <div class="action-icon primary">
              <el-icon><Plus /></el-icon>
            </div>
            <div class="action-text">申请支出</div>
          </div>
          <div class="action-item" @click="viewBudgetDetails">
            <div class="action-icon success">
              <el-icon><DocumentCopy /></el-icon>
            </div>
            <div class="action-text">预算明细</div>
          </div>
          <div class="action-item" @click="viewAllProjects">
            <div class="action-icon info">
              <el-icon><Histogram /></el-icon>
            </div>
            <div class="action-text">我的项目</div>
          </div>
        </div>
      </div>

      <!-- 项目预算列表 -->
      <div class="section budget-status">
        <div class="section-header">
          <h3>项目预算执行情况</h3>
          <el-button link type="primary" @click="viewBudgetDetails"> 查看详情 </el-button>
        </div>
        <div class="budget-list">
          <div
            v-for="project in projectBudgets"
            :key="project.id"
            class="budget-item"
            @click="viewProjectBudget(project.id)"
          >
            <div class="budget-header">
              <div class="budget-name">{{ project.title }}</div>
              <el-tag :type="getProjectStatusType(project.status)" size="small">
                {{ getProjectStatusText(project.status) }}
              </el-tag>
            </div>
            <div class="budget-progress">
              <el-progress
                :percentage="project.percentage"
                :status="getProgressStatus(project.percentage)"
                :stroke-width="8"
              />
            </div>
            <div class="budget-numbers">
              <span class="budget-text">预算: ¥{{ formatAmount(project.budget_total) }}</span>
              <span class="budget-text">已用: ¥{{ formatAmount(project.used || 0) }}</span>
              <span class="budget-text balance">余额: ¥{{ formatAmount(project.balance) }}</span>
            </div>
          </div>
          <div v-if="projectBudgets.length === 0" class="empty-state">
            <div class="empty-icon">
              <el-icon><Folder /></el-icon>
            </div>
            <p>暂无项目预算数据</p>
            <el-button type="primary" @click="goToCreateProject"> 创建第一个项目 </el-button>
          </div>
        </div>
      </div>

      <!-- 预算科目明细 -->
      <div class="section budget-categories">
        <div class="section-header">
          <h3>预算科目明细</h3>
          <el-button link type="primary" @click="viewAllBudgetItems"> 查看全部 </el-button>
        </div>
        <div class="budget-categories-list">
          <div v-for="category in budgetCategories" :key="category.category" class="category-item">
            <div class="category-header">
              <div class="category-name">{{ category.category }}</div>
              <el-tag :type="getCategoryTagType(category.percentage)" size="small">
                {{ getCategoryStatus(category.percentage) }}
              </el-tag>
            </div>
            <div class="category-progress">
              <el-progress
                :percentage="category.percentage"
                :status="getProgressStatus(category.percentage)"
                :stroke-width="8"
              />
            </div>
            <div class="category-numbers">
              <span class="category-text">预算: ¥{{ formatAmount(category.budget) }}</span>
              <span class="category-text">已用: ¥{{ formatAmount(category.used) }}</span>
              <span class="category-text balance">余额: ¥{{ formatAmount(category.balance) }}</span>
            </div>
          </div>
          <div v-if="budgetCategories.length === 0" class="empty-state">
            <div class="empty-icon">
              <el-icon><Tickets /></el-icon>
            </div>
            <p>暂无预算明细</p>
            <el-button type="primary" @click="viewBudgetDetails"> 添加预算 </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  Plus,
  Document,
  DocumentCopy,
  Histogram,
  Folder,
  Tickets,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()

// API配置
const API_BASE_URL = 'http://localhost:3002/api'

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  },
)

// 状态数据
interface StatsData {
  totalBudget: number
  usedAmount: number
  availableBalance: number
}

const statsData = ref<StatsData>({
  totalBudget: 0,
  usedAmount: 0,
  availableBalance: 0,
})

// 项目预算数据
interface ProjectBudget {
  id: string
  title: string
  project_code: string
  status: string
  budget_total: number
  used: number
  balance: number
  percentage: number
}

const projectBudgets = ref<ProjectBudget[]>([])
const projectCount = ref(0)
const ongoingProjects = ref(0)
const approvedProjects = ref(0)

// 预算科目数据
interface BudgetCategory {
  category: string
  budget: number
  used: number
  balance: number
  percentage: number
}

const budgetCategories = ref<BudgetCategory[]>([])

// 加载状态
const loading = ref({
  stats: true,
  projects: true,
  categories: true,
})

// 趋势数据
const trendData = ref({
  currentMonth: 0,
  lastMonth: 0,
})

// 计算属性
const usedPercentage = computed(() => {
  if (statsData.value.totalBudget === 0) return 0
  return ((statsData.value.usedAmount / statsData.value.totalBudget) * 100).toFixed(1)
})

const balancePercentage = computed(() => {
  if (statsData.value.totalBudget === 0) return 0
  return ((statsData.value.availableBalance / statsData.value.totalBudget) * 100).toFixed(1)
})

const isLowBalance = computed(() => {
  if (statsData.value.totalBudget === 0) return false
  return statsData.value.availableBalance < statsData.value.totalBudget * 0.2
})

const trendPercentage = computed(() => {
  if (trendData.value.lastMonth === 0) return '0.0'
  const percentage =
    ((trendData.value.currentMonth - trendData.value.lastMonth) / trendData.value.lastMonth) * 100
  return percentage.toFixed(1)
})

const trendClass = computed(() => {
  const percentage = parseFloat(trendPercentage.value)
  if (percentage > 0) return 'positive'
  if (percentage < 0) return 'negative'
  return 'neutral'
})

// 加载用户的所有项目及预算
const loadProjects = async () => {
  loading.value.projects = true
  try {
    // 获取用户的所有项目
    const response = await api.get('/projects')
    console.log('📁 项目列表响应:', response)

    if (response.success && response.data) {
      const projects = response.data
      projectCount.value = projects.length

      // 统计项目状态
      ongoingProjects.value = projects.filter(
        (p: any) => p.status === 'incubating' || p.status === 'approved',
      ).length
      approvedProjects.value = projects.filter((p: any) => p.status === 'approved').length

      // 计算每个项目的预算和执行情况
      const projectBudgetsList: ProjectBudget[] = []
      let totalBudgetSum = 0
      let totalUsedSum = 0

      for (const project of projects) {
        // 获取项目预算明细
        const budgetResponse = await api.get(`/projects/${project.id}/budgets`)
        let usedAmount = 0

        if (budgetResponse.success && budgetResponse.data) {
          // 计算已使用金额（预算中已批准的支出，暂从预算明细汇总）
          usedAmount = budgetResponse.data.reduce(
            (sum: number, item: any) => sum + (parseFloat(item.amount) || 0),
            0,
          )
        }

        const budgetTotal = parseFloat(project.budget_total) || 0
        const used = usedAmount
        const balance = budgetTotal - used
        const percentage = budgetTotal > 0 ? Math.round((used / budgetTotal) * 100) : 0

        totalBudgetSum += budgetTotal
        totalUsedSum += used

        projectBudgetsList.push({
          id: project.id,
          title: project.title,
          project_code: project.project_code,
          status: project.status,
          budget_total: budgetTotal,
          used: used,
          balance: balance,
          percentage: percentage,
        })
      }

      projectBudgets.value = projectBudgetsList
      statsData.value.totalBudget = totalBudgetSum
      statsData.value.usedAmount = totalUsedSum
      statsData.value.availableBalance = totalBudgetSum - totalUsedSum

      console.log('📊 项目预算汇总:', {
        totalBudget: totalBudgetSum,
        totalUsed: totalUsedSum,
        available: totalBudgetSum - totalUsedSum,
      })
    }
  } catch (error) {
    console.error('❌ 加载项目列表失败:', error)
  } finally {
    loading.value.projects = false
  }
}

// 加载预算科目统计
const loadBudgetCategories = async () => {
  loading.value.categories = true
  try {
    // 获取用户所有项目的预算明细
    const projectsResponse = await api.get('/projects')

    if (projectsResponse.success && projectsResponse.data) {
      const projects = projectsResponse.data
      const categoryMap = new Map<string, { budget: number; used: number }>()

      for (const project of projects) {
        const budgetResponse = await api.get(`/projects/${project.id}/budgets`)

        if (budgetResponse.success && budgetResponse.data) {
          for (const item of budgetResponse.data) {
            const category = item.category
            const amount = parseFloat(item.amount) || 0

            if (!categoryMap.has(category)) {
              categoryMap.set(category, { budget: 0, used: 0 })
            }
            const current = categoryMap.get(category)!
            current.budget += amount
            // 使用金额暂时与预算相同，实际应从支出记录获取
            current.used += amount * 0.3 // 模拟已使用30%
          }
        }
      }

      // 转换为数组并计算百分比
      const categories: BudgetCategory[] = []
      for (const [category, data] of categoryMap) {
        const balance = data.budget - data.used
        const percentage = data.budget > 0 ? Math.round((data.used / data.budget) * 100) : 0
        categories.push({
          category,
          budget: data.budget,
          used: data.used,
          balance: balance,
          percentage: percentage,
        })
      }

      budgetCategories.value = categories.sort((a, b) => b.budget - a.budget)
    }
  } catch (error) {
    console.error('❌ 加载预算科目失败:', error)
  } finally {
    loading.value.categories = false
  }
}

// 加载趋势数据
const loadTrendData = async () => {
  try {
    // 获取用户所有项目的预算
    const projectsResponse = await api.get('/projects')

    if (projectsResponse.success && projectsResponse.data) {
      let currentMonthTotal = 0
      let lastMonthTotal = 0
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()

      for (const project of projectsResponse.data) {
        const budgetResponse = await api.get(`/projects/${project.id}/budgets`)

        if (budgetResponse.success && budgetResponse.data) {
          for (const item of budgetResponse.data) {
            const createdDate = new Date(item.created_at)
            const amount = parseFloat(item.amount) || 0

            if (
              createdDate.getMonth() === currentMonth &&
              createdDate.getFullYear() === currentYear
            ) {
              currentMonthTotal += amount
            } else if (
              createdDate.getMonth() === currentMonth - 1 &&
              createdDate.getFullYear() === currentYear
            ) {
              lastMonthTotal += amount
            } else if (createdDate.getMonth() === 11 && currentMonth === 0) {
              // 跨年处理
              if (createdDate.getFullYear() === currentYear - 1) {
                lastMonthTotal += amount
              }
            }
          }
        }
      }

      trendData.value.currentMonth = currentMonthTotal
      trendData.value.lastMonth = lastMonthTotal
    }
  } catch (error) {
    console.error('加载趋势数据失败:', error)
  }
}

// 加载所有数据
const loadAllData = async () => {
  console.log('📊 开始加载经费管理数据...')
  await loadProjects()
  await loadBudgetCategories()
  await loadTrendData()
  console.log('✅ 经费管理数据加载完成')
}

// 导航方法
const goToDashboard = () => {
  router.push('/dashboard')
}

const goToCreateProject = () => {
  router.push('/projects/create')
}

const applyForExpenditure = () => {
  ElMessage.info('支出申请功能开发中...')
}

const viewBudgetDetails = () => {
  router.push('/funds/budget')
}

const viewAllProjects = () => {
  router.push('/projects')
}

const viewProjectBudget = (projectId: string) => {
  router.push(`/projects/${projectId}/budget`)
}

const viewAllBudgetItems = () => {
  router.push('/funds/budget')
}

// 辅助函数
const formatAmount = (amount: number) => {
  if (amount === undefined || amount === null) return '0.00'
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const getProjectStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
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
  return statusMap[status] || status
}

const getProjectStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    draft: 'info',
    submitted: 'warning',
    under_review: 'warning',
    revision: 'warning',
    batch_review: 'warning',
    approved: 'success',
    incubating: 'primary',
    completed: 'success',
    rejected: 'danger',
    terminated: 'danger',
  }
  return typeMap[status] || 'info'
}

const getProgressStatus = (percentage: number) => {
  if (percentage >= 90) return 'exception'
  if (percentage >= 70) return 'warning'
  return 'success'
}

const getCategoryStatus = (percentage: number) => {
  if (percentage >= 90) return '超支'
  if (percentage >= 70) return '预警'
  return '正常'
}

const getCategoryTagType = (percentage: number) => {
  if (percentage >= 90) return 'danger'
  if (percentage >= 70) return 'warning'
  return 'success'
}

onMounted(() => {
  loadAllData()
})
</script>

<style scoped>
.fund-management {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.back-to-home {
  margin-bottom: 16px;
}

.back-to-home .el-button {
  padding: 0;
  color: #1890ff;
  font-size: 14px;
}

.back-to-home .el-button:hover {
  color: #40a9ff;
}

.back-to-home .el-icon {
  margin-right: 4px;
  font-size: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.header-main h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
}

.header-subtitle {
  margin: 0;
  opacity: 0.9;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.header-actions .el-button {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
}

.header-actions .el-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

.header-actions .el-button .el-icon {
  margin-right: 6px;
  font-size: 16px;
}

.stats-overview {
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  height: 100%;
  transition:
    transform 0.3s,
    box-shadow 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.stat-content {
  flex: 1;
}

.stat-title {
  font-size: 14px;
  color: #7f8c8d;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.stat-value.warning {
  color: #ff4d4f;
}

.stat-trend,
.stat-percentage,
.stat-alert,
.stat-detail {
  font-size: 12px;
  font-weight: 500;
}

.stat-trend.positive {
  color: #52c41a;
}

.stat-trend.negative {
  color: #ff4d4f;
}

.stat-trend.neutral {
  color: #1890ff;
}

.stat-percentage {
  color: #1890ff;
}

.stat-alert {
  color: #ff4d4f;
  padding: 2px 6px;
  background: #fff2f0;
  border-radius: 4px;
  display: inline-block;
}

.stat-detail {
  display: flex;
  gap: 8px;
  color: #666;
  font-size: 12px;
}

.stat-icon {
  font-size: 32px;
  margin-left: 16px;
}

.main-sections {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

@media (max-width: 992px) {
  .main-sections {
    grid-template-columns: 1fr;
  }
}

.section {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
}

.quick-actions {
  grid-column: span 2;
}

@media (max-width: 992px) {
  .quick-actions {
    grid-column: span 1;
  }
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 768px) {
  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.action-item:hover {
  border-color: #1890ff;
  background: #f5f7fa;
  transform: translateY(-2px);
}

.action-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  font-size: 24px;
}

.action-icon.primary {
  background: #e6f7ff;
  color: #1890ff;
}

.action-icon.success {
  background: #f6ffed;
  color: #52c41a;
}

.action-icon.info {
  background: #f0f5ff;
  color: #2f54eb;
}

.action-text {
  font-weight: 500;
  color: #2c3e50;
  font-size: 15px;
}

.budget-list,
.budget-categories-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.budget-item,
.category-item {
  cursor: pointer;
  transition: all 0.3s;
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.budget-item:hover,
.category-item:hover {
  border-color: #1890ff;
  background: #fafafa;
  transform: translateX(4px);
}

.budget-header,
.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.budget-name,
.category-name {
  font-weight: 500;
  color: #2c3e50;
}

.budget-progress,
.category-progress {
  margin-bottom: 8px;
}

.budget-numbers,
.category-numbers {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
}

.budget-text.balance,
.category-text.balance {
  color: #1890ff;
  font-weight: 500;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon .el-icon {
  font-size: 48px;
  color: #bfbfbf;
  margin-bottom: 16px;
}

.empty-state p {
  margin: 0 0 24px 0;
  color: #666;
}

@media (max-width: 768px) {
  .fund-management {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-actions {
    flex-direction: column;
    width: 100%;
  }

  .header-actions .el-button {
    width: 100%;
    justify-content: center;
  }

  .budget-numbers,
  .category-numbers {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
