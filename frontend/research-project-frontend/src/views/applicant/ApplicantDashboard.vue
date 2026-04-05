<template>
  <div class="dashboard-container">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <div class="sidebar-header">
        <h3 v-if="!sidebarCollapsed" class="sidebar-title">科研项目管理系统</h3>
        <button class="sidebar-toggle" @click="toggleSidebar">
          {{ sidebarCollapsed ? '→' : '←' }}
        </button>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section">
          <h4 v-if="!sidebarCollapsed" class="nav-section-title">工作台</h4>
          <router-link to="/applicant/dashboard" class="nav-link" active-class="active">
            <span class="nav-icon">🏠</span>
            <span v-if="!sidebarCollapsed" class="nav-text">工作台</span>
          </router-link>
        </div>

        <div class="nav-section">
          <h4 v-if="!sidebarCollapsed" class="nav-section-title">项目管理</h4>
          <router-link to="/projects" class="nav-link" active-class="active">
            <span class="nav-icon">📁</span>
            <span v-if="!sidebarCollapsed" class="nav-text">我的项目</span>
          </router-link>
          <router-link to="/projects/create" class="nav-link" active-class="active">
            <span class="nav-icon">📝</span>
            <span v-if="!sidebarCollapsed" class="nav-text">创建项目</span>
          </router-link>
        </div>

        <div class="nav-section">
          <h4 v-if="!sidebarCollapsed" class="nav-section-title">经费管理</h4>
          <router-link to="/funds" class="nav-link" active-class="active">
            <span class="nav-icon">💰</span>
            <span v-if="!sidebarCollapsed" class="nav-text">经费管理</span>
          </router-link>
          <router-link to="/funds/applications/create" class="nav-link" active-class="active">
            <span class="nav-icon">📄</span>
            <span v-if="!sidebarCollapsed" class="nav-text">经费申请</span>
          </router-link>
        </div>

        <div class="nav-section">
          <h4 v-if="!sidebarCollapsed" class="nav-section-title">成果管理</h4>
          <router-link to="/achievements" class="nav-link" active-class="active">
            <span class="nav-icon">🏆</span>
            <span v-if="!sidebarCollapsed" class="nav-text">成果管理</span>
          </router-link>
          <router-link to="/achievements/create" class="nav-link" active-class="active">
            <span class="nav-icon">✍️</span>
            <span v-if="!sidebarCollapsed" class="nav-text">提交成果</span>
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
          <h1 class="logo">科研项目管理系统</h1>
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
                    <span class="meta-item">📅 {{ project.deadline || '未设置' }}</span>
                    <span class="meta-item">👤 {{ project.manager || '未分配' }}</span>
                  </div>
                  <div class="project-actions">
                    <button class="action-btn" @click="viewProject(project.raw_id || project.id)">
                      查看详情
                    </button>
                    <button
                      class="action-btn secondary"
                      v-if="project.status === 'draft'"
                      @click="editProject(project.raw_id || project.id)"
                    >
                      继续编辑
                    </button>
                  </div>
                </div>

                <!-- 加载状态 -->
                <div v-if="recentProjects.length === 0 && loading" class="loading-state">
                  <div class="loading-spinner-small"></div>
                  <p>正在加载项目数据...</p>
                </div>

                <!-- 空状态 -->
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
            <!-- 快速操作 -->
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
                <button class="action-card" @click="navigateTo('funding-application')">
                  <div class="action-icon">💰</div>
                  <div class="action-content">
                    <h4>经费申请</h4>
                    <p>申请项目研究经费</p>
                  </div>
                </button>
              </div>
            </div>

            <!-- 数据统计 -->
            <div class="data-statistics-section card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">📊</span>
                  数据统计
                </h3>
                <button class="refresh-stat-btn" @click="refreshData" title="刷新统计">🔄</button>
              </div>

              <div class="stats-grid">
                <!-- 项目统计卡片 -->
                <div class="stat-card enhanced">
                  <div class="stat-header">
                    <div class="stat-icon-container">
                      <div
                        class="stat-icon-bg"
                        style="background: linear-gradient(135deg, #1890ff, #40a9ff)"
                      >
                        <span class="stat-icon">📄</span>
                      </div>
                      <div class="stat-trend-container">
                        <span class="stat-trend" :class="getTrendClass(stats.submissionTrend)">
                          {{ stats.submissionTrend > 0 ? '+' : ''
                          }}{{ stats.submissionTrend || 0 }}%
                        </span>
                        <span class="trend-label">月同比</span>
                      </div>
                    </div>
                  </div>
                  <div class="stat-body">
                    <div class="stat-value">{{ stats.submittedProjects || 0 }}</div>
                    <div class="stat-label">已申报项目</div>
                    <div class="stat-description">本年度累计申报项目数</div>
                  </div>
                </div>

                <!-- 项目状态分布图表 -->
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

                <!-- 双统计卡片 -->
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
                      <div class="mini-stat-trend" :class="getTrendClass(stats.approvalTrend)">
                        {{ stats.approvalTrend > 0 ? '+' : '' }}{{ stats.approvalTrend || 0 }}%
                      </div>
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
                      <div class="mini-stat-trend" :class="getTrendClass(stats.reviewTrend)">
                        {{ stats.reviewTrend > 0 ? '+' : '' }}{{ stats.reviewTrend || 0 }}%
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 经费统计卡片 -->
                <div class="stat-card enhanced funding-card">
                  <div class="stat-header">
                    <div class="stat-icon-container">
                      <div
                        class="stat-icon-bg"
                        style="background: linear-gradient(135deg, #52c41a, #73d13d)"
                      >
                        <span class="stat-icon">💰</span>
                      </div>
                      <div class="stat-trend-container">
                        <span class="stat-trend" :class="getTrendClass(stats.fundTrend)">
                          {{ stats.fundTrend > 0 ? '+' : '' }}{{ stats.fundTrend || 0 }}%
                        </span>
                        <span class="trend-label">月同比</span>
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
                  <span class="unread-dot" v-if="!notification.read"></span>
                </div>

                <div class="empty-state" v-if="notifications.length === 0 && !loading">
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
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()

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
  pendingReviews: 0,
  ongoingProjects: 0,
  submittedProjects: 0,
  approvedProjects: 0,
  reviewingProjects: 0,
  totalFunds: 0,
  usedFunds: 0,
  remainingFunds: 0,
  submissionTrend: 0,
  approvalTrend: 0,
  reviewTrend: 0,
  fundTrend: 0,
})

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
  const roleMap = {
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

// 项目状态分布数据
const projectStatusData = computed(() => {
  const statusCounts = {
    孵化中: stats.value.ongoingProjects || 0,
    评审中: stats.value.reviewingProjects || 0,
    已立项: stats.value.approvedProjects || 0,
    已申报: stats.value.submittedProjects || 0,
    待处理: stats.value.pendingReviews || 0,
  }

  const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0)

  const statusColors = {
    孵化中: '#1890ff',
    评审中: '#fa8c16',
    已立项: '#52c41a',
    已申报: '#722ed1',
    待处理: '#f5222d',
  }

  return Object.entries(statusCounts).map(([name, count]) => ({
    name,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    color: statusColors[name] || '#666',
  }))
})

