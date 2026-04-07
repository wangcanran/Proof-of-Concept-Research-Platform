// router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

// 在文件顶部添加一个辅助函数
const initializeAuthFromStorage = () => {
  const authStore = useAuthStore()

  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  const userStr = localStorage.getItem('user')

  if (token && userStr) {
    authStore.token = token
    authStore.user = JSON.parse(userStr)
    // ❗ 不要碰 computed
    return true
  }

  // 清状态
  authStore.token = ''
  authStore.user = null
  return false
}

// 根据用户角色获取对应仪表板路径（支持大小写）
const getDashboardPath = (userRole: string) => {
  // 统一转换为大写进行比较
  const role = (userRole || localStorage.getItem('userRole') || '').toUpperCase()

  switch (role) {
    case 'APPLICANT':
      return '/applicant/dashboard'
    case 'REVIEWER':
      return '/reviewer/dashboard'
    case 'ASSISTANT':
      return '/assistant/dashboard'
    case 'ADMIN':
      return '/admin/dashboard'
    default:
      return '/dashboard'
  }
}

// 检查角色权限的函数（支持大小写）
const checkRolePermission = (to: any, userRole: string): boolean => {
  if (to.meta?.role) {
    const requiredRoles = Array.isArray(to.meta.role)
      ? to.meta.role.map((r: string) => r.toUpperCase())
      : [to.meta.role.toUpperCase()]

    const userRoleUpper = (userRole || '').toUpperCase()
    return requiredRoles.includes(userRoleUpper)
  }
  return true
}

