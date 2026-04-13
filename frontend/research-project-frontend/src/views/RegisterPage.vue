<template>
  <div class="register-container">
    <!-- 左上角校徽 -->
    <div class="top-logo">
      <img
        src="./picture/university-logo.png"
        alt="人大校徽"
        class="logo"
        @error="handleLogoError"
      />
    </div>

    <!-- 注册表单 - 居中 -->
    <div class="register-wrapper">
      <div class="register-card">
        <h2>概念验证平台</h2>
        <p class="subtitle">用户注册</p>

        <div class="step-indicator">
          <div class="step" :class="{ active: currentStep === 1, completed: currentStep > 1 }">
            <span class="step-num">1</span>
            <span>选择身份</span>
          </div>
          <div class="step-line"></div>
          <div class="step" :class="{ active: currentStep === 2, completed: currentStep > 2 }">
            <span class="step-num">2</span>
            <span>填写信息</span>
          </div>
          <div class="step-line"></div>
          <div class="step" :class="{ active: currentStep === 3 }">
            <span class="step-num">3</span>
            <span>完成</span>
          </div>
        </div>

        <!-- 步骤1：选择身份 -->
        <div v-if="currentStep === 1" class="step-content">
          <div class="role-grid">
            <div
              v-for="role in registerRoles"
              :key="role.value"
              class="role-card"
              :class="{ selected: formData.role === role.value }"
              @click="selectRole(role.value)"
            >
              <div class="role-icon">{{ role.icon }}</div>
              <div class="role-name">{{ role.name }}</div>
            </div>
          </div>
          <div class="step-actions">
            <button class="btn secondary" @click="goToLogin">返回登录</button>
            <button class="btn primary" @click="nextStep" :disabled="!formData.role">下一步</button>
          </div>
        </div>

        <!-- 步骤2：填写信息 -->
        <div v-if="currentStep === 2" class="step-content">
          <form @submit.prevent="nextStep" class="register-form">
            <div class="form-group">
              <label>用户名 <span class="required">*</span></label>
              <input type="text" v-model="formData.username" placeholder="请输入用户名" required />
            </div>

            <div class="form-group">
              <label>真实姓名 <span class="required">*</span></label>
              <input type="text" v-model="formData.name" placeholder="请输入真实姓名" required />
            </div>

            <div class="form-group">
              <label>邮箱 <span class="required">*</span></label>
              <input type="email" v-model="formData.email" placeholder="请输入邮箱" required />
            </div>

            <div class="form-group">
              <label>密码 <span class="required">*</span></label>
              <div class="password-input">
                <input
                  :type="showPassword ? 'text' : 'password'"
                  v-model="formData.password"
                  placeholder="至少6位"
                  required
                />
                <button type="button" class="toggle-password" @click="showPassword = !showPassword">
                  {{ showPassword ? '🙈' : '👁️' }}
                </button>
              </div>
            </div>

            <div class="form-group">
              <label>确认密码 <span class="required">*</span></label>
              <div class="password-input">
                <input
                  :type="showConfirmPassword ? 'text' : 'password'"
                  v-model="formData.confirmPassword"
                  placeholder="请再次输入密码"
                  required
                />
                <button
                  type="button"
                  class="toggle-password"
                  @click="showConfirmPassword = !showConfirmPassword"
                >
                  {{ showConfirmPassword ? '🙈' : '👁️' }}
                </button>
              </div>
              <div v-if="passwordMismatch" class="error-message">两次密码不一致</div>
            </div>

            <div class="form-group">
              <label>所属部门</label>
              <input type="text" v-model="formData.department" placeholder="请输入所属部门" />
            </div>

            <div v-if="needsInvitationCode" class="form-group">
              <label>邀请码 <span class="required">*</span></label>
              <input
                type="text"
                v-model="formData.invitationCode"
                placeholder="请输入管理员发放的邀请码"
                required
              />
              <p class="field-hint">
                评审专家与项目经理须凭有效邀请码注册（由系统管理员或项目经理在「邀请码管理」中生成），邀请码与所选身份须一致。
              </p>
            </div>

            <div class="form-group">
              <label class="checkbox">
                <input type="checkbox" v-model="formData.agreeTerms" required />
                我已阅读并同意《用户协议》
              </label>
            </div>

            <div class="error-message" v-if="registerError">{{ registerError }}</div>

            <div class="step-actions">
              <button type="button" class="btn secondary" @click="prevStep">上一步</button>
              <button type="submit" class="btn primary" :disabled="!canRegister || registerLoading">
                {{ registerLoading ? '注册中...' : '注册' }}
              </button>
            </div>
          </form>
        </div>

        <!-- 步骤3：完成 -->
        <div v-if="currentStep === 3" class="step-content success-step">
          <div class="success-icon">✅</div>
          <h3>注册成功！</h3>
          <p>{{ successMessage }}</p>
          <div class="step-actions">
            <button class="btn primary" @click="goToLogin">返回登录</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import request from '@/utils/request'

const router = useRouter()

const currentStep = ref(1)
const registerLoading = ref(false)
const registerError = ref('')
const successMessage = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)

const formData = ref({
  role: '',
  username: '',
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  department: '',
  invitationCode: '',
  agreeTerms: false,
})

