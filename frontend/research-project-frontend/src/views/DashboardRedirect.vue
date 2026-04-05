<!-- src/views/DashboardRedirect.vue -->
<template>
  <div class="dashboard-redirect">
    <div class="redirect-content">
      <div class="loading-spinner"></div>
      <p>正在跳转到您的专属工作台...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()

onMounted(() => {
  // 从localStorage获取用户角色
  const userRole = localStorage.getItem('userRole') || 'applicant'

  // 根据角色跳转到对应工作台
  const roleRoutes: Record<string, string> = {
    applicant: '/applicant/dashboard',
    reviewer: '/reviewer/dashboard',
    assistant: '/assistant/dashboard',
    admin: '/admin/dashboard',
  }

  const targetRoute = roleRoutes[userRole.toLowerCase()] || '/login'

  console.log(`检测到用户角色: ${userRole}, 跳转到: ${targetRoute}`)

  // 短暂延迟后跳转
  setTimeout(() => {
    router.push(targetRoute)
  }, 1000)
})
</script>

<style scoped>
.dashboard-redirect {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.redirect-content {
  text-align: center;
  color: white;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

p {
  font-size: 18px;
  margin: 0;
  opacity: 0.9;
}
</style>
