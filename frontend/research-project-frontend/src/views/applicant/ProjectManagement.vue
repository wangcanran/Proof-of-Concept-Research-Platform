<!-- src/views/applicant/ProjectManagement.vue -->
<template>
  <div class="project-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1>项目管理</h1>
        <div class="header-subtitle">
          共 {{ totalProjects }} 个项目
          <span v-if="loading" class="loading-indicator">加载中...</span>
        </div>
      </div>
      <div class="header-actions">
        <router-link to="/projects/create" class="create-btn">
          <span>+</span> 申报新项目
        </router-link>
        <button class="refresh-btn" @click="loadProjects" :disabled="loading">
          🔄 {{ loading ? '刷新中...' : '刷新' }}
        </button>
      </div>
    </div>

    <!-- 数据库状态提示 -->
    <div v-if="showDebugInfo" class="db-status-bar">
      <div class="db-status-content">
        <span class="db-status-label">📊 API状态：</span>
        <span class="db-status-value" :class="{ connected: dbConnected }">
          {{ dbConnected ? '✅ 已连接' : '❌ 未连接' }}
        </span>
        <span class="db-user-info" v-if="currentUser">
          当前用户：{{ currentUser.name }} ({{ currentUser.role }})
        </span>
        <button @click="toggleDebugInfo" class="db-toggle-btn">
          {{ showDebugInfo ? '隐藏' : '显示' }}调试
        </button>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMessage" class="error-alert">
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <span class="error-text">{{ errorMessage }}</span>
        <button @click="errorMessage = ''" class="error-close">×</button>
      </div>
    </div>

    <!-- 状态筛选 -->
    <div class="status-filter">
      <div class="filter-tabs">
        <button
          v-for="tab in statusTabs"
          :key="tab.value"
          class="filter-tab"
          :class="{ active: activeTab === tab.value }"
          @click="changeTab(tab.value)"
          :disabled="loading"
        >
          {{ tab.label }}
          <span class="tab-count">{{ getTabCount(tab.value) }}</span>
        </button>
      </div>

      <div class="search-box">
        <input
          type="text"
          v-model="searchKeyword"
          placeholder="搜索项目标题、编号..."
          @input="handleSearch"
          :disabled="loading"
        />
        <button class="search-btn" :disabled="loading">🔍</button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading && allProjects.length === 0" class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">正在加载项目数据...</div>
    </div>

    <!-- 项目列表 -->
    <div class="project-list">
      <div v-if="!loading && filteredProjects.length === 0" class="empty-state">
        <div class="empty-icon">📁</div>
        <h3>暂无项目</h3>
        <p>您还没有{{ activeTabName }}的项目</p>
        <router-link to="/projects/create" class="empty-action"> 开始第一个项目申报 → </router-link>
      </div>

      <div v-else-if="filteredProjects.length > 0" class="projects-grid">
        <div
          v-for="project in paginatedProjects"
          :key="project.id"
          class="project-card"
          @click="viewProject(project.id)"
        >
          <div class="project-header">
            <div class="project-title">{{ project.title }}</div>
            <div class="project-status" :class="project.status">
              {{ getStatusText(project.status) }}
            </div>
          </div>

          <div class="project-meta">
            <div class="meta-item">
              <span class="meta-label">项目编号：</span>
              <span class="meta-value">{{ project.project_code || '待生成' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">项目类型：</span>
              <span class="meta-value">{{ project.category || '未分类' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">研究期限：</span>
              <span class="meta-value"
                >{{ formatDate(project.start_date) }} 至 {{ formatDate(project.end_date) }}</span
              >
            </div>
            <div class="meta-item">
              <span class="meta-label">经费预算：</span>
              <span class="meta-value">¥ {{ formatAmount(project.budget_total || 0) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">研究周期：</span>
              <span class="meta-value">{{ project.duration_months || 0 }} 个月</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">创建时间：</span>
              <span class="meta-value">{{ formatDateTime(project.created_at) }}</span>
            </div>
          </div>

          <div class="project-progress">
            <div class="progress-label">项目进度</div>
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: getProgressWidth(project.status) + '%' }"
                :class="getProgressClass(project.status)"
              ></div>
            </div>
            <div class="progress-text">{{ getProgressText(project.status) }}</div>
          </div>

          <div class="project-actions">
            <template v-if="project.status === 'draft'">
              <button class="action-btn primary" @click.stop="editProject(project.id)">
                继续编辑
              </button>
              <button class="action-btn danger" @click.stop="deleteProject(project.id)">
                删除草稿
              </button>
            </template>

            <template
              v-else-if="project.status === 'submitted' || project.status === 'under_review'"
            >
              <button class="action-btn secondary" @click.stop="viewDetails(project.id)">
                查看详情
              </button>
              <button class="action-btn" @click.stop="trackProgress(project.id)">跟踪进度</button>
            </template>

            <template v-else>
              <button class="action-btn secondary" @click.stop="viewDetails(project.id)">
                查看详情
              </button>
              <button
                class="action-btn"
                v-if="project.status === 'rejected'"
                @click.stop="resubmitProject(project.id)"
              >
                重新提交
              </button>
              <button
                class="action-btn"
                v-if="project.status === 'approved' || project.status === 'in_progress'"
                @click.stop="trackProgress(project.id)"
              >
                项目进展
              </button>
            </template>
          </div>

          <div class="project-footer">
            <span class="footer-item">
              <span class="footer-icon">📅</span>
              {{ formatDate(project.created_at) }}
            </span>
            <span class="footer-item">
              <span class="footer-icon">👤</span>
              {{ currentUser?.name || '申请人' }}
            </span>
            <span class="footer-item">
              <span class="footer-icon">📊</span>
              研究领域：{{ project.research_field || '未指定' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="filteredProjects.length > pageSize && !loading" class="pagination">
      <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">上一页</button>

      <span class="page-info"> 第 {{ currentPage }} 页 / 共 {{ totalPages }} 页 </span>

      <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">
        下一页
      </button>
    </div>

    <!-- 删除确认对话框 -->
    <div v-if="showDeleteConfirm" class="modal-overlay">
      <div class="modal-content">
        <h3>确认删除</h3>
        <p>确定要删除项目 "{{ deleteProjectTitle }}" 吗？删除后无法恢复。</p>

        <div class="modal-actions">
          <button
            class="modal-btn secondary"
            @click="showDeleteConfirm = false"
            :disabled="deleting"
          >
            取消
          </button>
          <button class="modal-btn danger" @click="confirmDelete" :loading="deleting">
            {{ deleting ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const router = useRouter()

// API配置
const API_BASE_URL = 'http://localhost:3002/api'

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

    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      ElMessage.error('登录已过期，请重新登录')
      router.push('/login')
    }

    return Promise.reject(error)
  },
)

// 状态管理
const loading = ref(false)
const deleting = ref(false)
const dbConnected = ref(false)
const showDebugInfo = ref(import.meta.env.DEV)
const errorMessage = ref('')

// 用户信息
interface User {
  id: string
  username: string
  name: string
  email: string
  role: string
  department?: string
  title?: string
}

const currentUser = ref<User | null>(null)

// 项目数据接口
interface Project {
  id: string
  project_code?: string
  title: string
  category: string
  research_field: string
  abstract: string
  keywords: string
  background: string
  objectives: string
  methodology: string
  expected_outcomes: string
  budget_total: number
  duration_months: number
  start_date?: string
  end_date?: string
  status: string
  created_at: string
  updated_at?: string
  applicant_id: string
  current_stage?: number
  remarks?: string
}

// 筛选和分页
const activeTab = ref('all')
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(8)
const totalProjects = ref(0)

// 删除相关
const showDeleteConfirm = ref(false)
const deleteProjectId = ref('')
const deleteProjectTitle = ref('')

// 状态选项卡
const statusTabs = [
  { value: 'all', label: '全部项目' },
  { value: 'draft', label: '草稿箱' },
  { value: 'submitted', label: '已提交' },
  { value: 'under_review', label: '评审中' },
  { value: 'approved', label: '已立项' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'rejected', label: '已驳回' },
  { value: 'stage_review', label: '阶段评审' },
  { value: 'terminated', label: '已终止' },
]

// 计算属性
const activeTabName = computed(() => {
  const tab = statusTabs.find((t) => t.value === activeTab.value)
  return tab ? tab.label : ''
})

const allProjects = ref<Project[]>([])

const filteredProjects = computed(() => {
  let projects = [...allProjects.value]

  // 按状态筛选
  if (activeTab.value !== 'all') {
    projects = projects.filter((p) => p.status === activeTab.value)
  }

  // 搜索筛选
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase().trim()
    projects = projects.filter(
      (p) =>
        (p.title && p.title.toLowerCase().includes(keyword)) ||
        (p.project_code && p.project_code.toLowerCase().includes(keyword)) ||
        (p.keywords && p.keywords.toLowerCase().includes(keyword)) ||
        (p.abstract && p.abstract.toLowerCase().includes(keyword)) ||
        (p.research_field && p.research_field.toLowerCase().includes(keyword)),
    )
  }

  // 按创建时间倒序排序
  return projects.sort((a, b) => {
    const timeA = new Date(a.created_at).getTime()
    const timeB = new Date(b.created_at).getTime()
    return timeB - timeA
  })
})

const paginatedProjects = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredProjects.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredProjects.value.length / pageSize.value)
})

// 方法
const changeTab = (tab: string) => {
  activeTab.value = tab
  currentPage.value = 1
}

const getTabCount = (tab: string) => {
  if (tab === 'all') return allProjects.value.length
  return allProjects.value.filter((p) => p.status === tab).length
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    under_review: '评审中',
    approved: '已立项',
    in_progress: '进行中',
    completed: '已完成',
    rejected: '已驳回',
    stage_review: '阶段评审',
    terminated: '已终止',
  }
  return statusMap[status] || status
}

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const formatDate = (dateString?: string) => {
  if (!dateString) return '未设置'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  } catch {
    return dateString
  }
}

