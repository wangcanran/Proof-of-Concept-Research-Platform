<template>
  <div class="dashboard-container">
    <!-- 顶部导航栏 -->
    <header class="dashboard-header">
      <div class="header-left">
        <h1 class="logo">科研项目管理系统</h1>
        <div class="breadcrumb">
          <span class="current-page">工作台</span>
        </div>
      </div>
      <div class="header-right">
        <div class="user-menu">
          <div class="user-avatar">{{ userInitial }}</div>
          <div class="user-info">
            <span class="user-name">{{ userName }}</span>
            <span class="user-role">{{ userRoleName }}</span>
          </div>
          <div class="header-actions">
            <button class="icon-btn" @click="refreshData" title="刷新">
              <span class="icon">🔄</span>
            </button>
            <button class="icon-btn" @click="toggleTheme" title="切换主题">
              <span class="icon">{{ isDarkMode ? '☀️' : '🌙' }}</span>
            </button>
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

      <!-- 快速操作 -->
      <div class="quick-actions-section">
        <h3 class="section-title">快速操作</h3>
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

      <!-- 项目概览 -->
      <div class="projects-overview">
        <div class="section-header">
          <h3 class="section-title">项目概览</h3>
          <button class="view-all-btn" @click="navigateTo('all-projects')">查看全部 →</button>
        </div>

        <div class="projects-grid">
          <!-- 项目卡片 -->
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
            <button class="create-btn" @click="navigateTo('create-project')">创建第一个项目</button>
          </div>
        </div>
      </div>

      <!-- 待办事项 -->
      <div class="todo-section">
        <div class="section-header">
          <h3 class="section-title">待办事项</h3>
          <button class="view-all-btn" @click="navigateTo('all-tasks')">查看全部 →</button>
        </div>

        <div class="todo-list">
          <div
            v-for="task in pendingTasks"
            :key="task.id"
            class="todo-item"
            :class="{ urgent: task.priority === 'high' }"
          >
            <div class="todo-checkbox">
              <input type="checkbox" :id="'task-' + task.id" @change="completeTask(task.id)" />
              <label :for="'task-' + task.id"></label>
            </div>
            <div class="todo-content">
              <h4 class="todo-title">{{ task.title }}</h4>
              <div class="todo-meta">
                <span class="todo-type">{{ task.type }}</span>
                <span class="todo-deadline">⏰ {{ task.deadline }}</span>
              </div>
            </div>
            <div class="todo-actions">
              <button class="todo-btn" @click="handleTask(task)">处理</button>
            </div>
          </div>

          <div class="empty-state" v-if="pendingTasks.length === 0 && !loading">
            <div class="empty-icon">✅</div>
            <p>暂无待办事项</p>
          </div>
        </div>
      </div>

      <!-- 数据统计 -->
      <div class="stats-section">
        <h3 class="section-title">数据统计</h3>
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

      <!-- 通知中心 -->
      <div class="notifications-section">
        <div class="section-header">
          <h3 class="section-title">最新通知</h3>
          <button class="mark-all-btn" @click="markAllAsRead" v-if="unreadCount > 0">
            标记全部已读
          </button>
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

          <div class="empty-state" v-if="notifications.length === 0 && !loading">
            <div class="empty-icon">📭</div>
            <p>暂无通知</p>
          </div>
        </div>
      </div>

      <!-- 系统状态 -->
      <div class="system-status">
        <div class="status-card">
          <div class="status-header">
            <h4>系统状态</h4>
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
        </div>
      </div>
    </main>

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
import { useRouter } from 'vue-router'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'
const router = useRouter()

// 响应式数据
const loading = ref(false)
const isDarkMode = ref(false)
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

// 方法
const navigateTo = (action) => {
  const routes = {
    'create-project': '/projects/create',
    'my-projects': '/projects',
    'all-projects': '/projects',
    'submit-achievement': '/achievements/create',
    'funding-application': '/funds',
    'all-tasks': '/tasks',
  }

  if (routes[action]) {
    router.push(routes[action])
  }
}

const viewProject = (projectId) => {
  router.push(`/applicant/projects/${projectId}`)
}

const editProject = (projectId) => {
  router.push(`/applicant/projects/${projectId}/edit`)
}

