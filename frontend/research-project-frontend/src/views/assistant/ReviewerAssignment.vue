<!-- src/views/assistant/ReviewerAssignment.vue -->
<template>
  <div class="reviewer-assignment">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1 class="page-title">📋 评审专家分配</h1>
      <div class="header-actions">
        <el-button type="primary" @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button @click="exportToExcel">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-card shadow="hover" class="stat-card">
        <div class="stat-content">
          <div class="stat-icon" style="background: #e6f7ff">
            <el-icon><Document /></el-icon>
          </div>
          <div class="stat-details">
            <div class="stat-value">{{ stats.total || 0 }}</div>
            <div class="stat-label">待分配项目</div>
          </div>
        </div>
      </el-card>

      <el-card shadow="hover" class="stat-card">
        <div class="stat-content">
          <div class="stat-icon" style="background: #f6ffed">
            <el-icon><Check /></el-icon>
          </div>
          <div class="stat-details">
            <div class="stat-value">{{ stats.submitted || 0 }}</div>
            <div class="stat-label">已提交项目</div>
          </div>
        </div>
      </el-card>

      <el-card shadow="hover" class="stat-card">
        <div class="stat-content">
          <div class="stat-icon" style="background: #fff7e6">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="stat-details">
            <div class="stat-value">{{ stats.under_review || 0 }}</div>
            <div class="stat-label">评审中项目</div>
          </div>
        </div>
      </el-card>

      <el-card shadow="hover" class="stat-card">
        <div class="stat-content">
          <div class="stat-icon" style="background: #f0f7ff">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-details">
            <div class="stat-value">{{ availableReviewers || 0 }}</div>
            <div class="stat-label">可用专家</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 搜索筛选 -->
    <el-card shadow="never" class="filter-card">
      <div class="filter-form">
        <el-form :inline="true" :model="filterForm">
          <el-form-item label="项目编号">
            <el-input
              v-model="filterForm.projectCode"
              placeholder="请输入项目编号"
              clearable
              style="width: 180px"
            />
          </el-form-item>

          <el-form-item label="项目标题">
            <el-input
              v-model="filterForm.projectTitle"
              placeholder="请输入项目标题"
              clearable
              style="width: 200px"
            />
          </el-form-item>

          <el-form-item label="申请人">
            <el-input
              v-model="filterForm.applicantName"
              placeholder="请输入申请人姓名"
              clearable
              style="width: 150px"
            />
          </el-form-item>

          <el-form-item label="研究领域">
            <el-input
              v-model="filterForm.researchField"
              placeholder="研究领域"
              clearable
              style="width: 180px"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="resetFilter">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <!-- 项目列表 -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="table-header">
          <span class="table-title">待分配评审项目列表</span>
          <div class="table-actions">
            <el-tag type="warning" size="small"> 共 {{ pagination.total }} 个项目 </el-tag>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="projectList"
        stripe
        style="width: 100%"
        @row-click="handleRowClick"
      >
        <el-table-column prop="project_code" label="项目编号" width="140">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.project_code }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="title" label="项目标题" min-width="200">
          <template #default="{ row }">
            <div class="project-title">
              <span class="title-text">{{ row.title }}</span>
              <el-tag v-if="row.status === 'submitted'" size="small" type="warning">
                待分配
              </el-tag>
              <el-tag
                v-else-if="row.status === 'under_review' || row.status === 'batch_review'"
                size="small"
                type="primary"
              >
                评审中
              </el-tag>
            </div>
            <div class="project-meta">
              <span class="meta-item">
                <el-icon><User /></el-icon>
                {{ row.applicant_name }}
              </span>
              <span class="meta-item">
                <el-icon><OfficeBuilding /></el-icon>
                {{ row.applicant_department }}
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="research_field" label="研究领域" width="180">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.research_field || '未指定' }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="submit_date" label="提交时间" width="120">
          <template #default="{ row }">
            {{ formatDate(row.submit_date) }}
          </template>
        </el-table-column>

        <el-table-column label="已分配专家" width="200">
          <template #default="{ row }">
            <div v-if="row.reviewer_count > 0">
              <div class="reviewer-list">
                <div v-for="reviewer in row.reviewers" :key="reviewer.id" class="reviewer-item">
                  <el-avatar
                    :size="24"
                    :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${reviewer.name}`"
                  />
                  <span class="reviewer-name">{{ reviewer.name }}</span>
                  <el-tag v-if="reviewer.submitted_at" size="mini" type="success"> 已评审 </el-tag>
                  <el-tag v-else size="mini" type="info"> 待评审 </el-tag>
                </div>
              </div>
              <div class="reviewer-count">
                <el-text type="info" size="small"> 已分配 {{ row.reviewer_count }} 位专家 </el-text>
              </div>
            </div>
            <div v-else>
              <el-text type="danger" size="small">未分配</el-text>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" size="small" @click.stop="assignReviewer(row)">
                <el-icon><Plus /></el-icon>
                分配专家
              </el-button>
              <el-button
                v-if="row.reviewer_count > 0"
                size="small"
                @click.stop="viewAssignment(row)"
              >
                查看
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 30, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 分配专家对话框 -->
    <el-dialog
      v-model="assignDialogVisible"
      :title="`分配评审专家 - ${selectedProject?.title}`"
      width="800px"
      destroy-on-close
    >
      <div v-if="selectedProject" class="assignment-dialog">
        <!-- 项目信息 -->
        <el-card shadow="never" class="project-info-card">
          <template #header>
            <div class="project-info-header">
              <span>项目信息</span>
              <el-tag :type="selectedProject.status === 'submitted' ? 'warning' : 'primary'">
                {{ getStatusText(selectedProject.status) }}
              </el-tag>
            </div>
          </template>

          <div class="project-details">
            <div class="detail-item">
              <span class="detail-label">项目编号：</span>
              <span class="detail-value">{{ selectedProject.project_code }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">研究领域：</span>
              <el-tag size="small">{{ selectedProject.research_field || '未指定' }}</el-tag>
            </div>
            <div class="detail-item">
              <span class="detail-label">申请人：</span>
              <span class="detail-value"
                >{{ selectedProject.applicant_name }} ({{
                  selectedProject.applicant_department
                }})</span
              >
            </div>
            <div class="detail-item">
              <span class="detail-label">提交时间：</span>
              <span class="detail-value">{{ formatDate(selectedProject.submit_date) }}</span>
            </div>
          </div>
        </el-card>

        <!-- 已分配的专家 -->
        <el-card shadow="never" class="assigned-reviewers-card" v-if="assignedReviewers.length > 0">
          <template #header>
            <div class="assigned-header">
              <span>已分配专家</span>
              <el-tag type="primary" size="small"> {{ assignedReviewers.length }} 位 </el-tag>
            </div>
          </template>

          <div class="reviewer-list">
            <div
              v-for="reviewer in assignedReviewers"
              :key="reviewer.id"
              class="reviewer-item detailed"
            >
              <el-avatar
                :size="40"
                :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${reviewer.name}`"
              />
              <div class="reviewer-info">
                <div class="reviewer-name">{{ reviewer.name }}</div>
                <div class="reviewer-details">
                  <span>{{ reviewer.department }}</span>
                  <span>{{ reviewer.title }}</span>
                </div>
              </div>
              <div class="reviewer-actions">
                <el-button type="danger" size="small" text @click="removeReviewer(reviewer)">
                  <el-icon><Close /></el-icon>
                  移除
                </el-button>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 专家搜索和选择 -->
        <el-card shadow="never" class="available-reviewers-card">
          <template #header>
            <div class="available-header">
              <span>选择评审专家</span>
              <el-input
                v-model="reviewerSearch"
                placeholder="搜索专家姓名、部门"
                size="small"
                style="width: 250px"
                @input="searchReviewers"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </div>
          </template>

          <div class="reviewer-selection">
            <!-- 推荐专家（根据研究领域匹配） -->
            <div v-if="recommendedReviewers.length > 0" class="recommended-section">
              <div class="section-title">
                <el-icon><Star /></el-icon>
                推荐专家（匹配研究领域）
              </div>
              <div class="reviewer-grid">
                <div
                  v-for="reviewer in recommendedReviewers"
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
                    <div v-if="reviewer.is_assigned" class="assigned-badge">已分配</div>
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

            <!-- 所有专家 -->
            <div class="all-reviewers-section">
              <div class="section-title">
                <el-icon><UserFilled /></el-icon>
                所有可用专家
              </div>
              <div v-if="availableReviewersList.length === 0" class="empty-reviewers">
                <el-empty description="没有找到可用专家" />
              </div>
              <div v-else class="reviewer-grid">
                <div
                  v-for="reviewer in availableReviewersList"
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
                    <div v-if="reviewer.is_assigned" class="assigned-badge">已分配</div>
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
        </el-card>

        <!-- 分配选项 -->
        <div class="assignment-options">
          <div class="selected-count">已选择 {{ selectedReviewerIds.length }} 位专家</div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="assignDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            :disabled="selectedReviewerIds.length === 0"
            :loading="assignLoading"
            @click="confirmAssignment"
          >
            确认分配 {{ selectedReviewerIds.length }} 位专家
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <el-icon class="is-loading" size="large">
        <Loading />
      </el-icon>
      <div class="loading-text">正在加载数据...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh,
  Download,
  Document,
  Check,
  Clock,
  User,
  Search,
  Close,
  Star,
  UserFilled,
  DocumentChecked,
  OfficeBuilding,
  Loading,
  Plus,
} from '@element-plus/icons-vue'
import axios from 'axios'