const formatDateTime = (dateString?: string) => {
  if (!dateString) return ''
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

const getProgressWidth = (status: string) => {
  const progressMap: Record<string, number> = {
    draft: 25,
    submitted: 50,
    under_review: 75,
    approved: 90,
    in_progress: 60,
    completed: 100,
    rejected: 25,
    stage_review: 80,
    terminated: 100,
  }
  return progressMap[status] || 0
}

const getProgressClass = (status: string) => {
  const classMap: Record<string, string> = {
    draft: 'draft',
    submitted: 'submitted',
    under_review: 'reviewing',
    approved: 'approved',
    in_progress: 'in_progress',
    completed: 'completed',
    rejected: 'rejected',
    stage_review: 'stage_review',
  }
  return classMap[status] || ''
}

const getProgressText = (status: string) => {
  const textMap: Record<string, string> = {
    draft: '待提交',
    submitted: '等待学院审核',
    under_review: '专家评审中',
    approved: '已立项，准备启动',
    in_progress: '项目执行中',
    completed: '项目已完成',
    rejected: '已驳回，请修改',
    stage_review: '阶段评审中',
    terminated: '项目已终止',
  }
  return textMap[status] || ''
}

// 加载用户信息
const loadCurrentUser = async () => {
  try {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      currentUser.value = JSON.parse(userStr)
    }
  } catch (error) {
    console.error('加载用户信息失败:', error)
  }
}

