<template>
  <div class="dashboard-container">
    <!-- 侧边栏 -->
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
          <router-link to="/" class="nav-link" active-class="active">
            <span class="nav-icon">🌐</span>
            <span v-if="!sidebarCollapsed" class="nav-text">平台首页</span>
          </router-link>
        </div>

        <div class="nav-section">
          <h4 v-if="!sidebarCollapsed" class="nav-section-title">工作台</h4>
          <router-link to="/applicant/dashboard" class="nav-link" active-class="active">
            <span class="nav-icon">🏠</span>
            <span v-if="!sidebarCollapsed" class="nav-text">工作台</span>
          </router-link>
        </div>

        <div class="nav-section">
          <h4 v-if="!sidebarCollapsed" class="nav-section-title">项目管理</h4>
          <router-link to="/projects/create" class="nav-link" active-class="active">
            <span class="nav-icon">📝</span>
            <span v-if="!sidebarCollapsed" class="nav-text">创建项目</span>
          </router-link>
          <router-link to="/projects" class="nav-link" active-class="active">
            <span class="nav-icon">📁</span>
            <span v-if="!sidebarCollapsed" class="nav-text">我的项目</span>
          </router-link>
        </div>

        <div class="nav-section">
          <h4 v-if="!sidebarCollapsed" class="nav-section-title">孵化服务</h4>
          <router-link to="/incubation/service-request" class="nav-link" active-class="active">
            <span class="nav-icon">📝</span>
            <span v-if="!sidebarCollapsed" class="nav-text">服务申请</span>
          </router-link>
          <router-link to="/incubation/result-feedback" class="nav-link" active-class="active">
            <span class="nav-icon">📊</span>
            <span v-if="!sidebarCollapsed" class="nav-text">成果反馈</span>
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
          <div class="breadcrumb">
            <span class="current-page">工作台</span>
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
              <h2 class="welcome-title">欢迎回来，{{ userName }}！</h2>
              <p class="welcome-subtitle">今天是 {{ currentDate }}，祝您工作愉快！</p>
              <div class="quick-stats">
                <div class="stat-badge">
                  <span class="stat-value">{{ stats.totalProjects || 0 }}</span>
                  <span class="stat-label">总项目数</span>
                </div>
                <div class="stat-badge">
                  <span class="stat-value">{{ stats.pendingReviews || 0 }}</span>
                  <span class="stat-label">待处理</span>
                </div>
                <div class="stat-badge">
                  <span class="stat-value">{{ stats.ongoingProjects || 0 }}</span>
                  <span class="stat-label">进行中</span>
                </div>
              </div>
            </div>
            <div class="welcome-illustration">
              <div class="illustration-icon">📊</div>
            </div>
          </div>
        </div>

        <!-- 三列布局 -->
        <div class="dashboard-layout">
          <!-- 左列：项目概览 -->
          <div class="dashboard-column">
            <div class="projects-overview card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">📁</span>
                  项目概览
                </h3>
                <button class="view-all-btn" @click="navigateTo('all-projects')">查看全部 →</button>
              </div>

              <div class="projects-grid">
                <div class="project-card" v-for="project in recentProjects" :key="project.id">
                  <div class="project-header">
                    <span class="project-status" :class="getStatusClass(project.status)">
                      {{ getStatusText(project.status) }}
                    </span>
                    <span class="project-code">{{ project.code }}</span>
                  </div>
                  <h4 class="project-title">{{ project.title }}</h4>
                  <div class="project-progress">
                    <div class="progress-bar">
                      <div
                        class="progress-fill"
                        :style="{ width: project.progress + '%' }"
                        :class="getProgressClass(project.progress)"
                      ></div>
                    </div>
                    <span class="progress-text">{{ project.progress }}%</span>
                  </div>
                  <div class="project-meta">
                    <span class="meta-item">📅 {{ project.submitDate || '未提交' }}</span>
                    <span class="meta-item">👤 {{ project.applicant || '申请人' }}</span>
                  </div>
                  <div class="project-actions">
                    <button class="action-btn" @click="viewProject(project.id)">查看详情</button>
                    <button
                      class="action-btn secondary"
                      v-if="project.status === 'draft'"
                      @click="editProject(project.id)"
                    >
                      继续编辑
                    </button>
                  </div>
                </div>

                <div v-if="recentProjects.length === 0 && loading" class="loading-state">
                  <div class="loading-spinner-small"></div>
                  <p>正在加载项目数据...</p>
                </div>

                <div v-if="recentProjects.length === 0 && !loading" class="empty-state">
                  <div class="empty-icon">📁</div>
                  <p>暂无项目</p>
                  <button class="create-btn" @click="navigateTo('create-project')">
                    创建第一个项目
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 中列：快速操作 + 数据统计 -->
          <div class="dashboard-column">
            <div class="quick-actions-section card-section">
              <h3 class="section-title">
                <span class="section-icon">⚡</span>
                快速操作
              </h3>
              <div class="actions-grid">
                <button class="action-card" @click="navigateTo('create-project')">
                  <div class="action-icon">📝</div>
                  <div class="action-content">
                    <h4>申报新项目</h4>
                    <p>开始新的科研项目申报</p>
                  </div>
                </button>
                <button class="action-card" @click="navigateTo('my-projects')">
                  <div class="action-icon">📁</div>
                  <div class="action-content">
                    <h4>我的项目</h4>
                    <p>查看和管理我的项目</p>
                  </div>
                </button>
                <button class="action-card" @click="navigateTo('submit-achievement')">
                  <div class="action-icon">🏆</div>
                  <div class="action-content">
                    <h4>提交成果</h4>
                    <p>记录科研成果和产出</p>
                  </div>
                </button>
                <button class="action-card" @click="navigateTo('service-request')">
                  <div class="action-icon">🛎️</div>
                  <div class="action-content">
                    <h4>服务申请</h4>
                    <p>为已批准项目发起孵化服务申请</p>
                  </div>
                </button>
              </div>
            </div>

            <div class="data-statistics-section card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">📊</span>
                  数据统计
                </h3>
                <button class="refresh-stat-btn" @click="refreshData" title="刷新统计">🔄</button>
              </div>

              <div class="stats-grid">
                <div class="stat-card enhanced">
                  <div class="stat-header">
                    <div class="stat-icon-container">
                      <div
                        class="stat-icon-bg"
                        style="background: linear-gradient(135deg, #b31b1b, #8b0000)"
                      >
                        <span class="stat-icon">📄</span>
                      </div>
                    </div>
                  </div>
                  <div class="stat-body">
                    <div class="stat-value">{{ stats.cumulativeDeclared || 0 }}</div>
                    <div class="stat-label">已申报项目</div>
                    <div class="stat-description">累计已提交项目数（不含草稿）</div>
                  </div>
                </div>

                <div class="stat-card enhanced chart-card">
                  <div class="stat-header">
                    <h4 class="chart-title">
                      <span class="chart-icon">📊</span>
                      项目状态分布
                    </h4>
                  </div>
                  <div class="chart-container">
                    <div class="chart-bars">
                      <div class="chart-bar" v-for="status in projectStatusData" :key="status.name">
                        <div class="bar-label">
                          <span
                            class="status-dot"
                            :style="{ backgroundColor: status.color }"
                          ></span>
                          <span class="status-name">{{ status.name }}</span>
                        </div>
                        <div class="bar-container">
                          <div
                            class="bar"
                            :style="{
                              width: status.percentage + '%',
                              backgroundColor: status.color,
                            }"
                          ></div>
                          <span class="bar-value">{{ status.count }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="double-stat-card">
                  <div class="mini-stat-card" style="border-right: 1px solid #f0f0f0">
                    <div class="mini-stat-header">
                      <div class="mini-stat-icon" style="background: #f6ffed">
                        <span>✅</span>
                      </div>
                    </div>
                    <div class="mini-stat-body">
                      <div class="mini-stat-value">{{ stats.approvedProjects || 0 }}</div>
                      <div class="mini-stat-label">已立项</div>
                    </div>
                  </div>
                  <div class="mini-stat-card">
                    <div class="mini-stat-header">
                      <div class="mini-stat-icon" style="background: #fff7e6">
                        <span>⏳</span>
                      </div>
                    </div>
                    <div class="mini-stat-body">
                      <div class="mini-stat-value">{{ stats.reviewingProjects || 0 }}</div>
                      <div class="mini-stat-label">评审中</div>
                    </div>
                  </div>
                </div>

                <div class="stat-card enhanced funding-card">
                  <div class="stat-header">
                    <div class="stat-icon-container">
                      <div
                        class="stat-icon-bg"
                        style="background: linear-gradient(135deg, #52c41a, #73d13d)"
                      >
                        <span class="stat-icon">💰</span>
                      </div>
                    </div>
                  </div>
                  <div class="stat-body">
                    <div class="stat-value funding-value">{{ formatFunds(stats.totalFunds) }}</div>
                    <div class="stat-label">总经费额度</div>
                    <div class="funding-breakdown">
                      <div class="breakdown-item">
                        <span class="breakdown-label">已使用</span>
                        <span class="breakdown-value">{{ formatFunds(stats.usedFunds || 0) }}</span>
                      </div>
                      <div class="breakdown-item">
                        <span class="breakdown-label">剩余</span>
                        <span class="breakdown-value">{{
                          formatFunds(stats.remainingFunds || 0)
                        }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 右列：通知中心 -->
          <div class="dashboard-column">
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
                  <div class="notification-icon">{{ getNotificationIcon(notification.type) }}</div>
                  <div class="notification-content">
                    <div class="notification-header">
                      <h4 class="notification-title">{{ notification.title }}</h4>
                      <span class="notification-time">{{
                        formatTime(notification.created_at)
                      }}</span>
                    </div>
                    <p class="notification-desc">{{ notification.content }}</p>
                    <div class="notification-meta">
                      <span
                        class="notification-type"
                        :class="getNotificationTypeClass(notification.type)"
                      >
                        {{ getNotificationTypeText(notification.type) }}
                      </span>
                      <span
                        class="notification-priority"
                        v-if="
                          notification.priority === 'high' || notification.priority === 'urgent'
                        "
                      >
                        ⚠️ 重要
                      </span>
                    </div>
                  </div>
                  <span class="unread-dot" v-if="!notification.is_read"></span>
                </div>

                <div class="empty-state" v-if="notifications.length === 0 && !loading">
                  <div class="empty-icon">📭</div>
                  <p>暂无通知</p>
                  <p class="empty-subtext">当有新消息时会在这里显示</p>
                </div>
              </div>
            </div>

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

    <div v-if="showMobileMenu" class="mobile-menu-overlay" @click="toggleMobileMenu"></div>
    <div v-if="loading" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getApiBaseUrl, getApiOrigin } from '@/utils/request'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const isDarkMode = ref(false)
const sidebarCollapsed = ref(false)
const showMobileMenu = ref(false)
const showNotificationsDropdown = ref(false)
const userName = ref('')
const userRole = ref('applicant')
const userId = ref('')
const unreadCount = ref(0)

// 数据状态
const stats = ref({
  totalProjects: 0,
  cumulativeDeclared: 0,
  pendingReviews: 0,
  ongoingProjects: 0,
  submittedProjects: 0,
  approvedProjects: 0,
  reviewingProjects: 0,
  totalFunds: 0,
  usedFunds: 0,
  remainingFunds: 0,
})

/** 用于状态分布图互斥计数（与 stats 汇总同源） */
const dashboardProjects = ref<any[]>([])

const recentProjects = ref([])
const notifications = ref([])

// 系统状态
const backendConnected = ref(false)
const databaseConnected = ref(false)
const lastUpdateTime = ref('')

// 计算属性
const userInitial = computed(() => {
  return userName.value ? userName.value.charAt(0).toUpperCase() : 'U'
})

const userRoleName = computed(() => {
  const roleMap: Record<string, string> = {
    applicant: '项目申请人',
    reviewer: '评审专家',
    project_manager: '项目经理',
    admin: '系统管理员',
  }
  return roleMap[userRole.value] || userRole.value
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

// 项目状态分布（互斥：每个项目只计入一类；「已立项」仅 approved，「孵化中」仅 incubating）
const projectStatusData = computed(() => {
  const projects = dashboardProjects.value
  const statusCounts: Record<string, number> = {
    孵化中: projects.filter((p: any) => p.status === 'incubating').length,
    评审中: projects.filter(
      (p: any) => p.status === 'under_review' || p.status === 'batch_review',
    ).length,
    已立项: projects.filter((p: any) => p.status === 'approved').length,
    已申报: projects.filter((p: any) => p.status === 'submitted').length,
    待处理: projects.filter((p: any) => p.status === 'revision').length,
  }
  const other = projects.filter((p: any) =>
    ['draft', 'rejected', 'completed', 'terminated'].includes(p.status),
  ).length
  if (other > 0) {
    statusCounts['其他'] = other
  }

  const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0)

  const statusColors: Record<string, string> = {
    孵化中: '#1890ff',
    评审中: '#fa8c16',
    已立项: '#52c41a',
    已申报: '#722ed1',
    待处理: '#f5222d',
    其他: '#8c8c8c',
  }

  return Object.entries(statusCounts).map(([name, count]) => ({
    name,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    color: statusColors[name] || '#B31B1B',
  }))
})

// 状态文本映射
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    under_review: '专家评审中',
    revision: '修改后重提',
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
    incubating: 'ongoing',
    completed: 'completed',
    rejected: 'rejected',
    terminated: 'rejected',
  }
  return classMap[status] || status
}

