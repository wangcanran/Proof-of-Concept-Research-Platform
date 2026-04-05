<!-- src/views/admin/components/UserDialog.vue -->
<template>
  <el-dialog v-model="visible" :title="dialogTitle" width="600px" :before-close="handleClose">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
      v-loading="loading"
    >
      <el-form-item label="用户角色" prop="role" required>
        <el-select
          v-model="formData.role"
          placeholder="请选择用户角色"
          style="width: 100%"
          :disabled="dialogType === 'view'"
        >
          <el-option label="项目申请人" value="applicant" />
          <el-option label="评审专家" value="reviewer" />
          <el-option label="科研助理" value="assistant" />
          <el-option label="系统管理员" value="admin" />
        </el-select>
      </el-form-item>

      <el-form-item label="用户名" prop="username" required>
        <el-input
          v-model="formData.username"
          placeholder="请输入用户名"
          :disabled="dialogType === 'view' || dialogType === 'edit'"
        />
      </el-form-item>

      <el-form-item v-if="dialogType === 'create'" label="密码" prop="password" required>
        <el-input
          v-model="formData.password"
          type="password"
          placeholder="请输入密码"
          show-password
        />
        <div class="form-tips">密码长度至少6位</div>
      </el-form-item>

      <el-form-item v-if="dialogType === 'create'" label="确认密码" prop="confirmPassword" required>
        <el-input
          v-model="formData.confirmPassword"
          type="password"
          placeholder="请再次输入密码"
          show-password
        />
      </el-form-item>

      <el-form-item label="姓名" prop="name" required>
        <el-input
          v-model="formData.name"
          placeholder="请输入真实姓名"
          :disabled="dialogType === 'view'"
        />
      </el-form-item>

      <el-form-item label="邮箱" prop="email" required>
        <el-input
          v-model="formData.email"
          placeholder="请输入邮箱"
          :disabled="dialogType === 'view' || dialogType === 'edit'"
        />
      </el-form-item>

      <el-form-item label="部门/单位" prop="department">
        <el-input
          v-model="formData.department"
          placeholder="请输入部门/单位"
          :disabled="dialogType === 'view'"
        />
      </el-form-item>

      <el-form-item label="职称/职务" prop="title">
        <el-input
          v-model="formData.title"
          placeholder="请输入职称/职务"
          :disabled="dialogType === 'view'"
        />
      </el-form-item>

      <el-form-item label="研究领域" prop="research_field">
        <el-input
          v-model="formData.research_field"
          placeholder="请输入研究领域"
          :disabled="dialogType === 'view'"
        />
      </el-form-item>

      <el-form-item label="联系电话" prop="phone">
        <el-input
          v-model="formData.phone"
          placeholder="请输入联系电话"
          :disabled="dialogType === 'view'"
        />
      </el-form-item>

      <el-form-item label="账号状态" prop="status" v-if="dialogType !== 'create'">
        <el-select
          v-model="formData.status"
          placeholder="请选择状态"
          style="width: 100%"
          :disabled="dialogType === 'view'"
        >
          <el-option label="活跃" value="active" />
          <el-option label="非活跃" value="inactive" />
          <el-option label="待激活" value="pending" />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          v-if="dialogType !== 'view'"
          type="primary"
          @click="handleSubmit"
          :loading="submitting"
        >
          确定
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const props = defineProps<{
  modelValue: boolean
  dialogType: 'create' | 'edit' | 'view'
  userData?: any
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const dialogTitle = computed(() => {
  const titles = {
    create: '创建用户',
    edit: '编辑用户',
    view: '查看用户详情',
  }
  return titles[props.dialogType]
})

// 表单
const formRef = ref<FormInstance>()
const loading = ref(false)
const submitting = ref(false)

const formData = reactive({
  role: 'applicant',
  username: '',
  password: '',
  confirmPassword: '',
  name: '',
  email: '',
  department: '',
  title: '',
  research_field: '',
  phone: '',
  status: 'active',
})

// 表单验证规则
const validatePassword = (rule: any, value: any, callback: any) => {
  if (!value) {
    callback(new Error('请输入密码'))
  } else if (value.length < 6) {
    callback(new Error('密码长度不能少于6位'))
  } else {
    callback()
  }
}

const validateConfirmPassword = (rule: any, value: any, callback: any) => {
  if (!value) {
    callback(new Error('请再次输入密码'))
  } else if (value !== formData.password) {
    callback(new Error('两次输入密码不一致'))
  } else {
    callback()
  }
}

const validateEmail = (rule: any, value: any, callback: any) => {
  if (!value) {
    callback(new Error('请输入邮箱'))
  } else if (!/^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/.test(value)) {
    callback(new Error('请输入有效的邮箱地址'))
  } else {
    callback()
  }
}

const formRules: FormRules = {
  role: [{ required: true, message: '请选择用户角色', trigger: 'change' }],
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度在 3 到 50 个字符', trigger: 'blur' },
  ],
  password: [{ required: true, validator: validatePassword, trigger: 'blur' }],
  confirmPassword: [{ required: true, validator: validateConfirmPassword, trigger: 'blur' }],
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 100, message: '姓名长度在 2 到 100 个字符', trigger: 'blur' },
  ],
  email: [{ required: true, validator: validateEmail, trigger: 'blur' }],
}

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    role: 'applicant',
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    email: '',
    department: '',
    title: '',
    research_field: '',
    phone: '',
    status: 'active',
  })

  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

// 加载用户数据
const loadUserData = async (userId: string) => {
  loading.value = true
  try {
    const response = await request({
      url: `/admin/users/${userId}`,
      method: 'GET',
    })

    Object.assign(formData, response)
  } catch (error) {
    console.error('加载用户数据失败:', error)
    ElMessage.error('加载用户数据失败')
  } finally {
    loading.value = false
  }
}

// 监听userData变化
watch(
  () => props.userData,
  (newVal) => {
    if (newVal && props.dialogType !== 'create') {
      if (newVal.id) {
        loadUserData(newVal.id)
      } else {
        Object.assign(formData, newVal)
      }
    }
  },
  { immediate: true },
)

// 关闭对话框
const handleClose = () => {
  if (submitting.value) return

  if (props.dialogType === 'create') {
    resetForm()
  }
  visible.value = false
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  const valid = await formRef.value.validate()
  if (!valid) return

  submitting.value = true

  try {
    const submitData = { ...formData }

    // 移除确认密码字段
    delete submitData.confirmPassword

    if (props.dialogType === 'create') {
      await request({
        url: '/admin/users',
        method: 'POST',
        data: submitData,
      })
      ElMessage.success('创建用户成功')
    } else if (props.dialogType === 'edit') {
      // 编辑时不更新密码
      delete submitData.password

      await request({
        url: `/admin/users/${props.userData?.id}`,
        method: 'PUT',
        data: submitData,
      })
      ElMessage.success('更新用户成功')
    }

    emit('success')
    handleClose()
  } catch (error: any) {
    console.error('保存用户失败:', error)

    let errorMessage = '保存失败'
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    } else if (error.message) {
      errorMessage = error.message
    }

    ElMessage.error(errorMessage)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.form-tips {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