/** 自助注册可选身份（系统管理员仅可由超级管理员在后台创建，不提供自助注册） */
const registerRoles = [
  { value: 'applicant', name: '项目申请人', icon: '📝' },
  { value: 'reviewer', name: '评审专家', icon: '⭐' },
  { value: 'project_manager', name: '项目经理', icon: '📊' },
]

const passwordMismatch = computed(() => {
  return (
    formData.value.password &&
    formData.value.confirmPassword &&
    formData.value.password !== formData.value.confirmPassword
  )
})

const needsInvitationCode = computed(
  () =>
    formData.value.role === 'reviewer' || formData.value.role === 'project_manager',
)

const canRegister = computed(() => {
  const base =
    formData.value.username &&
    formData.value.name &&
    formData.value.email &&
    formData.value.password &&
    formData.value.confirmPassword &&
    !passwordMismatch.value &&
    formData.value.agreeTerms
  if (!base) return false
  if (needsInvitationCode.value && !String(formData.value.invitationCode || '').trim()) {
    return false
  }
  return true
})

const selectRole = (role: string) => {
  formData.value.role = role
  if (role !== 'reviewer' && role !== 'project_manager') {
    formData.value.invitationCode = ''
  }
}

const nextStep = async () => {
  if (currentStep.value === 1 && !formData.value.role) {
    registerError.value = '请选择用户身份'
    return
  }

  if (currentStep.value === 2) {
    if (needsInvitationCode.value && !String(formData.value.invitationCode || '').trim()) {
      registerError.value = '注册评审专家或项目经理必须填写邀请码'
      return
    }
    if (!canRegister.value) {
      registerError.value = '请填写完整的注册信息'
      return
    }

    registerLoading.value = true
    registerError.value = ''

    try {
      // 与登录等接口一致：使用 VITE_API_BASE_URL（生产构建为服务器地址，勿写死 localhost）
      const data = (await request.post('/api/auth/register', {
        username: formData.value.username,
        password: formData.value.password,
        name: formData.value.name,
        email: formData.value.email,
        department: formData.value.department,
        invitationCode: formData.value.invitationCode,
        role: formData.value.role,
      })) as { success?: boolean; message?: string; error?: string }

      if (data.success) {
        successMessage.value = data.message || '注册成功！请等待管理员审核'
        currentStep.value = 3
      } else {
        registerError.value = data.error || '注册失败'
      }
    } catch (error: any) {
      console.error('注册失败:', error)
      const apiErr =
        error.response?.data?.error ||
        error.response?.data?.message ||
        (typeof error.response?.data === 'string' ? error.response.data : '')
      if (apiErr) {
        registerError.value = apiErr
      } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        registerError.value =
          '无法连接接口：请确认已用正确的 VITE_API_BASE_URL 执行 npm run build，且 Nginx 已反代 /api 到后端'
      } else {
        registerError.value = error.message || '注册失败，请稍后重试'
      }
    } finally {
      registerLoading.value = false
    }
    return
  }

  if (currentStep.value < 3) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
    registerError.value = ''
  }
}

const goToLogin = () => {
  router.push('/login')
}

const handleLogoError = (e: Event) => {
  const img = e.target as HTMLImageElement
  img.src =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23B31B1B"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="white" font-size="40"%3E人大%3C/text%3E%3C/svg%3E'
}
</script>

<style scoped>
.register-container {
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

.register-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 40px;
}

.register-card {
  background: white;
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 550px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.register-card h2 {
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

.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.step-num {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e0e0e0;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
}

.step.active .step-num {
  background: #b31b1b;
  color: white;
}

.step.completed .step-num {
  background: #52c41a;
  color: white;
}

.step span:last-child {
  font-size: 12px;
  color: #999;
}

.step.active span:last-child {
  color: #b31b1b;
  font-weight: bold;
}

.step-line {
  width: 60px;
  height: 2px;
  background: #e0e0e0;
  margin: 0 10px;
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 30px;
}

.role-card {
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.role-card:hover {
  border-color: #b31b1b;
  transform: translateY(-2px);
}

.role-card.selected {
  border-color: #b31b1b;
  background: #fff5f5;
}

.role-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.role-name {
  font-weight: bold;
  color: #333;
}

.form-group {
  margin-bottom: 18px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  color: #333;
  font-weight: 500;
  font-size: 14px;
}

.required {
  color: #ff4d4f;
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #b31b1b;
  box-shadow: 0 0 0 3px rgba(179, 27, 27, 0.1);
}

.password-input {
  position: relative;
}

.password-input input {
  padding-right: 40px;
}

.toggle-password {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: normal;
}

.checkbox input {
  width: auto;
}

.error-message {
  color: #ff4d4f;
  font-size: 12px;
  margin-top: 5px;
}

.field-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.step-actions {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  margin-top: 25px;
}

.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: bold;
}

.btn.primary {
  background: #b31b1b;
  color: white;
}

.btn.primary:hover:not(:disabled) {
  background: #8b0000;
  transform: translateY(-2px);
}

.btn.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.secondary {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;
}

.btn.secondary:hover {
  background: #e8e8e8;
}

.success-step {
  text-align: center;
}

.success-icon {
  font-size: 60px;
  margin-bottom: 20px;
}

.success-step h3 {
  color: #52c41a;
  margin-bottom: 10px;
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

  .register-wrapper {
    padding: 80px 20px 40px;
  }

  .register-card {
    padding: 25px;
  }

  .step-line {
    width: 30px;
  }

  .role-grid {
    grid-template-columns: 1fr;
  }
}
</style>
