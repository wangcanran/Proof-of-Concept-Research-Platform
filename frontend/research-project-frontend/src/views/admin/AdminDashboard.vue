<!-- src/views/admin/AdminDashboard.vue -->
<template>
  <div class="admin-dashboard">
    <!-- 顶部导航栏 -->
    <header class="dashboard-header">
      <div class="header-left">
        <div class="mobile-menu-btn" @click="toggleMobileMenu">
          <span class="icon">☰</span>
        </div>
        <h1 class="logo">科研项目管理系统</h1>
        <div class="breadcrumb">
          <span class="current-page">系统管理员工作台</span>
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
            <div class="user-info-mini">
              <div class="user-avatar-mini">{{ userInitial }}</div>
              <div class="user-details">
                <div class="user-name-mini">{{ userName }}</div>
                <div class="user-role-mini">系统管理员</div>
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

    <div class="dashboard-content">
      <!-- 侧边栏导航 -->
      <aside class="sidebar" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
        <div class="sidebar-header">
          <h3 v-if="!sidebarCollapsed" class="sidebar-title">系统管理</h3>
          <button class="sidebar-toggle" @click="toggleSidebar">
            {{ sidebarCollapsed ? '→' : '←' }}
          </button>
        </div>

        <nav class="sidebar-nav">
          <div class="nav-section">
            <h4 v-if="!sidebarCollapsed" class="nav-section-title">控制面板</h4>
            <router-link to="/admin/dashboard" class="nav-link" active-class="active">
              <span class="nav-icon">🏠</span>
              <span v-if="!sidebarCollapsed" class="nav-text">仪表板</span>
            </router-link>
          </div>

          <div class="nav-section">
            <h4 v-if="!sidebarCollapsed" class="nav-section-title">用户管理</h4>
            <router-link to="/admin/users" class="nav-link" active-class="active">
              <span class="nav-icon">👥</span>
              <span v-if="!sidebarCollapsed" class="nav-text">用户管理</span>
              <span v-if="!sidebarCollapsed && pendingStats.userApprovals > 0" class="nav-badge">
                {{ pendingStats.userApprovals }}
              </span>
            </router-link>
            <router-link to="/admin/roles" class="nav-link" active-class="active">
              <span class="nav-icon">🔑</span>
              <span v-if="!sidebarCollapsed" class="nav-text">角色权限</span>
            </router-link>
          </div>
        </nav>

        <div class="sidebar-footer">
          <div class="user-info-mini">
            <div class="user-avatar-mini">{{ userInitial }}</div>
            <div v-if="!sidebarCollapsed" class="user-details">
              <div class="user-name-mini">{{ userName }}</div>
              <div class="user-role-mini">系统管理员</div>
            </div>
          </div>
        </div>
      </aside>

      <!-- 主内容区域 -->
      <main class="main-content" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
        <!-- 欢迎区域 -->
        <div class="welcome-section">
          <div class="welcome-card admin-banner">
            <div class="welcome-content">
              <h2 class="welcome-title">系统管理员工作台</h2>
              <p class="welcome-subtitle">欢迎回来{{ userName }}！今天是 {{ currentDate }}</p>
              <div class="quick-stats">
                <div class="stat-badge">
                  <span class="stat-value">{{ overview.totalUsers || 0 }}</span>
                  <span class="stat-label">总用户数</span>
                </div>
                <div class="stat-badge">
                  <span class="stat-value">{{ overview.totalProjects || 0 }}</span>
                  <span class="stat-label">总项目数</span>
                </div>
                <div class="stat-badge">
                  <span class="stat-value">{{ overview.todayLogins || 0 }}</span>
                  <span class="stat-label">今日登录</span>
                </div>
                <div class="stat-badge">
                  <span class="stat-value">{{ overview.systemHealth || '正常' }}</span>
                  <span class="stat-label">系统状态</span>
                </div>
              </div>
            </div>
            <div class="welcome-illustration">
              <div class="illustration-icon">⚙️</div>
            </div>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-overlay">
          <div class="loading-spinner"></div>
          <div class="loading-text">正在加载系统数据...</div>
        </div>

        <!-- 四列布局 -->
        <div class="dashboard-layout">
          <!-- 左列：系统状态 -->
          <div class="dashboard-column">
            <div class="system-status card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">📊</span>
                  系统状态
                </h3>
                <span class="status-badge" :class="getSystemStatusClass(overview.systemHealth)">
                  {{ overview.systemHealth || '正常' }}
                </span>
              </div>

              <div class="status-grid">
                <div class="status-item">
                  <div class="status-label">CPU使用率</div>
                  <div class="status-value">{{ systemStatus.cpuUsage || '0%' }}</div>
                  <div class="status-bar">
                    <div
                      class="bar-fill"
                      :style="{ width: systemStatus.cpuUsage || '0%' }"
                      :class="getUsageClass(systemStatus.cpuUsage)"
                    ></div>
                  </div>
                </div>

                <div class="status-item">
                  <div class="status-label">内存使用率</div>
                  <div class="status-value">{{ systemStatus.memoryUsage || '0%' }}</div>
                  <div class="status-bar">
                    <div
                      class="bar-fill"
                      :style="{ width: systemStatus.memoryUsage || '0%' }"
                      :class="getUsageClass(systemStatus.memoryUsage)"
                    ></div>
                  </div>
                </div>

                <div class="status-item">
                  <div class="status-label">磁盘空间</div>
                  <div class="status-value">{{ systemStatus.diskUsage || '0%' }}</div>
                  <div class="status-bar">
                    <div
                      class="bar-fill"
                      :style="{ width: systemStatus.diskUsage || '0%' }"
                      :class="getUsageClass(systemStatus.diskUsage)"
                    ></div>
                  </div>
                </div>

                <div class="status-item">
                  <div class="status-label">数据库连接</div>
                  <div class="status-value">{{ systemStatus.dbConnections || '0' }}</div>
                  <div
                    class="status-indicator"
                    :class="getConnectionClass(systemStatus.dbConnections)"
                  >
                    {{ systemStatus.dbStatus || '正常' }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 待审批用户 -->
            <div class="pending-users card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">👤</span>
                  待审批用户
                </h3>
                <button
                  class="view-all-btn"
                  @click="navigateTo('users')"
                  v-if="pendingUsers.length > 0"
                >
                  查看全部 →
                </button>
              </div>

              <div class="user-list">
                <div
                  v-for="user in pendingUsers"
                  :key="user.id"
                  class="user-item"
                  @click="viewUserDetail(user.id)"
                >
                  <div class="user-avatar-small">{{ user.name.charAt(0).toUpperCase() }}</div>
                  <div class="user-content">
                    <div class="user-header">
                      <h4 class="user-name">{{ user.name }}</h4>
                      <span class="user-role-tag">{{ user.role }}</span>
                    </div>
                    <div class="user-meta">
                      <span>{{ user.email }}</span>
                      <span class="user-time">{{ formatTime(user.created_at) }}</span>
                    </div>
                    <div class="user-actions">
                      <button class="action-btn approve" @click.stop="approveUser(user.id)">
                        通过
                      </button>
                      <button class="action-btn reject" @click.stop="rejectUser(user.id)">
                        拒绝
                      </button>
                    </div>
                  </div>
                </div>

                <div v-if="pendingUsers.length === 0" class="empty-state">
                  <div class="empty-icon">✅</div>
                  <p>暂无待审批用户</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 中列：数据统计 -->
          <div class="dashboard-column">
            <!-- 用户增长统计 -->
            <div class="user-growth card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">📈</span>
                  用户增长趋势
                </h3>
                <div class="time-filter">
                  <button
                    v-for="period in timePeriods"
                    :key="period.value"
                    class="period-btn"
                    :class="{ active: selectedPeriod === period.value }"
                    @click="changePeriod(period.value)"
                  >
                    {{ period.label }}
                  </button>
                </div>
              </div>

              <div class="chart-container">
                <div class="chart-placeholder" v-if="!userGrowthData.length">
                  <div class="placeholder-icon">📊</div>
                  <p>暂无数据</p>
                </div>
                <div class="chart-bars" v-else>
                  <div class="chart-bar" v-for="item in userGrowthData" :key="item.date">
                    <div class="bar-label">{{ item.date }}</div>
                    <div class="bar-container">
                      <div
                        class="bar"
                        :style="{ height: item.percentage + '%' }"
                        :title="item.count + '人'"
                      ></div>
                    </div>
                    <span class="bar-value">{{ item.count }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 角色分布 -->
            <div class="role-distribution card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">👥</span>
                  用户角色分布
                </h3>
              </div>

              <div class="distribution-chart">
                <div class="chart-pie">
                  <div
                    v-for="role in roleDistribution"
                    :key="role.role"
                    class="pie-slice"
                    :style="{
                      transform: `rotate(${role.startAngle}deg)`,
                      '--slice-color': role.color,
                    }"
                    :title="`${role.role}: ${role.count}人 (${role.percentage}%)`"
                  >
                    <span class="slice-label">{{ role.percentage }}%</span>
                  </div>
                </div>
                <div class="chart-legend">
                  <div v-for="role in roleDistribution" :key="role.role" class="legend-item">
                    <span class="legend-color" :style="{ backgroundColor: role.color }"></span>
                    <span class="legend-label">{{ getRoleText(role.role) }}</span>
                    <span class="legend-value">{{ role.count }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 右列：系统日志 -->
          <div class="dashboard-column">
            <!-- 最近操作日志 -->
            <div class="system-logs card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">📋</span>
                  系统操作日志
                </h3>
                <button class="view-all-btn" @click="navigateTo('logs')">查看全部 →</button>
              </div>

              <div class="logs-list">
                <div
                  v-for="log in systemLogs"
                  :key="log.id"
                  class="log-item"
                  :class="getLogClass(log.level)"
                >
                  <div class="log-icon">{{ getLogIcon(log.level) }}</div>
                  <div class="log-content">
                    <div class="log-message">{{ log.message }}</div>
                    <div class="log-meta">
                      <span class="log-time">{{ formatTime(log.created_at) }}</span>
                      <span class="log-user">{{ log.user || '系统' }}</span>
                    </div>
                  </div>
                </div>

                <div v-if="systemLogs.length === 0" class="empty-state">
                  <div class="empty-icon">📝</div>
                  <p>暂无系统日志</p>
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
                  </div>
                  <span class="unread-dot" v-if="!notification.read"></span>
                </div>

                <div v-if="notifications.length === 0" class="empty-state">
                  <div class="empty-icon">📭</div>
                  <p>暂无通知</p>
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
                <button class="action-card" @click="navigateTo('backup')">
                  <div class="action-icon">💾</div>
                  <div class="action-content">
                    <h4>数据备份</h4>
                    <p>备份系统数据</p>
                  </div>
                </button>
                <button class="action-card" @click="navigateTo('system-settings')">
                  <div class="action-icon">⚙️</div>
                  <div class="action-content">
                    <h4>系统设置</h4>
                    <p>配置系统参数</p>
                  </div>
                </button>
                <button class="action-card" @click="clearSystemCache">
                  <div class="action-icon">🧹</div>
                  <div class="action-content">
                    <h4>清理缓存</h4>
                    <p>清除系统缓存</p>
                  </div>
                </button>
                <button class="action-card" @click="restartSystem">
                  <div class="action-icon">🔄</div>
                  <div class="action-content">
                    <h4>重启系统</h4>
                    <p>重启应用服务</p>
                  </div>
                </button>
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
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const isDarkMode = ref(false)
const sidebarCollapsed = ref(false)
const showMobileMenu = ref(false)
const showNotificationsDropdown = ref(false)
const userName = ref('')
const unreadCount = ref(0)
const selectedPeriod = ref('week')

// 数据状态
const userInfo = ref({
  id: '',
  username: '',
  name: '',
  role: 'admin',
  email: '',
  department: '',
})

const overview = ref({
  totalUsers: 0,
  totalProjects: 0,
  todayLogins: 0,
  systemHealth: '正常',
  pendingUsers: 0,
  activeSessions: 0,
})

const systemStatus = ref({
  cpuUsage: '0%',
  memoryUsage: '0%',
  diskUsage: '0%',
  dbConnections: 0,
  dbStatus: '正常',
  uptime: '',
})

const pendingUsers = ref<any[]>([])
const userGrowthData = ref<any[]>([])
const roleDistribution = ref<any[]>([])
const systemLogs = ref<any[]>([])
const notifications = ref<any[]>([])

const pendingStats = computed(() => ({
  userApprovals: pendingUsers.value.length,
}))

const timePeriods = [
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
  { label: '年', value: 'year' },
]

// 计算属性
const userInitial = computed(() => {
  return userName.value ? userName.value.charAt(0).toUpperCase() : 'A'
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
const getRoleText = (role: string) => {
  const roleMap: Record<string, string> = {
    applicant: '申请人',
    reviewer: '评审专家',
    assistant: '科研助理',
    admin: '管理员',
  }
  return roleMap[role] || role
}

const getSystemStatusClass = (status: string) => {
  const classMap: Record<string, string> = {
    normal: 'normal',
    warning: 'warning',
    error: 'error',
    critical: 'critical',
  }
  return classMap[status] || 'normal'
}

const getUsageClass = (usage: string) => {
  const usageValue = parseInt(usage) || 0
  if (usageValue < 70) return 'low'
  if (usageValue < 90) return 'medium'
  return 'high'
}

const getConnectionClass = (connections: number) => {
  if (connections === 0) return 'disconnected'
  if (connections > 50) return 'warning'
  return 'normal'
}

const getLogClass = (level: string) => {
  const classMap: Record<string, string> = {
    info: 'info',
    warning: 'warning',
    error: 'error',
    critical: 'critical',
  }
  return classMap[level] || 'info'
}

const getLogIcon = (level: string) => {
  const iconMap: Record<string, string> = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    critical: '🔥',
  }
  return iconMap[level] || 'ℹ️'
}

const formatTime = (dateString: string | Date | null) => {
  if (!dateString) return '未知时间'

  try {
    const date = dateString instanceof Date ? dateString : new Date(dateString)

    if (isNaN(date.getTime())) {
      return '无效日期'
    }

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSeconds < 60) {
      return '刚刚'
    } else if (diffMinutes < 60) {
      return `${diffMinutes}分钟前`
    } else if (diffHours < 24) {
      return `${diffHours}小时前`
    } else if (diffDays < 7) {
      return `${diffDays}天前`
    } else {
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    }
  } catch (error) {
    console.error('格式化时间失败:', error)
    return '日期错误'
  }
}

// 导航功能
const navigateTo = (action: string) => {
  const routes: Record<string, string> = {
    users: '/admin/users',
    logs: '/admin/logs',
    notifications: '/notifications',
    backup: '/admin/backup',
    'system-settings': '/admin/system',
  }

  if (routes[action]) {
    router.push(routes[action])
  }
}

const viewUserDetail = (userId: string) => {
  router.push(`/admin/users/${userId}`)
}

const approveUser = async (userId: string) => {
  try {
    await ElMessageBox.confirm('确定要批准此用户吗？', '确认批准', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })

    const response = await request.post(`/api/admin/users/${userId}/approve`)
    if (response.success) {
      ElMessage.success('用户批准成功')
      refreshData()
    }
  } catch (error) {
    // 用户取消操作
  }
}

const rejectUser = async (userId: string) => {
  try {
    await ElMessageBox.confirm('确定要拒绝此用户吗？', '确认拒绝', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })

    const response = await request.post(`/api/admin/users/${userId}/reject`)
    if (response.success) {
      ElMessage.success('用户已拒绝')
      refreshData()
    }
  } catch (error) {
    // 用户取消操作
  }
}

