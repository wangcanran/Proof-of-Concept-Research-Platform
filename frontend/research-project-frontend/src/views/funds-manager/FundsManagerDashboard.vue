<!-- 经费管理员工作台 -->
<template>
  <div class="dashboard-container assistant-ruc-theme">
    <aside
      class="sidebar"
      :class="{ 'sidebar-collapsed': sidebarCollapsed, show: showMobileMenu }"
    >
      <div class="sidebar-header">
        <div class="logo-area">
          <img
            src="@/views/picture/university-logo.png"
            alt="人大校徽"
            class="sidebar-logo"
            @error="handleLogoError"
          />
          <h3 v-if="!sidebarCollapsed" class="sidebar-title">概念验证平台</h3>
        </div>
        <button class="sidebar-toggle" @click="toggleSidebar">
          {{ sidebarCollapsed ? '→' : '←' }}
        </button>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section">
          <router-link to="/" class="nav-link">
            <span class="nav-icon">🌐</span>
            <span v-if="!sidebarCollapsed" class="nav-text">平台首页</span>
          </router-link>
        </div>

        <div class="nav-section">
          <h4 v-if="!sidebarCollapsed" class="nav-section-title">工作台</h4>
          <router-link to="/funds-manager/dashboard" class="nav-link" active-class="active">
            <span class="nav-icon">🏠</span>
            <span v-if="!sidebarCollapsed" class="nav-text">工作台</span>
          </router-link>
        </div>

        <div class="nav-section">
          <h4 v-if="!sidebarCollapsed" class="nav-section-title">项目管理</h4>
          <router-link to="/funds-manager/projects" class="nav-link" active-class="active">
            <span class="nav-icon">📁</span>
            <span v-if="!sidebarCollapsed" class="nav-text">在研项目</span>
          </router-link>
        </div>

        <div class="nav-section">
          <h4 v-if="!sidebarCollapsed" class="nav-section-title">经费管理</h4>
          <router-link to="/funds-manager/funds-usage" class="nav-link" active-class="active">
            <span class="nav-icon">💵</span>
            <span v-if="!sidebarCollapsed" class="nav-text">经费使用汇总</span>
          </router-link>
          <router-link to="/funds-manager/funds-request/apply" class="nav-link" active-class="active">
            <span class="nav-icon">📝</span>
            <span v-if="!sidebarCollapsed" class="nav-text">经费申请</span>
          </router-link>
          <router-link to="/funds-manager/requests" class="nav-link" active-class="active">
            <span class="nav-icon">✅</span>
            <span v-if="!sidebarCollapsed" class="nav-text">申请审核</span>
            <span v-if="!sidebarCollapsed && overview.pendingRequests > 0" class="nav-badge">
              {{ overview.pendingRequests }}
            </span>
          </router-link>
          <router-link
            to="/funds-manager/requests?status=feedback_given"
            class="nav-link"
            active-class="active"
          >
            <span class="nav-icon">✅</span>
            <span v-if="!sidebarCollapsed" class="nav-text">已反馈申请</span>
          </router-link>
        </div>

        <div class="nav-section">
          <h4 v-if="!sidebarCollapsed" class="nav-section-title">其他</h4>
          <router-link to="/notifications" class="nav-link">
            <span class="nav-icon">🔔</span>
            <span v-if="!sidebarCollapsed" class="nav-text">通知中心</span>
          </router-link>
          <router-link to="/profile" class="nav-link">
            <span class="nav-icon">👤</span>
            <span v-if="!sidebarCollapsed" class="nav-text">个人中心</span>
          </router-link>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info-mini">
          <div class="user-avatar-mini">{{ userInitial }}</div>
          <div v-if="!sidebarCollapsed" class="user-details">
            <div class="user-name-mini">{{ userName }}</div>
            <div class="user-role-mini">经费管理员</div>
          </div>
        </div>
      </div>
    </aside>

    <div class="main-wrapper" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <header class="dashboard-header">
        <div class="header-left">
          <div class="mobile-menu-btn" @click="toggleMobileMenu">
            <span class="icon">☰</span>
          </div>
          <div class="breadcrumb">
            <span class="current-page">经费管理员工作台</span>
          </div>
        </div>
        <div class="header-right">
          <div class="header-actions">
            <button class="icon-btn" @click="refreshData" title="刷新">
              <span class="icon">🔄</span>
            </button>
            <button class="logout-btn" @click="handleLogout">
              <span class="icon">🚪</span>
              退出
            </button>
          </div>
        </div>
      </header>

      <main class="main-content">
        <div class="welcome-section">
          <div class="welcome-card">
            <div class="welcome-content">
              <h2 class="welcome-title">欢迎回来，{{ userName }}！</h2>
              <p class="welcome-subtitle">今天是 {{ currentDate }}，祝您工作愉快！</p>
              <div class="quick-stats">
                <div class="stat-badge">
                  <span class="stat-value">{{ overview.pendingRequests || 0 }}</span>
                  <span class="stat-label">待审核申请</span>
                </div>
                <div class="stat-badge">
                  <span class="stat-value">{{ overview.feedbackGiven || 0 }}</span>
                  <span class="stat-label">已反馈</span>
                </div>
                <div class="stat-badge">
                  <span class="stat-value">{{ formatAmountWan(overview.pendingAmount) }} 万元</span>
                  <span class="stat-label">待审金额</span>
                </div>
                <div class="stat-badge">
                  <span class="stat-value">{{ overview.activeProjects || 0 }}</span>
                  <span class="stat-label">在研项目</span>
                </div>
                <div class="stat-badge">
                  <span class="stat-value">{{ overview.unreadMessages || 0 }}</span>
                  <span class="stat-label">未读通知</span>
                </div>
              </div>
            </div>
            <div class="welcome-illustration">
              <div class="illustration-icon">💰</div>
            </div>
          </div>
        </div>

        <div v-if="loading" class="loading-overlay">
          <div class="loading-spinner"></div>
          <div class="loading-text">正在加载数据...</div>
        </div>

        <div v-else class="dashboard-layout dashboard-layout--two-col">
          <div class="dashboard-column">
            <div class="notifications-section card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">⏳</span>
                  待审核经费申请
                </h3>
                <button class="view-all-btn" @click="navigateToRequests('pending')">查看全部 →</button>
              </div>
              <div class="applications-list">
                <div
                  v-for="item in pendingRequests"
                  :key="item.id"
                  class="application-item"
                  @click="viewRequest(item.id)"
                >
                  <div class="application-header">
                    <span class="application-id">{{ item.project_code || item.id.substring(0, 8) }}</span>
                    <span class="application-time">{{ formatTime(item.created_at) }}</span>
                  </div>
                  <div class="application-title">{{ item.project_title || '未知项目' }}</div>
                  <div class="application-info">
                    <span class="applicant">
                      <span class="applicant-icon">👤</span>
                      {{ item.applicant_name || '未知' }}
                    </span>
                    <span class="amount-tag">{{ formatAmountWan(item.total_amount) }} 万元</span>
                  </div>
                </div>
                <div v-if="pendingRequests.length === 0" class="empty-state">
                  <div class="empty-icon">📋</div>
                  <p>暂无待审核经费申请</p>
                </div>
              </div>
            </div>
          </div>

          <div class="dashboard-column">
            <div class="quick-actions-section card-section">
              <h3 class="section-title">
                <span class="section-icon">⚡</span>
                快速操作
              </h3>
              <div class="actions-grid">
                <button class="action-card" @click="navigateToFundsUsage">
                  <div class="action-icon">📊</div>
                  <div class="action-content">
                    <h4>经费使用汇总</h4>
                    <p>查看各项目经费使用合计与明细</p>
                  </div>
                </button>
                <button class="action-card" @click="navigateToProjects">
                  <div class="action-icon">📁</div>
                  <div class="action-content">
                    <h4>在研项目</h4>
                    <p>查看已立项与孵化中的全部项目</p>
                  </div>
                </button>
                <button class="action-card" @click="navigateToRequests('pending')">
                  <div class="action-icon">💰</div>
                  <div class="action-content">
                    <h4>申请审核</h4>
                    <p>处理待反馈的经费申请</p>
                  </div>
                </button>
                <button class="action-card" @click="navigateToRequests('feedback_given')">
                  <div class="action-icon">📊</div>
                  <div class="action-content">
                    <h4>已反馈申请</h4>
                    <p>查看历史反馈与批准情况</p>
                  </div>
                </button>
                <button class="action-card" @click="navigateToFundsRequestApply">
                  <div class="action-icon">📝</div>
                  <div class="action-content">
                    <h4>经费申请</h4>
                    <p>为在研项目直接登记经费使用</p>
                  </div>
                </button>
              </div>
            </div>

            <div class="data-statistics-section card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">📊</span>
                  申请状态分布
                </h3>
                <button class="refresh-stat-btn" @click="refreshData" title="刷新统计">🔄</button>
              </div>
              <div class="chart-container">
                <div class="chart-bars">
                  <div class="chart-bar" v-for="stat in statusStats" :key="stat.status">
                    <div class="bar-label">
                      <span class="status-dot" :style="{ backgroundColor: stat.color }"></span>
                      <span class="status-name">{{ stat.label }}</span>
                    </div>
                    <div class="bar-container">
                      <div
                        class="bar"
                        :style="{ width: stat.percentage + '%', backgroundColor: stat.color }"
                      ></div>
                      <span class="bar-value">{{ stat.count }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="overview-cards card-section">
              <h3 class="section-title">
                <span class="section-icon">📈</span>
                经费概览
              </h3>
              <div class="overview-grid">
                <div class="overview-item">
                  <div class="overview-label">在研项目</div>
                  <div class="overview-value">{{ overview.activeProjects || 0 }} 个</div>
                </div>
                <div class="overview-item">
                  <div class="overview-label">总预算</div>
                  <div class="overview-value">¥{{ formatAmount(overview.totalBudget) }}</div>
                </div>
                <div class="overview-item">
                  <div class="overview-label">已提交成果</div>
                  <div class="overview-value">{{ overview.resultSubmitted || 0 }} 条</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <div v-if="showMobileMenu" class="mobile-menu-overlay" @click="toggleMobileMenu"></div>
  </div>
</template>

<script setup lang="ts">
import { formatAmountWan } from '@/constants/budgetCategories'
import { getApiBaseUrl } from '@/utils/request'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()
const API_BASE_URL = getApiBaseUrl()

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
const sidebarCollapsed = ref(false)
const showMobileMenu = ref(false)
const userName = ref('')

const overview = ref({
  pendingRequests: 0,
  feedbackGiven: 0,
  resultSubmitted: 0,
  pendingAmount: 0,
  activeProjects: 0,
  totalBudget: 0,
  unreadMessages: 0,
})

const pendingRequests = ref<any[]>([])
const statusStats = ref<any[]>([])

const userInitial = computed(() => (userName.value ? userName.value.charAt(0).toUpperCase() : 'F'))

const currentDate = computed(() => {
  const now = new Date()
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${weekdays[now.getDay()]}`
})

const handleLogoError = (e: Event) => {
  const img = e.target as HTMLImageElement
  img.src =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23B31B1B"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="white" font-size="40"%3E人大%3C/text%3E%3C/svg%3E'
}

const formatAmount = (amount: number | undefined) => {
  const n = Number(amount) || 0
  return new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

const formatTime = (dateString: string | null) => {
  if (!dateString) return '未知时间'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '无效日期'
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000)
  if (diffDays < 1) return '今天'
  if (diffDays < 7) return `${diffDays}天前`
  return date.toLocaleDateString('zh-CN')
}

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}
const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value
}

const handleLogout = () => {
  if (confirm('确定要退出登录吗？')) {
    localStorage.clear()
    sessionStorage.clear()
    router.push('/login')
  }
}

const navigateToProjects = () => router.push('/funds-manager/projects')

const navigateToFundsUsage = () => router.push('/funds-manager/funds-usage')

const navigateToFundsRequestApply = () => router.push('/funds-manager/funds-request/apply')

const navigateToRequests = (status?: string) => {
  router.push({ path: '/funds-manager/requests', query: status ? { status } : {} })
}

const viewRequest = (id: string) => {
  router.push(`/funds-manager/requests/${id}`)
}

const loadUserInfo = () => {
  try {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      userName.value = user.name || user.username || '经费管理员'
    } else {
      userName.value = localStorage.getItem('userName') || '经费管理员'
    }
  } catch {
    userName.value = '经费管理员'
  }
}

const loadDashboardData = async () => {
  loading.value = true
  try {
    const [overviewRes, requestsRes, statsRes] = await Promise.all([
      api.get('/funds-manager/dashboard/overview'),
      api.get('/funds-manager/requests', { params: { status: 'pending', limit: 5 } }),
      api.get('/funds-manager/stats/status'),
    ])
    if (overviewRes.success) overview.value = overviewRes.data
    if (requestsRes.success) pendingRequests.value = requestsRes.data?.requests || []
    if (statsRes.success) statusStats.value = statsRes.data || []
  } catch (error: any) {
    console.error('加载工作台数据失败:', error)
    if (error.response?.status === 401) {
      ElMessage.error('登录状态已过期，请重新登录')
      localStorage.clear()
      router.push('/login')
    } else {
      ElMessage.error('加载数据失败')
    }
  } finally {
    loading.value = false
  }
}

const refreshData = () => loadDashboardData()

onMounted(() => {
  loadUserInfo()
  const userRole = (localStorage.getItem('userRole') || '').toLowerCase()
  if (userRole !== 'funds_manager') {
    ElMessage.warning('检测到您不是经费管理员，将跳转到对应工作台')
    setTimeout(() => {
      const rolePaths: Record<string, string> = {
        applicant: '/applicant/dashboard',
        reviewer: '/reviewer/dashboard',
        project_manager: '/assistant/dashboard',
        admin: '/admin/dashboard',
      }
      router.push(rolePaths[userRole] || '/login')
    }, 1500)
    return
  }
  loadDashboardData()
})
</script>

<style scoped>
@import '@/styles/dashboard-workbench.css';

.dashboard-layout--two-col {
  grid-template-columns: 1fr 1fr;
}

.amount-tag {
  color: #b31b1b;
  font-weight: 600;
  font-size: 13px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.overview-item {
  text-align: center;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.overview-label {
  font-size: 13px;
  color: #7f8c8d;
  margin-bottom: 8px;
}

.overview-value {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

@media (max-width: 992px) {
  .dashboard-layout--two-col {
    grid-template-columns: 1fr;
  }
  .overview-grid {
    grid-template-columns: 1fr;
  }
}
</style>
