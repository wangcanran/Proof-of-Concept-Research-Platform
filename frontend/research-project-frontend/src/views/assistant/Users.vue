<!-- src/views/assistant/Users.vue -->
<template>
  <div class="users-management assistant-ruc-theme">
    <!-- 顶部标题栏 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">用户管理</h1>
        <div class="page-description">管理科研管理系统中的用户账号</div>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="openCreateDialog" :icon="Plus"> 新增用户 </el-button>
        <el-button @click="exportUsers" :icon="Download">导出</el-button>
        <el-button @click="refreshData" :icon="Refresh">刷新</el-button>
      </div>
    </div>

    <!-- 筛选工具栏 -->
    <div class="filter-toolbar">
      <div class="filter-left">
        <el-input
          v-model="filter.keyword"
          placeholder="搜索用户名、姓名、邮箱或部门"
          class="search-input"
          clearable
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select
          v-model="filter.role"
          placeholder="角色筛选"
          clearable
          class="filter-select"
          @change="handleSearch"
        >
          <el-option label="申请人" value="applicant" />
          <el-option label="评审专家" value="reviewer" />
          <el-option label="科研助理" value="project_manager" />
          <el-option label="管理员" value="admin" />
        </el-select>

        <el-select
          v-model="filter.status"
          placeholder="状态筛选"
          clearable
          class="filter-select"
          @change="handleSearch"
        >
          <el-option label="活跃" value="active" />
          <el-option label="非活跃" value="inactive" />
          <el-option label="待激活" value="pending" />
        </el-select>

        <el-button type="primary" @click="handleSearch" :icon="Search"> 搜索 </el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>

      <div class="filter-right">
        <el-button-group>
          <el-button :type="viewMode === 'list' ? 'primary' : ''" @click="viewMode = 'list'">
            列表视图
          </el-button>
          <el-button :type="viewMode === 'card' ? 'primary' : ''" @click="viewMode = 'card'">
            卡片视图
          </el-button>
        </el-button-group>
      </div>
    </div>

    <!-- 数据统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card" @click="filterByRole('applicant')">
        <div class="stat-icon" style="background: #b31b1b20; color: #b31b1b">
          <el-icon><User /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalApplicants }}</div>
          <div class="stat-label">申请人</div>
        </div>
      </div>

      <div class="stat-card" @click="filterByRole('reviewer')">
        <div class="stat-icon" style="background: rgba(179, 27, 27, 0.12); color: #b31b1b">
          <el-icon><Star /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalReviewers }}</div>
          <div class="stat-label">评审专家</div>
        </div>
      </div>

      <div class="stat-card" @click="filterByRole('project_manager')">
        <div class="stat-icon" style="background: #b31b1b20; color: #b31b1b">
          <el-icon><Setting /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalAssistants }}</div>
          <div class="stat-label">科研助理</div>
        </div>
      </div>

      <div class="stat-card" @click="filterByRole('admin')">
        <div class="stat-icon" style="background: #b31b1b20; color: #b31b1b">
          <el-icon><Lock /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalAdmins }}</div>
          <div class="stat-label">管理员</div>
        </div>
      </div>

      <div class="stat-card" @click="filterByStatus('active')">
        <div class="stat-icon" style="background: #b31b1b20; color: #b31b1b">
          <el-icon><Check /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.activeUsers }}</div>
          <div class="stat-label">活跃用户</div>
        </div>
      </div>
    </div>

    <!-- 列表视图 -->
    <div v-if="viewMode === 'list'" class="list-container">
      <el-table
        :data="users"
        v-loading="loading"
        stripe
        style="width: 100%"
        @row-click="viewUserDetail"
      >
        <el-table-column prop="username" label="用户名" width="120">
          <template #default="{ row }">
            <div class="user-cell">
              <div class="user-avatar-small">{{ getInitial(row.name) }}</div>
              <span class="username">{{ row.username }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="name" label="姓名" width="120" />

        <el-table-column prop="email" label="邮箱" width="200">
          <template #default="{ row }">
            <a :href="`mailto:${row.email}`" class="email-link">{{ row.email }}</a>
          </template>
        </el-table-column>

        <el-table-column prop="role" label="角色" width="120">
          <template #default="{ row }">
            <el-tag :type="getRoleTagType(row.role)" size="small">
              {{ getRoleText(row.role) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="department" label="部门" width="150" />

        <el-table-column prop="title" label="职称" width="150" />

        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="
                row.status === 'active' ? 'success' : row.status === 'pending' ? 'warning' : 'info'
              "
              size="small"
            >
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="last_login" label="最后登录" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.last_login) }}
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="注册时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button type="primary" size="small" @click.stop="editUser(row)"> 编辑 </el-button>
              <el-button
                type="danger"
                size="small"
                @click.stop="handleStatusChange(row)"
                v-if="row.id !== currentUserId"
              >
                {{ row.status === 'active' ? '停用' : '启用' }}
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 卡片视图 -->
    <div v-else class="cards-container">
      <div v-loading="loading" class="cards-grid">
        <div v-for="user in users" :key="user.id" class="user-card" @click="viewUserDetail(user)">
          <div class="card-header">
            <div class="user-avatar-large">{{ getInitial(user.name) }}</div>
            <div class="user-basic-info">
              <h3 class="user-name">{{ user.name }}</h3>
              <p class="user-username">@{{ user.username }}</p>
            </div>
            <el-dropdown @command="handleCardCommand($event, user)" trigger="click">
              <span class="card-menu">
                <el-icon><More /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit">编辑信息</el-dropdown-item>
                  <el-dropdown-item command="reset-password">重置密码</el-dropdown-item>
                  <el-dropdown-item command="toggle-status" :divided="true">
                    {{ user.status === 'active' ? '停用账号' : '启用账号' }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <div class="card-content">
            <div class="info-row">
              <el-icon><Message /></el-icon>
              <span class="info-label">邮箱：</span>
              <a :href="`mailto:${user.email}`" class="info-value">{{ user.email }}</a>
            </div>

            <div class="info-row">
              <el-icon><UserFilled /></el-icon>
              <span class="info-label">角色：</span>
              <el-tag :type="getRoleTagType(user.role)" size="small">
                {{ getRoleText(user.role) }}
              </el-tag>
            </div>

            <div class="info-row">
              <el-icon><OfficeBuilding /></el-icon>
              <span class="info-label">部门：</span>
              <span class="info-value">{{ user.department || '未设置' }}</span>
            </div>

            <div class="info-row">
              <el-icon><Medal /></el-icon>
              <span class="info-label">职称：</span>
              <span class="info-value">{{ user.title || '未设置' }}</span>
            </div>

            <div class="info-row">
              <el-icon><Timer /></el-icon>
              <span class="info-label">最后登录：</span>
              <span class="info-value">{{ formatDateTime(user.last_login) || '从未登录' }}</span>
            </div>
          </div>

          <div class="card-footer">
            <el-tag
              :type="
                user.status === 'active'
                  ? 'success'
                  : user.status === 'pending'
                    ? 'warning'
                    : 'info'
              "
              size="small"
            >
              {{ getStatusText(user.status) }}
            </el-tag>
            <span class="register-time"> 注册于 {{ formatDate(user.created_at) }} </span>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[12, 24, 48, 96]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 创建/编辑用户对话框 -->
    <el-dialog
      v-model="dialog.visible"
      :title="dialog.isEdit ? '编辑用户' : '创建用户'"
      width="600px"
      @close="closeDialog"
    >
      <el-form
        ref="userFormRef"
        :model="dialog.form"
        :rules="dialog.rules"
        label-width="100px"
        label-position="right"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="dialog.form.username"
            placeholder="请输入用户名"
            :disabled="dialog.isEdit"
          />
        </el-form-item>

        <el-form-item label="密码" prop="password" v-if="!dialog.isEdit">
          <el-input
            v-model="dialog.form.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword" v-if="!dialog.isEdit">
          <el-input
            v-model="dialog.form.confirmPassword"
            type="password"
            placeholder="请确认密码"
            show-password
          />
        </el-form-item>

        <el-form-item label="真实姓名" prop="name">
          <el-input v-model="dialog.form.name" placeholder="请输入真实姓名" />
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input v-model="dialog.form.email" placeholder="请输入邮箱" />
        </el-form-item>

        <el-form-item label="角色" prop="role">
          <el-select v-model="dialog.form.role" placeholder="请选择角色" style="width: 100%">
            <el-option label="申请人" value="applicant" />
            <el-option label="评审专家" value="reviewer" />
            <el-option label="科研助理" value="project_manager" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>

        <el-form-item label="部门" prop="department">
          <el-input v-model="dialog.form.department" placeholder="请输入部门" />
        </el-form-item>

        <el-form-item label="职称" prop="title">
          <el-input v-model="dialog.form.title" placeholder="请输入职称" />
        </el-form-item>

        <el-form-item label="研究领域" prop="research_field">
          <el-input
            v-model="dialog.form.research_field"
            type="textarea"
            :rows="2"
            placeholder="请输入研究领域"
          />
        </el-form-item>

        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="dialog.form.phone" placeholder="请输入联系电话" />
        </el-form-item>

        <el-form-item label="账号状态" prop="status">
          <el-radio-group v-model="dialog.form.status">
            <el-radio label="active">活跃</el-radio>
            <el-radio label="inactive">非活跃</el-radio>
            <el-radio label="pending">待激活</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeDialog">取消</el-button>
          <el-button type="primary" @click="submitUserForm" :loading="dialog.loading">
            {{ dialog.isEdit ? '更新' : '创建' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog v-model="resetPasswordDialog.visible" title="重置密码" width="400px">
      <el-form
        ref="resetPasswordFormRef"
        :model="resetPasswordDialog.form"
        :rules="resetPasswordDialog.rules"
        label-width="80px"
      >
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="resetPasswordDialog.form.newPassword"
            type="password"
            placeholder="请输入新密码"
            show-password
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="resetPasswordDialog.form.confirmPassword"
            type="password"
            placeholder="请确认新密码"
            show-password
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="resetPasswordDialog.visible = false">取消</el-button>
          <el-button
            type="primary"
            @click="submitResetPassword"
            :loading="resetPasswordDialog.loading"
          >
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import request from '@/utils/request'
import {
  Search,
  Plus,
  Download,
  Refresh,
  User,
  Star,
  Setting,
  Lock,
  Check,
  More,
  Message,
  UserFilled,
  OfficeBuilding,
  Medal,
  Timer,
} from '@element-plus/icons-vue'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const viewMode = ref<'list' | 'card'>('list')
const userFormRef = ref<FormInstance>()
const resetPasswordFormRef = ref<FormInstance>()

// 当前用户ID（用于防止修改自己）
const currentUserId = computed(() => {
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr).id : ''
})

// 筛选条件
const filter = reactive({
  keyword: '',
  role: '',
  status: '',
  department: '',
})

// 分页
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
})