const changePeriod = (period: string) => {
  selectedPeriod.value = period
  loadUserGrowthData(period)
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
    if (!notification.read) {
      await request.post(`/api/notifications/${notification.id}/read`)
      notification.read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }

    if (notification.link) {
      router.push(notification.link)
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

const clearSystemCache = async () => {
  try {
    await ElMessageBox.confirm('确定要清理系统缓存吗？这可能会暂时影响系统性能。', '确认清理缓存', {
      type: 'warning',
      confirmButtonText: '确定清理',
      cancelButtonText: '取消',
    })

    const response = await request.post('/api/admin/system/clear-cache')
    if (response.success) {
      ElMessage.success('系统缓存清理成功')
    }
  } catch (error) {
    // 用户取消操作
  }
}

const restartSystem = async () => {
  try {
    await ElMessageBox.confirm('确定要重启系统吗？重启期间用户将无法访问系统。', '确认重启系统', {
      type: 'warning',
      confirmButtonText: '确定重启',
      cancelButtonText: '取消',
    })

    const response = await request.post('/api/admin/system/restart')
    if (response.success) {
      ElMessage.success('系统重启指令已发送')
    }
  } catch (error) {
    // 用户取消操作
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
        name: user.name || user.username || '系统管理员',
        role: user.role || 'admin',
        email: user.email || '',
        department: user.department || '',
      }
      userName.value = userInfo.value.name
    }
  } catch (error) {
    console.warn('加载用户信息失败:', error)
    userName.value = localStorage.getItem('userName') || '系统管理员'
  }
}

