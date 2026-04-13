<!-- src/views/assistant/ReviewerAssignmentDetail.vue -->
<template>
  <div class="reviewer-assignment-detail assistant-ruc-theme">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-header-main">
      <div class="header-left">
        <el-button @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回项目管理
        </el-button>
        <h1 class="page-title">评审专家分配详情</h1>
      </div>
      <div class="header-actions">
        <el-button @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
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

          <div class="project-meta-grid three-columns">
            <div class="meta-item">
              <div class="meta-label">申请人</div>
              <div class="meta-value">{{ project.applicant_name }}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">所属部门</div>
              <div class="meta-value">{{ project.applicant_department || '未填写' }}</div>
            </div>
            <div class="meta-item research-domains-item">
              <div class="meta-label">研究领域</div>
              <div class="meta-value domains-container">
                <template v-if="project.research_domains && project.research_domains.length > 0">
                  <el-tag 
                    v-for="(domain, idx) in formatResearchDomains(project.research_domains, project.project_domain_other_text)" 
                    :key="idx" 
                    type="info"
                    class="domain-tag"
                  >
                    {{ domain }}
                  </el-tag>
                </template>
                <el-tag v-else type="info">未指定</el-tag>
              </div>
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

                <div class="reviewer-actions">
                  <el-button
                    v-if="['draft', 'reviewing'].includes(reviewer.status)"
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
      width="900px"
      destroy-on-close
    >
      <div v-if="project" class="assign-dialog-content">
        <!-- 搜索和筛选区域 -->
        <div class="search-section">
          <div class="assign-filters-row">
            <el-input
              v-model="reviewerSearch"
              placeholder="姓名、部门、邮箱等关键词搜索"
              clearable
              class="assign-search-input"
              @keyup.enter="runReviewerSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" :loading="reviewerSearchLoading" @click="runReviewerSearch">
              搜索
            </el-button>
          </div>
          
          <!-- 研究领域筛选 -->
          <div class="domain-filter-row">
            <span class="filter-label">研究领域筛选：</span>
            <el-select
              v-model="selectedDomainIds"
              placeholder="请选择研究领域（可多选，满足任一即可）"
              clearable
              filterable
              multiple
              collapse-tags
              collapse-tags-tooltip
              class="assign-domain-select-multiple"
              @change="runReviewerSearch"
            >
              <el-option
                v-for="d in researchDomains"
                :key="d.id"
                :label="d.name"
                :value="d.id"
              />
            </el-select>
            <el-button 
              v-if="selectedDomainIds.length > 0" 
              link 
              type="primary" 
              @click="clearDomainFilter"
            >
              清除筛选
            </el-button>
          </div>
          
          <!-- 项目领域提示 -->
          <div v-if="project.research_domains && project.research_domains.length > 0" class="project-domains-hint">
            <span class="hint-label">本项目研究领域：</span>
            <el-tag 
              v-for="(domain, idx) in formatResearchDomains(project.research_domains, project.project_domain_other_text)" 
              :key="idx"
              size="small"
              type="success"
              class="hint-tag"
            >
              {{ domain }}
            </el-tag>
          </div>
        </div>

        <!-- 专家列表 -->
        <div class="available-reviewers-list">
          <div v-if="reviewerSearchLoading" class="empty-reviewers">
            <el-empty description="正在搜索..." :image-size="72" />
          </div>
          <div v-else-if="!reviewerListShown" class="empty-reviewers">
            <el-empty description="正在加载专家列表..." :image-size="72" />
          </div>
          <div v-else-if="availableReviewers.length === 0" class="empty-reviewers">
            <el-empty description="没有找到符合条件的可用专家" />
          </div>
          <div v-else class="reviewer-select-list">
            <div class="reviewers-count">共找到 {{ availableReviewers.length }} 位专家</div>
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
                <div class="reviewer-select-department">{{ reviewer.department || '未填写' }}</div>
                <div class="reviewer-select-email" v-if="reviewer.email">{{ reviewer.email }}</div>
                <div class="reviewer-select-fields">
                  <el-tag 
                    v-for="(field, idx) in reviewer.expertise_domains || [reviewer.research_field]" 
                    :key="idx"
                    size="small" 
                    :type="isMatchingDomain(field) ? 'success' : 'info'"
                    class="field-tag"
                  >
                    {{ field || '未指定' }}
                  </el-tag>
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
import { getApiBaseUrl } from '@/utils/request'
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  Refresh,
  View,
  User,
  Delete,
  Plus,
  Search,
  Loading,
} from '@element-plus/icons-vue'
import axios from 'axios'

const route = useRoute()
const router = useRouter()

