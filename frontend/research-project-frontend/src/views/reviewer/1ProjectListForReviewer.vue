<template>
  <div class="project-review-list">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>项目评审列表</h1>
        <p class="page-description">查看所有项目信息，对评审中的项目进行评审操作</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="refreshData" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button @click="goBack">
          <el-icon><Back /></el-icon>
          返回工作台
        </el-button>
      </div>
    </div>

    <!-- 筛选工具栏 -->
    <el-card class="filter-card">
      <div class="filter-container">
        <div class="filter-left">
          <el-input
            v-model="filter.search"
            placeholder="搜索项目标题、编号或申请人"
            clearable
            style="width: 280px"
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-select
            v-model="filter.category"
            placeholder="项目类别"
            clearable
            style="margin-left: 15px; width: 150px"
            @change="handleSearch"
          >
            <el-option label="基础研究" value="基础研究" />
            <el-option label="应用研究" value="应用研究" />
            <el-option label="技术开发" value="技术开发" />
            <el-option label="成果转化" value="成果转化" />
            <el-option label="平台建设" value="平台建设" />
            <el-option label="其他" value="其他" />
          </el-select>

          <el-select
            v-model="filter.research_field"
            placeholder="研究领域"
            clearable
            style="margin-left: 15px; width: 180px"
            @change="handleSearch"
          >
            <el-option label="人工智能" value="人工智能" />
            <el-option label="机器学习" value="机器学习" />
            <el-option label="数据科学" value="数据科学" />
            <el-option label="软件工程" value="软件工程" />
            <el-option label="网络安全" value="网络安全" />
            <el-option label="生物信息" value="生物信息" />
            <el-option label="材料科学" value="材料科学" />
            <el-option label="环境科学" value="环境科学" />
          </el-select>

          <el-select
            v-model="filter.status"
            placeholder="项目状态"
            clearable
            style="margin-left: 15px; width: 150px"
            @change="handleSearch"
          >
            <el-option label="全部状态" value="" />
            <el-option label="草稿" value="draft" />
            <el-option label="已提交" value="submitted" />
            <el-option label="评审中" value="under_review" />
            <el-option label="已批准" value="approved" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="阶段评审" value="stage_review" />
            <el-option label="已完成" value="completed" />
            <el-option label="已拒绝" value="rejected" />
            <el-option label="已终止" value="terminated" />
          </el-select>
        </div>

        <div class="filter-right">
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetFilter">
            <el-icon><RefreshRight /></el-icon>
            重置
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 统计卡片 -->
    <div class="stats-cards" v-if="!loading && projectStats">
      <el-row :gutter="16">
        <el-col :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon total">
                <el-icon><Folder /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ projectStats.total || 0 }}</div>
                <div class="stat-label">总项目数</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon pending">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ projectStats.under_review || 0 }}</div>
                <div class="stat-label">评审中</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon in-progress">
                <el-icon><Setting /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ projectStats.in_progress || 0 }}</div>
                <div class="stat-label">进行中</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon completed">
                <el-icon><CircleCheck /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ projectStats.completed || 0 }}</div>
                <div class="stat-label">已完成</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 项目列表 -->
    <el-card class="project-list-card">
      <template #header>
        <div class="list-header">
          <h3>项目列表</h3>
          <div class="header-actions">
            <el-button
              type="primary"
              text
              @click="exportProjects"
              :loading="exporting"
              :disabled="projects.length === 0"
            >
              <el-icon><Download /></el-icon>
              导出列表
            </el-button>
          </div>
        </div>
      </template>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>

      <!-- 空状态 -->
      <div v-else-if="projects.length === 0" class="empty-container">
        <el-empty description="暂无项目数据">
          <template #image>
            <el-icon size="60"><Document /></el-icon>
          </template>
          <el-button type="primary" @click="refreshData">刷新数据</el-button>
        </el-empty>
      </div>

      <!-- 项目表格 -->
      <el-table
        v-else
        :data="projects"
        v-loading="loading"
        stripe
        style="width: 100%"
        @sort-change="handleSortChange"
      >
        <el-table-column prop="project_code" label="项目编号" width="120" sortable="custom">
          <template #default="{ row }">
            <span class="project-code">{{ row.project_code }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="title" label="项目标题" min-width="200" sortable="custom">
          <template #default="{ row }">
            <div class="project-title">
              <el-link type="primary" @click="viewProjectDetail(row)" :underline="false">
                {{ row.title }}
              </el-link>
              <div class="project-abstract">
                {{ truncateText(row.abstract, 60) }}
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="category" label="类别" width="100" sortable="custom">
          <template #default="{ row }">
            <el-tag size="small" :type="getCategoryTag(row.category)">
              {{ row.category }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="research_field" label="研究领域" width="120">
          <template #default="{ row }">
            <span class="research-field">{{ row.research_field }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="applicant_name" label="申请人" width="120" sortable="custom">
          <template #default="{ row }">
            <div class="applicant-info">
              <div class="applicant-name">{{ row.applicant_name || '未指定' }}</div>
              <div class="applicant-department" v-if="row.applicant_department">
                {{ row.applicant_department }}
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="budget_total" label="预算" width="100" sortable="custom">
          <template #default="{ row }">
            <span class="budget-amount">¥{{ formatNumber(row.budget_total) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="duration_months" label="周期" width="80" sortable="custom">
          <template #default="{ row }">
            <span>{{ row.duration_months }}个月</span>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="项目状态" width="100" sortable="custom">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="创建时间" width="140" sortable="custom">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column label="评审状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getReviewStatusTag(row)" size="small">
              {{ getReviewStatusText(row) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button
                size="small"
                type="primary"
                @click="startReview(row)"
                v-if="row.status === 'under_review' || row.status === 'stage_review'"
              >
                <el-icon><Edit /></el-icon>
                开始评审
              </el-button>

              <el-button size="small" type="info" @click="viewProjectDetail(row)">
                <el-icon><View /></el-icon>
                查看详情
              </el-button>

              <el-button
                size="small"
                type="success"
                @click="viewExistingReview(row)"
                v-if="hasExistingReview(row)"
              >
                <el-icon><DocumentChecked /></el-icon>
                查看评审
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container" v-if="total > 0">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 项目详情对话框 -->
    <el-dialog
      v-model="detailDialog.visible"
      :title="detailDialog.title"
      width="80%"
      top="5vh"
      :close-on-click-modal="false"
    >
      <ProjectDetailView
        v-if="detailDialog.visible && detailDialog.project"
        :project="detailDialog.project"
        @close="detailDialog.visible = false"
      />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { getApiBaseUrl, getApiOrigin } from '@/utils/request'
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh,
  Back,
  Search,
  Folder,
  Clock,
  Setting,
  CircleCheck,
  Download,
  Document,
  Edit,
  View,
  DocumentChecked,
  RefreshRight,
} from '@element-plus/icons-vue'
import axios from 'axios'
import ProjectDetailView from './1ProjectDetailView.vue'

const router = useRouter()

// 数据状态
const projects = ref<any[]>([])
const projectStats = ref<any>({})
const loading = ref(false)
const exporting = ref(false)

// 分页和筛选
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const sortField = ref('created_at')
const sortOrder = ref('desc')

const filter = ref({
  search: '',
  category: '',
  research_field: '',
  status: '', // 默认为空，查看所有状态
})

// 详情对话框
const detailDialog = ref({
  visible: false,
  title: '',
  project: null as any,
})

// 方法
const loadProjects = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      ElMessage.error('请先登录')
      router.push('/login')
      return
    }

    // 使用评审者专用API
    const response = await axios.get(`${getApiBaseUrl()}/reviewer/projects`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        page: currentPage.value,
        limit: pageSize.value,
        search: filter.value.search,
        category: filter.value.category,
        research_field: filter.value.research_field,
        status: filter.value.status,
        sort_by: sortField.value,
        sort_order: sortOrder.value,
      },
    })

    console.log('📥 评审者项目列表响应:', response.data)

    if (response.data.success) {
      projects.value = response.data.data || []
      total.value = response.data.total || 0
      projectStats.value = response.data.stats || {}

      ElMessage.success(`成功加载 ${projects.value.length} 个项目`)
    } else {
      ElMessage.error(response.data.error || '加载项目列表失败')
    }
  } catch (error: any) {
    console.error('加载项目列表失败:', error)

    if (error.response?.status === 401) {
      ElMessage.error('登录已过期，请重新登录')
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    } else {
      ElMessage.error('加载项目列表失败：' + (error.response?.data?.error || error.message))
    }
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  loadProjects()
}

const resetFilter = () => {
  filter.value = {
    search: '',
    category: '',
    research_field: '',
    status: '',
  }
  sortField.value = 'created_at'
  sortOrder.value = 'desc'
  currentPage.value = 1
  loadProjects()
}

const refreshData = () => {
  loadProjects()
}

const handleSortChange = ({ prop, order }: any) => {
  if (prop) {
    sortField.value = prop
    sortOrder.value = order === 'ascending' ? 'asc' : 'desc'
    loadProjects()
  }
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  loadProjects()
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  loadProjects()
}

const startReview = async (project: any) => {
  // 只有状态为评审中的项目才能开始评审
  if (project.status === 'under_review' || project.status === 'stage_review') {
    checkExistingReview(project)
  } else {
    ElMessage.warning('只有评审中的项目才能开始评审')
    // 但仍然允许查看详情
    viewProjectDetail(project)
  }
}

const checkExistingReview = async (project: any) => {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      ElMessage.error('请先登录')
      return
    }

    // 检查是否已有评审记录
    const response = await axios.get(
      `${getApiBaseUrl()}/reviewer/reviews?project_id=${project.id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    if (response.data.success && response.data.data?.has_review) {
      // 已有评审记录，跳转到编辑页面
      const review = response.data.data.reviews[0]
      router.push({
        name: 'ReviewTaskDetail',
        params: { id: review.id },
        query: {
          projectId: project.id,
          projectTitle: project.title,
          projectCode: project.project_code,
        },
      })
    } else {
      // 没有评审记录，创建新评审
      router.push({
        name: 'ReviewTaskDetail',
        query: {
          projectId: project.id,
          projectTitle: project.title,
          projectCode: project.project_code,
          createNew: 'true',
        },
      })
    }
  } catch (error) {
    console.error('检查评审记录失败:', error)
    // 直接跳转到创建评审页面
    router.push({
      name: 'ReviewTaskDetail',
      query: {
        projectId: project.id,
        projectTitle: project.title,
        projectCode: project.project_code,
        createNew: 'true',
      },
    })
  }
}

const viewProjectDetail = (project: any) => {
  detailDialog.value = {
    visible: true,
    title: `项目详情 - ${project.project_code}`,
    project: project,
  }
}

const viewExistingReview = (project: any) => {
  // 跳转到已存在的评审详情页面
  ElMessage.info('正在加载评审详情...')
  // 实际实现中需要先查询评审记录
}

const hasExistingReview = (project: any) => {
  // 检查项目是否有评审记录
  return project.review_count && project.review_count > 0
}

const exportProjects = async () => {
  exporting.value = true
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      ElMessage.error('请先登录')
      return
    }

    // 使用评审者专用导出API
    const response = await axios.get(`${getApiBaseUrl()}/reviewer/projects/export`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        ...filter.value,
        format: 'csv',
      },
      responseType: 'blob',
    })

    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `评审者项目列表_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()

    ElMessage.success('导出成功')
  } catch (error: any) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败：' + (error.response?.data?.error || error.message))
  } finally {
    exporting.value = false
  }
}