// 加载仪表板数据
const loadDashboardData = async () => {
  loading.value = true

  try {
    console.log('正在获取系统管理仪表板数据...')

    // 并行加载所有数据
    await Promise.all([
      loadOverviewData(),
      loadPendingUsers(),
      loadUserGrowthData(selectedPeriod.value),
      loadRoleDistribution(),
      loadSystemLogs(),
      loadSystemStatus(),
      loadNotificationsData(),
    ])
  } catch (error) {
    console.error('加载仪表板数据失败:', error)

    if (error.response?.status === 401) {
      ElMessage.error('登录状态已过期，请重新登录')
      localStorage.clear()
      sessionStorage.clear()
      router.push('/login')
    } else if (error.response?.status === 403) {
      ElMessage.error('您没有管理员权限')
      router.push('/dashboard')
    } else {
      ElMessage.error('加载数据失败，将显示模拟数据')
      showMockData()
    }
  } finally {
    loading.value = false
  }
}

// 加载各项数据的具体方法
const loadOverviewData = async () => {
  try {
    const response = await request.get('/api/admin/dashboard/overview')
    if (response.success && response.data) {
      overview.value = response.data
    }
  } catch (error) {
    console.error('加载概览数据失败:', error)
  }
}

const loadPendingUsers = async () => {
  try {
    const response = await request.get('/api/admin/users/pending', {
      params: { limit: 5 },
    })
    if (response.success && response.data) {
      pendingUsers.value = response.data.map((user: any) => ({
        ...user,
        time: formatTime(user.created_at),
      }))
    }
  } catch (error) {
    console.error('加载待审批用户失败:', error)
  }
}

