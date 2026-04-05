<template>
  <div class="my-projects">
    <!-- 页面标题和操作 -->
    <div class="page-header">
      <div class="header-left">
        <h2>我的项目</h2>
        <div class="header-subtitle">
          共 {{ totalProjects }} 个项目
          <span v-if="loading" class="loading-indicator">加载中...</span>
        </div>
      </div>
      <div class="header-right">
        <el-button type="primary" icon="Plus" @click="goToCreateProject"> 申报新项目 </el-button>
        <el-button icon="Refresh" @click="loadProjects" :loading="loading"> 刷新 </el-button>
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

    <!-- 项目状态筛选 -->
    <div class="filter-section">
      <el-radio-group v-model="filterStatus" @change="filterProjects">
        <el-radio-button label="all">全部</el-radio-button>
        <el-radio-button label="draft">草稿</el-radio-button>
        <el-radio-button label="submitted">已提交</el-radio-button>
        <el-radio-button label="under_review">评审中</el-radio-button>
        <el-radio-button label="approved">已批准</el-radio-button>
        <el-radio-button label="in_progress">进行中</el-radio-button>
        <el-radio-button label="completed">已完成</el-radio-button>
        <el-radio-button label="rejected">已驳回</el-radio-button>
      </el-radio-group>

      <el-input
        v-model="searchKeyword"
        placeholder="搜索项目名称/编号"
        style="width: 300px; margin-left: 20px"
        clearable
        @input="searchProjects"
        :disabled="loading"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading && projects.length === 0" class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">正在加载项目数据...</div>
    </div>

    <!-- 项目列表 -->
    <div v-else-if="filteredProjects.length > 0">
      <el-table
        :data="filteredProjects"
        style="width: 100%; margin-top: 20px"
        v-loading="loading"
        :empty-text="emptyText"
      >
        <el-table-column prop="project_code" label="项目编号" width="140">
          <template #default="{ row }">
            <span class="project-code">{{ row.project_code || '未分配' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="项目名称" min-width="220">
          <template #default="{ row }">
            <div class="project-title">
              <strong>{{ row.title }}</strong>
              <div class="project-abstract" v-if="row.abstract">
                {{ row.abstract.substring(0, 80) }}{{ row.abstract.length > 80 ? '...' : '' }}
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="项目类型" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="getCategoryType(row.category)">
              {{ getCategoryText(row.category) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建日期" width="140">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="budget_total" label="预算金额" width="140">
          <template #default="{ row }">
            <span class="budget-amount"> ¥{{ formatCurrency(row.budget_total || 0) }} </span>
          </template>
        </el-table-column>
        <el-table-column prop="duration_months" label="研究周期" width="100">
          <template #default="{ row }"> {{ row.duration_months || 0 }}个月 </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="start_date" label="开始日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.start_date) || '未设置' }}
          </template>
        </el-table-column>
        <el-table-column prop="end_date" label="结束日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.end_date) || '未设置' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button
                type="primary"
                size="small"
                @click="viewProject(row.id)"
                :disabled="loading"
              >
                查看详情
              </el-button>
              <el-button
                type="warning"
                size="small"
                @click="editProject(row.id)"
                v-if="row.status === 'draft' || row.status === 'rejected'"
                :disabled="loading"
              >
                编辑
              </el-button>
              <el-button
                type="danger"
                size="small"
                @click="deleteProject(row.id)"
                v-if="row.status === 'draft'"
                :disabled="loading"
              >
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalProjects"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :disabled="loading"
        />
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="empty-icon">📋</div>
      <h3>暂无项目</h3>
      <p>您还没有创建任何项目，点击下方按钮开始申报新项目</p>
      <el-button type="primary" icon="Plus" @click="goToCreateProject"> 申报新项目 </el-button>
    </div>

    <!-- 删除确认对话框 -->
    <el-dialog v-model="deleteDialogVisible" title="删除确认" width="400px" center>
      <span>确定要删除项目 "{{ deleteProjectTitle }}" 吗？此操作不可恢复。</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deleteDialogVisible = false" :disabled="deleting"> 取消 </el-button>
          <el-button type="danger" @click="confirmDeleteProject" :loading="deleting">
            {{ deleting ? '删除中...' : '确认删除' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Refresh } from '@element-plus/icons-vue'
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

// 项目数据
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
}

const projects = ref<Project[]>([])

// 筛选和分页
const filterStatus = ref('all')
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const totalProjects = ref(0)

// 删除相关
const deleteDialogVisible = ref(false)
const deleteProjectId = ref('')
const deleteProjectTitle = ref('')

// 计算属性
const filteredProjects = computed(() => {
  let filtered = [...projects.value]

  // 状态筛选
  if (filterStatus.value !== 'all') {
    filtered = filtered.filter((p) => p.status === filterStatus.value)
  }

  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(keyword) ||
        (p.project_code && p.project_code.toLowerCase().includes(keyword)) ||
        p.abstract.toLowerCase().includes(keyword) ||
        p.keywords.toLowerCase().includes(keyword),
    )
  }

  // 分页
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filtered.slice(start, end)
})

const emptyText = computed(() => {
  if (loading.value) return '加载中...'
  if (searchKeyword.value) return '没有找到相关项目'
  if (filterStatus.value !== 'all') return `没有${getStatusText(filterStatus.value)}的项目`
  return '暂无项目'
})

// 辅助函数
const getStatusType = (status: string) => {
  const map: Record<string, any> = {
    draft: 'info',
    submitted: '',
    under_review: 'warning',
    approved: 'success',
    in_progress: 'primary',
    completed: 'info',
    rejected: 'danger',
    stage_review: 'warning',
    terminated: 'danger',
  }
  return map[status] || 'info'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    under_review: '评审中',
    approved: '已批准',
    in_progress: '进行中',
    completed: '已完成',
    rejected: '已驳回',
    stage_review: '阶段评审',
    terminated: '已终止',
  }
  return map[status] || status
}

const getCategoryType = (category: string) => {
  const map: Record<string, any> = {
    基础研究: 'primary',
    应用研究: 'success',
    技术开发: 'warning',
    成果转化: 'info',
    平台建设: '',
    其他: 'info',
  }
  return map[category] || 'info'
}

const getCategoryText = (category: string) => {
  return category || '未分类'
}

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const formatDate = (dateString?: string) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  } catch {
    return dateString
  }
}

