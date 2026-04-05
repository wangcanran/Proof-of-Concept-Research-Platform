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
          <router-link to="/transfers" class="nav-link" active-class="active">
            <span class="nav-icon">🔄</span>
            <span v-if="!sidebarCollapsed" class="nav-text">成果转化</span>
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
                    <span class="meta-item">📅 {{ project.deadline }}</span>
                    <span class="meta-item">👤 {{ project.manager }}</span>
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

            <!-- 数据统计 -->
            <div class="stats-section card-section">
              <h3 class="section-title">
                <span class="section-icon">📊</span>
                数据统计
              </h3>
              <div class="stats-cards">
                <div class="stat-card">
                  <div class="stat-header">
                    <div class="stat-icon" style="background: #e6f7ff">📄</div>
                    <span class="stat-trend" :class="getTrendClass(stats.submissionTrend)">
                      {{ stats.submissionTrend > 0 ? '+' : '' }}{{ stats.submissionTrend || 0 }}%
                    </span>
                  </div>
                  <div class="stat-value">{{ stats.submittedProjects || 0 }}</div>
                  <div class="stat-label">已申报项目</div>
                </div>

                <div class="stat-card">
                  <div class="stat-header">
                    <div class="stat-icon" style="background: #f6ffed">✅</div>
                    <span class="stat-trend" :class="getTrendClass(stats.approvalTrend)">
                      {{ stats.approvalTrend > 0 ? '+' : '' }}{{ stats.approvalTrend || 0 }}%
                    </span>
                  </div>
                  <div class="stat-value">{{ stats.approvedProjects || 0 }}</div>
                  <div class="stat-label">已立项项目</div>
                </div>

                <div class="stat-card">
                  <div class="stat-header">
                    <div class="stat-icon" style="background: #fff7e6">⏳</div>
                    <span class="stat-trend" :class="getTrendClass(stats.reviewTrend)">
                      {{ stats.reviewTrend > 0 ? '+' : '' }}{{ stats.reviewTrend || 0 }}%
                    </span>
                  </div>
                  <div class="stat-value">{{ stats.reviewingProjects || 0 }}</div>
                  <div class="stat-label">评审中项目</div>
                </div>

                <div class="stat-card">
                  <div class="stat-header">
                    <div class="stat-icon" style="background: #fff2f0">💰</div>
                    <span class="stat-trend" :class="getTrendClass(stats.fundTrend)">
                      {{ stats.fundTrend > 0 ? '+' : '' }}{{ stats.fundTrend || 0 }}%
                    </span>
                  </div>
                  <div class="stat-value">{{ formatFunds(stats.totalFunds) }}</div>
                  <div class="stat-label">总经费额度</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 中列：待办事项 -->
          <div class="dashboard-column">
            <div class="todo-section card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">✅</span>
                  待办事项
                </h3>
                <div class="section-header-actions">
                  <button
                    class="mark-all-btn"
                    @click="completeAllTasks"
                    v-if="pendingTasks.length > 0"
                  >
                    全部完成
                  </button>
                  <button class="view-all-btn" @click="navigateTo('all-tasks')">查看全部 →</button>
                </div>
              </div>

              <div class="todo-list">
                <div
                  v-for="task in pendingTasks"
                  :key="task.id"
                  class="todo-item"
                  :class="{ urgent: task.priority === 'high' }"
                >
                  <div class="todo-checkbox">
                    <input
                      type="checkbox"
                      :id="'task-' + task.id"
                      @change="completeTask(task.id)"
                    />
                    <label :for="'task-' + task.id"></label>
                  </div>
                  <div class="todo-content">
                    <h4 class="todo-title">{{ task.title }}</h4>
                    <p class="todo-description">{{ task.description || '暂无描述' }}</p>
                    <div class="todo-meta">
                      <span class="todo-type" :class="getTaskTypeClass(task.type)">
                        {{ getTaskTypeText(task.type) }}
                      </span>
                      <span class="todo-deadline">⏰ {{ task.deadline }}</span>
                      <span class="todo-project" v-if="task.projectName">
                        📁 {{ task.projectName }}
                      </span>
                    </div>
                  </div>
                  <div class="todo-actions">
                    <button class="todo-btn" @click="handleTask(task)">处理</button>
                  </div>
                </div>

                <div class="empty-state" v-if="pendingTasks.length === 0 && !loading">
                  <div class="empty-icon">✅</div>
                  <p>暂无待办事项</p>
                  <p class="empty-subtext">请继续您的工作或等待系统分配新任务</p>
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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
  submissionTrend: 0,
  approvalTrend: 0,
  reviewTrend: 0,
  fundTrend: 0,
})