const loadUserGrowthData = async (period: string) => {
  try {
    const response = await request.get('/api/admin/statistics/user-growth', {
      params: { period },
    })
    if (response.success && response.data) {
      userGrowthData.value = response.data
    }
  } catch (error) {
    console.error('加载用户增长数据失败:', error)
  }
}

const loadRoleDistribution = async () => {
  try {
    const response = await request.get('/api/admin/statistics/role-distribution')
    if (response.success && response.data) {
      // 计算百分比和角度
      const total = response.data.reduce((sum: number, item: any) => sum + item.count, 0)
      let currentAngle = 0

      roleDistribution.value = response.data.map((item: any) => {
        const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0
        const angle = total > 0 ? (item.count / total) * 360 : 0

        const distribution = {
          ...item,
          percentage,
          startAngle: currentAngle,
          color: getRoleColor(item.role),
        }

        currentAngle += angle
        return distribution
      })
    }
  } catch (error) {
    console.error('加载角色分布数据失败:', error)
  }
}

const loadSystemLogs = async () => {
  try {
    const response = await request.get('/api/admin/logs/recent', {
      params: { limit: 5 },
    })
    if (response.success && response.data) {
      systemLogs.value = response.data.map((log: any) => ({
        ...log,
        time: formatTime(log.created_at),
      }))
    }
  } catch (error) {
    console.error('加载系统日志失败:', error)
  }
}