// 加载项目列表
const loadProjects = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    console.log('🔄 从数据库加载项目列表...')

    // 调用后端API获取项目列表
    const response = await api.get('/projects')
    console.log('项目列表响应:', response)

    if (response.success && response.data) {
      allProjects.value = response.data
      totalProjects.value = response.total || response.data.length
      dbConnected.value = true

      console.log(`✅ 成功加载 ${allProjects.value.length} 个项目`)

      // 如果没有数据，可以显示提示
      if (allProjects.value.length === 0) {
        ElMessage.info('您还没有创建任何项目')
      }
    } else {
      errorMessage.value = response.error || '加载项目列表失败'
      ElMessage.error('加载项目列表失败')
    }
  } catch (error: any) {
    console.error('❌ 加载项目列表失败:', error)
    errorMessage.value = error.message || '网络错误，请检查后端服务'
    dbConnected.value = false
    ElMessage.error('加载项目失败，请检查网络连接')
  } finally {
    loading.value = false
  }
}

// 项目操作
const viewProject = (projectId: string) => {
  router.push(`/projects/detail/${projectId}`)
}

const editProject = (projectId: string) => {
  router.push(`/projects/edit/${projectId}`)
}

const viewDetails = (projectId: string) => {
  router.push(`/projects/detail/${projectId}`)
}

const trackProgress = (projectId: string) => {
  router.push(`/projects/progress/${projectId}`)
}

const resubmitProject = (projectId: string) => {
  router.push(`/projects/edit/${projectId}`)
}

