<!-- src/views/admin/RoleManagement.vue -->
<template>
  <div class="role-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">
        <span class="page-icon">🔑</span>
        角色权限管理
      </h1>
      <div class="page-description">管理系统用户的角色和权限配置，确保系统安全可控</div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">正在加载角色权限数据...</div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-alert">
      <div class="alert-icon">❌</div>
      <div class="alert-content">
        <h4>加载失败</h4>
        <p>{{ error }}</p>
      </div>
      <button class="retry-btn" @click="loadRoleData">重试</button>
    </div>

    <!-- 主内容区域 -->
    <div v-if="!loading && !error" class="role-management-content">
      <!-- 角色列表卡片 -->
      <div class="role-list-section">
        <div class="section-header">
          <h3 class="section-title">系统角色</h3>
          <div class="section-actions">
            <el-button type="primary" @click="refreshData" size="small">
              <el-icon><Refresh /></el-icon>
              刷新数据
            </el-button>
          </div>
        </div>

        <div class="role-cards">
          <div
            v-for="role in roles"
            :key="role.value"
            class="role-card"
            :class="{ active: selectedRole === role.value }"
            @click="selectRole(role.value)"
          >
            <div class="role-card-header">
              <div class="role-icon">{{ role.icon }}</div>
              <div class="role-info">
                <h4 class="role-name">{{ role.label }}</h4>
                <div class="role-stats"></div>
              </div>
            </div>
            <div class="role-description">
              {{ role.description }}
            </div>
            <div class="role-status" :class="getRoleStatusClass(role.value)">
              {{ getRoleStatusText(role.value) }}
            </div>
          </div>
        </div>
      </div>

      <!-- 权限管理区域 -->
      <div v-if="selectedRole" class="permission-management-section">
        <div class="section-header">
          <h3 class="section-title">{{ getRoleText(selectedRole) }} - 权限配置</h3>
          <div class="section-actions">
            <el-button type="success" @click="savePermissions" :loading="saving" size="small">
              <el-icon><Check /></el-icon>
              保存更改
            </el-button>
            <el-button @click="selectAllPermissions" size="small">
              <el-icon><Select /></el-icon>
              全选
            </el-button>
            <el-button @click="deselectAllPermissions" size="small">
              <el-icon><CircleClose /></el-icon>
              全不选
            </el-button>
          </div>
        </div>

        <!-- 权限分类 -->
        <div class="permission-categories">
          <div v-for="category in permissionCategories" :key="category" class="permission-category">
            <div class="category-header">
              <h4 class="category-title">{{ getCategoryText(category) }}</h4>
              <el-checkbox
                :model-value="isCategorySelected(category)"
                :indeterminate="isCategoryIndeterminate(category)"
                @change="toggleCategory(category, $event)"
              >
                全选
              </el-checkbox>
            </div>

            <div class="permission-items">
              <div
                v-for="permission in filteredPermissionsByCategory(category)"
                :key="permission.id"
                class="permission-item"
                :class="{ enabled: permission.enabled }"
              >
                <el-checkbox
                  v-model="permission.selected"
                  :disabled="!permission.enabled"
                  @change="updatePermissionCount"
                >
                  <div class="permission-info">
                    <div class="permission-header">
                      <span class="permission-code">{{ permission.permission_code }}</span>
                      <span class="permission-name">{{ permission.permission_name }}</span>
                    </div>
                    <div class="permission-description">
                      {{ permission.description }}
                    </div>
                    <div class="permission-meta">
                      <span class="permission-status" :class="getPermissionStatusClass(permission)">
                        {{ permission.enabled ? '已启用' : '已禁用' }}
                      </span>
                      <span class="permission-modified" v-if="permission.updated_at">
                        更新于: {{ formatTime(permission.updated_at) }}
                      </span>
                    </div>
                  </div>
                </el-checkbox>

                <div class="permission-actions">
                  <el-button
                    v-if="permission.enabled"
                    type="warning"
                    size="small"
                    @click="togglePermissionStatus(permission)"
                    title="禁用权限"
                  >
                    <el-icon><CloseBold /></el-icon>
                  </el-button>
                  <el-button
                    v-else
                    type="success"
                    size="small"
                    @click="togglePermissionStatus(permission)"
                    title="启用权限"
                  >
                    <el-icon><Check /></el-icon>
                  </el-button>

                  <el-button
                    type="info"
                    size="small"
                    @click="editPermission(permission)"
                    title="编辑权限"
                  >
                    <el-icon><Edit /></el-icon>
                  </el-button>

                  <el-button
                    type="danger"
                    size="small"
                    @click="deletePermission(permission.id)"
                    title="删除权限"
                    :disabled="permission.enabled"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 统计信息 -->
        <div class="permission-stats">
          <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-content">
              <div class="stat-value">{{ selectedPermissionsCount }}</div>
              <div class="stat-label">已选权限</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-content">
              <div class="stat-value">{{ enabledPermissionsCount }}</div>
              <div class="stat-label">启用权限</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📁</div>
            <div class="stat-content">
              <div class="stat-value">{{ permissionCategories.length }}</div>
              <div class="stat-label">权限分类</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">👥</div>
            <div class="stat-content">
              <div class="stat-value">{{ roleStats[selectedRole]?.userCount || 0 }}</div>
              <div class="stat-label">影响用户</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>请选择一个角色进行权限管理</h3>
        <p>点击左侧的角色卡片开始配置权限</p>
      </div>

      <!-- 批量操作 -->
      <div v-if="selectedRole" class="batch-operations">
        <div class="batch-header">
          <h4>批量操作</h4>
          <span class="hint">已选择 {{ selectedPermissionsCount }} 个权限</span>
        </div>
        <div class="batch-actions">
          <el-button
            type="primary"
            @click="enableSelectedPermissions"
            :disabled="selectedPermissionsCount === 0"
          >
            <el-icon><Check /></el-icon>
            启用选中权限
          </el-button>
          <el-button
            type="warning"
            @click="disableSelectedPermissions"
            :disabled="selectedPermissionsCount === 0"
          >
            <el-icon><CloseBold /></el-icon>
            禁用选中权限
          </el-button>
          <el-button
            type="danger"
            @click="deleteSelectedPermissions"
            :disabled="selectedPermissionsCount === 0"
          >
            <el-icon><Delete /></el-icon>
            删除选中权限
          </el-button>
          <el-button type="info" @click="exportPermissions">
            <el-icon><Download /></el-icon>
            导出权限配置
          </el-button>
        </div>
      </div>

      <!-- 权限日志 -->
      <div v-if="selectedRole" class="permission-logs">
        <div class="section-header">
          <h3 class="section-title">权限变更日志</h3>
          <el-button @click="refreshLogs" size="small">
            <el-icon><Refresh /></el-icon>
            刷新日志
          </el-button>
        </div>

        <div class="logs-list">
          <div v-for="log in permissionLogs" :key="log.id" class="log-item">
            <div class="log-icon">{{ getLogIcon(log.action) }}</div>
            <div class="log-content">
              <div class="log-message">{{ log.message }}</div>
              <div class="log-meta">
                <span class="log-user">{{ log.user }}</span>
                <span class="log-time">{{ formatTime(log.created_at) }}</span>
              </div>
            </div>
          </div>

          <div v-if="permissionLogs.length === 0" class="no-logs">暂无权限变更记录</div>
        </div>
      </div>
    </div>

    <!-- 编辑权限对话框 -->
    <el-dialog
      v-model="showEditDialog"
      title="编辑权限"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="permissionFormRef"
        :model="editingPermission"
        :rules="permissionRules"
        label-width="120px"
      >
        <el-form-item label="权限代码" prop="permission_code">
          <el-input v-model="editingPermission.permission_code" placeholder="如：view_dashboard" />
        </el-form-item>

        <el-form-item label="权限名称" prop="permission_name">
          <el-input v-model="editingPermission.permission_name" placeholder="如：查看工作台" />
        </el-form-item>

        <el-form-item label="权限描述" prop="description">
          <el-input
            v-model="editingPermission.description"
            type="textarea"
            rows="3"
            placeholder="请输入权限的详细描述"
          />
        </el-form-item>

        <el-form-item label="权限分类" prop="category">
          <el-select v-model="editingPermission.category" placeholder="选择分类">
            <el-option label="仪表板" value="dashboard" />
            <el-option label="项目管理" value="project" />
            <el-option label="成果管理" value="achievement" />
            <el-option label="经费管理" value="funding" />
            <el-option label="用户管理" value="user" />
            <el-option label="系统管理" value="system" />
            <el-option label="审核管理" value="audit" />
            <el-option label="评审管理" value="review" />
            <el-option label="申请管理" value="application" />
          </el-select>
        </el-form-item>

        <el-form-item label="启用状态" prop="enabled">
          <el-switch v-model="editingPermission.enabled" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showEditDialog = false">取消</el-button>
          <el-button type="primary" @click="savePermission" :loading="savingPermission">
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 新增权限对话框 -->
    <el-dialog v-model="showAddDialog" title="新增权限" width="600px" :close-on-click-modal="false">
      <el-form
        ref="addPermissionFormRef"
        :model="newPermission"
        :rules="permissionRules"
        label-width="120px"
      >
        <el-form-item label="角色" prop="role">
          <el-select v-model="newPermission.role" placeholder="选择角色">
            <el-option
              v-for="role in roles"
              :key="role.value"
              :label="role.label"
              :value="role.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="权限代码" prop="permission_code">
          <el-input v-model="newPermission.permission_code" placeholder="如：view_dashboard" />
        </el-form-item>

        <el-form-item label="权限名称" prop="permission_name">
          <el-input v-model="newPermission.permission_name" placeholder="如：查看工作台" />
        </el-form-item>

        <el-form-item label="权限描述" prop="description">
          <el-input
            v-model="newPermission.description"
            type="textarea"
            rows="3"
            placeholder="请输入权限的详细描述"
          />
        </el-form-item>

        <el-form-item label="权限分类" prop="category">
          <el-select v-model="newPermission.category" placeholder="选择分类">
            <el-option label="仪表板" value="dashboard" />
            <el-option label="项目管理" value="project" />
            <el-option label="成果管理" value="achievement" />
            <el-option label="经费管理" value="funding" />
            <el-option label="用户管理" value="user" />
            <el-option label="系统管理" value="system" />
            <el-option label="审核管理" value="audit" />
            <el-option label="评审管理" value="review" />
            <el-option label="申请管理" value="application" />
          </el-select>
        </el-form-item>

        <el-form-item label="启用状态">
          <el-switch v-model="newPermission.enabled" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddDialog = false">取消</el-button>
          <el-button type="primary" @click="addPermission" :loading="addingPermission">
            创建
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import type { FormInstance, FormRules } from 'element-plus'

