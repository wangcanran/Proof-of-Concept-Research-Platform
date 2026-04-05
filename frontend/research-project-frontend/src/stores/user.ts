// src/stores/user.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  // 状态
  const user = ref(null)
  const token = ref('')
  const isAuthenticated = computed(() => !!token.value)

  // 保存用户信息
  const setUser = (userData) => {
    user.value = userData
    // 同时保存到 localStorage
    localStorage.setItem('userInfo', JSON.stringify(userData))
  }

  // 获取用户信息
  const getUser = () => {
    if (!user.value) {
      // 从 localStorage 恢复
      const savedUser = localStorage.getItem('userInfo')
      if (savedUser) {
        user.value = JSON.parse(savedUser)
      }
    }
    return user.value
  }

  // 清除用户信息
  const clearUser = () => {
    user.value = null
    token.value = ''
    localStorage.removeItem('userInfo')
    localStorage.removeItem('token')
  }

  return {
    user,
    token,
    isAuthenticated,
    setUser,
    getUser,
    clearUser,
  }
})
