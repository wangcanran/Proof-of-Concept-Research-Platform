<!-- src/views/assistant/ReviewerAssignmentDetail.vue -->
<template>
  <div class="reviewer-assignment-detail">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回列表
        </el-button>
        <h1 class="page-title">评审专家分配详情</h1>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="assignMoreReviewer">
          <el-icon><Plus /></el-icon>
          分配更多专家
        </el-button>
        <el-button @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading" size="large">
        <Loading />
      </el-icon>
      <div class="loading-text">正在加载项目信息...</div>
    </div>

    <!-- 项目信息卡片 -->
    <div v-else-if="project" class="content-container">
      <el-card shadow="never" class="main-card">
        <!-- 项目基本信息 -->
        <div class="project-basic-info">
          <div class="project-header">
            <div class="project-title-section">
              <h2 class="project-title">{{ project.title }}</h2>
              <div class="project-code-section">
                <el-tag type="info">{{ project.project_code }}</el-tag>
                <el-tag :type="getStatusTagType(project.status)">
                  {{ getStatusText(project.status) }}
                </el-tag>
              </div>
            </div>
            <div class="project-action-buttons">
              <el-button type="primary" @click="assignMoreReviewer">
                <el-icon><Plus /></el-icon>
                分配专家
              </el-button>
              <el-button @click="viewProjectDetail">
                <el-icon><View /></el-icon>
                查看项目详情
              </el-button>
            </div>
          </div>

          <div class="project-meta-grid">
            <div class="meta-item">
              <div class="meta-label">申请人</div>
              <div class="meta-value">{{ project.applicant_name }}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">所属部门</div>
              <div class="meta-value">{{ project.applicant_department || '未填写' }}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">研究领域</div>
              <div class="meta-value">
                <el-tag type="info">{{ project.research_field || '未指定' }}</el-tag>
              </div>
            </div>
            <div class="meta-item">
              <div class="meta-label">提交时间</div>
              <div class="meta-value">{{ formatDate(project.submit_date) }}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">预算总额</div>
              <div class="meta-value">{{ formatCurrency(project.budget_total) }}</div>
            </div>
          </div>

          <!-- 项目摘要 -->
          <div v-if="project.abstract" class="project-abstract">
            <div class="abstract-title">项目摘要</div>
            <div class="abstract-content">{{ project.abstract }}</div>
          </div>
        </div>

        <!-- 已分配专家统计 -->
        <div class="reviewers-stats">
          <div class="stats-title">
            <el-icon><User /></el-icon>
            已分配评审专家 ({{ assignedReviewers.length }})
          </div>

          <div v-if="assignedReviewers.length === 0" class="no-reviewers">
            <el-empty description="尚未分配评审专家">
              <el-button type="primary" @click="assignMoreReviewer"> 立即分配 </el-button>
            </el-empty>
          </div>

          <div v-else class="reviewers-grid">
            <div v-for="reviewer in assignedReviewers" :key="reviewer.id" class="reviewer-card">
              <div class="reviewer-card-header">
                <div class="reviewer-avatar-section">
                  <el-avatar
                    :size="56"
                    :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${reviewer.name}`"
                  />
                  <div class="reviewer-status-indicator">
                    <el-tag :type="getReviewerStatusType(reviewer.status)" size="small">
                      {{ getReviewerStatusText(reviewer.status) }}
                    </el-tag>
                  </div>
                </div>
                <div class="reviewer-info-section">
                  <div class="reviewer-name">{{ reviewer.name }}</div>
                  <div class="reviewer-department">{{ reviewer.department || '未填写' }}</div>
                  <div class="reviewer-title">{{ reviewer.title || '评审专家' }}</div>
                </div>
              </div>

              <div class="reviewer-card-body">
                <div class="reviewer-expertise">
                  <div class="expertise-label">研究方向</div>
                  <div class="expertise-value">{{ reviewer.research_field || '未指定' }}</div>
                </div>

                <div class="reviewer-stats">
                  <div class="stat-item">
                    <div class="stat-label">评审状态</div>
                    <div class="stat-value">{{ getReviewerStatusText(reviewer.status) }}</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-label">提交时间</div>
                    <div class="stat-value">{{ formatDate(reviewer.submitted_at) || '-' }}</div>
                  </div>
                </div>

                <div class="reviewer-actions">
                  <el-button
                    type="primary"
                    size="small"
                    :icon="ChatDotRound"
                    @click="contactReviewer(reviewer)"
                  >
                    联系
                  </el-button>
                  <el-button
                    v-if="reviewer.status === 'draft'"
                    type="danger"
                    size="small"
                    :icon="Delete"
                    @click="removeReviewer(reviewer)"
                  >
                    移除
                  </el-button>
                </div>
              </div>

              <div v-if="reviewer.comments" class="reviewer-comments">
                <div class="comments-label">评审意见</div>
                <div class="comments-content">{{ reviewer.comments }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 分配记录 -->
        <div class="assignment-history">
          <div class="history-title">
            <el-icon><Clock /></el-icon>
            分配记录
          </div>

          <el-timeline>
            <el-timeline-item
              v-for="record in assignmentHistory"
              :key="record.id"
              :timestamp="formatDateTime(record.created_at)"
              :color="getTimelineColor(record.action)"
            >
              <div class="timeline-content">
                <div class="timeline-action">{{ getActionText(record.action) }}</div>
                <div class="timeline-details">
                  {{ record.details }}
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </el-card>
    </div>

    <!-- 错误状态 -->
    <div v-else class="error-container">
      <el-empty description="项目信息加载失败">
        <el-button @click="refreshData">重新加载</el-button>
        <el-button type="primary" @click="goBack">返回列表</el-button>
      </el-empty>
    </div>

    <!-- 分配专家对话框 -->
    <el-dialog
      v-model="showAssignDialog"
      :title="`分配评审专家 - ${project?.title}`"
      width="800px"
      destroy-on-close
    >
      <div v-if="project" class="assign-dialog-content">
        <!-- 专家搜索 -->
        <div class="search-section">
          <el-input
            v-model="reviewerSearch"
            placeholder="搜索专家姓名、部门或研究领域"
            clearable
            @input="searchReviewers"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>

        <!-- 专家列表 -->
        <div class="available-reviewers-list">
          <div v-if="availableReviewers.length === 0" class="empty-reviewers">
            <el-empty description="没有找到可用专家" />
          </div>
          <div v-else class="reviewer-select-list">
            <div
              v-for="reviewer in availableReviewers"
              :key="reviewer.id"
              class="reviewer-select-item"
              :class="{ selected: selectedReviewerIds.includes(reviewer.id) }"
              @click="toggleReviewerSelection(reviewer.id)"
            >
              <div class="reviewer-select-avatar">
                <el-avatar
                  :size="48"
                  :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${reviewer.name}`"
                />
              </div>
              <div class="reviewer-select-info">
                <div class="reviewer-select-name">{{ reviewer.name }}</div>
                <div class="reviewer-select-department">{{ reviewer.department }}</div>
                <div class="reviewer-select-field">
                  <el-tag size="small" type="info">{{
                    reviewer.research_field || '未指定'
                  }}</el-tag>
                </div>
              </div>
              <div class="reviewer-select-check">
                <el-checkbox
                  :model-value="selectedReviewerIds.includes(reviewer.id)"
                  @click.stop="toggleReviewerSelection(reviewer.id)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showAssignDialog = false">取消</el-button>
          <el-button
            type="primary"
            :disabled="selectedReviewerIds.length === 0"
            :loading="assignLoading"
            @click="confirmAssign"
          >
            确认分配 {{ selectedReviewerIds.length }} 位专家
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  Refresh,
  View,
  User,
  Clock,
  ChatDotRound,
  Delete,
  Plus,
  Search,
  Loading,
} from '@element-plus/icons-vue'
import axios from 'axios'