const completeTask = async (taskId) => {
  try {
    const task = pendingTasks.value.find((t) => t.id === taskId)
    if (!task) return

    // 在实际应用中，这里应该调用API完成任务
    console.log('完成任务:', task.title)

    // 从列表中移除
    pendingTasks.value = pendingTasks.value.filter((t) => t.id !== taskId)

    // 更新统计数据
    if (stats.value.pendingReviews > 0) {
      stats.value.pendingReviews--
    }
  } catch (error) {
    console.error('完成任务失败:', error)
  }
}

const handleTask = (task) => {
  // 根据任务类型跳转到对应页面
  if (task.actionUrl) {
    router.push(task.actionUrl)
  } else {
    alert(`处理任务: ${task.title}`)
  }
}

const openNotification = async (notification) => {
  try {
    if (!notification.read) {
      // 标记为已读
      notification.read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }

    // 跳转到相关页面
    if (notification.link) {
      router.push(notification.link)
    }
  } catch (error) {
    console.error('打开通知失败:', error)
  }
}

const markAllAsRead = () => {
  notifications.value.forEach((notification) => {
    notification.read = true
  })
  unreadCount.value = 0
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

// 新增：专门加载项目数据的方法
const loadProjectData = async () => {
  try {
    console.log('正在加载项目数据...当前用户ID:', userId.value)

    // 尝试多个可能的项目API端点
    const projectEndpoints = ['/api/projects']

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

      // 处理不同类型的项目数据结构
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
        // 处理项目数据
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
        // 如果没有数据，尝试使用备用数据
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

// 新增：从项目数据更新统计信息
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

// 新增：加载备用项目数据
const loadFallbackProjectData = () => {
  console.log('加载备用项目数据')

  // 尝试从localStorage获取
  try {
    const savedProjects = localStorage.getItem('user_projects')
    if (savedProjects) {
      const parsedProjects = JSON.parse(savedProjects)
      if (Array.isArray(parsedProjects) && parsedProjects.length > 0) {
        console.log('从localStorage加载项目数据:', parsedProjects)
        recentProjects.value = parsedProjects.map((p) => ({
          id: p.id || '',
          code: p.code || `PROJ-${(p.id || '').substring(0, 8)}`,
          title: p.title || '未命名项目',
          status: p.status || 'draft',
          progress: p.progress || 0,
          deadline: p.deadline || '未设置',
          manager: p.manager || userName.value,
        }))
        return
      }
    }
  } catch (e) {
    console.log('从localStorage加载失败:', e)
  }

  // 如果没有数据，使用模拟数据
  showMockProjectData()
}

// 新增：显示模拟项目数据
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

// 新增：加载仪表板统计
const loadDashboardStats = async () => {
  try {
    const response = await request.get('/api/dashboard/applicant')
    if (response && (response.success || response.data)) {
      const data = response.data?.data || response.data || response
      console.log('仪表板统计API返回数据:', data)

      if (data.stats || data.summary) {
        const statsData = data.stats || data.summary
        // 只更新不在项目数据中的统计字段
        stats.value.pendingReviews =
          statsData.pending_reviews ||
          statsData.pendingReviews ||
          statsData.pending_tasks ||
          statsData.pendingTasks ||
          0

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
    // 统计失败不影响项目数据显示
  }
}

// 新增：加载其他数据
const loadOtherData = async () => {
  try {
    // 并行加载任务和通知
    const [tasksRes, notificationsRes] = await Promise.allSettled([
      request.get('/api/tasks/pending'),
      request.get('/api/notifications'),
    ])

    // 处理任务数据
    if (tasksRes.status === 'fulfilled' && tasksRes.value) {
      const tasksData = tasksRes.value.data?.data || tasksRes.value.data || tasksRes.value
      if (Array.isArray(tasksData)) {
        pendingTasks.value = tasksData.map((task) => ({
          id: task.id || task.task_id,
          title: task.title || task.task_title || '任务',
          type: task.type || task.task_type || '任务',
          deadline: formatDate(task.deadline || task.due_date),
          priority: task.priority || 'medium',
          actionUrl: task.action_url || task.url || '',
        }))
      }
    }

    // 处理通知数据
    if (notificationsRes.status === 'fulfilled' && notificationsRes.value) {
      const notificationsData =
        notificationsRes.value.data?.data || notificationsRes.value.data || notificationsRes.value
      if (Array.isArray(notificationsData)) {
        notifications.value = notificationsData.map((n) => ({
          id: n.id || n.notification_id,
          title: n.title || n.subject || '通知',
          description: n.description || n.content || '',
          icon: getNotificationIcon(n.type),
          time: formatTime(n.created_at || n.time),
          read: n.read || false,
          link: n.link || n.url || '',
        }))
        unreadCount.value = notifications.value.filter((n) => !n.read).length
      }
    }
  } catch (error) {
    console.error('加载其他数据失败:', error)
  }
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

// 修改：显示模拟数据
const showMockData = () => {
  console.log('使用完整的模拟数据')

  // 确保项目数据显示
  showMockProjectData()

  // 其他模拟数据
  stats.value.pendingReviews = 2
  stats.value.submissionTrend = 10
  stats.value.approvalTrend = 5
  stats.value.reviewTrend = 0
  stats.value.fundTrend = 8

  pendingTasks.value = [
    {
      id: 1,
      title: '完成项目进度报告',
      type: '项目报告',
      deadline: '2024-06-30',
      priority: 'high',
      actionUrl: '/applicant/projects/1/report',
    },
    {
      id: 2,
      title: '提交经费使用明细',
      type: '经费管理',
      deadline: '2024-06-25',
      priority: 'medium',
      actionUrl: '/applicant/funding/report',
    },
  ]

  notifications.value = [
    {
      id: 1,
      title: '项目评审通知',
      description: '您的项目已进入专家评审阶段',
      icon: '📋',
      time: '2小时前',
      read: false,
      link: '/applicant/projects/2',
    },
    {
      id: 2,
      title: '系统更新提醒',
      description: '系统将于本周日进行维护升级',
      icon: '🔧',
      time: '1天前',
      read: true,
    },
  ]

  unreadCount.value = 1
  backendConnected.value = true
  databaseConnected.value = true
  lastUpdateTime.value = new Date().toLocaleTimeString('zh-CN')
}

// 修改：优化数据加载方法
const loadDashboardData = async () => {
  loading.value = true

  try {
    console.log('正在获取申请人仪表板数据...')
    console.log('当前用户ID:', userId.value, '角色:', userRole.value)

    // 测试后端连接
    await testBackendConnection()

    // 并行加载项目数据和其他数据
    await Promise.all([
      loadProjectData(), // 首先加载项目数据
      loadDashboardStats(),
      loadOtherData(),
    ])

    databaseConnected.value = true
    lastUpdateTime.value = new Date().toLocaleTimeString('zh-CN')
  } catch (error) {
    console.error('加载仪表板数据失败:', error)

    if (error.response?.status === 401) {
      ElMessage.error('登录状态已过期，请重新登录')
      localStorage.clear()
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
  console.log('初始化申请人工作台页面')

  // 先加载用户信息
  loadUserInfo().then(() => {
    console.log('用户信息:', {
      name: userName.value,
      role: userRole.value,
      id: userId.value,
    })

    // 然后加载仪表板数据
    loadDashboardData()
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
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 顶部导航栏 */
.dashboard-header {
  background: white;
  padding: 0 32px;
  height: 70px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
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

.user-avatar {
  width: 42px;
  height: 42px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 18px;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 600;
  color: #2c3e50;
  font-size: 15px;
}

.user-role {
  font-size: 12px;
  color: #7f8c8d;
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
}

.icon-btn:hover {
  background: #e8e8e8;
  transform: translateY(-2px);
}

.icon {
  font-size: 18px;
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
  padding: 32px;
  max-width: 1400px;
  margin: 0 auto;
}

/* 欢迎区域 */
.welcome-section {
  margin-bottom: 32px;
}

.welcome-card {
  background: white;
  border-radius: 16px;
  padding: 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.welcome-content {
  flex: 1;
}

.welcome-title {
  font-size: 32px;
  color: #2c3e50;
  margin: 0 0 12px 0;
}

.welcome-subtitle {
  color: #7f8c8d;
  font-size: 16px;
  margin: 0 0 32px 0;
}

.quick-stats {
  display: flex;
  gap: 24px;
}

.stat-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 24px;
  background: #f8f9fa;
  border-radius: 12px;
  min-width: 100px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1890ff;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.welcome-illustration {
  margin-left: 40px;
}

.illustration-icon {
  font-size: 80px;
  opacity: 0.8;
}

/* 快速操作 */
.quick-actions-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 20px;
  color: #2c3e50;
  margin: 0 0 20px 0;
  font-weight: 600;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.action-card {
  background: white;
  border: none;
  border-radius: 12px;
  padding: 24px;
  text-align: left;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.action-icon {
  font-size: 32px;
  width: 64px;
  height: 64px;
  background: #f5f7fa;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-content h4 {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 18px;
}

.action-content p {
  margin: 0;
  color: #7f8c8d;
  font-size: 14px;
}

/* 项目概览 */
.projects-overview {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.view-all-btn {
  padding: 8px 16px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.3s;
}

.view-all-btn:hover {
  background: #40a9ff;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.project-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.project-status {
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 20px;
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
  font-size: 12px;
  color: #666;
  font-family: monospace;
}

.project-title {
  font-size: 18px;
  color: #2c3e50;
  margin: 0 0 16px 0;
  line-height: 1.4;
}

.project-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #f5f5f5;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
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
  font-size: 14px;
  color: #666;
  font-weight: 500;
  min-width: 40px;
}

.project-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  font-size: 13px;
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
  padding: 8px 16px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
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
  margin-bottom: 32px;
}

.todo-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.todo-item {
  display: flex;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.3s;
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-item:hover {
  background: #fafafa;
}

.todo-item.urgent {
  border-left: 4px solid #ff4d4f;
}

.todo-checkbox {
  margin-right: 16px;
}

.todo-checkbox input[type='checkbox'] {
  display: none;
}

.todo-checkbox label {
  width: 20px;
  height: 20px;
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
}

.todo-content {
  flex: 1;
}

.todo-title {
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 4px;
}

.todo-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #7f8c8d;
}

.todo-actions {
  margin-left: auto;
}

.todo-btn {
  padding: 6px 16px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

.todo-btn:hover {
  background: #40a9ff;
}

/* 数据统计 */
.stats-section {
  margin-bottom: 32px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-trend {
  font-size: 14px;
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
  font-size: 32px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #7f8c8d;
}

/* 通知中心 */
.notifications-section {
  margin-bottom: 32px;
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

.notifications-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.notification-item {
  display: flex;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-item:hover {
  background: #fafafa;
}

.notification-item.unread {
  background: #f6ffed;
}

.notification-icon {
  font-size: 24px;
  margin-right: 16px;
  min-width: 24px;
}

.notification-content {
  flex: 1;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.notification-title {
  font-weight: 500;
  color: #2c3e50;
  margin: 0;
  font-size: 15px;
}

.notification-time {
  font-size: 12px;
  color: #7f8c8d;
}

.notification-desc {
  color: #666;
  font-size: 14px;
  margin: 0;
  line-height: 1.5;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background: #52c41a;
  border-radius: 50%;
  margin-left: 12px;
}

/* 系统状态 */
.system-status {
  margin-bottom: 32px;
}

.status-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
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
  font-size: 18px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
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
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-label {
  color: #666;
  font-size: 14px;
}

.status-value {
  font-size: 14px;
  font-weight: 500;
}

.status-value.success {
  color: #52c41a;
}

.status-value.error {
  color: #ff4d4f;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #7f8c8d;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  grid-column: 1 / -1;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0 0 20px 0;
  font-size: 16px;
}

.create-btn {
  padding: 10px 24px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.3s;
}

.create-btn:hover {
  background: #40a9ff;
}

/* 加载状态 */
.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: #7f8c8d;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  grid-column: 1 / -1;
}

.loading-spinner-small {
  width: 40px;
  height: 40px;
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
  font-size: 14px;
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
  .main-content {
    padding: 24px;
  }

  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .dashboard-header {
    padding: 0 16px;
    flex-direction: column;
    height: auto;
    padding: 16px;
  }

  .header-left {
    margin-bottom: 16px;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .user-menu {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    margin-left: 0;
    width: 100%;
    justify-content: center;
  }

  .main-content {
    padding: 16px;
  }

  .welcome-card {
    flex-direction: column;
    text-align: center;
    padding: 32px 20px;
  }

  .welcome-illustration {
    margin: 32px 0 0 0;
  }

  .actions-grid,
  .projects-grid,
  .stats-cards {
    grid-template-columns: 1fr;
  }

  .quick-stats {
    flex-direction: column;
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .dashboard-header {
    padding: 12px;
  }

  .main-content {
    padding: 12px;
  }

  .welcome-card {
    padding: 24px 16px;
  }

  .action-card,
  .project-card,
  .stat-card,
  .status-card {
    padding: 20px;
  }

  .todo-item,
  .notification-item {
    padding: 16px;
  }
}
</style>
