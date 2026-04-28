<!-- src/views/assistant/AssistantDashboard.vue -->
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
          <router-link to="/assistant/dashboard" class="nav-link" active-class="active">
            <span class="nav-icon">🏠</span>
            <span v-if="!sidebarCollapsed" class="nav-text">工作台</span>
          </router-link>
        </div>

          <div class="nav-section">
            <h4 v-if="!sidebarCollapsed" class="nav-section-title">项目管理</h4>
            <router-link to="/assistant/projects" class="nav-link" active-class="active">
              <span class="nav-icon">📁</span>
              <span v-if="!sidebarCollapsed" class="nav-text">项目管理</span>
              <span v-if="!sidebarCollapsed && pendingStats.projects > 0" class="nav-badge">
                {{ pendingStats.projects }}
              </span>
            </router-link>
          </div>

          <div class="nav-section">
            <h4 v-if="!sidebarCollapsed" class="nav-section-title">孵化服务</h4>
            <router-link to="/assistant/incubation-requests" class="nav-link" active-class="active">
              <span class="nav-icon">🔧</span>
              <span v-if="!sidebarCollapsed" class="nav-text">服务申请处理</span>
              <span v-if="!sidebarCollapsed && pendingIncubationCount > 0" class="nav-badge">
                {{ pendingIncubationCount }}
              </span>
            </router-link>
          </div>

          <div class="nav-section">
            <h4 v-if="!sidebarCollapsed" class="nav-section-title">结项管理</h4>
            <router-link to="/assistant/terminate-projects" class="nav-link" active-class="active">
              <span class="nav-icon">🔚</span>
              <span v-if="!sidebarCollapsed" class="nav-text">终止项目</span>
            </router-link>
          </div>

          <div class="nav-section">
            <h4 v-if="!sidebarCollapsed" class="nav-section-title">用户管理</h4>
            <router-link to="/assistant/users" class="nav-link" active-class="active">
              <span class="nav-icon">👥</span>
              <span v-if="!sidebarCollapsed" class="nav-text">用户管理</span>
            </router-link>
            <router-link to="/assistant/invitations" class="nav-link" active-class="active">
              <span class="nav-icon">✉️</span>
              <span v-if="!sidebarCollapsed" class="nav-text">邀请码</span>
            </router-link>
            <router-link to="/assistant/activities" class="nav-link" active-class="active">
              <span class="nav-icon">📜</span>
              <span v-if="!sidebarCollapsed" class="nav-text">活动日志</span>
            </router-link>
          </div>
        </nav>

        <div class="sidebar-footer">
          <div class="user-info-mini">
            <div class="user-avatar-mini">{{ userInitial }}</div>
            <div v-if="!sidebarCollapsed" class="user-details">
              <div class="user-name-mini">{{ userName }}</div>
              <div class="user-role-mini">{{ userRoleName }}</div>
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
            <span class="current-page">工作台</span>
          </div>
        </div>
        <div class="header-right">
          <div class="header-actions">
            <button class="icon-btn" @click="refreshData" title="刷新">
              <span class="icon">🔄</span>
            </button>
            <button class="icon-btn" @click="toggleTheme" title="切换主题">
              <span class="icon">{{ isDarkMode ? '☀️' : '🌙' }}</span>
            </button>
            <div class="notifications-dropdown">
              <button class="icon-btn notification-btn" @click="toggleNotifications" title="通知">
                <span class="icon">🔔</span>
                <span v-if="unreadCount > 0" class="notification-count">{{ unreadCount }}</span>
              </button>
              <div v-if="showNotificationsDropdown" class="notifications-dropdown-content">
                <div class="notifications-dropdown-header">
                  <h4>最新通知</h4>
                  <button @click="markAllAsRead" v-if="unreadCount > 0">标记已读</button>
                </div>
                <div class="notifications-dropdown-list">
                  <div
                    v-for="notification in recentNotifications"
                    :key="notification.id"
                    class="notification-dropdown-item"
                    @click="openNotification(notification)"
                  >
                    <div class="notification-dropdown-icon">{{ notification.icon }}</div>
                    <div class="notification-dropdown-content">
                      <div class="notification-dropdown-title">{{ notification.title }}</div>
                      <div class="notification-dropdown-time">{{ notification.time }}</div>
                    </div>
                    <span class="unread-dot-small" v-if="!notification.read"></span>
                  </div>
                  <div v-if="recentNotifications.length === 0" class="no-notifications">
                    暂无通知
                  </div>
                </div>
                <div class="notifications-dropdown-footer">
                  <router-link to="/notifications" @click="showNotificationsDropdown = false">
                    查看全部
                  </router-link>
                </div>
              </div>
            </div>
            <button class="logout-btn" @click="handleLogout">
              <span class="icon">🚪</span>
              退出
            </button>
          </div>
        </div>
      </header>

      <main class="main-content">
        <!-- 欢迎区域 -->
        <div class="welcome-section">
          <div class="welcome-card">
            <div class="welcome-content">
              <h2 class="welcome-title">欢迎回来，{{ userName }}！</h2>
              <p class="welcome-subtitle">今天是 {{ currentDate }}，祝您工作愉快！</p>
              <div class="quick-stats">
                <div class="stat-badge">
                  <span class="stat-value">{{ overview.pendingApplications || 0 }}</span>
                  <span class="stat-label">待领取申请</span>
                </div>
                <div class="stat-badge">
                  <span class="stat-value">{{ overview.activeProjects || 0 }}</span>
                  <span class="stat-label">进行中项目</span>
                </div>
                <div class="stat-badge">
                  <span class="stat-value">{{ overview.unreadMessages || 0 }}</span>
                  <span class="stat-label">未读通知</span>
                </div>
                <div class="stat-badge">
                  <span class="stat-value">{{ overview.pending_achievements || 0 }}</span>
                  <span class="stat-label">待审核成果</span>
                </div>
              </div>
            </div>
            <div class="welcome-illustration">
              <div class="illustration-icon">📊</div>
            </div>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-overlay">
          <div class="loading-spinner"></div>
          <div class="loading-text">正在加载数据...</div>
        </div>

        <!-- 三列布局 -->
        <div class="dashboard-layout">
          <!-- 左列：待领取（尚未分配项目经理的申请） -->
          <div class="dashboard-column">
            <div class="notifications-section card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">📝</span>
                  待领取申请
                </h3>
                <button class="view-all-btn" @click="navigateToApplicationsUnassigned">
                  查看全部 →
                </button>
              </div>

              <div class="applications-list">
                <div
                  v-for="application in pendingApplications"
                  :key="application.id"
                  class="application-item"
                  @click="viewApplication(application.id)"
                >
                  <div class="application-header">
                    <span class="application-id">{{
                      application.project_code || application.id.substring(0, 8)
                    }}</span>
                    <span class="application-time">{{ formatTime(application.created_at) }}</span>
                  </div>
                  <div class="application-title">{{ application.title }}</div>
                  <div class="application-info">
                    <span class="applicant">
                      <span class="applicant-icon">👤</span>
                      {{ application.applicant_name || '未知申请人' }}
                    </span>
                    <span class="status" :class="getStatusClass(application.status)">
                      {{ getStatusText(application.status) }}
                    </span>
                  </div>
                </div>

                <div v-if="pendingApplications.length === 0" class="empty-state">
                  <div class="empty-icon">📁</div>
                  <p>暂无待领取申请</p>
                </div>
              </div>
            </div>

            <!-- 我负责的项目 -->
            <div class="notifications-section card-section my-managed-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">📌</span>
                  我负责的项目
                </h3>
                <button class="view-all-btn" @click="navigateToApplicationsMine">查看全部 →</button>
              </div>
              <div class="applications-list">
                <div
                  v-for="application in myManagedProjects"
                  :key="application.id"
                  class="application-item"
                  @click="viewApplication(application.id)"
                >
                  <div class="application-header">
                    <span class="application-id">{{
                      application.project_code || application.id.substring(0, 8)
                    }}</span>
                    <span class="application-time">{{ formatTime(application.updated_at || application.created_at) }}</span>
                  </div>
                  <div class="application-title">{{ application.title }}</div>
                  <div class="application-info">
                    <span class="applicant">
                      <span class="applicant-icon">👤</span>
                      {{ application.applicant_name || '未知申请人' }}
                    </span>
                    <span class="status" :class="getStatusClass(application.status)">
                      {{ getStatusText(application.status) }}
                    </span>
                  </div>
                </div>
                <div v-if="myManagedProjects.length === 0" class="empty-state">
                  <div class="empty-icon">📋</div>
                  <p>暂无负责的项目，可在「领取项目」中领取待受理申请</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 中列：快速操作 + 项目统计 -->
          <div class="dashboard-column">
            <!-- 快速操作 -->
            <div class="quick-actions-section card-section">
              <h3 class="section-title">
                <span class="section-icon">⚡</span>
                快速操作
              </h3>
              <div class="actions-grid">
                <button class="action-card" @click="navigateTo('applications')">
                  <div class="action-icon">📋</div>
                  <div class="action-content">
                    <h4>领取项目</h4>
                    <p>领取待受理申请并分配专家</p>
                  </div>
                </button>
                <button class="action-card" @click="navigateTo('review-achievements')">
                  <div class="action-icon">🏆</div>
                  <div class="action-content">
                    <h4>成果审核</h4>
                    <p>审核科研成果</p>
                  </div>
                </button>
              </div>
            </div>

            <!-- 项目统计 -->
            <div class="data-statistics-section card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">📊</span>
                  项目状态分布
                </h3>
                <button class="refresh-stat-btn" @click="refreshData" title="刷新统计">🔄</button>
              </div>

              <div class="chart-container">
                <div class="chart-bars">
                  <div class="chart-bar" v-for="stat in projectStats" :key="stat.status">
                    <div class="bar-label">
                      <span class="status-dot" :style="{ backgroundColor: stat.color }"></span>
                      <span class="status-name">{{ stat.label }}</span>
                    </div>
                    <div class="bar-container">
                      <div
                        class="bar"
                        :style="{
                          width: stat.percentage + '%',
                          backgroundColor: stat.color,
                        }"
                      ></div>
                      <span class="bar-value">{{ stat.count }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 右列：最近活动 + 系统通知 -->
          <div class="dashboard-column">
            <!-- 最近活动 -->
            <div class="notifications-section card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">🕒</span>
                  最近活动
                </h3>
                <button class="view-all-btn" @click="navigateTo('activities')">查看全部 →</button>
              </div>

              <div class="activities-list">
                <div v-for="activity in recentActivities" :key="activity.id" class="activity-item">
                  <div class="activity-icon" :style="{ background: activity.color }">
                    {{ activity.icon }}
                  </div>
                  <div class="activity-content">
                    <div class="activity-text">{{ activity.description }}</div>
                    <div class="activity-time">{{ activity.time }}</div>
                  </div>
                </div>
                <div v-if="recentActivities.length === 0" class="empty-state">
                  <div class="empty-icon">📋</div>
                  <p>暂无活动记录</p>
                </div>
              </div>
            </div>

            <!-- 系统通知 -->
            <div class="notifications-section card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">🔔</span>
                  最新通知
                </h3>
                <div class="section-header-actions">
                  <button class="mark-all-btn" @click="markAllAsRead" v-if="unreadCount > 0">
                    标记全部已读
                  </button>
                  <button class="view-all-btn" @click="navigateTo('notifications')">
                    查看全部 →
                  </button>
                </div>
              </div>

              <div class="notifications-list">
                <div
                  v-for="notification in notifications"
                  :key="notification.id"
                  class="notification-item"
                  :class="{ unread: !notification.is_read }"
                  @click="openNotification(notification)"
                >
                  <div class="notification-icon">{{ notification.icon }}</div>
                  <div class="notification-content">
                    <div class="notification-header">
                      <h4 class="notification-title">{{ notification.title }}</h4>
                      <span class="notification-time">{{ notification.time }}</span>
                    </div>
                    <p class="notification-desc">{{ notification.content }}</p>
                  </div>
                  <span class="unread-dot" v-if="!notification.is_read"></span>
                </div>

                <div v-if="notifications.length === 0" class="empty-state">
                  <div class="empty-icon">📭</div>
                  <p>暂无通知</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- 移动端菜单遮罩 -->
    <div v-if="showMobileMenu" class="mobile-menu-overlay" @click="toggleMobileMenu"></div>
  </div>
</template>

<script setup lang="ts">
import { getApiBaseUrl } from '@/utils/request'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()

// API配置
const API_BASE_URL = getApiBaseUrl()

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
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  },
)

