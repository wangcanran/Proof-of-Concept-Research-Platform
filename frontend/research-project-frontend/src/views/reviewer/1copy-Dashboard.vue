<template>
  <div class="dashboard-container">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <div class="sidebar-header">
        <h3 v-if="!sidebarCollapsed" class="sidebar-title">科研项目评审系统</h3>
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
          <h4 v-if="!sidebarCollapsed" class="nav-section-title">评审任务</h4>
          <router-link to="/reviewer/review" class="nav-link" active-class="active">
            <span class="nav-icon">📋</span>
            <span v-if="!sidebarCollapsed" class="nav-text">待评审项目</span>
            <span v-if="!sidebarCollapsed && pendingReviews > 0" class="nav-badge">
              {{ pendingReviews }}
            </span>
          </router-link>
          <router-link to="/reviewer/history" class="nav-link" active-class="active">
            <span class="nav-icon">📚</span>
            <span v-if="!sidebarCollapsed" class="nav-text">评审历史</span>
          </router-link>
        </div>

        <div class="nav-section">
          <h4 v-if="!sidebarCollapsed" class="nav-section-title">项目管理</h4>
          <router-link to="/reviewer/projects" class="nav-link" active-class="active">
            <span class="nav-icon">📁</span>
            <span v-if="!sidebarCollapsed" class="nav-text">项目列表</span>
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
            <div class="user-role-mini">评审专家</div>
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
          <h1 class="logo">科研项目评审系统</h1>
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
              <p class="welcome-subtitle">
                今天是 {{ currentDate }}，您有 {{ pendingReviews }} 个待评审项目
              </p>
              <div class="quick-stats">
                <div class="stat-badge">
                  <span class="stat-value">{{ stats.pendingReviews || 0 }}</span>
                  <span class="stat-label">待评审项目</span>
                </div>
                <div class="stat-badge">
                  <span class="stat-value">{{ stats.completedReviews || 0 }}</span>
                  <span class="stat-label">已评审</span>
                </div>
                <div class="stat-badge">
                  <span class="stat-value">{{ stats.totalProjects || 0 }}</span>
                  <span class="stat-label">总评审项目</span>
                </div>
                <div class="stat-badge">
                  <span class="stat-value">{{ stats.avgTotalScore || '--' }}</span>
                  <span class="stat-label">平均评分</span>
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
          <!-- 左列：待办事项 -->
          <div class="dashboard-column">
            <!-- 待评审项目 -->
            <div class="card-section pending-reviews">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">📋</span>
                  待评审项目
                  <span v-if="pendingReviews > 0" class="badge">{{ pendingReviews }}</span>
                </h3>
                <button class="view-all-btn" @click="navigateTo('review-tasks')">查看全部 →</button>
              </div>

              <div class="tasks-list">
                <div
                  v-for="task in pendingTasks"
                  :key="task.id"
                  class="task-item"
                  @click="startReview(task)"
                >
                  <div class="task-header">
                    <span class="task-type">{{ task.type }}</span>
                    <span class="task-priority" :class="task.priority">{{ task.priority }}</span>
                  </div>
                  <h4 class="task-title">{{ task.title }}</h4>
                  <div class="task-meta">
                    <span class="meta-item">👤 {{ task.applicant_name || '申请人' }}</span>
                    <span class="meta-item">📅 截止：{{ task.deadline || '无期限' }}</span>
                  </div>
                  <div class="task-actions">
                    <button class="action-btn" @click.stop="startReview(task)">开始评审</button>
                    <button class="action-btn secondary" @click.stop="viewProject(task.project_id)">
                      查看项目
                    </button>
                  </div>
                </div>

                <div v-if="pendingTasks.length === 0 && loading" class="loading-state">
                  <div class="loading-spinner-small"></div>
                  <p>正在加载任务数据...</p>
                </div>

                <div v-if="pendingTasks.length === 0 && !loading" class="empty-state">
                  <div class="empty-icon">✅</div>
                  <p>暂无待评审任务</p>
                  <p class="empty-subtext">当有新的评审任务时会在这里显示</p>
                </div>
              </div>
            </div>

            <!-- 快速操作 -->
            <div class="quick-actions-section card-section">
              <h3 class="section-title">
                <span class="section-icon">⚡</span>
                快速操作
              </h3>
              <div class="actions-grid">
                <button class="action-card" @click="navigateTo('review-tasks')">
                  <div class="action-icon">📝</div>
                  <div class="action-content">
                    <h4>开始评审</h4>
                    <p>评审待处理的项目</p>
                  </div>
                </button>
                <button class="action-card" @click="navigateTo('review-history')">
                  <div class="action-icon">📚</div>
                  <div class="action-content">
                    <h4>评审历史</h4>
                    <p>查看已完成的评审</p>
                  </div>
                </button>
                <button class="action-card" @click="navigateTo('project-list')">
                  <div class="action-icon">📁</div>
                  <div class="action-content">
                    <h4>项目列表</h4>
                    <p>查看所有项目</p>
                  </div>
                </button>
                <button class="action-card" @click="navigateTo('profile')">
                  <div class="action-icon">👤</div>
                  <div class="action-content">
                    <h4>个人中心</h4>
                    <p>修改个人信息</p>
                  </div>
                </button>
              </div>
            </div>

            <!-- 评审统计卡片 -->
            <div class="card-section mini-stats">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">📊</span>
                  评审统计概览
                </h3>
              </div>
              <div class="mini-stats-grid">
                <div class="mini-stat-item">
                  <div class="mini-stat-icon" style="background: #e6f7ff">
                    <span>📝</span>
                  </div>
                  <div class="mini-stat-content">
                    <div class="mini-stat-value">{{ stats.completedReviews || 0 }}</div>
                    <div class="mini-stat-label">已评审</div>
                  </div>
                </div>
                <div class="mini-stat-item">
                  <div class="mini-stat-icon" style="background: #f6ffed">
                    <span>✅</span>
                  </div>
                  <div class="mini-stat-content">
                    <div class="mini-stat-value">{{ stats.approvedCount || 0 }}</div>
                    <div class="mini-stat-label">建议通过</div>
                  </div>
                </div>
                <div class="mini-stat-item">
                  <div class="mini-stat-icon" style="background: #fff7e6">
                    <span>📝</span>
                  </div>
                  <div class="mini-stat-content">
                    <div class="mini-stat-value">{{ stats.revisedCount || 0 }}</div>
                    <div class="mini-stat-label">建议修改</div>
                  </div>
                </div>
                <div class="mini-stat-item">
                  <div class="mini-stat-icon" style="background: #fff2f0">
                    <span>❌</span>
                  </div>
                  <div class="mini-stat-content">
                    <div class="mini-stat-value">{{ stats.rejectedCount || 0 }}</div>
                    <div class="mini-stat-label">建议拒绝</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 中列：评审统计 + 质量分析 -->
          <div class="dashboard-column">
            <!-- 评审效率统计 -->
            <div class="card-section review-stats">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">⏱️</span>
                  评审效率分析
                </h3>
                <span class="trend-indicator" :class="getTrendClass(stats.efficiency)">
                  {{ stats.efficiency > 0 ? '+' : '' }}{{ stats.efficiency || 0 }}%
                </span>
              </div>

              <div class="review-efficiency">
                <div class="efficiency-metric">
                  <div class="metric-value">{{ stats.avgReviewTime || '--' }}</div>
                  <div class="metric-label">平均评审时长(天)</div>
                  <div class="metric-subtext">从分配到完成</div>
                </div>

                <div class="efficiency-chart">
                  <div class="chart-bars">
                    <div
                      v-for="day in efficiencyData"
                      :key="day.date"
                      class="chart-bar"
                      :style="{ height: day.height + '%' }"
                      :title="`${day.date}: ${day.count}个评审`"
                    >
                      <span class="bar-value">{{ day.count }}</span>
                    </div>
                  </div>
                  <div class="chart-labels">
                    <span>周一</span>
                    <span>周二</span>
                    <span>周三</span>
                    <span>周四</span>
                    <span>周五</span>
                    <span>周六</span>
                    <span>周日</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 评审质量分析 -->
            <div class="card-section quality-analysis">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">📈</span>
                  评审质量分布
                </h3>
              </div>

              <div class="quality-chart">
                <div class="quality-bars">
                  <div
                    v-for="item in reviewQualityData"
                    :key="item.name"
                    class="quality-bar"
                    :style="{ width: item.percentage + '%', backgroundColor: item.color }"
                  >
                    <div class="bar-info">
                      <span class="bar-name">{{ item.name }}</span>
                      <span class="bar-count">{{ item.count }}</span>
                    </div>
                    <span class="bar-percentage">{{ item.percentage }}%</span>
                  </div>
                </div>

                <div class="quality-summary">
                  <div class="summary-item">
                    <span class="summary-label">总评分平均</span>
                    <span class="summary-value">{{ stats.avgTotalScore || '--' }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="summary-label">最高评分</span>
                    <span class="summary-value">{{ stats.maxScore || '--' }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="summary-label">最低评分</span>
                    <span class="summary-value">{{ stats.minScore || '--' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 评审准则提醒 -->
            <div class="card-section review-guidelines">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">📘</span>
                  评审准则提醒
                </h3>
              </div>

              <div class="guidelines-list">
                <div class="guideline-item">
                  <span class="guideline-icon">✓</span>
                  <span class="guideline-text">客观公正，避免主观偏见</span>
                </div>
                <div class="guideline-item">
                  <span class="guideline-icon">✓</span>
                  <span class="guideline-text">详细说明评审依据</span>
                </div>
                <div class="guideline-item">
                  <span class="guideline-icon">✓</span>
                  <span class="guideline-text">提出具体修改建议</span>
                </div>
                <div class="guideline-item">
                  <span class="guideline-icon">✓</span>
                  <span class="guideline-text">注意评审截止时间</span>
                </div>
                <div class="guideline-item">
                  <span class="guideline-icon">✓</span>
                  <span class="guideline-text">保守项目研究秘密</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 右列：通知中心 + 最近评审 + 常用工具 -->
          <div class="dashboard-column">
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

                <div class="empty-state" v-if="notifications.length === 0 && !loading">
                  <div class="empty-icon">📭</div>
                  <p>暂无通知</p>
                  <p class="empty-subtext">当有新消息时会在这里显示</p>
                </div>
              </div>
            </div>

            <!-- 最近评审的项目 -->
            <div class="card-section recent-projects">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">📁</span>
                  最近评审项目
                </h3>
                <button class="view-all-btn" @click="navigateTo('review-history')">
                  历史记录 →
                </button>
              </div>

              <div class="recent-list">
                <div
                  v-for="project in recentReviewedProjects"
                  :key="project.id"
                  class="recent-item"
                  @click="viewProject(project.project_id)"
                >
                  <div class="project-code">{{ project.project_code }}</div>
                  <div class="project-title">{{ project.title }}</div>
                  <div class="project-meta">
                    <span class="review-score" :class="getScoreClass(project.total_score)">
                      {{ project.total_score?.toFixed(1) || '--' }}
                    </span>
                    <span class="review-date">{{ project.review_date }}</span>
                  </div>
                  <span class="review-type">{{ formatReviewType(project.review_type) }}</span>
                </div>

                <div v-if="recentReviewedProjects.length === 0" class="empty-state">
                  <div class="empty-icon">📝</div>
                  <p>暂无评审记录</p>
                  <p class="empty-subtext">完成评审后记录会显示在这里</p>
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
                    <span class="status-label">最后更新</span>
                    <span class="status-value">{{ lastUpdateTime }}</span>
                  </div>
                  <div class="status-item">
                    <span class="status-label">待办任务</span>
                    <span class="status-value">{{ pendingTasks.length }} 个</span>
                  </div>
                  <div class="status-item">
                    <span class="status-label">评审总数</span>
                    <span class="status-value">{{ stats.completedReviews || 0 }} 个</span>
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

            <!-- 常用工具 -->
            <div class="card-section quick-tools">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">🔧</span>
                  常用工具
                </h3>
              </div>

              <div class="tools-grid">
                <button class="tool-item" @click="openReviewTemplate">
                  <span class="tool-icon">📄</span>
                  <span class="tool-name">评审模板</span>
                </button>
                <button class="tool-item" @click="openScoringGuide">
                  <span class="tool-icon">📊</span>
                  <span class="tool-name">评分指南</span>
                </button>
                <button class="tool-item" @click="openCalculator">
                  <span class="tool-icon">🧮</span>
                  <span class="tool-name">计算器</span>
                </button>
                <button class="tool-item" @click="openSchedule">
                  <span class="tool-icon">📅</span>
                  <span class="tool-name">日程表</span>
                </button>
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
const userRole = ref('reviewer')
const userId = ref('')
const unreadCount = ref(0)

// 数据状态
const stats = ref({
  pendingReviews: 0,
  completedReviews: 0,
  totalProjects: 0,
  avgReviewTime: '--',
  efficiency: 0,
  approvedCount: 0,
  revisedCount: 0,
  rejectedCount: 0,
  avgTotalScore: '--',
  maxScore: '--',
  minScore: '--',
})

const pendingTasks = ref([])
const notifications = ref([])
const recentReviewedProjects = ref([])
const lastUpdateTime = ref('')

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

const pendingReviews = computed(() => {
  return stats.value.pendingReviews || 0
})

const systemStatusClass = computed(() => {
  return 'success'
})

const systemStatusText = computed(() => {
  return '运行正常'
})

const recentNotifications = computed(() => {
  return notifications.value.slice(0, 3)
})

// 评审质量分布数据
const reviewQualityData = computed(() => {
  const total = Math.max(stats.value.completedReviews, 1)

  return [
    {
      name: '建议通过',
      count: stats.value.approvedCount || 0,
      percentage: Math.round((stats.value.approvedCount / total) * 100),
      color: '#52c41a',
    },
    {
      name: '建议修改',
      count: stats.value.revisedCount || 0,
      percentage: Math.round((stats.value.revisedCount / total) * 100),
      color: '#fa8c16',
    },
    {
      name: '建议拒绝',
      count: stats.value.rejectedCount || 0,
      percentage: Math.round((stats.value.rejectedCount / total) * 100),
      color: '#f5222d',
    },
    {
      name: '待评审',
      count: stats.value.pendingReviews || 0,
      percentage: Math.round((stats.value.pendingReviews / total) * 100),
      color: '#1890ff',
    },
  ]
})

// 效率数据（模拟）
const efficiencyData = computed(() => {
  return [
    { date: '周一', count: 3, height: 60 },
    { date: '周二', count: 5, height: 100 },
    { date: '周三', count: 4, height: 80 },
    { date: '周四', count: 6, height: 120 },
    { date: '周五', count: 2, height: 40 },
    { date: '周六', count: 1, height: 20 },
    { date: '周日', count: 0, height: 0 },
  ]
})

// 方法
const navigateTo = (action: string) => {
  const routes: Record<string, string> = {
    'review-tasks': '/reviewer/review',
    'review-history': '/reviewer/history',
    'project-list': '/reviewer/projects',
    notifications: '/notifications',
    profile: '/profile',
  }

  if (routes[action]) {
    router.push(routes[action])
  }
}

const startReview = (task: any) => {
  if (task.raw_type === 'project_review' && task.review_id) {
    router.push(`/reviewer/review/${task.review_id}`)
  } else if (task.project_id) {
    router.push(`/reviewer/review?project_id=${task.project_id}`)
  }
}

const viewProject = (projectId: string) => {
  router.push(`/projects/detail/${projectId}`)
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
    if (!notification.read) {
      await request.post(`/api/notifications/${notification.raw_id}/read`)
      notification.read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }

    if (notification.relatedType === 'project') {
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

    if (showNotificationsDropdown.value) {
      ElMessage.success('所有通知已标记为已读')
    }
  } catch (error) {
    console.error('标记全部已读失败:', error)
    ElMessage.error('标记全部已读失败')
  }
}

const getScoreClass = (score: number) => {
  if (!score) return 'neutral'
  if (score >= 8) return 'high'
  if (score >= 6) return 'medium'
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
    system: '系统通知',
    message: '消息通知',
    reminder: '提醒通知',
  }
  return typeMap[type] || type
}

const getNotificationTypeClass = (type: string) => {
  const classMap: Record<string, string> = {
    project: 'project',
    review: 'review',
    system: 'system',
    message: 'message',
    reminder: 'reminder',
  }
  return classMap[type] || type
}

const formatReviewType = (type: string) => {
  const typeMap: Record<string, string> = {
    initial: '初期评审',
    mid_term: '中期评审',
    final: '结题评审',
    special: '专项评审',
  }
  return typeMap[type] || type
}

const formatTime = (dateString: string) => {
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

const getNotificationIcon = (type: string) => {
  const iconMap: Record<string, string> = {
    project: '📋',
    review: '⭐',
    system: '🔧',
    message: '💬',
    reminder: '⏰',
  }
  return iconMap[type] || '📢'
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

// 工具方法
const openReviewTemplate = () => {
  ElMessage.info('打开评审模板')
}

const openScoringGuide = () => {
  ElMessage.info('打开评分指南')
}

const openCalculator = () => {
  ElMessage.info('打开计算器')
}

const openSchedule = () => {
  ElMessage.info('打开日程表')
}

// 加载用户信息
const loadUserInfo = async () => {
  try {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      userName.value = user.username || user.nickname || user.name || '评审专家'
      userRole.value = user.role || 'reviewer'
      userId.value = user.id || user.user_id || ''

      localStorage.setItem('userName', userName.value)
      localStorage.setItem('userRole', userRole.value)
      localStorage.setItem('userId', userId.value)
    } else {
      const response = await request.get('/api/user/profile')
      if (response.success && response.data) {
        const userData = response.data.data || response.data
        userName.value = userData.username || userData.name || '评审专家'
        userRole.value = userData.role || 'reviewer'
        userId.value = userData.id || ''
      }
    }
  } catch (error) {
    console.warn('加载用户信息失败:', error)
    userName.value = localStorage.getItem('userName') || '评审专家'
    userRole.value = localStorage.getItem('userRole') || 'reviewer'
    userId.value = localStorage.getItem('userId') || ''
  }
}

// 加载仪表板数据
const loadDashboardData = async () => {
  loading.value = true

  try {
    console.log('正在获取评审专家仪表板数据...')

    const response = await request.get('/api/dashboard/reviewer')

    if (response.success && response.data) {
      const data = response.data.data || response.data

      // 更新统计信息
      stats.value = {
        pendingReviews: data.stats?.pending_reviews || 0,
        completedReviews: data.stats?.completed_reviews || 0,
        totalProjects: data.stats?.total_projects || 0,
        avgReviewTime: data.stats?.avg_review_time || '--',
        efficiency: data.stats?.efficiency || 0,
        approvedCount: data.stats?.approved_count || 0,
        revisedCount: data.stats?.revised_count || 0,
        rejectedCount: data.stats?.rejected_count || 0,
        avgTotalScore: data.stats?.avg_total_score || '--',
        maxScore: data.stats?.max_score || '--',
        minScore: data.stats?.min_score || '--',
      }

      // 更新待办任务
      pendingTasks.value = data.pending_tasks || []

      // 更新通知
      notifications.value = (data.notifications || []).map((notif: any) => ({
        ...notif,
        icon: getNotificationIcon(notif.type),
        time: formatTime(notif.time || notif.created_at),
      }))
      unreadCount.value = data.unread_count || 0

      // 更新最近评审的项目
      recentReviewedProjects.value = data.recent_reviews || []

      lastUpdateTime.value = new Date().toLocaleTimeString('zh-CN')

      console.log('✅ 评审专家仪表板数据加载成功')
    } else {
      throw new Error('数据格式错误')
    }
  } catch (error) {
    console.error('加载仪表板数据失败:', error)
    ElMessage.error('加载数据失败，请稍后重试')

    // 显示模拟数据
    showMockData()
  } finally {
    loading.value = false
  }
}

// 显示模拟数据
const showMockData = () => {
  console.log('使用模拟数据')

  // 模拟统计信息
  stats.value = {
    pendingReviews: 3,
    completedReviews: 12,
    totalProjects: 15,
    avgReviewTime: '3.5',
    efficiency: 8,
    approvedCount: 5,
    revisedCount: 6,
    rejectedCount: 1,
    avgTotalScore: '7.8',
    maxScore: '9.5',
    minScore: '5.0',
  }

  // 模拟待办任务
  pendingTasks.value = [
    {
      id: 1,
      title: '评审项目：人工智能辅助医疗诊断系统研究',
      type: '项目评审',
      deadline: '2024-01-15',
      priority: 'high',
      applicant_name: '张研究员',
      raw_type: 'project_review',
      review_id: 'rev_001',
      project_id: '1',
    },
    {
      id: 2,
      title: '评审项目：新型环保材料开发与应用',
      type: '项目评审',
      deadline: '2024-01-20',
      priority: 'medium',
      applicant_name: '李教授',
      raw_type: 'project_review',
      review_id: 'rev_002',
      project_id: '2',
    },
  ]

  // 模拟通知
  notifications.value = [
    {
      id: 1,
      title: '新项目待评审',
      description: '您有新的项目需要评审，请在截止日期前完成',
      icon: '📋',
      time: '2小时前',
      read: false,
      raw_id: 'notif_001',
      raw_type: 'review',
    },
    {
      id: 2,
      title: '系统维护通知',
      description: '系统将于本周日进行维护，请提前保存工作',
      icon: '🔧',
      time: '1天前',
      read: true,
      raw_id: 'notif_002',
      raw_type: 'system',
    },
  ]

  // 模拟最近评审的项目
  recentReviewedProjects.value = [
    {
      id: 1,
      project_id: 'p001',
      project_code: 'PROJ-2024001',
      title: '量子计算算法研究',
      review_date: '2024-01-10',
      review_type: 'initial',
      total_score: 8.5,
    },
    {
      id: 2,
      project_id: 'p002',
      project_code: 'PROJ-2024002',
      title: '生物医药研发',
      review_date: '2024-01-08',
      review_type: 'mid_term',
      total_score: 7.2,
    },
    {
      id: 3,
      project_id: 'p003',
      project_code: 'PROJ-2024003',
      title: '环保材料应用',
      review_date: '2024-01-05',
      review_type: 'final',
      total_score: 9.0,
    },
  ]

  unreadCount.value = 1
  lastUpdateTime.value = new Date().toLocaleTimeString('zh-CN')
}

// 组件生命周期
onMounted(() => {
  console.log('=== 初始化评审专家工作台页面 ===')

  loadUserInfo().then(() => {
    console.log('加载后的用户信息:', {
      name: userName.value,
      role: userRole.value,
      id: userId.value,
    })

    // 检查角色是否匹配
    if (userRole.value.toLowerCase() !== 'reviewer') {
      console.warn(`⚠️ 警告：当前用户角色 "${userRole.value}" 不匹配评审专家角色`)
      ElMessage.warning(`检测到您是${userRole.value}，将跳转到对应工作台`)

      setTimeout(() => {
        const rolePaths: Record<string, string> = {
          applicant: '/applicant/dashboard',
          assistant: '/assistant/dashboard',
          admin: '/admin/dashboard',
        }
        const targetPath = rolePaths[userRole.value.toLowerCase()] || '/login'
        router.push(targetPath)
      }, 2000)
    } else {
      loadDashboardData()
    }
  })

  // 设置定时刷新
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
  if (showNotificationsDropdown.value && !e.target.closest('.notifications-dropdown')) {
    showNotificationsDropdown.value = false
  }
})
</script>

<style scoped>
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
  width: 100%;
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
  min-width: 100px;
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
  padding: 24px;
}

/* 徽章样式 */
.badge {
  display: inline-block;
  background: #ff4d4f;
  color: white;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: 8px;
  vertical-align: middle;
  font-weight: 500;
}

/* 待评审项目 */
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

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-item {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #f0f0f0;
  transition: all 0.3s;
  cursor: pointer;
}

.task-item:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
  transform: translateY(-2px);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.task-type {
  font-size: 12px;
  color: #666;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 12px;
}

.task-priority {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
}

.task-priority.high {
  background: #fff2f0;
  color: #ff4d4f;
}

.task-priority.medium {
  background: #fff7e6;
  color: #fa8c16;
}

.task-priority.low {
  background: #f6ffed;
  color: #52c41a;
}

.task-title {
  font-size: 16px;
  color: #2c3e50;
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.task-meta {
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

.task-actions {
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

/* 评审统计卡片 */
.mini-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.mini-stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  transition: all 0.3s;
}

.mini-stat-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.mini-stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.mini-stat-content {
  flex: 1;
}

.mini-stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #2c3e50;
  line-height: 1;
}

.mini-stat-label {
  font-size: 12px;
  color: #7f8c8d;
  margin-top: 2px;
}

/* 评审效率分析 */
.trend-indicator {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.trend-indicator.positive {
  background: #f6ffed;
  color: #52c41a;
}

.trend-indicator.negative {
  background: #fff2f0;
  color: #ff4d4f;
}

.trend-indicator.neutral {
  background: #f5f5f5;
  color: #666;
}

.review-efficiency {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.efficiency-metric {
  text-align: center;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%);
  border-radius: 12px;
}

.metric-value {
  font-size: 36px;
  font-weight: 700;
  color: #1890ff;
  margin-bottom: 4px;
}

.metric-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 2px;
}

.metric-subtext {
  font-size: 12px;
  color: #8c8c8c;
}

.efficiency-chart {
  margin-top: 8px;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 120px;
  padding: 0 4px;
}

.chart-bar {
  flex: 1;
  margin: 0 2px;
  background: linear-gradient(180deg, #1890ff 0%, #40a9ff 100%);
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  position: relative;
  transition: all 0.3s;
}

.chart-bar:hover {
  transform: scaleY(1.1);
}

.bar-value {
  position: absolute;
  top: -20px;
  left: 0;
  right: 0;
  font-size: 10px;
  color: #666;
  text-align: center;
}

.chart-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  padding: 0 4px;
}

.chart-labels span {
  flex: 1;
  font-size: 10px;
  color: #8c8c8c;
  text-align: center;
}

/* 质量分析 */
.quality-chart {
  margin-top: 8px;
}

.quality-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quality-bar {
  height: 36px;
  border-radius: 6px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.3s;
}

.quality-bar:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.bar-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-weight: 500;
}

.bar-name {
  font-size: 13px;
}

.bar-count {
  font-size: 11px;
  opacity: 0.9;
}

.bar-percentage {
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.quality-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #f0f0f0;
}

.summary-item {
  text-align: center;
  padding: 8px;
}

.summary-label {
  display: block;
  font-size: 11px;
  color: #8c8c8c;
  margin-bottom: 2px;
}

.summary-value {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

/* 评审准则 */
.guidelines-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.guideline-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: #fafafa;
  transition: all 0.3s;
}

.guideline-item:hover {
  background: #f0f0f0;
}

.guideline-icon {
  width: 20px;
  height: 20px;
  background: #52c41a;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}

.guideline-text {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
}

/* 通知中心 */
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
  background: #f6ffed;
  color: #52c41a;
}

.notification-type.system {
  background: #fff7e6;
  color: #fa8c16;
}

.notification-type.message {
  background: #f9f0ff;
  color: #722ed1;
}

.notification-type.reminder {
  background: #f0f5ff;
  color: #2f54eb;
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

/* 最近评审列表 */
.recent-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recent-item {
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.recent-item:hover {
  background: #f0f0f0;
  transform: translateY(-2px);
}

.project-code {
  font-size: 11px;
  color: #666;
  font-family: monospace;
  margin-bottom: 4px;
}

.project-title {
  font-size: 14px;
  color: #2c3e50;
  margin-bottom: 8px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.review-score {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 10px;
  font-weight: 600;
  min-width: 36px;
  text-align: center;
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

.review-score.neutral {
  background: #f5f5f5;
  color: #666;
}

.review-date {
  font-size: 11px;
  color: #8c8c8c;
}

.review-type {
  font-size: 10px;
  color: #1890ff;
  background: #e6f7ff;
  padding: 2px 8px;
  border-radius: 10px;
  display: inline-block;
}

/* 系统状态 */
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

/* 常用工具 */
.tools-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.tool-item {
  padding: 12px 4px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.tool-item:hover {
  background: #1890ff;
  border-color: #1890ff;
  transform: translateY(-2px);
}

.tool-item:hover .tool-icon,
.tool-item:hover .tool-name {
  color: white;
}

.tool-icon {
  font-size: 20px;
}

.tool-name {
  font-size: 11px;
  color: #666;
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

  .actions-grid {
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

  .mini-stats-grid {
    grid-template-columns: 1fr;
  }

  .quality-summary {
    grid-template-columns: 1fr;
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

  .task-meta {
    flex-direction: column;
    gap: 4px;
  }

  .notification-meta {
    flex-direction: column;
    gap: 4px;
  }

  .tools-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .chart-bars {
    height: 80px;
  }
}

/* 打印样式 */
@media print {
  .sidebar,
  .dashboard-header,
  .status-actions,
  .task-actions,
  .view-all-btn,
  .mark-all-btn,
  .tool-item {
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
}
</style>
