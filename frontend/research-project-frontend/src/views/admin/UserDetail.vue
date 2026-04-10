<!-- src/views/admin/UserDetail.vue -->
<template>
  <div class="user-detail" v-loading="loading">
    <el-page-header @back="goBack" content="用户详情" />

    <el-card class="detail-card">
      <div class="user-header">
        <div class="avatar-section">
          <div class="user-avatar">
            {{ userData?.name?.charAt(0) || 'U' }}
          </div>
          <div class="user-basic">
            <h2 class="user-name">{{ userData?.name || '--' }}</h2>
            <div class="user-meta">
              <el-tag :type="getRoleTagType(userData?.role)" size="large">
                {{ getRoleText(userData?.role) }}
              </el-tag>
              <el-tag :type="getStatusTagType(userData?.status)" size="large">
                {{ getStatusText(userData?.status) }}
              </el-tag>
              <span class="user-id">ID: {{ userData?.id || '--' }}</span>
            </div>
          </div>
        </div>

        <div class="action-buttons">
          <el-button type="primary" @click="handleEdit">
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
          <el-dropdown @command="handleAction">
            <el-button type="primary">
              更多操作<el-icon class="el-icon--right"><arrow-down /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="toggleStatus">
                  {{ userData?.status === 'active' ? '禁用' : '启用' }}
                </el-dropdown-item>
                <el-dropdown-item command="resetPassword"> 重置密码 </el-dropdown-item>
                <el-dropdown-item command="sendMessage"> 发送消息 </el-dropdown-item>
                <el-dropdown-item command="viewLogs"> 查看操作日志 </el-dropdown-item>
                <el-dropdown-item command="delete" divided>
                  <span style="color: #f56c6c">删除用户</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <!-- 用户信息标签页 -->
      <el-tabs v-model="activeTab" class="user-tabs">
        <el-tab-pane label="基本信息" name="basic">
          <div class="info-grid">
            <div class="info-item">
              <label>用户名</label>
              <div class="info-value">{{ userData?.username || '--' }}</div>
            </div>
            <div class="info-item">
              <label>邮箱</label>
              <div class="info-value">{{ userData?.email || '--' }}</div>
            </div>
            <div class="info-item">
              <label>部门/单位</label>
              <div class="info-value">{{ userData?.department || '--' }}</div>
            </div>
            <div class="info-item">
              <label>职称/职务</label>
              <div class="info-value">{{ userData?.title || '--' }}</div>
            </div>
            <div class="info-item">
              <label>研究领域</label>
              <div class="info-value">{{ userData?.research_field || '--' }}</div>
            </div>
            <div class="info-item">
              <label>联系电话</label>
              <div class="info-value">{{ userData?.phone || '--' }}</div>
            </div>
            <div class="info-item">
              <label>创建时间</label>
              <div class="info-value">{{ formatDate(userData?.created_at) }}</div>
            </div>
            <div class="info-item">
              <label>最后登录</label>
              <div class="info-value">{{ formatDate(userData?.last_login) }}</div>
            </div>
            <div class="info-item">
              <label>更新时间</label>
              <div class="info-value">{{ formatDate(userData?.updated_at) }}</div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 项目信息标签页 -->
        <el-tab-pane label="项目信息" name="projects" v-if="userData?.role === 'applicant'">
          <div class="project-section">
            <el-table :data="userProjects" stripe style="width: 100%">
              <el-table-column prop="project_code" label="项目编号" width="160" />
              <el-table-column prop="title" label="项目标题" min-width="200" />
              <el-table-column prop="category" label="项目类别" width="120">
                <template #default="{ row }">
                  {{ row.category || '--' }}
                </template>
              </el-table-column>
              <el-table-column prop="status" label="项目状态" width="120">
                <template #default="{ row }">
                  <el-tag :type="getProjectStatusTagType(row.status)" size="small">
                    {{ getProjectStatusText(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="budget_total" label="项目预算" width="120">
                <template #default="{ row }">
                  {{ formatFunds(row.budget_total) }}
                </template>
              </el-table-column>
              <el-table-column prop="created_at" label="创建时间" width="160">
                <template #default="{ row }">
                  {{ formatDate(row.created_at) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120" fixed="right">
                <template #default="{ row }">
                  <el-button type="primary" link @click="viewProject(row.id)"> 查看 </el-button>
                </template>
              </el-table-column>
            </el-table>

            <div v-if="userProjects.length === 0" class="empty-state">
              <el-empty description="暂无项目数据" />
            </div>
          </div>
        </el-tab-pane>

        <!-- 评审记录标签页 -->
        <el-tab-pane label="评审记录" name="reviews" v-if="userData?.role === 'reviewer'">
          <div class="review-section">
            <el-table :data="reviewRecords" stripe style="width: 100%">
              <el-table-column prop="project_title" label="项目标题" min-width="200" />
              <el-table-column prop="review_type" label="评审类型" width="120">
                <template #default="{ row }">
                  {{ getReviewTypeText(row.review_type) }}
                </template>
              </el-table-column>
              <el-table-column prop="total_score" label="综合评分" width="120">
                <template #default="{ row }">
                  <span :class="getScoreClass(row.total_score)">
                    {{ row.total_score?.toFixed(1) || '--' }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="recommendation" label="评审结论" width="120">
                <template #default="{ row }">
                  <el-tag :type="getRecommendationTagType(row.recommendation)" size="small">
                    {{ getRecommendationText(row.recommendation) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="review_date" label="评审日期" width="120">
                <template #default="{ row }">
                  {{ formatDate(row.review_date) }}
                </template>
              </el-table-column>
              <el-table-column prop="created_at" label="提交时间" width="160">
                <template #default="{ row }">
                  {{ formatDate(row.created_at) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120" fixed="right">
                <template #default="{ row }">
                  <el-button type="primary" link @click="viewReview(row.id)"> 查看 </el-button>
                </template>
              </el-table-column>
            </el-table>

            <div v-if="reviewRecords.length === 0" class="empty-state">
              <el-empty description="暂无评审记录" />
            </div>
          </div>
        </el-tab-pane>

        <!-- 操作日志标签页 -->
        <el-tab-pane label="操作日志" name="logs">
          <div class="logs-section">
            <div class="filter-bar">
              <el-date-picker
                v-model="logDateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                @change="fetchUserLogs"
              />
            </div>

            <el-table :data="userLogs" stripe style="width: 100%">
              <el-table-column prop="action" label="操作类型" width="120">
                <template #default="{ row }">
                  <el-tag :type="getLogActionTagType(row.action)" size="small">
                    {{ getLogActionText(row.action) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="table_name" label="操作表" width="120" />
              <el-table-column prop="record_id" label="记录ID" width="120" />
              <el-table-column prop="old_values" label="修改前" min-width="200">
                <template #default="{ row }">
                  <div v-if="row.old_values" class="json-value">
                    {{ formatJson(row.old_values) }}
                  </div>
                  <span v-else>--</span>
                </template>
              </el-table-column>
              <el-table-column prop="new_values" label="修改后" min-width="200">
                <template #default="{ row }">
                  <div v-if="row.new_values" class="json-value">
                    {{ formatJson(row.new_values) }}
                  </div>
                  <span v-else>--</span>
                </template>
              </el-table-column>
              <el-table-column prop="ip_address" label="IP地址" width="120" />
              <el-table-column prop="created_at" label="操作时间" width="160">
                <template #default="{ row }">
                  {{ formatDateTime(row.created_at) }}
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 编辑对话框 -->
    <user-dialog
      v-model="editDialogVisible"
      dialog-type="edit"
      :user-data="userData"
      @success="handleEditSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, ArrowDown } from '@element-plus/icons-vue'
import request from '@/utils/request'
import UserDialog from './components/UserDialog.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const userId = ref(route.params.id as string)

// 数据状态
const userData = ref<any>(null)
const userProjects = ref<any[]>([])
const reviewRecords = ref<any[]>([])
const userLogs = ref<any[]>([])

// UI状态
const activeTab = ref('basic')
const logDateRange = ref<string[]>([])
const editDialogVisible = ref(false)

// 获取用户详情
const fetchUserDetail = async () => {
  loading.value = true
  try {
    const response = await request({
      url: `/admin/users/${userId.value}`,
      method: 'GET',
    })
    userData.value = response
  } catch (error) {
    console.error('获取用户详情失败:', error)
    ElMessage.error('获取用户详情失败')
  } finally {
    loading.value = false
  }
}

// 获取用户项目
const fetchUserProjects = async () => {
  try {
    const response = await request({
      url: `/admin/users/${userId.value}/projects`,
      method: 'GET',
    })
    userProjects.value = response || []
  } catch (error) {
    console.error('获取用户项目失败:', error)
  }
}

// 获取评审记录
const fetchReviewRecords = async () => {
  try {
    const response = await request({
      url: `/admin/users/${userId.value}/reviews`,
      method: 'GET',
    })
    reviewRecords.value = response || []
  } catch (error) {
    console.error('获取评审记录失败:', error)
  }
}

// 获取用户日志
const fetchUserLogs = async () => {
  try {
    const params: any = {}
    if (logDateRange.value && logDateRange.value.length === 2) {
      params.start_date = logDateRange.value[0]
      params.end_date = logDateRange.value[1]
    }

    const response = await request({
      url: `/admin/users/${userId.value}/logs`,
      method: 'GET',
      params,
    })
    userLogs.value = response || []
  } catch (error) {
    console.error('获取用户日志失败:', error)
  }
}

// 切换标签页
const handleTabChange = (tabName: string) => {
  activeTab.value = tabName

  switch (tabName) {
    case 'projects':
      if (userData.value?.role === 'applicant' && userProjects.value.length === 0) {
        fetchUserProjects()
      }
      break
    case 'reviews':
      if (userData.value?.role === 'reviewer' && reviewRecords.value.length === 0) {
        fetchReviewRecords()
      }
      break
    case 'logs':
      if (userLogs.value.length === 0) {
        fetchUserLogs()
      }
      break
  }
}

// 用户操作
const handleAction = async (command: string) => {
  switch (command) {
    case 'toggleStatus':
      await toggleUserStatus()
      break
    case 'resetPassword':
      await resetUserPassword()
      break
    case 'sendMessage':
      sendMessage()
      break
    case 'viewLogs':
      activeTab.value = 'logs'
      fetchUserLogs()
      break
    case 'delete':
      await deleteUser()
      break
  }
}

// 切换用户状态
const toggleUserStatus = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要${userData.value?.status === 'active' ? '禁用' : '启用'}用户 ${userData.value?.name} 吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    const newStatus = userData.value?.status === 'active' ? 'inactive' : 'active'

    await request({
      url: `/admin/users/${userId.value}/status`,
      method: 'PUT',
      data: { status: newStatus },
    })

    ElMessage.success('操作成功')
    fetchUserDetail()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

// 重置用户密码
const resetUserPassword = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要重置用户 ${userData.value?.name} 的密码吗？重置后密码将设置为默认密码。`,
      '重置密码',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    await request({
      url: `/admin/users/${userId.value}/reset-password`,
      method: 'POST',
    })

    ElMessage.success('密码重置成功')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('密码重置失败')
    }
  }
}

// 发送消息
const sendMessage = () => {
  ElMessage.info('发送消息功能开发中')
}

// 删除用户
const deleteUser = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户 ${userData.value?.name} 吗？此操作不可恢复。`,
      '删除用户',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'error',
      },
    )

    await request({
      url: `/admin/users/${userId.value}`,
      method: 'DELETE',
    })

    ElMessage.success('删除成功')
    router.push('/admin/users')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 查看项目
const viewProject = (projectId: string) => {
  router.push(`/admin/projects/${projectId}`)
}

// 查看评审
const viewReview = (reviewId: string) => {
  router.push(`/admin/reviews/${reviewId}`)
}

// 编辑用户
const handleEdit = () => {
  editDialogVisible.value = true
}

// 编辑成功回调
const handleEditSuccess = () => {
  fetchUserDetail()
  editDialogVisible.value = false
}

// 返回上一页
const goBack = () => {
  router.push('/admin/users')
}

// 工具函数
const getRoleText = (role: string) => {
  const roleMap: Record<string, string> = {
    applicant: '项目申请人',
    reviewer: '评审专家',
    project_manager: '科研助理',
    admin: '系统管理员',
  }
  return roleMap[role] || role
}

const getRoleTagType = (role: string) => {
  const typeMap: Record<string, string> = {
    applicant: 'primary',
    reviewer: 'warning',
    project_manager: 'success',
    admin: 'danger',
  }
  return typeMap[role] || 'info'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    active: '活跃',
    inactive: '非活跃',
    pending: '待激活',
  }
  return statusMap[status] || status
}

const getStatusTagType = (status: string) => {
  return status === 'active' ? 'success' : 'warning'
}

const getProjectStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    under_review: '评审中',
    approved: '已批准',
    rejected: '已拒绝',
    in_progress: '进行中',
    completed: '已完成',
  }
  return statusMap[status] || status
}

const getProjectStatusTagType = (status: string) => {
  const typeMap: Record<string, string> = {
    draft: '',
    submitted: 'info',
    under_review: 'warning',
    approved: 'success',
    rejected: 'danger',
    in_progress: 'primary',
    completed: 'success',
  }
  return typeMap[status] || 'info'
}

const getReviewTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    initial: '初审',
    mid_term: '中期',
    final: '结题',
    special: '专项',
  }
  return typeMap[type] || type
}

const getRecommendationText = (recommendation: string) => {
  const map: Record<string, string> = {
    approve: '通过',
    approve_with_revision: '修改后通过',
    reject: '拒绝',
    resubmit: '重新提交',
  }
  return map[recommendation] || recommendation
}

const getRecommendationTagType = (recommendation: string) => {
  const typeMap: Record<string, string> = {
    approve: 'success',
    approve_with_revision: 'warning',
    reject: 'danger',
    resubmit: 'info',
  }
  return typeMap[recommendation] || 'info'
}

const getScoreClass = (score: number) => {
  if (score >= 8) return 'score-high'
  if (score >= 6) return 'score-medium'
  return 'score-low'
}

const getLogActionText = (action: string) => {
  const actionMap: Record<string, string> = {
    create: '创建',
    update: '更新',
    delete: '删除',
    login: '登录',
    logout: '退出',
  }
  return actionMap[action] || action
}

const getLogActionTagType = (action: string) => {
  const typeMap: Record<string, string> = {
    create: 'success',
    update: 'warning',
    delete: 'danger',
    login: 'info',
    logout: '',
  }
  return typeMap[action] || 'info'
}

const formatDate = (dateString: string) => {
  if (!dateString) return '--'
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

const formatDateTime = (dateString: string) => {
  if (!dateString) return '--'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

const formatFunds = (funds: number) => {
  if (!funds) return '¥0'
  if (funds >= 100000000) {
    return '¥' + (funds / 100000000).toFixed(2) + '亿'
  }
  if (funds >= 10000) {
    return '¥' + (funds / 10000).toFixed(2) + '万'
  }
  return '¥' + funds.toFixed(2)
}

const formatJson = (json: any) => {
  try {
    if (typeof json === 'string') {
      const parsed = JSON.parse(json)
      return JSON.stringify(parsed, null, 2)
    } else if (typeof json === 'object') {
      return JSON.stringify(json, null, 2)
    }
    return json
  } catch (e) {
    return json
  }
}

// 初始化
onMounted(() => {
  if (userId.value) {
    fetchUserDetail()
  } else {
    ElMessage.error('用户ID不存在')
    router.push('/admin/users')
  }
})
</script>

<style scoped lang="scss">
.user-detail {
  padding: 0;
  min-height: 0;

  .detail-card {
    margin-top: 20px;
  }

  .user-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 24px;
    border-bottom: 1px solid #f0f0f0;

    .avatar-section {
      display: flex;
      align-items: center;
      gap: 16px;

      .user-avatar {
        width: 64px;
        height: 64px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        font-weight: bold;
      }

      .user-basic {
        .user-name {
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .user-meta {
          display: flex;
          gap: 8px;
          align-items: center;

          .user-id {
            font-size: 14px;
            color: #666;
            margin-left: 8px;
          }
        }
      }
    }

    .action-buttons {
      display: flex;
      gap: 12px;
    }
  }

  .user-tabs {
    :deep(.el-tabs__header) {
      margin-bottom: 24px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px 32px;

      .info-item {
        label {
          display: block;
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
        }

        .info-value {
          font-size: 16px;
          color: #1a1a1a;
          font-weight: 500;
          word-break: break-all;
        }
      }
    }

    .project-section,
    .review-section,
    .logs-section {
      .filter-bar {
        margin-bottom: 16px;
      }

      .json-value {
        max-height: 100px;
        overflow-y: auto;
        background: #f5f7fa;
        padding: 8px;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.5;
        white-space: pre-wrap;
      }
    }

    .score-high {
      color: #52c41a;
      font-weight: bold;
    }

    .score-medium {
      color: #fa8c16;
      font-weight: bold;
    }

    .score-low {
      color: #f56c6c;
      font-weight: bold;
    }
  }
}

@media (max-width: 768px) {
  .user-detail {
    .user-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;

      .action-buttons {
        width: 100%;
        justify-content: flex-start;
      }
    }

    .info-grid {
      grid-template-columns: 1fr !important;
    }
  }
}
</style>