const router = useRouter()

// API配置
const API_BASE_URL = 'http://localhost:3002/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
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
const loading = ref(false)
const assignLoading = ref(false)
const assignDialogVisible = ref(false)
const reviewerSearch = ref('')

// 过滤表单
const filterForm = reactive({
  projectCode: '',
  projectTitle: '',
  applicantName: '',
  researchField: '',
})

// 项目列表数据
const projectList = ref<any[]>([])
const stats = ref({
  total: 0,
  submitted: 0,
  under_review: 0,
})

// 分页数据
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
})

// 分配专家相关数据
const selectedProject = ref<any>(null)
const selectedReviewerIds = ref<string[]>([])
const assignedReviewers = ref<any[]>([])
const availableReviewersList = ref<any[]>([])

// 推荐专家
const recommendedReviewers = computed(() => {
  if (!selectedProject.value?.research_field) {
    return availableReviewersList.value.filter((r) => !r.is_assigned).slice(0, 6)
  }
  return availableReviewersList.value
    .filter((r) => !r.is_assigned)
    .sort((a, b) => {
      const aMatch = a.research_field === selectedProject.value.research_field ? 1 : 0
      const bMatch = b.research_field === selectedProject.value.research_field ? 1 : 0
      return bMatch - aMatch
    })
    .slice(0, 6)
})

