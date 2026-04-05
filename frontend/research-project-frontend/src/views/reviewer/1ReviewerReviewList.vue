<!-- src/views/reviewer/ReviewerReviewList.vue -->
<template>
  <div class="review-list-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1>待评审项目</h1>
      <el-breadcrumb separator="/">
        <el-breadcrumb-item>评审工作台</el-breadcrumb-item>
        <el-breadcrumb-item>待评审项目</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 搜索和筛选 -->
    <div class="filters-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-input
            v-model="searchQuery"
            placeholder="搜索项目标题或编号"
            clearable
            @clear="loadReviews"
            @keyup.enter="loadReviews"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="6">
          <el-select v-model="filterStatus" placeholder="选择状态" clearable @change="loadReviews">
            <el-option label="待评审" value="draft" />
            <el-option label="已提交" value="submitted" />
            <el-option label="所有" value="" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select
            v-model="filterType"
            placeholder="选择评审类型"
            clearable
            @change="loadReviews"
          >
            <el-option label="立项评审" value="initial" />
            <el-option label="中期评审" value="mid_term" />
            <el-option label="结题评审" value="final" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <div class="action-buttons">
            <el-button type="primary" @click="loadReviews">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="resetFilters">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 项目列表 -->
    <div class="projects-list">
      <el-row :gutter="20">
        <el-col v-for="project in projects" :key="project.id" :xs="24" :sm="12" :md="8" :lg="6">
          <el-card class="project-card">
            <template #header>
              <div class="card-header">
                <div class="project-code">{{ project.code }}</div>
                <el-tag :type="getStatusTag(project.status)" size="small">
                  {{ getStatusText(project.status) }}
                </el-tag>
              </div>
            </template>

            <div class="project-content">
              <h3 class="project-title">{{ project.title }}</h3>

              <div class="project-info">
                <div class="info-item">
                  <span class="label">申请人:</span>
                  <span class="value">{{ project.applicant }}</span>
                </div>
                <div class="info-item">
                  <span class="label">申请金额:</span>
                  <span class="value">{{ formatFunds(project.budget) }}</span>
                </div>
                <div class="info-item">
                  <span class="label">截止日期:</span>
                  <span class="value deadline" :class="getDeadlineClass(project.deadline)">
                    {{ formatDate(project.deadline) }}
                  </span>
                </div>
                <div class="info-item">
                  <span class="label">剩余时间:</span>
                  <span class="value" :class="getRemainingTimeClass(project.deadline)">
                    {{ getRemainingDays(project.deadline) }}
                  </span>
                </div>
              </div>

              <div class="project-actions">
                <el-button
                  v-if="project.status === 'draft' || project.status === 'pending'"
                  type="primary"
                  @click="startReview(project)"
                  size="small"
                >
                  开始评审
                </el-button>
                <el-button type="default" @click="viewProjectDetails(project)" size="small">
                  查看详情
                </el-button>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 空状态 -->
      <div v-if="projects.length === 0 && !loading" class="empty-state">
        <el-empty description="暂无待评审项目">
          <el-button type="primary" @click="loadReviews">刷新</el-button>
        </el-empty>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <el-skeleton :rows="4" animated />
      </div>

      <!-- 分页 -->
      <div v-if="total > 0" class="pagination-section">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 30, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import request from '@/utils/request'

const router = useRouter()
const route = useRoute()

// 状态管理
const loading = ref(false)
const projects = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const searchQuery = ref('')
const filterStatus = ref('draft')
const filterType = ref('')

// 生命周期
onMounted(() => {
  loadReviews()

  // 检查是否有从仪表板传递的项目ID
  if (route.query.projectId) {
    const projectId = route.query.projectId as string
    const action = route.query.action as string

    if (action === 'new') {
      // 直接开始新评审
      startNewReview(projectId)
    }
  }
})

