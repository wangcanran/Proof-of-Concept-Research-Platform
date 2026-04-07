<template>
  <div class="pending-projects-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <button type="button" class="back-workbench-box" @click="goToDashboard">
        <el-icon class="back-icon"><ArrowLeft /></el-icon>
        <span class="back-text">返回工作台</span>
      </button>

      <div class="header-content">
        <div class="header-main">
          <h1>
            <el-icon><Clock /></el-icon>
            待评审项目
          </h1>
          <p class="subtitle">当前共有 {{ total }} 个待评审项目</p>
        </div>
        <div class="header-actions">
          <el-button-group>
            <el-button @click="refreshData" :loading="loading">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
            <el-dropdown @command="handleBatchAction">
              <el-button type="primary">
                批量操作
                <el-icon><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="assign">批量分配</el-dropdown-item>
                  <el-dropdown-item command="export">导出列表</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </el-button-group>
        </div>
      </div>

      <!-- 筛选工具栏 -->
      <div class="filter-toolbar">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-input
              v-model="filter.search"
              placeholder="搜索项目名称或编号"
              clearable
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-col>

          <el-col :span="4">
            <el-select
              v-model="filter.priority"
              placeholder="优先级"
              clearable
              @change="handleFilterChange"
            >
              <el-option label="紧急" value="urgent" />
              <el-option label="高" value="high" />
              <el-option label="中" value="medium" />
              <el-option label="低" value="low" />
            </el-select>
          </el-col>

          <el-col :span="4">
            <el-select
              v-model="filter.category"
              placeholder="项目类别"
              clearable
              @change="handleFilterChange"
            >
              <el-option label="基础研究" value="基础研究" />
              <el-option label="应用研究" value="应用研究" />
              <el-option label="技术开发" value="技术开发" />
              <el-option label="成果转化" value="成果转化" />
            </el-select>
          </el-col>

          <el-col :span="4">
            <el-select
              v-model="filter.timeFilter"
              placeholder="截止时间"
              clearable
              @change="handleFilterChange"
            >
              <el-option label="3天内到期" value="3days" />
              <el-option label="本周内到期" value="week" />
              <el-option label="本月内到期" value="month" />
              <el-option label="已过期" value="expired" />
            </el-select>
          </el-col>

          <el-col :span="6">
            <div class="filter-actions">
              <el-button type="primary" @click="handleSearch">
                <el-icon><Search /></el-icon>
                搜索
              </el-button>
              <el-button @click="resetFilters">
                <el-icon><Refresh /></el-icon>
                重置
              </el-button>
            </div>
          </el-col>
        </el-row>
      </div>
    </div>

    <!-- 项目列表 -->
    <el-card class="projects-card">
      <!-- 统计摘要 -->
      <div class="stats-summary">
        <el-row :gutter="20">
          <el-col :span="6">
            <div class="stat-item">
              <div class="stat-value urgent">{{ urgentCount }}</div>
              <div class="stat-label">紧急项目</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item">
              <div class="stat-value warning">{{ highPriorityCount }}</div>
              <div class="stat-label">高优先级</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item">
              <div class="stat-value normal">{{ normalCount }}</div>
              <div class="stat-label">普通项目</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item">
              <div class="stat-value expired">{{ expiredCount }}</div>
              <div class="stat-label">已过期</div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 项目列表 -->
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>

      <div v-else-if="projects.length === 0" class="empty-container">
        <el-empty description="暂无待评审项目" :image-size="200">
          <el-button type="primary" @click="refreshData">
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
        </el-empty>
      </div>

      <div v-else class="projects-list">
        <div
          v-for="project in projects"
          :key="project.id"
          class="project-card"
          :class="getPriorityClass(project.priority)"
        >
          <div class="project-header">
            <div class="project-code">{{ project.project_code }}</div>
            <div class="project-meta">
              <el-tag :type="getPriorityTag(project.priority)" size="small">
                {{ getPriorityText(project.priority) }}
              </el-tag>
              <span class="deadline" :class="getDeadlineClass(project.review_deadline)">
                {{ getRemainingDays(project.review_deadline) }}
              </span>
            </div>
          </div>

          <div class="project-content">
            <h3 class="project-title" @click="viewProject(project)">
              {{ project.title }}
            </h3>

            <div class="project-info">
              <div class="info-row">
                <el-icon><User /></el-icon>
                <span>{{ project.applicant_name }}</span>
              </div>
              <div class="info-row">
                <el-icon><School /></el-icon>
                <span>{{ project.applicant_department }}</span>
              </div>
              <div class="info-row">
                <el-icon><Coin /></el-icon>
                <span class="budget">{{ formatCurrency(project.budget_total) }}</span>
              </div>
              <div class="info-row">
                <el-icon><Calendar /></el-icon>
                <span>截止：{{ formatDate(project.review_deadline) }}</span>
              </div>
            </div>

            <div class="project-tags">
              <el-tag type="info" size="small">{{ project.category }}</el-tag>
              <el-tag type="info" size="small">{{ project.research_field }}</el-tag>
            </div>
          </div>

          <div class="project-actions">
            <el-button type="primary" size="small" @click="startReview(project)">
              <el-icon><Edit /></el-icon>
              开始评审
            </el-button>
            <el-button type="default" size="small" @click="viewProject(project)">
              <el-icon><View /></el-icon>
              查看详情
            </el-button>
            <el-dropdown @command="handleProjectAction" trigger="click">
              <el-button type="text" size="small">
                <el-icon><More /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="{ action: 'download', project }">
                    <el-icon><Download /></el-icon>
                    下载材料
                  </el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'share', project }">
                    <el-icon><Share /></el-icon>
                    分享项目
                  </el-dropdown-item>
                  <el-dropdown-item divided :command="{ action: 'report', project }">
                    <el-icon><Warning /></el-icon>
                    报告问题
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="total > 0" class="pagination-section">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 批量操作对话框 -->
    <el-dialog v-model="showBatchDialog" :title="batchActionTitle" width="400px">
      <div v-if="batchAction === 'assign'">
        <el-form label-width="80px">
          <el-form-item label="分配至">
            <el-select placeholder="选择评审专家" style="width: 100%">
              <el-option label="张教授" value="1" />
              <el-option label="李研究员" value="2" />
              <el-option label="王教授" value="3" />
            </el-select>
          </el-form-item>
          <el-form-item label="备注">
            <el-input type="textarea" :rows="3" placeholder="请输入分配备注" />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="showBatchDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmBatchAction"> 确定 </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft,
  Clock,
  Refresh,
  ArrowDown,
  Search,
  User,
  School,
  Coin,
  Calendar,
  Edit,
  View,
  More,
  Download,
  Share,
  Warning,
} from '@element-plus/icons-vue'
import request from '@/utils/request'

