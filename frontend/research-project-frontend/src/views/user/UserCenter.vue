<template>
  <div class="user-center-container">
    <!-- 页面标题和面包屑 -->
    <div class="page-header">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item>个人中心</el-breadcrumb-item>
      </el-breadcrumb>
      <h1 class="page-title">个人中心</h1>
      <p class="page-subtitle">管理您的个人信息、安全设置和系统偏好</p>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="5" animated />
    </div>

    <!-- 主要内容区域 -->
    <div v-else class="main-content">
      <!-- 左侧菜单 -->
      <div class="left-sidebar">
        <el-card class="sidebar-card" shadow="never">
          <!-- 用户信息概览 -->
          <div class="user-overview">
            <el-avatar :size="80" :src="userInfo.avatar" class="user-avatar">
              <span v-if="!userInfo.avatar" class="avatar-text">
                {{ (userInfo.name || 'U').charAt(0) }}
              </span>
            </el-avatar>
            <div class="user-summary">
              <h3>{{ userInfo.name || '未设置用户名' }}</h3>
              <el-tag :type="getRoleTagType(userInfo.role)" size="small">
                {{ formatRole(userInfo.role) }}
              </el-tag>
              <p class="user-department">
                <el-icon><OfficeBuilding /></el-icon>
                {{ userInfo.department || '未设置学院' }}
              </p>
              <p class="user-email">
                <el-icon><Message /></el-icon>
                {{ userInfo.email || '未设置邮箱' }}
              </p>
            </div>
          </div>

          <!-- 导航菜单 -->
          <el-menu :default-active="activeTab" class="side-menu" @select="handleMenuSelect">
            <el-menu-item index="profile">
              <template #title>
                <el-icon><User /></el-icon>
                <span>个人资料</span>
              </template>
            </el-menu-item>

            <el-menu-item index="security">
              <template #title>
                <el-icon><Lock /></el-icon>
                <span>安全设置</span>
              </template>
            </el-menu-item>

            <el-menu-item index="notification">
              <template #title>
                <el-icon><Bell /></el-icon>
                <span>消息通知</span>
                <el-badge
                  v-if="unreadNotifications > 0"
                  :value="unreadNotifications"
                  class="menu-badge"
                />
              </template>
            </el-menu-item>

            <el-menu-item index="preferences">
              <template #title>
                <el-icon><Setting /></el-icon>
                <span>系统偏好</span>
              </template>
            </el-menu-item>

            <el-menu-item index="activities">
              <template #title>
                <el-icon><Histogram /></el-icon>
                <span>操作记录</span>
              </template>
            </el-menu-item>
          </el-menu>

          <!-- 账户状态 -->
          <div class="account-status">
            <h4>账户状态</h4>
            <div class="status-item">
              <span class="status-label">账户状态</span>
              <el-tag type="success" size="small">正常</el-tag>
            </div>
            <div class="status-item">
              <span class="status-label">注册时间</span>
              <span class="status-value">{{ userInfo.createTime || '2023-01-01' }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">最后登录</span>
              <span class="status-value">{{ userInfo.lastLogin || '刚刚' }}</span>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 右侧内容区域 -->
      <div class="right-content">
        <!-- 个人资料页面 -->
        <div v-if="activeTab === 'profile'" class="tab-content">
          <el-card class="content-card">
            <template #header>
              <div class="card-header">
                <h3>个人资料</h3>
                <el-button type="primary" @click="editProfile" icon="Edit"> 编辑资料 </el-button>
              </div>
            </template>

            <div class="profile-details">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="姓名">{{
                  userInfo.name || '未设置'
                }}</el-descriptions-item>
                <el-descriptions-item label="用户ID">{{
                  userInfo.id || '未设置'
                }}</el-descriptions-item>
                <el-descriptions-item label="性别">{{
                  userInfo.gender || '未设置'
                }}</el-descriptions-item>
                <el-descriptions-item label="出生日期">{{
                  userInfo.birthday || '未设置'
                }}</el-descriptions-item>
                <el-descriptions-item label="手机号码">{{
                  userInfo.phone || '未设置'
                }}</el-descriptions-item>
                <el-descriptions-item label="邮箱">{{
                  userInfo.email || '未设置'
                }}</el-descriptions-item>
                <el-descriptions-item label="学院/部门">{{
                  userInfo.department || '未设置'
                }}</el-descriptions-item>
                <el-descriptions-item label="职称/年级">{{
                  userInfo.title || '未设置'
                }}</el-descriptions-item>
                <el-descriptions-item label="研究方向" :span="2">
                  {{ userInfo.researchField || '未设置' }}
                </el-descriptions-item>
                <el-descriptions-item label="个人简介" :span="2">
                  {{ userInfo.bio || '暂无个人简介' }}
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </el-card>
        </div>

        <!-- 安全设置页面 -->
        <div v-else-if="activeTab === 'security'" class="tab-content">
          <el-card class="content-card">
            <template #header>
              <h3>安全设置</h3>
            </template>

            <div class="security-settings">
              <!-- 修改密码 -->
              <div class="setting-section">
                <h4>修改密码</h4>
                <el-form
                  ref="passwordFormRef"
                  :model="passwordForm"
                  :rules="passwordRules"
                  label-width="120px"
                >
                  <el-form-item label="当前密码" prop="currentPassword">
                    <el-input
                      v-model="passwordForm.currentPassword"
                      type="password"
                      placeholder="请输入当前密码"
                      show-password
                    />
                  </el-form-item>

                  <el-form-item label="新密码" prop="newPassword">
                    <el-input
                      v-model="passwordForm.newPassword"
                      type="password"
                      placeholder="请输入新密码"
                      show-password
                    />
                  </el-form-item>

                  <el-form-item label="确认新密码" prop="confirmPassword">
                    <el-input
                      v-model="passwordForm.confirmPassword"
                      type="password"
                      placeholder="请再次输入新密码"
                      show-password
                    />
                  </el-form-item>

                  <el-form-item>
                    <el-button type="primary" @click="changePassword" :loading="changingPassword">
                      修改密码
                    </el-button>
                    <el-button @click="resetPasswordForm">重置</el-button>
                  </el-form-item>
                </el-form>
              </div>

              <el-divider />

              <!-- 安全选项 -->
              <div class="setting-section">
                <h4>安全选项</h4>
                <div class="security-options">
                  <div class="option-item">
                    <div class="option-info">
                      <h5>双重验证</h5>
                      <p>启用后，登录需要手机验证码验证</p>
                    </div>
                    <el-switch
                      v-model="securitySettings.twoFactorAuth"
                      @change="updateSecuritySetting('twoFactorAuth')"
                    />
                  </div>

                  <div class="option-item">
                    <div class="option-info">
                      <h5>登录通知</h5>
                      <p>新设备登录时发送邮件通知</p>
                    </div>
                    <el-switch
                      v-model="securitySettings.loginNotification"
                      @change="updateSecuritySetting('loginNotification')"
                    />
                  </div>

                  <div class="option-item">
                    <div class="option-info">
                      <h5>登录设备管理</h5>
                      <p>查看和管理登录设备</p>
                    </div>
                    <el-button type="text" @click="manageSessions"> 查看设备 </el-button>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 消息通知页面 -->
        <div v-else-if="activeTab === 'notification'" class="tab-content">
          <el-card class="content-card">
            <template #header>
              <div class="card-header">
                <h3>消息通知</h3>
                <el-button @click="markAllAsRead" :disabled="unreadNotifications === 0">
                  全部标记为已读
                </el-button>
              </div>
            </template>

            <div class="notification-settings">
              <div class="notification-list">
                <div v-if="notifications.length === 0" class="empty-notifications">
                  <el-empty description="暂无通知" />
                </div>

                <div
                  v-for="notification in notifications"
                  :key="notification.id"
                  class="notification-item"
                  :class="{ unread: !notification.read }"
                >
                  <div class="notification-icon">
                    <el-icon>
                      <Bell />
                    </el-icon>
                  </div>
                  <div class="notification-content">
                    <div class="notification-header">
                      <h4>{{ notification.title }}</h4>
                      <span class="notification-time">{{ notification.time }}</span>
                    </div>
                    <p class="notification-message">{{ notification.message }}</p>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 系统偏好页面 -->
        <div v-else-if="activeTab === 'preferences'" class="tab-content">
          <el-card class="content-card">
            <template #header>
              <h3>系统偏好</h3>
            </template>

            <div class="preference-settings">
              <div class="preference-section">
                <h4>界面设置</h4>
                <div class="preference-options">
                  <div class="option-item">
                    <span class="option-label">主题模式</span>
                    <el-radio-group v-model="preferences.theme">
                      <el-radio label="light">浅色</el-radio>
                      <el-radio label="dark">深色</el-radio>
                      <el-radio label="auto">跟随系统</el-radio>
                    </el-radio-group>
                  </div>
                </div>
              </div>

              <el-divider />

              <div class="preference-section">
                <h4>功能设置</h4>
                <div class="preference-options">
                  <div class="option-item">
                    <el-checkbox v-model="preferences.autoSave"> 自动保存表单 </el-checkbox>
                    <span class="option-desc">填写表单时自动保存草稿</span>
                  </div>
                </div>
              </div>

              <div class="preference-actions">
                <el-button type="primary" @click="savePreferences"> 保存设置 </el-button>
                <el-button @click="resetPreferences"> 恢复默认 </el-button>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 操作记录页面 -->
        <div v-else-if="activeTab === 'activities'" class="tab-content">
          <el-card class="content-card">
            <template #header>
              <div class="card-header">
                <h3>操作记录</h3>
              </div>
            </template>

            <div class="activity-log">
              <el-table :data="activities" style="width: 100%">
                <el-table-column prop="time" label="时间" width="180" />
                <el-table-column prop="action" label="操作类型" width="120">
                  <template #default="{ row }">
                    <el-tag :type="getActivityTagType(row.action)" size="small">
                      {{ row.action }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="description" label="操作描述" />
                <el-table-column prop="ip" label="IP地址" width="140" />
              </el-table>
            </div>
          </el-card>
        </div>
      </div>
    </div>

    <!-- 编辑资料对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑个人资料" width="600px">
      <el-form ref="editFormRef" :model="editForm" label-width="100px">
        <el-form-item label="姓名">
          <el-input v-model="editForm.name" placeholder="请输入姓名" />
        </el-form-item>

        <el-form-item label="性别">
          <el-radio-group v-model="editForm.gender">
            <el-radio label="男">男</el-radio>
            <el-radio label="女">女</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="出生日期">
          <el-date-picker
            v-model="editForm.birthday"
            type="date"
            placeholder="选择出生日期"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="手机号码">
          <el-input v-model="editForm.phone" placeholder="请输入手机号码" />
        </el-form-item>

        <el-form-item label="邮箱">
          <el-input v-model="editForm.email" placeholder="请输入邮箱" />
        </el-form-item>

        <el-form-item label="学院/部门">
          <el-input v-model="editForm.department" placeholder="请输入学院/部门" />
        </el-form-item>

        <el-form-item label="职称/年级">
          <el-input v-model="editForm.title" placeholder="请输入职称或年级" />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveProfile"> 保存 </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  User,
  Lock,
  Bell,
  Setting,
  Histogram,
  Message,
  OfficeBuilding,
  Edit,
} from '@element-plus/icons-vue'

// 当前激活的标签页
const activeTab = ref('profile')

// 用户信息 - 从 localStorage 获取
const userInfo = ref({
  id: '',
  name: '',
  avatar: '',
  role: '',
  gender: '',
  birthday: '',
  phone: '',
  email: '',
  department: '',
  title: '',
  researchField: '',
  bio: '',
  createTime: '',
  lastLogin: '',
})

// 加载状态
const loading = ref(false)

// 编辑对话框
const editDialogVisible = ref(false)
const editForm = reactive({})

// 密码表单
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const changingPassword = ref(false)

// 安全设置
const securitySettings = reactive({
  twoFactorAuth: false,
  loginNotification: true,
})

// 通知数据
const notifications = ref([
  {
    id: 1,
    title: '系统通知',
    message: '欢迎使用科研项目管理系统',
    time: '2024-01-15',
    read: false,
  },
])

const unreadNotifications = computed(() => {
  return notifications.value.filter((n) => !n.read).length
})

// 系统偏好
const preferences = reactive({
  theme: 'light',
  autoSave: true,
})

// 操作记录
const activities = ref([
  {
    id: 1,
    time: '2024-01-15 14:30:25',
    action: '登录',
    description: '用户登录系统',
    ip: '192.168.1.100',
  },
])

// 从 localStorage 加载用户信息
const loadUserInfo = () => {
  loading.value = true
  try {
    // 从 localStorage 获取用户数据
    const savedUser = localStorage.getItem('userInfo')
    if (savedUser) {
      Object.assign(userInfo.value, JSON.parse(savedUser))
    } else {
      // 如果没有保存的用户数据，尝试从其他 localStorage 项获取
      userInfo.value.id = localStorage.getItem('userId') || ''
      userInfo.value.name = localStorage.getItem('userName') || '未设置用户名'
      userInfo.value.role = localStorage.getItem('userRole') || ''
      userInfo.value.department = localStorage.getItem('userDepartment') || ''
      userInfo.value.email = localStorage.getItem('userEmail') || ''
    }

    console.log('加载的用户信息:', userInfo.value)
  } catch (error) {
    console.error('加载用户信息失败:', error)
    ElMessage.error('加载用户信息失败')
  } finally {
    loading.value = false
  }
}

// 角色格式化函数
const formatRole = (role) => {
  const roleMap = {
    APPLICANT: '申请人',
    REVIEWER: '评审专家',
    ADMIN: '管理员',
    TEACHER: '教师',
    STUDENT: '学生',
  }
  return roleMap[role] || role
}

// 获取角色标签类型
const getRoleTagType = (role) => {
  const typeMap = {
    APPLICANT: 'success',
    REVIEWER: 'warning',
    ADMIN: 'danger',
    TEACHER: 'primary',
    STUDENT: 'info',
  }
  return typeMap[role] || 'info'
}

// 获取操作标签类型
const getActivityTagType = (action) => {
  const typeMap = {
    登录: 'success',
    创建项目: 'primary',
    修改项目: 'warning',
    添加成果: 'info',
    修改密码: 'danger',
    删除: 'danger',
  }
  return typeMap[action] || 'info'
}

// 菜单选择处理
const handleMenuSelect = (index) => {
  activeTab.value = index
}

// 编辑个人资料
const editProfile = () => {
  Object.assign(editForm, userInfo.value)
  editDialogVisible.value = true
}

// 保存个人资料
const saveProfile = () => {
  Object.assign(userInfo.value, editForm)

  // 保存到 localStorage
  localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
  localStorage.setItem('userName', userInfo.value.name)
  localStorage.setItem('userDepartment', userInfo.value.department)
  localStorage.setItem('userEmail', userInfo.value.email)

  ElMessage.success('个人资料更新成功')
  editDialogVisible.value = false
}

// 修改密码
// 修改密码
const changePassword = async () => {
  // 表单验证
  if (!passwordForm.currentPassword.trim()) {
    ElMessage.warning('请输入当前密码')
    return
  }

  if (!passwordForm.newPassword.trim()) {
    ElMessage.warning('请输入新密码')
    return
  }

  if (passwordForm.newPassword.length < 6) {
    ElMessage.warning('新密码长度不能少于6位')
    return
  }

  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    ElMessage.warning('两次输入的新密码不一致')
    return
  }

  if (passwordForm.currentPassword === passwordForm.newPassword) {
    ElMessage.warning('新密码不能与当前密码相同')
    return
  }

  changingPassword.value = true

  try {
    // 这里调用你的后端API
    // const response = await fetch('/api/user/change-password', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${localStorage.getItem('token')}`
    //   },
    //   body: JSON.stringify({
    //     currentPassword: passwordForm.currentPassword,
    //     newPassword: passwordForm.newPassword
    //   })
    // })

    // 模拟API响应
    // const result = await response.json()

    // 模拟API调用延迟
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 模拟成功响应
    const mockSuccess = true // 这里应该根据实际API响应判断

    if (mockSuccess) {
      ElMessage.success('密码修改成功')

      // 清空表单
      resetPasswordForm()

      // 记录操作
      activities.value.unshift({
        id: Date.now(),
        time: new Date().toLocaleString(),
        action: '修改密码',
        description: '用户修改了登录密码',
        ip: '192.168.1.100',
      })

      // 如果是真实场景，可能需要重新登录
      // ElMessageBox.confirm('密码修改成功，建议重新登录以确保安全。是否立即重新登录？', '安全提示', {
      //   confirmButtonText: '重新登录',
      //   cancelButtonText: '稍后',
      //   type: 'warning'
      // }).then(() => {
      //   // 清除登录状态
      //   localStorage.removeItem('token')
      //   // 跳转到登录页
      //   router.push('/login')
      // })
    } else {
      ElMessage.error('密码修改失败，请检查当前密码是否正确')
    }
  } catch (error) {
    console.error('密码修改失败:', error)
    ElMessage.error('密码修改失败，请稍后重试')
  } finally {
    changingPassword.value = false
  }
}

