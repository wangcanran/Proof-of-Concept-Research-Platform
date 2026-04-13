<!-- src/views/applicant/ProjectProgress.vue -->
<template>
  <div class="project-progress">
    <!-- 页面标题 -->
    <div class="page-header">
      <button class="back-btn" @click="goBack">← 返回</button>
      <h1>项目进度跟踪</h1>
      <div class="header-info">
        <span class="project-title">{{ project?.title }}</span>
        <span class="project-no">{{ project?.project_code || '暂未编号' }}</span>
      </div>
    </div>

    <!-- 进度时间线 -->
    <div class="progress-timeline">
      <div class="timeline-header">
        <h2>项目进度时间线</h2>
        <div class="current-status">
          <span class="status-label">当前状态：</span>
          <span class="status-value" :class="getStatusClass(project?.status)">
            {{ getStatusText(project?.status) }}
          </span>
        </div>
      </div>

      <div class="timeline-steps">
        <div
          v-for="(step, index) in progressSteps"
          :key="step.key"
          class="timeline-step"
          :class="{
            completed: step.completed,
            current: step.current,
            pending: step.pending,
          }"
        >
          <div class="step-marker">
            <div class="marker-icon">{{ step.completed ? '✅' : step.current ? '🔄' : '⏱️' }}</div>
            <div class="marker-line"></div>
          </div>

          <div class="step-content">
            <div class="step-header">
              <h3 class="step-title">{{ step.title }}</h3>
              <span class="step-status">{{ step.status }}</span>
            </div>

            <div class="step-details">
              <div class="step-info">
                <span class="info-label">预计时间：</span>
                <span class="info-value">{{ step.estimatedTime }}</span>
              </div>
              <div class="step-info">
                <span class="info-label">实际完成：</span>
                <span class="info-value">{{ step.actualTime || '--' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 费用支出记录 -->
    <div class="expenditure-record">
      <div class="record-header">
        <h3>经费预算明细</h3>
        <div class="budget-summary">
          <span class="budget-item">
            预算总额：<strong class="budget-amount">¥ {{ formatAmount(totalBudget) }}</strong>
          </span>
          <span class="budget-item">
            已使用：<strong class="used-amount">¥ {{ formatAmount(usedAmount) }}</strong>
          </span>
          <span class="budget-item">
            剩余额度：<strong
              class="balance-amount"
              :class="{ 'low-balance': balance < totalBudget * 0.2 }"
            >
              ¥ {{ formatAmount(balance) }}
            </strong>
          </span>
        </div>
      </div>

      <div class="budget-table">
        <table>
          <thead>
            <tr>
              <th>预算科目</th>
              <th>项目名称</th>
              <th>详细说明</th>
              <th>计算方法</th>
              <th>金额（元）</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in budgetItems" :key="item.id">
              <td>{{ getBudgetCategory(item.category) }}</td>
              <td>{{ item.item_name || '未命名' }}</td>
              <td>{{ item.description || '无说明' }}</td>
              <td class="calculation-method">{{ item.calculation_method || '未提供' }}</td>
              <td class="amount-cell">¥ {{ formatAmount(item.amount || 0) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" class="text-right"><strong>预算合计</strong></td>
              <td class="total-amount">
                <strong>¥ {{ formatAmount(totalBudget) }}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="record-actions">
        <button class="record-btn primary" @click="viewBudgetDetails">📊 查看预算详情</button>
      </div>
    </div>

    <!-- 成果产出记录 -->
    <div class="achievements-record">
      <div class="record-header">
        <h3>成果产出记录</h3>
        <div class="achievements-summary">
          <div class="summary-item">
            <div class="summary-icon">📄</div>
            <div class="summary-content">
              <div class="summary-value">{{ achievementsCount.papers }}</div>
              <div class="summary-label">学术论文</div>
            </div>
          </div>
          <div class="summary-item">
            <div class="summary-icon">💡</div>
            <div class="summary-content">
              <div class="summary-value">{{ achievementsCount.patents }}</div>
              <div class="summary-label">专利成果</div>
            </div>
          </div>
          <div class="summary-item">
            <div class="summary-icon">🏆</div>
            <div class="summary-content">
              <div class="summary-value">{{ achievementsCount.awards }}</div>
              <div class="summary-label">获奖情况</div>
            </div>
          </div>
          <div class="summary-item">
            <div class="summary-icon">💻</div>
            <div class="summary-content">
              <div class="summary-value">{{ achievementsCount.software }}</div>
              <div class="summary-label">软件著作权</div>
            </div>
          </div>
        </div>
      </div>

      <div class="achievements-list">
        <div v-for="achievement in achievements" :key="achievement.id" class="achievement-item">
          <div class="achievement-icon">{{ getAchievementIcon(achievement.type) }}</div>
          <div class="achievement-content">
            <div class="achievement-title">{{ achievement.title }}</div>
            <div class="achievement-meta">
              <span class="meta-item">{{ getAchievementTypeText(achievement.type) }}</span>
              <span class="meta-item">{{ formatDate(achievement.achievement_date) }}</span>
              <span class="meta-item" :class="achievement.status">
                {{ getAchievementStatusText(achievement.status) }}
              </span>
            </div>
            <div class="achievement-desc" v-if="achievement.description">
              {{ achievement.description }}
            </div>
          </div>
          <div class="achievement-actions">
            <button class="action-btn" @click="viewAchievement(achievement)">查看详情</button>
          </div>
        </div>
      </div>

      <div class="record-actions">
        <button class="record-btn primary" @click="submitAchievement">🎯 提交新成果</button>
      </div>
    </div>

    <!-- 提醒通知 -->
    <div class="reminders-section">
      <h3>重要提醒</h3>
      <div class="reminders-list">
        <div v-for="reminder in reminders" :key="reminder.id" class="reminder-item">
          <div class="reminder-icon">{{ getReminderIcon(reminder.type) }}</div>
          <div class="reminder-content">
            <div class="reminder-title">{{ reminder.title }}</div>
            <div class="reminder-desc">{{ reminder.content }}</div>
            <div class="reminder-deadline">
              {{ reminder.is_read ? '已读' : '未读' }} · {{ formatDateTime(reminder.created_at) }}
            </div>
          </div>
          <div class="reminder-actions">
            <button class="reminder-btn" @click="handleReminder(reminder)">
              {{ reminder.is_read ? '查看' : '标记已读' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 导出报告 -->
    <div class="export-section">
      <h3>报告与导出</h3>
      <div class="export-options">
        <button class="export-btn" @click="exportProgressReport">📋 导出进度报告</button>
        <button class="export-btn" @click="exportBudgetReport">💰 导出预算报告</button>
        <button class="export-btn" @click="exportAchievementsReport">🏆 导出成果报告</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getApiBaseUrl } from '@/utils/request'
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()

// API配置
const API_BASE_URL = getApiBaseUrl()

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

// 请求拦截器 - 添加token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  },
)

// 数据接口
interface Project {
  id: string
  project_code: string
  title: string
  status: string
  budget_total: number
  approved_budget?: number
  submit_date?: string
  approval_date?: string
  start_date?: string
  end_date?: string
  created_at: string
}

interface BudgetItem {
  id: string
  category: string
  item_name: string
  description: string
  amount: number
  calculation_method?: string
  justification?: string
}

interface Achievement {
  id: string
  type: string
  title: string
  description?: string
  achievement_date?: string
  status: string
  created_at: string
}

interface Notification {
  id: string
  type: string
  title: string
  content: string
  is_read: boolean
  created_at: string
}

// 数据状态
const project = ref<Project | null>(null)
const budgetItems = ref<BudgetItem[]>([])
const achievements = ref<Achievement[]>([])
const reminders = ref<Notification[]>([])

// 计算属性
const projectId = computed(() => route.params.id as string)

// 总预算
const totalBudget = computed(() => {
  if (project.value?.approved_budget) {
    return project.value.approved_budget
  }
  return project.value?.budget_total || 0
})

// 已使用金额（从预算项目中汇总，实际项目中可能需要从支出记录获取）
const usedAmount = computed(() => {
  // 这里可以从 ExpenditureRecord 表获取，暂时返回0
  return 0
})

// 剩余额度
const balance = computed(() => totalBudget.value - usedAmount.value)

// 成果统计
const achievementsCount = computed(() => {
  const counts = { papers: 0, patents: 0, awards: 0, software: 0 }
  achievements.value.forEach((achievement) => {
    const type = achievement.type
    if (type === 'paper') counts.papers++
    else if (type === 'patent') counts.patents++
    else if (type === 'award') counts.awards++
    else if (type === 'software') counts.software++
  })
  return counts
})

// 进度时间线计算
const progressSteps = computed(() => {
  const steps = []

  // 项目状态阶段（适配新数据库状态）
  const statusSteps = [
    {
      key: 'draft',
      title: '项目创建',
      status: project.value?.status !== 'draft' ? '已完成' : '进行中',
      completed: project.value?.status !== 'draft',
      current: project.value?.status === 'draft',
      estimatedTime: '1-2个工作日',
      actualTime: formatDate(project.value?.created_at),
    },
    {
      key: 'submitted',
      title: '项目申报',
      status: project.value?.submit_date ? '已完成' : '未开始',
      completed: !!project.value?.submit_date,
      current: project.value?.status === 'submitted' && !project.value?.submit_date,
      estimatedTime: '1-3个工作日',
      actualTime: project.value?.submit_date ? formatDate(project.value.submit_date) : null,
    },
    {
      key: 'under_review',
      title: '专家评审',
      status:
        project.value?.status === 'under_review'
          ? '进行中'
          : ['revision', 'batch_review', 'approved', 'incubating', 'completed'].includes(
                project.value?.status || '',
              )
            ? '已完成'
            : '等待中',
      current: project.value?.status === 'under_review',
      completed: ['revision', 'batch_review', 'approved', 'incubating', 'completed'].includes(
        project.value?.status || '',
      ),
      estimatedTime: '5-7个工作日',
      actualTime: null,
    },
    {
      key: 'revision',
      title: '修改完善',
      status:
        project.value?.status === 'revision'
          ? '进行中'
          : ['batch_review', 'approved', 'incubating', 'completed'].includes(
                project.value?.status || '',
              )
            ? '已完成'
            : '等待中',
      current: project.value?.status === 'revision',
      completed: ['batch_review', 'approved', 'incubating', 'completed'].includes(
        project.value?.status || '',
      ),
      estimatedTime: '3-5个工作日',
      actualTime: null,
    },
    {
      key: 'batch_review',
      title: '集中评审',
      status:
        project.value?.status === 'batch_review'
          ? '进行中'
          : ['approved', 'incubating', 'completed'].includes(project.value?.status || '')
            ? '已完成'
            : '等待中',
      current: project.value?.status === 'batch_review',
      completed: ['approved', 'incubating', 'completed'].includes(project.value?.status || ''),
      estimatedTime: '3-5个工作日',
      actualTime: null,
    },
    {
      key: 'approved',
      title: '项目立项',
      status:
        project.value?.status === 'approved'
          ? '已完成'
          : ['incubating', 'completed'].includes(project.value?.status || '')
            ? '已完成'
            : '等待中',
      completed: ['approved', 'incubating', 'completed'].includes(project.value?.status || ''),
      estimatedTime: '1-2个工作日',
      actualTime: project.value?.approval_date ? formatDate(project.value.approval_date) : null,
    },
    {
      key: 'incubating',
      title: '项目孵化',
      status:
        project.value?.status === 'incubating'
          ? '进行中'
          : project.value?.status === 'completed'
            ? '已完成'
            : '等待中',
      current: project.value?.status === 'incubating',
      completed: project.value?.status === 'completed',
      estimatedTime: project.value?.end_date ? `至 ${formatDate(project.value.end_date)}` : '待定',
      actualTime: null,
    },
    {
      key: 'completed',
      title: '项目完成',
      status: project.value?.status === 'completed' ? '已完成' : '未开始',
      completed: project.value?.status === 'completed',
      estimatedTime: '项目结束',
      actualTime: project.value?.end_date ? formatDate(project.value.end_date) : null,
    },
  ]

  // 只显示到当前状态为止的步骤
  const currentIndex = statusSteps.findIndex(
    (step) =>
      step.current || (step.completed && !statusSteps[statusSteps.indexOf(step) + 1]?.completed),
  )

  if (currentIndex >= 0) {
    steps.push(...statusSteps.slice(0, currentIndex + 2))
  } else {
    steps.push(...statusSteps.slice(0, 3))
  }

  return steps
})

// ==================== 加载数据方法 ====================

const loadProject = async () => {
  try {
    console.log('🔄 加载项目进度...', projectId.value)

    // 加载项目基本信息
    const projectResponse = await api.get(`/projects/${projectId.value}`)
    if (projectResponse.success && projectResponse.data) {
      const data = projectResponse.data
      if (data.project) {
        project.value = data.project
      } else {
        project.value = data as Project
      }
      console.log('✅ 项目信息加载成功')
    }

    // 加载预算明细
    try {
      const budgetResponse = await api.get(`/projects/${projectId.value}/budgets`)
      if (budgetResponse.success && budgetResponse.data) {
        budgetItems.value = budgetResponse.data
        console.log('✅ 预算信息加载成功')
      }
    } catch (error) {
      console.warn('预算信息加载失败:', error)
      budgetItems.value = []
    }

    // 加载成果列表
    try {
      const achievementsResponse = await api.get(`/projects/${projectId.value}/achievements`)
      if (achievementsResponse.success && achievementsResponse.data) {
        achievements.value = achievementsResponse.data
        console.log('✅ 成果列表加载成功')
      }
    } catch (error) {
      console.warn('成果列表加载失败:', error)
      achievements.value = []
    }

    // 加载通知提醒
    try {
      const notificationsResponse = await api.get('/notifications', {
        params: { limit: 10, orderBy: 'created_at', order: 'desc' },
      })
      if (notificationsResponse.success && notificationsResponse.data) {
        reminders.value = notificationsResponse.data
        console.log('✅ 通知列表加载成功')
      }
    } catch (error) {
      console.warn('通知列表加载失败:', error)
      reminders.value = []
    }
  } catch (error: any) {
    console.error('❌ 加载项目进度失败:', error)
    ElMessage.error('加载项目进度失败: ' + (error.message || '未知错误'))
  }
}

// ==================== 辅助函数 ====================

const getStatusText = (status?: string) => {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    under_review: '专家评审中',
    revision: '修改后重提',
    batch_review: '集中评审中',
    approved: '已批准',
    incubating: '孵化中',
    rejected: '未通过',
    completed: '已完成',
    terminated: '已终止',
  }
  return status ? statusMap[status] || status : '未知'
}

const getStatusClass = (status?: string) => {
  const classMap: Record<string, string> = {
    draft: 'draft',
    submitted: 'submitted',
    under_review: 'reviewing',
    revision: 'reviewing',
    batch_review: 'reviewing',
    approved: 'approved',
    incubating: 'incubating',
    completed: 'completed',
    rejected: 'rejected',
    terminated: 'terminated',
  }
  return classMap[status || ''] || ''
}

const getBudgetCategory = (category: string) => {
  const categoryMap: Record<string, string> = {
    设备费: '设备费',
    材料费: '材料费',
    测试费: '测试/计算/分析费',
    差旅费: '差旅/会议/国际合作交流费',
    会议费: '会议费',
    劳务费: '劳务费',
    专家咨询费: '专家咨询费',
    出版费: '出版/文献/信息传播/知识产权事务费',
    管理费: '管理费',
    其他: '其他支出',
  }
  return categoryMap[category] || category
}

const getAchievementTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    paper: '学术论文',
    patent: '发明专利',
    software: '软件著作权',
    report: '研究报告',
    prototype: '原型样品',
    standard: '技术标准',
    award: '奖项',
    other: '其他成果',
  }
  return typeMap[type] || type
}

const getAchievementIcon = (type: string) => {
  const iconMap: Record<string, string> = {
    paper: '📄',
    patent: '💡',
    software: '💻',
    report: '📋',
    prototype: '🔧',
    standard: '📐',
    award: '🏆',
    other: '📝',
  }
  return iconMap[type] || '📝'
}

const getAchievementStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    submitted: '待审核',
    verified: '已审核',
    rejected: '已驳回',
  }
  return statusMap[status] || status
}