const calculateProgress = (status: string): number => {
  const progressMap: Record<string, number> = {
    draft: 20,
    submitted: 40,
    under_review: 50,
    revision: 45,
    batch_review: 55,
    approved: 70,
    incubating: 80,
    completed: 100,
    rejected: 0,
    terminated: 0,
  }
  return progressMap[status] || 0
}

const getProgressClass = (progress: number) => {
  if (progress >= 80) return 'high'
  if (progress >= 50) return 'medium'
  return 'low'
}

const getNotificationTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    project: '项目通知',
    review: '评审通知',
    funding: '经费通知',
    incubation: '孵化通知',
    system: '系统通知',
    reminder: '提醒通知',
    invitation: '邀请通知',
  }
  return typeMap[type] || type
}

const getNotificationTypeClass = (type: string) => {
  const classMap: Record<string, string> = {
    project: 'project',
    review: 'review',
    funding: 'funding',
    incubation: 'project',
    system: 'system',
    reminder: 'task',
    invitation: 'message',
  }
  return classMap[type] || type
}

const getNotificationIcon = (type: string): string => {
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

const formatFunds = (funds: number) => {
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

const formatTime = (dateString: string) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diff / 60000)
    const diffHours = Math.floor(diff / 3600000)
    const diffDays = Math.floor(diff / 86400000)

    if (diffMinutes < 1) return '刚刚'
    if (diffMinutes < 60) return `${diffMinutes}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 7) return `${diffDays}天前`
    return date.toLocaleDateString('zh-CN')
  } catch (e) {
    return dateString
  }
}

const navigateTo = (action: string) => {
  const routes: Record<string, string> = {
    'create-project': '/projects/create',
    'my-projects': '/projects',
    'all-projects': '/projects',
    'submit-achievement': '/achievements/create',
    'service-request': '/incubation/service-request',
    notifications: '/notifications',
  }
  if (routes[action]) {
    router.push(routes[action])
  }
}

const viewProject = (projectId: string) => {
  router.push(`/projects/detail/${projectId}`)
}

const editProject = (projectId: string) => {
  router.push(`/projects/edit/${projectId}`)
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

const openNotification = async (notification: any) => {
  try {
    if (!notification.is_read && notification.id) {
      await axios.put(`${getApiBaseUrl()}/notifications/${notification.id}/read`)
      notification.is_read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }

    if (notification.action_url) {
      router.push(notification.action_url)
    } else if (notification.related_type === 'Project') {
      router.push(`/projects/detail/${notification.related_id}`)
    }

    showNotificationsDropdown.value = false
  } catch (error) {
    console.error('打开通知失败:', error)
  }
}

const markAllAsRead = async () => {
  try {
    await axios.put(`${getApiBaseUrl()}/notifications/mark-all-read`, {
      userId: userId.value,
    })
    notifications.value.forEach((notification: any) => {
      notification.is_read = true
    })
    unreadCount.value = 0
  } catch (error) {
    console.error('标记全部已读失败:', error)
  }
}

const refreshData = () => {
  loadDashboardData()
}

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
  document.documentElement.setAttribute('data-theme', isDarkMode.value ? 'dark' : 'light')
}

const handleLogout = () => {
  if (confirm('确定要退出登录吗？')) {
    localStorage.clear()
    sessionStorage.clear()
    router.push('/login')
  }
}

const handleLogoError = (e: Event) => {
  const img = e.target as HTMLImageElement
  img.src =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23B31B1B"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="white" font-size="40"%3E人大%3C/text%3E%3C/svg%3E'
}

const loadUserInfo = () => {
  const userInfoStr = localStorage.getItem('userInfo')
  if (userInfoStr) {
    const userInfo = JSON.parse(userInfoStr)
    userName.value = userInfo.name || userInfo.username || '用户'
    userRole.value = userInfo.role || 'applicant'
    userId.value = userInfo.id || ''
  } else {
    userName.value = localStorage.getItem('userName') || '用户'
    userRole.value = localStorage.getItem('userRole') || 'applicant'
    userId.value = localStorage.getItem('userId') || ''
  }
}

const loadDashboardData = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const config = {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }

    // 获取用户的项目列表
    const projectsRes = await axios.get(
      `${getApiBaseUrl()}/projects?applicant_id=${userId.value}`,
      config,
    )
    if (projectsRes.data.success) {
      const projects = projectsRes.data.data || []
      dashboardProjects.value = projects

      const cumulativeDeclared = projects.filter((p: any) => p.status !== 'draft').length
      const submittedOnly = projects.filter((p: any) => p.status === 'submitted').length
      const approved = projects.filter(
        (p: any) => p.status === 'approved' || p.status === 'incubating',
      ).length
      const reviewing = projects.filter(
        (p: any) => p.status === 'under_review' || p.status === 'batch_review',
      ).length
      const ongoing = projects.filter((p: any) => p.status === 'incubating').length
      const revision = projects.filter((p: any) => p.status === 'revision').length

      stats.value = {
        ...stats.value,
        totalProjects: projects.length,
        cumulativeDeclared,
        submittedProjects: submittedOnly,
        approvedProjects: approved,
        reviewingProjects: reviewing,
        ongoingProjects: ongoing,
        pendingReviews: revision,
      }

      // 格式化项目列表
      recentProjects.value = projects.slice(0, 5).map((project: any) => ({
        id: project.id,
        code: project.project_code || `PRJ-${project.id.substring(0, 8)}`,
        title: project.title,
        status: project.status,
        progress: calculateProgress(project.status),
        submitDate: project.submit_date
          ? new Date(project.submit_date).toLocaleDateString('zh-CN')
          : '未提交',
        applicant: project.applicant_name || '申请人',
      }))
    }

    // 获取通知列表
    const notifRes = await axios.get(
      `${getApiBaseUrl()}/notifications?user_id=${userId.value}`,
      config,
    )
    if (notifRes.data.success) {
      notifications.value = notifRes.data.data || []
      unreadCount.value = notifications.value.filter((n: any) => !n.is_read).length
    }

    // 经费统计：与后端 /api/expenditures/stats 一致（走登录用户身份）
    try {
      const fundsRes = await axios.get(`${getApiBaseUrl()}/expenditures/stats`, config)
      if (fundsRes.data.success && fundsRes.data.data) {
        const d = fundsRes.data.data
        let total = Number(d.total_budget) || 0
        const used = Number(d.total_expenditure) || 0
        // 无 ProjectBudget 行时，用已立项项目的批准预算作展示兜底
        if (total === 0 && dashboardProjects.value.length) {
          total = dashboardProjects.value
            .filter((p: any) => ['approved', 'incubating', 'completed'].includes(p.status))
            .reduce(
              (s: number, p: any) =>
                s + (parseFloat(p.approved_budget) || parseFloat(p.budget_total) || 0),
              0,
            )
        }
        stats.value.totalFunds = total
        stats.value.usedFunds = used
        stats.value.remainingFunds = Math.max(0, total - used)
      }
    } catch {
      // 经费统计失败时尝试用项目上的批准预算汇总
      const total = dashboardProjects.value
        .filter((p: any) => ['approved', 'incubating', 'completed'].includes(p.status))
        .reduce(
          (s: number, p: any) =>
            s + (parseFloat(p.approved_budget) || parseFloat(p.budget_total) || 0),
          0,
        )
      if (total > 0) {
        stats.value.totalFunds = total
        stats.value.usedFunds = 0
        stats.value.remainingFunds = total
      }
    }

    backendConnected.value = true
    databaseConnected.value = true
    lastUpdateTime.value = new Date().toLocaleTimeString('zh-CN')
  } catch (error) {
    console.error('加载仪表板数据失败:', error)
    backendConnected.value = false
    databaseConnected.value = false
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadUserInfo()
  if (userId.value) {
    loadDashboardData()
  }

  const refreshInterval = setInterval(() => {
    if (document.visibilityState === 'visible' && userId.value) {
      loadDashboardData()
    }
  }, 300000)

  onUnmounted(() => {
    clearInterval(refreshInterval)
  })
})

document.addEventListener('click', (e) => {
  if (
    showNotificationsDropdown.value &&
    !(e.target as Element).closest('.notifications-dropdown')
  ) {
    showNotificationsDropdown.value = false
  }
})
</script>

<style scoped>
/* 侧栏标题与按钮使用华文中宋 */
.sidebar-title,
.nav-item,
.nav-item span,
.sidebar-footer button,
.sidebar-footer span,
h1, h2, h3, h4,
button {
  font-family: 'STZhongsong', '华文中宋', 'SimSun', serif;
}

.dashboard-container {
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
}

.sidebar {
  width: 260px;
  background: #b31b1b;
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
  width: 70px;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sidebar-logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
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
  flex-shrink: 0;
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

/* 折叠状态：隐藏 logo，只居中显示展开按钮 */
.sidebar-collapsed .sidebar-header {
  padding: 20px 10px;
  justify-content: center;
}

.sidebar-collapsed .logo-area {
  display: none;
}

.sidebar-nav {
  flex: 1;
  padding: 20px 0;
  overflow-y: auto;
  scrollbar-width: none; /* Firefox */
}

.sidebar-nav::-webkit-scrollbar {
  display: none; /* Chrome / Safari / Edge */
}

.nav-section {
  margin-bottom: 20px;
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
}

.user-avatar-mini {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.2);
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
}

.user-name-mini {
  font-size: 14px;
  font-weight: 500;
  color: white;
}

.user-role-mini {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.main-wrapper {
  flex: 1;
  margin-left: 260px;
  transition: margin-left 0.3s ease;
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
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
}

.breadcrumb {
  font-size: 14px;
  color: #666;
}

.current-page {
  color: #b31b1b;
  font-weight: 500;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
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
}

.icon {
  font-size: 18px;
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
  width: 340px;
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
  max-height: 320px;
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

.main-content {
  padding: 24px;
  max-width: 1600px;
  margin: 0 auto;
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
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.projects-overview,
.quick-actions-section,
.data-statistics-section,
.notifications-section,
.system-status {
  padding: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.section-title {
  font-size: 16px;
  color: #2c3e50;
  margin: 0;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  font-size: 18px;
}

/* 与科研助理工作台等页面一致：实心「查看全部」、灰底「标记全部已读」 */
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

.projects-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.project-card {
  background: #fafafa;
  border-radius: 8px;
  padding: 14px;
  border: 1px solid #f0f0f0;
  transition: all 0.3s;
}

.project-card:hover {
  border-color: #b31b1b;
  box-shadow: 0 2px 8px rgba(179, 27, 27, 0.1);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.project-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.project-status.draft {
  background: #f5f5f5;
  color: #8c8c8c;
}
.project-status.submitted {
  background: rgba(179, 27, 27, 0.06);
  color: #b31b1b;
}
.project-status.reviewing {
  background: #fff7e6;
  color: #fa8c16;
}
.project-status.approved {
  background: #f6ffed;
  color: #52c41a;
}
.project-status.ongoing {
  background: rgba(179, 27, 27, 0.06);
  color: #b31b1b;
}
.project-status.completed {
  background: #f6ffed;
  color: #52c41a;
}
.project-status.rejected {
  background: #fff2f0;
  color: #ff4d4f;
}

.project-code {
  font-size: 10px;
  color: #999;
  font-family: monospace;
}

.project-title {
  font-size: 14px;
  color: #2c3e50;
  margin: 0 0 10px 0;
  font-weight: 500;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: #f0f0f0;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s;
}

.progress-fill.high {
  background: #52c41a;
}
.progress-fill.medium {
  background: #fa8c16;
}
.progress-fill.low {
  background: #ff4d4f;
}

.progress-text {
  font-size: 11px;
  color: #666;
  min-width: 30px;
}

.project-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 11px;
  color: #999;
}

.project-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  padding: 6px 12px;
  background: #b31b1b;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.3s;
}

.action-btn:hover {
  background: #8b0000;
}

.action-btn.secondary {
  background: #f5f5f5;
  color: #666;
}

.action-btn.secondary:hover {
  background: #e8e8e8;
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
  padding: 14px;
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
  font-size: 22px;
  width: 44px;
  height: 44px;
  background: #fafafa;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-content h4 {
  margin: 0 0 2px 0;
  color: #2c3e50;
  font-size: 13px;
  font-weight: 600;
}

.action-content p {
  margin: 0;
  color: #999;
  font-size: 11px;
}

.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-card.enhanced {
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 16px;
}

.stat-icon-bg {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon {
  font-size: 22px;
  color: white;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #2c3e50;
}

.stat-label {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
}

.stat-description {
  font-size: 11px;
  color: #bbb;
  margin-top: 4px;
}

.funding-value {
  color: #52c41a;
}

.chart-title {
  font-size: 14px;
  color: #2c3e50;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.chart-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chart-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bar-label {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 70px;
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
  height: 6px;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.bar-value {
  font-size: 11px;
  color: #999;
  min-width: 24px;
  text-align: right;
}

.double-stat-card {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
}

.mini-stat-card {
  padding: 16px;
  text-align: center;
}

.mini-stat-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px;
  font-size: 16px;
}

.mini-stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #2c3e50;
}

.mini-stat-label {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
}

.funding-breakdown {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #f0f0f0;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 12px;
}

.breakdown-label {
  color: #999;
}

.breakdown-value {
  font-weight: 500;
  color: #2c3e50;
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.notification-item:hover {
  border-color: #b31b1b;
  background: white;
}

.notification-item.unread {
  background: #fef6f6;
  border-color: #ffcdcd;
}

.notification-icon {
  font-size: 18px;
  margin-right: 10px;
  min-width: 24px;
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
  font-size: 13px;
}

.notification-time {
  font-size: 10px;
  color: #bbb;
  white-space: nowrap;
  margin-left: 8px;
}

.notification-desc {
  color: #666;
  font-size: 12px;
  margin: 0 0 6px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notification-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 10px;
}

.notification-type {
  padding: 2px 6px;
  border-radius: 10px;
  background: #f0f0f0;
  color: #666;
}

.notification-type.project {
  background: rgba(179, 27, 27, 0.06);
  color: #b31b1b;
}
.notification-type.funding {
  background: #fff2f0;
  color: #ff4d4f;
}
.notification-type.system {
  background: #fff7e6;
  color: #fa8c16;
}
.notification-type.review {
  background: #f0f5ff;
  color: #2f54eb;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background: #b31b1b;
  border-radius: 50%;
  margin-left: 8px;
  flex-shrink: 0;
  margin-top: 6px;
}

.status-card {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.status-header h4 {
  margin: 0;
  color: #2c3e50;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
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
  gap: 10px;
  margin-bottom: 16px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-label {
  color: #999;
  font-size: 12px;
}

.status-value {
  font-size: 12px;
  font-weight: 500;
}

.status-value.success {
  color: #52c41a;
}
.status-value.error {
  color: #ff4d4f;
}

.status-refresh-btn {
  padding: 6px 12px;
  background: #b31b1b;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  justify-content: center;
}

.status-refresh-btn:hover {
  background: #8b0000;
}

.empty-state {
  text-align: center;
  padding: 32px 20px;
  color: #999;
  background: #fafafa;
  border-radius: 8px;
}

.empty-icon {
  font-size: 32px;
  margin-bottom: 10px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0 0 4px 0;
  font-size: 13px;
}

.empty-subtext {
  font-size: 11px;
  color: #bbb;
}

.create-btn {
  padding: 6px 16px;
  background: #b31b1b;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  margin-top: 10px;
}

.create-btn:hover {
  background: #8b0000;
}

.loading-state {
  text-align: center;
  padding: 32px 20px;
  color: #999;
}

.loading-spinner-small {
  width: 32px;
  height: 32px;
  border: 3px solid #f0f0f0;
  border-top: 3px solid #b31b1b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

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
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f0f0f0;
  border-top: 4px solid #b31b1b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
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
}

@media (max-width: 768px) {
  .dashboard-layout {
    grid-template-columns: 1fr;
  }
  .main-content {
    padding: 16px;
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
    flex-direction: column;
    gap: 10px;
  }
  .stat-badge {
    min-width: 0;
  }
}
</style>
