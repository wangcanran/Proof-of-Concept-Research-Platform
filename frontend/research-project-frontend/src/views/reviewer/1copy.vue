<template>
  <div class="dashboard-container">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <div class="sidebar-header">
        <h3 v-if="!sidebarCollapsed" class="sidebar-title">科研项目管理</h3>
        <button class="sidebar-toggle" @click="toggleSidebar">
          {{ sidebarCollapsed ? '→' : '←' }}
        </button>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section">
          <h4 v-if="!sidebarCollapsed" class="nav-section-title">工作台</h4>
          <router-link to="/reviewer/dashboard" class="nav-link" active-class="active">
            <span class="nav-icon">🏠</span>
            <span v-if="!sidebarCollapsed" class="nav-text">工作台</span>
          </router-link>
        </div>

        <div class="nav-section">
          <h4 v-if="!sidebarCollapsed" class="nav-section-title">评审管理</h4>
          <router-link to="/reviewer/viewreview" class="nav-link" active-class="active">
            <span class="nav-icon">📋</span>
            <span v-if="!sidebarCollapsed" class="nav-text">待评审项目</span>
            <span v-if="!sidebarCollapsed && pendingReviews > 0" class="nav-badge">{{
              pendingReviews
            }}</span>
          </router-link>
          <router-link to="/reviewer/history" class="nav-link" active-class="active">
            <span class="nav-icon">📊</span>
            <span v-if="!sidebarCollapsed" class="nav-text">评审历史</span>
          </router-link>
        </div>

        <div class="nav-section">
          <h4 v-if="!sidebarCollapsed" class="nav-section-title">项目管理</h4>
          <router-link to="/reviewer/projects" class="nav-link" active-class="active">
            <span class="nav-icon">📁</span>
            <span v-if="!sidebarCollapsed" class="nav-text">项目浏览</span>
          </router-link>
        </div>

        <div class="nav-section">
          <h4 v-if="!sidebarCollapsed" class="nav-section-title">个人中心</h4>
          <router-link to="/profile" class="nav-link" active-class="active">
            <span class="nav-icon">👤</span>
            <span v-if="!sidebarCollapsed" class="nav-text">个人中心</span>
          </router-link>
          <router-link to="/notifications" class="nav-link" active-class="active">
            <span class="nav-icon">🔔</span>
            <span v-if="!sidebarCollapsed" class="nav-text">通知中心</span>
            <span v-if="!sidebarCollapsed && unreadCount > 0" class="nav-badge">{{
              unreadCount
            }}</span>
          </router-link>
          <router-link to="/help" class="nav-link" active-class="active">
            <span class="nav-icon">❓</span>
            <span v-if="!sidebarCollapsed" class="nav-text">帮助中心</span>
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

    <!-- 主内容区域 -->
    <div class="main-wrapper" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <!-- 顶部导航栏 -->
      <header class="dashboard-header">
        <div class="header-left">
          <div class="mobile-menu-btn" @click="toggleMobileMenu">
            <span class="icon">☰</span>
          </div>
          <h1 class="logo">科研项目管理系统</h1>
          <div class="breadcrumb">
            <span class="current-page">评审专家工作台</span>
          </div>
        </div>
        <div class="header-right">
          <div class="user-menu">
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
        </div>
      </header>

      <!-- 主内容区域 -->
      <main class="main-content">
        <!-- 欢迎区域 -->
        <div class="welcome-section">
          <div class="welcome-card">
            <div class="welcome-content">
              <h2 class="welcome-title">欢迎回来，{{ userName }}专家！</h2>
              <p class="welcome-subtitle">今天是 {{ currentDate }}，祝您评审工作顺利！</p>
              <div class="quick-stats">
                <div class="stat-badge">
                  <span class="stat-value">{{ stats.pendingReviews || 0 }}</span>
                  <span class="stat-label">待评审</span>
                </div>
                <div class="stat-badge">
                  <span class="stat-value">{{ stats.completedReviews || 0 }}</span>
                  <span class="stat-label">已评审</span>
                </div>
                <div class="stat-badge">
                  <span class="stat-value">{{ stats.averageScore || 0 }}</span>
                  <span class="stat-label">平均分</span>
                </div>
              </div>
            </div>
            <div class="welcome-illustration">
              <div class="illustration-icon">⭐</div>
            </div>
          </div>
        </div>

        <!-- 三列布局 -->
        <div class="dashboard-layout">
          <!-- 左列：待评审项目 -->
          <div class="dashboard-column">
            <div class="pending-reviews-section card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">📋</span>
                  待评审项目
                </h3>
                <button class="view-all-btn" @click="navigateTo('pending-reviews')">
                  查看全部 →
                </button>
              </div>

              <div class="projects-grid">
                <div
                  class="review-project-card"
                  v-for="project in pendingProjects"
                  :key="project.id"
                >
                  <div class="project-header">
                    <span class="project-status" :class="getPriorityClass(project.priority)">
                      {{ getPriorityText(project.priority) }}
                    </span>
                    <span class="project-code">{{ project.code }}</span>
                  </div>
                  <h4 class="project-title">{{ project.title }}</h4>
                  <div class="project-info">
                    <div class="info-item">
                      <span class="info-label">申请人</span>
                      <span class="info-value">{{ project.applicant }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">申请金额</span>
                      <span class="info-value">{{ formatFunds(project.budget) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">截止日期</span>
                      <span class="info-value deadline" :class="getDeadlineClass(project.deadline)">
                        {{ formatDate(project.deadline) }}
                      </span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">剩余时间</span>
                      <span class="info-value" :class="getRemainingTimeClass(project.deadline)">
                        {{ getRemainingDays(project.deadline) }}
                      </span>
                    </div>
                  </div>
                  <div class="project-actions">
                    <button class="action-btn primary" @click="startReview(project.id)">
                      开始评审
                    </button>
                    <button class="action-btn secondary" @click="viewProjectDetails(project.id)">
                      查看详情
                    </button>
                  </div>
                </div>

                <!-- 加载状态 -->
                <div v-if="pendingProjects.length === 0 && loading" class="loading-state">
                  <div class="loading-spinner-small"></div>
                  <p>正在加载待评审项目...</p>
                </div>

                <!-- 空状态 -->
                <div v-if="pendingProjects.length === 0 && !loading" class="empty-state">
                  <div class="empty-icon">✅</div>
                  <p>暂无待评审项目</p>
                  <p class="empty-subtext">所有分配的项目都已评审完成</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 中列：快速操作 + 数据统计 -->
          <div class="dashboard-column">
            <!-- 快速操作 -->
            <div class="quick-actions-section card-section">
              <h3 class="section-title">
                <span class="section-icon">⚡</span>
                快速操作
              </h3>
              <div class="actions-grid">
                <button class="action-card" @click="navigateTo('pending-reviews')">
                  <div class="action-icon">📋</div>
                  <div class="action-content">
                    <h4>开始评审</h4>
                    <p>处理待评审项目</p>
                  </div>
                </button>
                <button class="action-card" @click="navigateTo('review-history')">
                  <div class="action-icon">📊</div>
                  <div class="action-content">
                    <h4>评审历史</h4>
                    <p>查看历史评审记录</p>
                  </div>
                </button>
                <button class="action-card" @click="navigateTo('project-browse')">
                  <div class="action-icon">📁</div>
                  <div class="action-content">
                    <h4>项目浏览</h4>
                    <p>查看所有项目信息</p>
                  </div>
                </button>
                <button class="action-card" @click="navigateTo('notifications')">
                  <div class="action-icon">🔔</div>
                  <div class="action-content">
                    <h4>通知中心</h4>
                    <p>查看系统通知</p>
                  </div>
                </button>
              </div>
            </div>

            <!-- 数据统计 -->
            <div class="data-statistics-section card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">📊</span>
                  评审统计
                </h3>
                <button class="refresh-stat-btn" @click="refreshData" title="刷新统计">🔄</button>
              </div>

              <div class="stats-grid">
                <!-- 评审数量统计 -->
                <div class="stat-card enhanced">
                  <div class="stat-header">
                    <div class="stat-icon-container">
                      <div
                        class="stat-icon-bg"
                        style="background: linear-gradient(135deg, #1890ff, #40a9ff)"
                      >
                        <span class="stat-icon">📊</span>
                      </div>
                      <div class="stat-trend-container">
                        <span class="stat-trend" :class="getTrendClass(stats.reviewTrend)">
                          {{ stats.reviewTrend > 0 ? '+' : '' }}{{ stats.reviewTrend || 0 }}%
                        </span>
                        <span class="trend-label">月同比</span>
                      </div>
                    </div>
                  </div>
                  <div class="stat-body">
                    <div class="stat-value">{{ stats.completedReviews || 0 }}</div>
                    <div class="stat-label">本月评审数</div>
                    <div class="stat-description">累计完成评审项目数</div>
                  </div>
                </div>

                <!-- 评审质量分析 -->
                <div class="stat-card enhanced chart-card">
                  <div class="stat-header">
                    <h4 class="chart-title">
                      <span class="chart-icon">📈</span>
                      评审结论分布
                    </h4>
                  </div>
                  <div class="chart-container">
                    <div class="chart-bars">
                      <div class="chart-bar" v-for="item in conclusionData" :key="item.type">
                        <div class="bar-label">
                          <span class="status-dot" :style="{ backgroundColor: item.color }"></span>
                          <span class="status-name">{{ item.name }}</span>
                        </div>
                        <div class="bar-container">
                          <div
                            class="bar"
                            :style="{
                              width: item.percentage + '%',
                              backgroundColor: item.color,
                            }"
                          ></div>
                          <span class="bar-value">{{ item.count }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 双统计卡片：平均分 + 总项目 -->
                <div class="double-stat-card">
                  <div class="mini-stat-card" style="border-right: 1px solid #f0f0f0">
                    <div class="mini-stat-header">
                      <div class="mini-stat-icon" style="background: #f6ffed">
                        <span>⭐</span>
                      </div>
                    </div>
                    <div class="mini-stat-body">
                      <div class="mini-stat-value">{{ stats.averageScore || 0 }}</div>
                      <div class="mini-stat-label">平均分</div>
                      <div class="mini-stat-trend" :class="getTrendClass(stats.scoreTrend)">
                        {{ stats.scoreTrend > 0 ? '+' : '' }}{{ stats.scoreTrend || 0 }}%
                      </div>
                    </div>
                  </div>
                  <div class="mini-stat-card">
                    <div class="mini-stat-header">
                      <div class="mini-stat-icon" style="background: #e6f7ff">
                        <span>📁</span>
                      </div>
                    </div>
                    <div class="mini-stat-body">
                      <div class="mini-stat-value">{{ stats.totalProjects || 0 }}</div>
                      <div class="mini-stat-label">总项目</div>
                      <div class="mini-stat-trend" :class="getTrendClass(stats.projectTrend)">
                        {{ stats.projectTrend > 0 ? '+' : '' }}{{ stats.projectTrend || 0 }}%
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 评审效率统计 -->
                <div class="stat-card enhanced efficiency-card">
                  <div class="stat-header">
                    <div class="stat-icon-container">
                      <div
                        class="stat-icon-bg"
                        style="background: linear-gradient(135deg, #52c41a, #73d13d)"
                      >
                        <span class="stat-icon">⏱️</span>
                      </div>
                      <div class="stat-trend-container">
                        <span class="stat-trend" :class="getTrendClass(stats.efficiencyTrend)">
                          {{ stats.efficiencyTrend > 0 ? '+' : ''
                          }}{{ stats.efficiencyTrend || 0 }}%
                        </span>
                        <span class="trend-label">月同比</span>
                      </div>
                    </div>
                  </div>
                  <div class="stat-body">
                    <div class="stat-value">{{ stats.averageTime || 0 }}天</div>
                    <div class="stat-label">平均评审时间</div>
                    <div class="efficiency-breakdown">
                      <div class="breakdown-item">
                        <span class="breakdown-label">最快</span>
                        <span class="breakdown-value">{{ stats.fastestTime || 0 }}天</span>
                      </div>
                      <div class="breakdown-item">
                        <span class="breakdown-label">最慢</span>
                        <span class="breakdown-value">{{ stats.slowestTime || 0 }}天</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 右列：最近评审记录 + 通知中心 -->
          <div class="dashboard-column">
            <!-- 最近评审记录 -->
            <div class="recent-reviews-section card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">📝</span>
                  最近评审记录
                </h3>
                <button class="view-all-btn" @click="navigateTo('review-history')">
                  查看全部 →
                </button>
              </div>

              <div class="reviews-list">
                <div
                  v-for="review in recentReviews"
                  :key="review.id"
                  class="review-item"
                  @click="viewReviewDetails(review.id)"
                >
                  <div class="review-header">
                    <h4 class="review-project-title">{{ review.projectTitle }}</h4>
                    <span class="review-score" :class="getScoreClass(review.score)">
                      {{ review.score }}分
                    </span>
                  </div>
                  <div class="review-info">
                    <span class="review-conclusion" :class="getConclusionClass(review.conclusion)">
                      {{ getConclusionText(review.conclusion) }}
                    </span>
                    <span class="review-time">{{ review.time }}</span>
                  </div>
                  <div class="review-summary" v-if="review.summary">
                    <p class="summary-text">{{ review.summary }}</p>
                  </div>
                </div>

                <!-- 空状态 -->
                <div v-if="recentReviews.length === 0 && !loading" class="empty-state">
                  <div class="empty-icon">📝</div>
                  <p>暂无评审记录</p>
                  <p class="empty-subtext">开始评审后会显示在这里</p>
                </div>
              </div>
            </div>

            <!-- 通知中心 -->
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
                  :class="{ unread: !notification.read }"
                  @click="openNotification(notification)"
                >
                  <div class="notification-icon">{{ notification.icon }}</div>
                  <div class="notification-content">
                    <div class="notification-header">
                      <h4 class="notification-title">{{ notification.title }}</h4>
                      <span class="notification-time">{{ notification.time }}</span>
                    </div>
                    <p class="notification-desc">{{ notification.description }}</p>
                    <div class="notification-meta">
                      <span
                        class="notification-type"
                        :class="getNotificationTypeClass(notification.type)"
                      >
                        {{ getNotificationTypeText(notification.type) }}
                      </span>
                      <span class="notification-priority" v-if="notification.priority === 'high'">
                        ⚠️ 重要
                      </span>
                    </div>
                  </div>
                  <span class="unread-dot" v-if="!notification.read"></span>
                </div>

                <div v-if="notifications.length === 0 && !loading" class="empty-state">
                  <div class="empty-icon">📭</div>
                  <p>暂无通知</p>
                  <p class="empty-subtext">当有新消息时会在这里显示</p>
                </div>
              </div>
            </div>

            <!-- 系统状态 -->
            <div class="system-status card-section">
              <div class="status-card">
                <div class="status-header">
                  <h4>
                    <span class="status-icon">🔧</span>
                    系统状态
                  </h4>
                  <span class="status-badge" :class="systemStatusClass">
                    {{ systemStatusText }}
                  </span>
                </div>
                <div class="status-info">
                  <div class="status-item">
                    <span class="status-label">后端连接</span>
                    <span class="status-value" :class="backendStatusClass">
                      {{ backendStatusText }}
                    </span>
                  </div>
                  <div class="status-item">
                    <span class="status-label">数据库</span>
                    <span class="status-value" :class="databaseStatusClass">
                      {{ databaseStatusText }}
                    </span>
                  </div>
                  <div class="status-item">
                    <span class="status-label">最后更新</span>
                    <span class="status-value">{{ lastUpdateTime }}</span>
                  </div>
                </div>
                <div class="status-actions">
                  <button class="status-refresh-btn" @click="refreshData">
                    <span class="icon">🔄</span>
                    刷新数据
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- 移动端菜单遮罩 -->
    <div v-if="showMobileMenu" class="mobile-menu-overlay" @click="toggleMobileMenu"></div>

    <!-- 加载遮罩 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()
const route = useRoute()

// 响应式数据
const loading = ref(false)
const isDarkMode = ref(false)
const sidebarCollapsed = ref(false)
const showMobileMenu = ref(false)
const showNotificationsDropdown = ref(false)
const userName = ref('')
const userRole = ref('reviewer')
const userId = ref('')
const unreadCount = ref(0)
const pendingReviews = ref(0)

// 数据状态
const stats = ref({
  pendingReviews: 0,
  completedReviews: 0,
  averageScore: 0,
  totalProjects: 0,
  reviewTrend: 0,
  scoreTrend: 0,
  projectTrend: 0,
  efficiencyTrend: 0,
  averageTime: 0,
  fastestTime: 0,
  slowestTime: 0,
})

const pendingProjects = ref([])
const recentReviews = ref([])
const notifications = ref([])

// 系统状态
const backendConnected = ref(false)
const databaseConnected = ref(true)
const lastUpdateTime = ref('')

// 计算属性
const userInitial = computed(() => {
  return userName.value ? userName.value.charAt(0).toUpperCase() : 'R'
})

const userRoleName = computed(() => {
  return '评审专家'
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

const systemStatusClass = computed(() => {
  return backendConnected.value && databaseConnected.value ? 'success' : 'warning'
})

const systemStatusText = computed(() => {
  return backendConnected.value && databaseConnected.value ? '运行正常' : '部分异常'
})

const backendStatusClass = computed(() => {
  return backendConnected.value ? 'success' : 'error'
})

const backendStatusText = computed(() => {
  return backendConnected.value ? '已连接' : '未连接'
})

const databaseStatusClass = computed(() => {
  return databaseConnected.value ? 'success' : 'error'
})

const databaseStatusText = computed(() => {
  return databaseConnected.value ? '正常' : '异常'
})

const recentNotifications = computed(() => {
  return notifications.value.slice(0, 3)
})

// 评审结论分布数据
const conclusionData = computed(() => {
  const conclusionCounts = {
    通过: 0,
    修改后重审: 0,
    不通过: 0,
    重新提交: 0,
  }

  recentReviews.value.forEach((review) => {
    const conclusion = review.conclusion
    if (conclusionCounts[conclusion] !== undefined) {
      conclusionCounts[conclusion]++
    }
  })

  const total = Object.values(conclusionCounts).reduce((sum, count) => sum + count, 0)

  const conclusionColors = {
    通过: '#52c41a',
    修改后重审: '#fa8c16',
    不通过: '#f5222d',
    重新提交: '#1890ff',
  }

  return Object.entries(conclusionCounts).map(([name, count]) => ({
    name,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    color: conclusionColors[name] || '#666',
  }))
})

// 方法
const navigateTo = (action) => {
  const routes = {
    'pending-reviews': '/reviewer/viewreview',
    'review-history': '/reviewer/history',
    'project-browse': '/reviewer/projects',
    notifications: '/notifications',
    profile: '/profile',
    help: '/help',
  }

  if (routes[action]) {
    router.push(routes[action])
  }
}

const startReview = (projectId) => {
  console.log('开始评审项目:', projectId)
  router.push({
    path: '/reviewer/viewreview',
    query: {
      projectId,
    },
  })
}

const viewProjectDetails = (projectId) => {
  router.push(`/projects/detail/${projectId}`)
}

const viewReviewDetails = (reviewId) => {
  router.push(`/reviewer/history/detail/${reviewId}`)
}

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value
}

const toggleNotifications = () => {
  showNotificationsDropdown.value = !showNotificationsDropdown.value
}

const openNotification = async (notification) => {
  try {
    if (!notification.read) {
      await request.post(`/api/notifications/${notification.id}/read`)
      notification.read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }

    if (notification.link) {
      router.push(notification.link)
    } else if (notification.relatedType === 'project') {
      router.push(`/projects/detail/${notification.relatedId}`)
    } else if (notification.relatedType === 'review') {
      router.push(`/reviewer/history/detail/${notification.relatedId}`)
    }

    showNotificationsDropdown.value = false
  } catch (error) {
    console.error('打开通知失败:', error)
  }
}

const markAllAsRead = async () => {
  try {
    await request.post('/api/notifications/mark-all-read')

    notifications.value.forEach((notification) => {
      notification.read = true
    })
    unreadCount.value = 0

    if (showNotificationsDropdown.value) {
      ElMessage.success('所有通知已标记为已读')
    }
  } catch (error) {
    console.error('标记全部已读失败:', error)
    ElMessage.error('标记全部已读失败')
  }
}

const getPriorityClass = (priority) => {
  const classMap = {
    urgent: 'urgent',
    high: 'high',
    medium: 'medium',
    low: 'low',
  }
  return classMap[priority] || 'medium'
}

const getPriorityText = (priority) => {
  const priorityMap = {
    urgent: '紧急',
    high: '高',
    medium: '中',
    low: '低',
  }
  return priorityMap[priority] || '中'
}

const getScoreClass = (score) => {
  if (score >= 85) return 'high'
  if (score >= 70) return 'medium'
  if (score >= 60) return 'low'
  return 'fail'
}

const getConclusionClass = (conclusion) => {
  const classMap = {
    通过: 'approved',
    修改后重审: 'revise',
    不通过: 'rejected',
    重新提交: 'resubmit',
  }
  return classMap[conclusion] || 'other'
}

const getConclusionText = (conclusion) => {
  const conclusionMap = {
    APPROVE: '通过',
    APPROVE_WITH_REVISION: '修改后重审',
    REJECT: '不通过',
    RESUBMIT: '重新提交',
  }
  return conclusionMap[conclusion] || conclusion || '待评审'
}

const getTrendClass = (trend) => {
  if (trend > 0) return 'positive'
  if (trend < 0) return 'negative'
  return 'neutral'
}

const getNotificationTypeText = (type) => {
  const typeMap = {
    project: '项目通知',
    review: '评审通知',
    system: '系统通知',
    deadline: '截止提醒',
    assignment: '任务分配',
    message: '消息通知',
    warning: '警告通知',
    info: '信息通知',
  }
  return typeMap[type] || type
}

const getNotificationTypeClass = (type) => {
  const classMap = {
    project: 'project',
    review: 'review',
    system: 'system',
    deadline: 'deadline',
    assignment: 'assignment',
    message: 'message',
    warning: 'warning',
    info: 'info',
  }
  return classMap[type] || type
}

const formatFunds = (funds) => {
  if (!funds) return '¥0'
  const num = Number(funds)
  if (isNaN(num)) return '¥0'
  if (num >= 100000000) {
    return '¥' + (num / 100000000).toFixed(2) + '亿'
  }
  if (num >= 10000) {
    return '¥' + (num / 10000).toFixed(2) + '万'
  }
  return '¥' + num.toFixed(2)
}

const formatDate = (dateString) => {
  if (!dateString) return '未设置'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  } catch (e) {
    return dateString
  }
}

const getRemainingDays = (deadline) => {
  if (!deadline) return '未设置'
  const now = new Date()
  const endDate = new Date(deadline)
  const diffTime = endDate - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return '已过期'
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '明天'
  return `${diffDays}天`
}

const getDeadlineClass = (deadline) => {
  if (!deadline) return ''
  const now = new Date()
  const endDate = new Date(deadline)
  const diffTime = endDate - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'expired'
  if (diffDays <= 3) return 'urgent'
  if (diffDays <= 7) return 'warning'
  return ''
}

const getRemainingTimeClass = (deadline) => {
  if (!deadline) return ''
  const now = new Date()
  const endDate = new Date(deadline)
  const diffTime = endDate - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'expired'
  if (diffDays <= 3) return 'urgent'
  return ''
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
    console.log('从localStorage获取的用户信息:', userStr)
    if (userStr) {
      const user = JSON.parse(userStr)
      userName.value = user.username || user.nickname || user.name || '用户'
      userRole.value = user.role || 'reviewer'
      userId.value = user.id || user.user_id || ''

      // 保存到localStorage以便其他组件使用
      localStorage.setItem('userName', userName.value)
      localStorage.setItem('userRole', userRole.value)
      localStorage.setItem('userId', userId.value)
    } else {
      // 尝试从API获取用户信息
      const response = await request.get('/api/user/profile')
      if (response.success && response.data) {
        const userData = response.data.data || response.data
        userName.value = userData.username || userData.name || '用户'
        userRole.value = userData.role || 'reviewer'
        userId.value = userData.id || ''
      }
    }
  } catch (error) {
    console.warn('加载用户信息失败:', error)
    userName.value = localStorage.getItem('userName') || '用户'
    userRole.value = localStorage.getItem('userRole') || 'reviewert'
    userId.value = localStorage.getItem('userId') || ''
  }
}

// 加载待评审项目(用于工作台左栏)
const loadPendingProjects = async () => {
  try {
    const endpoints = ['/api/reviewer/review']

    let projectsResponse = null
    for (const endpoint of endpoints) {
      try {
        const res = await request.get(endpoint, {
          params: {
            limit: 6,
            orderBy: 'deadline',
            order: 'asc',
          },
        })

        if (res && (res.success || res.data)) {
          projectsResponse = res
          break
        }
      } catch (e) {
        console.log(`项目端点1 ${endpoint} 失败:`, e.message)
        continue
      }
    }

    if (projectsResponse) {
      const projectsData = projectsResponse.data?.data || projectsResponse.data || projectsResponse
      console.log('待评审项目API返回数据:', projectsData)

      let projectsArray = []
      if (Array.isArray(projectsData)) {
        projectsArray = projectsData
      } else if (projectsData.projects) {
        projectsArray = projectsData.projects
      } else if (projectsData.items) {
        projectsArray = projectsData.items
      } else if (projectsData.tasks) {
        projectsArray = projectsData.tasks
      }

      if (projectsArray.length > 0) {
        pendingProjects.value = projectsArray.map((project) => ({
          id: project.id || project.project_id,
          code:
            project.project_code || project.code || `PROJ-${(project.id || '').substring(0, 8)}`,
          title: project.title || project.project_title || '未命名项目',
          priority: project.priority || 'medium',
          budget: project.budget || project.budget_total || 0,
          deadline: project.deadline || project.review_deadline || '',
          applicant: project.applicant_name || project.applicant || '未知申请人',
          category: project.category || project.project_category || '未分类',
          reviewId: project.review_id || '',
        }))

        pendingReviews.value = pendingProjects.value.length
        stats.value.pendingReviews = pendingProjects.value.length
      } else {
        showMockPendingProjects()
      }
    } else {
      showMockPendingProjects()
    }
  } catch (error) {
    console.error('加载待评审项目失败:', error)
    showMockPendingProjects()
  }
}

const showMockPendingProjects = () => {
  console.log('使用模拟待评审项目数据')
  pendingProjects.value = [
    {
      id: '1',
      code: 'PROJ-2024001',
      title: '人工智能辅助医疗诊断系统研究',
      priority: 'urgent',
      budget: 500000,
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      applicant: '张研究员',
      category: '人工智能',
      reviewId: 'rev001',
    },
    {
      id: '2',
      code: 'PROJ-2024002',
      title: '新型环保材料开发与应用',
      priority: 'high',
      budget: 300000,
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      applicant: '李教授',
      category: '材料科学',
      reviewId: 'rev002',
    },
    {
      id: '3',
      code: 'PROJ-2024003',
      title: '大数据分析平台构建',
      priority: 'medium',
      budget: 200000,
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      applicant: '王博士',
      category: '信息技术',
      reviewId: 'rev003',
    },
  ]

  pendingReviews.value = pendingProjects.value.length
  stats.value.pendingReviews = pendingProjects.value.length
}

// 加载最近评审记录
const loadRecentReviews = async () => {
  try {
    const endpoints = ['/api/reviewer/recent-reviews', '/api/reviewer/history']

    let reviewsResponse = null
    for (const endpoint of endpoints) {
      try {
        const res = await request.get(endpoint, {
          params: {
            limit: 5,
            orderBy: 'submitted_at',
            order: 'desc',
          },
        })

        if (res && (res.success || res.data)) {
          reviewsResponse = res
          break
        }
      } catch (e) {
        console.log(`评审记录端点 ${endpoint} 失败:`, e.message)
        continue
      }
    }

    if (reviewsResponse) {
      const reviewsData = reviewsResponse.data?.data || reviewsResponse.data || reviewsResponse
      console.log('最近评审记录API返回数据:', reviewsData)

      let reviewsArray = []
      if (Array.isArray(reviewsData)) {
        reviewsArray = reviewsData
      } else if (reviewsData.reviews) {
        reviewsArray = reviewsData.reviews
      } else if (reviewsData.history) {
        reviewsArray = reviewsData.history
      }

      if (reviewsArray.length > 0) {
        recentReviews.value = reviewsArray.map((review) => ({
          id: review.id || review.review_id,
          projectId: review.project_id,
          projectTitle: review.project_title || '未命名项目',
          score: review.total_score || review.score || 0,
          conclusion: review.recommendation || review.conclusion,
          summary: review.comments || review.summary || '',
          time: formatTime(review.submitted_at || review.created_at),
        }))

        // 更新统计信息
        updateStatsFromReviews()
      } else {
        showMockRecentReviews()
      }
    } else {
      showMockRecentReviews()
    }
  } catch (error) {
    console.error('加载最近评审记录失败:', error)
    showMockRecentReviews()
  }
}

const showMockRecentReviews = () => {
  console.log('使用模拟评审记录数据')
  recentReviews.value = [
    {
      id: '1',
      projectTitle: '量子计算算法研究',
      score: 92,
      conclusion: '通过',
      summary: '研究内容新颖，实验设计合理，具有重要的理论和应用价值',
      time: '2天前',
    },
    {
      id: '2',
      projectTitle: '生物医药分子筛选平台',
      score: 78,
      conclusion: '修改后重审',
      summary: '技术路线可行，但实验数据需要补充验证',
      time: '5天前',
    },
    {
      id: '3',
      projectTitle: '智慧城市建设方案',
      score: 85,
      conclusion: '通过',
      summary: '方案完整，符合智慧城市发展需求',
      time: '1周前',
    },
  ]

  updateStatsFromReviews()
}

const updateStatsFromReviews = () => {
  if (recentReviews.value.length > 0) {
    const scores = recentReviews.value.map((r) => r.score).filter((s) => s > 0)
    const averageScore =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : 0

    stats.value.completedReviews = recentReviews.value.length
    stats.value.averageScore = averageScore
    stats.value.totalProjects = recentReviews.value.length + 3 // 模拟数据
  }
}

// 加载通知数据
const loadNotificationsData = async () => {
  try {
    const endpoints = ['/api/notifications', '/api/reviewer/notifications']

    let notificationsResponse = null
    for (const endpoint of endpoints) {
      try {
        const res = await request.get(endpoint, {
          params: {
            limit: 5,
            orderBy: 'created_at',
            order: 'desc',
          },
        })

        if (res && (res.success || res.data)) {
          notificationsResponse = res
          break
        }
      } catch (e) {
        console.log(`通知端点 ${endpoint} 失败:`, e.message)
        continue
      }
    }

    if (notificationsResponse) {
      const notificationsData =
        notificationsResponse.data?.data || notificationsResponse.data || notificationsResponse
      console.log('通知API返回数据:', notificationsData)

      let notificationsArray = []
      if (Array.isArray(notificationsData)) {
        notificationsArray = notificationsData
      } else if (notificationsData.notifications) {
        notificationsArray = notificationsData.notifications
      }

      if (notificationsArray.length > 0) {
        notifications.value = notificationsArray.map((n) => ({
          id: n.id || n.notification_id,
          title: n.title || n.subject || '系统通知',
          description: n.description || n.content || '',
          type: n.type || 'info',
          icon: getNotificationIcon(n.type),
          time: formatTime(n.created_at || n.time),
          read: n.read || false,
          link: n.link || n.url || '',
          relatedType: n.related_type,
          relatedId: n.related_id,
          priority: n.priority || 'medium',
        }))

        unreadCount.value = notifications.value.filter((n) => !n.read).length
      } else {
        showMockNotificationsData()
      }
    } else {
      showMockNotificationsData()
    }
  } catch (error) {
    console.error('加载通知失败:', error)
    showMockNotificationsData()
  }
}

const showMockNotificationsData = () => {
  console.log('使用模拟通知数据')
  notifications.value = [
    {
      id: 1,
      title: '新项目分配通知',
      description: '您有3个新的项目需要评审，请及时处理',
      type: 'assignment',
      icon: '📋',
      time: '1小时前',
      read: false,
    },
    {
      id: 2,
      title: '评审截止提醒',
      description: '项目PROJ-2024001的评审截止日期即将到来',
      type: 'deadline',
      icon: '⏰',
      time: '3小时前',
      read: true,
    },
    {
      id: 3,
      title: '系统更新通知',
      description: '评审系统将于本周末进行维护升级',
      type: 'system',
      icon: '🔧',
      time: '1天前',
      read: false,
    },
  ]

  unreadCount.value = notifications.value.filter((n) => !n.read).length
}

// 辅助函数
const formatTime = (dateString) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const diffHours = diff / (1000 * 60 * 60)

    if (diffHours < 1) {
      return `${Math.floor(diff / (1000 * 60))}分钟前`
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}小时前`
    } else if (diffHours < 168) {
      return `${Math.floor(diffHours / 24)}天前`
    } else {
      return date.toLocaleDateString('zh-CN')
    }
  } catch (e) {
    return dateString
  }
}

const getNotificationIcon = (type) => {
  const iconMap = {
    project: '📋',
    review: '⭐',
    system: '🔧',
    deadline: '⏰',
    assignment: '📥',
    message: '💬',
    warning: '⚠️',
    info: 'ℹ️',
  }
  return iconMap[type] || '📢'
}

// 加载评审统计
const loadReviewStats = async () => {
  try {
    const response = await request.get('/api/dashboard/reviewer')
    if (response && (response.success || response.data)) {
      const data = response.data?.data || response.data || response
      console.log('评审仪表板统计API返回数据:', data)

      if (data.stats || data.summary) {
        const statsData = data.stats || data.summary

        stats.value.reviewTrend = statsData.review_trend || statsData.reviewTrend || 5
        stats.value.scoreTrend = statsData.score_trend || statsData.scoreTrend || 2
        stats.value.projectTrend = statsData.project_trend || statsData.projectTrend || 10
        stats.value.efficiencyTrend = statsData.efficiency_trend || statsData.efficiencyTrend || 3

        if (statsData.average_time || statsData.averageTime) {
          stats.value.averageTime = statsData.average_time || statsData.averageTime
        }
        if (statsData.fastest_time || statsData.fastestTime) {
          stats.value.fastestTime = statsData.fastest_time || statsData.fastestTime
        }
        if (statsData.slowest_time || statsData.slowestTime) {
          stats.value.slowestTime = statsData.slowest_time || statsData.slowestTime
        }
      }
    }
  } catch (error) {
    console.error('加载评审统计失败:', error)
    // 使用模拟数据
    stats.value.reviewTrend = 5
    stats.value.scoreTrend = 2
    stats.value.projectTrend = 10
    stats.value.efficiencyTrend = 3
    stats.value.averageTime = 3.5
    stats.value.fastestTime = 1
    stats.value.slowestTime = 7
  }
}

// 测试系统连接
const testSystemConnection = async () => {
  try {
    const response = await request.get('/api/db/test')

    if (response.success) {
      console.log('✅ 后端连接正常')
      backendConnected.value = true
    } else {
      console.error('后端连接失败')
      backendConnected.value = false
    }
  } catch (error) {
    console.error('连接后端失败:', error)
    backendConnected.value = false
  }
}

// 显示模拟数据
const showMockData = () => {
  console.log('使用完整的模拟数据')

  showMockPendingProjects()
  showMockRecentReviews()
  showMockNotificationsData()

  backendConnected.value = true
  databaseConnected.value = true
  lastUpdateTime.value = new Date().toLocaleTimeString('zh-CN')
}

// 加载仪表板数据
const loadDashboardData = async () => {
  loading.value = true

  try {
    console.log('正在获取评审专家仪表板数据...')

    // 测试系统连接
    await testSystemConnection()

    // 并行加载数据
    await Promise.all([
      loadPendingProjects(),
      loadRecentReviews(),
      loadNotificationsData(),
      loadReviewStats(),
    ])

    lastUpdateTime.value = new Date().toLocaleTimeString('zh-CN')
  } catch (error) {
    console.error('加载仪表板数据失败:', error)

    if (error.response?.status === 401) {
      ElMessage.error('登录状态已过期，请重新登录')
      localStorage.clear()
      sessionStorage.clear()
      router.push('/login')
    } else if (error.response?.status === 403) {
      ElMessage.error('没有权限访问评审专家工作台')
      router.push('/')
    } else {
      ElMessage.error('加载数据失败，将显示模拟数据')
      showMockData()
    }
  } finally {
    loading.value = false
  }
}

// 组件生命周期
onMounted(() => {
  console.log('=== 初始化评审专家工作台页面 ===')
  console.log('当前路由路径:', route.path)
  console.log('用户角色期望: reviewer')

  // 先加载用户信息
  loadUserInfo().then(() => {
    console.log('加载后的用户信息:', {
      name: userName.value,
      role: userRole.value,
      id: userId.value,
    })

    // 检查角色是否匹配
    if (userRole.value.toLowerCase() !== 'reviewer') {
      console.warn(`⚠️ 警告：当前用户角色 "${userRole.value}" 不匹配评审专家角色`)
      ElMessage.warning(`检测到您是${userRoleName.value}，将跳转到对应工作台`)

      setTimeout(() => {
        const rolePaths = {
          applicant: '/applicant/dashboard',
          assistant: '/assistant/dashboard',
          admin: '/admin/dashboard',
        }
        const targetPath = rolePaths[userRole.value.toLowerCase()] || '/login'
        router.push(targetPath)
      }, 2000)
    } else {
      // 然后加载仪表板数据
      loadDashboardData()
    }
  })

  // 设置定时刷新
  const refreshInterval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      refreshData()
    }
  }, 300000) // 5分钟刷新一次

  // 清理定时器
  onUnmounted(() => {
    clearInterval(refreshInterval)
  })
})

// 点击外部关闭通知下拉
document.addEventListener('click', (e) => {
  if (showNotificationsDropdown.value && !e.target.closest('.notifications-dropdown')) {
    showNotificationsDropdown.value = false
  }
})
</script>

<style scoped>
/* 使用与ApplicantDashboard相同的样式 */
.dashboard-container {
  min-height: 100vh;
  background: #f5f7fa;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  display: flex;
}

/* 侧边栏样式 */
.sidebar {
  width: 250px;
  background: white;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  z-index: 1000;
  position: fixed;
  height: 100vh;
  left: 0;
  top: 0;
}

.sidebar-collapsed {
  width: 60px;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-toggle {
  background: #f5f7fa;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.3s;
}

.sidebar-toggle:hover {
  background: #e8e8e8;
  color: #333;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 0;
  overflow-y: auto;
}

.nav-section {
  margin-bottom: 24px;
}

.nav-section-title {
  font-size: 12px;
  color: #7f8c8d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 8px 20px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-link {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: #2c3e50;
  text-decoration: none;
  transition: all 0.3s;
  position: relative;
  white-space: nowrap;
}

.nav-link:hover {
  background: #f5f7fa;
  color: #1890ff;
}

.nav-link.active {
  background: #e6f7ff;
  color: #1890ff;
  border-right: 3px solid #1890ff;
}

.nav-link.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #1890ff;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  border-top: 1px solid #f0f0f0;
  padding: 16px 20px;
}

.user-info-mini {
  display: flex;
  align-items: center;
}

.user-avatar-mini {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
}

.user-details {
  margin-left: 12px;
  white-space: nowrap;
  overflow: hidden;
}

.user-name-mini {
  font-size: 14px;
  font-weight: 500;
  color: #2c3e50;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role-mini {
  font-size: 12px;
  color: #7f8c8d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 主内容区域 */
.main-wrapper {
  flex: 1;
  margin-left: 250px;
  transition: margin-left 0.3s ease;
}

.main-wrapper.sidebar-collapsed {
  margin-left: 60px;
}

/* 顶部导航栏 */
.dashboard-header {
  background: white;
  padding: 0 32px;
  height: 70px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 900;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.mobile-menu-btn {
  display: none;
  width: 40px;
  height: 40px;
  border: none;
  background: #f5f7fa;
  border-radius: 8px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.mobile-menu-btn:hover {
  background: #e8e8e8;
}

.mobile-menu-btn .icon {
  font-size: 20px;
}

.logo {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #1890ff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.breadcrumb {
  font-size: 14px;
  color: #666;
}

.current-page {
  color: #1890ff;
  font-weight: 500;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: 16px;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: #f5f7fa;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  position: relative;
}

.icon-btn:hover {
  background: #e8e8e8;
  transform: translateY(-2px);
}

.icon {
  font-size: 18px;
}

.notification-btn {
  position: relative;
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

.notifications-dropdown {
  position: relative;
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
  color: #1890ff;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.notifications-dropdown-header button:hover {
  background: #f5f7fa;
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
  color: #1890ff;
  text-decoration: none;
  font-size: 12px;
}

.notifications-dropdown-footer a:hover {
  text-decoration: underline;
}

.logout-btn {
  padding: 8px 16px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 6px;
  color: #ff4d4f;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s;
}

.logout-btn:hover {
  background: #ffccc7;
}

/* 主内容区域 */
.main-content {
  padding: 24px;
  max-width: 1800px;
  margin: 0 auto;
}

/* 欢迎区域 */
.welcome-section {
  margin-bottom: 24px;
}

.welcome-card {
  background: white;
  border-radius: 12px;
  padding: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.welcome-content {
  flex: 1;
}

.welcome-title {
  font-size: 28px;
  color: #2c3e50;
  margin: 0 0 8px 0;
}

.welcome-subtitle {
  color: #7f8c8d;
  font-size: 16px;
  margin: 0 0 24px 0;
}

.quick-stats {
  display: flex;
  gap: 20px;
}

.stat-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 20px;
  background: #f8f9fa;
  border-radius: 10px;
  min-width: 90px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1890ff;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: #666;
}

.welcome-illustration {
  margin-left: 40px;
}

.illustration-icon {
  font-size: 72px;
  opacity: 0.8;
}

/* 仪表板布局 */
.dashboard-layout {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
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
}

/* 待评审项目 */
.pending-reviews-section {
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

.section-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.view-all-btn {
  padding: 6px 12px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.3s;
  white-space: nowrap;
}

.view-all-btn:hover {
  background: #40a9ff;
}

.mark-all-btn {
  padding: 6px 12px;
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
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
  white-space: nowrap;
}

.refresh-stat-btn:hover {
  background: #e8e8e8;
  transform: rotate(90deg);
}

/* 待评审项目卡片 */
.review-project-card {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #f0f0f0;
  transition: all 0.3s;
  margin-bottom: 12px;
}

.review-project-card:hover {
  border-color: #d9d9d9;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

/* 评审状态标签 */
.project-status {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.project-status.urgent {
  background: #fff2f0;
  color: #ff4d4f;
}

.project-status.high {
  background: #fff7e6;
  color: #fa8c16;
}

.project-status.medium {
  background: #e6f7ff;
  color: #1890ff;
}

.project-status.low {
  background: #f6ffed;
  color: #52c41a;
}

.project-code {
  font-size: 11px;
  color: #666;
  font-family: monospace;
}

.project-title {
  font-size: 16px;
  color: #2c3e50;
  margin: 0 0 12px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-info {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin: 12px 0;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 11px;
  color: #7f8c8d;
}

.info-value {
  font-size: 13px;
  color: #2c3e50;
  font-weight: 500;
}

.deadline.expired {
  color: #ff4d4f;
}

.deadline.urgent {
  color: #fa8c16;
}

.deadline.warning {
  color: #fadb14;
}

.project-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.action-btn {
  flex: 1;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.3s;
}

.action-btn.primary {
  background: #1890ff;
  color: white;
}

.action-btn.primary:hover {
  background: #40a9ff;
}

.action-btn.secondary {
  background: #f5f5f5;
  color: #666;
}

.action-btn.secondary:hover {
  background: #e8e8e8;
}

/* 快速操作 */
.quick-actions-section {
  padding: 24px;
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
  border-color: #1890ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.1);
}

.action-icon {
  font-size: 24px;
  width: 48px;
  height: 48px;
  background: #f5f7fa;
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
  line-height: 1.4;
}

/* 数据统计 */
.data-statistics-section {
  padding: 24px;
}

.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-card.enhanced {
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s;
}

.stat-card.enhanced:hover {
  border-color: #1890ff;
  box-shadow: 0 4px 20px rgba(24, 144, 255, 0.1);
}

.stat-header {
  margin-bottom: 16px;
}

.stat-icon-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-icon-bg {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  font-size: 24px;
  color: white;
}

.stat-trend-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.stat-trend {
  font-size: 14px;
  font-weight: 600;
}

.stat-trend.positive {
  color: #52c41a;
}

.stat-trend.negative {
  color: #ff4d4f;
}

.stat-trend.neutral {
  color: #7f8c8d;
}

.trend-label {
  font-size: 11px;
  color: #7f8c8d;
  margin-top: 2px;
}

.stat-body {
  margin-top: 12px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: #7f8c8d;
  margin-bottom: 8px;
}

.stat-description {
  font-size: 11px;
  color: #8c8c8c;
}

/* 图表卡片 */
.chart-card {
  padding: 20px;
}

.chart-title {
  font-size: 16px;
  color: #2c3e50;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.chart-icon {
  font-size: 18px;
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

/* 双统计卡片 */
.double-stat-card {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  overflow: hidden;
}

.mini-stat-card {
  padding: 20px;
  text-align: center;
}

.mini-stat-header {
  margin-bottom: 12px;
}

.mini-stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  font-size: 18px;
}

.mini-stat-body {
  margin-top: 8px;
}

.mini-stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 4px;
}

.mini-stat-label {
  font-size: 12px;
  color: #7f8c8d;
  margin-bottom: 8px;
}

.mini-stat-trend {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 10px;
  display: inline-block;
}

.mini-stat-trend.positive {
  background: #f6ffed;
  color: #52c41a;
}

.mini-stat-trend.negative {
  background: #fff2f0;
  color: #ff4d4f;
}

.mini-stat-trend.neutral {
  background: #f5f5f5;
  color: #8c8c8c;
}

/* 评审效率统计 */
.efficiency-card .stat-body {
  margin-top: 20px;
}

.efficiency-breakdown {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #f0f0f0;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
}

.breakdown-label {
  color: #7f8c8d;
}

.breakdown-value {
  font-weight: 500;
  color: #2c3e50;
}

/* 评审记录样式 */
.recent-reviews-section {
  padding: 24px;
}

.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.review-item {
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.3s;
}

.review-item:hover {
  border-color: #d9d9d9;
  background: white;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.review-project-title {
  font-weight: 500;
  color: #2c3e50;
  margin: 0;
  font-size: 14px;
  flex: 1;
  margin-right: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-score {
  font-size: 13px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
}

.review-score.high {
  background: #f6ffed;
  color: #52c41a;
}

.review-score.medium {
  background: #fff7e6;
  color: #fa8c16;
}

.review-score.low {
  background: #fff2f0;
  color: #ff4d4f;
}

.review-score.fail {
  background: #f5f5f5;
  color: #8c8c8c;
}

.review-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
}

.review-conclusion {
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
}

.review-conclusion.approved {
  background: #f6ffed;
  color: #52c41a;
}

.review-conclusion.revise {
  background: #fff7e6;
  color: #fa8c16;
}

.review-conclusion.rejected {
  background: #fff2f0;
  color: #ff4d4f;
}

.review-conclusion.resubmit {
  background: #e6f7ff;
  color: #1890ff;
}

.review-time {
  color: #7f8c8d;
}

.review-summary {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #f0f0f0;
}

.summary-text {
  margin: 0;
  font-size: 12px;
  color: #666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 通知中心 */
.notifications-section {
  padding: 24px;
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.notification-item:hover {
  border-color: #d9d9d9;
  background: white;
}

.notification-item.unread {
  background: #f6ffed;
  border-color: #d9f7be;
}

.notification-icon {
  font-size: 20px;
  margin-right: 12px;
  margin-top: 2px;
  min-width: 24px;
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
  margin: 0 0 8px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notification-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 11px;
  color: #7f8c8d;
}

.notification-type {
  padding: 2px 6px;
  border-radius: 10px;
  background: #f5f5f5;
  color: #666;
}

.notification-type.project {
  background: #e6f7ff;
  color: #1890ff;
}

.notification-type.review {
  background: #f9f0ff;
  color: #722ed1;
}

.notification-type.system {
  background: #fff7e6;
  color: #fa8c16;
}

.notification-type.deadline {
  background: #fff2f0;
  color: #ff4d4f;
}

.notification-type.assignment {
  background: #f0f5ff;
  color: #2f54eb;
}

.notification-type.message {
  background: #f9f0ff;
  color: #722ed1;
}

.notification-type.warning {
  background: #fff2f0;
  color: #ff4d4f;
}

.notification-type.info {
  background: #e6f7ff;
  color: #1890ff;
}

.notification-priority {
  color: #ff4d4f;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 2px;
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

/* 系统状态 */
.system-status {
  padding: 24px;
}

.status-card {
  background: #fafafa;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #f0f0f0;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.status-header h4 {
  margin: 0;
  color: #2c3e50;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-icon {
  font-size: 18px;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.status-badge.success {
  background: #f6ffed;
  color: #52c41a;
}

.status-badge.warning {
  background: #fff7e6;
  color: #fa8c16;
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-label {
  color: #666;
  font-size: 13px;
}

.status-value {
  font-size: 13px;
  font-weight: 500;
}

.status-value.success {
  color: #52c41a;
}

.status-value.error {
  color: #ff4d4f;
}

.status-actions {
  text-align: center;
}

.status-refresh-btn {
  padding: 8px 16px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: background 0.3s;
}

.status-refresh-btn:hover {
  background: #40a9ff;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #7f8c8d;
  background: #fafafa;
  border-radius: 8px;
  border: 1px dashed #f0f0f0;
}

.empty-icon {
  font-size: 36px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0 0 8px 0;
  font-size: 14px;
}

.empty-subtext {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
}

/* 加载状态 */
.loading-state {
  text-align: center;
  padding: 40px 20px;
  color: #7f8c8d;
  background: #fafafa;
  border-radius: 8px;
  border: 1px dashed #f0f0f0;
}

.loading-spinner-small {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-state p {
  margin: 0;
  font-size: 13px;
}

/* 移动端菜单遮罩 */
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

/* 加载遮罩 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.loading-content {
  text-align: center;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

.loading-content p {
  color: #666;
  font-size: 16px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .dashboard-layout {
    grid-template-columns: repeat(2, 1fr);
  }

  .dashboard-column:last-child {
    grid-column: 1 / -1;
  }

  .actions-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 992px) {
  .sidebar {
    transform: translateX(-100%);
    box-shadow: none;
  }

  .sidebar.show {
    transform: translateX(0);
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
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
  .main-content {
    padding: 16px;
  }

  .dashboard-header {
    padding: 0 16px;
    height: 60px;
  }

  .welcome-card {
    flex-direction: column;
    text-align: center;
    padding: 24px;
  }

  .welcome-illustration {
    margin: 24px 0 0 0;
  }

  .quick-stats {
    flex-direction: column;
    gap: 12px;
  }

  .stat-badge {
    min-width: 0;
    width: 100%;
  }

  .notifications-dropdown-content {
    width: 280px;
    right: -20px;
  }

  .stats-grid {
    gap: 12px;
  }

  .double-stat-card {
    grid-template-columns: 1fr;
    border: 1px solid #f0f0f0;
  }

  .double-stat-card .mini-stat-card:first-child {
    border-right: none;
    border-bottom: 1px solid #f0f0f0;
  }

  .project-info {
    grid-template-columns: 1fr;
  }

  .project-actions {
    flex-direction: column;
  }
}

@media (max-width: 576px) {
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .section-header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .notifications-dropdown-content {
    width: calc(100vw - 32px);
    right: -16px;
  }

  .notification-meta {
    flex-direction: column;
    gap: 4px;
  }

  .actions-grid {
    grid-template-columns: 1fr;
  }

  .chart-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .bar-label {
    width: 100%;
    justify-content: space-between;
  }

  .bar-container {
    width: 100%;
  }
}

/* 打印样式 */
@media print {
  .sidebar,
  .dashboard-header,
  .status-actions,
  .project-actions,
  .refresh-stat-btn {
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

  .dashboard-layout {
    display: block;
  }

  .dashboard-column {
    margin-bottom: 20px;
  }

  .stat-card.enhanced {
    break-inside: avoid;
  }
}
</style>