// 响应式数据
const loading = ref(false)
const isDarkMode = ref(false)
const sidebarCollapsed = ref(false)
const showMobileMenu = ref(false)
const showNotificationsDropdown = ref(false)
const userName = ref('')
const unreadCount = ref(0)

// 数据状态
const userInfo = ref({
  id: '',
  username: '',
  name: '',
  role: 'project_manager',
  email: '',
  department: '',
  title: '',
})

const overview = ref({
  pendingApplications: 0,
  activeProjects: 0,
  pending_achievements: 0,
  unreadMessages: 0,
  activeUsers: 0,
})

/** 工作台列表预览条数（待处理 / 我负责的各最多展示这么多） */
const DASHBOARD_PREVIEW_LIMIT = 2

const pendingApplications = ref([])
/** 当前用户作为项目经理负责的项目（来自 /assistant/applications?scope=mine） */
const myManagedProjects = ref<any[]>([])
const projectStats = ref([])
const recentActivities = ref([])
const notifications = ref([])

const pendingTasks = ref({
  projects: 0,
  achievements: 0,
  get total() {
    return this.projects + this.achievements
  },
})

const pendingStats = computed(() => ({
  projects: pendingTasks.value.projects,
  achievements: pendingTasks.value.achievements,
}))

// 待处理孵化服务申请数量
const pendingIncubationCount = ref(0)