// 统计数据
const stats = reactive({
  totalUsers: 0,
  totalApplicants: 0,
  totalReviewers: 0,
  totalAssistants: 0,
  totalAdmins: 0,
  activeUsers: 0,
})

// 用户数据
const users = ref<any[]>([])

// 对话框状态
const dialog = reactive({
  visible: false,
  loading: false,
  isEdit: false,
  form: {
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    email: '',
    role: '',
    department: '',
    title: '',
    research_field: '',
    phone: '',
    status: 'active',
  },
  rules: {
    username: [
      { required: true, message: '请输入用户名', trigger: 'blur' },
      { min: 3, max: 50, message: '长度在 3 到 50 个字符', trigger: 'blur' },
    ],
    password: [
      { required: true, message: '请输入密码', trigger: 'blur' },
      { min: 6, message: '密码长度至少6位', trigger: 'blur' },
    ],
    confirmPassword: [
      { required: true, message: '请确认密码', trigger: 'blur' },
      {
        validator: (rule: any, value: string, callback: any) => {
          if (value !== dialog.form.password) {
            callback(new Error('两次输入的密码不一致'))
          } else {
            callback()
          }
        },
        trigger: 'blur',
      },
    ],
    name: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
    email: [
      { required: true, message: '请输入邮箱', trigger: 'blur' },
      { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' },
    ],
    role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  },
})

// 重置密码对话框
const resetPasswordDialog = reactive({
  visible: false,
  loading: false,
  userId: '',
  form: {
    newPassword: '',
    confirmPassword: '',
  },
  rules: {
    newPassword: [
      { required: true, message: '请输入新密码', trigger: 'blur' },
      { min: 6, message: '密码长度至少6位', trigger: 'blur' },
    ],
    confirmPassword: [
      { required: true, message: '请确认新密码', trigger: 'blur' },
      {
        validator: (rule: any, value: string, callback: any) => {
          if (value !== resetPasswordDialog.form.newPassword) {
            callback(new Error('两次输入的密码不一致'))
          } else {
            callback()
          }
        },
        trigger: 'blur',
      },
    ],
  },
})

// 工具函数
const getInitial = (name: string) => {
  return name ? name.charAt(0).toUpperCase() : '?'
}

const getRoleText = (role: string) => {
  const map: Record<string, string> = {
    applicant: '申请人',
    reviewer: '评审专家',
    project_manager: '科研助理',
    admin: '管理员',
  }
  return map[role] || role
}

const getRoleTagType = (role: string) => {
  const map: Record<string, string> = {
    applicant: 'primary',
    reviewer: 'success',
    project_manager: 'warning',
    admin: 'danger',
  }
  return map[role] || 'info'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    active: '活跃',
    inactive: '非活跃',
    pending: '待激活',
  }
  return map[status] || status
}

