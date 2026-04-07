<!-- src/views/assistant/AuditTask.vue -->
<template>
  <div class="audit-task-page assistant-ruc-theme">
    <!-- 顶部导航栏 -->
    <header class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <span class="title-icon">📋</span>
          审核任务列表
        </h1>
        <div class="header-actions">
          <div class="header-stats">
            <div class="stat-item">
              <span class="stat-value">{{ stats.total || 0 }}</span>
              <span class="stat-label">总任务数</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ stats.pending || 0 }}</span>
              <span class="stat-label">待处理</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ stats.completed || 0 }}</span>
              <span class="stat-label">已完成</span>
            </div>
          </div>
          <div class="action-buttons">
            <button class="refresh-btn" @click="refreshData" title="刷新">
              <span class="btn-icon">🔄</span>
              刷新
            </button>
            <button class="filter-toggle-btn" @click="toggleFilterPanel" title="筛选">
              <span class="btn-icon">🔍</span>
              筛选
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- 筛选面板 -->
    <div class="filter-panel" v-if="showFilterPanel">
      <div class="filter-content">
        <div class="filter-row">
          <div class="filter-group">
            <label class="filter-label">任务类型</label>
            <div class="filter-options">
              <label v-for="type in taskTypes" :key="type.value" class="filter-option">
                <input
                  type="checkbox"
                  v-model="filters.taskTypes"
                  :value="type.value"
                  @change="applyFilters"
                />
                <span class="option-text">{{ type.label }}</span>
              </label>
            </div>
          </div>

          <div class="filter-group">
            <label class="filter-label">任务状态</label>
            <div class="filter-options">
              <label v-for="status in taskStatuses" :key="status.value" class="filter-option">
                <input
                  type="checkbox"
                  v-model="filters.statuses"
                  :value="status.value"
                  @change="applyFilters"
                />
                <span class="option-text">{{ status.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="filter-row">
          <div class="filter-group">
            <label class="filter-label">创建时间</label>
            <div class="date-filter">
              <el-date-picker
                v-model="filters.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                @change="applyFilters"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </div>
          </div>

          <div class="filter-group">
            <label class="filter-label">优先级</label>
            <div class="filter-options">
              <label v-for="priority in priorities" :key="priority.value" class="filter-option">
                <input
                  type="checkbox"
                  v-model="filters.priorities"
                  :value="priority.value"
                  @change="applyFilters"
                />
                <span class="option-text">{{ priority.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="filter-actions">
          <button class="filter-clear-btn" @click="clearFilters">清除筛选</button>
          <button class="filter-apply-btn" @click="applyFilters">应用筛选</button>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>正在加载任务数据...</p>
      </div>

      <!-- 任务列表 -->
      <div v-else class="task-container">
        <!-- 空状态 -->
        <div v-if="filteredTasks.length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <h3>暂无审核任务</h3>
          <p>当前没有待处理的审核任务</p>
          <button class="empty-action-btn" @click="refreshData">
            <span class="btn-icon">🔄</span>
            刷新查看
          </button>
        </div>

        <!-- 任务列表 -->
        <div v-else class="task-list">
          <!-- 待处理任务 -->
          <div class="task-section" v-if="pendingTasks.length > 0">
            <h3 class="section-title">
              <span class="section-icon">⏳</span>
              待处理任务
              <span class="section-count">{{ pendingTasks.length }}</span>
            </h3>
            <div class="task-cards">
              <div
                v-for="task in pendingTasks"
                :key="task.id"
                class="task-card"
                :class="getTaskPriorityClass(task.priority)"
                @click="handleTaskClick(task)"
              >
                <div class="task-card-header">
                  <div class="task-type">
                    <span class="task-type-icon">{{ getTaskIcon(task.task_type) }}</span>
                    <span class="task-type-text">{{ getTaskTypeText(task.task_type) }}</span>
                  </div>
                  <div class="task-priority" :class="task.priority">
                    {{ getPriorityText(task.priority) }}
                  </div>
                </div>

                <div class="task-content">
                  <h4 class="task-title">{{ task.title }}</h4>
                  <p class="task-description">{{ task.description }}</p>

                  <div class="task-meta">
                    <div class="meta-item">
                      <span class="meta-icon">👤</span>
                      <span>{{ task.applicant_name || '未知申请人' }}</span>
                    </div>
                    <div class="meta-item">
                      <span class="meta-icon">📅</span>
                      <span>{{ formatDate(task.created_at) }}</span>
                    </div>
                  </div>

                  <div class="task-info">
                    <div class="info-item">
                      <span class="info-label">项目编号:</span>
                      <span class="info-value">{{ task.project_code || 'N/A' }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">截止时间:</span>
                      <span
                        class="info-value due-date"
                        :class="{ overdue: isOverdue(task.deadline) }"
                      >
                        {{ task.deadline ? formatDate(task.deadline) : '无' }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="task-actions">
                  <button class="action-btn view-btn" @click.stop="viewTaskDetail(task)">
                    查看详情
                  </button>
                  <button class="action-btn process-btn" @click.stop="startProcessTask(task)">
                    开始处理
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 已处理任务 -->
          <div class="task-section" v-if="completedTasks.length > 0">
            <h3 class="section-title">
              <span class="section-icon">✅</span>
              已处理任务
              <span class="section-count">{{ completedTasks.length }}</span>
            </h3>
            <div class="task-cards">
              <div
                v-for="task in completedTasks"
                :key="task.id"
                class="task-card completed"
                @click="handleTaskClick(task)"
              >
                <div class="task-card-header">
                  <div class="task-type">
                    <span class="task-type-icon">{{ getTaskIcon(task.task_type) }}</span>
                    <span class="task-type-text">{{ getTaskTypeText(task.task_type) }}</span>
                  </div>
                  <div class="task-status completed">已处理</div>
                </div>

                <div class="task-content">
                  <h4 class="task-title">{{ task.title }}</h4>
                  <p class="task-description">{{ task.description }}</p>

                  <div class="task-meta">
                    <div class="meta-item">
                      <span class="meta-icon">👤</span>
                      <span>{{ task.applicant_name || '未知申请人' }}</span>
                    </div>
                    <div class="meta-item">
                      <span class="meta-icon">✅</span>
                      <span>{{ formatDate(task.processed_at || task.updated_at) }}</span>
                    </div>
                  </div>

                  <div class="task-info">
                    <div class="info-item">
                      <span class="info-label">处理结果:</span>
                      <span class="info-value result" :class="task.review_result">
                        {{ getResultText(task.review_result) }}
                      </span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">处理人:</span>
                      <span class="info-value">{{ task.processed_by_name || '未知' }}</span>
                    </div>
                  </div>
                </div>

                <div class="task-actions">
                  <button class="action-btn view-btn" @click.stop="viewTaskDetail(task)">
                    查看详情
                  </button>
                  <button class="action-btn review-btn" @click.stop="reviewTask(task)">
                    审核记录
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="pagination.total > pagination.pageSize" class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.currentPage"
            v-model:page-size="pagination.pageSize"
            :total="pagination.total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </main>

    <!-- 任务详情弹窗 -->
    <el-dialog
      v-model="showTaskDetail"
      :title="currentTask?.title"
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-if="currentTask" class="task-detail-content">
        <!-- 任务基本信息 -->
        <div class="detail-section">
          <h4 class="detail-title">任务信息</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">任务类型:</span>
              <span class="detail-value">{{ getTaskTypeText(currentTask.task_type) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">优先级:</span>
              <span class="detail-value" :class="currentTask.priority">
                {{ getPriorityText(currentTask.priority) }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">状态:</span>
              <span class="detail-value status" :class="currentTask.status">
                {{ getStatusText(currentTask.status) }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">创建时间:</span>
              <span class="detail-value">{{ formatDate(currentTask.created_at) }}</span>
            </div>
          </div>
        </div>

        <!-- 申请人信息 -->
        <div class="detail-section" v-if="currentTask.applicant_name">
          <h4 class="detail-title">申请人信息</h4>
          <div class="applicant-info">
            <div class="applicant-avatar">{{ currentTask.applicant_name.charAt(0) }}</div>
            <div class="applicant-details">
              <div class="applicant-name">{{ currentTask.applicant_name }}</div>
              <div class="applicant-meta">
                <span class="meta-item">
                  <span class="meta-icon">📧</span>
                  <span>{{ currentTask.applicant_email || '暂无邮箱' }}</span>
                </span>
                <span class="meta-item">
                  <span class="meta-icon">🏢</span>
                  <span>{{ currentTask.applicant_department || '未设置部门' }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 任务详情 -->
        <div class="detail-section">
          <h4 class="detail-title">任务详情</h4>
          <div class="detail-content">
            <p>{{ currentTask.detailed_description || currentTask.description }}</p>
          </div>
        </div>

        <!-- 相关材料 -->
        <div
          class="detail-section"
          v-if="currentTask.attachments && currentTask.attachments.length > 0"
        >
          <h4 class="detail-title">相关材料</h4>
          <div class="attachment-list">
            <div
              v-for="attachment in currentTask.attachments"
              :key="attachment.id"
              class="attachment-item"
            >
              <div class="attachment-icon">📎</div>
              <div class="attachment-info">
                <div class="attachment-name">{{ attachment.name }}</div>
                <div class="attachment-meta">
                  <span class="attachment-size">{{ formatFileSize(attachment.size) }}</span>
                  <span class="attachment-date">{{ formatDate(attachment.date) }}</span>
                </div>
              </div>
              <button class="download-btn" @click="downloadAttachment(attachment)">下载</button>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <button class="dialog-btn cancel-btn" @click="showTaskDetail = false">关闭</button>
          <button
            v-if="currentTask?.status === 'pending'"
            class="dialog-btn primary-btn"
            @click="startProcessTask(currentTask)"
          >
            开始处理
          </button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const showFilterPanel = ref(false)
const showTaskDetail = ref(false)
const currentTask = ref<any>(null)

// 筛选条件
const filters = ref({
  taskTypes: [] as string[],
  statuses: [] as string[],
  priorities: [] as string[],
  dateRange: [] as string[],
  keyword: '',
})

// 分页数据
const pagination = ref({
  currentPage: 1,
  pageSize: 20,
  total: 0,
})

// 统计数据
const stats = ref({
  total: 0,
  pending: 0,
  completed: 0,
})

// 任务数据
const tasks = ref<any[]>([])

// 常量定义
const taskTypes = [
  { value: 'project_review', label: '项目审核' },
  { value: 'funding_review', label: '经费审核' },
  { value: 'expenditure_review', label: '支出审核' },
  { value: 'achievement_review', label: '成果审核' },
]

const taskStatuses = [
  { value: 'pending', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

const priorities = [
  { value: 'urgent', label: '紧急' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
]

// 计算属性
const filteredTasks = computed(() => {
  let filtered = [...tasks.value]

  // 按任务类型筛选
  if (filters.value.taskTypes.length > 0) {
    filtered = filtered.filter((task) => filters.value.taskTypes.includes(task.task_type))
  }

  // 按状态筛选
  if (filters.value.statuses.length > 0) {
    filtered = filtered.filter((task) => filters.value.statuses.includes(task.status))
  }

  // 按优先级筛选
  if (filters.value.priorities.length > 0) {
    filtered = filtered.filter((task) => filters.value.priorities.includes(task.priority))
  }

  // 按时间范围筛选
  if (filters.value.dateRange && filters.value.dateRange.length === 2) {
    const [startDate, endDate] = filters.value.dateRange
    filtered = filtered.filter((task) => {
      const taskDate = new Date(task.created_at).toISOString().split('T')[0]
      return taskDate >= startDate && taskDate <= endDate
    })
  }

  // 关键词搜索
  if (filters.value.keyword) {
    const keyword = filters.value.keyword.toLowerCase()
    filtered = filtered.filter(
      (task) =>
        task.title.toLowerCase().includes(keyword) ||
        task.description.toLowerCase().includes(keyword) ||
        (task.applicant_name && task.applicant_name.toLowerCase().includes(keyword)) ||
        (task.project_code && task.project_code.toLowerCase().includes(keyword)),
    )
  }

  return filtered
})

const pendingTasks = computed(() => {
  return filteredTasks.value.filter(
    (task) => task.status === 'pending' || task.status === 'processing',
  )
})

const completedTasks = computed(() => {
  return filteredTasks.value.filter((task) => task.status === 'completed')
})

// 方法定义
const getTaskIcon = (taskType: string) => {
  const iconMap: Record<string, string> = {
    project_review: '📋',
    funding_review: '💰',
    expenditure_review: '💸',
    achievement_review: '🏆',
  }
  return iconMap[taskType] || '📝'
}

const getTaskTypeText = (taskType: string) => {
  const typeMap: Record<string, string> = {
    project_review: '项目审核',
    funding_review: '经费审核',
    expenditure_review: '支出审核',
    achievement_review: '成果审核',
  }
  return typeMap[taskType] || '未知类型'
}

const getPriorityText = (priority: string) => {
  const priorityMap: Record<string, string> = {
    urgent: '紧急',
    high: '高',
    medium: '中',
    low: '低',
  }
  return priorityMap[priority] || '未知'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return statusMap[status] || '未知'
}

const getResultText = (result: string) => {
  const resultMap: Record<string, string> = {
    approved: '通过',
    rejected: '拒绝',
    returned: '退回修改',
    cancelled: '取消',
  }
  return resultMap[result] || '未知'
}

const getTaskPriorityClass = (priority: string) => {
  const classMap: Record<string, string> = {
    urgent: 'priority-urgent',
    high: 'priority-high',
    medium: 'priority-medium',
    low: 'priority-low',
  }
  return classMap[priority] || ''
}

const formatDate = (dateString: string | Date) => {
  if (!dateString) return '-'

  try {
    const date = dateString instanceof Date ? dateString : new Date(dateString)
    if (isNaN(date.getTime())) return '-'

    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '-'
  }
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const isOverdue = (deadline: string) => {
  if (!deadline) return false
  const deadlineDate = new Date(deadline)
  return deadlineDate < new Date()
}

// 数据加载
const loadTasks = async () => {
  loading.value = true

  try {
    console.log('正在加载审核任务...')

    // 调用API获取任务数据
    const response = await request.get('/api/assistant/tasks', {
      params: {
        page: pagination.value.currentPage,
        pageSize: pagination.value.pageSize,
        ...getFilterParams(),
      },
    })

    if (response.success && response.data) {
      tasks.value = response.data.tasks || []
      pagination.value.total = response.data.total || 0
      stats.value = response.data.stats || { total: 0, pending: 0, completed: 0 }

      console.log(`✅ 加载了 ${tasks.value.length} 个审核任务`)
    } else {
      // 使用模拟数据
      showMockData()
    }
  } catch (error) {
    console.error('加载审核任务失败:', error)
    ElMessage.error('加载审核任务失败')
    showMockData()
  } finally {
    loading.value = false
  }
}

const showMockData = () => {
  console.log('使用模拟数据')

  // 模拟任务数据
  tasks.value = [
    {
      id: 'task_001',
      task_type: 'project_review',
      title: '人工智能在医疗诊断中的应用研究项目审核',
      description: '新提交的AI医疗项目需要审核',
      priority: 'high',
      status: 'pending',
      applicant_name: '张三教授',
      applicant_email: 'zhangsan@example.com',
      applicant_department: '计算机学院',
      project_code: 'RES-2024-001',
      created_at: '2024-01-25T09:30:00',
      deadline: '2024-01-30T23:59:59',
      detailed_description:
        '该项目旨在研究人工智能在医疗影像诊断中的应用，需要审核项目可行性、创新性和预算合理性。',
      attachments: [
        { id: 'file_001', name: '项目申请书.pdf', size: 2048000, date: '2024-01-25' },
        { id: 'file_002', name: '预算明细表.xlsx', size: 512000, date: '2024-01-25' },
      ],
    },
    {
      id: 'task_002',
      task_type: 'funding_review',
      title: '材料研发项目经费申请审核',
      description: '新材料项目申请50万元经费',
      priority: 'urgent',
      status: 'pending',
      applicant_name: '李四博士',
      applicant_department: '材料学院',
      project_code: 'RES-2024-002',
      created_at: '2024-01-24T14:20:00',
      deadline: '2024-01-26T23:59:59',
      detailed_description: '经费用于购买实验设备和材料，需要审核经费申请的合理性和必要性。',
    },
    {
      id: 'task_003',
      task_type: 'expenditure_review',
      title: '设备购置支出审核',
      description: '高性能计算机采购支出申请',
      priority: 'medium',
      status: 'processing',
      applicant_name: '王五研究员',
      project_code: 'RES-2024-003',
      created_at: '2024-01-23T11:15:00',
    },
    {
      id: 'task_004',
      task_type: 'achievement_review',
      title: '论文成果审核',
      description: '新发表的SCI论文成果',
      priority: 'low',
      status: 'completed',
      applicant_name: '赵六教授',
      project_code: 'RES-2024-004',
      created_at: '2024-01-22T08:45:00',
      processed_at: '2024-01-23T15:30:00',
      processed_by_name: '科研助理001',
      review_result: 'approved',
    },
  ]

  // 计算统计数据
  stats.value = {
    total: tasks.value.length,
    pending: tasks.value.filter((t) => t.status === 'pending').length,
    completed: tasks.value.filter((t) => t.status === 'completed').length,
  }

  pagination.value.total = tasks.value.length
}

const getFilterParams = () => {
  const params: any = {}

  if (filters.value.taskTypes.length > 0) {
    params.taskTypes = filters.value.taskTypes.join(',')
  }

  if (filters.value.statuses.length > 0) {
    params.statuses = filters.value.statuses.join(',')
  }

  if (filters.value.priorities.length > 0) {
    params.priorities = filters.value.priorities.join(',')
  }

  if (filters.value.dateRange && filters.value.dateRange.length === 2) {
    params.startDate = filters.value.dateRange[0]
    params.endDate = filters.value.dateRange[1]
  }

  if (filters.value.keyword) {
    params.keyword = filters.value.keyword
  }

  return params
}

// 筛选功能
const applyFilters = () => {
  pagination.value.currentPage = 1
  loadTasks()
}

const clearFilters = () => {
  filters.value = {
    taskTypes: [],
    statuses: [],
    priorities: [],
    dateRange: [],
    keyword: '',
  }
  applyFilters()
}

const toggleFilterPanel = () => {
  showFilterPanel.value = !showFilterPanel.value
}

// 分页功能
const handleSizeChange = (size: number) => {
  pagination.value.pageSize = size
  loadTasks()
}

const handleCurrentChange = (page: number) => {
  pagination.value.currentPage = page
  loadTasks()
}

// 任务操作
const handleTaskClick = (task: any) => {
  viewTaskDetail(task)
}

const viewTaskDetail = (task: any) => {
  currentTask.value = task
  showTaskDetail.value = true
}

const startProcessTask = (task: any) => {
  // 根据任务类型跳转到不同的审核页面
  const routeMap: Record<string, string> = {
    project_review: '/audit/projects',
    funding_review: '/audit/funding',
    expenditure_review: '/audit/expenditures',
    achievement_review: '/audit/achievements',
  }

  const route = routeMap[task.task_type]
  if (route) {
    router.push(`${route}?taskId=${task.id}`)
  } else {
    ElMessage.warning('该任务类型暂不支持直接处理')
  }
}

const reviewTask = (task: any) => {
  // 查看审核记录
  ElMessage.info('查看审核记录功能开发中...')
}

const downloadAttachment = (attachment: any) => {
  ElMessage.info(`下载附件: ${attachment.name}`)
}

const refreshData = () => {
  loadTasks()
}

// 初始化
onMounted(() => {
  loadTasks()
})
</script>

<style scoped>
.audit-task-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20px;
}

/* 页面标题 */
.page-header {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 28px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  min-width: 80px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #b31b1b;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: #666;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.refresh-btn,
.filter-toggle-btn {
  padding: 8px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: white;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s;
}

.refresh-btn:hover,
.filter-toggle-btn:hover {
  background: #f5f5f5;
  border-color: #999;
}

.btn-icon {
  font-size: 16px;
}

/* 筛选面板 */
.filter-panel {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.filter-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-label {
  font-size: 14px;
  font-weight: 500;
  color: #2c3e50;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.filter-option input[type='checkbox'] {
  cursor: pointer;
}

.option-text {
  font-size: 13px;
  color: #666;
}

.date-filter {
  width: 100%;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.filter-clear-btn,
.filter-apply-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.filter-clear-btn {
  border: 1px solid #d9d9d9;
  background: white;
  color: #666;
}

.filter-clear-btn:hover {
  background: #f5f5f5;
}

.filter-apply-btn {
  border: none;
  background: #b31b1b;
  color: white;
}

.filter-apply-btn:hover {
  background: #c44747;
}

/* 主要内容 */
.main-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* 加载状态 */
.loading-container {
  text-align: center;
  padding: 60px 0;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #b31b1b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80px 40px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 20px;
  color: #2c3e50;
  margin-bottom: 8px;
}

.empty-state p {
  color: #666;
  margin-bottom: 24px;
}

.empty-action-btn {
  padding: 10px 24px;
  background: #b31b1b;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.empty-action-btn:hover {
  background: #c44747;
}

/* 任务区域 */
.task-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  font-size: 20px;
}

.section-count {
  background: #f0f0f0;
  color: #666;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: 8px;
}

/* 任务卡片 */
.task-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
}

.task-card {
  background: white;
  border: 1px solid #e8e8e8;
  border-left: 4px solid #b31b1b;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.task-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.task-card.completed {
  border-left-color: #b31b1b;
  opacity: 0.9;
}

.task-card.priority-urgent {
  border-left-color: #ff4d4f;
  background: linear-gradient(to right, #fff2f0 0%, white 10%);
}

.task-card.priority-high {
  border-left-color: #b31b1b;
  background: linear-gradient(to right, #fff7e6 0%, white 10%);
}

.task-card.priority-medium {
  border-left-color: #b31b1b;
}

.task-card.priority-low {
  border-left-color: #7f8c8d;
}

.task-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.task-type {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-type-icon {
  font-size: 20px;
}

.task-type-text {
  font-size: 14px;
  font-weight: 500;
  color: #2c3e50;
}

.task-priority,
.task-status {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.task-priority.urgent {
  background: #ffccc7;
  color: #cf1322;
}

.task-priority.high {
  background: #ffd591;
  color: #d46b08;
}

.task-priority.medium {
  background: #bae7ff;
  color: #8b1515;
}

.task-priority.low {
  background: #f0f0f0;
  color: #666;
}

.task-status.completed {
  background: #d9f7be;
  color: #8b1515;
}

.task-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.task-description {
  font-size: 14px;
  color: #666;
  margin-bottom: 16px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.task-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #7f8c8d;
}

.meta-icon {
  opacity: 0.7;
}

.task-info {
  background: #fafafa;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-label {
  font-size: 13px;
  color: #666;
}

.info-value {
  font-size: 13px;
  font-weight: 500;
  color: #2c3e50;
}

.info-value.due-date.overdue {
  color: #ff4d4f;
}

.info-value.result.approved {
  color: #b31b1b;
}

.info-value.result.rejected {
  color: #ff4d4f;
}

.task-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.view-btn {
  border: 1px solid #d9d9d9;
  background: white;
  color: #666;
}

.view-btn:hover {
  background: #f5f5f5;
}

.process-btn {
  border: none;
  background: #b31b1b;
  color: white;
}

.process-btn:hover {
  background: #c44747;
}

.review-btn {
  border: 1px solid #b31b1b;
  background: #f6ffed;
  color: #b31b1b;
}

.review-btn:hover {
  background: #d9f7be;
}

/* 分页 */
.pagination-container {
  display: flex;
  justify-content: center;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}

/* 任务详情弹窗 */
.task-detail-content {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 10px;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #f0f0f0;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 13px;
  color: #666;
}

.detail-value {
  font-size: 14px;
  font-weight: 500;
  color: #2c3e50;
}

.detail-value.urgent {
  color: #ff4d4f;
}

.detail-value.high {
  color: #b31b1b;
}

.detail-value.status.completed {
  color: #b31b1b;
}

/* 申请人信息 */
.applicant-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.applicant-avatar {
  width: 48px;
  height: 48px;
  background: #b31b1b;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
}

.applicant-details {
  flex: 1;
}

.applicant-name {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.applicant-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #666;
}

/* 附件列表 */
.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  background: #fafafa;
}

.attachment-icon {
  font-size: 20px;
}

.attachment-info {
  flex: 1;
}

.attachment-name {
  font-size: 14px;
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 2px;
}

.attachment-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #7f8c8d;
}

.download-btn {
  padding: 6px 12px;
  border: 1px solid #b31b1b;
  background: white;
  color: #b31b1b;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
}

.download-btn:hover {
  background: rgba(179,27,27,0.06);
}

/* 弹窗底部按钮 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.dialog-btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.cancel-btn {
  border: 1px solid #d9d9d9;
  background: white;
  color: #666;
}

.cancel-btn:hover {
  background: #f5f5f5;
}

.primary-btn {
  border: none;
  background: #b31b1b;
  color: white;
}

.primary-btn:hover {
  background: #c44747;
}

/* 响应式设计 */
@media (max-width: 992px) {
  .task-cards {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

@media (max-width: 768px) {
  .page-header {
    padding: 16px;
  }

  .header-content {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    flex-direction: column;
    gap: 12px;
  }

  .header-stats {
    width: 100%;
    justify-content: space-between;
  }

  .action-buttons {
    width: 100%;
    justify-content: flex-end;
  }

  .filter-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .task-cards {
    grid-template-columns: 1fr;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 576px) {
  .audit-task-page {
    padding: 12px;
  }

  .main-content {
    padding: 16px;
  }

  .task-actions {
    flex-direction: column;
    gap: 8px;
  }

  .action-btn {
    width: 100%;
  }
}
</style>
