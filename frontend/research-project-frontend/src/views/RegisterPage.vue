<!-- src/views/RegisterPage.vue -->
<template>
  <div class="register-container">
    <div class="register-box">
      <h2>用户注册</h2>

      <div class="step-indicator">
        <div class="step" :class="{ active: currentStep === 1, completed: currentStep > 1 }">
          <span class="step-number">1</span>
          <span class="step-text">选择身份</span>
        </div>
        <div class="step-line"></div>
        <div class="step" :class="{ active: currentStep === 2, completed: currentStep > 2 }">
          <span class="step-number">2</span>
          <span class="step-text">填写信息</span>
        </div>
        <div class="step-line"></div>
        <div class="step" :class="{ active: currentStep === 3 }">
          <span class="step-number">3</span>
          <span class="step-text">完成注册</span>
        </div>
      </div>

      <!-- 步骤1：选择身份 -->
      <div v-if="currentStep === 1" class="step-content">
        <h3>请选择您的身份</h3>
        <p class="step-description">请根据您的实际情况选择身份类型</p>

        <div class="type-grid">
          <div
            v-for="type in registerUserTypes"
            :key="type.value"
            class="type-card"
            :class="{ selected: formData.role === type.value }"
            @click="selectRole(type.value)"
          >
            <div class="type-icon">{{ type.icon }}</div>
            <div class="type-name">{{ type.name }}</div>
            <div class="type-requirements">
              <small>{{ type.requirements }}</small>
            </div>
          </div>
        </div>

        <div class="step-actions">
          <button class="btn secondary" @click="goToLogin">返回登录</button>
          <button class="btn primary" @click="nextStep" :disabled="!formData.role">下一步</button>
        </div>
      </div>

      <!-- 步骤2：填写信息 -->
      <div v-if="currentStep === 2" class="step-content">
        <h3>填写个人信息</h3>

        <form @submit.prevent="nextStep" class="register-form">
          <div class="form-row">
            <div class="form-group">
              <label>用户名 <span class="required">*</span></label>
              <input
                type="text"
                v-model="formData.username"
                :placeholder="usernamePlaceholder"
                required
                @blur="checkUsername"
              />
              <div v-if="usernameError" class="error-message">{{ usernameError }}</div>
              <div v-if="usernameAvailable" class="success-message">✓ 用户名可用</div>
            </div>

            <div class="form-group">
              <label>工号/学号 <span class="required">*</span></label>
              <input
                type="text"
                v-model="formData.employeeId"
                :placeholder="idPlaceholder"
                required
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>真实姓名 <span class="required">*</span></label>
              <input
                type="text"
                v-model="formData.realName"
                placeholder="请输入真实姓名"
                required
              />
            </div>

            <div class="form-group">
              <label>邮箱 <span class="required">*</span></label>
              <input
                type="email"
                v-model="formData.email"
                placeholder="请输入邮箱"
                required
                @blur="validateEmail"
              />
              <div v-if="emailError" class="error-message">{{ emailError }}</div>
            </div>
          </div>

          <div class="form-group">
            <label>所属学院/部门</label>
            <select v-model="formData.college" class="form-select">
              <option value="">请选择学院/部门</option>
              <option v-for="college in colleges" :key="college" :value="college">
                {{ college }}
              </option>
            </select>
          </div>

          <div v-if="formData.role === 'REVIEWER'" class="form-group">
            <label>职称/头衔</label>
            <select v-model="formData.title" class="form-select">
              <option value="">请选择职称</option>
              <option value="教授">教授</option>
              <option value="副教授">副教授</option>
              <option value="研究员">研究员</option>
              <option value="副研究员">副研究员</option>
              <option value="高级工程师">高级工程师</option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>密码 <span class="required">*</span></label>
              <input
                type="password"
                v-model="formData.password"
                placeholder="请输入密码（至少6位）"
                required
                @input="validatePassword"
              />
              <div class="password-strength" :class="passwordStrength.class">
                密码强度：{{ passwordStrength.text }}
              </div>
            </div>

            <div class="form-group">
              <label>确认密码 <span class="required">*</span></label>
              <input
                type="password"
                v-model="formData.confirmPassword"
                placeholder="请再次输入密码"
                required
                @blur="validateConfirmPassword"
              />
              <div v-if="confirmPasswordError" class="error-message">
                {{ confirmPasswordError }}
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.agreeTerms" required />
              我已阅读并同意 <a href="#" @click.prevent="showTerms = true">《用户协议》</a> 和
              <a href="#" @click.prevent="showPrivacy = true">《隐私政策》</a>
            </label>
          </div>

          <div class="step-actions">
            <button type="button" class="btn secondary" @click="prevStep">上一步</button>
            <button type="submit" class="btn primary" :disabled="!canProceedToStep3 || loading">
              <span v-if="loading">处理中...</span>
              <span v-else>下一步</span>
            </button>
          </div>
        </form>
      </div>

      <!-- 步骤3：完成注册 -->
      <div v-if="currentStep === 3" class="step-content success-step">
        <div class="success-icon">✅</div>
        <h3>注册成功！</h3>
        <p class="success-message">
          恭喜您，{{ formData.realName }}（{{ selectedRoleName }}），注册成功！
        </p>

        <div class="user-summary">
          <div class="summary-item">
            <span class="label">用户名：</span>
            <span class="value">{{ formData.username }}</span>
          </div>
          <div class="summary-item">
            <span class="label">用户角色：</span>
            <span class="value">{{ selectedRoleName }}</span>
          </div>
          <div v-if="formData.college" class="summary-item">
            <span class="label">所属学院：</span>
            <span class="value">{{ formData.college }}</span>
          </div>
          <div class="summary-item">
            <span class="label">注册时间：</span>
            <span class="value">{{ new Date().toLocaleString() }}</span>
          </div>
        </div>

        <div class="next-steps">
          <h4>下一步操作：</h4>
          <ul>
            <li v-if="formData.role === 'APPLICANT'">✓ 可以开始申报科研项目</li>
            <li v-if="formData.role === 'REVIEWER'">✓ 等待管理员分配评审任务</li>
            <li v-if="formData.role === 'ASSISTANT'">✓ 可以审核项目申报材料</li>
            <li v-if="formData.role === 'ADMIN'">✓ 可以进行系统管理配置</li>
            <li>✓ 建议完善个人信息</li>
          </ul>
        </div>

        <div class="step-actions">
          <button class="btn secondary" @click="goToLogin">返回登录</button>
          <button class="btn primary" @click="goToDashboard" :disabled="loading">
            <span v-if="loading">处理中...</span>
            <span v-else>进入系统</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 底部链接 -->
    <div class="footer-links">
      <p>已有账号？<router-link to="/login">立即登录</router-link></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authAPI } from '@/api/auth'

