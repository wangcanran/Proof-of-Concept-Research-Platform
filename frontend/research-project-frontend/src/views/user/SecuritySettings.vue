<template>
  <div class="security-settings">
    <!-- 修改密码 -->
    <el-card class="setting-card">
      <template #header>
        <h3>修改密码</h3>
      </template>

      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-width="120px"
      >
        <el-form-item label="当前密码" prop="oldPassword">
          <el-input
            v-model="passwordForm.oldPassword"
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
          <div class="password-tips">
            <p>密码要求：</p>
            <ul>
              <li :class="{ valid: isLengthValid }">至少8个字符</li>
              <li :class="{ valid: hasUpperCase }">包含大写字母</li>
              <li :class="{ valid: hasLowerCase }">包含小写字母</li>
              <li :class="{ valid: hasNumber }">包含数字</li>
              <li :class="{ valid: hasSpecialChar }">包含特殊字符</li>
            </ul>
          </div>
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
          <el-button type="primary" @click="submitPassword" :loading="changingPassword">
            修改密码
          </el-button>
          <el-button @click="resetPasswordForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 安全设置 -->
    <el-card class="setting-card">
      <template #header>
        <h3>安全设置</h3>
      </template>

      <div class="security-options">
        <div class="option-item">
          <div class="option-info">
            <h4>双重验证</h4>
            <p>启用后，登录时需要验证手机验证码</p>
          </div>
          <el-switch
            v-model="securitySettings.twoFactorAuth"
            active-text="启用"
            inactive-text="关闭"
            @change="updateTwoFactorAuth"
          />
        </div>

        <div class="option-item">
          <div class="option-info">
            <h4>登录通知</h4>
            <p>新设备登录时发送邮件通知</p>
          </div>
          <el-switch
            v-model="securitySettings.loginNotification"
            active-text="启用"
            inactive-text="关闭"
            @change="updateLoginNotification"
          />
        </div>

        <div class="option-item">
          <div class="option-info">
            <h4>会话管理</h4>
            <p>查看和管理登录设备</p>
          </div>
          <el-button type="text" @click="manageSessions"> 管理会话 </el-button>
        </div>
      </div>
    </el-card>

    <!-- 安全日志 -->
    <el-card class="setting-card">
      <template #header>
        <div class="card-header">
          <h3>安全日志</h3>
          <el-button type="text" @click="refreshLogs">刷新</el-button>
        </div>
      </template>

      <el-table :data="securityLogs" style="width: 100%">
        <el-table-column prop="time" label="时间" width="180" />
        <el-table-column prop="action" label="操作" width="120" />
        <el-table-column prop="description" label="描述" />
        <el-table-column prop="ip" label="IP地址" width="140" />
        <el-table-column prop="location" label="位置" width="120" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === '成功' ? 'success' : 'danger'" size="small">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 管理会话对话框 -->
    <el-dialog v-model="sessionDialogVisible" title="会话管理" width="600px">
      <div v-for="session in activeSessions" :key="session.id" class="session-item">
        <div class="session-info">
          <div class="session-device">
            <el-icon><Monitor /></el-icon>
            <span>{{ session.device }} - {{ session.browser }}</span>
          </div>
          <div class="session-details">
            <span>IP: {{ session.ip }}</span>
            <span>最后活动: {{ session.lastActivity }}</span>
            <el-tag v-if="session.current" type="success" size="small">当前会话</el-tag>
          </div>
        </div>
        <el-button v-if="!session.current" type="danger" text @click="logoutSession(session.id)">
          退出登录
        </el-button>
      </div>

      <template #footer>
        <el-button @click="logoutAllSessions" type="danger" plain> 退出所有其他设备 </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Monitor } from '@element-plus/icons-vue'

const emit = defineEmits(['password-changed'])

// 响应式数据
const passwordFormRef = ref(null)
const changingPassword = ref(false)
const sessionDialogVisible = ref(false)

// 表单数据
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

// 安全设置
const securitySettings = reactive({
  twoFactorAuth: false,
  loginNotification: true,
})

// 安全日志
const securityLogs = ref([
  {
    id: 1,
    time: '2024-01-15 14:30:25',
    action: '登录',
    description: '用户登录系统',
    ip: '192.168.1.100',
    location: '北京',
    status: '成功',
  },
  {
    id: 2,
    time: '2024-01-14 10:15:33',
    action: '密码修改',
    description: '修改登录密码',
    ip: '192.168.1.100',
    location: '北京',
    status: '成功',
  },
  {
    id: 3,
    time: '2024-01-12 09:05:12',
    action: '登录失败',
    description: '密码错误',
    ip: '183.12.34.56',
    location: '广州',
    status: '失败',
  },
])

