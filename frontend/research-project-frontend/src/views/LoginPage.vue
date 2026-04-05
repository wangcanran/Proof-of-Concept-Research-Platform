<template>
  <div class="login-container">
    <!-- 左上角校徽 -->
    <div class="top-logo">
      <img
        src="./picture/university-logo.png"
        alt="人大校徽"
        class="logo"
        @error="handleLogoError"
      />
    </div>

    <!-- 登录表单 - 居中显示 -->
    <div class="login-wrapper">
      <div class="login-card">
        <h2>概念验证平台</h2>
        <p class="subtitle">欢迎登录</p>

        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group">
            <label>用户名</label>
            <input type="text" v-model="loginForm.username" placeholder="请输入用户名" required />
          </div>

          <div class="form-group">
            <label>密码</label>
            <div class="password-input">
              <input
                :type="showPassword ? 'text' : 'password'"
                v-model="loginForm.password"
                placeholder="请输入密码"
                required
              />
              <button type="button" class="toggle-password" @click="showPassword = !showPassword">
                {{ showPassword ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>身份类型</label>
            <select v-model="selectedRole">
              <option value="applicant">项目申请人</option>
              <option value="reviewer">评审专家</option>
              <option value="project_manager">项目经理</option>
              <option value="admin">系统管理员</option>
            </select>
          </div>

          <div class="form-options">
            <label class="remember">
              <input type="checkbox" v-model="rememberMe" />
              记住我
            </label>
            <a href="#" @click.prevent="showForgotPassword">忘记密码？</a>
          </div>

          <div class="error-message" v-if="errorMessage">{{ errorMessage }}</div>

          <button type="submit" class="login-btn" :disabled="loading">
            {{ loading ? '登录中...' : '登 录' }}
          </button>

          <div class="register-link">
            还没有账号？<router-link to="/register">立即注册</router-link>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()

const loading = ref(false)
const showPassword = ref(false)
const rememberMe = ref(false)
const selectedRole = ref('applicant')
const errorMessage = ref('')

const loginForm = ref({
  username: '',
  password: '',
})

const handleLogin = async () => {
  if (!loginForm.value.username || !loginForm.value.password) {
    errorMessage.value = '请输入用户名和密码'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const response = await axios.post('http://localhost:3002/api/auth/login', {
      username: loginForm.value.username,
      password: loginForm.value.password,
      role: selectedRole.value,
    })

    if (response.data.success) {
      const userData = response.data.user
      const token = response.data.token

      const storage = rememberMe.value ? localStorage : sessionStorage
      storage.setItem('token', token)
      localStorage.setItem('token', token)

      localStorage.setItem('userRole', userData.role)
      localStorage.setItem('userName', userData.name || userData.username)
      localStorage.setItem('userId', userData.id)
      localStorage.setItem('userEmail', userData.email || '')

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

      router.push('/dashboard')
    } else {
      errorMessage.value = response.data.error || '登录失败'
    }
  } catch (error: any) {
    console.error('登录失败:', error)
    if (error.response?.status === 401) {
      errorMessage.value = '用户名或密码错误'
    } else if (error.response?.status === 403) {
      errorMessage.value = '账号未激活，请联系管理员'
    } else {
      errorMessage.value = '登录失败，请稍后重试'
    }
  } finally {
    loading.value = false
  }
}

const showForgotPassword = () => {
  alert('请联系管理员重置密码：support@proofofconcept.cn')
}

const handleLogoError = (e: Event) => {
  const img = e.target as HTMLImageElement
  img.src =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23B31B1B"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="white" font-size="40"%3E人大%3C/text%3E%3C/svg%3E'
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: #b31b1b;
  position: relative;
}

.top-logo {
  position: absolute;
  top: 30px;
  left: 40px;
  z-index: 10;
}

.logo {
  width: 200px;
  height: 200px;
  object-fit: contain;
}

.login-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 40px;
}

.login-card {
  background: white;
  border-radius: 16px;
  padding: 50px;
  width: 100%;
  max-width: 450px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.login-card h2 {
  text-align: center;
  color: #b31b1b;
  margin-bottom: 8px;
  font-size: 28px;
}

.subtitle {
  text-align: center;
  color: #666;
  margin-bottom: 30px;
  font-size: 14px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #b31b1b;
  box-shadow: 0 0 0 3px rgba(179, 27, 27, 0.1);
}

.password-input {
  position: relative;
}

.password-input input {
  padding-right: 45px;
}

.toggle-password {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  font-size: 14px;
}

.remember {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #666;
  cursor: pointer;
}

.form-options a {
  color: #b31b1b;
  text-decoration: none;
}

.form-options a:hover {
  text-decoration: underline;
}

.error-message {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  color: #ff4d4f;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
  text-align: center;
}

.login-btn {
  width: 100%;
  padding: 14px;
  background: #b31b1b;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.login-btn:hover:not(:disabled) {
  background: #8b0000;
  transform: translateY(-2px);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.register-link {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: #666;
}

.register-link a {
  color: #b31b1b;
  text-decoration: none;
  font-weight: bold;
}

.register-link a:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .top-logo {
    top: 15px;
    left: 20px;
  }

  .logo {
    width: 100px;
    height: 100px;
  }

  .login-card {
    padding: 30px;
    margin-top: 60px;
  }
}
</style>
