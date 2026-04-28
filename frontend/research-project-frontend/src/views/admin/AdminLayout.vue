<!-- 管理员壳层：与其它角色工作台一致（左侧栏 + 白顶栏 + 主区 router-view） -->
<template>
  <div class="dashboard-container admin-layout-shell assistant-ruc-theme">
    <aside
      class="sidebar"
      :class="{ 'sidebar-collapsed': sidebarCollapsed, show: showMobileMenu }"
    >
      <div class="sidebar-header">
        <div class="logo-area">
          <img
            src="@/views/picture/university-logo.png"
            alt="人大校徽"
            class="sidebar-logo"
            @error="handleLogoError"
          />
          <h3 v-if="!sidebarCollapsed" class="sidebar-title">概念验证平台</h3>
        </div>
        <button type="button" class="sidebar-toggle" @click="toggleSidebar">
          {{ sidebarCollapsed ? '→' : '←' }}
        </button>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section">
          <router-link to="/" class="nav-link">
            <span class="nav-icon">🌐</span>
            <span v-if="!sidebarCollapsed" class="nav-text">平台首页</span>
          </router-link>
        </div>

        <div class="nav-section">
          <h4 v-if="!sidebarCollapsed" class="nav-section-title">系统管理</h4>
          <router-link to="/admin/dashboard" class="nav-link" active-class="active">
            <span class="nav-icon">🏠</span>
            <span v-if="!sidebarCollapsed" class="nav-text">工作台</span>
          </router-link>
          <router-link to="/admin/projects" class="nav-link" active-class="active">
            <span class="nav-icon">📊</span>
            <span v-if="!sidebarCollapsed" class="nav-text">项目管理</span>
          </router-link>
          <router-link to="/admin/users" class="nav-link" active-class="active">
            <span class="nav-icon">👥</span>
            <span v-if="!sidebarCollapsed" class="nav-text">用户管理</span>
            <span v-if="!sidebarCollapsed && pendingApprovalCount > 0" class="nav-badge">
              {{ pendingApprovalCount }}
            </span>
          </router-link>
          <router-link to="/admin/invitations" class="nav-link" active-class="active">
            <span class="nav-icon">✉️</span>
            <span v-if="!sidebarCollapsed" class="nav-text">邀请码</span>
          </router-link>
          <router-link to="/admin/roles" class="nav-link" active-class="active">
            <span class="nav-icon">🔑</span>
            <span v-if="!sidebarCollapsed" class="nav-text">角色权限</span>
          </router-link>
        </div>

        <div class="nav-section">
          <h4 v-if="!sidebarCollapsed" class="nav-section-title">个人中心</h4>
          <router-link to="/profile" class="nav-link" active-class="active">
            <span class="nav-icon">👤</span>
            <span v-if="!sidebarCollapsed" class="nav-text">个人资料</span>
          </router-link>
          <router-link to="/notifications" class="nav-link" active-class="active">
            <span class="nav-icon">🔔</span>
            <span v-if="!sidebarCollapsed" class="nav-text">通知中心</span>
            <span v-if="!sidebarCollapsed && unreadCount > 0" class="nav-badge">{{ unreadCount }}</span>
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

    <div class="main-wrapper" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <header class="dashboard-header">
        <div class="header-left">
          <div class="mobile-menu-btn" @click="toggleMobileMenu">
            <span class="icon">☰</span>
          </div>
          <div class="breadcrumb">
            <span class="current-page">{{ pageTitle }}</span>
          </div>
        </div>
        <div class="header-right">
          <div class="header-actions">
            <button type="button" class="icon-btn" @click="refreshShell" title="刷新">
              <span class="icon">🔄</span>
            </button>
            <button type="button" class="icon-btn" @click="toggleTheme" title="切换主题">
              <span class="icon">{{ isDarkMode ? '☀️' : '🌙' }}</span>
            </button>
            <div class="notifications-dropdown">
              <button
                type="button"
                class="icon-btn notification-btn"
                @click="toggleNotifications"
                title="通知"
              >
                <span class="icon">🔔</span>
                <span v-if="unreadCount > 0" class="notification-count">{{ unreadCount }}</span>
              </button>
              <div v-if="showNotificationsDropdown" class="notifications-dropdown-content">
                <div class="notifications-dropdown-header">
                  <h4>系统通知</h4>
                  <button type="button" @click="markAllAsRead" v-if="unreadCount > 0">标记已读</button>
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
                    <span v-if="!notification.is_read" class="unread-dot-small"></span>
                  </div>
                  <div v-if="recentNotifications.length === 0" class="no-notifications">暂无通知</div>
                </div>
                <div class="notifications-dropdown-footer">
                  <router-link to="/notifications" @click="showNotificationsDropdown = false">
                    查看全部
                  </router-link>
                </div>
              </div>
            </div>
            <button type="button" class="logout-btn" @click="handleLogout">
              <span class="icon">🚪</span>
              退出
            </button>
          </div>
        </div>
      </header>

      <main class="main-content">
        <router-view />
      </main>
    </div>

    <div v-if="showMobileMenu" class="mobile-menu-overlay" @click="toggleMobileMenu"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()

