import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as apiLogin, logout as apiLogout, getProfile } from '@/api/auth'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const permissions = ref(JSON.parse(localStorage.getItem('permissions') || '[]'))

  // 计算属性
  const isAuthenticated = computed(() => !!token.value)
  const userRole = computed(() => user.value?.role || '')
  const userName = computed(() => user.value?.name || '')

  // 登录
  const login = async (credentials) => {
    try {
      const response = await apiLogin(credentials)

      // 保存token和用户信息
      token.value = response.token
      user.value = response.user
      permissions.value = response.permissions || []

      // 保存到localStorage
      localStorage.setItem('token', token.value)
      localStorage.setItem('user', JSON.stringify(user.value))
      localStorage.setItem('permissions', JSON.stringify(permissions.value))

      // 根据角色跳转到不同页面
      switch (user.value.role) {
        case 'admin':
          router.push('/admin/dashboard')
          break
        case 'assistant':
          router.push('/assistant/dashboard')
          break
        case 'reviewer':
          router.push('/reviewer/dashboard')
          break
        default:
          router.push('/applicant/dashboard')
      }

      return response
    } catch (error) {
      throw error
    }
  }

  // 登出
  const logout = async () => {
    try {
      await apiLogout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // 清除本地存储
      token.value = ''
      user.value = null
      permissions.value = []
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('permissions')

      // 跳转到登录页
      router.push('/login')
    }
  }

  // 获取用户信息
  const fetchUserProfile = async () => {
    if (!token.value) return

    try {
      const profile = await getProfile()
      user.value = profile
      localStorage.setItem('user', JSON.stringify(profile))
      return profile
    } catch (error) {
      console.error('Fetch profile error:', error)
      logout()
    }
  }

  // 检查权限
  const hasPermission = (permission) => {
    return permissions.value.includes(permission)
  }

  // 检查角色
  const hasRole = (role) => {
    return user.value?.role === role
  }

  // 初始化
  const init = () => {
    if (token.value) {
      fetchUserProfile()
    }
  }

  return {
    token,
    user,
    permissions,
    isAuthenticated,
    userRole,
    userName,
    login,
    logout,
    fetchUserProfile,
    hasPermission,
    hasRole,
    init,
  }
})