const availableReviewers = computed(() => {
  return availableReviewersList.value.length
})

// 获取状态文本
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    submitted: '待分配',
    under_review: '评审中',
    revision: '修改中',
    batch_review: '集中评审',
  }
  return statusMap[status] || status
}

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

// 加载项目列表
const loadProjectList = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.current,
      limit: pagination.pageSize,
      status: ['submitted', 'under_review', 'batch_review'],
    }

    if (filterForm.projectCode) params.project_code = filterForm.projectCode
    if (filterForm.projectTitle) params.title = filterForm.projectTitle
    if (filterForm.applicantName) params.applicant_name = filterForm.applicantName
    if (filterForm.researchField) params.research_field = filterForm.researchField

    const response = await api.get('/projects', { params })

    if (response.success && response.data) {
      const projects = response.data
      projectList.value = projects.map((p: any) => ({
        ...p,
        reviewer_count: p.reviewer_count || 0,
        reviewers: p.reviewers || [],
      }))
      pagination.total = response.total || projects.length

      // 更新统计
      stats.value.submitted = projects.filter((p: any) => p.status === 'submitted').length
      stats.value.under_review = projects.filter(
        (p: any) => p.status === 'under_review' || p.status === 'batch_review',
      ).length
      stats.value.total = stats.value.submitted + stats.value.under_review
    }
  } catch (error) {
    console.error('加载项目列表失败:', error)
    ElMessage.error('加载项目列表失败')
  } finally {
    loading.value = false
  }
}