const router = useRouter()

const goToDashboard = () => {
  router.push('/reviewer/dashboard')
}

// 状态管理
const loading = ref(false)
const projects = ref<any[]>([])
const total = ref(0)
const showBatchDialog = ref(false)
const batchAction = ref('')

// 筛选条件
const filter = ref({
  search: '',
  priority: '',
  category: '',
  timeFilter: '',
})

// 分页
const pagination = ref({
  page: 1,
  limit: 10,
})

// 计算属性
const urgentCount = computed(() => projects.value.filter((p) => p.priority === 'urgent').length)

const highPriorityCount = computed(() => projects.value.filter((p) => p.priority === 'high').length)

const normalCount = computed(
  () => projects.value.filter((p) => !['urgent', 'high'].includes(p.priority)).length,
)

const expiredCount = computed(
  () =>
    projects.value.filter((p) => {
      if (!p.review_deadline) return false
      const deadline = new Date(p.review_deadline)
      return deadline < new Date()
    }).length,
)

const batchActionTitle = computed(() => {
  const titles: Record<string, string> = {
    assign: '批量分配项目',
    export: '导出项目列表',
  }
  return titles[batchAction.value] || '批量操作'
})

// 方法
const loadProjects = async () => {
  loading.value = true

  try {
    const response = await request.get('/api/reviewer/pending-projects', {
      params: {
        page: pagination.value.page,
        limit: pagination.value.limit,
        ...filter.value,
      },
    })

    if (response.success) {
      projects.value = response.data.projects || response.data || []
      total.value = response.data.total || projects.value.length
    } else {
      ElMessage.error('加载失败: ' + (response.error || '未知错误'))
      projects.value = []
    }
  } catch (error: any) {
    console.error('加载待评审项目失败:', error)
    ElMessage.error('加载失败: ' + (error.message || '网络错误'))

    // 使用模拟数据
    loadMockData()
  } finally {
    loading.value = false
  }
}

