<!-- src/views/reviewer/ReviewerProjects.vue -->
<template>
  <div class="reviewer-projects-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-workbench-box" @click="goToWorkbench">
          <el-icon class="back-icon"><ArrowLeft /></el-icon>
          <span class="back-text">返回工作台</span>
        </button>
        <h1>项目管理</h1>
        <div class="header-subtitle">
          管理您的评审任务和评审历史
        </div>
      </div>
    </div>

    <!-- 标签切换 -->
    <div class="tabs-container">
      <div class="tabs">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'pending' }"
          @click="switchTab('pending')"
        >
          <span class="tab-icon">📋</span>
          <span class="tab-text">待评审项目</span>
          <span v-if="pendingCount > 0" class="tab-badge">{{ pendingCount }}</span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'history' }"
          @click="switchTab('history')"
        >
          <span class="tab-icon">📁</span>
          <span class="tab-text">评审历史</span>
          <span v-if="historyCount > 0" class="tab-badge">{{ historyCount }}</span>
        </button>
      </div>
    </div>

    <!-- 搜索和筛选栏 -->
    <div class="filter-bar">
      <div class="search-box">
        <input
          v-model="searchKeyword"
          type="text"
          placeholder="搜索项目标题、编号、申请人..."
          @keyup.enter="handleSearch"
        />
        <button class="search-btn" @click="handleSearch">🔍</button>
      </div>
      <div class="filter-actions">
        <button type="button" class="select-export-btn" @click="selectAllForExport">全选当前列表</button>
        <button type="button" class="export-btn" @click="openProjectExport">📥 导出 Excel</button>
        <button class="refresh-btn" @click="refreshData" :disabled="loading">
          🔄 {{ loading ? '刷新中...' : '刷新' }}
        </button>
      </div>
    </div>

    <ProjectExportDialog v-model="showProjectExport" :project-ids="exportSelectedIds" />

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">正在加载项目数据...</div>
    </div>

    <!-- 待评审项目列表 -->
    <div v-else-if="activeTab === 'pending'" class="projects-section">
      <div v-if="pendingProjects.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>暂无待评审项目</h3>
        <p>当前没有需要您评审的项目</p>
      </div>
      <div v-else class="projects-grid">
        <div
          v-for="project in filteredPendingProjects"
          :key="project.id"
          class="project-card"
        >
          <div class="card-header">
            <label class="card-export-check" @click.stop>
              <input
                type="checkbox"
                :checked="exportSelectedIds.includes(project.id)"
                @change="toggleExportSelect(project.id)"
              />
            </label>
            <div class="project-title">{{ project.title }}</div>
            <div class="project-status reviewing">待评审</div>
          </div>

          <div class="project-meta">
            <div class="meta-item">
              <span class="meta-label">项目编号：</span>
              <span class="meta-value">{{ project.project_code || '待生成' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">申请人：</span>
              <span class="meta-value">{{ project.applicant_name || '未知' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">所属领域：</span>
              <span class="meta-value">{{ project.research_field || '未指定' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">经费预算：</span>
              <span class="meta-value budget">{{ formatCurrency(project.budget_total) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">评审截止：</span>
              <span class="meta-value" :class="getDeadlineClass(project.review_deadline)">
                {{ formatDate(project.review_deadline) || '未设置' }}
              </span>
            </div>
          </div>

          <div class="project-actions">
            <button class="action-btn secondary" @click.stop="viewProjectDetail(project.id, 'pending')">
              查看详情
            </button>
            <button class="action-btn primary" @click.stop="startReview(project)">
              开始评审
            </button>
          </div>

          <div class="project-footer">
            <span class="footer-item">
              <span class="footer-icon">📅</span>
              {{ formatDate(project.assigned_at) }}
            </span>
            <span class="footer-item">
              <span class="footer-icon">👤</span>
              {{ project.applicant_name || '申请人' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 评审历史列表 -->
    <div v-else-if="activeTab === 'history'" class="projects-section">
      <div v-if="historyProjects.length === 0" class="empty-state">
        <div class="empty-icon">📁</div>
        <h3>暂无评审历史</h3>
        <p>您还没有完成任何项目评审</p>
      </div>
      <div v-else class="projects-grid">
        <div
          v-for="project in filteredHistoryProjects"
          :key="project.id"
          class="project-card"
        >
          <div class="card-header">
            <label class="card-export-check" @click.stop>
              <input
                type="checkbox"
                :checked="project.project_id && exportSelectedIds.includes(project.project_id)"
                @change="toggleExportSelect(project.project_id)"
              />
            </label>
            <div class="project-title">{{ project.project_title }}</div>
            <div class="project-status" :class="getReviewStatusClass(project.recommendation)">
              {{ getReviewStatusText(project.recommendation) }}
            </div>
          </div>

          <div class="project-meta">
            <div class="meta-item">
              <span class="meta-label">项目编号：</span>
              <span class="meta-value">{{ project.project_code || '待生成' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">申请人：</span>
              <span class="meta-value">{{ project.applicant_name || '未知' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">所属领域：</span>
              <span class="meta-value">{{ project.research_field || '未指定' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">评审结论：</span>
              <span class="meta-value">
                <el-tag :type="getConclusionType(project.recommendation)" size="small">
                  {{ getConclusionText(project.recommendation) }}
                </el-tag>
              </span>
            </div>
            <div class="meta-item">
              <span class="meta-label">评审时间：</span>
              <span class="meta-value">{{ formatDate(project.review_date) }}</span>
            </div>
          </div>

          <div class="project-actions">
            <button class="action-btn secondary" @click.stop="viewProjectDetail(project.project_id, 'history')">
              查看详情
            </button>
          </div>

          <div class="project-footer">
            <span class="footer-item">
              <span class="footer-icon">📅</span>
              {{ formatDate(project.review_date) }}
            </span>
            <span class="footer-item">
              <span class="footer-icon">👤</span>
              {{ project.applicant_name || '申请人' }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import axios from 'axios'
import ProjectExportDialog from '@/components/ProjectExportDialog.vue'

const router = useRouter()
const route = useRoute()

// Props
const props = defineProps<{
  defaultTab?: string
}>()

const showProjectExport = ref(false)
const exportSelectedIds = ref<string[]>([])

// API配置
const API_BASE_URL = 'http://localhost:3002/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
      ElMessage.error('登录已过期，请重新登录')
      router.push('/login')
    }
    return Promise.reject(error)
  }
)

// 状态管理
const loading = ref(false)
const activeTab = ref<'pending' | 'history'>('pending')
const searchKeyword = ref('')

// 项目数据
const pendingProjects = ref<any[]>([])
const historyProjects = ref<any[]>([])

// 计算属性
const pendingCount = computed(() => pendingProjects.value.length)
const historyCount = computed(() => historyProjects.value.length)

const filteredPendingProjects = computed(() => {
  if (!searchKeyword.value.trim()) return pendingProjects.value
  const keyword = searchKeyword.value.toLowerCase().trim()
  return pendingProjects.value.filter(p =>
    (p.title && p.title.toLowerCase().includes(keyword)) ||
    (p.project_code && p.project_code.toLowerCase().includes(keyword)) ||
    (p.applicant_name && p.applicant_name.toLowerCase().includes(keyword))
  )
})

const filteredHistoryProjects = computed(() => {
  if (!searchKeyword.value.trim()) return historyProjects.value
  const keyword = searchKeyword.value.toLowerCase().trim()
  return historyProjects.value.filter(p =>
    (p.project_title && p.project_title.toLowerCase().includes(keyword)) ||
    (p.project_code && p.project_code.toLowerCase().includes(keyword)) ||
    (p.applicant_name && p.applicant_name.toLowerCase().includes(keyword))
  )
})

// 方法
function toggleExportSelect(projectId: string) {
  if (!projectId) return
  const i = exportSelectedIds.value.indexOf(projectId)
  if (i >= 0) {
    exportSelectedIds.value = exportSelectedIds.value.filter((id) => id !== projectId)
  } else {
    exportSelectedIds.value = [...exportSelectedIds.value, projectId]
  }
}

function selectAllForExport() {
  if (activeTab.value === 'pending') {
    exportSelectedIds.value = filteredPendingProjects.value.map((p: { id: string }) => p.id)
  } else {
    exportSelectedIds.value = filteredHistoryProjects.value
      .map((p: { project_id?: string }) => p.project_id)
      .filter((id): id is string => Boolean(id))
  }
}

function openProjectExport() {
  if (exportSelectedIds.value.length === 0) {
    ElMessage.warning('请先勾选要导出的项目，或使用「全选当前列表」')
    return
  }
  showProjectExport.value = true
}

const switchTab = (tab: 'pending' | 'history') => {
  activeTab.value = tab
  searchKeyword.value = ''
  exportSelectedIds.value = []
  // 更新URL但不刷新页面
  if (tab === 'pending') {
    router.replace('/reviewer/projects/pending')
  } else {
    router.replace('/reviewer/projects/history')
  }
}

const goToWorkbench = () => {
  router.push('/reviewer/dashboard')
}

const handleSearch = () => {
  // 搜索逻辑已通过计算属性实现
}

const refreshData = async () => {
  await loadProjects()
}

const loadProjects = async () => {
  loading.value = true
  try {
    // 加载待评审项目
    const pendingRes = await api.get('/reviewer/pending-projects', {
      params: { limit: 100 }
    })
    if (pendingRes.success) {
      pendingProjects.value = pendingRes.data || []
    }

    // 加载评审历史
    const historyRes = await api.get('/reviewer/reviews', {
      params: { limit: 100 }
    })
    if (historyRes.success) {
      historyProjects.value = historyRes.data || []
    }
  } catch (error) {
    console.error('加载项目失败:', error)
    ElMessage.error('加载项目数据失败')
  } finally {
    loading.value = false
  }
}

const viewProjectDetail = (projectId: string, source: 'pending' | 'history') => {
  // 传递来源参数，区分待评审和评审历史
  router.push(`/reviewer/project-detail/${projectId}?from=${source}`)
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

// 格式化方法
const formatDate = (dateString?: string) => {
  if (!dateString) return '未设置'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  } catch {
    return dateString
  }
}

const formatCurrency = (amount: number) => {
  if (!amount) return '¥0'
  const num = Number(amount)
  if (num >= 100000000) return '¥' + (num / 100000000).toFixed(2) + '亿'
  if (num >= 10000) return '¥' + (num / 10000).toFixed(2) + '万'
  return '¥' + num.toFixed(2)
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

const getReviewStatusClass = (recommendation: string) => {
  if (recommendation === 'approve') return 'approved'
  if (recommendation === 'reject') return 'rejected'
  return 'reviewing'
}

const getReviewStatusText = (recommendation: string) => {
  if (recommendation === 'approve') return '已通过'
  if (recommendation === 'reject') return '未通过'
  return '已评审'
}

const getConclusionType = (conclusion: string) => {
  const map: Record<string, string> = {
    approve: 'success',
    approve_with_revision: 'warning',
    reject: 'danger',
    resubmit: 'info',
  }
  return map[conclusion] || 'info'
}

const getConclusionText = (conclusion: string) => {
  const map: Record<string, string> = {
    approve: '通过',
    approve_with_revision: '修改后通过',
    reject: '不通过',
    resubmit: '重新提交',
  }
  return map[conclusion] || conclusion
}

// 监听props变化
watch(() => props.defaultTab, (newTab) => {
  if (newTab === 'pending' || newTab === 'history') {
    activeTab.value = newTab
  }
}, { immediate: true })

// 初始化
onMounted(async () => {
  await loadProjects()
})
</script>

<style scoped>
.reviewer-projects-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 24px;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.header-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.back-workbench-box {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 18px;
  border: 1px solid rgba(179, 27, 27, 0.35);
  border-radius: 8px;
  background: linear-gradient(180deg, #fffbfb 0%, #fff5f5 100%);
  color: #b31b1b;
  font-size: 15px;
  font-weight: 500;
  font-family: 'STZhongsong', '华文中宋', 'SimSun', serif;
  cursor: pointer;
  transition: all 0.2s;
}

.back-workbench-box:hover {
  background: #fff0f0;
  border-color: #b31b1b;
  box-shadow: 0 2px 8px rgba(179, 27, 27, 0.12);
}

.back-workbench-box .back-icon {
  font-size: 18px;
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

/* 标签切换 */
.tabs-container {
  margin-bottom: 24px;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.tabs {
  display: flex;
  gap: 12px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  background: #f5f7fa;
  color: #666;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-btn:hover {
  background: #e8e8e8;
}

.tab-btn.active {
  background: #b31b1b;
  color: white;
}

.tab-icon {
  font-size: 18px;
}

.tab-badge {
  background: rgba(255, 255, 255, 0.3);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  margin-left: 4px;
}

.tab-btn.active .tab-badge {
  background: rgba(255, 255, 255, 0.25);
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-box input {
  padding: 10px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  width: 320px;
}

.search-box input:focus {
  outline: none;
  border-color: #b31b1b;
  box-shadow: 0 0 0 2px rgba(179, 27, 27, 0.2);
}

.search-btn {
  padding: 10px 16px;
  background: #b31b1b;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.filter-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.export-btn {
  padding: 10px 20px;
  background: linear-gradient(180deg, #fff5f5 0%, #ffecec 100%);
  border: 1px solid rgba(179, 27, 27, 0.35);
  border-radius: 8px;
  color: #b31b1b;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.export-btn:hover {
  background: #fff0f0;
  border-color: #b31b1b;
}

.select-export-btn {
  padding: 10px 16px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
}

.select-export-btn:hover {
  border-color: #b31b1b;
  color: #b31b1b;
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

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #b31b1b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  color: #b31b1b;
  font-weight: bold;
}

/* 项目列表 */
.projects-section {
  margin-bottom: 24px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
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

/* 项目卡片网格 */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
  cursor: pointer;
  border: 1px solid transparent;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: #b31b1b;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  gap: 8px;
}

.card-export-check {
  flex-shrink: 0;
  padding-top: 2px;
  cursor: pointer;
}

.card-export-check input {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #b31b1b;
}

.project-title {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.4;
  flex: 1;
  margin-right: 12px;
  min-width: 0;
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

.project-status.reviewing {
  background: #f0f5ff;
  color: #2f54eb;
}

.project-status.approved {
  background: #f6ffed;
  color: #52c41a;
}

.project-status.rejected {
  background: #fff2f0;
  color: #ff4d4f;
}

/* 项目元信息 */
.project-meta {
  margin-bottom: 20px;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}

.meta-item:last-child {
  margin-bottom: 0;
}

.meta-label {
  color: #999;
  min-width: 80px;
}

.meta-value {
  color: #2c3e50;
  font-weight: 500;
  text-align: right;
  flex: 1;
  margin-left: 12px;
}

.meta-value.budget {
  color: #e6a23c;
}

.meta-value.expired {
  color: #ff4d4f;
  font-weight: bold;
}

.meta-value.urgent {
  color: #fa8c16;
  font-weight: bold;
}

.meta-value.warning {
  color: #fadb14;
}

/* 项目操作按钮 */
.project-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.action-btn {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
}

.action-btn:hover {
  background: #f5f5f5;
}

.action-btn.primary {
  background: #b31b1b;
  color: white;
  border-color: #b31b1b;
}

.action-btn.primary:hover {
  background: #8b0000;
}

.action-btn.secondary {
  background: #f6ffed;
  color: #52c41a;
  border-color: #b7eb8f;
}

.action-btn.secondary:hover {
  background: #d9f7be;
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

/* 响应式调整 */
@media (max-width: 992px) {
  .filter-bar {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .search-box input {
    width: 100%;
  }

  .tabs {
    overflow-x: auto;
    flex-wrap: nowrap;
  }

  .tab-btn {
    flex-shrink: 0;
  }
}

@media (max-width: 768px) {
  .reviewer-projects-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .back-workbench-box {
    width: 100%;
    justify-content: center;
  }

  .project-card {
    padding: 20px;
  }

  .project-actions {
    flex-direction: column;
  }

  .project-footer {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