// 加载评审列表
const loadReviews = async () => {
  loading.value = true

  try {
    const response = await request.get('/api/reviewer/reviews', {
      params: {
        page: currentPage.value,
        limit: pageSize.value,
        status: filterStatus.value,
        review_type: filterType.value,
        search: searchQuery.value,
      },
    })

    if (response.success) {
      const data = response.data
      projects.value = data.reviews || data.data || []
      total.value = data.pagination?.total || data.total || projects.value.length

      // 如果没有待评审项目，尝试从项目列表获取
      if (projects.value.length === 0 && filterStatus.value === 'draft') {
        await loadAssignedProjects()
      }
    }
  } catch (error) {
    console.error('加载评审列表失败:', error)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

// 加载已分配的项目
const loadAssignedProjects = async () => {
  try {
    const response = await request.get('/api/reviewer/assignments')
    if (response.success) {
      projects.value = response.data.projects || response.data.data || []
    }
  } catch (error) {
    console.error('加载分配项目失败:', error)
  }
}

// 开始评审
const startReview = async (project: any) => {
  console.log('开始评审项目:', project)

  try {
    // 检查是否已有评审记录
    if (project.reviewId) {
      // 跳转到现有评审
      router.push(`/reviewer/reviews/${project.reviewId}`)
    } else {
      // 创建新评审
      const response = await request.post('/api/reviewer/review', {
        project_id: project.id,
        review_type: 'initial',
        status: 'draft',
      })

      if (response.success && response.review_id) {
        router.push(`/reviewer/reviews/${response.review_id}`)
      } else {
        ElMessage.error('创建评审失败')
      }
    }
  } catch (error) {
    console.error('开始评审失败:', error)
    ElMessage.error('开始评审失败')
  }
}

// 开始新评审（从仪表板跳转过来）
const startNewReview = async (projectId: string) => {
  try {
    const response = await request.post('/api/reviewer/review', {
      project_id: projectId,
      review_type: 'initial',
      status: 'draft',
    })

    if (response.success && response.review_id) {
      router.push(`/reviewer/reviews/${response.review_id}`)
    }
  } catch (error) {
    console.error('创建新评审失败:', error)
    ElMessage.error('创建评审失败')
  }
}

// 查看项目详情
const viewProjectDetails = (project: any) => {
  router.push(`/projects/detail/${project.id}`)
}

// 辅助方法
const getStatusTag = (status: string) => {
  const statusMap: Record<string, string> = {
    draft: 'warning',
    pending: 'warning',
    submitted: 'success',
    completed: 'success',
    under_review: 'info',
  }
  return statusMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    draft: '待评审',
    pending: '待处理',
    submitted: '已提交',
    completed: '已完成',
    under_review: '评审中',
  }
  return statusMap[status] || status
}

const formatFunds = (funds: number) => {
  if (!funds) return '¥0'
  const num = Number(funds)
  if (isNaN(num)) return '¥0'
  if (num >= 100000000) {
    return '¥' + (num / 100000000).toFixed(2) + '亿'
  }
  if (num >= 10000) {
    return '¥' + (num / 10000).toFixed(2) + '万'
  }
  return '¥' + num.toFixed(2)
}

const formatDate = (dateString: string) => {
  if (!dateString) return '未设置'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  } catch (e) {
    return dateString
  }
}

const getRemainingDays = (deadline: string) => {
  if (!deadline) return '未设置'
  const now = new Date()
  const endDate = new Date(deadline)
  const diffTime = endDate - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return '已过期'
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '明天'
  return `${diffDays}天`
}

const getDeadlineClass = (deadline: string) => {
  if (!deadline) return ''
  const now = new Date()
  const endDate = new Date(deadline)
  const diffTime = endDate - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'expired'
  if (diffDays <= 3) return 'urgent'
  if (diffDays <= 7) return 'warning'
  return ''
}

const getRemainingTimeClass = (deadline: string) => {
  if (!deadline) return ''
  const now = new Date()
  const endDate = new Date(deadline)
  const diffTime = endDate - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'expired'
  if (diffDays <= 3) return 'urgent'
  return ''
}

// 分页处理
const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  loadReviews()
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  loadReviews()
}

// 重置筛选条件
const resetFilters = () => {
  searchQuery.value = ''
  filterStatus.value = 'draft'
  filterType.value = ''
  currentPage.value = 1
  loadReviews()
}
</script>

<style scoped>
.review-list-page {
  padding: 20px;
  max-width: 1600px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 30px;
}

.page-header h1 {
  margin: 0 0 10px 0;
  color: #303133;
  font-size: 24px;
}

.filters-section {
  margin-bottom: 30px;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.projects-list {
  margin-top: 20px;
}

.project-card {
  margin-bottom: 20px;
  transition: all 0.3s;
}

.project-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-code {
  font-weight: 600;
  color: #409eff;
  font-family: monospace;
}

.project-content {
  padding: 10px 0;
}

.project-title {
  margin: 0 0 15px 0;
  font-size: 16px;
  line-height: 1.4;
  color: #303133;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-info {
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}

.info-item .label {
  color: #909399;
}

.info-item .value {
  color: #303133;
  font-weight: 500;
  text-align: right;
  flex: 1;
  margin-left: 10px;
}

.deadline.expired {
  color: #f56c6c;
}

.deadline.urgent {
  color: #e6a23c;
}

.deadline.warning {
  color: #e6a23c;
}

.project-actions {
  display: flex;
  gap: 10px;
  padding-top: 15px;
  border-top: 1px solid #f0f0f0;
}

.project-actions .el-button {
  flex: 1;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.loading-state {
  padding: 30px;
}

.pagination-section {
  margin-top: 30px;
  text-align: center;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
