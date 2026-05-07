<!-- src/components/HomeHeader.vue -->
<template>
  <header class="home-header">
    <div class="brand" @click="goHome" style="cursor: pointer">
      <div class="brand-logo-wrap">
        <img
          :src="logoUrl"
          alt="中国人民大学校徽"
          class="brand-logo"
          @error="handleLogoError"
        />
      </div>
      <div class="brand-text">
        <h1 class="brand-title">中国人民大学</h1>
        <p class="brand-sub">图灵数智 · 概念验证平台</p>
        <p class="brand-en">Proof of Concept Research Platform · RUC</p>
      </div>
    </div>

    <div class="header-actions">
      <template v-if="!isLoggedIn">
        <button type="button" class="btn-ghost" @click="goToRegister">注册</button>
        <button type="button" class="btn-primary" @click="goToLogin">登录</button>
      </template>
      <template v-else>
        <span class="welcome-pill">您好，{{ userName }}</span>
        <button type="button" class="btn-primary" @click="goToDashboard">进入系统</button>
        <button type="button" class="btn-ghost" @click="handleLogout">退出</button>
      </template>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isLoggedIn = ref(false)
const userName = ref('')

const logoUrl = new URL('../views/picture/university-logo.png', import.meta.url).href

function checkLoginStatus() {
  const token = localStorage.getItem('token')
  const userInfo = localStorage.getItem('userInfo')
  isLoggedIn.value = !!token
  if (userInfo) {
    try {
      const info = JSON.parse(userInfo)
      userName.value = info.name || info.username || '用户'
    } catch {
      userName.value = localStorage.getItem('userName') || '用户'
    }
  }
}

function goHome() {
  router.push('/')
}

function goToDashboard() {
  const role = localStorage.getItem('userRole')
  const roleRouteMap: Record<string, string> = {
    applicant: '/applicant/dashboard',
    reviewer: '/reviewer/dashboard',
    project_manager: '/assistant/dashboard',
    admin: '/admin/dashboard',
  }
  router.push(roleRouteMap[role || ''] || '/applicant/dashboard')
}

function handleLogout() {
  localStorage.clear()
  sessionStorage.clear()
  isLoggedIn.value = false
  userName.value = ''
  router.push('/')
}

function goToLogin() {
  router.push('/login')
}

function goToRegister() {
  router.push('/register')
}

function handleLogoError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="48" fill="%23b31b1b"/%3E%3Ctext x="50" y="56" text-anchor="middle" fill="white" font-size="22" font-weight="bold"%3E人大%3C/text%3E%3C/svg%3E'
}

onMounted(() => {
  checkLoginStatus()
})
</script>

<style scoped>
.home-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 20px 12px 18px;
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 12px 40px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-left: 4px solid #b31b1b;
  /* 与 HomePage 一致：顶栏仅占满外层 .home-landing / .news-*-landing，不再单独 max-width，避免与下方白卡片宽度感知不一致 */
  width: 100%;
  box-sizing: border-box;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.brand-logo-wrap {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.05);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.brand-logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.brand-text {
  min-width: 0;
}

.brand-title {
  /* 与首页 HomePage 顶栏 h1 一致：华文中宋 */
  font-family: 'STZhongsong', '华文中宋', 'SimSun', serif;
  font-size: clamp(21px, 2.5vw, 28px);
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 2px;
  letter-spacing: 0.02em;
  line-height: 1.25;
}

.brand-sub {
  margin: 0;
  font-size: var(--el-font-size-small, 15px);
  color: #b31b1b;
  font-weight: 600;
  line-height: 1.3;
}

.brand-en {
  margin: 2px 0 0;
  font-size: 13px;
  color: #888;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1.3;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  font-family: 'STZhongsong', '华文中宋', 'SimSun', serif;
}

.welcome-pill {
  font-size: var(--el-font-size-small, 15px);
  color: #5c3d3d;
  padding: 6px 12px;
  background: #fff5f4;
  border: 1px solid rgba(179, 27, 27, 0.14);
  border-radius: 999px;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-primary,
.btn-ghost {
  font-family: inherit;
  padding: 10px 20px;
  font-size: var(--el-font-size-base, 16px);
  font-weight: 600;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border: none;
}

.btn-primary {
  background: #b31b1b;
  color: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.btn-ghost {
  background: transparent;
  color: #b31b1b;
  border: 1px solid rgba(179, 27, 27, 0.25);
}

.btn-ghost:hover {
  background: rgba(179, 27, 27, 0.06);
  transform: translateY(-1px);
}

@media (max-width: 640px) {
  .home-header {
    padding: 10px 14px;
  }
  .brand-title {
    font-size: 18px;
  }
  .brand-sub {
    font-size: 13px;
  }
  .btn-primary,
  .btn-ghost {
    padding: 8px 14px;
    font-size: 14px;
  }
}
</style>
