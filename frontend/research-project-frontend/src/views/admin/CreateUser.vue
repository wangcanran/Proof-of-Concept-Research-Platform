<template>
  <div class="create-user">
    <div class="page-header">
      <h1>添加新用户</h1>
      <div class="header-actions">
        <button class="back-btn" @click="$router.go(-1)">返回</button>
        <button class="save-btn" :disabled="loading" @click="handleSubmit">
          {{ loading ? '保存中...' : '保存用户' }}
        </button>
      </div>
    </div>

    <div class="content-wrapper">
      <div v-if="loading" class="loading-overlay">
        <div class="loading-spinner"></div>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" class="user-form">
        <!-- 基本信息 -->
        <el-card class="form-section">
          <template #header>
            <div class="card-header">基本信息</div>
          </template>

          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="用户名" prop="username">
                <el-input v-model="form.username" placeholder="请输入用户名" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="工号/学号" prop="employee_id">
                <el-input v-model="form.employee_id" placeholder="请输入工号或学号" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="姓名" prop="name">
                <el-input v-model="form.name" placeholder="请输入真实姓名" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="邮箱" prop="email">
                <el-input v-model="form.email" type="email" placeholder="请输入邮箱" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="电话" prop="phone">
                <el-input v-model="form.phone" placeholder="请输入联系电话" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="性别" prop="gender">
                <el-select v-model="form.gender" placeholder="请选择性别">
                  <el-option label="男" value="male" />
                  <el-option label="女" value="female" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </el-card>

        <!-- 角色与权限 -->
        <el-card class="form-section">
          <template #header>
            <div class="card-header">角色与权限</div>
          </template>

          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="用户角色" prop="role">
                <el-select
                  v-model="form.role"
                  placeholder="请选择用户角色"
                  @change="handleRoleChange"
                >
                  <el-option
                    v-for="role in roleOptions"
                    :key="role.value"
                    :label="role.label"
                    :value="role.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="用户状态" prop="status">
                <el-select v-model="form.status" placeholder="请选择用户状态">
                  <el-option label="活跃" value="active" />
                  <el-option label="禁用" value="inactive" />
                  <el-option label="待激活" value="pending" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="权限分配" prop="permissions">
            <el-checkbox-group v-model="form.permissions">
              <div class="permission-grid">
                <div
                  v-for="permission in permissionOptions"
                  :key="permission.value"
                  class="permission-item"
                >
                  <el-checkbox :label="permission.value">
                    {{ permission.label }}
                  </el-checkbox>
                  <span class="permission-desc">{{ permission.description }}</span>
                </div>
              </div>
            </el-checkbox-group>
          </el-form-item>
        </el-card>

        <!-- 部门信息 -->
        <el-card class="form-section">
          <template #header>
            <div class="card-header">部门信息</div>
          </template>

          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="所属部门" prop="department_id">
                <el-select
                  v-model="form.department_id"
                  placeholder="请选择部门"
                  filterable
                  clearable
                >
                  <el-option
                    v-for="dept in departments"
                    :key="dept.id"
                    :label="dept.name"
                    :value="dept.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="职称" prop="title">
                <el-input v-model="form.title" placeholder="请输入职称" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="研究方向" prop="research_fields">
            <el-input
              v-model="form.research_fields"
              type="textarea"
              :rows="3"
              placeholder="请输入研究方向（多个方向用逗号分隔）"
            />
          </el-form-item>
        </el-card>

        <!-- 登录信息 -->
        <el-card class="form-section">
          <template #header>
            <div class="card-header">登录信息</div>
          </template>

          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="初始密码" prop="password">
                <el-input
                  v-model="form.password"
                  type="password"
                  placeholder="请输入初始密码"
                  show-password
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="确认密码" prop="confirmPassword">
                <el-input
                  v-model="form.confirmPassword"
                  type="password"
                  placeholder="请确认密码"
                  show-password
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="密码策略">
            <div class="password-hint">
              <p>密码要求：</p>
              <ul>
                <li :class="{ valid: passwordValid.length }">长度至少8位</li>
                <li :class="{ valid: passwordValid.hasUpperCase && passwordValid.hasLowerCase }">
                  包含大小写字母
                </li>
                <li :class="{ valid: passwordValid.hasNumber }">包含数字</li>
                <li :class="{ valid: passwordValid.hasSpecial }">包含特殊字符</li>
              </ul>
            </div>
          </el-form-item>

          <el-form-item label="邮件通知">
            <el-switch
              v-model="form.send_welcome_email"
              active-text="发送欢迎邮件"
              inactive-text="不发送"
            />
          </el-form-item>
        </el-card>

        <!-- 提交按钮 -->
        <div class="form-actions">
          <el-button type="primary" :loading="loading" @click="handleSubmit"> 创建用户 </el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button @click="$router.go(-1)">取消</el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const router = useRouter()