// 加载可用评审专家
const loadAvailableReviewers = async () => {
  if (!selectedProject.value) return

  try {
    const params: any = {}
    if (reviewerSearch.value) params.keyword = reviewerSearch.value

    const response = await api.get('/users', {
      params: { role: 'reviewer', status: 'active', ...params },
    })

    if (response.success && response.data) {
      availableReviewersList.value = response.data.map((r: any) => ({
        id: r.id,
        name: r.name,
        department: r.department,
        title: r.title,
        research_field: r.research_field,
        is_assigned: assignedReviewers.value.some((a) => a.id === r.id),
      }))
    }
  } catch (error) {
    console.error('加载评审专家失败:', error)
  }
}

// 加载已分配的专家
// 加载已分配的专家
const loadAssignedReviewers = async () => {
  if (!selectedProject.value) return

  try {
    // 修改为正确的 API 路径
    const response = await api.get(`/projects/${selectedProject.value.id}/assignments`)

    if (response.success && response.data) {
      assignedReviewers.value = response.data
    }
  } catch (error) {
    console.error('加载已分配专家失败:', error)
  }
}

// 搜索处理
const handleSearch = () => {
  pagination.current = 1
  loadProjectList()
}

const resetFilter = () => {
  Object.keys(filterForm).forEach((key) => {
    filterForm[key] = ''
  })
  pagination.current = 1
  loadProjectList()
}

// 分页处理
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.current = 1
  loadProjectList()
}

const handleCurrentChange = (page: number) => {
  pagination.current = page
  loadProjectList()
}

// 表格行点击
const handleRowClick = (row: any) => {
  router.push(`/assistant/reviewer-assignment/project/${row.id}`)
}

// 分配专家
const assignReviewer = async (project: any) => {
  selectedProject.value = project
  selectedReviewerIds.value = []
  reviewerSearch.value = ''

  // 加载专家数据
  await Promise.all([loadAssignedReviewers(), loadAvailableReviewers()])

  // 初始化已分配的专家ID
  selectedReviewerIds.value = assignedReviewers.value.map((r) => r.id)

  assignDialogVisible.value = true
}

// 查看分配详情
const viewAssignment = (project: any) => {
  router.push(`/assistant/reviewer-assignment/project/${project.id}`)
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

// 移除已分配的专家
// 移除已分配的专家
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
        projectId: selectedProject.value.id,
        reviewerId: reviewer.id,
      },
    })

    if (response.success) {
      ElMessage.success('专家移除成功')
      await Promise.all([loadAvailableReviewers(), loadAssignedReviewers()])
      const index = selectedReviewerIds.value.indexOf(reviewer.id)
      if (index > -1) {
        selectedReviewerIds.value.splice(index, 1)
      }
    } else {
      ElMessage.error(response.error || '移除失败')
    }
  } catch (error) {
    console.error('移除专家失败:', error)
  }
}

