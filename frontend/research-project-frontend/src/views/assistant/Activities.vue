<!-- src/views/assistant/Activities.vue -->
<template>
  <div class="activities-management assistant-ruc-theme">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">活动日志</h1>
        <div class="page-description">查看系统中的所有操作记录，支持筛选和导出</div>
      </div>
      <div class="header-right">
        <el-button @click="exportLogs" :icon="Download">导出日志</el-button>
        <el-button @click="refreshData" :icon="Refresh">刷新</el-button>
        <el-button type="primary" @click="showFilterPanel = !showFilterPanel" :icon="Filter">
          筛选
        </el-button>
      </div>
    </div>

    <!-- 筛选面板 -->
    <div v-if="showFilterPanel" class="filter-panel">
      <div class="filter-row">
        <div class="filter-item">
          <label class="filter-label">操作类型：</label>
          <el-select
            v-model="filter.action"
            placeholder="全部操作类型"
            clearable
            multiple
            collapse-tags
            collapse-tags-tooltip
            style="width: 300px"
          >
            <el-option
              v-for="action in actionOptions"
              :key="action.value"
              :label="action.label"
              :value="action.value"
            />
          </el-select>
        </div>

        <div class="filter-item">
          <label class="filter-label">操作表：</label>
          <el-select
            v-model="filter.table_name"
            placeholder="全部数据表"
            clearable
            multiple
            collapse-tags
            collapse-tags-tooltip
            style="width: 250px"
          >
            <el-option
              v-for="table in tableOptions"
              :key="table.value"
              :label="table.label"
              :value="table.value"
            />
          </el-select>
        </div>

        <div class="filter-item">
          <label class="filter-label">操作人：</label>
          <el-select
            v-model="filter.user_id"
            placeholder="全部操作人"
            clearable
            filterable
            remote
            :remote-method="searchUsers"
            :loading="userSearchLoading"
            style="width: 250px"
          >
            <el-option
              v-for="user in userOptions"
              :key="user.id"
              :label="`${user.name} (${user.username})`"
              :value="user.id"
            />
          </el-select>
        </div>
      </div>

      <div class="filter-row">
        <div class="filter-item">
          <label class="filter-label">时间范围：</label>
          <el-date-picker
            v-model="filter.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 320px"
          />
        </div>

        <div class="filter-item">
          <label class="filter-label">IP地址：</label>
          <el-input
            v-model="filter.ip_address"
            placeholder="搜索IP地址"
            clearable
            style="width: 200px"
          />
        </div>

        <div class="filter-item">
          <label class="filter-label">关键词：</label>
          <el-input
            v-model="filter.keyword"
            placeholder="搜索内容"
            clearable
            style="width: 250px"
          />
        </div>
      </div>

      <div class="filter-actions">
        <el-button type="primary" @click="handleSearch" :icon="Search"> 搜索 </el-button>
        <el-button @click="resetFilters">重置</el-button>
        <el-button type="text" @click="showFilterPanel = false"> 收起筛选 </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card" @click="filterByAction('login')">
        <div class="stat-icon" style="background: #b31b1b20; color: #b31b1b">
          <el-icon><User /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.loginCount || 0 }}</div>
          <div class="stat-label">登录记录</div>
        </div>
      </div>

      <div class="stat-card" @click="filterByAction('project')">
        <div class="stat-icon" style="background: rgba(179, 27, 27, 0.12); color: #b31b1b">
          <el-icon><Folder /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.projectCount || 0 }}</div>
          <div class="stat-label">项目操作</div>
        </div>
      </div>

      <div class="stat-card" @click="filterByAction('funding')">
        <div class="stat-icon" style="background: #b31b1b20; color: #b31b1b">
          <el-icon><Money /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.fundingCount || 0 }}</div>
          <div class="stat-label">经费操作</div>
        </div>
      </div>

      <div class="stat-card" @click="filterByAction('achievement')">
        <div class="stat-icon" style="background: #b31b1b20; color: #b31b1b">
          <el-icon><Trophy /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.achievementCount || 0 }}</div>
          <div class="stat-label">成果操作</div>
        </div>
      </div>

      <div class="stat-card" @click="filterByTime('today')">
        <div class="stat-icon" style="background: #b31b1b20; color: #b31b1b">
          <el-icon><Clock /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.todayCount || 0 }}</div>
          <div class="stat-label">今日记录</div>
        </div>
      </div>
    </div>

    <!-- 日志列表 -->
    <div class="logs-container">
      <div class="logs-header">
        <div class="logs-title">
          <h3>操作日志</h3>
          <span class="total-count">共 {{ pagination.total }} 条记录</span>
        </div>
        <div class="logs-actions">
          <el-button-group>
            <el-button
              :type="viewMode === 'list' ? 'primary' : ''"
              @click="viewMode = 'list'"
              size="small"
            >
              列表视图
            </el-button>
            <el-button
              :type="viewMode === 'timeline' ? 'primary' : ''"
              @click="viewMode = 'timeline'"
              size="small"
            >
              时间线视图
            </el-button>
          </el-button-group>
        </div>
      </div>

      <!-- 列表视图 -->
      <div v-if="viewMode === 'list'" class="list-view">
        <el-table
          :data="logs"
          v-loading="loading"
          stripe
          style="width: 100%"
          @row-click="viewLogDetail"
        >
          <el-table-column prop="id" label="日志ID" width="80" />

          <el-table-column prop="created_at" label="时间" width="180">
            <template #default="{ row }">
              <div class="time-cell">
                <div class="time-date">{{ formatDate(row.created_at) }}</div>
                <div class="time-clock">{{ formatTime(row.created_at) }}</div>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="user_name" label="操作人" width="140">
            <template #default="{ row }">
              <div class="user-cell" v-if="row.user_name">
                <div class="user-avatar-small">{{ getInitial(row.user_name) }}</div>
                <div class="user-info">
                  <div class="user-name">{{ row.user_name }}</div>
                  <div class="user-role">{{ getRoleText(row.user_role) }}</div>
                </div>
              </div>
              <span v-else class="system-user">系统</span>
            </template>
          </el-table-column>

          <el-table-column prop="action" label="操作类型" width="120">
            <template #default="{ row }">
              <el-tag :type="getActionTagType(row.action)" size="small">
                {{ getActionText(row.action) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="table_name" label="操作表" width="120">
            <template #default="{ row }">
              <el-tag type="info" size="small">
                {{ getTableText(row.table_name) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="description" label="操作描述" min-width="200">
            <template #default="{ row }">
              <div class="description-cell">
                {{ getLogDescription(row) }}
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="ip_address" label="IP地址" width="140">
            <template #default="{ row }">
              <span class="ip-address">{{ row.ip_address || 'N/A' }}</span>
            </template>
          </el-table-column>

          <el-table-column label="详情" width="80" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click.stop="viewLogDetail(row)"> 查看 </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.current"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[20, 50, 100, 200]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>

      <!-- 时间线视图 -->
      <div v-else class="timeline-view">
        <div v-loading="loading" class="timeline-container">
          <div v-for="(dayLogs, date) in groupedLogs" :key="date" class="timeline-day">
            <div class="timeline-day-header">
              <span class="day-date">{{ date }}</span>
              <span class="day-count">{{ dayLogs.length }} 条记录</span>
            </div>

            <div class="timeline-items">
              <div
                v-for="log in dayLogs"
                :key="log.id"
                class="timeline-item"
                @click="viewLogDetail(log)"
              >
                <div class="timeline-dot" :class="getTimelineDotClass(log.action)"></div>
                <div class="timeline-content">
                  <div class="timeline-time">{{ formatTime(log.created_at) }}</div>
                  <div class="timeline-main">
                    <div class="timeline-user">
                      <span class="user-avatar-mini">{{ getInitial(log.user_name) }}</span>
                      <span class="user-name">{{ log.user_name || '系统' }}</span>
                      <el-tag :type="getActionTagType(log.action)" size="small">
                        {{ getActionText(log.action) }}
                      </el-tag>
                    </div>
                    <div class="timeline-description">
                      {{ getLogDescription(log) }}
                    </div>
                    <div class="timeline-meta">
                      <span class="table-name">{{ getTableText(log.table_name) }}</span>
                      <span v-if="log.ip_address" class="ip-address">
                        <el-icon><Location /></el-icon>
                        {{ log.ip_address }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="logs.length === 0" class="empty-timeline">
            <el-empty description="暂无日志记录" />
          </div>
        </div>
      </div>
    </div>

    <!-- 日志详情对话框 -->
    <el-dialog v-model="detailDialog.visible" title="日志详情" width="800px" destroy-on-close>
      <div v-if="detailDialog.log" class="log-detail">
        <div class="detail-section">
          <h3 class="section-title">基本信息</h3>
          <div class="info-grid">
            <div class="info-item">
              <label class="info-label">日志ID：</label>
              <span class="info-value">{{ detailDialog.log.id }}</span>
            </div>
            <div class="info-item">
              <label class="info-label">操作时间：</label>
              <span class="info-value">{{ formatDateTime(detailDialog.log.created_at) }}</span>
            </div>
            <div class="info-item">
              <label class="info-label">操作人：</label>
              <span class="info-value">
                {{ detailDialog.log.user_name || '系统' }}
                <span v-if="detailDialog.log.user_role" class="user-role">
                  ({{ getRoleText(detailDialog.log.user_role) }})
                </span>
              </span>
            </div>
            <div class="info-item">
              <label class="info-label">操作类型：</label>
              <el-tag :type="getActionTagType(detailDialog.log.action)" size="small">
                {{ getActionText(detailDialog.log.action) }}
              </el-tag>
            </div>
            <div class="info-item">
              <label class="info-label">操作表：</label>
              <el-tag type="info" size="small">
                {{ getTableText(detailDialog.log.table_name) }}
              </el-tag>
            </div>
            <div class="info-item">
              <label class="info-label">记录ID：</label>
              <span class="info-value">{{ detailDialog.log.record_id || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <label class="info-label">IP地址：</label>
              <span class="info-value">{{ detailDialog.log.ip_address || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <label class="info-label">用户代理：</label>
              <span class="info-value user-agent">
                {{ detailDialog.log.user_agent || 'N/A' }}
              </span>
            </div>
          </div>
        </div>

        <div class="detail-section" v-if="detailDialog.log.description">
          <h3 class="section-title">操作描述</h3>
          <div class="description-box">
            {{ detailDialog.log.description }}
          </div>
        </div>

        <div
          class="detail-section"
          v-if="detailDialog.log.old_values || detailDialog.log.new_values"
        >
          <h3 class="section-title">数据变更详情</h3>
          <div class="data-change">
            <div v-if="detailDialog.log.old_values" class="data-panel">
              <div class="panel-title">修改前</div>
              <div class="json-viewer">
                <pre>{{ formatJSON(detailDialog.log.old_values) }}</pre>
              </div>
            </div>
            <div v-if="detailDialog.log.new_values" class="data-panel">
              <div class="panel-title">修改后</div>
              <div class="json-viewer">
                <pre>{{ formatJSON(detailDialog.log.new_values) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailDialog.visible = false">关闭</el-button>
          <el-button type="primary" @click="copyLogId" v-if="detailDialog.log">
            复制日志ID
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import request from '@/utils/request'
import {
  Download,
  Refresh,
  Filter,
  Search,
  User,
  Folder,
  Money,
  Trophy,
  Clock,
  Location,
} from '@element-plus/icons-vue'
import { useClipboard } from '@vueuse/core'

const { copy } = useClipboard()

// 响应式数据
const loading = ref(false)
const showFilterPanel = ref(true)
const viewMode = ref<'list' | 'timeline'>('list')
const userSearchLoading = ref(false)

// 筛选条件
const filter = reactive({
  action: [] as string[],
  table_name: [] as string[],
  user_id: '',
  dateRange: [] as string[],
  ip_address: '',
  keyword: '',
})

// 分页
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
})

// 统计数据
const stats = reactive({
  loginCount: 0,
  projectCount: 0,
  fundingCount: 0,
  achievementCount: 0,
  todayCount: 0,
  totalCount: 0,
})

// 日志数据
const logs = ref<any[]>([])
const userOptions = ref<any[]>([])

// 详情对话框
const detailDialog = reactive({
  visible: false,
  log: null as any,
})

// 操作类型选项
const actionOptions = [
  { value: 'login', label: '登录' },
  { value: 'logout', label: '登出' },
  { value: 'create', label: '创建' },
  { value: 'update', label: '更新' },
  { value: 'delete', label: '删除' },
  { value: 'submit', label: '提交' },
  { value: 'review', label: '审核' },
  { value: 'approve', label: '批准' },
  { value: 'reject', label: '拒绝' },
  { value: 'export', label: '导出' },
  { value: 'import', label: '导入' },
  { value: 'download', label: '下载' },
  { value: 'upload', label: '上传' },
]

// 表名选项
const tableOptions = [
  { value: 'User', label: '用户表' },
  { value: 'Project', label: '项目表' },
  { value: 'ProjectMember', label: '项目成员' },
  { value: 'ProjectBudget', label: '项目预算' },
  { value: 'ProjectAchievement', label: '项目成果' },
  { value: 'ProjectReview', label: '项目评审' },
  { value: 'ProjectStage', label: '项目阶段' },
  { value: 'Notification', label: '通知' },
  { value: 'FileStorage', label: '文件存储' },
]

// 计算属性：按日期分组的时间线数据
const groupedLogs = computed(() => {
  const groups: Record<string, any[]> = {}

  logs.value.forEach((log) => {
    const date = formatDate(log.created_at)
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(log)
  })

  return groups
})

// 工具函数
const getInitial = (name: string) => {
  return name ? name.charAt(0).toUpperCase() : '?'
}

const getRoleText = (role: string) => {
  const map: Record<string, string> = {
    applicant: '申请人',
    reviewer: '评审专家',
    project_manager: '科研助理',
    admin: '管理员',
  }
  return map[role] || role
}

const getActionText = (action: string) => {
  const map: Record<string, string> = {
    login: '登录',
    logout: '登出',
    create: '创建',
    update: '更新',
    delete: '删除',
    submit: '提交',
    review: '审核',
    approve: '批准',
    reject: '拒绝',
    export: '导出',
    import: '导入',
    download: '下载',
    upload: '上传',
  }
  return map[action] || action
}

const getActionTagType = (action: string) => {
  const map: Record<string, string> = {
    login: 'success',
    logout: 'info',
    create: 'primary',
    update: 'warning',
    delete: 'danger',
    submit: '',
    review: 'success',
    approve: 'success',
    reject: 'danger',
    export: 'info',
    import: 'info',
    download: 'info',
    upload: 'info',
  }
  return map[action] || 'info'
}

const getTableText = (table: string) => {
  const map: Record<string, string> = {
    User: '用户',
    Project: '项目',
    ProjectMember: '项目成员',
    ProjectBudget: '项目预算',
    ProjectAchievement: '项目成果',
    ProjectReview: '项目评审',
    ProjectStage: '项目阶段',
    Notification: '通知',
    FileStorage: '文件',
    AuditLog: '审计日志',
  }
  return map[table] || table
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const formatJSON = (jsonString: string) => {
  try {
    const obj = JSON.parse(jsonString)
    return JSON.stringify(obj, null, 2)
  } catch {
    return jsonString
  }
}

const getLogDescription = (log: any) => {
  const action = getActionText(log.action)
  const table = getTableText(log.table_name)

  let description = `${action}${table}`

  // 根据不同的操作类型添加具体描述
  if (log.description) {
    return log.description
  }

  if (log.record_id) {
    description += ` (ID: ${log.record_id})`
  }

  if (log.user_name) {
    description += ` - 操作人: ${log.user_name}`
  }

  return description
}

const getTimelineDotClass = (action: string) => {
  const map: Record<string, string> = {
    login: 'dot-success',
    logout: 'dot-info',
    create: 'dot-primary',
    update: 'dot-warning',
    delete: 'dot-danger',
    submit: 'dot-primary',
    review: 'dot-success',
    approve: 'dot-success',
    reject: 'dot-danger',
  }
  return map[action] || 'dot-info'
}

// 数据加载
const loadLogs = async () => {
  loading.value = true

  try {
    const params = {
      page: pagination.current,
      pageSize: pagination.pageSize,
      actions: filter.action.length > 0 ? filter.action.join(',') : undefined,
      tables: filter.table_name.length > 0 ? filter.table_name.join(',') : undefined,
      user_id: filter.user_id || undefined,
      start_date: filter.dateRange?.[0] || undefined,
      end_date: filter.dateRange?.[1] || undefined,
      ip_address: filter.ip_address || undefined,
      keyword: filter.keyword || undefined,
    }

    const response = await request.get('/api/assistant/activities', { params })

    if (response.success) {
      logs.value = response.data.logs
      pagination.total = response.data.pagination.total

      // 更新统计数据
      if (response.data.stats) {
        Object.assign(stats, response.data.stats)
      }
    }
  } catch (error) {
    console.error('加载日志数据失败:', error)
    ElMessage.error('加载日志数据失败')
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const response = await request.get('/api/assistant/activities/stats')
    if (response.success) {
      Object.assign(stats, response.data)
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

// 搜索用户
const searchUsers = async (query: string) => {
  if (!query.trim()) {
    userOptions.value = []
    return
  }

  userSearchLoading.value = true
  try {
    const response = await request.get('/api/assistant/users/search', {
      params: { keyword: query },
    })

    if (response.success) {
      userOptions.value = response.data
    }
  } catch (error) {
    console.error('搜索用户失败:', error)
  } finally {
    userSearchLoading.value = false
  }
}

// 搜索和筛选
const handleSearch = () => {
  pagination.current = 1
  loadLogs()
}

const resetFilters = () => {
  filter.action = []
  filter.table_name = []
  filter.user_id = ''
  filter.dateRange = []
  filter.ip_address = ''
  filter.keyword = ''
  pagination.current = 1
  loadLogs()
}

const filterByAction = (action: string) => {
  if (!filter.action.includes(action)) {
    filter.action = [action]
  } else {
    filter.action = []
  }
  pagination.current = 1
  loadLogs()
}

const filterByTime = (timeRange: string) => {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  switch (timeRange) {
    case 'today':
      filter.dateRange = [today.toISOString().split('T')[0], today.toISOString().split('T')[0]]
      break
    case 'week':
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      filter.dateRange = [weekAgo.toISOString().split('T')[0], today.toISOString().split('T')[0]]
      break
    case 'month':
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      filter.dateRange = [monthAgo.toISOString().split('T')[0], today.toISOString().split('T')[0]]
      break
  }

  pagination.current = 1
  loadLogs()
}

// 分页处理
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.current = 1
  loadLogs()
}

const handleCurrentChange = (page: number) => {
  pagination.current = page
  loadLogs()
}

// 日志操作
const viewLogDetail = (log: any) => {
  detailDialog.log = log
  detailDialog.visible = true
}

const copyLogId = async () => {
  if (!detailDialog.log) return

  try {
    await copy(detailDialog.log.id)
    ElMessage.success('日志ID已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

// 导出功能
const exportLogs = async () => {
  try {
    const params = {
      actions: filter.action.length > 0 ? filter.action.join(',') : undefined,
      tables: filter.table_name.length > 0 ? filter.table_name.join(',') : undefined,
      user_id: filter.user_id || undefined,
      start_date: filter.dateRange?.[0] || undefined,
      end_date: filter.dateRange?.[1] || undefined,
      keyword: filter.keyword || undefined,
    }

    const response = await request.get('/api/assistant/activities/export', {
      params,
      responseType: 'blob',
    })

    const url = window.URL.createObjectURL(new Blob([response]))
    const link = document.createElement('a')
    link.href = url
    const fileName = `audit_logs_${new Date().getTime()}.csv`
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    link.remove()

    ElMessage.success('日志导出成功')
  } catch (error) {
    console.error('导出日志失败:', error)
    ElMessage.error('导出日志失败')
  }
}

const refreshData = () => {
  loadLogs()
  loadStats()
}

// 初始化
onMounted(() => {
  loadLogs()
  loadStats()
})
</script>

<style scoped>
.activities-management {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 70px);
}

/* 页面标题栏 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.header-left {
  flex: 1;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

.page-description {
  margin: 0;
  color: #7f8c8d;
  font-size: 14px;
}

.header-right {
  display: flex;
  gap: 12px;
}

/* 筛选面板 */
.filter-panel {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 16px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 14px;
  color: #2c3e50;
  white-space: nowrap;
  min-width: 70px;
}

.filter-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: #7f8c8d;
}

/* 日志容器 */
.logs-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
}

.logs-header {
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logs-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logs-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.total-count {
  font-size: 14px;
  color: #7f8c8d;
}

/* 列表视图 */
.list-view {
  padding: 0 24px;
}

.time-cell {
  display: flex;
  flex-direction: column;
}

.time-date {
  font-size: 13px;
  color: #2c3e50;
  font-weight: 500;
}

.time-clock {
  font-size: 12px;
  color: #7f8c8d;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar-small {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #b31b1b 0%, #8b1515 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 13px;
  font-weight: 500;
  color: #2c3e50;
}

.user-role {
  font-size: 11px;
  color: #7f8c8d;
}

.system-user {
  color: #7f8c8d;
  font-style: italic;
}

.description-cell {
  font-size: 13px;
  color: #2c3e50;
  line-height: 1.4;
}

.ip-address {
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  color: #7f8c8d;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
}

/* 时间线视图 */
.timeline-view {
  padding: 24px;
}

.timeline-container {
  max-height: 600px;
  overflow-y: auto;
  padding-right: 8px;
}

.timeline-day {
  margin-bottom: 32px;
}

.timeline-day-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #f0f0f0;
}

.day-date {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.day-count {
  font-size: 12px;
  color: #7f8c8d;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 10px;
}

.timeline-items {
  position: relative;
  padding-left: 24px;
}

.timeline-items::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #f0f0f0;
}

.timeline-item {
  position: relative;
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.timeline-item:hover {
  transform: translateX(4px);
}

.timeline-dot {
  position: absolute;
  left: -24px;
  top: 12px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 1;
}

.timeline-dot.dot-success {
  background: #b31b1b;
}

.timeline-dot.dot-info {
  background: #b31b1b;
}

.timeline-dot.dot-primary {
  background: #b31b1b;
}

.timeline-dot.dot-warning {
  background: #b31b1b;
}

.timeline-dot.dot-danger {
  background: #ff4d4f;
}

.timeline-content {
  background: #fafafa;
  border-radius: 8px;
  padding: 12px 16px;
  border: 1px solid #f0f0f0;
}

.timeline-time {
  font-size: 11px;
  color: #7f8c8d;
  margin-bottom: 4px;
}

.timeline-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.timeline-user {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar-mini {
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #b31b1b 0%, #8b1515 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
}

.timeline-description {
  font-size: 13px;
  color: #2c3e50;
  line-height: 1.4;
}

.timeline-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  color: #7f8c8d;
}

.table-name {
  background: #e8e8e8;
  padding: 2px 6px;
  border-radius: 4px;
}

.empty-timeline {
  text-align: center;
  padding: 60px 20px;
}

/* 分页 */
.pagination-container {
  padding: 20px 0;
  border-top: 1px solid #f0f0f0;
  text-align: center;
}

/* 日志详情对话框 */
.log-detail {
  max-height: 600px;
  overflow-y: auto;
  padding-right: 8px;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.info-label {
  font-size: 13px;
  color: #7f8c8d;
  white-space: nowrap;
  min-width: 80px;
}

.info-value {
  font-size: 13px;
  color: #2c3e50;
  word-break: break-all;
}

.user-role {
  color: #7f8c8d;
  font-size: 12px;
}

.user-agent {
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 12px;
}

.description-box {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 6px;
  font-size: 13px;
  color: #2c3e50;
  line-height: 1.5;
}

.data-change {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.data-panel {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
}

.panel-title {
  background: #e8e8e8;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  color: #2c3e50;
  border-bottom: 1px solid #f0f0f0;
}

.json-viewer {
  padding: 12px;
  background: #fafafa;
  max-height: 300px;
  overflow-y: auto;
}

.json-viewer pre {
  margin: 0;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  color: #2c3e50;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .stats-cards {
    grid-template-columns: repeat(3, 1fr);
  }

  .filter-row {
    flex-wrap: wrap;
  }
}

@media (max-width: 992px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .header-right {
    width: 100%;
    justify-content: flex-start;
  }

  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .data-change {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }

  .filter-item {
    width: 100%;
  }

  .filter-row {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
}
</style>