// API配置
const API_BASE_URL = getApiBaseUrl()

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
const availableReviewers = ref<any[]>([])
const selectedReviewerIds = ref<string[]>([])
const reviewerSearch = ref('')
/** 研究领域下拉（/api/research-domains） */
const researchDomains = ref<{ id: string; name: string }[]>([])
const selectedDomainIds = ref<string[]>([])
/** 是否已执行过搜索（未搜索前不展示专家列表） */
const reviewerListShown = ref(false)
const reviewerSearchLoading = ref(false)

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

// 格式化研究领域，处理"其他"替换
const formatResearchDomains = (domains: any[], otherText?: string): string[] => {
  if (!domains || !Array.isArray(domains)) return []
  
  return domains.map((d: any) => {
    const name = d.name || d
    // 如果领域名是"其他"或"other"且有其他说明文本，则替换
    if ((name === '其他' || name === 'other') && otherText) {
      return otherText
    }
    return name
  })
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
    reviewing: 'warning',
    accepted: 'success',
    declined: 'danger',
    submitted: 'success',
  }
  return typeMap[status] || 'info'
}

const getReviewerStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    draft: '待评审',
    reviewing: '评审中',
    accepted: '已接受',
    declined: '已拒绝',
    submitted: '已提交',
  }
  return textMap[status] || status
}

// 加载项目详情
const loadProjectDetail = async () => {
  loading.value = true
  try {
    const response = await api.get(`/projects/${projectId}`)
    console.log('项目详情API响应:', response)
    if (response.success && response.data) {
      const data = response.data
      console.log('项目详情数据:', data)
      console.log('申请人部门:', data.applicant_department, data.department)
      // 解析研究领域
      let researchDomains = data.research_domains || []
      if (typeof researchDomains === 'string') {
        try {
          researchDomains = JSON.parse(researchDomains)
        } catch {
          researchDomains = []
        }
      }
      // 确保正确获取申请人部门
      const applicantDept = data.applicant_department || data.department || data.applicant?.department
      console.log('申请人部门原始值:', data.applicant_department)
      console.log('申请人部门最终值:', applicantDept)
      
      project.value = {
        ...data,
        applicant_name: data.applicant_name || data.applicant?.name || '未知',
        applicant_department: applicantDept,
        research_domains: researchDomains,
        project_domain_other_text: data.project_domain_other_text,
      }
      console.log('设置后的项目对象:', project.value)
      console.log('项目对象中的部门:', project.value.applicant_department)
    }
  } catch (error) {
    console.error('加载项目详情失败:', error)
    ElMessage.error('加载项目详情失败')
  } finally {
    loading.value = false
  }
}

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
      await loadAssignedReviewers()
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
      await loadAssignedReviewers()
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

const loadResearchDomainsForAssign = async () => {
  if (researchDomains.value.length) return
  try {
    const res: any = await api.get('/research-domains')
    if (res.success && Array.isArray(res.data)) {
      researchDomains.value = res.data
    }
  } catch (e) {
    console.error('加载研究领域失败:', e)
  }
}