const formatDate = (dateString?: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const formatDateTime = (dateString?: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 数据加载
const loadUsers = async () => {
  loading.value = true

  try {
    const params = {
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword: filter.keyword || undefined,
      role: filter.role || undefined,
      status: filter.status || undefined,
    }

    const response = await request.get('/api/assistant/users', { params })

    if (response.success) {
      users.value = response.data.users
      pagination.total = response.data.pagination.total

      // 更新统计数据
      if (response.data.stats) {
        Object.assign(stats, response.data.stats)
      }
    }
  } catch (error) {
    console.error('加载用户数据失败:', error)
    ElMessage.error('加载用户数据失败')
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const response = await request.get('/api/assistant/users/stats')
    if (response.success) {
      Object.assign(stats, response.data)
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

// 搜索和筛选
const handleSearch = () => {
  pagination.current = 1
  loadUsers()
}

const resetFilters = () => {
  filter.keyword = ''
  filter.role = ''
  filter.status = ''
  filter.department = ''
  pagination.current = 1
  loadUsers()
}

const filterByRole = (role: string) => {
  filter.role = role
  pagination.current = 1
  loadUsers()
}

const filterByStatus = (status: string) => {
  filter.status = status
  pagination.current = 1
  loadUsers()
}

// 分页处理
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.current = 1
  loadUsers()
}

const handleCurrentChange = (page: number) => {
  pagination.current = page
  loadUsers()
}

// 用户操作
const viewUserDetail = (user: any) => {
  router.push(`/assistant/users/${user.id}`)
}

const editUser = (user: any) => {
  dialog.isEdit = true
  dialog.visible = true

  // 填充表单数据
  Object.assign(dialog.form, {
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department || '',
    title: user.title || '',
    research_field: user.research_field || '',
    phone: user.phone || '',
    status: user.status,
    password: '',
    confirmPassword: '',
  })
}

const openCreateDialog = () => {
  dialog.isEdit = false
  dialog.visible = true

  // 重置表单
  if (userFormRef.value) {
    userFormRef.value.resetFields()
  }
  dialog.form = {
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    email: '',
    role: '',
    department: '',
    title: '',
    research_field: '',
    phone: '',
    status: 'active',
  }
}

const closeDialog = () => {
  dialog.visible = false
  if (userFormRef.value) {
    userFormRef.value.clearValidate()
  }
}

const submitUserForm = async () => {
  if (!userFormRef.value) return

  try {
    await userFormRef.value.validate()
    dialog.loading = true

    const formData = { ...dialog.form }
    delete formData.confirmPassword

    const url = dialog.isEdit
      ? `/api/assistant/users/${getCurrentEditUserId()}`
      : '/api/assistant/users'

    const method = dialog.isEdit ? 'put' : 'post'

    const response = await request[method](url, formData)

    if (response.success) {
      ElMessage.success(dialog.isEdit ? '用户更新成功' : '用户创建成功')
      closeDialog()
      loadUsers()
      loadStats()
    }
  } catch (error: any) {
    if (error.name !== 'ValidateError') {
      ElMessage.error(error.message || '操作失败')
    }
  } finally {
    dialog.loading = false
  }
}

const getCurrentEditUserId = () => {
  const user = users.value.find((u) => u.username === dialog.form.username)
  return user?.id || ''
}

const handleStatusChange = async (user: any) => {
  try {
    const action = user.status === 'active' ? '停用' : '启用'
    const confirmText =
      user.status === 'active'
        ? `确定要停用用户 "${user.name}" 吗？`
        : `确定要启用用户 "${user.name}" 吗？`

    await ElMessageBox.confirm(confirmText, `确认${action}`, {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })

    const newStatus = user.status === 'active' ? 'inactive' : 'active'
    const response = await request.put(`/api/assistant/users/${user.id}/status`, {
      status: newStatus,
    })

    if (response.success) {
      ElMessage.success(`${action}成功`)
      loadUsers()
      loadStats()
    }
  } catch (error) {
    // 用户取消操作
  }
}

const handleCardCommand = (command: string, user: any) => {
  switch (command) {
    case 'edit':
      editUser(user)
      break
    case 'reset-password':
      openResetPasswordDialog(user)
      break
    case 'toggle-status':
      handleStatusChange(user)
      break
  }
}

// 重置密码
const openResetPasswordDialog = (user: any) => {
  resetPasswordDialog.userId = user.id
  resetPasswordDialog.visible = true
  resetPasswordDialog.form.newPassword = ''
  resetPasswordDialog.form.confirmPassword = ''

  if (resetPasswordFormRef.value) {
    resetPasswordFormRef.value.clearValidate()
  }
}

const submitResetPassword = async () => {
  if (!resetPasswordFormRef.value) return

  try {
    await resetPasswordFormRef.value.validate()
    resetPasswordDialog.loading = true

    const response = await request.put(
      `/api/assistant/users/${resetPasswordDialog.userId}/password`,
      { newPassword: resetPasswordDialog.form.newPassword },
    )

    if (response.success) {
      ElMessage.success('密码重置成功')
      resetPasswordDialog.visible = false
    }
  } catch (error: any) {
    if (error.name !== 'ValidateError') {
      ElMessage.error(error.message || '重置密码失败')
    }
  } finally {
    resetPasswordDialog.loading = false
  }
}

// 导出功能
const exportUsers = async () => {
  try {
    const response = await request.get('/api/assistant/users/export', {
      params: filter,
      responseType: 'blob',
    })

    const url = window.URL.createObjectURL(new Blob([response]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `users_${new Date().getTime()}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

const refreshData = () => {
  loadUsers()
  loadStats()
}

// 初始化
onMounted(() => {
  loadUsers()
  loadStats()
})
</script>

<style scoped>
.users-management {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 70px);
}

/* 顶部标题栏 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.header-left {
  flex: 1;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

.page-description {
  margin: 0;
  color: #7f8c8d;
  font-size: 14px;
}

.header-right {
  display: flex;
  gap: 12px;
}

/* 筛选工具栏 */
.filter-toolbar {
  background: white;
  padding: 16px 24px;
  border-radius: 12px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.filter-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.search-input {
  width: 300px;
}

.filter-select {
  width: 120px;
}

.filter-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: #7f8c8d;
}

/* 列表视图 */
.list-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar-small {
  width: 32px;
  height: 32px;
  background: #b31b1b;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
}

.username {
  font-weight: 500;
}

.email-link {
  color: #b31b1b;
  text-decoration: none;
}

.email-link:hover {
  text-decoration: underline;
}

/* 卡片视图 */
.cards-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.user-card {
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
}

.user-card:hover {
  border-color: #b31b1b;
  box-shadow: 0 4px 16px rgba(250, 140, 22, 0.1);
}

.card-header {
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  position: relative;
}

.user-avatar-large {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #b31b1b 0%, #8b1515 100%);
  color: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  flex-shrink: 0;
}

.user-basic-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.user-username {
  margin: 0;
  color: #7f8c8d;
  font-size: 13px;
}

.card-menu {
  cursor: pointer;
  padding: 4px;
  color: #7f8c8d;
  transition: color 0.3s;
}

.card-menu:hover {
  color: #b31b1b;
}

.card-content {
  padding: 20px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-row .el-icon {
  color: #7f8c8d;
  font-size: 16px;
  min-width: 16px;
}

.info-label {
  color: #7f8c8d;
  min-width: 70px;
}

.info-value {
  color: #2c3e50;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-footer {
  padding: 16px 20px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.register-time {
  font-size: 12px;
  color: #7f8c8d;
}

/* 分页 */
.pagination-container {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .stats-cards {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 992px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .header-right {
    width: 100%;
    justify-content: flex-start;
  }

  .filter-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .filter-left {
    width: 100%;
  }

  .search-input {
    width: 100%;
  }

  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .cards-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
}

@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }

  .cards-grid {
    grid-template-columns: 1fr;
  }

  .filter-left {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input,
  .filter-select {
    width: 100%;
  }
}
</style>