// 组件引用
const permissionFormRef = ref<FormInstance>()
const addPermissionFormRef = ref<FormInstance>()

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const savingPermission = ref(false)
const addingPermission = ref(false)
const error = ref('')
const selectedRole = ref('')
const showEditDialog = ref(false)
const showAddDialog = ref(false)

// 数据状态
const roles = ref([
  {
    value: 'applicant',
    label: '项目申请人',
    icon: '📋',
    description: '负责科研项目的申请、执行和成果提交',
  },
  { value: 'reviewer', label: '评审专家', icon: '👨‍⚖️', description: '负责项目的专业评审和技术指导' },
  {
    value: 'project_manager',
    label: '科研助理',
    icon: '👨‍🔬',
    description: '负责项目的日常管理和审核工作',
  },
  { value: 'admin', label: '系统管理员', icon: '👨‍💼', description: '负责系统配置和用户管理' },
])

const permissions = ref<any[]>([])
const permissionLogs = ref<any[]>([])
const roleStats = ref<Record<string, any>>({})

const editingPermission = reactive({
  id: '',
  permission_code: '',
  permission_name: '',
  description: '',
  category: '',
  enabled: true,
})

const newPermission = reactive({
  role: '',
  permission_code: '',
  permission_name: '',
  description: '',
  category: 'dashboard',
  enabled: true,
})

