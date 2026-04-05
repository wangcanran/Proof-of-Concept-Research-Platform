<template>
  <div class="login-container">
    <div class="login-wrapper">
      <!-- 左侧装饰区域 -->
      <div class="login-left">
        <div class="brand-section">
          <h1 class="system-title">科研项目管理系统</h1>
          <p class="system-subtitle">Research Project Management System</p>
        </div>

        <div class="features">
          <div class="feature-card">
            <div class="feature-icon">📝</div>
            <div class="feature-content">
              <h3>项目申报</h3>
              <p>在线提交和管理科研项目申请</p>
            </div>
          </div>

          <div class="feature-card">
            <div class="feature-icon">⭐</div>
            <div class="feature-content">
              <h3>专家评审</h3>
              <p>多位专家在线评审，确保公平公正</p>
            </div>
          </div>

          <div class="feature-card">
            <div class="feature-icon">💰</div>
            <div class="feature-content">
              <h3>经费管理</h3>
              <p>申请、审核、支出全程跟踪</p>
            </div>
          </div>

          <div class="feature-card">
            <div class="feature-icon">📊</div>
            <div class="feature-content">
              <h3>成果管理</h3>
              <p>科研成果登记、转化全流程管理</p>
            </div>
          </div>
        </div>

        <div class="stats">
          <div class="stat-item">
            <span class="stat-number">500+</span>
            <span class="stat-label">科研项目</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">200+</span>
            <span class="stat-label">评审专家</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">1000万+</span>
            <span class="stat-label">管理经费</span>
          </div>
        </div>
      </div>

      <!-- 右侧登录区域 -->
      <div class="login-right">
        <div class="login-card">
          <div class="login-header">
            <h2>欢迎登录</h2>
            <p>请选择您的身份并登录系统</p>
          </div>

          <!-- 用户身份选择 -->
          <div class="role-selector" v-if="!showLoginForm">
            <div class="role-grid">
              <div
                v-for="role in roles"
                :key="role.value"
                class="role-card"
                :class="{ active: selectedRole === role.value }"
                @click="selectRole(role.value)"
              >
                <div class="role-icon">{{ role.icon }}</div>
                <div class="role-info">
                  <h4>{{ role.name }}</h4>
                  <p>{{ role.desc }}</p>
                </div>
              </div>
            </div>

            <button class="next-btn" @click="showLoginForm = true" :disabled="!selectedRole">
              下一步，开始登录 →
            </button>
          </div>

          <!-- 登录表单 -->
          <div class="login-form" v-else>
            <div class="form-header">
              <button class="back-btn" @click="showLoginForm = false">← 返回</button>
              <h3>{{ currentRole?.name }} 登录</h3>
            </div>

            <form @submit.prevent="handleLogin">
              <div class="form-group">
                <label for="username">
                  <span class="label-icon">👤</span>
                  {{ usernameLabel }}
                </label>
                <input
                  id="username"
                  type="text"
                  v-model="loginForm.username"
                  :placeholder="usernamePlaceholder"
                  required
                  @focus="clearError"
                />
              </div>

              <div class="form-group">
                <label for="password">
                  <span class="label-icon">🔒</span>
                  密码
                </label>
                <input
                  id="password"
                  :type="showPassword ? 'text' : 'password'"
                  v-model="loginForm.password"
                  placeholder="请输入密码"
                  required
                  @focus="clearError"
                />
                <button type="button" class="toggle-password" @click="showPassword = !showPassword">
                  {{ showPassword ? '🙈' : '👁️' }}
                </button>
              </div>

              <div class="form-options">
                <label class="remember-me">
                  <input type="checkbox" v-model="rememberMe" />
                  <span>记住我</span>
                </label>
                <a href="#" class="forgot-password" @click.prevent="showForgotPassword">
                  忘记密码？
                </a>
              </div>

              <div class="error-message" v-if="errorMessage">❌ {{ errorMessage }}</div>

              <button type="submit" class="submit-btn" :disabled="loading">
                <span v-if="loading">登录中...</span>
                <span v-else>立即登录</span>
              </button>
            </form>

            <!-- 数据库测试区域 -->
            <div class="debug-area" v-if="showDebug">
              <div class="debug-header">
                <h4>🔧 开发调试</h4>
                <button @click="toggleDebug" class="debug-toggle">
                  {{ showDebug ? '隐藏' : '显示' }}
                </button>
              </div>

              <div class="debug-content">
                <div class="debug-section">
                  <p><strong>后端状态:</strong> {{ connectionStatus }}</p>
                  <button @click="testConnection" class="debug-btn">测试数据库连接</button>
                </div>

                <div class="debug-section" v-if="testUsers.length > 0">
                  <p><strong>测试账号（数据库）:</strong></p>
                  <div class="test-users">
                    <div
                      v-for="user in testUsers"
                      :key="user.username"
                      class="test-user"
                      @click="fillTestAccount(user)"
                    >
                      <span>{{ user.roleName }}:</span>
                      <code>{{ user.username }} / {{ user.password }}</code>
                    </div>
                  </div>
                </div>

                <div class="debug-info">
                  <p>🔗 后端地址: http://localhost:3002</p>
                  <p>🗄️ 数据库: research_system</p>
                </div>
              </div>
            </div>

            <!-- 注册提示 -->
            <div class="register-tip">
              <p>还没有账号？</p>
              <router-link to="/register" class="register-link"> 立即注册 → </router-link>
            </div>
          </div>
        </div>

        <!-- 底部信息 -->
        <div class="login-footer">
          <div class="footer-links">
            <a href="#" @click.prevent="contactSupport">技术支持</a>
            <span class="divider">|</span>
            <a href="#" @click.prevent="viewDocument">使用文档</a>
            <span class="divider">|</span>
            <a href="#" @click.prevent="privacyPolicy">隐私政策</a>
          </div>
          <p class="copyright">© 2025 科研项目管理系统 v2.0</p>
        </div>
      </div>
    </div>

    <!-- 加载遮罩 -->
    <div class="loading-overlay" v-if="loading">
      <div class="loading-spinner"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import request from '@/utils/request'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const showLoginForm = ref(false)
