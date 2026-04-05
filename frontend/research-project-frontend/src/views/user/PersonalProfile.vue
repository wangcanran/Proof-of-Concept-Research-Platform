<template>
  <el-card class="profile-card">
    <template #header>
      <div class="card-header">
        <h3>个人资料</h3>
        <el-button v-if="!isEditing" type="primary" @click="startEditing" icon="Edit">
          编辑资料
        </el-button>
        <div v-else class="edit-actions">
          <el-button @click="cancelEditing">取消</el-button>
          <el-button type="primary" @click="saveProfile" :loading="saving"> 保存 </el-button>
        </div>
      </div>
    </template>

    <el-form
      ref="profileFormRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
      :disabled="!isEditing"
    >
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="姓名" prop="name">
            <el-input v-model="formData.name" placeholder="请输入姓名" />
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="性别" prop="gender">
            <el-radio-group v-model="formData.gender">
              <el-radio label="男">男</el-radio>
              <el-radio label="女">女</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="formData.email" placeholder="请输入邮箱" />
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="手机号码" prop="phone">
            <el-input v-model="formData.phone" placeholder="请输入手机号码" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="职称" prop="title">
            <el-select v-model="formData.title" placeholder="请选择职称" style="width: 100%">
              <el-option label="教授" value="教授" />
              <el-option label="副教授" value="副教授" />
              <el-option label="讲师" value="讲师" />
              <el-option label="研究员" value="研究员" />
              <el-option label="副研究员" value="副研究员" />
              <el-option label="助理研究员" value="助理研究员" />
              <el-option label="博士生导师" value="博士生导师" />
              <el-option label="硕士生导师" value="硕士生导师" />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="所属院系" prop="department">
            <el-input v-model="formData.department" placeholder="请输入所属院系" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="研究方向" prop="researchField">
        <el-input
          v-model="formData.researchField"
          type="textarea"
          :rows="3"
          placeholder="请输入研究方向，多个方向用逗号分隔"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <el-divider />

      <h4>账户信息</h4>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="用户ID">
            <el-input v-model="formData.id" disabled />
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="用户角色">
            <el-input v-model="formData.role" disabled />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="入职日期">
            <el-date-picker
              v-model="formData.joinDate"
              type="date"
              placeholder="选择日期"
              disabled
              style="width: 100%"
            />
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="上次登录">
            <el-input v-model="formData.lastLogin" disabled />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="登录IP">
            <el-input v-model="formData.lastLoginIp" disabled />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
  </el-card>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  userInfo: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['update-profile'])

// 响应式数据
const isEditing = ref(false)
const saving = ref(false)
const profileFormRef = ref(null)
const originalData = ref({})

// 表单数据
const formData = reactive({ ...props.userInfo })

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度在2-20个字符之间', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }],
  department: [{ required: true, message: '请输入所属院系', trigger: 'blur' }],
}

// 监听props变化
watch(
  () => props.userInfo,
  (newVal) => {
    Object.assign(formData, newVal)
  },
  { deep: true },
)

// 方法
const startEditing = () => {
  originalData.value = { ...formData }
  isEditing.value = true
}

const cancelEditing = () => {
  Object.assign(formData, originalData.value)
  isEditing.value = false
}

const saveProfile = async () => {
  if (!profileFormRef.value) return

  try {
    await profileFormRef.value.validate()
    saving.value = true

    // 模拟API调用
    setTimeout(() => {
      emit('update-profile', { ...formData })
      isEditing.value = false
      saving.value = false
      ElMessage.success('个人资料更新成功')
    }, 1000)
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}
</script>

<style scoped lang="scss">
.profile-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h3 {
      margin: 0;
      font-size: 18px;
    }

    .edit-actions {
      display: flex;
      gap: 10px;
    }
  }

  h4 {
    margin: 20px 0 15px 0;
    font-weight: 500;
    color: #333;
  }

  :deep(.el-form-item) {
    margin-bottom: 22px;
  }

  :deep(.el-input.is-disabled .el-input__inner) {
    background-color: #f5f7fa;
    color: #909399;
  }
}
</style>