const getReminderIcon = (type: string) => {
  const iconMap: Record<string, string> = {
    project: '📋',
    review: '👨‍🏫',
    funding: '💰',
    incubation: '🏭',
    system: '⚙️',
    reminder: '⏰',
    invitation: '✉️',
  }
  return iconMap[type] || '📌'
}

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const formatDate = (dateString?: string) => {
  if (!dateString) return '--'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  } catch {
    return dateString
  }
}

const formatDateTime = (dateString?: string) => {
  if (!dateString) return '--'
  try {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

// ==================== 操作方法 ====================

const goBack = () => {
  router.push('/projects')
}

const viewBudgetDetails = () => {
  router.push(`/projects/${projectId.value}/budget`)
}

const viewAchievement = (achievement: Achievement) => {
  router.push(`/achievements/${achievement.id}/detail`)
}

const submitAchievement = () => {
  router.push(`/achievements/create?project_id=${projectId.value}`)
}

const handleReminder = async (reminder: Notification) => {
  if (!reminder.is_read) {
    try {
      await api.post(`/notifications/${reminder.id}/read`)
      reminder.is_read = true
      ElMessage.success('已标记为已读')
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  }

  // 根据通知类型跳转
  switch (reminder.type) {
    case 'project':
      router.push(`/projects/${projectId.value}`)
      break
    case 'review':
      router.push(`/projects/${projectId.value}/reviews`)
      break
    case 'funding':
      router.push(`/projects/${projectId.value}/budget`)
      break
    default:
      ElMessage.info(reminder.content)
      break
  }
}

const exportProgressReport = () => {
  ElMessage.info('进度报告导出功能开发中...')
}

const exportBudgetReport = () => {
  ElMessage.info('预算报告导出功能开发中...')
}

const exportAchievementsReport = () => {
  ElMessage.info('成果报告导出功能开发中...')
}

// 初始化
onMounted(() => {
  console.log('🚀 ProjectProgress 组件初始化')
  loadProject()
})
</script>

<style scoped>
/* 样式保持不变，与之前相同 */
.project-progress {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
}

/* 页面标题 */
.page-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.back-btn {
  padding: 8px 16px;
  background: #f5f7fa;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

.back-btn:hover {
  background: #e8e8e8;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
  flex: 1;
}

.header-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.project-title {
  font-size: 16px;
  font-weight: 500;
  color: #2c3e50;
}

.project-no {
  font-size: 14px;
  color: #666;
  background: #f5f7fa;
  padding: 4px 12px;
  border-radius: 4px;
}

/* 进度时间线 */
.progress-timeline {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f0f0f0;
}

.timeline-header h2 {
  margin: 0;
  font-size: 20px;
  color: #2c3e50;
}

.current-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-label {
  color: #666;
}

.status-value {
  padding: 6px 16px;
  border-radius: 4px;
  font-weight: 500;
}

.status-value.draft {
  background: #f5f5f5;
  color: #8c8c8c;
}

.status-value.submitted {
  background: rgba(179,27,27,0.06);
  color: #b31b1b;
}

.status-value.reviewing {
  background: #fff0f6;
  color: #eb2f96;
}

.status-value.approved {
  background: #f6ffed;
  color: #52c41a;
}

.status-value.incubating {
  background: rgba(179,27,27,0.06);
  color: #b31b1b;
}

.status-value.completed {
  background: #52c41a;
  color: white;
}

.status-value.rejected {
  background: #ff4d4f;
  color: white;
}

/* 时间线步骤 */
.timeline-steps {
  position: relative;
}

.timeline-step {
  display: flex;
  margin-bottom: 32px;
  position: relative;
}

.timeline-step:last-child {
  margin-bottom: 0;
}

.step-marker {
  position: relative;
  margin-right: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.marker-icon {
  width: 48px;
  height: 48px;
  background: #f5f5f5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  z-index: 2;
}

.marker-line {
  flex: 1;
  width: 2px;
  background: #e8e8e8;
  margin-top: 8px;
}

.timeline-step:last-child .marker-line {
  display: none;
}

.timeline-step.completed .marker-icon {
  background: #52c41a;
  color: white;
}

.timeline-step.completed .marker-line {
  background: #52c41a;
}

.timeline-step.current .marker-icon {
  background: #b31b1b;
  color: white;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(24, 144, 255, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(24, 144, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(24, 144, 255, 0);
  }
}

.timeline-step.pending .marker-icon {
  background: #f5f5f5;
  color: #999;
}

.step-content {
  flex: 1;
  padding-top: 4px;
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.step-title {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
}

.step-status {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.timeline-step.completed .step-status {
  background: #f6ffed;
  color: #52c41a;
}

.timeline-step.current .step-status {
  background: rgba(179,27,27,0.06);
  color: #b31b1b;
}

.timeline-step.pending .step-status {
  background: #f5f5f5;
  color: #999;
}

.step-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.step-info {
  display: flex;
  gap: 4px;
  font-size: 14px;
}

.info-label {
  color: #666;
}

.info-value {
  color: #2c3e50;
  font-weight: 500;
}

/* 经费预算表格 */
.expenditure-record,
.achievements-record {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.record-header h3 {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
}

.budget-summary {
  display: flex;
  gap: 24px;
}

.budget-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #666;
}

.budget-amount {
  color: #b31b1b;
}

.used-amount {
  color: #52c41a;
}

.balance-amount {
  color: #fa8c16;
}

.balance-amount.low-balance {
  color: #ff4d4f;
}

.budget-table {
  overflow-x: auto;
  margin-bottom: 20px;
}

.budget-table table {
  width: 100%;
  border-collapse: collapse;
}

.budget-table th {
  background: #f5f7fa;
  padding: 12px;
  text-align: left;
  font-weight: 500;
  color: #2c3e50;
  border: 1px solid #e8e8e8;
}

.budget-table td {
  padding: 12px;
  border: 1px solid #e8e8e8;
}

.amount-cell {
  font-weight: 500;
  color: #b31b1b;
}

.text-right {
  text-align: right;
}

.total-amount {
  color: #b31b1b;
  font-weight: bold;
}

.calculation-method {
  font-size: 12px;
  color: #666;
  max-width: 200px;
}

/* 成果统计 */
.achievements-summary {
  display: flex;
  gap: 24px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary-icon {
  font-size: 24px;
  width: 48px;
  height: 48px;
  background: #f5f7fa;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.summary-content {
  display: flex;
  flex-direction: column;
}

.summary-value {
  font-size: 20px;
  font-weight: bold;
  color: #2c3e50;
}

.summary-label {
  font-size: 12px;
  color: #666;
}

/* 成果列表 */
.achievements-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.achievement-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  transition: all 0.3s;
}

.achievement-item:hover {
  border-color: #b31b1b;
  background: #f5f7fa;
}

.achievement-icon {
  font-size: 24px;
  width: 48px;
  height: 48px;
  background: rgba(179,27,27,0.06);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.achievement-content {
  flex: 1;
}

.achievement-title {
  font-weight: 500;
  margin-bottom: 4px;
  color: #2c3e50;
}

.achievement-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #999;
}

.achievement-status {
  padding: 2px 8px;
  border-radius: 12px;
}

.achievement-status.submitted {
  background: #fff7e6;
  color: #fa8c16;
}

.achievement-status.verified {
  background: #f6ffed;
  color: #52c41a;
}

.achievement-status.rejected {
  background: #fff2f0;
  color: #ff4d4f;
}

.achievement-desc {
  font-size: 13px;
  color: #666;
  margin-top: 8px;
  line-height: 1.4;
}

.achievement-actions .action-btn {
  padding: 6px 16px;
  background: #f5f7fa;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.achievement-actions .action-btn:hover {
  background: #e8e8e8;
}

.record-actions {
  display: flex;
  gap: 12px;
}

.record-btn {
  padding: 10px 20px;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
}

.record-btn:hover {
  background: #f5f5f5;
}

.record-btn.primary {
  background: #b31b1b;
  color: white;
  border-color: #b31b1b;
}

.record-btn.primary:hover {
  background: #40a9ff;
}

/* 提醒通知 */
.reminders-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.reminders-section h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #2c3e50;
}

.reminders-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reminder-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  transition: all 0.3s;
}

.reminder-item:hover {
  border-color: #ff4d4f;
  background: #fff2f0;
}

.reminder-icon {
  font-size: 20px;
  width: 40px;
  height: 40px;
  background: #fff7e6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.reminder-content {
  flex: 1;
}

.reminder-title {
  font-weight: 500;
  margin-bottom: 4px;
  color: #2c3e50;
}

.reminder-desc {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.reminder-deadline {
  font-size: 12px;
  color: #999;
}

.reminder-btn {
  padding: 6px 16px;
  background: #b31b1b;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.reminder-btn:hover {
  background: #40a9ff;
}

/* 导出报告 */
.export-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.export-section h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #2c3e50;
}

.export-options {
  display: flex;
  gap: 12px;
}

.export-btn {
  flex: 1;
  padding: 12px 20px;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s;
}

.export-btn:hover {
  background: #f5f5f5;
  transform: translateY(-2px);
}

/* 响应式调整 */
@media (max-width: 992px) {
  .timeline-header,
  .record-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .budget-summary,
  .achievements-summary {
    flex-wrap: wrap;
    justify-content: center;
  }

  .export-options {
    flex-direction: column;
  }
}

@media (max-width: 768px) {
  .project-progress {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .header-info {
    align-items: flex-start;
  }

  .step-details {
    grid-template-columns: 1fr;
  }

  .timeline-step {
    flex-direction: column;
    align-items: flex-start;
  }

  .step-marker {
    margin-right: 0;
    margin-bottom: 16px;
    flex-direction: row;
    width: 100%;
  }

  .marker-line {
    width: 100%;
    height: 2px;
    margin-top: 0;
    margin-left: 8px;
  }

  .achievement-item {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }

  .achievement-meta {
    justify-content: center;
  }

  .reminder-item {
    flex-direction: column;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .record-actions {
    flex-direction: column;
  }

  .record-btn {
    width: 100%;
    justify-content: center;
  }

  .budget-table {
    font-size: 12px;
  }
}
</style>
