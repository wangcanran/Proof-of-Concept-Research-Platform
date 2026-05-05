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
    case 'PROJECT_MANAGER':
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

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomePage.vue'),
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
  // 公共新闻列表与详情
  {
    path: '/news-list',
    name: 'NewsList',
    component: () => import('@/views/NewsList.vue'),
    meta: { title: '新闻公告' },
  },
  {
    path: '/news/:id',
    name: 'PublicNewsDetail',
    component: () => import('@/views/assistant/NewsDetail.vue'),
    props: true,
    meta: { title: '新闻详情' },
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
    },
  },
  {
    path: '/projects/detail/:id',
    name: 'ProjectDetail',
    component: () => import('../views/applicant/ProjectDetail.vue'),
    props: true,
    meta: {
      requiresAuth: true,
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

  // ============ 孵化服务模块（申请人） ============
  {
    path: '/incubation/service-request',
    name: 'ServiceRequest',
    component: () => import('../views/incubation/ServiceRequest.vue'),
    meta: {
      title: '服务申请',
      requiresAuth: true,
      role: 'APPLICANT',
    },
  },
  {
    path: '/incubation/result-feedback',
    name: 'ResultFeedback',
    component: () => import('../views/incubation/ResultFeedback.vue'),
    meta: {
      title: '成果反馈',
      requiresAuth: true,
      role: 'APPLICANT',
    },
  },
  // 服务申请详情（申请人和项目经理都可访问）
  {
    path: '/incubation/request/:id',
    name: 'IncubationRequestDetail',
    component: () => import('../views/incubation/IncubationRequestDetail.vue'),
    meta: {
      title: '服务申请详情',
      requiresAuth: true,
      role: ['APPLICANT', 'PROJECT_MANAGER'],
    },
  },
  // 服务申请反馈（项目经理）
  {
    path: '/incubation/feedback',
    name: 'ServiceFeedback',
    component: () => import('../views/incubation/ServiceFeedback.vue'),
    meta: {
      title: '服务申请反馈',
      requiresAuth: true,
      role: 'PROJECT_MANAGER',
    },
  },

  // ============ 评审专家路由 ============
  // 评审专家路由
  {
    path: '/reviewer',
    name: 'ReviewerLayout',
    redirect: '/reviewer/dashboard',
    meta: { requiresAuth: true, role: 'REVIEWER' },
    children: [
      {
        path: 'dashboard',
        name: 'ReviewerDashboard',
        component: () => import('@/views/reviewer/ReviewerDashboard.vue'),
        meta: {
          title: '评审专家工作台',
          permissions: ['view_reviewer_dashboard'],
        },
      },
      {
        path: 'pending-projects',
        name: 'ReviewerPendingProjects',
        component: () => import('@/views/reviewer/PendingProjects.vue'),
        meta: {
          title: '待评审项目',
          permissions: ['view_pending_projects'],
        },
      },
      {
        path: 'review',
        name: 'ReviewerReview',
        component: () => import('@/views/reviewer/ReviewProject.vue'),
        meta: {
          title: '项目评审',
          permissions: ['perform_review'],
        },
      },
      {
        path: 'reviews/:id',
        name: 'ReviewerReviewDetail',
        component: () => import('@/views/reviewer/ReviewDetail.vue'),
        props: true,
        meta: {
          title: '评审详情',
          permissions: ['view_review_detail'],
        },
      },
      {
        path: 'history',
        name: 'ReviewerHistory',
        component: () => import('@/views/reviewer/ReviewHistory.vue'),
        meta: {
          title: '评审历史',
          permissions: ['view_review_history'],
        },
      },
      {
        path: 'projects',
        name: 'ReviewerProjects',
        component: () => import('@/views/reviewer/ReviewerProjects.vue'),
        meta: {
          title: '项目管理',
          permissions: ['view_all_projects'],
        },
      },
      {
        path: 'projects/pending',
        name: 'ReviewerProjectsPending',
        component: () => import('@/views/reviewer/ReviewerProjects.vue'),
        props: { defaultTab: 'pending' },
        meta: {
          title: '待评审项目',
          permissions: ['view_pending_projects'],
        },
      },
      {
        path: 'projects/history',
        name: 'ReviewerProjectsHistory',
        component: () => import('@/views/reviewer/ReviewerProjects.vue'),
        props: { defaultTab: 'history' },
        meta: {
          title: '评审历史',
          permissions: ['view_review_history'],
        },
      },
      {
        path: 'project-detail/:id',
        name: 'ReviewerProjectDetail',
        component: () => import('@/views/reviewer/ReviewerProjectDetail.vue'),
        props: true,
        meta: {
          title: '项目详情',
          requiresAuth: true,
          role: 'REVIEWER',
          permissions: ['view_project_detail'],
        },
      },
    ],
  },

  // ============ 科研助理专属路由 ============
  {
    path: '/assistant/dashboard',
    name: 'AssistantDashboard',
    component: () => import('@/views/assistant/AssistantDashboard.vue'),
    meta: {
      title: '科研助理工作台',
      requiresAuth: true,
      role: ['project_manager'], // 注意：这里应该小写，与数据库一致
      permissions: ['view_assistant_dashboard'],
    },
  },
  // ============ 项目经理项目管理模块（合并领取项目和专家分配） ============
  {
    path: '/assistant/projects',
    name: 'ManagerProjects',
    component: () => import('@/views/assistant/ManagerProjects.vue'),
    meta: {
      title: '项目管理',
      requiresAuth: true,
      role: ['project_manager'],
      permissions: ['view_applications', 'review_applications'],
    },
  },
  {
    path: '/assistant/projects/unassigned',
    name: 'ManagerUnassignedProjects',
    component: () => import('@/views/assistant/ManagerProjects.vue'),
    props: { defaultTab: 'unassigned' },
    meta: {
      title: '待领取项目',
      requiresAuth: true,
      role: ['project_manager'],
      permissions: ['view_applications', 'review_applications'],
    },
  },
  {
    path: '/assistant/projects/my',
    name: 'ManagerMyProjects',
    component: () => import('@/views/assistant/ManagerProjects.vue'),
    props: { defaultTab: 'my' },
    meta: {
      title: '我的项目',
      requiresAuth: true,
      role: ['project_manager'],
      permissions: ['view_applications', 'review_applications'],
    },
  },
  {
    path: '/assistant/projects/detail/:id',
    name: 'ManagerProjectDetail',
    component: () => import('@/views/assistant/ManagerProjectDetail.vue'),
    props: true,
    meta: {
      title: '项目详情',
      requiresAuth: true,
      role: ['project_manager'],
      permissions: ['view_application_detail', 'review_applications'],
    },
  },
  // 保留旧路由重定向（兼容性）
  {
    path: '/assistant/applications',
    redirect: '/assistant/projects',
  },
  {
    path: '/assistant/application/:id',
    redirect: (to) => `/assistant/projects/detail/${to.params.id}`,
  },
  {
    path: '/assistant/achievements',
    name: 'AssistantAchievements',
    component: () => import('@/views/assistant/Achievements.vue'),
    meta: {
      title: '成果审核',
      requiresAuth: true,
      role: ['project_manager'],
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
      role: ['project_manager'],
      permissions: ['view_users', 'manage_users'],
    },
  },
  {
    path: '/assistant/invitations',
    name: 'AssistantInvitations',
    component: () => import('@/views/invitations/InvitationManage.vue'),
    meta: {
      title: '邀请码管理',
      requiresAuth: true,
      role: ['project_manager'],
    },
  },
  {
    path: '/assistant/activities',
    name: 'AssistantActivities',
    component: () => import('@/views/assistant/Activities.vue'),
    meta: {
      title: '活动日志',
      requiresAuth: true,
      role: ['project_manager'],
      permissions: ['view_activities'],
    },
  },
  // 终止项目管理
  {
    path: '/assistant/terminate-projects',
    name: 'TerminateProjects',
    component: () => import('@/views/assistant/TerminateProjects.vue'),
    meta: {
      title: '终止项目',
      requiresAuth: true,
      role: ['project_manager'],
    },
  },
  // 新闻公告管理
  {
    path: '/assistant/news',
    name: 'NewsManagement',
    component: () => import('@/views/assistant/NewsManagement.vue'),
    meta: {
      title: '新闻公告管理',
      requiresAuth: true,
      role: ['project_manager'],
    },
  },
  {
    path: '/assistant/news/create',
    name: 'CreateNews',
    component: () => import('@/views/assistant/NewsEdit.vue'),
    meta: {
      title: '创建新闻',
      requiresAuth: true,
      role: ['project_manager'],
    },
  },
  {
    path: '/assistant/news/:id/edit',
    name: 'EditNews',
    component: () => import('@/views/assistant/NewsEdit.vue'),
    props: true,
    meta: {
      title: '编辑新闻',
      requiresAuth: true,
      role: ['project_manager'],
    },
  },
  {
    path: '/assistant/news/:id',
    name: 'NewsDetail',
    component: () => import('@/views/assistant/NewsDetail.vue'),
    props: true,
    meta: {
      title: '查看新闻',
      requiresAuth: true,
      role: ['project_manager'],
    },
  },
  // 孵化服务处理
  {
    path: '/assistant/incubation-requests',
    name: 'IncubationRequests',
    component: () => import('@/views/assistant/IncubationRequests.vue'),
    meta: {
      title: '服务申请处理',
      requiresAuth: true,
      role: ['project_manager'],
      permissions: ['view_applications', 'review_applications'],
    },
  },
  {
    path: '/audit/projects',
    name: 'AuditProjects',
    component: () => import('../views/assistant/AuditProjects.vue'),
    meta: {
      requiresAuth: true,
      role: ['project_manager'],
      permissions: ['audit_projects'],
    },
  },
  {
    path: '/audit/achievements',
    name: 'AuditAchievements',
    component: () => import('../views/assistant/Achievements.vue'),
    meta: {
      requiresAuth: true,
      role: ['project_manager'],
      permissions: ['audit_achievements'],
    },
  },
  // 专家分配功能整合到项目管理中
  {
    path: '/assistant/projects/:id/assign-reviewers',
    name: 'ManagerAssignReviewers',
    component: () => import('@/views/assistant/ReviewerAssignmentDetail.vue'),
    props: true,
    meta: {
      title: '分配评审专家',
      requiresAuth: true,
      role: ['project_manager'],
      permissions: ['manage_reviewer_assignment'],
    },
  },

  // ============ 管理员专属路由（与其它角色一致：左侧栏 + 顶栏 + 子路由） ============
  {
    path: '/admin',
    component: () => import('@/views/admin/AdminLayout.vue'),
    meta: { requiresAuth: true, role: 'admin' },
    redirect: '/admin/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: () => import('@/views/admin/AdminDashboard.vue'),
        meta: {
          title: '系统管理员工作台',
          permissions: ['view_admin_dashboard'],
        },
      },
      {
        path: 'projects',
        name: 'AdminProjectManagement',
        component: () => import('@/views/admin/AdminProjectManagement.vue'),
        meta: {
          title: '项目管理',
          permissions: ['view_admin_dashboard'],
        },
      },
      {
        path: 'users',
        name: 'UserManagement',
        component: () => import('@/views/admin/UserManagement.vue'),
        meta: {
          title: '用户管理',
          permissions: ['manage_users'],
        },
      },
      {
        path: 'invitations',
        name: 'AdminInvitations',
        component: () => import('@/views/invitations/InvitationManage.vue'),
        meta: {
          title: '邀请码管理',
          permissions: ['manage_users'],
        },
      },
      {
        path: 'users/create',
        name: 'CreateUser',
        component: () => import('@/views/admin/UserManagement.vue'),
        meta: {
          title: '创建用户',
          permissions: ['create_user'],
        },
      },
      {
        path: 'users/:id',
        name: 'UserDetail',
        component: () => import('@/views/admin/UserDetail.vue'),
        meta: {
          title: '用户详情',
          permissions: ['view_user_detail'],
        },
      },
      {
        path: 'users/:id/edit',
        name: 'EditUser',
        component: () => import('@/views/admin/UserManagement.vue'),
        meta: {
          title: '编辑用户',
          permissions: ['edit_user'],
        },
      },
      {
        path: 'roles',
        name: 'RoleManagement',
        component: () => import('@/views/admin/RoleManagement.vue'),
        meta: {
          title: '角色权限管理',
          permissions: ['manage_roles'],
        },
      },
      {
        path: 'departments',
        name: 'DepartmentManagement',
        component: () => import('@/views/admin/DepartmentManagement.vue'),
        meta: {
          title: '部门管理',
          permissions: ['manage_departments'],
        },
      },
      {
        path: 'system',
        name: 'SystemSettings',
        component: () => import('@/views/admin/SystemSettings.vue'),
        meta: {
          title: '系统设置',
          permissions: ['manage_system'],
        },
      },
      {
        path: 'backup',
        name: 'BackupManagement',
        component: () => import('@/views/admin/BackupManagement.vue'),
        meta: {
          title: '数据备份',
          permissions: ['manage_backup'],
        },
      },
      {
        path: 'logs',
        name: 'SystemLogs',
        component: () => import('@/views/admin/SystemLogs.vue'),
        meta: {
          title: '系统日志',
          permissions: ['view_system_logs'],
        },
      },
      {
        path: 'statistics',
        name: 'SystemStatistics',
        component: () => import('@/views/admin/SystemStatistics.vue'),
        meta: {
          title: '统计分析',
          permissions: ['view_statistics'],
        },
      },
      {
        path: 'reports',
        name: 'ReportManagement',
        component: () => import('@/views/admin/ReportManagement.vue'),
        meta: {
          title: '报表管理',
          permissions: ['manage_reports'],
        },
      },
      {
        path: 'monitor',
        name: 'SystemMonitor',
        component: () => import('@/views/admin/SystemMonitor.vue'),
        meta: {
          title: '系统监控',
          permissions: ['view_system_monitor'],
        },
      },
      {
        path: 'performance',
        name: 'PerformanceAnalysis',
        component: () => import('@/views/admin/PerformanceAnalysis.vue'),
        meta: {
          title: '性能分析',
          permissions: ['view_performance'],
        },
      },
    ],
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
        meta: {
          title: '经费申请',
          permissions: ['manage_funding_applications'],
        },
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
      title: '收据与凭证管理',
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

  /** 子路由会丢失父级 meta，合并整条 matched 链上的 requiresAuth / role */
  const mergedMeta: Record<string, unknown> = { ...to.meta }
  for (const m of to.matched) {
    if (m.meta.requiresAuth) mergedMeta.requiresAuth = true
    if (m.meta.role !== undefined && m.meta.role !== null) mergedMeta.role = m.meta.role
  }
  const toForGuard = { ...to, meta: mergedMeta as typeof to.meta }

  // 1. 设置页面标题
  if (to.meta?.title) {
    document.title = `${to.meta.title} - 科研项目管理系统`
  }

  // 2. 检查是否需要认证
  if (mergedMeta.requiresAuth) {
    // 检查是否有token（更可靠的方式）
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')

    if (!token) {
      ElMessage.warning('请先登录')
      next('/login')
      return
    }

    // 如果有token但authStore未初始化，手动初始化
    if (!authStore.isAuthenticated && token) {
      try {
        // 从localStorage恢复用户信息
        const userStr = localStorage.getItem('user') || sessionStorage.getItem('user')
        if (userStr) {
          const user = JSON.parse(userStr)
          authStore.user = user
          authStore.token = token
          authStore.isAuthenticated = true
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
    next(dashboardPath)
    return
  }

  // 4. 检查角色权限
  if (mergedMeta.role) {
    const userRole = localStorage.getItem('userRole') || authStore.userRole || ''
    const hasRole = checkRolePermission(toForGuard, userRole)

    if (!hasRole) {
      ElMessage.warning('您没有权限访问此页面')
      const dashboardPath = getDashboardPath(userRole)
      next(dashboardPath)
      return
    }
  }

  // 5. 特殊处理：如果访问通用仪表板，重定向到角色专属仪表板
  if (to.path === '/dashboard') {
    const userRole = localStorage.getItem('userRole') || authStore.userRole || ''
    const dashboardPath = getDashboardPath(userRole)

    if (dashboardPath !== '/dashboard') {
      next(dashboardPath)
      return
    }
  }

  next()
})

export default router