const loadMockData = () => {
  projects.value = [
    {
      id: '1',
      project_code: 'PROJ-2024-001',
      title: '人工智能辅助医疗诊断系统研究',
      priority: 'urgent',
      category: '人工智能',
      research_field: '医疗健康',
      budget_total: 500000,
      review_deadline: '2024-01-31',
      applicant_name: '张教授',
      applicant_department: '计算机科学与技术学院',
    },
    // 更多模拟数据...
  ]
  total.value = projects.value.length
}

const handleSearch = () => {
  pagination.value.page = 1
  loadProjects()
}

const handleFilterChange = () => {
  handleSearch()
}

const resetFilters = () => {
  filter.value = {
    search: '',
    priority: '',
    category: '',
    timeFilter: '',
  }
  pagination.value.page = 1
  loadProjects()
}

const handleSizeChange = (size: number) => {
  pagination.value.limit = size
  pagination.value.page = 1
  loadProjects()
}

const handlePageChange = (page: number) => {
  pagination.value.page = page
  loadProjects()
}

const handleBatchAction = (command: string) => {
  batchAction.value = command
  showBatchDialog.value = true
}

const confirmBatchAction = () => {
  ElMessage.success('操作成功')
  showBatchDialog.value = false
}

const startReview = (project: any) => {
  router.push({
    path: '/reviewer/review',
    query: {
      projectId: project.id,
      projectCode: project.project_code,
    },
  })
}

const viewProject = (project: any) => {
  router.push(`/reviewer/project-detail/${project.id}`)
}

const handleProjectAction = (command: any) => {
  const { action, project } = command
  switch (action) {
    case 'download':
      ElMessage.info('下载项目材料')
      break
    case 'share':
      ElMessage.info('分享项目')
      break
    case 'report':
      ElMessage.info('报告问题')
      break
  }
}

const refreshData = () => {
  loadProjects()
  ElMessage.success('数据已刷新')
}

// 辅助函数
const formatCurrency = (amount: number) => {
  if (!amount) return '¥0'
  const num = Number(amount)
  if (num >= 100000000) return '¥' + (num / 100000000).toFixed(2) + '亿'
  if (num >= 10000) return '¥' + (num / 10000).toFixed(2) + '万'
  return '¥' + num.toFixed(2)
}

const formatDate = (dateString: string) => {
  if (!dateString) return '未设置'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  } catch {
    return dateString
  }
}

const getPriorityClass = (priority: string) => {
  const map: Record<string, string> = {
    urgent: 'urgent',
    high: 'high',
    medium: 'medium',
    low: 'low',
  }
  return map[priority] || 'medium'
}

const getPriorityTag = (priority: string) => {
  const map: Record<string, string> = {
    urgent: 'danger',
    high: 'warning',
    medium: 'primary',
    low: 'info',
  }
  return map[priority] || 'info'
}

const getPriorityText = (priority: string) => {
  const map: Record<string, string> = {
    urgent: '紧急',
    high: '高',
    medium: '中',
    low: '低',
  }
  return map[priority] || '中'
}

const getRemainingDays = (deadline: string) => {
  if (!deadline) return '未设置'
  const date = new Date(deadline)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return '已过期'
  if (diffDays === 0) return '今天截止'
  if (diffDays === 1) return '明天截止'
  return `${diffDays}天后截止`
}

const getDeadlineClass = (deadline: string) => {
  if (!deadline) return ''
  const date = new Date(deadline)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'expired'
  if (diffDays <= 3) return 'urgent'
  if (diffDays <= 7) return 'warning'
  return ''
}