const deleteProject = (projectId: string) => {
  const project = allProjects.value.find((p) => p.id === projectId)
  if (project) {
    deleteProjectId.value = projectId
    deleteProjectTitle.value = project.title
    showDeleteConfirm.value = true
  }
}

const confirmDelete = async () => {
  deleting.value = true
  try {
    console.log('🗑️ 删除项目:', deleteProjectId.value)

    // 调用后端API删除项目
    const response = await api.delete(`/projects/${deleteProjectId.value}`)

    if (response.success) {
      // 从列表中移除
      allProjects.value = allProjects.value.filter((p) => p.id !== deleteProjectId.value)
      totalProjects.value = allProjects.value.length

      ElMessage.success('项目删除成功')
      showDeleteConfirm.value = false
    } else {
      ElMessage.error(response.error || '删除失败')
    }
  } catch (error: any) {
    console.error('删除项目失败:', error)
    ElMessage.error(error.message || '删除失败')
  } finally {
    deleting.value = false
    deleteProjectId.value = ''
    deleteProjectTitle.value = ''
  }
}

const handleSearch = () => {
  currentPage.value = 1
}

// 调试信息
const toggleDebugInfo = () => {
  showDebugInfo.value = !showDebugInfo.value
}

// 初始化
onMounted(async () => {
  console.log('🚀 ProjectManagement 组件初始化')

  // 加载用户信息
  await loadCurrentUser()

  // 加载项目
  await loadProjects()

  console.log('当前用户:', currentUser.value)
  console.log('项目数量:', allProjects.value.length)
})
</script>

<style scoped>
.project-management {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 24px;
}

/* 页面标题 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-left h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #2c3e50;
}

.header-subtitle {
  color: #666;
  font-size: 14px;
}

.loading-indicator {
  color: #1890ff;
  margin-left: 10px;
  font-size: 12px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #1890ff;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s;
}

.create-btn:hover {
  background: #40a9ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
}

.create-btn span {
  font-size: 18px;
  font-weight: bold;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #f5f7fa;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s;
  cursor: pointer;
}

.refresh-btn:hover:not(:disabled) {
  background: #e8e8e8;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 数据库状态栏 */
