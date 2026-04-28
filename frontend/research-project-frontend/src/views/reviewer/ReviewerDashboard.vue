<!-- src/views/reviewer/ReviewerDashboard.vue -->
<template>
  <div class="dashboard-container">
    <!-- 左侧固定侧栏 -->
    <aside class="sidebar" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
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
          <router-link to="/reviewer/dashboard" class="nav-link" active-class="active">
            <span class="nav-icon">🏠</span>
            <span v-if="!sidebarCollapsed" class="nav-text">工作台</span>
          </router-link>
        </div>

        <div class="nav-section">
          <h4 v-if="!sidebarCollapsed" class="nav-section-title">项目管理</h4>
          <router-link to="/reviewer/projects" class="nav-link" active-class="active">
            <span class="nav-icon">📁</span>
            <span v-if="!sidebarCollapsed" class="nav-text">项目管理</span>
            <span v-if="!sidebarCollapsed && stats.pendingCount > 0" class="nav-badge">
              {{ stats.pendingCount }}
            </span>
          </router-link>
        </div>

        <div class="nav-section">
          <h4 v-if="!sidebarCollapsed" class="nav-section-title">个人中心</h4>
          <router-link to="/profile" class="nav-link" active-class="active">
            <span class="nav-icon">👤</span>
            <span v-if="!sidebarCollapsed" class="nav-text">个人资料</span>
          </router-link>
          <router-link to="/notifications" class="nav-link" active-class="active">
            <span class="nav-icon">🔔</span>
            <span v-if="!sidebarCollapsed" class="nav-text">通知中心</span>
            <span v-if="!sidebarCollapsed && unreadCount > 0" class="nav-badge">{{ unreadCount }}</span>
          </router-link>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info-mini">
          <div class="user-avatar-mini">{{ userInitial }}</div>
          <div v-if="!sidebarCollapsed" class="user-details">
            <div class="user-name-mini">{{ userName }}</div>
            <div class="user-role-mini">评审专家</div>
          </div>
        </div>
      </div>
    </aside>

    <!-- 右侧主体 -->
    <div class="main-wrapper" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <!-- 白色顶栏 -->
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
                  <h4>系统通知</h4>
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
                    <span class="unread-dot-small" v-if="!notification.is_read"></span>
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

      <!-- 主内容区域 -->
      <main class="main-content">
        <!-- 欢迎区域 -->
        <div class="welcome-section">
          <div class="welcome-card">
            <div class="welcome-content">
              <h2 class="welcome-title">欢迎回来，{{ userName }}！</h2>
              <p class="welcome-subtitle">今天是 {{ currentDate }}，祝您工作愉快！</p>
              <div class="quick-stats">
                <div class="stat-badge">
                  <span class="stat-value">{{ stats.pendingCount || 0 }}</span>
                  <span class="stat-label">待评审</span>
                </div>
                <div class="stat-badge">
                  <span class="stat-value">{{ stats.completedCount || 0 }}</span>
                  <span class="stat-label">已评审</span>
                </div>
                <div class="stat-badge">
                  <span class="stat-value">{{ stats.totalComments || 0 }}</span>
                  <span class="stat-label">评语字数</span>
                </div>
                <div class="stat-badge">
                  <span class="stat-value">{{ stats.approvalRate || 0 }}%</span>
                  <span class="stat-label">通过率</span>
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
          <div class="loading-text">正在加载评审数据...</div>
        </div>

        <!-- 三列布局 -->
        <div class="dashboard-layout">
          <!-- 左列：待评审项目 -->
          <div class="dashboard-column">
            <div class="pending-projects card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">📋</span>
                  待评审项目
                </h3>
                <button
                  class="view-all-btn"
                  @click="goToPendingProjects"
                  v-if="pendingProjects.length > 0"
                >
                  查看全部 →
                </button>
              </div>

              <div class="projects-list">
                <div
                  v-for="project in pendingProjects"
                  :key="project.id"
                  class="project-item"
                  @click="startReview(project)"
                >
                  <div class="project-header">
                    <div class="project-badges">
                      <el-tag size="small" type="info">
                        {{ project.research_field || '未分类' }}
                      </el-tag>
                    </div>
                    <span class="project-code">{{ project.project_code }}</span>
                  </div>

                  <h4 class="project-title">{{ project.title }}</h4>

                  <div class="project-info">
                    <div class="info-item">
                      <span class="info-icon">👤</span>
                      <span>{{ project.applicant_name }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-icon">💰</span>
                      <span>{{ formatCurrency(project.budget_total) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-icon">📅</span>
                      <span :class="getDeadlineClass(project.review_deadline)">
                        截止：{{ formatDate(project.review_deadline) || '未设置' }}
                      </span>
                    </div>
                  </div>

                  <div class="project-actions">
                    <button class="action-btn primary" @click.stop="startReview(project)">
                      开始评审
                    </button>
                    <button class="action-btn secondary" @click.stop="viewProject(project)">
                      查看详情
                    </button>
                  </div>
                </div>

                <div v-if="pendingProjects.length === 0" class="empty-state">
                  <div class="empty-icon">✅</div>
                  <p>暂无待评审项目</p>
                  <button class="refresh-btn" @click="refreshData">刷新数据</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 中列：评分分布和快速操作 -->
          <div class="dashboard-column">
            <!-- 分配任务状态分布（与 ExpertAssignment.status 一致） -->
            <div class="score-distribution card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">📊</span>
                  任务状态分布
                </h3>
              </div>

              <div class="distribution-chart">
                <div class="chart-bars">
                  <div v-for="item in scoreDistribution" :key="item.range" class="distribution-bar">
                    <div class="bar-label">{{ item.range }}</div>
                    <div class="bar-container">
                      <div
                        class="bar-fill"
                        :style="{ width: item.percentage + '%', backgroundColor: item.color }"
                        :title="item.count + '个项目'"
                      ></div>
                    </div>
                    <span class="bar-value">{{ item.count }}个</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 快速操作 -->
            <div class="quick-actions card-section">
              <h3 class="section-title">
                <span class="section-icon">⚡</span>
                快速操作
              </h3>
              <div class="actions-grid">
                <button class="action-card" @click="goToProjects">
                  <div class="action-icon">📁</div>
                  <div class="action-content">
                    <h4>项目管理</h4>
                    <p>查看待评审项目与评审历史</p>
                  </div>
                </button>
                <button class="action-card" @click="goToReviewHistory">
                  <div class="action-icon">📊</div>
                  <div class="action-content">
                    <h4>评审历史</h4>
                    <p>查看历史评审记录</p>
                  </div>
                </button>
                <button class="action-card" @click="goToNotifications">
                  <div class="action-icon">🔔</div>
                  <div class="action-content">
                    <h4>通知中心</h4>
                    <p>查看系统通知</p>
                  </div>
                </button>
                <button class="action-card" @click="refreshData">
                  <div class="action-icon">🔄</div>
                  <div class="action-content">
                    <h4>刷新数据</h4>
                    <p>更新最新数据</p>
                  </div>
                </button>
              </div>
            </div>

            <!-- 评审统计 -->
            <div class="review-stats card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">📊</span>
                  评审统计
                </h3>
              </div>

              <div class="stats-grid">
                <div class="mini-stat-card">
                  <div class="mini-stat-icon">⭐</div>
                  <div class="mini-stat-content">
                    <div class="mini-stat-value">{{ stats.completedCount || 0 }}</div>
                    <div class="mini-stat-label">已完成评审</div>
                  </div>
                </div>

                <div class="mini-stat-card">
                  <div class="mini-stat-icon">⏱️</div>
                  <div class="mini-stat-content">
                    <div class="mini-stat-value">{{ stats.avgReviewTime || 0 }}天</div>
                    <div class="mini-stat-label">平均评审时间</div>
                  </div>
                </div>

                <div class="mini-stat-card">
                  <div class="mini-stat-icon">📈</div>
                  <div class="mini-stat-content">
                    <div class="mini-stat-value">{{ stats.consistencyRate || 0 }}%</div>
                    <div class="mini-stat-label">评审一致性</div>
                  </div>
                </div>

                <div class="mini-stat-card">
                  <div class="mini-stat-icon">📝</div>
                  <div class="mini-stat-content">
                    <div class="mini-stat-value">{{ stats.totalComments || 0 }}</div>
                    <div class="mini-stat-label">总评语字数</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 右列：最近评审和通知 -->
          <div class="dashboard-column">
            <!-- 最近评审记录 -->
            <div class="recent-reviews card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">📝</span>
                  最近评审记录
                </h3>
                <button
                  class="view-all-btn"
                  @click="goToReviewHistory"
                  v-if="recentReviews.length > 0"
                >
                  查看全部 →
                </button>
              </div>

              <div class="reviews-list">
                <div
                  v-for="review in recentReviews"
                  :key="review.id"
                  class="review-item"
                  @click="viewReviewDetail(review)"
                >
                  <div class="review-header">
                    <h4 class="review-title">{{ review.project_title }}</h4>
                  </div>

                  <div class="review-info">
                    <el-tag :type="getConclusionType(review.recommendation)" size="small">
                      {{ getConclusionText(review.recommendation) }}
                    </el-tag>
                    <span class="review-time">{{ formatTime(review.submitted_at) }}</span>
                  </div>

                  <p class="review-summary">{{ truncateText(review.comments, 100) }}</p>
                </div>

                <div v-if="recentReviews.length === 0" class="empty-state">
                  <div class="empty-icon">📝</div>
                  <p>暂无评审记录</p>
                </div>
              </div>
            </div>

            <!-- 系统通知 -->
            <div class="system-notifications card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">🔔</span>
                  系统通知
                </h3>
                <div class="section-header-actions">
                  <button class="mark-all-btn" @click="markAllAsRead" v-if="unreadCount > 0">
                    标记已读
                  </button>
                  <button class="view-all-btn" @click="goToNotifications">查看全部 →</button>
                </div>
              </div>

              <div class="notifications-list">
                <div
                  v-for="notification in notifications"
                  :key="notification.id"
                  class="notification-item"
                  :class="{ unread: !notification.is_read }"
                  @click="handleNotification(notification)"
                >
                  <div class="notification-icon">{{ notification.icon }}</div>
                  <div class="notification-content">
                    <div class="notification-header">
                      <h4 class="notification-title">{{ notification.title }}</h4>
                      <span class="notification-time">{{ notification.time }}</span>
                    </div>
                    <p class="notification-desc">{{ truncateText(notification.content, 60) }}</p>
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
import { ElMessage, ElMessageBox } from 'element-plus'
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
const userName = ref('评审专家')
const unreadCount = ref(0)

// 数据状态
const userInfo = ref({
  id: '',
  username: '',
  name: '',
  role: 'reviewer',
  email: '',
  department: '',
  title: '',
  research_field: '',
})

const stats = ref({
  pendingCount: 0,
  completedCount: 0,
  approvalRate: 0,
  avgReviewTime: 0,
  consistencyRate: 0,
  totalComments: 0,
})

const pendingProjects = ref<any[]>([])
const recentReviews = ref<any[]>([])
const notifications = ref<any[]>([])
const scoreDistribution = ref<any[]>([
  { range: '已通过', count: 0, percentage: 0, color: '#52c41a' },
  { range: '未通过', count: 0, percentage: 0, color: '#ff4d4f' },
  { range: '待处理', count: 0, percentage: 0, color: '#faad14' },
  { range: '其他', count: 0, percentage: 0, color: '#909399' },
])

// 计算属性
const userInitial = computed(() => {
  return userName.value ? userName.value.charAt(0).toUpperCase() : 'R'
})

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

const getConclusionType = (conclusion: string) => {
  const map: Record<string, string> = {
    approve: 'success',
    approve_with_revision: 'warning',
    reject: 'danger',
    resubmit: 'info',
    recommend: 'success',
    revise_and_recommend: 'warning',
    not_recommend: 'danger',
  }
  return map[conclusion] || 'info'
}

const getConclusionText = (conclusion: string) => {
  const map: Record<string, string> = {
    approve: '通过',
    approve_with_revision: '修改后通过',
    reject: '不通过',
    resubmit: '重新提交',
    recommend: '推荐',
    revise_and_recommend: '修改后推荐',
    not_recommend: '不推荐',
  }
  return map[conclusion] || conclusion
}

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

const formatTime = (dateString: string) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return '今天'
    if (diffDays === 1) return '昨天'
    if (diffDays < 7) return `${diffDays}天前`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`
    return formatDate(dateString)
  } catch {
    return dateString
  }
}

const truncateText = (text: string, maxLength: number) => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
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

// 导航功能
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

const viewReviewDetail = (review: any) => {
  router.push(`/reviewer/reviews/${review.id}`)
}

const goToProjects = () => {
  router.push('/reviewer/projects')
}

const goToReviewHistory = () => {
  router.push('/reviewer/projects/history')
}

const goToNotifications = () => {
  router.push('/notifications')
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

const handleNotification = async (notification: any) => {
  await openNotification(notification)
}

const markAllAsRead = async () => {
  try {
    await api.post('/notifications/mark-all-read')
    notifications.value.forEach((notification) => {
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
  ElMessage.success('数据已刷新')
}

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
  document.documentElement.setAttribute('data-theme', isDarkMode.value ? 'dark' : 'light')
  ElMessage.info(isDarkMode.value ? '已切换到深色模式' : '已切换到浅色模式')
}

const handleLogoError = (e: Event) => {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
}

const handleLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗？', '确认退出', {
    type: 'warning',
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  }).then(() => {
    localStorage.clear()
    sessionStorage.clear()
    router.push('/login')
  })
}

// 加载用户信息
const loadUserInfo = async () => {
  try {
    const userInfoStr = localStorage.getItem('userInfo')
    if (userInfoStr) {
      const user = JSON.parse(userInfoStr)
      userInfo.value = {
        id: user.id || '',
        username: user.username || '',
        name: user.name || user.username || '评审专家',
        role: user.role || 'reviewer',
        email: user.email || '',
        department: user.department || '',
        title: user.title || '',
        research_field: user.research_field || '',
      }
      userName.value = userInfo.value.name || '评审专家'
    } else {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        userInfo.value = {
          id: user.id || '',
          username: user.username || '',
          name: user.name || user.username || '评审专家',
          role: user.role || 'reviewer',
          email: user.email || '',
          department: user.department || '',
          title: user.title || '',
          research_field: user.research_field || '',
        }
        userName.value = userInfo.value.name || '评审专家'
      }
    }
  } catch (error) {
    console.warn('加载用户信息失败:', error)
    userName.value = localStorage.getItem('userName') || '评审专家'
  }
}

// 加载仪表板数据
const loadDashboardData = async () => {
  loading.value = true

  try {
    console.log('正在获取评审专家仪表板数据...')

    await Promise.all([
      loadReviewerStats(),
      loadPendingProjects(),
      loadRecentReviews(),
      loadNotificationsData(),
      loadScoreDistribution(),
    ])
  } catch (error) {
    console.error('加载仪表板数据失败:', error)

    if (error.response?.status === 401) {
      ElMessage.error('登录状态已过期，请重新登录')
      localStorage.clear()
      router.push('/login')
    } else if (error.response?.status === 403) {
      ElMessage.error('您没有评审专家权限')
      router.push('/dashboard')
    } else {
      ElMessage.error('加载数据失败，将显示模拟数据')
      showMockData()
    }
  } finally {
    loading.value = false
  }
}

// 加载评审专家统计数据
const loadReviewerStats = async () => {
  try {
    const response = await api.get('/reviewer/stats')
    if (response.success && response.data) {
      stats.value = response.data
    }
  } catch (error) {
    console.error('加载评审专家统计数据失败:', error)
  }
}

// 加载待评审项目
// 加载待评审项目 - 使用专门的 API
const loadPendingProjects = async () => {
  try {
    // 使用专门的待评审项目 API
    const response = await api.get('/reviewer/pending-projects', {
      params: { limit: 5 },
    })
    if (response.success && response.data) {
      pendingProjects.value = response.data
      // 待评审数量以 /reviewer/stats 的 pendingCount 为准（全量）；此处仅拉 limit 条用于展示，勿用 length 覆盖
    } else {
      console.log('没有待评审项目')
      pendingProjects.value = []
    }
  } catch (error) {
    console.error('加载待评审项目失败:', error)
    pendingProjects.value = []
  }
}

// 加载最近评审记录
const loadRecentReviews = async () => {
  try {
    const response = await api.get('/reviewer/reviews', {
      params: { limit: 5, status: 'submitted' },
    })
    if (response.success && response.data) {
      recentReviews.value = response.data
    }
  } catch (error) {
    console.error('加载最近评审记录失败:', error)
  }
}

// 加载评分分布
const loadScoreDistribution = async () => {
  try {
    const response = await api.get('/reviewer/score-distribution')
    if (response.success && response.data) {
      scoreDistribution.value = response.data
    }
  } catch (error) {
    console.error('加载评分分布失败:', error)
  }
}

// 加载通知数据
const loadNotificationsData = async () => {
  try {
    const response = await api.get('/notifications', {
      params: { limit: 5, orderBy: 'created_at', order: 'desc' },
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

// 显示模拟数据
const showMockData = () => {
  console.log('使用模拟数据')
  stats.value = {
    pendingCount: 3,
    completedCount: 12,
    approvalRate: 75,
    avgReviewTime: 3,
    consistencyRate: 85,
    totalComments: 12345,
  }

  pendingProjects.value = [
    {
      id: '1',
      project_code: 'PROJ-2024-001',
      title: '人工智能辅助医疗诊断系统研究',
      research_field: '人工智能',
      budget_total: 500000,
      applicant_name: '张教授',
    },
    {
      id: '2',
      project_code: 'PROJ-2024-002',
      title: '新型环保材料开发与应用',
      research_field: '材料科学',
      budget_total: 300000,
      applicant_name: '李研究员',
    },
  ]

  recentReviews.value = [
    {
      id: '1',
      project_title: '量子计算算法研究',
      recommendation: 'approve',
      submitted_at: '2024-01-15',
      comments: '研究内容新颖，具有重要的理论和应用价值，研究方法科学合理。',
    },
    {
      id: '2',
      project_title: '生物医药分子筛选平台',
      recommendation: 'approve_with_revision',
      submitted_at: '2024-01-10',
      comments: '技术路线可行，但实验数据需要补充验证。',
    },
  ]

  scoreDistribution.value = [
    { range: '已通过', count: 5, percentage: 25, color: '#52c41a' },
    { range: '未通过', count: 2, percentage: 10, color: '#ff4d4f' },
    { range: '待处理', count: 8, percentage: 40, color: '#faad14' },
    { range: '其他', count: 5, percentage: 25, color: '#909399' },
  ]

  notifications.value = [
    {
      id: 'notif_001',
      type: 'review',
      icon: '⭐',
      title: '新评审任务',
      content: '您有新的项目需要评审，请及时处理。',
      time: '今天 09:00',
      is_read: false,
    },
    {
      id: 'notif_002',
      type: 'system',
      icon: '🔧',
      title: '系统通知',
      content: '系统将于本周六进行维护。',
      time: '昨天 14:30',
      is_read: true,
    },
  ]

  unreadCount.value = notifications.value.filter((n) => !n.is_read).length
}

// 组件生命周期
onMounted(() => {
  console.log('=== 初始化评审专家仪表板页面 ===')

  loadUserInfo().then(() => {
    const userRole = localStorage.getItem('userRole')
    if (userRole?.toLowerCase() !== 'reviewer') {
      ElMessage.warning('检测到您不是评审专家，将跳转到对应工作台')
      setTimeout(() => {
        const rolePaths: Record<string, string> = {
          applicant: '/applicant/dashboard',
          admin: '/admin/dashboard',
          project_manager: '/assistant/dashboard',
        }
        const targetPath = rolePaths[userRole?.toLowerCase() || ''] || '/login'
        router.push(targetPath)
      }, 2000)
    } else {
      loadDashboardData()
    }
  })

  const refreshInterval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      refreshData()
    }
  }, 300000)

  onUnmounted(() => {
    clearInterval(refreshInterval)
  })

  document.addEventListener('click', (e) => {
    if (showNotificationsDropdown.value && !e.target.closest('.notifications-dropdown')) {
      showNotificationsDropdown.value = false
    }
  })
})
</script>

<style scoped>
/* 华文中宋字体 */
h1, h2, h3, h4, button {
  font-family: 'STZhongsong', '华文中宋', 'SimSun', serif;
}

/* ===== 整体布局（与申请人仪表盘保持一致） ===== */
.dashboard-container {
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
}

/* 主内容包装器 */
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

/* ===== 白色顶栏 ===== */
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

/* ===== 侧栏（固定全高） ===== */
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

.user-info-mini {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar-mini {
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

.user-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-name-mini {
  font-size: 14px;
  font-weight: 500;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role-mini {
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
  top: 70px;
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
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  font-size: 18px;
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

.section-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.projects-list,
.reviews-list,
.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.project-item,
.review-item,
.notification-item {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s;
  background: white;
}

.project-item:hover,
.review-item:hover,
.notification-item:hover {
  border-color: #b31b1b;
  box-shadow: 0 4px 12px rgba(179, 27, 27, 0.1);
}

.notification-item.unread {
  background: rgba(179, 27, 27, 0.04);
  border-color: rgba(179, 27, 27, 0.3);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.project-badges {
  display: flex;
  gap: 8px;
}

.project-code {
  font-family: monospace;
  color: #909399;
  font-size: 12px;
}

.project-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #303133;
  line-height: 1.4;
}

.project-info {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
  font-size: 14px;
}

.info-icon {
  font-size: 14px;
  opacity: 0.7;
}

.expired {
  color: #ff4d4f;
}

.urgent {
  color: #fa8c16;
}

.warning {
  color: #fadb14;
}

.project-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
  flex: 1;
}

.action-btn.primary {
  background: #b31b1b;
  color: white;
}

.action-btn.primary:hover {
  background: #8b1515;
}

.action-btn.secondary {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #d9d9d9;
}

.action-btn.secondary:hover {
  background: #e8e8e8;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.review-title {
  margin: 0;
  font-size: 14px;
  color: #303133;
  flex: 1;
  margin-right: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.review-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.review-time {
  font-size: 12px;
  color: #909399;
}

.review-summary {
  margin: 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notification-icon {
  font-size: 20px;
  margin-right: 12px;
  margin-top: 2px;
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
}

.notification-title {
  font-weight: 500;
  color: #2c3e50;
  margin: 0;
  font-size: 14px;
  flex: 1;
  margin-right: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notification-time {
  font-size: 11px;
  color: #7f8c8d;
  white-space: nowrap;
  flex-shrink: 0;
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
  background: #b31b1b;
  border-radius: 50%;
  margin-left: 8px;
  flex-shrink: 0;
  margin-top: 8px;
}

.distribution-chart {
  margin-top: 16px;
}

.chart-bars {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.distribution-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bar-label {
  font-size: 13px;
  color: #606266;
  width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bar-container {
  flex: 1;
  height: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.bar-value {
  font-size: 12px;
  color: #909399;
  min-width: 40px;
  text-align: right;
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
  box-shadow: 0 4px 12px rgba(179, 27, 27, 0.1);
}

.action-icon {
  font-size: 24px;
  width: 48px;
  height: 48px;
  background: rgba(179, 27, 27, 0.08);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #b31b1b;
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.mini-stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: white;
}

.mini-stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(179, 27, 27, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #b31b1b;
}

.mini-stat-content {
  flex: 1;
}

.mini-stat-value {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.mini-stat-label {
  font-size: 12px;
  color: #909399;
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

.refresh-btn {
  margin-top: 12px;
  padding: 8px 16px;
  background: #b31b1b;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.refresh-btn:hover {
  background: #8b1515;
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
  .welcome-card {
    flex-direction: column;
    text-align: center;
    padding: 20px;
  }
  .welcome-illustration {
    margin: 20px 0 0 0;
  }
  .quick-stats {
    justify-content: center;
  }
  .stat-badge {
    min-width: 0;
  }
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

@media print {
  .sidebar,
  .dashboard-header,
  .section-header button,
  .project-actions,
  .action-card {
    display: none !important;
  }
  .main-content {
    margin-left: 0 !important;
  }
  .card-section {
    box-shadow: none !important;
    border: 1px solid #ddd !important;
    page-break-inside: avoid;
  }
}
</style>