// 表单验证规则
const permissionRules: FormRules = {
  permission_code: [
    { required: true, message: '请输入权限代码', trigger: 'blur' },
    { pattern: /^[a-z_]+$/, message: '权限代码只能包含小写字母和下划线', trigger: 'blur' },
  ],
  permission_name: [{ required: true, message: '请输入权限名称', trigger: 'blur' }],
  description: [{ required: true, message: '请输入权限描述', trigger: 'blur' }],
  category: [{ required: true, message: '请选择权限分类', trigger: 'change' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

// 计算属性
const selectedPermissions = computed(() => {
  return permissions.value.filter((p) => p.selected && p.role === selectedRole.value)
})

const selectedPermissionsCount = computed(() => {
  return selectedPermissions.value.length
})

const enabledPermissionsCount = computed(() => {
  return permissions.value.filter((p) => p.role === selectedRole.value && p.enabled).length
})

const permissionCategories = computed(() => {
  const categories = new Set<string>()
  permissions.value
    .filter((p) => p.role === selectedRole.value)
    .forEach((p) => categories.add(p.category))
  return Array.from(categories).sort()
})

const filteredPermissionsByCategory = computed(() => (category: string) => {
  return permissions.value
    .filter((p) => p.role === selectedRole.value && p.category === category)
    .sort((a, b) => a.permission_code.localeCompare(b.permission_code))
})

// 辅助函数
const getRoleText = (role: string) => {
  const roleMap: Record<string, string> = {
    applicant: '项目申请人',
    reviewer: '评审专家',
    project_manager: '科研助理',
    admin: '系统管理员',
  }
  return roleMap[role] || role
}

const getCategoryText = (category: string) => {
  const categoryMap: Record<string, string> = {
    dashboard: '仪表板',
    project: '项目管理',
    achievement: '成果管理',
    funding: '经费管理',
    user: '用户管理',
    system: '系统管理',
    audit: '审核管理',
    review: '评审管理',
    application: '申请管理',
  }
  return categoryMap[category] || category
}

const getRoleStatusClass = (role: string) => {
  const stats = roleStats.value[role]
  if (!stats) return 'unknown'
  return stats.userCount > 0 ? 'active' : 'inactive'
}

const getRoleStatusText = (role: string) => {
  const stats = roleStats.value[role]
  if (!stats) return '状态未知'
  return stats.userCount > 0 ? `${stats.userCount}个用户` : '暂无用户'
}

const getPermissionStatusClass = (permission: any) => {
  return permission.enabled ? 'enabled' : 'disabled'
}

const getLogIcon = (action: string) => {
  const iconMap: Record<string, string> = {
    create: '➕',
    update: '✏️',
    delete: '🗑️',
    enable: '✅',
    disable: '❌',
  }
  return iconMap[action] || '📝'
}

const formatTime = (dateString: string) => {
  if (!dateString) return '未知时间'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

// 权限选择相关方法
const isCategorySelected = (category: string) => {
  const categoryPermissions = filteredPermissionsByCategory.value(category)
  if (categoryPermissions.length === 0) return false
  return categoryPermissions.every((p) => p.selected)
}

const isCategoryIndeterminate = (category: string) => {
  const categoryPermissions = filteredPermissionsByCategory.value(category)
  const selectedCount = categoryPermissions.filter((p) => p.selected).length
  return selectedCount > 0 && selectedCount < categoryPermissions.length
}

const toggleCategory = (category: string, checked: boolean) => {
  const categoryPermissions = filteredPermissionsByCategory.value(category)
  categoryPermissions.forEach((permission) => {
    permission.selected = checked
  })
  updatePermissionCount()
}

const selectAllPermissions = () => {
  permissions.value
    .filter((p) => p.role === selectedRole.value)
    .forEach((p) => {
      p.selected = true
    })
  updatePermissionCount()
}

const deselectAllPermissions = () => {
  permissions.value
    .filter((p) => p.role === selectedRole.value)
    .forEach((p) => {
      p.selected = false
    })
  updatePermissionCount()
}

const updatePermissionCount = () => {
  // 触发响应式更新
}

// 核心方法
const loadRoleData = async () => {
  loading.value = true
  error.value = ''

  try {
    // 并行加载数据
    await Promise.all([loadPermissions(), loadRoleStats(), loadPermissionLogs()])
  } catch (err: any) {
    console.error('加载角色数据失败:', err)
    error.value = err.message || '加载数据失败'
    ElMessage.error('加载角色数据失败')
  } finally {
    loading.value = false
  }
}

const loadPermissions = async () => {
  try {
    const response = await request.get('/api/admin/roles/permissions')
    if (response.success) {
      permissions.value = response.data.map((p: any) => ({
        ...p,
        selected: false,
      }))
    }
  } catch (err: any) {
    console.error('加载权限数据失败:', err)
    throw err
  }
}

const loadRoleStats = async () => {
  try {
    const response = await request.get('/api/admin/roles/stats')
    if (response.success) {
      roleStats.value = response.data
    }
  } catch (err: any) {
    console.error('加载角色统计失败:', err)
    throw err
  }
}

const loadPermissionLogs = async () => {
  try {
    const response = await request.get('/api/admin/roles/logs')
    if (response.success) {
      permissionLogs.value = response.data
    }
  } catch (err: any) {
    console.error('加载权限日志失败:', err)
    throw err
  }
}

const selectRole = (role: string) => {
  selectedRole.value = role
  // 取消所有选择
  permissions.value.forEach((p) => {
    p.selected = false
  })
}

const savePermissions = async () => {
  if (!selectedRole.value) {
    ElMessage.warning('请先选择角色')
    return
  }

  try {
    saving.value = true

    const selectedPermissions = permissions.value
      .filter((p) => p.role === selectedRole.value && p.selected)
      .map((p) => p.id)

    const response = await request.put('/api/admin/roles/permissions', {
      role: selectedRole.value,
      permissionIds: selectedPermissions,
    })

    if (response.success) {
      ElMessage.success('权限配置保存成功')
      loadRoleData()
    }
  } catch (err: any) {
    console.error('保存权限配置失败:', err)
    ElMessage.error('保存权限配置失败')
  } finally {
    saving.value = false
  }
}

const togglePermissionStatus = async (permission: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要${permission.enabled ? '禁用' : '启用'}该权限吗？`,
      '确认操作',
      {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消',
      },
    )

    const response = await request.put(`/api/admin/roles/permissions/${permission.id}/status`, {
      enabled: !permission.enabled,
    })

    if (response.success) {
      ElMessage.success(`权限${permission.enabled ? '禁用' : '启用'}成功`)
      loadPermissions()
      loadPermissionLogs()
    }
  } catch (err: any) {
    if (err !== 'cancel') {
      console.error('修改权限状态失败:', err)
      ElMessage.error('操作失败')
    }
  }
}

const editPermission = (permission: any) => {
  Object.assign(editingPermission, {
    id: permission.id,
    permission_code: permission.permission_code,
    permission_name: permission.permission_name,
    description: permission.description,
    category: permission.category,
    enabled: permission.enabled,
  })
  showEditDialog.value = true
}

const savePermission = async () => {
  if (!permissionFormRef.value) return

  try {
    await permissionFormRef.value.validate()
    savingPermission.value = true

    const response = await request.put(
      `/api/admin/roles/permissions/${editingPermission.id}`,
      editingPermission,
    )

    if (response.success) {
      ElMessage.success('权限更新成功')
      showEditDialog.value = false
      loadPermissions()
      loadPermissionLogs()
    }
  } catch (err: any) {
    console.error('保存权限失败:', err)
    if (err.errors) {
      ElMessage.error('请检查表单填写是否正确')
    } else {
      ElMessage.error('保存权限失败')
    }
  } finally {
    savingPermission.value = false
  }
}

const addPermission = async () => {
  if (!addPermissionFormRef.value) return

  try {
    await addPermissionFormRef.value.validate()
    addingPermission.value = true

    const response = await request.post('/api/admin/roles/permissions', newPermission)

    if (response.success) {
      ElMessage.success('权限创建成功')
      showAddDialog.value = false
      loadPermissions()
      loadPermissionLogs()
      // 重置表单
      Object.assign(newPermission, {
        role: '',
        permission_code: '',
        permission_name: '',
        description: '',
        category: 'dashboard',
        enabled: true,
      })
    }
  } catch (err: any) {
    console.error('创建权限失败:', err)
    if (err.errors) {
      ElMessage.error('请检查表单填写是否正确')
    } else {
      ElMessage.error('创建权限失败')
    }
  } finally {
    addingPermission.value = false
  }
}

const deletePermission = async (permissionId: string) => {
  try {
    await ElMessageBox.confirm('确定要删除该权限吗？此操作不可恢复！', '确认删除', {
      type: 'warning',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
    })

    const response = await request.delete(`/api/admin/roles/permissions/${permissionId}`)

    if (response.success) {
      ElMessage.success('权限删除成功')
      loadPermissions()
      loadPermissionLogs()
    }
  } catch (err: any) {
    if (err !== 'cancel') {
      console.error('删除权限失败:', err)
      ElMessage.error('删除失败')
    }
  }
}

const enableSelectedPermissions = async () => {
  if (selectedPermissionsCount.value === 0) {
    ElMessage.warning('请先选择权限')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要启用选中的 ${selectedPermissionsCount.value} 个权限吗？`,
      '确认启用',
      {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消',
      },
    )

    const response = await request.post('/api/admin/roles/permissions/batch-enable', {
      permissionIds: selectedPermissions.value.map((p) => p.id),
    })

    if (response.success) {
      ElMessage.success(`已启用 ${selectedPermissionsCount.value} 个权限`)
      loadPermissions()
      loadPermissionLogs()
    }
  } catch (err: any) {
    if (err !== 'cancel') {
      console.error('批量启用权限失败:', err)
      ElMessage.error('操作失败')
    }
  }
}

const disableSelectedPermissions = async () => {
  if (selectedPermissionsCount.value === 0) {
    ElMessage.warning('请先选择权限')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要禁用选中的 ${selectedPermissionsCount.value} 个权限吗？`,
      '确认禁用',
      {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消',
      },
    )

    const response = await request.post('/api/admin/roles/permissions/batch-disable', {
      permissionIds: selectedPermissions.value.map((p) => p.id),
    })

    if (response.success) {
      ElMessage.success(`已禁用 ${selectedPermissionsCount.value} 个权限`)
      loadPermissions()
      loadPermissionLogs()
    }
  } catch (err: any) {
    if (err !== 'cancel') {
      console.error('批量禁用权限失败:', err)
      ElMessage.error('操作失败')
    }
  }
}

const deleteSelectedPermissions = async () => {
  if (selectedPermissionsCount.value === 0) {
    ElMessage.warning('请先选择权限')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedPermissionsCount.value} 个权限吗？此操作不可恢复！`,
      '确认删除',
      {
        type: 'error',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
      },
    )

    const response = await request.post('/api/admin/roles/permissions/batch-delete', {
      permissionIds: selectedPermissions.value.map((p) => p.id),
    })

    if (response.success) {
      ElMessage.success(`已删除 ${selectedPermissionsCount.value} 个权限`)
      loadPermissions()
      loadPermissionLogs()
    }
  } catch (err: any) {
    if (err !== 'cancel') {
      console.error('批量删除权限失败:', err)
      ElMessage.error('删除失败')
    }
  }
}

const exportPermissions = async () => {
  try {
    const response = await request.get('/api/admin/roles/export', {
      responseType: 'blob',
    })

    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([response]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `权限配置_${new Date().getTime()}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    ElMessage.success('权限配置导出成功')
  } catch (err: any) {
    console.error('导出权限配置失败:', err)
    ElMessage.error('导出失败')
  }
}

const refreshData = () => {
  loadRoleData()
}

const refreshLogs = () => {
  loadPermissionLogs()
}

// 组件生命周期
onMounted(() => {
  loadRoleData()
})
</script>

<style scoped>
.role-management {
  padding: 24px;
  min-height: 100vh;
  background: #f5f7fa;
}

/* 页面标题 */
.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 8px 0;
}

.page-icon {
  font-size: 28px;
}

.page-description {
  color: #7f8c8d;
  font-size: 14px;
  line-height: 1.5;
}

/* 加载状态 */
.loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #722ed1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-text {
  color: #666;
  font-size: 14px;
}

/* 错误提示 */
.error-alert {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 8px;
  margin-bottom: 24px;
}

.alert-icon {
  font-size: 24px;
}

.alert-content {
  flex: 1;
}

.alert-content h4 {
  margin: 0 0 8px 0;
  color: #ff4d4f;
  font-size: 16px;
  font-weight: 500;
}

.alert-content p {
  margin: 0;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.retry-btn {
  padding: 8px 16px;
  background: #ff4d4f;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.3s;
}

.retry-btn:hover {
  background: #d9363e;
}

/* 角色列表 */
.role-list-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
  padding: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

.section-actions {
  display: flex;
  gap: 8px;
}

.role-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.role-card {
  padding: 20px;
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.role-card:hover {
  border-color: #722ed1;
  background: #f9f0ff;
  transform: translateY(-2px);
}

.role-card.active {
  border-color: #722ed1;
  background: #f9f0ff;
  box-shadow: 0 4px 12px rgba(114, 46, 209, 0.1);
}

.role-card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.role-icon {
  font-size: 32px;
  width: 60px;
  height: 60px;
  background: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.role-info {
  flex: 1;
}

.role-name {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.role-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #7f8c8d;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-label {
  opacity: 0.8;
}

.stat-value {
  font-weight: 500;
  color: #722ed1;
}

.role-description {
  color: #666;
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 12px;
  min-height: 40px;
}

.role-status {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
  display: inline-block;
}

.role-status.active {
  background: #f6ffed;
  color: #52c41a;
}

.role-status.inactive {
  background: #fff7e6;
  color: #fa8c16;
}

.role-status.unknown {
  background: #f5f5f5;
  color: #666;
}

/* 权限管理区域 */
.permission-management-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
  padding: 24px;
}

.permission-categories {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.permission-category {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.category-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #2c3e50;
}

.permission-items {
  padding: 16px;
}

.permission-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border-bottom: 1px solid #fafafa;
  transition: background 0.3s;
}

.permission-item:hover {
  background: #fafafa;
}

.permission-item:last-child {
  border-bottom: none;
}

.permission-item.enabled {
  opacity: 1;
}

.permission-item:not(.enabled) {
  opacity: 0.6;
}

.permission-info {
  flex: 1;
}

.permission-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.permission-code {
  font-family: 'Courier New', monospace;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
}

.permission-name {
  font-weight: 500;
  color: #2c3e50;
}

.permission-description {
  color: #7f8c8d;
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 8px;
}

.permission-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #7f8c8d;
}

.permission-status.enabled {
  color: #52c41a;
}

.permission-status.disabled {
  color: #fa8c16;
}

.permission-modified {
  opacity: 0.8;
}

.permission-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

/* 统计信息 */
.permission-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.stat-icon {
  font-size: 32px;
  width: 60px;
  height: 60px;
  background: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #722ed1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: #7f8c8d;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 12px 0;
  color: #2c3e50;
  font-size: 18px;
}

.empty-state p {
  margin: 0;
  color: #7f8c8d;
  font-size: 14px;
}

/* 批量操作 */
.batch-operations {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
  padding: 20px;
}

.batch-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.batch-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #2c3e50;
}

.hint {
  font-size: 13px;
  color: #7f8c8d;
}

.batch-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* 权限日志 */
.permission-logs {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  padding: 24px;
}

.logs-list {
  max-height: 400px;
  overflow-y: auto;
}

.log-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid #fafafa;
}

.log-item:hover {
  background: #fafafa;
}

.log-icon {
  font-size: 16px;
  margin-top: 2px;
  flex-shrink: 0;
}

.log-content {
  flex: 1;
  min-width: 0;
}

.log-message {
  font-size: 13px;
  color: #2c3e50;
  margin-bottom: 4px;
  line-height: 1.4;
}

.log-meta {
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: #7f8c8d;
}

.no-logs {
  text-align: center;
  padding: 40px;
  color: #8c8c8c;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .role-management {
    padding: 16px;
  }

  .role-cards {
    grid-template-columns: 1fr;
  }

  .permission-stats {
    grid-template-columns: 1fr;
  }

  .batch-actions {
    flex-direction: column;
  }

  .batch-actions .el-button {
    width: 100%;
  }
}
</style>