// 活动会话
const activeSessions = ref([
  {
    id: 'session1',
    device: 'Windows PC',
    browser: 'Chrome 120',
    ip: '192.168.1.100',
    lastActivity: '刚刚',
    current: true,
  },
  {
    id: 'session2',
    device: 'iPhone',
    browser: 'Safari',
    ip: '183.12.34.56',
    lastActivity: '2天前',
    current: false,
  },
])

// 计算属性 - 密码强度检查
const isLengthValid = computed(() => passwordForm.newPassword.length >= 8)
const hasUpperCase = computed(() => /[A-Z]/.test(passwordForm.newPassword))
const hasLowerCase = computed(() => /[a-z]/.test(passwordForm.newPassword))
const hasNumber = computed(() => /\d/.test(passwordForm.newPassword))
const hasSpecialChar = computed(() =>
  /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordForm.newPassword),
)

// 表单验证规则
const validatePassword = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入密码'))
  } else if (value.length < 8) {
    callback(new Error('密码长度不能少于8位'))
  } else if (!/[A-Z]/.test(value)) {
    callback(new Error('必须包含至少一个大写字母'))
  } else if (!/[a-z]/.test(value)) {
    callback(new Error('必须包含至少一个小写字母'))
  } else if (!/\d/.test(value)) {
    callback(new Error('必须包含至少一个数字'))
  } else {
    callback()
  }
}

const validateConfirmPassword = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请确认密码'))
  } else if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [{ required: true, validator: validatePassword, trigger: 'blur' }],
  confirmPassword: [{ required: true, validator: validateConfirmPassword, trigger: 'blur' }],
}

// 方法
const submitPassword = async () => {
  if (!passwordFormRef.value) return

  try {
    await passwordFormRef.value.validate()
    changingPassword.value = true

    // 模拟API调用
    setTimeout(() => {
      ElMessage.success('密码修改成功，请重新登录')
      emit('password-changed')
      resetPasswordForm()
      changingPassword.value = false

      // 提示重新登录
      setTimeout(() => {
        ElMessageBox.confirm(
          '密码已修改，建议重新登录以确保账户安全。是否立即重新登录？',
          '安全提示',
          {
            confirmButtonText: '重新登录',
            cancelButtonText: '稍后',
            type: 'warning',
          },
        ).then(() => {
          // 触发重新登录逻辑
          // location.reload()
        })
      }, 1000)
    }, 1500)
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

const resetPasswordForm = () => {
  passwordForm.oldPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  if (passwordFormRef.value) {
    passwordFormRef.value.clearValidate()
  }
}

const updateTwoFactorAuth = (value) => {
  ElMessage.success(`双重验证已${value ? '启用' : '关闭'}`)
}

const updateLoginNotification = (value) => {
  ElMessage.success(`登录通知已${value ? '启用' : '关闭'}`)
}

const manageSessions = () => {
  sessionDialogVisible.value = true
}

const logoutSession = (sessionId) => {
  ElMessageBox.confirm('确定要让此设备退出登录吗？', '确认操作', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    activeSessions.value = activeSessions.value.filter((s) => s.id !== sessionId)
    ElMessage.success('设备已退出登录')
  })
}

const logoutAllSessions = () => {
  ElMessageBox.confirm('确定要让所有其他设备退出登录吗？当前设备会保持登录状态。', '确认操作', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    activeSessions.value = activeSessions.value.filter((s) => s.current)
    ElMessage.success('所有其他设备已退出登录')
  })
}

const refreshLogs = () => {
  ElMessage.info('安全日志已刷新')
}
</script>

<style scoped lang="scss">
.security-settings {
  .setting-card {
    margin-bottom: 20px;

    &:last-child {
      margin-bottom: 0;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }

  .password-tips {
    margin-top: 8px;
    padding: 10px;
    background-color: #f8f9fa;
    border-radius: 4px;
    font-size: 12px;

    p {
      margin: 0 0 5px 0;
      font-weight: bold;
    }

    ul {
      margin: 0;
      padding-left: 20px;

      li {
        color: #dc3545;

        &.valid {
          color: #28a745;
        }
      }
    }
  }

  .security-options {
    .option-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 0;
      border-bottom: 1px solid #eee;

      &:last-child {
        border-bottom: none;
      }

      .option-info {
        h4 {
          margin: 0 0 5px 0;
          font-size: 16px;
        }

        p {
          margin: 0;
          color: #666;
          font-size: 14px;
        }
      }
    }
  }

  .session-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    border: 1px solid #eee;
    border-radius: 4px;
    margin-bottom: 10px;

    .session-info {
      flex: 1;

      .session-device {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 5px;
        font-weight: 500;
      }

      .session-details {
        display: flex;
        gap: 15px;
        font-size: 12px;
        color: #666;
      }
    }
  }
}
</style>