const selectedRole = ref('applicant')
const rememberMe = ref(false)
const showPassword = ref(false)
const showDebug = ref(import.meta.env.DEV)
const errorMessage = ref('')
const connectionStatus = ref('')
const testUsers = ref([])

// 登录表单数据
const loginForm = ref({
  username: '',
  password: '',
})

// 角色定义（与数据库中的 role 字段对应）
const roles = [
  {
    value: 'applicant',
    name: '项目申请人',
    icon: '📝',
    desc: '申报和管理科研项目',
    field: 'username',
    placeholder: '请输入用户名/工号',
  },
  {
    value: 'reviewer',
    name: '评审专家',
    icon: '⭐',
    desc: '评审项目申报材料',
    field: 'username',
    placeholder: '请输入专家用户名',
  },
  {
    value: 'assistant',
    name: '科研助理',
    icon: '🏛️',
    desc: '审核项目及经费',
    field: 'username',
    placeholder: '请输入助理用户名',
  },
  {
    value: 'admin',
    name: '系统管理员',
    icon: '🔧',
    desc: '系统管理和配置',
    field: 'username',
    placeholder: '请输入管理员账号',
  },
]

// 计算属性
const currentRole = computed(() => {
  return roles.find((role) => role.value === selectedRole.value)
})

const usernameLabel = computed(() => {
  return currentRole.value?.name === '系统管理员' ? '管理员账号' : '用户名'
})

const usernamePlaceholder = computed(() => {
  return currentRole.value?.placeholder || '请输入用户名'
})

// 方法
const selectRole = (role) => {
  selectedRole.value = role
  loginForm.value.username = ''
  loginForm.value.password = ''
  errorMessage.value = ''
}

const clearError = () => {
  errorMessage.value = ''
}