const loadSystemStatus = async () => {
  try {
    const response = await request.get('/api/admin/system/status')
    if (response.success && response.data) {
      systemStatus.value = response.data
    }
  } catch (error) {
    console.error('加载系统状态失败:', error)
  }
}

const loadNotificationsData = async () => {
  try {
    const response = await request.get('/api/notifications', {
      params: { limit: 10, orderBy: 'created_at', order: 'desc' },
    })
    if (response.success && response.data) {
      notifications.value = response.data.map((n: any) => ({
        ...n,
        icon: getNotificationIcon(n.type),
        time: formatTime(n.created_at),
      }))
      unreadCount.value = notifications.value.filter((n: any) => !n.read).length
    }
  } catch (error) {
    console.error('加载通知失败:', error)
  }
}

// 辅助函数
const getRoleColor = (role: string) => {
  const colorMap: Record<string, string> = {
    applicant: '#1890ff',
    reviewer: '#52c41a',
    assistant: '#fa8c16',
    admin: '#722ed1',
  }
  return colorMap[role] || '#cccccc'
}

const getNotificationIcon = (type: string) => {
  const iconMap: Record<string, string> = {
    system: '🔧',
    user: '👤',
    project: '📋',
    security: '🔒',
    warning: '⚠️',
    info: 'ℹ️',
    error: '❌',
  }
  return iconMap[type] || '📢'
}