const route = useRoute()
const router = useRouter()

// API配置
const API_BASE_URL = 'http://localhost:3002/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  },
)

// 响应式数据
const loading = ref(true)
const assignLoading = ref(false)
const showAssignDialog = ref(false)
const project = ref<any>(null)
const assignedReviewers = ref<any[]>([])
const assignmentHistory = ref<any[]>([])
const availableReviewers = ref<any[]>([])
const selectedReviewerIds = ref<string[]>([])
const reviewerSearch = ref('')

// 获取项目ID
const projectId = route.params.id as string

// 格式化函数
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

const formatDateTime = (dateTimeStr: string) => {
  if (!dateTimeStr) return '-'
  const date = new Date(dateTimeStr)
  return date.toLocaleString('zh-CN')
}

const formatCurrency = (amount: number) => {
  if (!amount) return '¥0.00'
  return `¥${amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    under_review: '专家评审中',
    revision: '修改中',
    batch_review: '集中评审中',
    approved: '已批准',
    incubating: '孵化中',
    rejected: '未通过',
    completed: '已完成',
    terminated: '已终止',
  }
  return statusMap[status] || status
}

const getStatusTagType = (status: string) => {
  const typeMap: Record<string, string> = {
    draft: 'info',
    submitted: 'warning',
    under_review: 'primary',
    revision: 'warning',
    batch_review: 'primary',
    approved: 'success',
    incubating: 'primary',
    rejected: 'danger',
    completed: 'success',
    terminated: 'danger',
  }
  return typeMap[status] || 'info'
}

const getReviewerStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    draft: 'info',
    submitted: 'success',
  }
  return typeMap[status] || 'info'
}

const getReviewerStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    draft: '评审中',
    submitted: '已提交',
  }
  return textMap[status] || status
}

const getTimelineColor = (action: string) => {
  const colorMap: Record<string, string> = {
    assign_reviewer: '#b31b1b',
    remove_reviewer: '#ff4d4f',
  }
  return colorMap[action] || '#8c8c8c'
}

const getActionText = (action: string) => {
  const textMap: Record<string, string> = {
    assign_reviewer: '分配评审专家',
    remove_reviewer: '移除评审专家',
  }
  return textMap[action] || action
}

// 加载项目详情
const loadProjectDetail = async () => {
  loading.value = true
  try {
    const response = await api.get(`/projects/${projectId}`)
    if (response.success && response.data) {
      const data = response.data.project || response.data
      project.value = {
        ...data,
        applicant_name: data.applicant_name,
        applicant_department: data.department,
        research_field: data.research_field,
      }
    }
  } catch (error) {
    console.error('加载项目详情失败:', error)
    ElMessage.error('加载项目详情失败')
  } finally {
    loading.value = false
  }
}

// 加载已分配评审专家
// 加载已分配评审专家
const loadAssignedReviewers = async () => {
  try {
    // 修改为正确的 API 路径
    const response = await api.get(`/projects/${projectId}/assignments`)
    if (response.success && response.data) {
      assignedReviewers.value = response.data
    }
  } catch (error) {
    console.error('加载已分配专家失败:', error)
  }
}

// 确认分配
const confirmAssign = async () => {
  if (selectedReviewerIds.value.length === 0) {
    ElMessage.warning('请选择至少一位评审专家')
    return
  }

  assignLoading.value = true
  try {
    // 修改为正确的 API 路径
    const response = await api.post('/assistant/projects/assign-reviewer', {
      projectId: projectId,
      reviewerIds: selectedReviewerIds.value,
    })

    if (response.success) {
      ElMessage.success(`成功分配 ${selectedReviewerIds.value.length} 位专家`)
      showAssignDialog.value = false
      selectedReviewerIds.value = []
      await Promise.all([loadAssignedReviewers(), loadAssignmentHistory()])
    } else {
      ElMessage.error(response.error || '分配失败')
    }
  } catch (error) {
    console.error('分配专家失败:', error)
    ElMessage.error('分配专家失败')
  } finally {
    assignLoading.value = false
  }
}

// 移除评审专家
const removeReviewer = async (reviewer: any) => {
  try {
    await ElMessageBox.confirm(`确定要移除评审专家 "${reviewer.name}" 吗？`, '移除专家', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    // 修改为正确的 API 路径
    const response = await api.delete('/assistant/projects/remove-reviewer', {
      data: {
        projectId: projectId,
        reviewerId: reviewer.id,
      },
    })

    if (response.success) {
      ElMessage.success('专家移除成功')
      await Promise.all([loadAssignedReviewers(), loadAssignmentHistory()])
    } else {
      ElMessage.error(response.error || '移除失败')
    }
  } catch (error) {
    console.error('移除专家失败:', error)
    if (error !== 'cancel') {
      ElMessage.error('移除专家失败')
    }
  }
}

// 加载分配历史
const loadAssignmentHistory = async () => {
  try {
    const response = await api.get('/auditlog', {
      params: {
        table_name: 'ProjectReview',
        record_id: projectId,
        limit: 20,
      },
    })
    if (response.success && response.data) {
      assignmentHistory.value = response.data
    }
  } catch (error) {
    console.error('加载分配历史失败:', error)
  }
}

// 搜索可用专家
const loadAvailableReviewers = async () => {
  try {
    const response = await api.get('/users', {
      params: {
        role: 'reviewer',
        status: 'active',
        keyword: reviewerSearch.value,
      },
    })
    if (response.success && response.data) {
      const assignedIds = assignedReviewers.value.map((r) => r.id)
      availableReviewers.value = response.data.filter((r) => !assignedIds.includes(r.id))
    }
  } catch (error) {
    console.error('加载可用专家失败:', error)
  }
}

// 搜索专家
const searchReviewers = () => {
  clearTimeout((window as any).searchTimer)
  ;(window as any).searchTimer = setTimeout(() => {
    loadAvailableReviewers()
  }, 500)
}

// 切换专家选择
const toggleReviewerSelection = (reviewerId: string) => {
  const index = selectedReviewerIds.value.indexOf(reviewerId)
  if (index > -1) {
    selectedReviewerIds.value.splice(index, 1)
  } else {
    selectedReviewerIds.value.push(reviewerId)
  }
}

// 模拟专家数据
const getMockReviewers = () => {
  return [
    {
      id: 'mock_reviewer_1',
      name: '王明',
      department: '计算机学院',
      title: '教授',
      email: 'wangming@example.com',
      research_field: '人工智能,机器学习',
      status: 'active',
    },
    {
      id: 'mock_reviewer_2',
      name: '李华',
      department: '信息学院',
      title: '副教授',
      email: 'lihua@example.com',
      research_field: '大数据,数据挖掘',
      status: 'active',
    },
    {
      id: 'mock_reviewer_3',
      name: '张伟',
      department: '软件学院',
      title: '研究员',
      email: 'zhangwei@example.com',
      research_field: '软件工程,系统架构',
      status: 'active',
    },
  ]
}
// 确认分配
const confirmAssign = async () => {
  if (selectedReviewerIds.value.length === 0) {
    ElMessage.warning('请选择至少一位评审专家')
    return
  }

  assignLoading.value = true
  try {
    const response = await api.post('/assistant/projects/assign-reviewer', {
      projectId: projectId,
      reviewerIds: selectedReviewerIds.value,
    })

    if (response.success) {
      ElMessage.success(`成功分配 ${selectedReviewerIds.value.length} 位专家`)
      showAssignDialog.value = false
      selectedReviewerIds.value = []
      await Promise.all([loadAssignedReviewers(), loadAssignmentHistory()])
    } else {
      ElMessage.error(response.error || '分配失败')
    }
  } catch (error) {
    console.error('分配专家失败:', error)
    ElMessage.error('分配专家失败')
  } finally {
    assignLoading.value = false
  }
}

// 分配更多专家
const assignMoreReviewer = async () => {
  selectedReviewerIds.value = []
  reviewerSearch.value = ''
  await loadAvailableReviewers()
  showAssignDialog.value = true
}

// 处理分配成功
const handleAssignmentSuccess = () => {
  loadAssignedReviewers()
  loadAssignmentHistory()
  ElMessage.success('评审专家分配成功')
}

// 查看项目详情
const viewProjectDetail = () => {
  router.push(`/projects/detail/${projectId}`)
}

// 联系评审专家
const contactReviewer = (reviewer: any) => {
  if (reviewer.email) {
    window.location.href = `mailto:${reviewer.email}`
  } else {
    ElMessage.warning('该评审专家没有留下联系方式')
  }
}

// 返回列表
const goBack = () => {
  router.push('/assistant/reviewer-assignment')
}

// 刷新数据
const refreshData = async () => {
  await Promise.all([loadProjectDetail(), loadAssignedReviewers(), loadAssignmentHistory()])
}

// 组件挂载
onMounted(() => {
  if (projectId) {
    refreshData()
  }
})
</script>

<style scoped>
/* 样式保持不变，与之前相同 */
.reviewer-assignment-detail {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  background: white;
  border-radius: 8px;
}

.loading-text {
  margin-top: 16px;
  color: #666;
}

.content-container {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.main-card {
  border-radius: 8px;
  border: none;
}

.project-basic-info {
  padding: 24px;
  border-bottom: 1px solid #f0f0f0;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.project-title-section {
  flex: 1;
}

.project-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.project-code-section {
  display: flex;
  gap: 8px;
  align-items: center;
}

.project-action-buttons {
  display: flex;
  gap: 8px;
}

.project-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.meta-item {
  display: flex;
  flex-direction: column;
}

.meta-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.meta-value {
  font-size: 14px;
  color: #1a1a1a;
  font-weight: 500;
}

.project-abstract {
  margin-top: 20px;
  padding: 16px;
  background: #fafafa;
  border-radius: 6px;
}

.abstract-title {
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.abstract-content {
  color: #666;
  line-height: 1.6;
}

.reviewers-stats {
  padding: 24px;
  border-bottom: 1px solid #f0f0f0;
}

.stats-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 20px;
}

.no-reviewers {
  padding: 40px 20px;
}

.reviewers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.reviewer-card {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  transition: all 0.3s;
}

.reviewer-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.reviewer-card-header {
  display: flex;
  align-items: flex-start;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #f0f7ff 100%);
}

.reviewer-avatar-section {
  position: relative;
  margin-right: 16px;
}

.reviewer-status-indicator {
  position: absolute;
  top: -8px;
  right: -8px;
}

.reviewer-info-section {
  flex: 1;
}

.reviewer-name {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.reviewer-department {
  font-size: 14px;
  color: #666;
  margin-bottom: 2px;
}

.reviewer-title {
  font-size: 12px;
  color: #999;
}

.reviewer-card-body {
  padding: 16px 20px;
}

.reviewer-expertise {
  margin-bottom: 16px;
}

.expertise-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.expertise-value {
  font-size: 14px;
  color: #1a1a1a;
  font-weight: 500;
}

.reviewer-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-item {
  text-align: center;
}

.stat-label {
  font-size: 11px;
  color: #999;
  margin-bottom: 2px;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: #b31b1b;
}

.reviewer-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.reviewer-comments {
  padding: 12px 20px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
}

.comments-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.comments-content {
  font-size: 14px;
  color: #1a1a1a;
  line-height: 1.5;
}

.assignment-history {
  padding: 24px;
}

.history-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 20px;
}

.timeline-content {
  background: #fafafa;
  padding: 12px 16px;
  border-radius: 6px;
}

.timeline-action {
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.timeline-details {
  font-size: 14px;
  color: #666;
}

/* 分配对话框样式 */
.assign-dialog-content {
  max-height: 500px;
  overflow-y: auto;
}

.search-section {
  margin-bottom: 20px;
}

.available-reviewers-list {
  min-height: 300px;
}

.empty-reviewers {
  padding: 40px;
}

.reviewer-select-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reviewer-select-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  background: white;
}

.reviewer-select-item:hover {
  border-color: #b31b1b;
  background: #f5f7fa;
}

.reviewer-select-item.selected {
  border-color: #b31b1b;
  background: #f0f7ff;
}

.reviewer-select-avatar {
  flex-shrink: 0;
}

.reviewer-select-info {
  flex: 1;
}

.reviewer-select-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.reviewer-select-department {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.reviewer-select-field {
  font-size: 12px;
}

.reviewer-select-check {
  flex-shrink: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .project-header {
    flex-direction: column;
    gap: 16px;
  }

  .project-action-buttons {
    width: 100%;
    justify-content: flex-start;
  }

  .project-meta-grid {
    grid-template-columns: 1fr;
  }

  .reviewers-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .reviewer-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