.db-status-bar {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 8px;
  padding: 12px 20px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.db-status-content {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.db-status-label {
  font-weight: bold;
  color: #52c41a;
}

.db-status-value {
  font-weight: bold;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 14px;
}

.db-status-value.connected {
  background: #d9f7be;
  color: #389e0d;
}

.db-status-value:not(.connected) {
  background: #fff2f0;
  color: #ff4d4f;
}

.db-user-info {
  color: #666;
  font-size: 14px;
}

.db-toggle-btn {
  padding: 4px 12px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  margin-left: auto;
}

/* 错误提示 */
.error-alert {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 8px;
  padding: 12px 20px;
  margin-bottom: 20px;
}

.error-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.error-icon {
  font-size: 20px;
}

.error-text {
  flex: 1;
  color: #ff4d4f;
}

.error-close {
  background: none;
  border: none;
  font-size: 20px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 状态筛选 */
.status-filter {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.filter-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.filter-tab {
  padding: 8px 16px;
  border: none;
  background: #f5f7fa;
  color: #666;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-tab:hover:not(:disabled) {
  background: #e8e8e8;
}

.filter-tab.active {
  background: #1890ff;
  color: white;
}

.filter-tab:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tab-count {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-box input {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  width: 300px;
}

.search-box input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.search-box input:disabled {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

.search-btn {
  padding: 8px 16px;
  background: #f5f7fa;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
}

.search-btn:hover:not(:disabled) {
  background: #e8e8e8;
}

.search-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-text {
  color: #1890ff;
  font-weight: bold;
}

/* 项目列表 */
.project-list {
  margin-bottom: 24px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  font-size: 60px;
  margin-bottom: 20px;
  opacity: 0.6;
}

.empty-state h3 {
  margin: 0 0 12px 0;
  color: #2c3e50;
}

.empty-state p {
  margin: 0 0 24px 0;
  color: #666;
}

.empty-action {
  display: inline-block;
  padding: 10px 24px;
  background: #1890ff;
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 500;
}

.empty-action:hover {
  background: #40a9ff;
}

/* 项目卡片网格 */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
}

@media (max-width: 768px) {
  .projects-grid {
    grid-template-columns: 1fr;
  }
}

.project-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  cursor: pointer;
  border: 1px solid transparent;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: #1890ff;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.project-title {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.4;
  flex: 1;
  margin-right: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-status {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.project-status.draft {
  background: #fff7e6;
  color: #fa8c16;
}

.project-status.submitted {
  background: #e6f7ff;
  color: #1890ff;
}

.project-status.under_review {
  background: #fff0f6;
  color: #eb2f96;
}

.project-status.approved {
  background: #f6ffed;
  color: #52c41a;
}

.project-status.in_progress {
  background: #f0f5ff;
  color: #2f54eb;
}

.project-status.completed {
  background: #f6ffed;
  color: #52c41a;
}

.project-status.rejected {
  background: #fff2f0;
  color: #ff4d4f;
}

.project-status.stage_review {
  background: #fff7e6;
  color: #fa8c16;
}

.project-status.terminated {
  background: #f5f5f5;
  color: #8c8c8c;
}

/* 项目元信息 */
.project-meta {
  margin-bottom: 20px;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.meta-item:last-child {
  margin-bottom: 0;
}

.meta-label {
  color: #666;
  min-width: 80px;
}

.meta-value {
  color: #2c3e50;
  font-weight: 500;
  text-align: right;
  flex: 1;
  margin-left: 12px;
}

/* 进度条 */
.project-progress {
  margin-bottom: 20px;
}

.progress-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.progress-bar {
  height: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.progress-fill.draft {
  background: #fa8c16;
}

.progress-fill.submitted {
  background: #1890ff;
}

.progress-fill.reviewing {
  background: #eb2f96;
}

.progress-fill.approved {
  background: #52c41a;
}

.progress-fill.in_progress {
  background: #2f54eb;
}

.progress-fill.completed {
  background: #52c41a;
}

.progress-fill.rejected {
  background: #ff4d4f;
}

.progress-fill.stage_review {
  background: #fa8c16;
}

.progress-text {
  font-size: 12px;
  color: #999;
  text-align: right;
}

/* 项目操作按钮 */
.project-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.action-btn {
  flex: 1;
  padding: 8px 16px;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn:hover {
  background: #f5f5f5;
}

.action-btn.primary {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}

.action-btn.primary:hover {
  background: #40a9ff;
}

.action-btn.secondary {
  background: #f6ffed;
  color: #52c41a;
  border-color: #b7eb8f;
}

.action-btn.secondary:hover {
  background: #d9f7be;
}

.action-btn.danger {
  background: #fff2f0;
  color: #ff4d4f;
  border-color: #ffccc7;
}

.action-btn.danger:hover {
  background: #ffccc7;
}

/* 项目页脚 */
.project-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  font-size: 12px;
  color: #999;
}

.footer-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.footer-icon {
  font-size: 14px;
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.page-btn {
  padding: 8px 16px;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.page-btn:hover:not(:disabled) {
  background: #f5f5f5;
  border-color: #1890ff;
  color: #1890ff;
}

.page-btn:disabled {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #666;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 32px;
  max-width: 400px;
  width: 90%;
  text-align: center;
}

.modal-content h3 {
  margin: 0 0 16px 0;
  color: #2c3e50;
}

.modal-content p {
  margin: 0 0 24px 0;
  color: #666;
  line-height: 1.6;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.modal-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  min-width: 120px;
  transition: all 0.3s;
}

.modal-btn.secondary {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #d9d9d9;
}

.modal-btn.secondary:hover:not(:disabled) {
  background: #e8e8e8;
}

.modal-btn.secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-btn.danger {
  background: #ff4d4f;
  color: white;
}

.modal-btn.danger:hover:not(:disabled) {
  background: #ff7875;
}

.modal-btn.danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 响应式调整 */
@media (max-width: 992px) {
  .status-filter {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .filter-tabs {
    justify-content: center;
  }

  .search-box {
    width: 100%;
  }

  .search-box input {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .project-management {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-actions {
    flex-direction: column;
  }

  .filter-tabs {
    overflow-x: auto;
    padding-bottom: 8px;
  }

  .filter-tab {
    flex-shrink: 0;
  }

  .project-card {
    padding: 20px;
  }

  .project-footer {
    flex-direction: column;
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .project-actions {
    flex-direction: column;
  }

  .modal-actions {
    flex-direction: column;
  }

  .modal-btn {
    width: 100%;
  }
}
</style>