// 显示模拟数据
const showMockData = () => {
  console.log('使用模拟数据')

  // 模拟数据
  overview.value = {
    totalUsers: 156,
    totalProjects: 87,
    todayLogins: 42,
    systemHealth: '正常',
    pendingUsers: 5,
    activeSessions: 23,
  }

  pendingUsers.value = [
    {
      id: 'user_001',
      name: '张三',
      email: 'zhangsan@example.com',
      role: 'applicant',
      department: '计算机学院',
      created_at: '2024-01-25T09:30:00',
      time: '2小时前',
    },
    {
      id: 'user_002',
      name: '李四',
      email: 'lisi@example.com',
      role: 'reviewer',
      department: '材料学院',
      created_at: '2024-01-24T14:20:00',
      time: '1天前',
    },
  ]

  userGrowthData.value = [
    { date: '1月15', count: 12, percentage: 60 },
    { date: '1月16', count: 18, percentage: 90 },
    { date: '1月17', count: 15, percentage: 75 },
    { date: '1月18', count: 20, percentage: 100 },
    { date: '1月19', count: 16, percentage: 80 },
    { date: '1月20', count: 14, percentage: 70 },
    { date: '1月21', count: 19, percentage: 95 },
  ]

  roleDistribution.value = [
    { role: 'applicant', count: 120, percentage: 77, startAngle: 0, color: '#1890ff' },
    { role: 'reviewer', count: 20, percentage: 13, startAngle: 277, color: '#52c41a' },
    { role: 'assistant', count: 10, percentage: 6, startAngle: 332, color: '#fa8c16' },
    { role: 'admin', count: 6, percentage: 4, startAngle: 356, color: '#722ed1' },
  ]

  systemLogs.value = [
    {
      id: 'log_001',
      level: 'info',
      message: '系统自动备份完成',
      user: '系统',
      created_at: '2024-01-25T10:30:00',
      time: '1小时前',
    },
    {
      id: 'log_002',
      level: 'warning',
      message: 'CPU使用率超过80%',
      user: '监控系统',
      created_at: '2024-01-25T09:15:00',
      time: '2小时前',
    },
    {
      id: 'log_003',
      level: 'info',
      message: '用户"王五"登录系统',
      user: '认证系统',
      created_at: '2024-01-25T08:45:00',
      time: '3小时前',
    },
  ]

  systemStatus.value = {
    cpuUsage: '65%',
    memoryUsage: '78%',
    diskUsage: '45%',
    dbConnections: 32,
    dbStatus: '正常',
    uptime: '15天 8小时',
  }

  notifications.value = [
    {
      id: 'notif_001',
      type: 'system',
      icon: '🔧',
      title: '系统维护通知',
      description: '本周六凌晨1-3点系统将进行维护升级',
      time: '今天 09:00',
      read: false,
    },
    {
      id: 'notif_002',
      type: 'security',
      icon: '🔒',
      title: '安全提醒',
      description: '检测到3个用户密码强度较弱，请提醒修改',
      time: '昨天 14:30',
      read: true,
    },
  ]

  unreadCount.value = notifications.value.filter((n) => !n.read).length
}