// 状态文本映射（适配新数据库）
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

// 状态样式映射
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

// 根据状态计算进度
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

const getTrendClass = (trend: number) => {
  if (trend > 0) return 'positive'
  if (trend < 0) return 'negative'
  return 'neutral'
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

const formatDate = (dateString: string) => {
  if (!dateString) return '未设置'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  } catch (e) {
    return dateString
  }
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

// 导航方法
const navigateTo = (action: string) => {
  const routes: Record<string, string> = {
    'create-project': '/projects/create',
    'my-projects': '/projects',
    'all-projects': '/projects',
    'submit-achievement': '/achievements/create',
    'funding-application': '/funds/applications/create',
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
    if (!notification.read && notification.raw_id) {
      await request.post(`/api/notifications/${notification.raw_id}/read`)
      notification.read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }

    if (notification.link) {
      router.push(notification.link)
    } else if (notification.relatedType === 'project') {
      router.push(`/projects/detail/${notification.relatedId}`)
    }

    showNotificationsDropdown.value = false
  } catch (error) {
    console.error('打开通知失败:', error)
  }
}

const markAllAsRead = async () => {
  try {
    await request.post('/api/notifications/mark-all-read')
    notifications.value.forEach((notification: any) => {
      notification.read = true
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
// 加载用户信息
const loadUserInfo = async () => {
  try {
    // 优先从 userInfo 获取完整信息
    const userInfoStr = localStorage.getItem('userInfo')
    console.log('从localStorage获取的userInfo:', userInfoStr)

    if (userInfoStr) {
      const userInfo = JSON.parse(userInfoStr)
      // 优先使用 name（真实姓名），如果没有则使用 username
      userName.value = userInfo.name || userInfo.username || '用户'
      userRole.value = userInfo.role || 'applicant'
      userId.value = userInfo.id || ''
      console.log('从userInfo解析的用户名:', userName.value)
    }

    // 如果没有 userInfo，尝试从 user 获取
    if (!userName.value) {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        userName.value = user.name || user.username || '用户'
        userRole.value = user.role || 'applicant'
        userId.value = user.id || ''
        console.log('从user解析的用户名:', userName.value)
      }
    }

    // 如果还没有，尝试单独获取
    if (!userName.value) {
      userName.value = localStorage.getItem('userName') || '用户'
      userRole.value = localStorage.getItem('userRole') || 'applicant'
      userId.value = localStorage.getItem('userId') || ''
    }

    // 如果还是空，从 API 获取
    if (!userName.value || userName.value === '用户') {
      console.log('从API获取用户信息...')
      const response = await request.get('/api/auth/profile')
      console.log('API返回的用户信息:', response)

      if (response.success && response.data) {
        const userData = response.data.data || response.data
        userName.value = userData.name || userData.username || '用户'
        userRole.value = userData.role || 'applicant'
        userId.value = userData.id || ''

        // 更新 localStorage
        localStorage.setItem(
          'userInfo',
          JSON.stringify({
            id: userId.value,
            username: userData.username,
            name: userName.value,
            email: userData.email,
            role: userRole.value,
          }),
        )
      }
    }

    // 确保用户名不为空
    if (!userName.value) {
      userName.value = '用户'
    }

    console.log('最终用户名:', userName.value)
  } catch (error) {
    console.error('加载用户信息失败:', error)
    userName.value = localStorage.getItem('userName') || '用户'
    userRole.value = localStorage.getItem('userRole') || 'applicant'
    userId.value = localStorage.getItem('userId') || ''
    console.log('使用默认用户名:', userName.value)
  }
}

// 加载项目数据
const loadProjectData = async () => {
  try {
    const response = await request.get('/api/dashboard/applicant')
    if (response.success && response.data) {
      const data = response.data

      // 更新统计
      if (data.stats) {
        stats.value = {
          ...stats.value,
          ...data.stats,
        }
      }

      // 更新项目列表
      if (data.my_projects && data.my_projects.length > 0) {
        recentProjects.value = data.my_projects.map((project: any) => ({
          id: project.id,
          raw_id: project.raw_id,
          code: `PROJ-${project.raw_id?.substring(0, 8) || project.id}`,
          title: project.title,
          status: project.status,
          progress: project.progress || calculateProgress(project.status),
          deadline: project.deadline,
          manager: project.manager,
        }))
      } else {
        recentProjects.value = []
      }

      // 更新通知
      if (data.notifications && data.notifications.length > 0) {
        notifications.value = data.notifications
        unreadCount.value = data.unread_count || 0
      }

      lastUpdateTime.value = new Date().toLocaleTimeString('zh-CN')
      databaseConnected.value = true
    }
  } catch (error) {
    console.error('加载项目数据失败:', error)
    databaseConnected.value = false
  }
}

// 加载仪表板数据
const loadDashboardData = async () => {
  loading.value = true
  try {
    // 测试后端连接
    try {
      const testResponse = await request.get('/api/db/test')
      backendConnected.value = testResponse.success
    } catch {
      backendConnected.value = false
    }

    await loadProjectData()
  } catch (error) {
    console.error('加载仪表板数据失败:', error)
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

// 组件生命周期
onMounted(() => {
  loadUserInfo().then(() => {
    if (userRole.value.toLowerCase() !== 'applicant') {
      ElMessage.warning(`检测到您是${userRoleName.value}，将跳转到对应工作台`)
      const rolePaths: Record<string, string> = {
        reviewer: '/reviewer/dashboard',
        project_manager: '/assistant/dashboard',
        admin: '/admin/dashboard',
      }
      const targetPath = rolePaths[userRole.value.toLowerCase()] || '/login'
      setTimeout(() => router.push(targetPath), 2000)
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
})

// 点击外部关闭通知下拉
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
/* 样式保持不变，与之前相同 */
.dashboard-container {
  min-height: 100vh;
  background: #f5f7fa;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  display: flex;
}

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
}

.nav-link {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: #2c3e50;
  text-decoration: none;
  transition: all 0.3s;
  position: relative;
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
}

.user-name-mini {
  font-size: 14px;
  font-weight: 500;
  color: #2c3e50;
}

.user-role-mini {
  font-size: 12px;
  color: #7f8c8d;
}

.main-wrapper {
  flex: 1;
  margin-left: 250px;
  transition: margin-left 0.3s ease;
}

.main-wrapper.sidebar-collapsed {
  margin-left: 60px;
}

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
}

.logo {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
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
  max-width: 1800px;
  margin: 0 auto;
}

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

.projects-overview {
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
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.3s;
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
}

.mark-all-btn:hover {
  background: #e8e8e8;
}

.projects-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.project-card {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #f0f0f0;
  transition: all 0.3s;
}

.project-card:hover {
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

.project-status {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.project-status.draft {
  background: #f5f5f5;
  color: #8c8c8c;
}

.project-status.submitted {
  background: #e6f7ff;
  color: #1890ff;
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
  background: #1890ff;
  color: white;
}

.project-status.completed {
  background: #52c41a;
  color: white;
}

.project-status.rejected {
  background: #ff4d4f;
  color: white;
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

.project-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: #f5f5f5;
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
  font-size: 12px;
  color: #666;
  font-weight: 500;
  min-width: 30px;
}

.project-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  font-size: 12px;
  color: #7f8c8d;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.project-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  padding: 6px 12px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.3s;
}

.action-btn:hover {
  background: #40a9ff;
}

.action-btn.secondary {
  background: #f5f5f5;
  color: #666;
}

.action-btn.secondary:hover {
  background: #e8e8e8;
}

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

.funding-value {
  font-size: 24px;
  color: #52c41a;
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

.funding-card .stat-body {
  margin-top: 20px;
}

.funding-breakdown {
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

.notification-type.funding {
  background: #fff2f0;
  color: #ff4d4f;
}

.notification-type.achievement {
  background: #f6ffed;
  color: #52c41a;
}

.notification-type.system {
  background: #fff7e6;
  color: #fa8c16;
}

.notification-type.review {
  background: #f0f5ff;
  color: #2f54eb;
}

.notification-type.task {
  background: #f6ffed;
  color: #52c41a;
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

.create-btn {
  padding: 8px 16px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  margin-top: 12px;
  transition: background 0.3s;
}

.create-btn:hover {
  background: #40a9ff;
}

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

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
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
}
</style>