const router = useRouter()
const currentStep = ref(1)
const usernameError = ref('')
const emailError = ref('')
const confirmPasswordError = ref('')
const usernameAvailable = ref(false)
const showTerms = ref(false)
const showPrivacy = ref(false)
const loading = ref(false)

// 表单数据
const formData = reactive({
  role: '',
  username: '',
  employeeId: '',
  realName: '',
  email: '',
  college: '',
  title: '',
  password: '',
  confirmPassword: '',
  agreeTerms: false,
})

// 用户类型定义（注册专用）
const registerUserTypes = [
  {
    value: 'APPLICANT',
    name: '项目申请人',
    icon: '📝',
    requirements: '需提供真实姓名和学号/工号',
  },
  {
    value: 'REVIEWER',
    name: '评审专家',
    icon: '⭐',
    requirements: '需提供职称和所属学院',
  },
  {
    value: 'ASSISTANT',
    name: '学院科研助理',
    icon: '🏛️',
    requirements: '需提供工号和所属学院',
  },
  {
    value: 'ADMIN',
    name: '系统管理员',
    icon: '🔧',
    requirements: '仅限系统管理员申请',
  },
]

// 学院列表
const colleges = [
  '计算机科学与技术学院',
  '电子信息工程学院',
  '机械工程学院',
  '材料科学与工程学院',
  '理学院',
  '经济管理学院',
  '人文社会科学学院',
  '医学院',
  '科研处',
  '教务处',
]