// 重置密码表单
const resetPasswordForm = () => {
  passwordForm.currentPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
}

// 更新安全设置
const updateSecuritySetting = (setting) => {
  ElMessage.success(`安全设置已更新`)
}

// 管理会话
const manageSessions = () => {
  ElMessage.info('会话管理功能开发中')
}

// 标记全部为已读
const markAllAsRead = () => {
  notifications.value.forEach((n) => (n.read = true))
  ElMessage.success('全部标记为已读')
}

// 保存偏好设置
const savePreferences = () => {
  ElMessage.success('系统偏好设置已保存')
}

// 重置偏好设置
const resetPreferences = () => {
  Object.assign(preferences, {
    theme: 'light',
    autoSave: true,
  })
  ElMessage.success('已恢复默认设置')
}

// 密码验证规则
const passwordRules = {
  currentPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' },
  ],
  confirmPassword: [{ required: true, message: '请确认密码', trigger: 'blur' }],
}

// 在组件挂载时加载用户信息
onMounted(() => {
  loadUserInfo()
})
</script>

<style scoped>
.user-center-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 30px;
}

.page-title {
  margin: 15px 0 10px 0;
  font-size: 24px;
  color: #303133;
}

.page-subtitle {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.loading-container {
  padding: 20px;
  background: white;
  border-radius: 8px;
}

.main-content {
  display: flex;
  gap: 20px;
}

.left-sidebar {
  width: 280px;
}

.sidebar-card {
  position: sticky;
  top: 20px;
}

.user-overview {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid #eee;
}

.user-avatar {
  margin: 0 auto 15px;
  background-color: #409eff;
}

.avatar-text {
  font-size: 32px;
  font-weight: bold;
  color: white;
}

.user-summary h3 {
  margin: 0 0 10px 0;
  font-size: 18px;
}

.user-department,
.user-email {
  margin: 8px 0;
  color: #666;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.side-menu {
  border-right: none;
  margin: 20px 0;
}

.account-status {
  padding: 20px;
  border-top: 1px solid #eee;
}

.account-status h4 {
  margin: 0 0 15px 0;
  font-size: 16px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.status-label {
  color: #666;
  font-size: 14px;
}

.status-value {
  color: #303133;
  font-size: 14px;
}

.right-content {
  flex: 1;
}

.content-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
}

.setting-section {
  margin-bottom: 30px;
}

.setting-section h4 {
  margin: 0 0 20px 0;
  font-size: 16px;
}

.security-options .option-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid #eee;
}

.notification-item {
  display: flex;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 10px;
  background-color: #fafafa;
}

.notification-item.unread {
  background-color: #f0f9ff;
  border-left: 3px solid #409eff;
}

.notification-icon {
  margin-right: 15px;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.notification-time {
  font-size: 12px;
  color: #909399;
}

.preference-options .option-item {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.option-label {
  width: 100px;
  color: #606266;
  font-size: 14px;
}

.option-desc {
  margin-left: 10px;
  color: #909399;
  font-size: 13px;
}

.preference-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