const formRef = ref()
const loading = ref(false)

// 表单数据
const form = reactive({
  username: '',
  employee_id: '',
  name: '',
  email: '',
  phone: '',
  gender: 'male',
  role: '',
  status: 'active',
  permissions: [],
  department_id: '',
  title: '',
  research_fields: '',
  password: '',
  confirmPassword: '',
  send_welcome_email: true,
})

// 角色选项
const roleOptions = [
  { value: 'applicant', label: '项目申请人' },
  { value: 'reviewer', label: '评审专家' },
  { value: 'assistant', label: '科研助理' },
  { value: 'admin', label: '系统管理员' },
]

// 权限选项（根据角色动态加载）
const permissionOptions = ref([])

// 部门列表
const departments = ref([])

// 表单验证规则
const validatePassword = (rule: any, value: string, callback: Function) => {
  if (!value) {
    callback(new Error('请输入密码'))
  } else if (value.length < 8) {
    callback(new Error('密码长度不能少于8位'))
  } else if (!/\d/.test(value)) {
    callback(new Error('密码必须包含数字'))
  } else if (!/[a-z]/.test(value)) {
    callback(new Error('密码必须包含小写字母'))
  } else if (!/[A-Z]/.test(value)) {
    callback(new Error('密码必须包含大写字母'))
  } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
    callback(new Error('密码必须包含特殊字符'))
  } else {
    callback()
  }
}

const validateConfirmPassword = (rule: any, value: string, callback: Function) => {
  if (!value) {
    callback(new Error('请确认密码'))
  } else if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在3-20个字符', trigger: 'blur' },
  ],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
  role: [{ required: true, message: '请选择用户角色', trigger: 'change' }],
  password: [{ required: true, validator: validatePassword, trigger: 'blur' }],
  confirmPassword: [{ required: true, validator: validateConfirmPassword, trigger: 'blur' }],
}

// 计算密码强度
const passwordValid = computed(() => {
  const password = form.password
  return {
    length: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  }
})

// 角色变化时加载对应权限
const handleRoleChange = async (role: string) => {
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get(`http://localhost:3002/api/admin/roles/${role}/permissions`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (response.data.success) {
      permissionOptions.value = response.data.data
    }
  } catch (error) {
    console.error('加载权限失败:', error)
  }
}

// 加载部门数据
const loadDepartments = async () => {
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get('http://localhost:3002/api/departments', {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (response.data.success) {
      departments.value = response.data.data
    }
  } catch (error) {
    console.error('加载部门数据失败:', error)
  }
}

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value.validate()

    loading.value = true

    const token = localStorage.getItem('token')
    const userData = {
      ...form,
      confirmPassword: undefined, // 移除确认密码字段
    }

    const response = await axios.post('http://localhost:3002/api/admin/users', userData, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (response.data.success) {
      ElMessage.success('用户创建成功')

      // 询问下一步操作
      ElMessageBox.confirm('用户创建成功！是否继续创建其他用户？', '操作成功', {
        confirmButtonText: '继续创建',
        cancelButtonText: '返回列表',
        type: 'success',
      })
        .then(() => {
          handleReset()
        })
        .catch(() => {
          router.push('/admin/users')
        })
    }
  } catch (error: any) {
    console.error('创建用户失败:', error)
    ElMessage.error(error.response?.data?.message || '创建用户失败')
  } finally {
    loading.value = false
  }
}

// 重置表单
const handleReset = () => {
  formRef.value.resetFields()
  form.permissions = []
  form.send_welcome_email = true
}

// 初始化
onMounted(() => {
  loadDepartments()
})
</script>

<style scoped>
.create-user {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 64px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.page-header h1 {
  margin: 0;
  color: #1a1a1a;
  font-size: 24px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.back-btn,
.save-btn {
  padding: 10px 20px;
  border-radius: 6px;
  border: none;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.back-btn {
  background: #f5f5f5;
  color: #666;
}

.save-btn {
  background: #b31b1b;
  color: white;
}

.save-btn:disabled {
  background: #d9d9d9;
  cursor: not-allowed;
}

.content-wrapper {
  position: relative;
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  border-radius: 8px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #b31b1b;
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

.form-section {
  margin-bottom: 24px;
}

.card-header {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.permission-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
}

.permission-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.permission-desc {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}

.password-hint {
  padding: 12px;
  background: #f6ffed;
  border-radius: 6px;
  border: 1px solid #b7eb8f;
}

.password-hint ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.password-hint li {
  font-size: 12px;
  color: #8c8c8c;
  margin-bottom: 4px;
}

.password-hint li.valid {
  color: #52c41a;
}

.form-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}

@media (max-width: 768px) {
  .permission-grid {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
}
</style>