// 计算属性
const selectedRoleName = computed(() => {
  const type = registerUserTypes.find((t) => t.value === formData.role)
  return type ? type.name : ''
})

const usernamePlaceholder = computed(() => {
  switch (formData.role) {
    case 'APPLICANT':
      return '请输入学号（如：20210001）'
    case 'REVIEWER':
      return '请输入专家工号'
    case 'ASSISTANT':
      return '请输入助理工号'
    case 'ADMIN':
      return '请输入管理员账号'
    default:
      return '请输入用户名'
  }
})

const idPlaceholder = computed(() => {
  switch (formData.role) {
    case 'APPLICANT':
      return '请输入学号'
    case 'REVIEWER':
      return '请输入教师工号'
    case 'ASSISTANT':
      return '请输入职工号'
    case 'ADMIN':
      return '请输入管理员编号'
    default:
      return '请输入编号'
  }
})

const passwordStrength = computed(() => {
  const password = formData.password
  if (!password) return { class: '', text: '' }

  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 2) return { class: 'weak', text: '弱' }
  if (score <= 4) return { class: 'medium', text: '中' }
  return { class: 'strong', text: '强' }
})

const canProceedToStep3 = computed(() => {
  return (
    formData.username &&
    formData.employeeId &&
    formData.realName &&
    formData.email &&
    formData.password &&
    formData.confirmPassword &&
    formData.agreeTerms &&
    !usernameError.value &&
    !emailError.value &&
    !confirmPasswordError.value
  )
})

// 方法
const selectRole = (role: string) => {
  formData.role = role
  // 根据角色自动生成默认用户名
  if (!formData.username) {
    const prefixes = {
      APPLICANT: 'S',
      REVIEWER: 'E',
      ASSISTANT: 'A',
      ADMIN: 'M',
    }
    formData.username = `${prefixes[role]}${Math.floor(1000 + Math.random() * 9000)}`
  }
}

const checkUsername = async () => {
  if (!formData.username) {
    usernameError.value = '用户名不能为空'
    usernameAvailable.value = false
    return
  }

  if (formData.username.length < 4) {
    usernameError.value = '用户名至少4个字符'
    usernameAvailable.value = false
    return
  }

  try {
    // 调用后端API检查用户名是否可用
    // 这里先设置为可用，因为后端可能没有这个接口
    usernameError.value = ''
    usernameAvailable.value = true

    // 如果需要后端验证，可以这样：
    // const response = await authAPI.checkUsername({ username: formData.username })
    // if (response.exists) {
    //   usernameError.value = '用户名已存在'
    //   usernameAvailable.value = false
    // } else {
    //   usernameError.value = ''
    //   usernameAvailable.value = true
    // }
  } catch (error) {
    console.error('检查用户名失败:', error)
    usernameError.value = ''
    usernameAvailable.value = true // 发生错误时默认可用
  }
}

const validateEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(formData.email)) {
    emailError.value = '请输入有效的邮箱地址'
  } else {
    emailError.value = ''
  }
}

const validatePassword = () => {
  if (formData.password.length < 6) {
    // 错误信息在模板中通过 passwordStrength 显示
    return
  }
}

const validateConfirmPassword = () => {
  if (formData.password !== formData.confirmPassword) {
    confirmPasswordError.value = '两次输入的密码不一致'
  } else {
    confirmPasswordError.value = ''
  }
}