// 处理登录
const handleLogin = async () => {
  if (!loginForm.value.username || !loginForm.value.password) {
    errorMessage.value = '请输入用户名和密码'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    console.log('正在登录...', {
      role: selectedRole.value,
      username: loginForm.value.username,
    })

    // 调用后端登录接口
    const response = await axios.post('http://localhost:3002/api/auth/login', {
      username: loginForm.value.username,
      password: loginForm.value.password,
      role: selectedRole.value,
    })

    console.log('登录响应:', response.data)

    if (response.data.success) {
      // 保存用户信息
      const userData = response.data.user
      const token = response.data.token

      // 根据"记住我"选项选择存储方式
      const storage = rememberMe.value ? localStorage : sessionStorage

      // 保存 token
      storage.setItem('token', token)
      localStorage.setItem('token', token) // 同时在 localStorage 存一份用于开发调试

      // 保存用户信息（与 DashboardRedirect 兼容）
      localStorage.setItem('userRole', userData.role)
      localStorage.setItem('userName', userData.username)
      localStorage.setItem('userId', userData.id)
      localStorage.setItem('userEmail', userData.email || '')
      localStorage.setItem('loginTime', new Date().toISOString())

      // 保存完整信息
      localStorage.setItem(
        'userInfo',
        JSON.stringify({
          id: userData.id,
          username: userData.username,
          email: userData.email,
          role: userData.role,
          name: userData.name,
          department: userData.department,
          loginTime: new Date().toISOString(),
        }),
      )

      console.log('✅ 登录成功，用户信息已保存:', {
        role: userData.role,
        username: userData.username,
        id: userData.id,
      })

      // 显示成功消息
      showSuccessMessage(userData.name || userData.username)

      // 跳转到 DashboardRedirect
      setTimeout(() => {
        router.push('/dashboard')
      }, 800)
    } else {
      errorMessage.value = response.data.error || '登录失败，请检查用户名和密码'
    }
  } catch (error) {
    console.error('登录失败:', error)

    // 详细的错误处理
    if (error.response) {
      switch (error.response.status) {
        case 401:
          errorMessage.value = '用户名或密码错误'
          break
        case 404:
          errorMessage.value = '登录接口不存在，请检查后端服务'
          break
        case 500:
          errorMessage.value = '服务器内部错误，请联系管理员'
          break
        default:
          errorMessage.value = `登录失败 (${error.response.status})`
      }
    } else if (error.request) {
      errorMessage.value = '无法连接到服务器，请检查：\n1. 后端服务是否启动\n2. 网络连接是否正常'
    } else {
      errorMessage.value = '请求配置错误: ' + error.message
    }
  } finally {
    loading.value = false
  }
  // 登录成功后，在 handleLogin 方法中添加
  if (response.data.success) {
    const userData = response.data.user
    const token = response.data.token

    console.log('✅ 登录成功，Token:', token)
    console.log('✅ 用户信息:', userData)

    // 确保token是字符串格式
    if (typeof token !== 'string') {
      console.error('Token格式错误:', token)
      errorMessage.value = '登录失败：Token格式错误'
      return
    }

    // 保存token到多个地方确保可用
    localStorage.setItem('token', token.trim())
    sessionStorage.setItem('token', token.trim())

    // 保存用户信息
    localStorage.setItem('userRole', userData.role || selectedRole.value)
    localStorage.setItem('userName', userData.username || userData.name || loginForm.value.username)
    localStorage.setItem('userId', userData.id || userData.userId || '')
    localStorage.setItem('userEmail', userData.email || '')
    localStorage.setItem('loginTime', new Date().toISOString())

    // 保存完整信息
    localStorage.setItem(
      'userInfo',
      JSON.stringify({
        id: userData.id || userData.userId,
        username: userData.username,
        email: userData.email,
        role: userData.role,
        name: userData.name,
        token: token.trim(), // 同时保存在userInfo中
      }),
    )

    // 立即测试token是否有效
    await testTokenValidity(token.trim())

    // 显示成功消息
    showSuccessMessage(userData.name || userData.username || loginForm.value.username)

    // 延迟跳转，确保数据保存完成
    setTimeout(() => {
      router.push('/dashboard')
    }, 1000)
  }
}