/** 用户点击「搜索」或回车后拉取专家 */
const runReviewerSearch = async () => {
  reviewerSearchLoading.value = true
  try {
    const params: Record<string, any> = {
      role: 'reviewer',
      status: 'active',
      projectId: projectId,
    }
    
    const kw = reviewerSearch.value.trim()
    if (kw) params.keyword = kw
    
    // 支持多选领域，满足任一即可
    if (selectedDomainIds.value.length > 0) {
      params.domain_ids = selectedDomainIds.value.join(',')
    }

    const response: any = await api.get('/assistant/reviewers/available', { params })
    if (response.success && response.data) {
      const assignedIds = assignedReviewers.value.map((r) => r.id)
      const reviewers = response.data.reviewers || []
      availableReviewers.value = reviewers
        .filter((r: any) => !assignedIds.includes(r.id))
        .sort((a: any, b: any) => {
          // 领域匹配的排在前面
          const aMatch = a.is_domain_match || false
          const bMatch = b.is_domain_match || false
          if (aMatch && !bMatch) return -1
          if (!aMatch && bMatch) return 1
          return 0
        })
      reviewerListShown.value = true
    }
  } catch (error) {
    console.error('加载可用专家失败:', error)
    ElMessage.error('搜索专家失败')
  } finally {
    reviewerSearchLoading.value = false
  }
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

// 分配更多专家
const assignMoreReviewer = async () => {
  selectedReviewerIds.value = []
  reviewerSearch.value = ''
  selectedDomainIds.value = []
  availableReviewers.value = []
  reviewerListShown.value = false
  await loadResearchDomainsForAssign()
  showAssignDialog.value = true
  // 自动加载与项目领域匹配的专家
  await loadMatchingReviewers()
}

// 清除领域筛选
const clearDomainFilter = () => {
  selectedDomainIds.value = []
  runReviewerSearch()
}

// 检查领域是否匹配（用于高亮显示）
const isMatchingDomain = (field: string): boolean => {
  if (!project.value?.research_domains) return false
  const projectDomains = formatResearchDomains(
    project.value.research_domains, 
    project.value.project_domain_other_text
  )
  return projectDomains.some(pd => field && field.includes(pd))
}

// 自动加载与项目领域匹配的专家
const loadMatchingReviewers = async () => {
  reviewerSearchLoading.value = true
  try {
    // 获取项目的领域ID列表
    const projectDomainIds: string[] = []
    if (project.value?.research_domains && researchDomains.value.length > 0) {
      const projectDomainNames = formatResearchDomains(
        project.value.research_domains,
        project.value.project_domain_other_text
      )
      projectDomainNames.forEach(name => {
        const domain = researchDomains.value.find(d => d.name === name)
        if (domain) projectDomainIds.push(domain.id)
      })
    }
    
    // 如果有项目领域，自动选中
    if (projectDomainIds.length > 0) {
      selectedDomainIds.value = projectDomainIds
    }
    
    // 构建查询参数
    const params: Record<string, any> = {
      role: 'reviewer',
      status: 'active',
    }
    if (projectDomainIds.length > 0) {
      params.domain_ids = projectDomainIds.join(',')
    }
    
    const response: any = await api.get('/assistant/reviewers/available', { 
      params: { ...params, projectId }
    })
    
    if (response.success && response.data) {
      const assignedIds = assignedReviewers.value.map((r) => r.id)
      // 优先显示领域匹配的专家
      const reviewers = response.data.reviewers || []
      availableReviewers.value = reviewers
        .filter((r: any) => !assignedIds.includes(r.id))
        .sort((a: any, b: any) => {
          // 领域匹配的排在前面
          const aMatch = a.is_domain_match || false
          const bMatch = b.is_domain_match || false
          if (aMatch && !bMatch) return -1
          if (!aMatch && bMatch) return 1
          return 0
        })
      reviewerListShown.value = true
    }
  } catch (error) {
    console.error('加载匹配专家失败:', error)
    ElMessage.error('加载专家列表失败')
  } finally {
    reviewerSearchLoading.value = false
  }
}

// 处理分配成功
const handleAssignmentSuccess = () => {
  loadAssignedReviewers()
  ElMessage.success('评审专家分配成功')
}

// 查看项目详情
const viewProjectDetail = () => {
  // 传递来源参数，保持返回链路
  const from = route.query.from as string
  if (from) {
    router.push(`/assistant/projects/detail/${projectId}?from=${from}`)
  } else {
    router.push(`/assistant/projects/detail/${projectId}`)
  }
}

// 返回项目管理页面
const goBack = () => {
  // 根据来源参数返回正确的页面
  const from = route.query.from as string
  if (from === 'my') {
    router.push('/assistant/projects/my')
  } else if (from === 'unassigned') {
    router.push('/assistant/projects/unassigned')
  } else {
    // 默认返回项目管理页面
    router.push('/assistant/projects')
  }
}

// 刷新数据
const refreshData = async () => {
  await Promise.all([loadProjectDetail(), loadAssignedReviewers()])
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
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  margin-bottom: 20px;
}

.page-header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
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

.project-meta-grid.three-columns {
  grid-template-columns: repeat(3, 1fr);
}

@media (max-width: 992px) {
  .project-meta-grid.three-columns {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .project-meta-grid.three-columns {
    grid-template-columns: 1fr;
  }
}

.research-domains-item {
  grid-column: span 1;
}

.domains-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.domain-tag {
  margin-right: 0;
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
  background: linear-gradient(135deg, #f5f7fa 0%, #fff5f5 100%);
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

/* 分配对话框样式 */
.assign-dialog-content {
  max-height: 600px;
  overflow-y: auto;
}

.search-section {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.assign-filters-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.assign-search-input {
  flex: 1;
  min-width: 280px;
}

.domain-filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.filter-label {
  font-size: 14px;
  color: #666;
  white-space: nowrap;
}

.assign-domain-select-multiple {
  flex: 1;
  min-width: 300px;
}

.project-domains-hint {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px;
  background: #f6ffed;
  border-radius: 6px;
  border: 1px solid #b7eb8f;
}

.hint-label {
  font-size: 13px;
  color: #52c41a;
  font-weight: 500;
}

.hint-tag {
  margin-right: 0;
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
  background: #fff5f5;
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

.reviewer-select-email {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.reviewer-select-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.field-tag {
  margin-right: 0;
}

.reviewers-count {
  padding: 8px 0;
  font-size: 13px;
  color: #666;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 12px;
}

.reviewer-select-check {
  flex-shrink: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header-main {
    flex-direction: column;
    align-items: flex-start;
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
}
</style>