const saveUser = async () => {
  loading.value = true

  try {
    // 准备发送到后端的数据
    const userData = {
      username: formData.username,
      password: formData.password,
      email: formData.email,
      role: formData.role,
      name: formData.realName,
      employeeId: formData.employeeId,
      college: formData.college,
      title: formData.title,
    }

    console.log('正在注册用户:', userData)

    // 调用后端注册API
    const response = await authAPI.register(userData)

    if (response.success) {
      console.log('✅ 注册成功:', response)

      // 保存token和用户信息
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      localStorage.setItem('userRole', response.user.role)
      localStorage.setItem('userName', response.user.name || response.user.username)
      localStorage.setItem('userId', response.user.id)

      // 保存其他信息
      if (formData.college) {
        localStorage.setItem('userCollege', formData.college)
      }
      if (formData.employeeId) {
        localStorage.setItem('userEmployeeId', formData.employeeId)
      }

      ElMessage.success('注册成功！')
      return true
    } else {
      console.error('❌ 注册失败:', response.error)
      ElMessage.error(response.error || '注册失败')
      return false
    }
  } catch (error: any) {
    console.error('注册API调用失败:', error)

    let errorMessage = '注册失败'
    if (error.response) {
      const status = error.response.status
      const data = error.response.data

      switch (status) {
        case 400:
          errorMessage = data?.error || '请求参数错误'
          break
        case 409:
          errorMessage = data?.error || '用户名或邮箱已存在'
          break
        case 500:
          errorMessage = data?.error || '服务器内部错误'
          break
        default:
          errorMessage = data?.error || `注册失败 (${status})`
      }
    } else if (error.request) {
      errorMessage = '无法连接到服务器，请检查：\n1. 后端服务是否启动\n2. 网络连接是否正常'
    } else {
      errorMessage = error.message || '注册请求失败'
    }

    ElMessage.error(errorMessage)
    return false
  } finally {
    loading.value = false
  }
}

const nextStep = async () => {
  if (currentStep.value === 1 && !formData.role) {
    ElMessage.warning('请选择用户身份')
    return
  }

  if (currentStep.value === 2) {
    // 验证所有必填字段
    if (!canProceedToStep3.value) {
      ElMessage.warning('请填写完整的注册信息')
      return
    }

    // 验证密码是否一致
    if (formData.password !== formData.confirmPassword) {
      ElMessage.error('两次输入的密码不一致')
      return
    }

    // 验证是否同意条款
    if (!formData.agreeTerms) {
      ElMessage.warning('请同意用户协议和隐私政策')
      return
    }

    // 调用真实的后端API保存用户
    const success = await saveUser()
    if (!success) {
      return // 注册失败，停留在当前步骤
    }
  }

  if (currentStep.value < 3) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const goToLogin = () => {
  router.push('/login')
}

const goToDashboard = () => {
  loading.value = true

  // 从localStorage获取用户信息
  const userRole = localStorage.getItem('userRole') || formData.role
  const userName = localStorage.getItem('userName') || formData.realName

  console.log('进入系统，用户角色:', userRole)

  // 根据角色跳转到对应页面
  let dashboardPath = '/dashboard'

  switch (userRole.toUpperCase()) {
    case 'APPLICANT':
      dashboardPath = '/applicant/dashboard'
      break
    case 'REVIEWER':
      dashboardPath = '/reviewer/dashboard'
      break
    case 'ASSISTANT':
      dashboardPath = '/assistant/dashboard'
      break
    case 'ADMIN':
      dashboardPath = '/admin/dashboard'
      break
  }

  console.log('跳转到:', dashboardPath)

  // 使用router跳转
  setTimeout(() => {
    router
      .push(dashboardPath)
      .then(() => {
        console.log('✅ 跳转成功')
      })
      .catch((error) => {
        console.error('❌ router跳转失败:', error)
        // 备用方案：直接修改URL
        window.location.href = dashboardPath
      })
      .finally(() => {
        loading.value = false
      })
  }, 500)
}

// 移除原来的 localStorage 测试数据初始化
onMounted(() => {
  console.log('注册页面加载完成')

  // 开发环境：预填一些测试数据（便于测试）
  if (import.meta.env.DEV) {
    // 可以保留这个方便测试，但注释掉或根据需求启用
    /*
    formData.username = `test_${Date.now().toString().slice(-6)}`
    formData.email = `test${Date.now().toString().slice(-6)}@test.com`
    formData.realName = '测试用户'
    formData.employeeId = `EMP${Date.now().toString().slice(-6)}`
    formData.password = '123456'
    formData.confirmPassword = '123456'
    formData.agreeTerms = true
    */
  }
})
</script>

<style scoped>
.register-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.register-box {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 900px;
  padding: 40px;
  margin-bottom: 20px;
}

h2 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 30px;
  font-size: 28px;
}