// 检查具体权限的函数
const checkPermission = (to: any, permissions: string[]): boolean => {
  if (to.meta?.permissions && to.meta.permissions.length > 0) {
    return to.meta.permissions.some((permission: string) => permissions.includes(permission))
  }
  return true
}

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginPage.vue'),
    meta: { title: '登录', guest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/RegisterPage.vue'),
    meta: { title: '注册', guest: true },
  },

  // ============ 通用仪表板（重定向到角色专属仪表板） ============
  {
    path: '/dashboard',
    name: 'DashboardRedirect',
    component: () => import('../views/DashboardRedirect.vue'),
    meta: { requiresAuth: true },
  },

  // ============ 申请人专属路由 ============
  {
    path: '/applicant/dashboard',
    name: 'ApplicantDashboard',
    component: () => import('../views/applicant/ApplicantDashboard.vue'),
    meta: {
      title: '项目申请人工作台',
      requiresAuth: true,
      role: 'APPLICANT',
      permissions: ['view_dashboard'],
    },
  },
  {
    path: '/projects',
    name: 'ProjectManagement',
    component: () => import('../views/applicant/ProjectManagement.vue'),
    meta: {
      requiresAuth: true,
      role: 'APPLICANT',
      permissions: ['view_projects', 'create_project'],
    },
  },
  {
    path: '/projects/my',
    name: 'MyProjects',
    redirect: '/projects',
  },
  {
    path: '/projects/create',
    name: 'CreateProject',
    component: () => import('../views/applicant/CreateProject.vue'),
    meta: {
      requiresAuth: true,
      role: 'APPLICANT',
      permissions: ['create_project'],
    },
  },
  {
    path: '/projects/edit/:id',
    name: 'EditProject',
    component: () => import('../views/applicant/CreateProject.vue'),
    props: true,
    meta: {
      requiresAuth: true,
      role: 'APPLICANT',
      permissions: ['edit_project'],
    },
  },
  {
    path: '/projects/detail/:id',
    name: 'ProjectDetail',
    component: () => import('../views/applicant/ProjectDetail.vue'),
    props: true,
    meta: {
      requiresAuth: true,
      permissions: ['view_project_detail'],
    },
  },
  {
    path: '/projects/progress/:id',
    name: 'ProjectProgress',
    component: () => import('../views/applicant/ProjectProgress.vue'),
    props: true,
    meta: {
      requiresAuth: true,
      role: 'APPLICANT',
      permissions: ['view_project_progress'],
    },
  },

  // ============ 成果管理模块 ============
  {
    path: '/achievements',
    name: 'AchievementManagement',
    component: () => import('../views/AchievementManagement/AchievementManagement.vue'),
    meta: {
      requiresAuth: true,
      role: 'APPLICANT',
      permissions: ['view_achievements'],
    },
  },
  {
    path: '/achievements/create',
    name: 'CreateAchievement',
    component: () => import('../views/AchievementManagement/CreateAchievement.vue'),
    meta: {
      requiresAuth: true,
      role: 'APPLICANT',
      permissions: ['create_achievement'],
    },
  },
  {
    path: '/achievements/:id/edit',
    name: 'EditAchievement',
    component: () => import('../views/AchievementManagement/CreateAchievement.vue'),
    props: true,
    meta: {
      requiresAuth: true,
      role: 'APPLICANT',
      permissions: ['edit_achievement'],
    },
  },
  {
    path: '/achievements/:id/detail',
    name: 'AchievementDetail',
    component: () => import('../views/AchievementManagement/AchievementDetail.vue'),
    props: true,
    meta: {
      requiresAuth: true,
      permissions: ['view_achievement_detail'],
    },
  },

  // ============ 成果转化模块 ============
  {
    path: '/achievements/:id/transfer',
    name: 'AchievementTransfer',
    component: () => import('../views/AchievementManagement/AchievementTransfer.vue'),
    meta: {
      requiresAuth: true,
      role: 'APPLICANT',
      permissions: ['create_transfer'],
    },
  },
  {
    path: '/transfers',
    name: 'TransferManagement',
    component: () => import('../views/AchievementManagement/AchievementTransfer.vue'),
    meta: {
      requiresAuth: true,
      role: 'APPLICANT',
      permissions: ['view_transfers'],
    },
  },

  // ============ 评审专家专属路由 ============

  {
    path: '/reviewer',
    redirect: '/reviewer/dashboard',
  },
  {
    path: '/reviewer/dashboard',
    name: 'ReviewerDashboard',
    component: () => import('@/views/reviewer/ReviewerDashboard.vue'),
    meta: {
      requiresAuth: true,
      role: 'REVIEWER',
      permissions: ['view_reviewer_dashboard'],
    },
  },
  {
    path: '/reviewer/viewreview',
    name: 'ReviewerReview',
    component: () => import('@/views/reviewer/ReviewerReview.vue'),
    meta: {
      requiresAuth: true,
      role: 'REVIEWER',
      permissions: ['view_review_tasks'],
    },
  },

  {
    path: '/reviewer/projects/review/:id?',
    name: 'ReviewProject',
    component: () => import('@/views/reviewer/ReviewProject.vue'),
    props: true,
    meta: {
      title: '项目评审',
      requiresAuth: true,
      role: 'REVIEWER',
      permissions: ['perform_review'],
    },
  },
  {
    path: '/reviewer/history',
    name: 'ReviewHistory',
    component: () => import('@/views/reviewer/ReviewHistory.vue'),
    meta: {
      requiresAuth: true,
      role: 'REVIEWER',
      permissions: ['view_review_history'],
    },
  },
  {
    path: '/reviewer/history/detail/:id',
    name: 'ReviewDetail',
    component: () => import('@/views/reviewer/ReviewDetail.vue'),
    props: true,
    meta: {
      requiresAuth: true,
      role: 'REVIEWER',
      permissions: ['view_review_detail'],
    },
  },

  // ============ 科研助理专属路由 ============
  {
    path: '/assistant/dashboard',
    name: 'AssistantDashboard',
    component: () => import('@/views/assistant/AssistantDashboard.vue'),
    meta: {
      title: '科研助理工作台',
      requiresAuth: true,
      role: 'project_manager', // 注意：这里应该小写，与数据库一致
      permissions: ['view_assistant_dashboard'],
    },
  },
  {
    path: '/assistant/applications',
    name: 'AssistantApplications',
    component: () => import('@/views/assistant/Applications.vue'),
    meta: {
      title: '项目申请管理',
      requiresAuth: true,
      role: 'project_manager',
      permissions: ['view_applications', 'review_applications'],
    },
  },
  {
    path: '/assistant/application/:id',
    name: 'AssistantApplicationDetail',
    component: () => import('@/views/assistant/ApplicationDetail.vue'),
    meta: {
      title: '申请详情',
      requiresAuth: true,
      role: 'project_manager',
      permissions: ['view_application_detail', 'review_applications'],
    },
  },
  {
    path: '/assistant/expenditures',
    name: 'AssistantExpenditures',
    component: () => import('@/views/assistant/Expenditures.vue'),
    meta: {
      title: '支出审核',
      requiresAuth: true,
      role: 'project_manager',
      permissions: ['view_expenditures', 'review_expenditures'],
    },
  },
  {
    path: '/assistant/achievements',
    name: 'AssistantAchievements',
    component: () => import('@/views/assistant/Achievements.vue'),
    meta: {
      title: '成果审核',
      requiresAuth: true,
      role: 'project_manager',
      permissions: ['view_achievements', 'review_achievements'],
    },
  },
  {
    path: '/assistant/users',
    name: 'AssistantUsers',
    component: () => import('@/views/assistant/Users.vue'),
    meta: {
      title: '用户管理',
      requiresAuth: true,
      role: 'project_manager',
      permissions: ['view_users', 'manage_users'],
    },
  },
  {
    path: '/assistant/activities',
    name: 'AssistantActivities',
    component: () => import('@/views/assistant/Activities.vue'),
    meta: {
      title: '活动日志',
      requiresAuth: true,
      role: 'project_manager',
      permissions: ['view_activities'],
    },
  },
  {
    path: '/audit/tasks',
    name: 'AuditTasks',
    component: () => import('../views/assistant/AuditTask.vue'),
    meta: {
      requiresAuth: true,
      role: 'ASSISTANT',
      permissions: ['view_audit_tasks'],
    },
  },
  {
    path: '/audit/projects',
    name: 'AuditProjects',
    component: () => import('../views/assistant/AuditProjects.vue'),
    meta: {
      requiresAuth: true,
      role: 'ASSISTANT',
      permissions: ['audit_projects'],
    },
  },
  {
    path: '/audit/funding',
    name: 'AuditFunding',
    component: () => import('../views/assistant/AuditFunding.vue'),
    meta: {
      requiresAuth: true,
      role: 'ASSISTANT',
      permissions: ['audit_funding'],
    },
  },
  {
    path: '/audit/achievements',
    name: 'AuditAchievements',
    component: () => import('../views/assistant/Achievements.vue'),
    meta: {
      requiresAuth: true,
      role: 'ASSISTANT',
      permissions: ['audit_achievements'],
    },
  },
  {
    path: '/audit/expenditures',
    name: 'AuditExpenditures',
    component: () => import('../views/assistant/AuditExpenditures.vue'),
    meta: {
      requiresAuth: true,
      role: 'ASSISTANT',
      permissions: ['audit_expenditures'],
    },
  },

  // 在 index.ts 中添加或确认这些路由

  // ============ 管理员专属路由 ============
  {
    path: '/admin/dashboard',
    name: 'AdminDashboard',
    component: () => import('@/views/admin/AdminDashboard.vue'),
    meta: {
      title: '系统管理员工作台',
      requiresAuth: true,
      role: 'admin', // 注意：这里应该小写，与数据库一致
      permissions: ['view_admin_dashboard'],
    },
  },
  {
    path: '/admin/users',
    name: 'UserManagement',
    component: () => import('@/views/admin/UserManagement.vue'),
    meta: {
      title: '用户管理',
      requiresAuth: true,
      role: 'admin',
      permissions: ['manage_users'],
    },
  },
  {
    path: '/admin/users/create',
    name: 'CreateUser',
    component: () => import('@/views/admin/UserManagement.vue'),
    meta: {
      title: '创建用户',
      requiresAuth: true,
      role: 'admin',
      permissions: ['create_user'],
    },
  },
  {
    path: '/admin/users/:id',
    name: 'UserDetail',
    component: () => import('@/views/admin/UserDetail.vue'),
    meta: {
      title: '用户详情',
      requiresAuth: true,
      role: 'admin',
      permissions: ['view_user_detail'],
    },
  },
  {
    path: '/admin/users/:id/edit',
    name: 'EditUser',
    component: () => import('@/views/admin/UserManagement.vue'),
    meta: {
      title: '编辑用户',
      requiresAuth: true,
      role: 'admin',
      permissions: ['edit_user'],
    },
  },
  // 添加新的管理员页面路由
  {
    path: '/admin/roles',
    name: 'RoleManagement',
    component: () => import('@/views/admin/RoleManagement.vue'),
    meta: {
      title: '角色权限管理',
      requiresAuth: true,
      role: 'admin',
      permissions: ['manage_roles'],
    },
  },
  {
    path: '/admin/departments',
    name: 'DepartmentManagement',
    component: () => import('@/views/admin/DepartmentManagement.vue'),
    meta: {
      title: '部门管理',
      requiresAuth: true,
      role: 'admin',
      permissions: ['manage_departments'],
    },
  },
  {
    path: '/admin/system',
    name: 'SystemSettings',
    component: () => import('@/views/admin/SystemSettings.vue'),
    meta: {
      title: '系统设置',
      requiresAuth: true,
      role: 'admin',
      permissions: ['manage_system'],
    },
  },
  {
    path: '/admin/backup',
    name: 'BackupManagement',
    component: () => import('@/views/admin/BackupManagement.vue'),
    meta: {
      title: '数据备份',
      requiresAuth: true,
      role: 'admin',
      permissions: ['manage_backup'],
    },
  },
  {
    path: '/admin/logs',
    name: 'SystemLogs',
    component: () => import('@/views/admin/SystemLogs.vue'),
    meta: {
      title: '系统日志',
      requiresAuth: true,
      role: 'admin',
      permissions: ['view_system_logs'],
    },
  },
  {
    path: '/admin/statistics',
    name: 'SystemStatistics',
    component: () => import('@/views/admin/SystemStatistics.vue'),
    meta: {
      title: '统计分析',
      requiresAuth: true,
      role: 'admin',
      permissions: ['view_statistics'],
    },
  },
  {
    path: '/admin/reports',
    name: 'ReportManagement',
    component: () => import('@/views/admin/ReportManagement.vue'),
    meta: {
      title: '报表管理',
      requiresAuth: true,
      role: 'admin',
      permissions: ['manage_reports'],
    },
  },
  {
    path: '/admin/monitor',
    name: 'SystemMonitor',
    component: () => import('@/views/admin/SystemMonitor.vue'),
    meta: {
      title: '系统监控',
      requiresAuth: true,
      role: 'admin',
      permissions: ['view_system_monitor'],
    },
  },
  {
    path: '/admin/performance',
    name: 'PerformanceAnalysis',
    component: () => import('@/views/admin/PerformanceAnalysis.vue'),
    meta: {
      title: '性能分析',
      requiresAuth: true,
      role: 'admin',
      permissions: ['view_performance'],
    },
  },

  // ============ 经费管理模块 ============
  {
    path: '/funds',
    name: 'FundManagement',
    component: () => import('../views/funds/FundManagement.vue'),
    meta: {
      requiresAuth: true,
      role: 'APPLICANT',
      permissions: ['manage_funds'],
    },
    children: [
      {
        path: '',
        name: 'FundManagementDefault',
        redirect: '/funds/dashboard',
      },
      {
        path: 'dashboard',
        name: 'FundDashboard',
        component: () => import('../views/funds/FundDashboard.vue'),
        meta: { permissions: ['view_fund_dashboard'] },
      },
      {
        path: 'overview',
        name: 'FundOverview',
        component: () => import('../views/funds/FundOverview.vue'),
        meta: { permissions: ['view_fund_overview'] },
      },
      {
        path: 'budget',
        name: 'BudgetManagement',
        component: () => import('../views/funds/BudgetManagement.vue'),
        meta: { permissions: ['manage_budget'] },
      },
      {
        path: 'applications',
        name: 'FundingApplications',
        component: () => import('../views/funds/FundingApplications.vue'),
        meta: { permissions: ['manage_funding_applications'] },
      },
      {
        path: 'applications/create',
        name: 'CreateFundingApplication',
        component: () => import('../views/funds/ExpenditureApply.vue'),
        meta: { permissions: ['create_funding_application'] },
      },
      {
        path: 'expenditures',
        name: 'ExpenditureManagement',
        component: () => import('../views/funds/ExpenditureManagement.vue'),
        meta: { permissions: ['manage_expenditures'] },
      },
      {
        path: 'expenditures/apply',
        name: 'ExpenditureApply',
        component: () => import('../views/funds/ExpenditureApply.vue'),
        meta: { permissions: ['create_expenditure'] },
      },
      {
        path: 'reimbursements',
        name: 'ReimbursementManagement',
        component: () => import('../views/funds/ReimbursementApply.vue'),
        meta: { permissions: ['manage_reimbursements'] },
      },
    ],
  },
  {
    path: '/receipts',
    name: 'ReceiptManagement',
    component: () => import('../views/applicant/ReceiptManagement.vue'),
    meta: {
      requiresAuth: true,
      role: 'APPLICANT',
      permissions: ['manage_receipts'],
    },
  },

  // ============ 项目阶段管理 ============
  {
    path: '/projects/stages/:id',
    name: 'ProjectStages',
    component: () => import('../views/applicant/ProjectStages.vue'),
    meta: {
      requiresAuth: true,
      role: 'APPLICANT',
      permissions: ['manage_project_stages'],
    },
  },

  // ============ 通知中心 ============
  {
    path: '/notifications',
    name: 'Notifications',
    component: () => import('@/views/Notifications/NotificationCenter.vue'),
    meta: {
      requiresAuth: true,
    },
  },

  // ============ 公共模块 ============
  {
    path: '/help',
    name: 'HelpCenter',
    component: () => import('../views/HelpCenter/HelpCenter.vue'),
    meta: {
      title: '帮助中心',
    },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/user/UserCenter.vue'),
    meta: {
      title: '个人中心',
      requiresAuth: true,
      permissions: ['view_profile'],
    },
  },
  {
    path: '/reports',
    name: 'ReportStatistics',
    component: () => import('../views/ReportStatistics/ReportStatistics.vue'),
    meta: {
      requiresAuth: true,
      title: '报表统计',
      permissions: ['view_reports'],
    },
  },

  // ============ 测试页面 ============
  {
    path: '/test-db',
    name: 'TestDatabase',
    component: () => import('@/views/TestDatabase.vue'),
    meta: { title: '数据库测试' },
  },

  // ============ 404页面 ============
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFound.vue'),
    meta: { title: '页面不存在' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// 全局路由守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  if (!authStore.isAuthenticated) {
    initializeAuthFromStorage()
  }

  console.log('=== 路由守卫开始 ===')
  console.log(`从: ${from.path} -> 到: ${to.path}`)
  console.log(`认证状态: ${authStore.isAuthenticated}`)
  console.log(`用户角色: ${authStore.userRole}`)
  console.log(`localStorage userRole: ${localStorage.getItem('userRole')}`)
  console.log(`localStorage token: ${localStorage.getItem('token') ? '存在' : '不存在'}`)

  // 1. 设置页面标题
  if (to.meta?.title) {
    document.title = `${to.meta.title} - 科研项目管理系统`
  }

  // 2. 检查是否需要认证
  if (to.meta?.requiresAuth) {
    console.log(`页面需要认证: ${to.path}`)

    // 检查是否有token（更可靠的方式）
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    const userRole = localStorage.getItem('userRole')

    if (!token) {
      console.log('❌ 没有token，跳转到登录页')
      ElMessage.warning('请先登录')
      next('/login')
      return
    }

    // 如果有token但authStore未初始化，手动初始化
    if (!authStore.isAuthenticated && token) {
      console.log('🔄 检测到token但authStore未初始化，尝试初始化...')
      try {
        // 从localStorage恢复用户信息
        const userStr = localStorage.getItem('user') || sessionStorage.getItem('user')
        if (userStr) {
          const user = JSON.parse(userStr)
          authStore.user = user
          authStore.token = token
          authStore.isAuthenticated = true
          console.log('✅ 从localStorage恢复用户信息成功:', user.username)
        }
      } catch (error) {
        console.error('恢复用户信息失败:', error)
      }
    }
  }

  // 3. 如果已登录，访问登录/注册页则重定向到仪表板
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (token && (to.path === '/login' || to.path === '/register')) {
    const userRole = localStorage.getItem('userRole') || authStore.userRole
    const dashboardPath = getDashboardPath(userRole)
    console.log(`已登录，重定向登录页到: ${dashboardPath}`)
    next(dashboardPath)
    return
  }

  // 4. 检查角色权限
  if (to.meta?.role) {
    const userRole = localStorage.getItem('userRole') || authStore.userRole || ''
    const hasRole = checkRolePermission(to, userRole)

    console.log(
      `检查角色权限: 需要 ${to.meta.role}, 用户有 ${userRole}, 结果: ${hasRole ? '通过' : '拒绝'}`,
    )

    if (!hasRole) {
      ElMessage.warning('您没有权限访问此页面')
      const dashboardPath = getDashboardPath(userRole)
      console.log(`权限不足，重定向到: ${dashboardPath}`)
      next(dashboardPath)
      return
    }
  }

  // 5. 特殊处理：如果访问通用仪表板，重定向到角色专属仪表板
  if (to.path === '/dashboard') {
    const userRole = localStorage.getItem('userRole') || authStore.userRole || ''
    const dashboardPath = getDashboardPath(userRole)

    if (dashboardPath !== '/dashboard') {
      console.log(`通用仪表板重定向到: ${dashboardPath}`)
      next(dashboardPath)
      return
    }
  }

  console.log('✅ 路由守卫通过，跳转到:', to.path)
  next()
})

export default router