// 组件生命周期
onMounted(() => {
  console.log('=== 初始化系统管理仪表板页面 ===')

  // 先加载用户信息
  loadUserInfo().then(() => {
    // 检查角色是否匹配
    const userRole = localStorage.getItem('userRole')
    if (userRole?.toLowerCase() !== 'admin') {
      console.warn(`⚠️ 警告：当前用户角色 "${userRole}" 不匹配管理员角色`)
      ElMessage.warning(`检测到您不是管理员，将跳转到对应工作台`)

      setTimeout(() => {
        const rolePaths: Record<string, string> = {
          applicant: '/applicant/dashboard',
          reviewer: '/reviewer/dashboard',
          assistant: '/assistant/dashboard',
        }
        const targetPath = rolePaths[userRole?.toLowerCase() || ''] || '/login'
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

  // 点击外部关闭通知下拉
  document.addEventListener('click', (e) => {
    if (showNotificationsDropdown.value && !e.target.closest('.notifications-dropdown')) {
      showNotificationsDropdown.value = false
    }
  })
})
</script>

<style scoped>
.admin-dashboard {
  min-height: 100vh;
  background: #f5f7fa;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  display: flex;
  flex-direction: column;
}

/* 顶部导航栏 - 管理员主题色 */
.dashboard-header {
  background: linear-gradient(135deg, #722ed1 0%, #531dab 100%);
  padding: 0 24px;
  height: 70px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
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
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  color: white;
}

.mobile-menu-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.logo {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.breadcrumb {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.current-page {
  color: white;
  font-weight: 500;
}

/* 右侧用户区域 */
.header-right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

.user-menu {
  display: flex;
  align-items: center;
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
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  color: white;
  position: relative;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
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

.user-info-mini {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
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
}

.user-details {
  display: flex;
  flex-direction: column;
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
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-btn {
  padding: 8px 16px;
  background: rgba(255, 77, 79, 0.2);
  border: 1px solid rgba(255, 77, 79, 0.3);
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
  background: rgba(255, 77, 79, 0.3);
  color: white;
}

/* 通知下拉菜单 */
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

/* 主要内容布局 */
.dashboard-content {
  display: flex;
  flex: 1;
  min-height: calc(100vh - 70px);
}

/* 侧边栏 */
.sidebar {
  width: 250px;
  background: white;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  z-index: 1000;
  position: relative;
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
  color: #722ed1;
}

.nav-link.active {
  background: #f9f0ff;
  color: #722ed1;
  border-right: 3px solid #722ed1;
}

.nav-link.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #722ed1;
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

/* 主内容区域 */
.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background: #f8f9fa;
}

.main-content.sidebar-collapsed {
  margin-left: 60px;
}

/* 欢迎区域 - 管理员特有样式 */
.admin-banner {
  background: linear-gradient(135deg, #722ed1 0%, #531dab 100%);
  color: white;
}

.welcome-card.admin-banner .welcome-title,
.welcome-card.admin-banner .welcome-subtitle,
.welcome-card.admin-banner .stat-value,
.welcome-card.admin-banner .stat-label {
  color: white;
}

.welcome-card.admin-banner .stat-badge {
  background: rgba(255, 255, 255, 0.15);
}

.welcome-card.admin-banner .illustration-icon {
  color: rgba(255, 255, 255, 0.8);
}

.welcome-section {
  margin-bottom: 24px;
}

.welcome-card {
  background: rgb(105, 14, 133);
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
  color: #722ed1;
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

/* 加载状态 */
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
  border-top: 4px solid #722ed1;
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

/* 三列布局 */
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

/* 卡片通用样式 */
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

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.normal {
  background: #f6ffed;
  color: #52c41a;
}

.status-badge.warning {
  background: #fff7e6;
  color: #fa8c16;
}

.status-badge.error {
  background: #fff2f0;
  color: #ff4d4f;
}

/* 系统状态 */
.status-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-label {
  font-size: 13px;
  color: #7f8c8d;
}

.status-value {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.status-bar {
  height: 6px;
  background: #f5f5f5;
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.bar-fill.low {
  background: #52c41a;
}

.bar-fill.medium {
  background: #fa8c16;
}

.bar-fill.high {
  background: #ff4d4f;
}

.status-indicator {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-indicator.normal {
  background: #f6ffed;
  color: #52c41a;
}

.status-indicator.warning {
  background: #fff7e6;
  color: #fa8c16;
}

.status-indicator.disconnected {
  background: #fff2f0;
  color: #ff4d4f;
}

/* 时间筛选 */
.time-filter {
  display: flex;
  gap: 4px;
}

.period-btn {
  padding: 4px 8px;
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  transition: all 0.3s;
}

.period-btn:hover {
  background: #e8e8e8;
}

.period-btn.active {
  background: #722ed1;
  color: white;
  border-color: #722ed1;
}

/* 图表容器 */
.chart-container {
  margin-top: 16px;
}

.chart-placeholder {
  text-align: center;
  padding: 40px 20px;
  color: #8c8c8c;
}

.placeholder-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  height: 200px;
  padding: 20px 0;
}

.chart-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.bar-label {
  font-size: 11px;
  color: #7f8c8d;
  text-align: center;
}

.bar-container {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.bar {
  width: 100%;
  background: #722ed1;
  border-radius: 2px;
  transition: height 0.3s ease;
  min-height: 2px;
}

.bar-value {
  font-size: 11px;
  color: #7f8c8d;
}

/* 饼图 */
.distribution-chart {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 20px 0;
}

.chart-pie {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  position: relative;
  background: conic-gradient(
    var(--slice-color, #ccc) 0deg 90deg,
    #ccc 90deg 180deg,
    #ddd 180deg 270deg,
    #eee 270deg 360deg
  );
}

.pie-slice {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 50% 0%);
}

.slice-label {
  position: absolute;
  top: 50%;
  left: 70%;
  transform: translateY(-50%);
  font-size: 12px;
  font-weight: 500;
  color: #2c3e50;
}

.chart-legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-label {
  flex: 1;
  font-size: 13px;
  color: #2c3e50;
}

.legend-value {
  font-size: 12px;
  color: #7f8c8d;
  font-weight: 500;
}

/* 用户列表 */
.user-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-item {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.3s;
}

.user-item:hover {
  border-color: #d9d9d9;
  background: white;
}

.user-avatar-small {
  width: 40px;
  height: 40px;
  background: #722ed1;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 16px;
  margin-right: 12px;
  flex-shrink: 0;
}

.user-content {
  flex: 1;
  min-width: 0;
}

.user-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.user-name {
  font-weight: 500;
  color: #2c3e50;
  margin: 0;
  font-size: 14px;
  flex: 1;
  margin-right: 8px;
}

.user-role-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  background: #f9f0ff;
  color: #722ed1;
  font-weight: 500;
}

.user-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #7f8c8d;
  margin-bottom: 8px;
}

.user-time {
  font-size: 11px;
  color: #7f8c8d;
}

.user-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 4px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn.approve {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.action-btn.approve:hover {
  background: #d9f7be;
}

.action-btn.reject {
  background: #fff2f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
}

.action-btn.reject:hover {
  background: #ffccc7;
}

/* 系统日志 */
.logs-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.log-item {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  border-radius: 8px;
  transition: all 0.3s;
}

.log-item.info {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
}

.log-item.warning {
  background: #fff7e6;
  border: 1px solid #ffd591;
}

.log-item.error {
  background: #fff2f0;
  border: 1px solid #ffccc7;
}

.log-item.critical {
  background: #ffccc7;
  border: 1px solid #ffa39e;
}

.log-icon {
  font-size: 16px;
  margin-right: 12px;
  margin-top: 2px;
  flex-shrink: 0;
}

.log-content {
  flex: 1;
  min-width: 0;
}

.log-message {
  font-size: 13px;
  color: #2c3e50;
  margin-bottom: 4px;
  line-height: 1.4;
}

.log-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: #7f8c8d;
}

.log-user {
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
}

/* 系统通知 */
.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  background: white;
}

.notification-item:hover {
  border-color: #722ed1;
  background: #f9f0ff;
}

.notification-item.unread {
  background: #f9f0ff;
  border-color: #d3adf7;
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
  background: #722ed1;
  border-radius: 50%;
  margin-left: 8px;
  flex-shrink: 0;
  margin-top: 8px;
}

.section-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.view-all-btn {
  padding: 6px 12px;
  background: #722ed1;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.3s;
  white-space: nowrap;
}

.view-all-btn:hover {
  background: #531dab;
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

/* 快速操作 */
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
  border-color: #722ed1;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(114, 46, 209, 0.1);
}

.action-icon {
  font-size: 24px;
  width: 48px;
  height: 48px;
  background: #f9f0ff;
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

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #8c8c8c;
  font-size: 14px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px dashed #d9d9d9;
}

.empty-icon {
  font-size: 36px;
  margin-bottom: 12px;
  opacity: 0.5;
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

/* 响应式设计 */
@media (max-width: 1200px) {
  .dashboard-layout {
    grid-template-columns: repeat(2, 1fr);
  }

  .dashboard-column:last-child {
    grid-column: 1 / -1;
  }

  .distribution-chart {
    flex-direction: column;
    align-items: center;
  }
}

@media (max-width: 992px) {
  .sidebar {
    transform: translateX(-100%);
    box-shadow: none;
    position: fixed;
    height: 100vh;
    top: 0;
    left: 0;
  }

  .sidebar.show {
    transform: translateX(0);
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  }

  .main-content {
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

  .notifications-dropdown-content {
    width: 280px;
    right: -20px;
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
}

@media (max-width: 576px) {
  .actions-grid {
    grid-template-columns: 1fr;
  }

  .notifications-dropdown-content {
    width: calc(100vw - 32px);
    right: -16px;
  }
}

/* 打印样式 */
@media print {
  .sidebar,
  .dashboard-header,
  .section-header button,
  .user-actions {
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

  .dashboard-layout {
    display: block;
  }

  .dashboard-column {
    margin-bottom: 20px;
  }
}
</style>