const getCategoryTag = (category: string) => {
  const tagMap: Record<string, string> = {
    基础研究: 'primary',
    应用研究: 'success',
    技术开发: 'warning',
    成果转化: 'info',
    平台建设: 'danger',
    其他: '',
  }
  return tagMap[category] || 'info'
}

const getStatusTag = (status: string) => {
  const tagMap: Record<string, string> = {
    draft: '',
    submitted: 'info',
    under_review: 'warning',
    approved: 'success',
    in_progress: 'primary',
    stage_review: 'warning',
    completed: 'success',
    rejected: 'danger',
    terminated: 'danger',
  }
  return tagMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    under_review: '评审中',
    approved: '已批准',
    in_progress: '进行中',
    stage_review: '阶段评审',
    completed: '已完成',
    rejected: '已拒绝',
    terminated: '已终止',
  }
  return textMap[status] || status
}

const getReviewStatusTag = (project: any) => {
  if (project.review_status) {
    if (project.review_status === 'submitted') {
      return 'success'
    } else if (project.review_status === 'draft') {
      return 'warning'
    }
  }

  // 如果项目本身不是评审状态
  if (!['under_review', 'stage_review'].includes(project.status)) {
    return 'info'
  }

  return project.review_count > 0 ? 'info' : 'warning'
}