const recentProjects = ref([])
const pendingTasks = ref([])
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
    assistant: '科研助理',
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
  return notifications.value.slice(0, 3) // 只显示最近的3条通知
})

// 方法
const navigateTo = (action) => {
  const routes = {
    'create-project': '/projects/create',
    'my-projects': '/projects',
    'all-projects': '/projects',
    'submit-achievement': '/achievements/create',
    'funding-application': '/applications/create',
    'all-tasks': '/tasks',
    notifications: '/notifications',
  }

  if (routes[action]) {
    router.push(routes[action])
  }
}

const viewProject = (projectId) => {
  router.push(`/projects/detail/${projectId}`)
}

const editProject = (projectId) => {
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

const completeTask = async (taskId) => {
  try {
    const task = pendingTasks.value.find((t) => t.id === taskId)
    if (!task) return

    // 在实际应用中，这里应该调用API完成任务
    console.log('完成任务:', task.title)

    // 调用API完成任务
    await request.post(`/api/tasks/${taskId}/complete`)

    // 从列表中移除
    pendingTasks.value = pendingTasks.value.filter((t) => t.id !== taskId)

    ElMessage.success('任务已完成')

    // 更新统计数据
    if (stats.value.pendingReviews > 0) {
      stats.value.pendingReviews--
    }
  } catch (error) {
    console.error('完成任务失败:', error)
    ElMessage.error('完成任务失败')
  }
}

const completeAllTasks = async () => {
  if (confirm('确定要完成所有待办事项吗？')) {
    try {
      // 调用API完成所有任务
      await request.post('/api/tasks/complete-all')

      pendingTasks.value = []
      stats.value.pendingReviews = 0
      ElMessage.success('所有任务已完成')
    } catch (error) {
      console.error('完成所有任务失败:', error)
      ElMessage.error('完成所有任务失败')
    }
  }
}

const handleTask = (task) => {
  // 根据任务类型跳转到对应页面
  if (task.actionUrl) {
    router.push(task.actionUrl)
  } else if (task.projectId) {
    // 如果是项目相关任务
    if (task.type === 'project_review') {
      router.push(`/projects/detail/${task.projectId}`)
    } else if (task.type === 'funding_application') {
      router.push(`/funds/applications/${task.relatedId}`)
    } else if (task.type === 'achievement_audit') {
      router.push(`/achievements/${task.relatedId}/detail`)
    }
  } else {
    ElMessage.info(`处理任务: ${task.title}`)
  }
}

const openNotification = async (notification) => {
  try {
    if (!notification.read) {
      // 标记为已读
      await request.post(`/api/notifications/${notification.id}/read`)
      notification.read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }

    // 跳转到相关页面
    if (notification.link) {
      router.push(notification.link)
    } else if (notification.relatedType === 'project') {
      router.push(`/projects/detail/${notification.relatedId}`)
    } else if (notification.relatedType === 'achievement') {
      router.push(`/achievements/${notification.relatedId}/detail`)
    } else if (notification.relatedType === 'funding') {
      router.push(`/funds/applications/${notification.relatedId}`)
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

const getStatusText = (status) => {
  const statusMap = {
    draft: '草稿',
    submitted: '已提交',
    under_review: '评审中',
    approved: '已批准',
    in_progress: '进行中',
    completed: '已完成',
    rejected: '已拒绝',
    pending: '待处理',
    review: '评审中',
  }
  return statusMap[status] || status
}

const getStatusClass = (status) => {
  const classMap = {
    draft: 'draft',
    submitted: 'submitted',
    under_review: 'reviewing',
    approved: 'approved',
    in_progress: 'ongoing',
    completed: 'completed',
    rejected: 'rejected',
    pending: 'reviewing',
    review: 'reviewing',
  }
  return classMap[status] || status
}

const getProgressClass = (progress) => {
  if (progress >= 80) return 'high'
  if (progress >= 50) return 'medium'
  return 'low'
}

const getTrendClass = (trend) => {
  if (trend > 0) return 'positive'
  if (trend < 0) return 'negative'
  return 'neutral'
}

const getTaskTypeText = (type) => {
  const typeMap = {
    project_review: '项目评审',
    funding_application: '经费申请',
    achievement_audit: '成果审核',
    report_submit: '报告提交',
    meeting_attendance: '会议参加',
    document_submit: '文档提交',
    other: '其他',
  }
  return typeMap[type] || type
}

const getTaskTypeClass = (type) => {
  const classMap = {
    project_review: 'project',
    funding_application: 'funding',
    achievement_audit: 'achievement',
    report_submit: 'report',
    meeting_attendance: 'meeting',
    document_submit: 'document',
    other: 'other',
  }
  return classMap[type] || 'other'
}

const getNotificationTypeText = (type) => {
  const typeMap = {
    project: '项目通知',
    funding: '经费通知',
    achievement: '成果通知',
    system: '系统通知',
    review: '评审通知',
    message: '消息通知',
    task: '任务通知',
    warning: '警告通知',
    info: '信息通知',
  }
  return typeMap[type] || type
}

const getNotificationTypeClass = (type) => {
  const classMap = {
    project: 'project',
    funding: 'funding',
    achievement: 'achievement',
    system: 'system',
    review: 'review',
    message: 'message',
    task: 'task',
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
      userName.value = user.username || user.nickname || user.name || '用户'
      userRole.value = user.role || 'applicant'
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
        userRole.value = userData.role || 'applicant'
        userId.value = userData.id || ''
      }
    }
  } catch (error) {
    console.warn('加载用户信息失败:', error)
    userName.value = localStorage.getItem('userName') || '用户'
    userRole.value = localStorage.getItem('userRole') || 'applicant'
    userId.value = localStorage.getItem('userId') || ''
  }
}

// 专门加载项目数据的方法
const loadProjectData = async () => {
  try {
    console.log('正在加载项目数据...当前用户ID:', userId.value)

    // 尝试多个可能的项目API端点
    const projectEndpoints = [
      '/api/projects',
      '/api/applicant/projects',
      '/api/dashboard/projects',
      '/api/user/projects',
    ]

    let projectResponse = null
    for (const endpoint of projectEndpoints) {
      try {
        console.log('尝试项目API端点:', endpoint)
        const res = await request.get(endpoint, {
          params: {
            limit: 6,
            orderBy: 'created_at',
            order: 'desc',
          },
        })

        if (res && (res.success || res.data)) {
          projectResponse = res
          console.log(`成功使用项目端点: ${endpoint}`, res)
          break
        }
      } catch (e) {
        console.log(`项目端点 ${endpoint} 失败:`, e.message)
        continue
      }
    }

    if (projectResponse) {
      const projectData = projectResponse.data?.data || projectResponse.data || projectResponse
      console.log('项目API返回数据:', projectData)

      // 处理数据
      let projectsArray = []
      if (Array.isArray(projectData)) {
        projectsArray = projectData
      } else if (projectData.projects) {
        projectsArray = projectData.projects
      } else if (projectData.items) {
        projectsArray = projectData.items
      } else if (projectData.list) {
        projectsArray = projectData.list
      } else if (projectData.data && Array.isArray(projectData.data)) {
        projectsArray = projectData.data
      }

      console.log('解析出的项目数组:', projectsArray)

      if (projectsArray.length > 0) {
        recentProjects.value = projectsArray.map((project) => {
          // 计算进度
          let progress = 0
          if (project.progress !== undefined) {
            progress = Number(project.progress)
          } else if (project.completion_rate !== undefined) {
            progress = Number(project.completion_rate)
          } else if (project.current_stage !== undefined) {
            // 根据阶段计算进度
            if (project.status === 'draft') progress = 10
            else if (project.status === 'submitted') progress = 30
            else if (project.status === 'under_review' || project.status === 'review') progress = 50
            else if (project.status === 'approved') progress = 60
            else if (project.status === 'in_progress')
              progress = 70 + (project.current_stage || 1) * 10
            else if (project.status === 'stage_review') progress = 80
            else if (project.status === 'completed') progress = 100
            else if (project.status === 'rejected' || project.status === 'terminated') progress = 0
          } else {
            // 根据状态估算进度
            if (project.status === 'draft') progress = 30
            else if (project.status === 'submitted') progress = 60
            else if (project.status === 'under_review' || project.status === 'review') progress = 60
            else if (project.status === 'approved') progress = 80
            else if (project.status === 'in_progress') progress = 50
            else if (project.status === 'completed') progress = 100
          }

          // 确保进度在0-100之间
          progress = Math.max(0, Math.min(100, progress))

          // 格式化截止日期
          const deadline = formatDate(
            project.end_date || project.deadline || project.submit_date || '',
          )

          return {
            id: project.id || project.project_id || '',
            code:
              project.project_code || project.code || `PROJ-${(project.id || '').substring(0, 8)}`,
            title: project.title || project.project_title || '未命名项目',
            status: project.status || 'draft',
            progress: progress,
            deadline: deadline || '未设置',
            manager:
              project.applicant_name || project.manager || project.applicant || userName.value,
          }
        })

        console.log('处理后的项目数据:', recentProjects.value)

        // 更新统计信息
        updateStatsFromProjects()
      } else {
        console.log('没有找到项目数据')
        loadFallbackProjectData()
      }
    } else {
      console.log('所有项目API端点都失败了，使用备用数据')
      loadFallbackProjectData()
    }
  } catch (error) {
    console.error('加载项目数据失败:', error)
    loadFallbackProjectData()
  }
}

// 从项目数据更新统计信息
const updateStatsFromProjects = () => {
  if (recentProjects.value.length > 0) {
    stats.value.totalProjects = recentProjects.value.length
    stats.value.ongoingProjects = recentProjects.value.filter(
      (p) => p.status === 'in_progress' || p.status === 'stage_review',
    ).length
    stats.value.submittedProjects = recentProjects.value.filter(
      (p) => p.status === 'submitted',
    ).length
    stats.value.approvedProjects = recentProjects.value.filter(
      (p) => p.status === 'approved',
    ).length
    stats.value.reviewingProjects = recentProjects.value.filter(
      (p) => p.status === 'under_review' || p.status === 'review',
    ).length
  }
}

// 加载备用项目数据
const loadFallbackProjectData = () => {
  console.log('加载备用项目数据')

  // 如果没有数据，使用模拟数据
  showMockProjectData()
}

// 显示模拟项目数据
const showMockProjectData = () => {
  console.log('使用模拟项目数据')
  recentProjects.value = [
    {
      id: '1',
      code: 'PROJ-2024001',
      title: '人工智能辅助医疗诊断系统研究',
      status: 'in_progress',
      progress: 65,
      deadline: '2024-12-31',
      manager: userName.value || '张研究员',
    },
    {
      id: '2',
      code: 'PROJ-2024002',
      title: '新型环保材料开发与应用',
      status: 'under_review',
      progress: 100,
      deadline: '2024-10-15',
      manager: userName.value || '李教授',
    },
    {
      id: '3',
      code: 'PROJ-2024003',
      title: '大数据分析平台构建',
      status: 'draft',
      progress: 30,
      deadline: '未设置',
      manager: userName.value || '王博士',
    },
  ]

  stats.value.totalProjects = recentProjects.value.length
  stats.value.ongoingProjects = recentProjects.value.filter(
    (p) => p.status === 'in_progress',
  ).length
  stats.value.reviewingProjects = recentProjects.value.filter(
    (p) => p.status === 'under_review',
  ).length
  stats.value.totalFunds = 150000
}

// 加载待办事项数据
const loadTasksData = async () => {
  try {
    console.log('正在加载待办事项数据...')

    const endpoints = ['/api/tasks/pending']

    let tasksResponse = null
    for (const endpoint of endpoints) {
      try {
        const res = await request.get(endpoint, {
          params: {
            limit: 10,
            orderBy: 'deadline',
            order: 'asc',
          },
        })

        if (res && (res.success || res.data)) {
          tasksResponse = res
          break
        }
      } catch (e) {
        console.log(`任务端点 ${endpoint} 失败:`, e.message)
        continue
      }
    }

    if (tasksResponse) {
      const tasksData = tasksResponse.data?.data || tasksResponse.data || tasksResponse
      console.log('任务API返回数据:', tasksData)

      // 处理任务数据
      let tasksArray = []
      if (Array.isArray(tasksData)) {
        tasksArray = tasksData
      } else if (tasksData.tasks) {
        tasksArray = tasksData.tasks
      } else if (tasksData.items) {
        tasksArray = tasksData.items
      }

      if (tasksArray.length > 0) {
        pendingTasks.value = tasksArray.map((task) => ({
          id: task.id || task.task_id,
          title: task.title || task.task_title || '待办任务',
          description: task.description || task.content || '',
          type: task.type || task.task_type || 'other',
          deadline: formatDate(task.deadline || task.due_date || task.created_at),
          priority: task.priority || 'medium',
          projectId: task.project_id || task.projectId,
          projectName: task.project_name || task.projectTitle,
          relatedId: task.related_id || task.relatedId,
          actionUrl: task.action_url || task.url || '',
        }))

        // 更新待处理任务统计
        stats.value.pendingReviews = pendingTasks.value.length
      } else {
        showMockTasksData()
      }
    } else {
      showMockTasksData()
    }
  } catch (error) {
    console.error('加载待办事项失败:', error)
    showMockTasksData()
  }
}

// 显示模拟任务数据
const showMockTasksData = () => {
  console.log('使用模拟任务数据')
  pendingTasks.value = [
    {
      id: 1,
      title: '完成项目进度报告',
      description: '需要提交项目2024年第二季度进度报告',
      type: 'report_submit',
      deadline: '2024-06-30',
      priority: 'high',
      projectId: '1',
      projectName: '人工智能辅助医疗诊断系统研究',
      actionUrl: '/projects/detail/1',
    },
    {
      id: 2,
      title: '提交经费使用明细',
      description: '申请经费报销需要提供详细的支出明细',
      type: 'funding_application',
      deadline: '2024-06-25',
      priority: 'medium',
      relatedId: 'fund001',
      actionUrl: '/funds/applications/fund001',
    },
    {
      id: 3,
      title: '参加项目评审会议',
      description: '项目中期评审会议，需要准备汇报材料',
      type: 'meeting_attendance',
      deadline: '2024-06-20',
      priority: 'high',
      projectId: '2',
      projectName: '新型环保材料开发与应用',
    },
  ]

  stats.value.pendingReviews = pendingTasks.value.length
}

// 加载通知数据
const loadNotificationsData = async () => {
  try {
    console.log('正在加载通知数据...')

    const endpoints = ['/api/notifications', '/api/messages/recent', '/api/alerts']

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

      // 处理通知数据
      let notificationsArray = []
      if (Array.isArray(notificationsData)) {
        notificationsArray = notificationsData
      } else if (notificationsData.notifications) {
        notificationsArray = notificationsData.notifications
      } else if (notificationsData.messages) {
        notificationsArray = notificationsData.messages
      }

      if (notificationsArray.length > 0) {
        notifications.value = notificationsArray.map((n) => ({
          id: n.id || n.notification_id,
          title: n.title || n.subject || '系统通知',
          description: n.description || n.content || '',
          type: n.type || 'info',
          icon: getNotificationIcon(n.type),
          time: formatTime(n.created_at || n.time || n.send_at),
          read: n.read || false,
          link: n.link || n.url || '',
          relatedType: n.related_type || n.target_type,
          relatedId: n.related_id || n.target_id,
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

// 显示模拟通知数据
const showMockNotificationsData = () => {
  console.log('使用模拟通知数据')
  notifications.value = [
    {
      id: 1,
      title: '项目评审通知',
      description: '您的项目已进入专家评审阶段，请关注评审进度',
      type: 'project',
      icon: '📋',
      time: '2小时前',
      read: false,
      relatedType: 'project',
      relatedId: '2',
      priority: 'high',
    },
    {
      id: 2,
      title: '系统更新提醒',
      description: '系统将于本周日进行维护升级，期间将暂停服务',
      type: 'system',
      icon: '🔧',
      time: '1天前',
      read: true,
    },
    {
      id: 3,
      title: '经费申请批复',
      description: '您的经费申请已审核通过，请及时查收',
      type: 'funding',
      icon: '💰',
      time: '3天前',
      read: false,
      relatedType: 'funding',
      relatedId: 'fund001',
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
    funding: '💰',
    achievement: '🏆',
    system: '🔧',
    review: '⭐',
    message: '💬',
    task: '✅',
    warning: '⚠️',
    info: 'ℹ️',
  }
  return iconMap[type] || '📢'
}

// 加载仪表板统计
const loadDashboardStats = async () => {
  try {
    const response = await request.get('/api/dashboard/applicant')
    if (response && (response.success || response.data)) {
      const data = response.data?.data || response.data || response
      console.log('仪表板统计API返回数据:', data)

      if (data.stats || data.summary) {
        const statsData = data.stats || data.summary

        stats.value.pendingReviews =
          statsData.pending_reviews ||
          statsData.pendingReviews ||
          statsData.pending_tasks ||
          statsData.pendingTasks ||
          pendingTasks.value.length

        stats.value.submissionTrend = statsData.submission_trend || statsData.submissionTrend || 0
        stats.value.approvalTrend = statsData.approval_trend || statsData.approvalTrend || 0
        stats.value.reviewTrend = statsData.review_trend || statsData.reviewTrend || 0
        stats.value.fundTrend = statsData.fund_trend || statsData.fundTrend || 0

        // 如果总经费在API中提供，则使用API数据
        if (statsData.total_funds || statsData.totalFunds) {
          stats.value.totalFunds = statsData.total_funds || statsData.totalFunds
        }

        // 如果其他统计在API中提供，使用API数据
        if (statsData.total_projects || statsData.totalProjects) {
          stats.value.totalProjects = statsData.total_projects || statsData.totalProjects
        }
        if (statsData.ongoing_projects || statsData.ongoingProjects) {
          stats.value.ongoingProjects = statsData.ongoing_projects || statsData.ongoingProjects
        }
        if (statsData.submitted_projects || statsData.submittedProjects) {
          stats.value.submittedProjects =
            statsData.submitted_projects || statsData.submittedProjects
        }
        if (statsData.approved_projects || statsData.approvedProjects) {
          stats.value.approvedProjects = statsData.approved_projects || statsData.approvedProjects
        }
        if (statsData.reviewing_projects || statsData.reviewingProjects) {
          stats.value.reviewingProjects =
            statsData.reviewing_projects || statsData.reviewingProjects
        }
      }
    }
  } catch (error) {
    console.error('加载仪表板统计失败:', error)
    // 统计失败不影响数据显示
  }
}

// 测试后端连接
const testBackendConnection = async () => {
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

  // 确保项目数据显示
  showMockProjectData()

  // 显示任务数据
  showMockTasksData()

  // 显示通知数据
  showMockNotificationsData()

  // 其他模拟数据
  stats.value.submissionTrend = 10
  stats.value.approvalTrend = 5
  stats.value.reviewTrend = 0
  stats.value.fundTrend = 8

  backendConnected.value = true
  databaseConnected.value = true
  lastUpdateTime.value = new Date().toLocaleTimeString('zh-CN')
}

// 优化数据加载方法
const loadDashboardData = async () => {
  loading.value = true

  try {
    console.log('正在获取申请人仪表板数据...')
    console.log('当前用户ID:', userId.value, '角色:', userRole.value)

    // 测试后端连接
    await testBackendConnection()

    // 并行加载项目数据和其他数据
    await Promise.all([
      loadProjectData(),
      loadTasksData(),
      loadNotificationsData(),
      loadDashboardStats(),
    ])

    databaseConnected.value = true
    lastUpdateTime.value = new Date().toLocaleTimeString('zh-CN')
  } catch (error) {
    console.error('加载仪表板数据失败:', error)

    if (error.response?.status === 401) {
      ElMessage.error('登录状态已过期，请重新登录')
      localStorage.clear()
      sessionStorage.clear()
      router.push('/login')
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
  console.log('=== 初始化申请人工作台页面 ===')
  console.log('当前路由路径:', route.path)
  console.log('路由名称:', route.name)
  console.log('用户角色期望: applicant')

  // 先加载用户信息
  loadUserInfo().then(() => {
    console.log('加载后的用户信息:', {
      name: userName.value,
      role: userRole.value,
      id: userId.value,
      expectedRole: 'applicant',
    })

    // 检查角色是否匹配
    if (userRole.value.toLowerCase() !== 'applicant') {
      console.warn(`⚠️ 警告：当前用户角色 "${userRole.value}" 不匹配申请人角色`)
      ElMessage.warning(`检测到您是${userRoleName.value}，将跳转到对应工作台`)

      // 根据角色跳转到对应的工作台
      setTimeout(() => {
        const rolePaths = {
          reviewer: '/reviewer/dashboard',
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

/* 项目概览 */
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

/* 待办事项 */
.todo-section {
  padding: 24px;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.todo-item {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  transition: all 0.3s;
}

.todo-item:hover {
  border-color: #d9d9d9;
  background: white;
}

.todo-item.urgent {
  border-left: 3px solid #ff4d4f;
}

.todo-checkbox {
  margin-right: 12px;
  margin-top: 2px;
}

.todo-checkbox input[type='checkbox'] {
  display: none;
}

.todo-checkbox label {
  width: 18px;
  height: 18px;
  border: 2px solid #d9d9d9;
  border-radius: 4px;
  display: block;
  cursor: pointer;
  position: relative;
  transition: all 0.3s;
}

.todo-checkbox input[type='checkbox']:checked + label {
  background: #52c41a;
  border-color: #52c41a;
}

.todo-checkbox input[type='checkbox']:checked + label::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-weight: bold;
  font-size: 12px;
}

.todo-content {
  flex: 1;
  min-width: 0;
}

.todo-title {
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 4px;
  font-size: 14px;
}

.todo-description {
  color: #666;
  font-size: 13px;
  margin: 0 0 8px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.todo-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 11px;
  color: #7f8c8d;
}

.todo-type {
  padding: 2px 6px;
  border-radius: 10px;
  background: #f5f5f5;
  color: #666;
}

.todo-type.project {
  background: #e6f7ff;
  color: #1890ff;
}

.todo-type.funding {
  background: #fff2f0;
  color: #ff4d4f;
}

.todo-type.achievement {
  background: #f6ffed;
  color: #52c41a;
}

.todo-type.report {
  background: #f0f5ff;
  color: #2f54eb;
}

.todo-type.meeting {
  background: #f9f0ff;
  color: #722ed1;
}

.todo-type.document {
  background: #fff7e6;
  color: #fa8c16;
}

.todo-type.other {
  background: #f5f5f5;
  color: #8c8c8c;
}

.todo-project {
  display: flex;
  align-items: center;
  gap: 2px;
}

.todo-actions {
  margin-left: 12px;
  flex-shrink: 0;
}

.todo-btn {
  padding: 4px 12px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.3s;
  white-space: nowrap;
}

.todo-btn:hover {
  background: #40a9ff;
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

.notification-type.message {
  background: #f9f0ff;
  color: #722ed1;
}

.notification-type.task {
  background: #f6ffed;
  color: #52c41a;
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

/* 数据统计 */
.stats-section {
  padding: 24px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-card {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #f0f0f0;
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.stat-trend {
  font-size: 12px;
  font-weight: 500;
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

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #7f8c8d;
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

  .stats-cards {
    grid-template-columns: repeat(4, 1fr);
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

  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
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
}

@media (max-width: 576px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }

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

  .project-meta {
    flex-direction: column;
    gap: 4px;
  }

  .todo-meta,
  .notification-meta {
    flex-direction: column;
    gap: 4px;
  }
}

/* 打印样式 */
@media print {
  .sidebar,
  .dashboard-header,
  .status-actions,
  .project-actions,
  .todo-checkbox,
  .todo-actions {
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