const sidebarCollapsed = ref(false)
const showMobileMenu = ref(false)
const showNotificationsDropdown = ref(false)
const isDarkMode = ref(false)
const userName = ref('系统管理员')
const unreadCount = ref(0)
const pendingApprovalCount = ref(0)
const notifications = ref<any[]>([])

const pageTitle = computed(() => (route.meta.title as string) || '系统管理')

const userInitial = computed(() =>
  userName.value ? userName.value.charAt(0).toUpperCase() : 'A',
)

const recentNotifications = computed(() => notifications.value.slice(0, 5))

function handleLogoError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23B31B1B"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="white" font-size="40"%3E人大%3C/text%3E%3C/svg%3E'
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

function toggleMobileMenu() {
  showMobileMenu.value = !showMobileMenu.value
}

function toggleNotifications() {
  showNotificationsDropdown.value = !showNotificationsDropdown.value
}

function toggleTheme() {
  isDarkMode.value = !isDarkMode.value
  document.documentElement.setAttribute('data-theme', isDarkMode.value ? 'dark' : 'light')
  ElMessage.info(isDarkMode.value ? '已切换到深色模式' : '已切换到浅色模式')
}

function refreshShell() {
  loadPendingBadge()
  loadHeaderNotifications()
  ElMessage.success('已刷新')
}

function handleLogout() {
  if (confirm('确定要退出登录吗？')) {
    localStorage.clear()
    sessionStorage.clear()
    router.push('/login')
  }
}

async function loadUserInfo() {
  try {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      userName.value = user.name || user.username || '系统管理员'
    }
  } catch {
    userName.value = localStorage.getItem('userName') || '系统管理员'
  }
}

async function loadPendingBadge() {
  try {
    const res = await request.get('/api/admin/users/pending', { params: { limit: 100 } })
    if (res.success && Array.isArray(res.data)) {
      pendingApprovalCount.value = res.data.length
    }
  } catch {
    pendingApprovalCount.value = 0
  }
}

async function loadHeaderNotifications() {
  try {
    const res = await request.get('/api/notifications', {
      params: { limit: 20, orderBy: 'created_at', order: 'desc' },
    })
    if (res.success && res.data) {
      const list = Array.isArray(res.data) ? res.data : res.data.data || []
      notifications.value = list.map((n: any) => ({
        ...n,
        icon: n.icon || '📌',
        time: n.created_at
          ? new Date(n.created_at).toLocaleString('zh-CN')
          : '',
      }))
      unreadCount.value = notifications.value.filter((n: any) => !n.is_read).length
    }
  } catch {
    notifications.value = []
  }
}