// 确认分配
// 确认分配
const confirmAssignment = async () => {
  if (selectedReviewerIds.value.length === 0) {
    ElMessage.warning('请选择至少一位评审专家')
    return
  }

  assignLoading.value = true
  try {
    // 修改为正确的 API 路径
    const response = await api.post('/assistant/projects/assign-reviewer', {
      projectId: selectedProject.value.id,
      reviewerIds: selectedReviewerIds.value,
    })

    if (response.success) {
      ElMessage.success(`成功分配 ${selectedReviewerIds.value.length} 位专家`)
      assignDialogVisible.value = false
      // 刷新项目列表
      loadProjectList()
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

// 搜索专家
const searchReviewers = () => {
  clearTimeout((window as any).searchTimer)
  ;(window as any).searchTimer = setTimeout(() => {
    loadAvailableReviewers()
  }, 500)
}

// 刷新数据
const refreshData = () => {
  loadProjectList()
}

// 导出Excel
const exportToExcel = () => {
  ElMessage.info('导出功能开发中')
}

// 组件挂载
onMounted(() => {
  loadProjectList()
})
</script>

<style scoped>
/* 样式保持不变，与之前相同 */
.reviewer-assignment {
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

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 8px;
}

.stat-content {
  display: flex;
  align-items: center;
  padding: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}

.stat-icon .el-icon {
  font-size: 24px;
  color: #1890ff;
}

.stat-details {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.filter-card {
  margin-bottom: 20px;
  border-radius: 8px;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.table-card {
  border-radius: 8px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.project-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.title-text {
  font-weight: 500;
  color: #1a1a1a;
  flex: 1;
}

.project-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #666;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.reviewer-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reviewer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.reviewer-name {
  font-size: 13px;
  font-weight: 500;
}

.reviewer-count {
  margin-top: 4px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding: 20px 0;
}

/* 对话框样式 */
.assignment-dialog {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 8px;
}

.project-info-card,
.assigned-reviewers-card,
.available-reviewers-card {
  margin-bottom: 16px;
  border-radius: 8px;
}

.project-info-header,
.assigned-header,
.available-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.detail-item {
  display: flex;
  align-items: center;
}

.detail-label {
  font-weight: 500;
  color: #666;
  min-width: 80px;
}

.detail-value {
  color: #1a1a1a;
}

.reviewer-item.detailed {
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  margin-bottom: 8px;
  background: #fafafa;
}

.reviewer-info {
  flex: 1;
  margin-left: 12px;
}

.reviewer-details {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}

.reviewer-actions {
  opacity: 0;
  transition: opacity 0.3s;
}

.reviewer-item.detailed:hover .reviewer-actions {
  opacity: 1;
}

.reviewer-selection {
  margin-top: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.reviewer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.reviewer-select-item {
  position: relative;
  padding: 16px;
  border: 2px solid #f0f0f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  background: white;
}

.reviewer-select-item:hover {
  border-color: #1890ff;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.1);
}

.reviewer-select-item.selected {
  border-color: #1890ff;
  background: #f0f7ff;
}

.reviewer-select-avatar {
  position: relative;
  text-align: center;
  margin-bottom: 12px;
}

.assigned-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #52c41a;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
}

.reviewer-select-info {
  text-align: center;
}

.reviewer-select-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.reviewer-select-department {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.reviewer-select-check {
  position: absolute;
  top: 8px;
  right: 8px;
}

.assignment-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  margin-top: 16px;
}

.selected-count {
  font-weight: 500;
  color: #1890ff;
}

.empty-reviewers {
  padding: 40px 20px;
  text-align: center;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.loading-text {
  margin-top: 16px;
  color: #666;
}

/* 滚动条样式 */
.assignment-dialog::-webkit-scrollbar {
  width: 6px;
}

.assignment-dialog::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.assignment-dialog::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.assignment-dialog::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .reviewer-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .filter-form {
    flex-direction: column;
  }

  .reviewer-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .assignment-options {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }

  .reviewer-grid {
    grid-template-columns: 1fr;
  }
}
</style>