const getReviewStatusText = (project: any) => {
  if (project.review_status) {
    const textMap: Record<string, string> = {
      draft: '评审草稿',
      submitted: '已提交评审',
      locked: '已锁定',
    }
    return textMap[project.review_status] || project.review_status
  }

  // 如果项目本身不是评审状态，显示不同的文本
  if (!['under_review', 'stage_review'].includes(project.status)) {
    return '无需评审'
  }

  return project.review_count > 0 ? '已评审' : '待评审'
}

const truncateText = (text: string, maxLength: number) => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

const formatNumber = (num: number | string | null) => {
  if (num === null || num === undefined || num === '') return '0'
  const number = Number(num)
  if (isNaN(number)) return '0'
  return number.toLocaleString('zh-CN')
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

const goBack = () => {
  router.push('/reviewer/dashboard')
}

// 生命周期
onMounted(() => {
  loadProjects()
})
</script>

<style scoped>
.project-review-list {
  padding: 20px;
  max-width: 1600px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.header-left h1 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 24px;
}

.page-description {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.filter-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.filter-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stats-cards {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-content {
  display: flex;
  align-items: center;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 24px;
}

.stat-icon.total {
  background-color: #e6f7ff;
  color: #1890ff;
}

.stat-icon.pending {
  background-color: #fff7e6;
  color: #fa8c16;
}

.stat-icon.in-progress {
  background-color: #f6ffed;
  color: #52c41a;
}

.stat-icon.completed {
  background-color: #f9f0ff;
  color: #722ed1;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.project-list-card {
  margin-bottom: 20px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.list-header h3 {
  margin: 0;
  color: #303133;
}

.loading-container,
.empty-container {
  padding: 40px 0;
  text-align: center;
}

.project-code {
  font-family: 'Courier New', monospace;
  font-weight: bold;
  color: #1890ff;
}

.project-title {
  line-height: 1.4;
}

.project-abstract {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.3;
}

.applicant-info {
  line-height: 1.4;
}

.applicant-name {
  font-weight: 500;
}

.applicant-department {
  font-size: 12px;
  color: #909399;
}

.budget-amount {
  font-weight: 600;
  color: #f5222d;
}

.research-field {
  font-size: 13px;
  color: #595959;
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .filter-container {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-left {
    width: 100%;
    flex-direction: column;
  }

  .filter-left > * {
    width: 100%;
    margin-left: 0 !important;
    margin-bottom: 10px;
  }

  .filter-right {
    width: 100%;
    justify-content: flex-end;
  }

  .stat-card .stat-content {
    flex-direction: column;
    text-align: center;
  }

  .stat-icon {
    margin-right: 0;
    margin-bottom: 10px;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-buttons .el-button {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .project-review-list {
    padding: 10px;
  }

  .el-table .el-table__cell {
    padding: 8px 0;
  }
}
</style>