// 计算属性
const userInitial = computed(() => {
  return userName.value ? userName.value.charAt(0).toUpperCase() : 'A'
})

/** 科研助理与项目经理为同一岗位，界面统一为「科研助理」 */
const userRoleName = computed(() => '科研助理')

const handleLogoError = (e: Event) => {
  const img = e.target as HTMLImageElement
  img.src =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23B31B1B"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="white" font-size="40"%3E人大%3C/text%3E%3C/svg%3E'
}

const currentDate = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const weekday = weekdays[now.getDay()]
  return `${year}年${month}月${day}日 星期${weekday}`
})

const recentNotifications = computed(() => {
  return notifications.value.slice(0, 3)
})

// 工具函数
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    under_review: '专家评审中',
    revision: '修改中',
    batch_review: '集中评审中',
    approved: '已批准',
    incubating: '孵化中',
    rejected: '未通过',
    completed: '已完成',
    terminated: '已终止',
  }
  return statusMap[status] || status
}

const getStatusClass = (status: string) => {
  const classMap: Record<string, string> = {
    draft: 'draft',
    submitted: 'submitted',
    under_review: 'reviewing',
    revision: 'reviewing',
    batch_review: 'reviewing',
    approved: 'approved',
    incubating: 'in_progress',
    rejected: 'rejected',
    completed: 'completed',
    terminated: 'terminated',
  }
  return classMap[status] || status
}