// 生命周期
onMounted(() => {
  loadProjects()
})
</script>

<style scoped>
.pending-projects-page {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

/* 与评审仪表盘一致的红色主色 */
.pending-projects-page :deep(.el-button--primary) {
  --el-button-bg-color: #b31b1b;
  --el-button-border-color: #b31b1b;
  --el-button-hover-bg-color: #8b1515;
  --el-button-hover-border-color: #8b1515;
  --el-button-active-bg-color: #8b1515;
  --el-button-active-border-color: #8b1515;
}

.pending-projects-page :deep(.el-pagination .el-pager li.is-active) {
  color: #b31b1b;
  font-weight: 600;
}

.pending-projects-page :deep(.el-pagination .el-pager li:hover) {
  color: #8b1515;
}

.page-header {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.back-workbench-box {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  padding: 10px 18px;
  border: 1px solid rgba(179, 27, 27, 0.35);
  border-radius: 8px;
  background: linear-gradient(180deg, #fffbfb 0%, #fff5f5 100%);
  color: #b31b1b;
  font-size: 15px;
  font-weight: 500;
  font-family: 'STZhongsong', '华文中宋', 'SimSun', serif;
  cursor: pointer;
  transition:
    background 0.2s,
    border-color 0.2s,
    box-shadow 0.2s;
}

.back-workbench-box:hover {
  background: #fff0f0;
  border-color: #b31b1b;
  box-shadow: 0 2px 8px rgba(179, 27, 27, 0.12);
}

.back-workbench-box:active {
  background: #ffe8e8;
}

.back-workbench-box .back-icon {
  font-size: 18px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
}

.header-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;
}

.header-main h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'STZhongsong', '华文中宋', 'SimSun', serif;
}

.subtitle {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.filter-toolbar {
  padding: 20px 0 0 0;
  border-top: 1px solid #f0f0f0;
}

.filter-actions {
  display: flex;
  gap: 12px;
}

.projects-card {
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: none;
}

.stats-summary {
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 20px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  border-radius: 8px;
  background: #fafafa;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 8px;
}

.stat-value.urgent {
  color: #ff4d4f;
}

.stat-value.warning {
  color: #fa8c16;
}

.stat-value.normal {
  color: #b31b1b;
}

.stat-value.expired {
  color: #8c8c8c;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.loading-container,
.empty-container {
  padding: 60px 20px;
  text-align: center;
}

.projects-list {
  padding: 20px;
}

.project-card {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
  transition: all 0.3s;
}

.project-card:hover {
  border-color: #b31b1b;
  box-shadow: 0 2px 12px rgba(179, 27, 27, 0.12);
}

.project-card.urgent {
  border-left: 4px solid #ff4d4f;
}

.project-card.high {
  border-left: 4px solid #fa8c16;
}

.project-card.medium {
  border-left: 4px solid #b31b1b;
}

.project-card.low {
  border-left: 4px solid #52c41a;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.project-code {
  font-family: monospace;
  font-weight: bold;
  color: #b31b1b;
}

.project-meta {
  display: flex;
  gap: 12px;
  align-items: center;
}

.deadline.expired {
  color: #ff4d4f;
  font-weight: bold;
}

.deadline.urgent {
  color: #fa8c16;
  font-weight: bold;
}

.deadline.warning {
  color: #fadb14;
}

.project-content {
  margin-bottom: 20px;
}

.project-title {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: #303133;
  cursor: pointer;
  transition: color 0.3s;
}

.project-title:hover {
  color: #b31b1b;
}

.project-info {
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  color: #606266;
}

.budget {
  color: #e6a23c;
  font-weight: bold;
}

.project-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.project-actions {
  display: flex;
  gap: 12px;
  border-top: 1px solid #f0f0f0;
  padding-top: 20px;
}

.pagination-section {
  padding: 20px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: center;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .header-actions {
    justify-content: center;
  }

  .back-workbench-box {
    width: 100%;
    justify-content: center;
  }

  .project-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .project-meta {
    justify-content: space-between;
  }

  .project-actions {
    flex-direction: column;
  }
}
</style>
