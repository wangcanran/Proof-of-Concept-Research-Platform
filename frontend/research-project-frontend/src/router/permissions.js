import router from '@/router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

// 白名单，不需要登录的页面
const whiteList = ['/login', '/register', '/404', '/403']

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - 科研项目管理平台`
  }

  // 检查是否已登录
  if (authStore.token) {
    // 如果已登录，跳转到登录页则重定向到首页
    if (to.path === '/login') {
      next({ path: '/' })
    } else {
      // 检查用户信息是否已加载
      if (!authStore.user) {
        try {
          await authStore.fetchUserProfile()
        } catch (error) {
          next('/login')
          return
        }
      }

      // 检查角色权限
      if (to.meta.roles && to.meta.roles.length > 0) {
        const hasRole = to.meta.roles.includes(authStore.userRole)
        if (!hasRole) {
          ElMessage.error('您没有权限访问此页面')
          next('/403')
          return
        }
      }

      // 检查具体权限
      if (to.meta.permissions && to.meta.permissions.length > 0) {
        const hasPermission = to.meta.permissions.some((permission) =>
          authStore.hasPermission(permission),
        )
        if (!hasPermission) {
          ElMessage.error('您没有权限执行此操作')
          next('/403')
          return
        }
      }

      next()
    }
  } else {
    // 未登录
    if (whiteList.includes(to.path)) {
      next()
    } else {
      next('/login')
    }
  }
})

router.afterEach(() => {
  // 可以在这里添加页面访问统计等
})