const formatTime = (dateString: string | Date | null) => {
  if (!dateString) return '未知时间'
  try {
    const date = dateString instanceof Date ? dateString : new Date(dateString)
    if (isNaN(date.getTime())) return '无效日期'
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSeconds < 60) return '刚刚'
    if (diffMinutes < 60) return `${diffMinutes}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 7) return `${diffDays}天前`
    return date.toLocaleDateString('zh-CN')
  } catch (error) {
    return '日期错误'
  }
}

// 导航功能
const navigateTo = (action: string) => {
  const routes: Record<string, string> = {
    applications: '/assistant/applications',
    users: '/assistant/users',
    activities: '/assistant/activities',
    notifications: '/notifications',
    'review-projects': '/audit/projects',
    'review-achievements': '/audit/achievements',
  }
  if (routes[action]) router.push(routes[action])
}

const navigateToApplicationsMine = () => {
  router.push({ path: '/assistant/applications', query: { scope: 'mine' } })
}

const navigateToApplicationsUnassigned = () => {
  router.push({ path: '/assistant/applications', query: { scope: 'unassigned' } })
}

const viewApplication = (id: string) => {
  router.push(`/assistant/application/${id}`)
}

// UI控制
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value
}

const toggleNotifications = () => {
  showNotificationsDropdown.value = !showNotificationsDropdown.value
}

const openNotification = async (notification: any) => {
  try {
    if (!notification.is_read) {
      await api.post(`/notifications/${notification.id}/read`)
      notification.is_read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
    if (notification.action_url) {
      router.push(notification.action_url)
    }
    showNotificationsDropdown.value = false
  } catch (error) {
    console.error('打开通知失败:', error)
  }
}

const markAllAsRead = async () => {
  try {
    await api.post('/notifications/mark-all-read')
    notifications.value.forEach((notification: any) => {
      notification.is_read = true
    })
    unreadCount.value = 0
    ElMessage.success('所有通知已标记为已读')
  } catch (error) {
    console.error('标记全部已读失败:', error)
    ElMessage.error('标记全部已读失败')
  }
}

const refreshData = () => {
  loadDashboardData()
}

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
  document.documentElement.setAttribute('data-theme', isDarkMode.value ? 'dark' : 'light')
  ElMessage.info(isDarkMode.value ? '已切换到深色模式' : '已切换到浅色模式')
}

const handleLogout = () => {
  if (confirm('确定要退出登录吗？')) {
    localStorage.clear()
    sessionStorage.clear()
    router.push('/login')
  }
}

// 加载用户信息
const loadUserInfo = async () => {
  try {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      userInfo.value = {
        id: user.id || '',
        username: user.username || '',
        name: user.name || user.username || '科研助理',
        role: user.role || 'project_manager',
        email: user.email || '',
        department: user.department || '',
        title: user.title || '',
      }
      userName.value = userInfo.value.name
    }
  } catch (error) {
    console.warn('加载用户信息失败:', error)
    userName.value = localStorage.getItem('userName') || '科研助理'
  }
}

// 加载仪表板数据
const loadDashboardData = async () => {
  loading.value = true
  try {
    console.log('正在获取科研助理仪表板数据...')
    await Promise.all([
      loadOverviewData(),
      loadPendingApplications(),
      loadMyManagedProjects(),
      loadProjectStats(),
      loadRecentActivities(),
      loadNotificationsData(),
      loadPendingTasksData(),
    ])
  } catch (error) {
    console.error('加载仪表板数据失败:', error)
    if (error.response?.status === 401) {
      ElMessage.error('登录状态已过期，请重新登录')
      localStorage.clear()
      router.push('/login')
    } else {
      ElMessage.error('加载数据失败')
      showMockData()
    }
  } finally {
    loading.value = false
  }
}

// 加载概览数据
const loadOverviewData = async () => {
  try {
    // 获取项目统计
    const response = await api.get('/assistant/dashboard/overview')
    if (response.success && response.data) {
      overview.value = response.data
    }
  } catch (error) {
    console.error('加载概览数据失败:', error)
  }
}

// 待领取：仅「已提交且未指定项目经理」，与申请页「待领取」一致（非全平台待办）
const loadPendingApplications = async () => {
  try {
    const response = await api.get('/assistant/applications', {
      params: {
        scope: 'unassigned',
        page: 1,
        pageSize: DASHBOARD_PREVIEW_LIMIT,
        sortBy: 'updated_at',
        sortOrder: 'desc',
      },
    })
    if (response.success && response.data?.applications) {
      const list = response.data.applications as any[]
      pendingApplications.value = list.slice(0, DASHBOARD_PREVIEW_LIMIT).map((app: any) => ({
        ...app,
        applicant_name: app.applicant_name || '未知',
        time: formatTime(app.created_at),
      }))
    }
  } catch (error) {
    console.error('加载待处理申请失败:', error)
  }
}

const loadMyManagedProjects = async () => {
  try {
    const response = await api.get('/assistant/applications', {
      params: {
        scope: 'mine',
        page: 1,
        pageSize: DASHBOARD_PREVIEW_LIMIT,
        sortBy: 'updated_at',
        sortOrder: 'desc',
      },
    })
    if (response.success && response.data?.applications) {
      myManagedProjects.value = (response.data.applications as any[]).slice(0, DASHBOARD_PREVIEW_LIMIT)
    }
  } catch (error) {
    console.error('加载我负责的项目失败:', error)
    myManagedProjects.value = []
  }
}

// 加载项目统计
const loadProjectStats = async () => {
  try {
    const response = await api.get('/projects')
    if (response.success && response.data) {
      const projects = response.data
      const statusCount: Record<string, number> = {}
      projects.forEach((p: any) => {
        statusCount[p.status] = (statusCount[p.status] || 0) + 1
      })
      const total = projects.length
      const statusList = [
        { status: 'draft', label: '草稿', color: '#f5f5f5' },
        { status: 'submitted', label: '已提交', color: 'rgba(179,27,27,0.06)' },
        { status: 'under_review', label: '评审中', color: '#fff7e6' },
        { status: 'revision', label: '修改中', color: '#ffe7ba' },
        { status: 'batch_review', label: '集中评审', color: '#ffd591' },
        { status: 'approved', label: '已批准', color: '#f6ffed' },
        { status: 'incubating', label: '孵化中', color: '#b31b1b' },
        { status: 'completed', label: '已完成', color: '#52c41a' },
        { status: 'rejected', label: '已驳回', color: '#ff4d4f' },
        { status: 'terminated', label: '已终止', color: '#8c8c8c' },
      ]
      projectStats.value = statusList
        .filter((s) => statusCount[s.status])
        .map((s) => ({
          ...s,
          count: statusCount[s.status],
          percentage: total > 0 ? Math.round((statusCount[s.status] / total) * 100) : 0,
        }))
    }
  } catch (error) {
    console.error('加载项目统计失败:', error)
  }
}

// 加载最近活动
const loadRecentActivities = async () => {
  try {
    const response = await api.get('/auditlog', { params: { limit: 5 } })
    if (response.success && response.data) {
      recentActivities.value = response.data.map((activity: any) => ({
        id: activity.id,
        icon: getActivityIcon(activity.action),
        color: getActivityColor(activity.action),
        description: `${activity.user_name || '用户'} ${activity.action}了${activity.table_name}`,
        time: formatTime(activity.created_at),
      }))
    }
  } catch (error) {
    console.error('加载最近活动失败:', error)
  }
}

// 加载通知数据
const loadNotificationsData = async () => {
  try {
    const response = await api.get('/notifications', {
      params: { limit: 10, orderBy: 'created_at', order: 'desc' },
    })
    if (response.success && response.data) {
      notifications.value = response.data.map((n: any) => ({
        ...n,
        icon: getNotificationIcon(n.type),
        time: formatTime(n.created_at),
      }))
      unreadCount.value = notifications.value.filter((n: any) => !n.is_read).length
    }
  } catch (error) {
    console.error('加载通知失败:', error)
  }
}

// 加载待处理任务统计
const loadPendingTasksData = async () => {
  try {
    const unassignedRes = await api.get('/assistant/applications', {
      params: { scope: 'unassigned', page: 1, pageSize: 1 },
    })
    if (unassignedRes.success && unassignedRes.data?.pagination) {
      pendingTasks.value.projects = unassignedRes.data.pagination.total ?? 0
    }
    // 获取待处理成果
    const achievementsRes = await api.get('/achievements', { params: { status: 'submitted' } })
    if (achievementsRes.success && achievementsRes.data) {
      pendingTasks.value.achievements = achievementsRes.data.length
    }
    // 获取待处理孵化服务申请数量
    const incubationRes = await api.get('/incubation/pending-requests', { params: { status: 'pending' } })
    if (incubationRes.success && incubationRes.data) {
      pendingIncubationCount.value = incubationRes.data.length
    }
  } catch (error) {
    console.error('加载待处理任务失败:', error)
  }
}

// 辅助函数
const getActivityIcon = (action: string) => {
  const iconMap: Record<string, string> = {
    create: '➕',
    update: '✏️',
    delete: '🗑️',
    review: '📝',
    approve: '✅',
    reject: '❌',
  }
  return iconMap[action] || '📋'
}

const getActivityColor = (action: string) => {
  const colorMap: Record<string, string> = {
    create: 'rgba(179,27,27,0.06)',
    update: '#fff7e6',
    delete: '#fff2f0',
    review: '#f6ffed',
    approve: '#d9f7be',
    reject: '#ffccc7',
  }
  return colorMap[action] || '#f5f5f5'
}

const getNotificationIcon = (type: string) => {
  const iconMap: Record<string, string> = {
    project: '📋',
    review: '⭐',
    funding: '💰',
    incubation: '🏭',
    system: '🔧',
    reminder: '⏰',
    invitation: '✉️',
  }
  return iconMap[type] || '📢'
}

// 显示模拟数据
const showMockData = () => {
  console.log('使用模拟数据')
  overview.value = {
    pendingApplications: 8,
    activeProjects: 15,
    pending_achievements: 4,
    unreadMessages: 3,
    activeUsers: 42,
  }
  pendingApplications.value = [
    {
      id: 'proj_001',
      project_code: 'RES-2024-001',
      title: '人工智能在医疗诊断中的应用研究',
      applicant_name: '张三教授',
      status: 'under_review',
      created_at: '2024-01-25T09:30:00',
    },
    {
      id: 'proj_002',
      project_code: 'RES-2024-002',
      title: '新型材料在新能源领域的开发',
      applicant_name: '李四博士',
      status: 'submitted',
      created_at: '2024-01-24T14:20:00',
    },
  ]
  projectStats.value = [
    { status: 'submitted', label: '已提交', count: 8, percentage: 20, color: 'rgba(179,27,27,0.06)' },
    { status: 'under_review', label: '评审中', count: 10, percentage: 25, color: '#fff7e6' },
    { status: 'incubating', label: '孵化中', count: 15, percentage: 37.5, color: '#b31b1b' },
    { status: 'completed', label: '已完成', count: 2, percentage: 5, color: '#52c41a' },
  ]
  notifications.value = [
    {
      id: 'notif_001',
      type: 'system',
      icon: '📢',
      title: '系统维护通知',
      content: '本周末系统将进行维护',
      time: '今天 09:00',
      is_read: false,
    },
  ]
  pendingTasks.value = { projects: 8, achievements: 2 }
  unreadCount.value = notifications.value.filter((n) => !n.is_read).length
}

// 组件生命周期
onMounted(() => {
  console.log('=== 初始化科研助理工作台页面 ===')
  loadUserInfo().then(() => {
    const userRole = localStorage.getItem('userRole')
    const r = userRole?.toLowerCase() || ''
    if (r !== 'project_manager') {
      ElMessage.warning('检测到您不是科研助理，将跳转到对应工作台')
      setTimeout(() => {
        const rolePaths: Record<string, string> = {
          applicant: '/applicant/dashboard',
          reviewer: '/reviewer/dashboard',
          admin: '/admin/dashboard',
        }
        router.push(rolePaths[r] || '/login')
      }, 2000)
    } else {
      loadDashboardData()
    }
  })
  const refreshInterval = setInterval(() => {
    if (document.visibilityState === 'visible') refreshData()
  }, 300000)
  onUnmounted(() => clearInterval(refreshInterval))
  document.addEventListener('click', (e) => {
    if (showNotificationsDropdown.value && !e.target.closest('.notifications-dropdown')) {
      showNotificationsDropdown.value = false
    }
  })
})
</script>

<style scoped>
h1,
h2,
h3,
h4,
button {
  font-family: 'STZhongsong', '华文中宋', 'SimSun', serif;
}

.dashboard-container {
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
}

.main-wrapper {
  margin-left: 260px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  transition: all 0.3s;
}

.main-wrapper.sidebar-collapsed {
  margin-left: 70px;
}

.dashboard-header {
  background: white;
  padding: 0 32px;
  height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 900;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.mobile-menu-btn {
  display: none;
  width: 36px;
  height: 36px;
  border: none;
  background: #f5f7fa;
  border-radius: 6px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  color: #333;
}

.mobile-menu-btn:hover {
  background: #e8e8e8;
}

.breadcrumb {
  font-size: 14px;
  color: #666;
}

.current-page {
  color: #b31b1b;
  font-weight: 500;
}

.header-right {
  display: flex;
  justify-content: flex-end;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notifications-dropdown {
  position: relative;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: #f5f7fa;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  color: #555;
  position: relative;
}

.icon-btn:hover {
  background: #e8e8e8;
  transform: translateY(-1px);
}

.notification-count {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ff4d4f;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
}

.logout-btn {
  padding: 6px 14px;
  background: #fff1f0;
  border: 1px solid #ffccc7;
  border-radius: 6px;
  color: #cf1322;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.3s;
}

.logout-btn:hover {
  background: #ff4d4f;
  border-color: #ff4d4f;
  color: white;
}

.notifications-dropdown-content {
  position: absolute;
  top: 100%;
  right: 0;
  width: 320px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  margin-top: 8px;
}

.notifications-dropdown-header {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notifications-dropdown-header h4 {
  margin: 0;
  font-size: 14px;
  color: #2c3e50;
  font-weight: 600;
}

.notifications-dropdown-header button {
  background: none;
  border: none;
  color: #b31b1b;
  font-size: 12px;
  cursor: pointer;
}

.notifications-dropdown-list {
  max-height: 300px;
  overflow-y: auto;
}

.notification-dropdown-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #fafafa;
  cursor: pointer;
  transition: all 0.3s;
}

.notification-dropdown-item:hover {
  background: #fafafa;
}

.notification-dropdown-icon {
  font-size: 18px;
  margin-right: 12px;
  min-width: 24px;
}

.notification-dropdown-content {
  flex: 1;
  min-width: 0;
}

.notification-dropdown-title {
  font-size: 13px;
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notification-dropdown-time {
  font-size: 11px;
  color: #7f8c8d;
}

.unread-dot-small {
  width: 6px;
  height: 6px;
  background: #52c41a;
  border-radius: 50%;
  margin-left: 8px;
}

.no-notifications {
  padding: 24px;
  text-align: center;
  color: #7f8c8d;
  font-size: 13px;
}

.notifications-dropdown-footer {
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
  text-align: center;
}

.notifications-dropdown-footer a {
  color: #b31b1b;
  text-decoration: none;
  font-size: 12px;
}

.sidebar {
  width: 260px;
  background: #b31b1b;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
  display: flex;
  position: fixed;
  height: 100vh;
  top: 0;
  left: 0;
  z-index: 1000;
  flex-direction: column;
  transition: all 0.3s ease;
}

.sidebar-collapsed {
  width: 70px;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.sidebar-logo {
  width: 36px;
  height: 36px;
  object-fit: cover;
  object-position: center;
  border-radius: 6px;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.sidebar-toggle {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 4px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  color: white;
  transition: all 0.3s;
}

.sidebar-toggle:hover {
  background: rgba(255, 255, 255, 0.25);
}

.sidebar-nav {
  flex: 1;
  padding: 16px 0;
  overflow-y: auto;
  scrollbar-width: none;
}

.sidebar-nav::-webkit-scrollbar {
  display: none;
}

.nav-section {
  margin-bottom: 24px;
}

.nav-section-title {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 8px 20px;
  font-weight: 500;
}

.nav-link {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  transition: all 0.3s;
  position: relative;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-link.active {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border-left: 3px solid white;
}

.nav-icon {
  font-size: 18px;
  margin-right: 12px;
  min-width: 24px;
  text-align: center;
}

.nav-text {
  font-size: 14px;
  font-weight: 500;
}

.nav-badge {
  background: #ff4d4f;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: auto;
  min-width: 18px;
  text-align: center;
}

.sidebar-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  padding: 16px 20px;
}

.sidebar-footer .user-info-mini {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sidebar-footer .user-avatar-mini {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.25);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 15px;
  flex-shrink: 0;
}

.sidebar-footer .user-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sidebar-footer .user-name-mini {
  font-size: 14px;
  font-weight: 500;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-footer .user-role-mini {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background: #f5f7fa;
}

.welcome-section {
  margin-bottom: 24px;
}

.welcome-card {
  background: white;
  border-radius: 12px;
  padding: 28px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.welcome-content {
  flex: 1;
}

.welcome-title {
  font-size: 24px;
  color: #2c3e50;
  margin: 0 0 8px 0;
}

.welcome-subtitle {
  color: #7f8c8d;
  font-size: 14px;
  margin: 0 0 20px 0;
}

.quick-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.stat-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  min-width: 80px;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #b31b1b;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

.welcome-illustration {
  margin-left: 40px;
}

.illustration-icon {
  font-size: 64px;
  opacity: 0.8;
}

.loading-overlay {
  position: fixed;
  top: 60px;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #b31b1b;
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
  color: #666;
  font-size: 16px;
}

.dashboard-layout {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.dashboard-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  padding: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  color: #2c3e50;
  margin: 0;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  font-size: 20px;
}

.view-all-btn {
  padding: 6px 12px;
  background: #b31b1b;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.3s;
  white-space: nowrap;
}

.view-all-btn:hover {
  background: #8b1515;
}

.mark-all-btn {
  padding: 6px 12px;
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
}

.mark-all-btn:hover {
  background: #e8e8e8;
}

.refresh-stat-btn {
  padding: 6px 12px;
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.refresh-stat-btn:hover {
  background: #e8e8e8;
  transform: rotate(90deg);
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.action-card {
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 16px;
  text-align: left;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-card:hover {
  border-color: #b31b1b;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(179, 27, 27, 0.12);
}

.action-icon {
  font-size: 24px;
  width: 48px;
  height: 48px;
  background: #fff7e6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-content h4 {
  margin: 0 0 4px 0;
  color: #2c3e50;
  font-size: 14px;
  font-weight: 600;
}

.action-content p {
  margin: 0;
  color: #7f8c8d;
  font-size: 12px;
}

.chart-container {
  margin-top: 16px;
}

.chart-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chart-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bar-label {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 80px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-name {
  font-size: 12px;
  color: #666;
}

.bar-container {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.bar {
  height: 8px;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.bar-value {
  font-size: 12px;
  color: #7f8c8d;
  min-width: 24px;
  text-align: right;
}

.applications-list,
.activities-list,
.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.application-item,
.activity-item,
.notification-item {
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  background: white;
}

.application-item:hover,
.activity-item:hover,
.notification-item:hover {
  border-color: #b31b1b;
  background: rgba(179, 27, 27, 0.04);
  transform: translateX(4px);
}

.notification-item.unread {
  background: rgba(179, 27, 27, 0.06);
  border-color: rgba(179, 27, 27, 0.2);
}

.application-header,
.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.application-id {
  font-size: 13px;
  color: #b31b1b;
  font-weight: 600;
  background: #f9f0ff;
  padding: 4px 10px;
  border-radius: 4px;
}

.application-time,
.notification-time {
  font-size: 13px;
  color: #999;
}

.application-title {
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 12px;
  font-size: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.application-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.applicant {
  font-size: 14px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 6px;
}

.status {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  min-width: 60px;
  text-align: center;
}

.status.draft {
  background: #f5f5f5;
  color: #8c8c8c;
}
.status.submitted {
  background: rgba(179,27,27,0.06);
  color: #b31b1b;
}
.status.reviewing {
  background: rgba(179, 27, 27, 0.06);
  color: #b31b1b;
}
.status.approved {
  background: #f6ffed;
  color: #52c41a;
}
.status.rejected {
  background: #fff2f0;
  color: #ff4d4f;
}
.status.in_progress {
  background: rgba(179,27,27,0.06);
  color: #b31b1b;
}
.status.completed {
  background: #f6ffed;
  color: #52c41a;
}

.activity-icon {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
}

.activity-text {
  font-size: 14px;
  color: #333;
  margin-bottom: 6px;
  font-weight: 500;
}

.activity-time {
  font-size: 12px;
  color: #999;
}

.notification-icon {
  font-size: 20px;
  margin-right: 12px;
  min-width: 24px;
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
}

.notification-title {
  font-weight: 500;
  color: #2c3e50;
  margin: 0;
  font-size: 14px;
  flex: 1;
}

.notification-desc {
  color: #666;
  font-size: 13px;
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background: #52c41a;
  border-radius: 50%;
  margin-left: 8px;
  flex-shrink: 0;
  margin-top: 8px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #8c8c8c;
  background: #fafafa;
  border-radius: 8px;
  border: 1px dashed #d9d9d9;
}

.empty-icon {
  font-size: 36px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.mobile-menu-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

@media (max-width: 1200px) {
  .dashboard-layout {
    grid-template-columns: repeat(2, 1fr);
  }
  .dashboard-column:last-child {
    grid-column: 1 / -1;
  }
}

@media (max-width: 992px) {
  .sidebar {
    transform: translateX(-100%);
    position: fixed;
    height: 100vh;
    top: 0;
    left: 0;
  }
  .sidebar.show {
    transform: translateX(0);
  }
  .main-wrapper {
    margin-left: 0 !important;
  }
  .mobile-menu-btn {
    display: flex;
  }
  .mobile-menu-overlay {
    display: block;
  }
  .dashboard-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .dashboard-header {
    padding: 0 16px;
    height: 60px;
  }
  .main-content {
    padding: 16px;
  }
  .header-actions {
    gap: 8px;
  }
  .user-info-mini {
    display: none;
  }
  .icon-btn {
    width: 36px;
    height: 36px;
  }
  .logout-btn {
    padding: 6px 12px;
    font-size: 12px;
  }
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .actions-grid {
    grid-template-columns: 1fr;
  }
}

@media print {
  .sidebar,
  .dashboard-header,
  .section-header button,
  .action-card {
    display: none !important;
  }
  .main-wrapper {
    margin-left: 0 !important;
  }
  .card-section {
    box-shadow: none !important;
    border: 1px solid #ddd !important;
    page-break-inside: avoid;
  }
}
</style>