.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e0e0e0;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-bottom: 8px;
  transition: all 0.3s;
}

.step-text {
  font-size: 14px;
  color: #999;
  transition: all 0.3s;
}

.step.active .step-number {
  background: #1890ff;
  color: white;
}

.step.active .step-text {
  color: #1890ff;
  font-weight: bold;
}

.step.completed .step-number {
  background: #52c41a;
  color: white;
}

.step.completed .step-text {
  color: #52c41a;
}

.step-line {
  width: 100px;
  height: 2px;
  background: #e0e0e0;
  margin: 0 10px;
  position: relative;
  top: -20px;
}

.step-content {
  min-height: 400px;
}

.step-description {
  text-align: center;
  color: #666;
  margin-bottom: 30px;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.type-card {
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f8f9fa;
}

.type-card:hover {
  border-color: #3498db;
  transform: translateY(-2px);
}

.type-card.selected {
  border-color: #1890ff;
  background: #e6f7ff;
}

.type-icon {
  font-size: 40px;
  margin-bottom: 10px;
}

.type-name {
  font-weight: bold;
  margin-bottom: 8px;
  color: #2c3e50;
}

.type-requirements {
  font-size: 12px;
  color: #7f8c8d;
  line-height: 1.4;
}

.step-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 40px;
}

.btn {
  padding: 12px 30px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn.primary {
  background: #1890ff;
  color: white;
}

.btn.primary:hover:not(:disabled) {
  background: #40a9ff;
}

.btn.primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn.secondary {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #d9d9d9;
}

.btn.secondary:hover {
  background: #e8e8e8;
}

.register-form {
  margin-top: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #34495e;
}

.required {
  color: #ff4d4f;
}

.form-group input,
.form-select {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
  transition: border 0.3s;
}

.form-group input:focus,
.form-select:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.error-message {
  color: #ff4d4f;
  font-size: 12px;
  margin-top: 4px;
}

.success-message {
  color: #52c41a;
  font-size: 12px;
  margin-top: 4px;
}

.password-strength {
  font-size: 12px;
  margin-top: 4px;
}

.password-strength.weak {
  color: #ff4d4f;
}

.password-strength.medium {
  color: #faad14;
}

.password-strength.strong {
  color: #52c41a;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.checkbox-label a {
  color: #1890ff;
  text-decoration: none;
}

.checkbox-label a:hover {
  text-decoration: underline;
}

.success-step {
  text-align: center;
}

.success-icon {
  font-size: 60px;
  margin-bottom: 20px;
}

.success-message {
  font-size: 18px;
  color: #52c41a;
  margin-bottom: 30px;
}

.user-summary {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
  text-align: left;
}

.summary-item {
  margin-bottom: 10px;
  display: flex;
}

.summary-item .label {
  font-weight: bold;
  min-width: 100px;
  color: #666;
}

.summary-item .value {
  color: #2c3e50;
}

.next-steps {
  text-align: left;
  margin-bottom: 30px;
  padding: 20px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 8px;
}

.next-steps h4 {
  margin-top: 0;
  color: #52c41a;
}

.next-steps ul {
  margin: 10px 0 0 0;
  padding-left: 20px;
}

.next-steps li {
  margin-bottom: 5px;
  color: #666;
}

.footer-links {
  text-align: center;
  color: white;
}

.footer-links a {
  color: #1890ff;
  text-decoration: none;
  font-weight: bold;
}

.footer-links a:hover {
  text-decoration: underline;
}
</style>