// 加载用户信息
const loadCurrentUser = async () => {
  try {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      currentUser.value = JSON.parse(userStr)
    } else {
      // 尝试从API获取
      const response = await api.get('/auth/profile')
      if (response.success && response.user) {
        currentUser.value = response.user
        localStorage.setItem('user', JSON.stringify(response.user))
      }
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
    console.log('🔄 加载项目列表...')

    const response = await api.get('/projects')
    console.log('项目列表响应:', response)

    if (response.success && response.data) {
      projects.value = response.data
      totalProjects.value = response.total || response.data.length
      dbConnected.value = true

      console.log(`✅ 成功加载 ${projects.value.length} 个项目`)
    } else {
      errorMessage.value = response.error || '加载项目列表失败'
      ElMessage.error('加载项目列表失败')
    }
  } catch (error: any) {
    console.error('❌ 加载项目列表失败:', error)
    errorMessage.value = error.message || '网络错误，请检查后端服务是否运行'
    dbConnected.value = false

    // 测试API连接
    try {
      const testResponse = await api.get('/db/test')
      console.log('数据库测试:', testResponse)
    } catch (testError) {
      console.error('API连接测试失败:', testError)
    }
  } finally {
    loading.value = false
  }
}

// 筛选和搜索
const filterProjects = () => {
  currentPage.value = 1
}

const searchProjects = () => {
  currentPage.value = 1
}

// 导航
const goToCreateProject = () => {
  router.push('/projects/create')
}

const viewProject = (id: string) => {
  router.push(`/projects/detail/${id}`)
}

const editProject = (id: string) => {
  router.push(`/projects/edit/${id}`)
}

// 删除项目
const deleteProject = (id: string) => {
  const project = projects.value.find((p) => p.id === id)
  if (project) {
    deleteProjectId.value = id
    deleteProjectTitle.value = project.title
    deleteDialogVisible.value = true
  }
}

const confirmDeleteProject = async () => {
  deleting.value = true
  try {
    console.log('🗑️ 删除项目:', deleteProjectId.value)

    const response = await api.delete(`/projects/${deleteProjectId.value}`)

    if (response.success) {
      // 从列表中移除
      projects.value = projects.value.filter((p) => p.id !== deleteProjectId.value)
      totalProjects.value = projects.value.length

      ElMessage.success('项目删除成功')
      deleteDialogVisible.value = false
    } else {
      ElMessage.error(response.error || '删除失败')
    }
  } catch (error: any) {
    console.error('删除项目失败:', error)
    ElMessage.error(error.message || '删除失败')
  } finally {
    deleting.value = false
  }
}

// 分页
const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
}

// 调试信息
const toggleDebugInfo = () => {
  showDebugInfo.value = !showDebugInfo.value
}

// 初始化
onMounted(async () => {
  await loadCurrentUser()
  await loadProjects()

  // 自动测试API连接（开发环境）
  if (import.meta.env.DEV) {
    try {
      const testResponse = await api.get('/db/test')
      console.log('API连接测试:', testResponse)
      dbConnected.value = true
    } catch (error) {
      console.error('API连接失败:', error)
    }
  }
})
</script>

<style scoped>
.my-projects {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20px;
}

/* 页面标题 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-left h2 {
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

.header-right {
  display: flex;
  gap: 12px;
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

/* 筛选区域 */
.filter-section {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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

/* 项目表格样式 */
.project-code {
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  color: #666;
}

.project-title {
  display: flex;
  flex-direction: column;
}

.project-abstract {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  line-height: 1.4;
}

.budget-amount {
  font-weight: bold;
  color: #52c41a;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state h3 {
  margin: 0 0 12px 0;
  color: #2c3e50;
}

.empty-state p {
  color: #666;
  margin-bottom: 24px;
}

/* 分页 */
.pagination {
  margin-top: 20px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: flex-end;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .header-right {
    justify-content: flex-start;
  }

  .filter-section {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .filter-section :deep(.el-radio-group) {
    flex-wrap: wrap;
  }

  .filter-section :deep(.el-input) {
    width: 100% !important;
    margin-left: 0 !important;
  }

  .action-buttons {
    flex-direction: column;
    gap: 4px;
  }
}

@media (max-width: 480px) {
  .my-projects {
    padding: 12px;
  }

  .db-status-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