// 显示成功消息
const showSuccessMessage = (username) => {
  // 创建并显示自定义提示
  const successDiv = document.createElement('div')
  successDiv.className = 'success-message'
  successDiv.innerHTML = `
    <div class="success-content">
      <div class="success-icon">✅</div>
      <div class="success-text">
        <h4>登录成功！</h4>
        <p>欢迎 ${username}，正在跳转...</p>
      </div>
    </div>
  `

  // 添加样式
  successDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    border-left: 4px solid #52c41a;
    animation: slideIn 0.3s ease;
  `

  document.body.appendChild(successDiv)

  // 3秒后自动移除
  setTimeout(() => {
    successDiv.style.animation = 'slideOut 0.3s ease'
    setTimeout(() => successDiv.remove(), 300)
  }, 2500)
}

// 测试数据库连接
const testConnection = async () => {
  try {
    connectionStatus.value = '正在测试连接...'

    // 测试数据库连接
    const response = await request.get('/api/db/test')
    console.log('response:', response)
    console.log('response.data:', response.data)
    if (response.success) {
      connectionStatus.value = '✅ 数据库连接正常'

      // 获取用户数据用于测试（如果接口可用）
      try {
        const token = localStorage.getItem('token')
        const usersResponse = await axios.get('http://localhost:3002/api/users?limit=5', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })

        if (usersResponse.data.success && usersResponse.data.data) {
          testUsers.value = usersResponse.data.data.map((user) => ({
            username: user.username,
            password: '********', // 实际密码不显示
            role: user.role,
            roleName: getRoleName(user.role),
          }))
        }
      } catch (usersError) {
        // 用户数据获取失败不影响主连接测试
        console.log('用户数据获取失败（可能需要登录）:', usersError.message)
      }
    } else {
      connectionStatus.value = '❌ 1数据库连接失败'
    }
  } catch (error) {
    console.error('连接测试失败:', error)
    connectionStatus.value = '❌ 无法连接到后端服务'
  }
}

// 填充测试账号
const fillTestAccount = (user) => {
  loginForm.value.username = user.username
  loginForm.value.password = 'test123' // 显示预设的测试密码

  // 根据角色自动选择对应的身份
  const roleMatch = roles.find((r) => r.value === user.role)
  if (roleMatch) {
    selectedRole.value = user.role
  }
}

// 切换调试面板
const toggleDebug = () => {
  showDebug.value = !showDebug.value
  if (showDebug.value) {
    testConnection()
  }
}

// 获取角色名称
const getRoleName = (role) => {
  const roleMap = {
    applicant: '项目申请人',
    reviewer: '评审专家',
    assistant: '科研助理',
    admin: '系统管理员',
  }
  return roleMap[role] || role
}

const showForgotPassword = () => {
  alert(
    '如需重置密码，请联系系统管理员：\n📞 技术支持：400-123-4567\n📧 邮箱：support@research.edu.cn',
  )
}

const contactSupport = () => {
  alert('技术支持热线：400-123-4567\n工作时间：周一至周五 9:00-18:00\n紧急联系：138-0013-8000')
}

const viewDocument = () => {
  window.open('/docs/user-manual.pdf', '_blank')
}

const privacyPolicy = () => {
  window.open('/privacy-policy', '_blank')
}

// 组件挂载时
onMounted(() => {
  // 如果有记住的用户名，自动填充
  const savedUsername = localStorage.getItem('lastUsername')
  if (savedUsername) {
    loginForm.value.username = savedUsername
    rememberMe.value = true
  }

  // 开发环境自动测试连接
  if (import.meta.env.DEV) {
    setTimeout(() => {
      testConnection()
    }, 1000)
  }
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-wrapper {
  display: flex;
  max-width: 1200px;
  width: 100%;
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  min-height: 700px;
}

/* 左侧区域 */
.login-left {
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 40px;
  display: flex;
  flex-direction: column;
}

.brand-section {
  margin-bottom: 50px;
}

.system-title {
  font-size: 36px;
  font-weight: bold;
  margin-bottom: 10px;
}

.system-subtitle {
  font-size: 16px;
  opacity: 0.9;
}

.features {
  flex: 1;
}

.feature-card {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  backdrop-filter: blur(10px);
  transition: transform 0.3s ease;
}

.feature-card:hover {
  transform: translateX(10px);
  background: rgba(255, 255, 255, 0.15);
}

.feature-icon {
  font-size: 32px;
  margin-right: 20px;
}

.feature-content h3 {
  font-size: 18px;
  margin-bottom: 5px;
}

.feature-content p {
  font-size: 14px;
  opacity: 0.8;
  margin: 0;
}

.stats {
  display: flex;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 30px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 24px;
  font-weight: bold;
}

.stat-label {
  font-size: 14px;
  opacity: 0.8;
}

/* 右侧区域 */
.login-right {
  flex: 1;
  padding: 40px;
  display: flex;
  flex-direction: column;
}

.login-card {
  flex: 1;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.login-header h2 {
  font-size: 32px;
  color: #333;
  margin-bottom: 10px;
}

.login-header p {
  color: #666;
  font-size: 16px;
}

/* 角色选择 */
.role-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 30px;
}

.role-card {
  border: 2px solid #e8e8e8;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
}

.role-card:hover {
  border-color: #1890ff;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(24, 144, 255, 0.1);
}

.role-card.active {
  border-color: #1890ff;
  background: #f0f9ff;
}

.role-icon {
  font-size: 32px;
  margin-right: 15px;
}

.role-info h4 {
  margin: 0 0 5px 0;
  color: #333;
  font-size: 16px;
}

.role-info p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.next-btn {
  width: 100%;
  padding: 16px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s;
}

.next-btn:hover:not(:disabled) {
  background: #40a9ff;
}

.next-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* 登录表单 */
.form-header {
  display: flex;
  align-items: center;
  margin-bottom: 30px;
}

.back-btn {
  background: none;
  border: none;
  color: #1890ff;
  font-size: 16px;
  cursor: pointer;
  padding: 8px 16px;
  margin-right: 20px;
  border-radius: 6px;
}

.back-btn:hover {
  background: #f0f0f0;
}

.form-header h3 {
  margin: 0;
  color: #333;
  font-size: 24px;
}

.form-group {
  margin-bottom: 25px;
  position: relative;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #555;
  font-weight: 500;
  font-size: 15px;
}

.label-icon {
  margin-right: 8px;
}

.form-group input {
  width: 100%;
  padding: 14px 45px 14px 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  transition: border 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
}

.toggle-password {
  position: absolute;
  right: 15px;
  top: 42px;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  opacity: 0.5;
}

.toggle-password:hover {
  opacity: 1;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  cursor: pointer;
}

.remember-me input {
  width: 16px;
  height: 16px;
}

.forgot-password {
  color: #1890ff;
  text-decoration: none;
  font-size: 14px;
}

.forgot-password:hover {
  text-decoration: underline;
}

.error-message {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  color: #ff4d4f;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
  line-height: 1.4;
}

.submit-btn {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition:
    transform 0.3s,
    box-shadow 0.3s;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 调试区域 */
.debug-area {
  margin-top: 30px;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  overflow: hidden;
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
}

.debug-header h4 {
  margin: 0;
  color: #333;
}

.debug-toggle {
  padding: 6px 12px;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.debug-content {
  padding: 20px;
}

.debug-section {
  margin-bottom: 20px;
}

.debug-section p {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #666;
}

.debug-btn {
  padding: 8px 16px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.debug-btn:hover {
  background: #40a9ff;
}

.test-users {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.test-user {
  padding: 10px;
  background: #f5f5f5;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;
  font-size: 13px;
}

.test-user:hover {
  background: #e8e8e8;
}

.test-user span {
  font-weight: bold;
  margin-right: 10px;
  color: #333;
}

.test-user code {
  background: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.debug-info {
  margin-top: 20px;
  padding: 15px;
  background: #f0f9ff;
  border-radius: 8px;
  font-size: 13px;
  color: #666;
}

.debug-info p {
  margin: 5px 0;
}

/* 注册提示 */
.register-tip {
  margin-top: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #fdfcfb 0%, #e2d1c3 100%);
  border-radius: 12px;
  text-align: center;
}

.register-tip p {
  margin: 0 0 15px 0;
  color: #8b4513;
  font-weight: bold;
}

.register-link {
  display: inline-block;
  padding: 10px 25px;
  background: #8b4513;
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-weight: bold;
  transition: all 0.3s;
}

.register-link:hover {
  background: #a0522d;
  transform: translateY(-2px);
}

/* 底部信息 */
.login-footer {
  margin-top: 30px;
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.footer-links {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 10px;
}

.footer-links a {
  color: #666;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.3s;
}

.footer-links a:hover {
  color: #1890ff;
}

.divider {
  color: #ddd;
}

.copyright {
  color: #999;
  font-size: 13px;
  margin: 0;
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
  z-index: 1000;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 成功消息动画 */
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

/* 响应式设计 */
@media (max-width: 992px) {
  .login-wrapper {
    flex-direction: column;
    max-width: 500px;
  }

  .login-left {
    padding: 30px;
  }

  .system-title {
    font-size: 28px;
  }

  .role-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 576px) {
  .login-container {
    padding: 10px;
  }

  .login-left,
  .login-right {
    padding: 20px;
  }

  .feature-card {
    flex-direction: column;
    text-align: center;
  }

  .feature-icon {
    margin-right: 0;
    margin-bottom: 10px;
  }

  .stats {
    flex-direction: column;
    gap: 20px;
  }

  .footer-links {
    flex-direction: column;
    gap: 10px;
  }

  .divider {
    display: none;
  }
}
</style>