async function openNotification(notification: any) {
  try {
    if (!notification.is_read && notification.id) {
      await request.post(`/api/notifications/${notification.id}/read`)
      notification.is_read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
    if (notification.link) router.push(notification.link)
    showNotificationsDropdown.value = false
  } catch (e) {
    console.error(e)
  }
}

async function markAllAsRead() {
  try {
    await request.post('/api/notifications/mark-all-read')
    notifications.value.forEach((n: any) => {
      n.is_read = true
    })
    unreadCount.value = 0
    ElMessage.success('已标记已读')
  } catch {
    ElMessage.error('操作失败')
  }
}

watch(
  () => route.path,
  () => {
    showMobileMenu.value = false
  },
)

function onDocClick(e: MouseEvent) {
  const el = e.target as HTMLElement
  if (showNotificationsDropdown.value && !el.closest('.notifications-dropdown')) {
    showNotificationsDropdown.value = false
  }
}

onMounted(() => {
  loadUserInfo()
  loadPendingBadge()
  loadHeaderNotifications()
  document.addEventListener('click', onDocClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
})
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
}

.main-wrapper {
  margin-left: 260px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  transition: all 0.3s;
}

.main-wrapper.sidebar-collapsed {
  margin-left: 70px;
}

.dashboard-header {
  background: white;
  padding: 0 32px;
  height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 900;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.mobile-menu-btn {
  display: none;
  width: 36px;
  height: 36px;
  border: none;
  background: #f5f7fa;
  border-radius: 6px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  color: #333;
}

.mobile-menu-btn:hover {
  background: #e8e8e8;
}

.breadcrumb {
  font-size: 14px;
  color: #666;
}

.current-page {
  color: #b31b1b;
  font-weight: 500;
}

.header-right {
  display: flex;
  justify-content: flex-end;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: #f5f7fa;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  color: #555;
  position: relative;
}

.icon-btn:hover {
  background: #e8e8e8;
  transform: translateY(-1px);
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

.logout-btn {
  padding: 6px 14px;
  background: #fff1f0;
  border: 1px solid #ffccc7;
  border-radius: 6px;
  color: #cf1322;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.3s;
}

.logout-btn:hover {
  background: #ff4d4f;
  border-color: #ff4d4f;
  color: white;
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
  color: #b31b1b;
  font-size: 12px;
  cursor: pointer;
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
  color: #b31b1b;
  text-decoration: none;
  font-size: 12px;
}

.sidebar {
  width: 260px;
  background: #b31b1b;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
  display: flex;
  position: fixed;
  height: 100vh;
  top: 0;
  left: 0;
  z-index: 1000;
  flex-direction: column;
  transition: all 0.3s ease;
}

.sidebar-collapsed {
  width: 70px;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.sidebar-logo {
  width: 36px;
  height: 36px;
  object-fit: cover;
  object-position: center;
  border-radius: 6px;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.sidebar-toggle {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 4px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  color: white;
  transition: all 0.3s;
}

.sidebar-toggle:hover {
  background: rgba(255, 255, 255, 0.25);
}

.sidebar-nav {
  flex: 1;
  padding: 16px 0;
  overflow-y: auto;
  scrollbar-width: none;
}

.sidebar-nav::-webkit-scrollbar {
  display: none;
}

.nav-section {
  margin-bottom: 24px;
}

.nav-section-title {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 0.5px;
  margin: 0 0 8px 20px;
  font-weight: 500;
}

.nav-link {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  transition: all 0.3s;
  position: relative;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-link.active {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border-left: 3px solid white;
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
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  padding: 16px 20px;
}

.user-info-mini {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar-mini {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.25);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 15px;
  flex-shrink: 0;
}

.user-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
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
  color: rgba(255, 255, 255, 0.7);
}

.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background: #f5f7fa;
}

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

@media (max-width: 992px) {
  .sidebar {
    transform: translateX(-100%);
  }
  .sidebar.show {
    transform: translateX(0);
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
}

@media (max-width: 768px) {
  .dashboard-header {
    padding: 0 16px;
  }
  .main-content {
    padding: 16px;
  }
}
</style>
