<!-- src/views/assistant/ManagerProjectDetail.vue -->
<template>
  <div class="manager-project-detail">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-workbench-box" @click="goBack">
          <el-icon class="back-icon"><ArrowLeft /></el-icon>
          <span class="back-text">返回</span>
        </button>
        <h1>项目详情</h1>
        <div class="header-subtitle" v-if="project">
          <span class="project-no">{{ project.project_code || '暂未编号' }}</span>
          <div class="status-badge" :class="getStatusClass(project.status)">
            {{ getStatusText(project.status) }}
          </div>
        </div>
        <div v-if="loading" class="loading-indicator">加载中...</div>
      </div>
      <div class="header-actions" v-if="project">
        <button 
          v-if="canClaimProject"
          class="action-btn primary" 
          @click="claimProject"
        >
          领取项目
        </button>
        <button 
          v-if="canAssignReviewers"
          class="action-btn primary" 
          @click="assignReviewers"
        >
          分配专家
        </button>
        <button class="action-btn secondary" @click="exportProject">📄 导出</button>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMessage" class="error-alert">
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <span class="error-text">{{ errorMessage }}</span>
        <button @click="errorMessage = ''" class="error-close">×</button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading && !project" class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">正在加载项目详情...</div>
    </div>

    <!-- 标签导航 -->
    <div v-if="project" class="tab-navigation">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 标签内容 -->
    <div v-if="project" class="tab-content">
      <!-- 基本信息 -->
      <div v-if="activeTab === 'basicInfo'" class="tab-panel">
        <div class="section">
          <h3>项目标题</h3>
          <div class="content-box">{{ project.title || '未设置' }}</div>
        </div>

        <div class="section">
          <h3>研究领域</h3>
          <div class="content-box">
            <div class="domain-tags">
              <span v-for="(domain, idx) in formatDomainsWithOther(project.research_domains, project.project_domain_other_text)" :key="idx" class="domain-tag">
                {{ domain }}
              </span>
              <span v-if="!formatDomainsWithOther(project.research_domains, project.project_domain_other_text).length">未指定</span>
            </div>
          </div>
        </div>

        <div class="section">
          <h3>技术成熟度</h3>
          <div class="content-box">{{ getTechMaturityText(project.tech_maturity) }}</div>
        </div>

        <div class="section">
          <h3>预期成果转化形式</h3>
          <div class="content-box">
            <div class="transform-tags">
              <span v-for="(item, idx) in formatAchievementTransformWithOther(project.achievement_transform, project.achievement_transform_other_text)" :key="idx" class="transform-tag">
                {{ item }}
              </span>
              <span v-if="!formatAchievementTransformWithOther(project.achievement_transform, project.achievement_transform_other_text).length">未指定</span>
            </div>
          </div>
        </div>

        <div class="section">
          <h3>概念验证阶段需求</h3>
          <div class="content-box">
            <div class="poc-tags">
              <span v-for="(item, idx) in formatPocStageWithNote(project.poc_stage_requirement, project.poc_multi_stage_note)" :key="idx" class="poc-tag">
                {{ item }}
              </span>
              <span v-if="!formatPocStageWithNote(project.poc_stage_requirement, project.poc_multi_stage_note).length">未指定</span>
            </div>
          </div>
        </div>

        <div class="section">
          <h3>关键词</h3>
          <div class="content-box">
            <div class="keywords">
              <span v-for="(keyword, index) in keywordsArray" :key="index" class="keyword-tag">
                {{ keyword }}
              </span>
              <span v-if="!keywordsArray.length">未设置</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 项目详情 -->
      <div v-if="activeTab === 'detail'" class="tab-panel">
        <div class="section">
          <h3>项目摘要</h3>
          <div class="content-box">{{ project.abstract || '暂无摘要' }}</div>
        </div>

        <div class="section">
          <h3>成果简介（背景、痛点、技术方案、竞争优势、创新点等）</h3>
          <div class="content-box">{{ project.detailed_introduction_part1 || '暂无内容' }}</div>
        </div>

        <div class="section">
          <h3>知识产权情况</h3>
          <div class="content-box">{{ project.detailed_introduction_part2 || '暂无内容' }}</div>
        </div>

        <div class="section">
          <h3>已有应用/试点情况</h3>
          <div class="content-box">{{ project.detailed_introduction_part3 || '暂无内容' }}</div>
        </div>

        <div class="section">
          <h3>实施计划</h3>
          <div class="content-box">{{ project.implementation_plan || '暂无内容' }}</div>
        </div>

        <div class="section" v-if="project.supplementary_info">
          <h3>其他补充说明</h3>
          <div class="content-box">{{ project.supplementary_info }}</div>
        </div>
      </div>

      <!-- 研究团队 -->
      <div v-if="activeTab === 'team'" class="tab-panel">
        <div class="section">
          <h3>项目组成员</h3>
          <div v-if="teamMembers.length === 0" class="empty-state">
            <p>暂无团队成员信息</p>
          </div>
          <div v-else class="team-table">
            <table>
              <thead>
                <tr>
                  <th>序号</th>
                  <th>姓名</th>
                  <th>单位</th>
                  <th>职称</th>
                  <th>角色</th>
                  <th>邮箱</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(member, index) in teamMembers" :key="member.id">
                  <td>{{ index + 1 }}</td>
                  <td>{{ member.name || '未命名' }}</td>
                  <td>{{ member.organization || '未指定' }}</td>
                  <td>{{ member.title || '未指定' }}</td>
                  <td>
                    <span class="role-badge" :class="getMemberRoleClass(member.role)">
                      {{ getMemberRoleText(member.role) }}
                    </span>
                  </td>
                  <td>{{ member.email || '未提供' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 经费预算 -->
      <div v-if="activeTab === 'budget'" class="tab-panel">
        <div class="section">
          <h3>经费预算明细</h3>
          <div v-if="budgetItems.length === 0" class="empty-state">
            <p>暂无预算明细</p>
          </div>
          <div v-else class="budget-table">
            <table>
              <thead>
                <tr>
                  <th>预算科目</th>
                  <th>项目名称</th>
                  <th>详细说明</th>
                  <th>金额（元）</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in budgetItems" :key="item.id">
                  <td>{{ item.category }}</td>
                  <td>{{ item.item_name || '未命名' }}</td>
                  <td>{{ item.description || '无说明' }}</td>
                  <td class="text-right">¥ {{ formatAmount(item.amount || 0) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" class="text-right"><strong>预算合计</strong></td>
                  <td class="total-amount">
                    <strong>¥ {{ formatAmount(totalBudget) }}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <!-- 项目进展 -->
      <div v-if="activeTab === 'progress'" class="tab-panel">
        <div class="section">
          <h3>项目进度</h3>
          <div class="progress-container">
            <div class="progress-bar-large">
              <div
                class="progress-fill-large"
                :style="{ width: getProgressWidth(project.status) + '%' }"
                :class="getProgressClass(project.status)"
              ></div>
            </div>
            <div class="progress-text-large">
              {{ getProgressText(project.status) }}
            </div>
          </div>
        </div>

        <div class="section">
          <h3>项目状态说明</h3>
          <div class="content-box">
            <p><strong>当前状态：</strong>{{ getStatusDescription(project.status) }}</p>
            <p v-if="project.manager_name"><strong>项目经理：</strong>{{ project.manager_name }}</p>
            <p v-if="project.review_count > 0"><strong>评审专家数：</strong>{{ project.review_count }} 人</p>
          </div>
        </div>
      </div>

      <!-- 图片展示 -->
      <div v-if="activeTab === 'images'" class="tab-panel">
        <div class="section">
          <h3>项目图片</h3>
          <div v-if="images.length === 0" class="empty-state">
            <p>暂无项目图片</p>
          </div>
          <div v-else class="images-grid">
            <div v-for="image in images" :key="image.id" class="image-card">
              <div class="image-preview">
                <img :src="`http://localhost:3002${image.file_path}`" :alt="image.file_name" />
              </div>
              <div class="image-info">
                <div class="image-name">{{ image.file_name }}</div>
                <div class="image-desc" v-if="image.description">{{ image.description }}</div>
                <div class="image-meta">
                  <span>{{ formatFileSize(image.file_size) }}</span>
                  <span>{{ formatDateTime(image.created_at) }}</span>
                </div>
              </div>
              <div class="image-actions">
                <button class="download-btn" @click="downloadAttachment(image)">下载</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 附件材料 -->
      <div v-if="activeTab === 'attachments'" class="tab-panel">
        <div class="section">
          <h3>附件清单</h3>
          <div v-if="documents.length === 0" class="empty-state">
            <p>暂无附件材料</p>
          </div>
          <div v-else class="attachments-list">
            <div v-for="attachment in documents" :key="attachment.id" class="attachment-item">
              <div class="attachment-icon">{{ getFileIcon(attachment.mime_type) }}</div>
              <div class="attachment-info">
                <div class="attachment-name">{{ attachment.file_name }}</div>
                <div class="attachment-meta">
                  <span class="file-size">{{ formatFileSize(attachment.file_size) }}</span>
                  <span class="file-type">{{ attachment.mime_type?.split('/')[1] || '文件' }}</span>
                  <span class="upload-time">{{ formatDateTime(attachment.created_at) }}</span>
                </div>
                <div class="attachment-desc" v-if="attachment.description">
                  {{ attachment.description }}
                </div>
              </div>
              <div class="attachment-actions">
                <button class="download-btn" @click="downloadAttachment(attachment)">下载</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 评审意见（项目经理特有） -->
      <div v-if="activeTab === 'reviews'" class="tab-panel">
        <div class="section">
          <h3>评审专家意见</h3>
          <div v-if="reviewFeedback.length === 0" class="empty-state">
            <p>暂无评审意见</p>
            <p v-if="canAssignReviewers" class="hint">您可以分配评审专家来获取评审意见</p>
          </div>
          <div v-else class="reviews-list">
            <div v-for="(review, index) in reviewFeedback" :key="index" class="review-card-modern">
              <!-- 顶部：评审结论（突出显示） -->
              <div class="review-conclusion-header" :class="review.review_status">
                <div class="conclusion-main">
                  <span class="conclusion-label">评审结论</span>
                  <span class="conclusion-value">{{ getReviewStatusText(review.review_status) }}</span>
                </div>
              </div>
              
              <!-- 中部：专家信息 -->
              <div class="reviewer-info-section">
                <div class="info-row">
                  <div class="info-item">
                    <span class="info-label">评审专家</span>
                    <span class="info-value name">{{ review.reviewer_name || '未知专家' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">所属部门</span>
                    <span class="info-value">{{ review.reviewer_department || '未填写' }}</span>
                  </div>
                </div>
                <div class="info-row" v-if="review.reviewer_research_field">
                  <div class="info-item full-width">
                    <span class="info-label">研究领域</span>
                    <span class="info-value field">{{ review.reviewer_research_field }}</span>
                  </div>
                </div>
              </div>
              
              <!-- 底部：评审意见 -->
              <div class="review-content-section">
                <div class="content-header">
                  <span class="content-label">评审意见</span>
                </div>
                <div class="content-body">
                  <p>{{ review.comments || '暂无详细评审意见' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div v-if="project" class="action-bar">
      <div class="action-left">
        <button class="action-btn secondary" @click="goBack">返回列表</button>
      </div>
      <div class="action-right">
        <button 
          v-if="canClaimProject"
          class="action-btn primary" 
          @click="claimProject"
        >
          领取项目
        </button>
        <button 
          v-if="canAssignReviewers"
          class="action-btn primary" 
          @click="assignReviewers"
        >
          分配评审专家
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import axios from 'axios'

const router = useRouter()
const route = useRoute()

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
    if (error.response?.status === 401) {
      localStorage.clear()
      router.push('/login')
    }
    return Promise.reject(error)
  }
)

// 状态管理
const loading = ref(false)
const errorMessage = ref('')
const currentUser = ref<any>(null)

// 项目数据
const project = ref<any>(null)
const teamMembers = ref<any[]>([])
const budgetItems = ref<any[]>([])
const attachments = ref<any[]>([])
const reviewFeedback = ref<any[]>([])

// UI状态
const activeTab = ref('basicInfo')

// 标签页
const tabs = [
  { key: 'basicInfo', label: '基本信息' },
  { key: 'detail', label: '项目详情' },
  { key: 'team', label: '研究团队' },
  { key: 'budget', label: '经费预算' },
  { key: 'images', label: '图片展示' },
  { key: 'attachments', label: '附件材料' },
  { key: 'reviews', label: '评审意见' },
  { key: 'progress', label: '项目进展' },
]

// 计算属性
const keywordsArray = computed(() => {
  if (!project.value?.keywords) return []
  return project.value.keywords.split(',').filter((k: string) => k.trim())
})

const totalBudget = computed(() => {
  return budgetItems.value.reduce((sum, item) => {
    const amount = parseFloat(String(item.amount)) || 0
    return sum + amount
  }, 0)
})

const images = computed(() => {
  return attachments.value.filter((a: any) => 
    a.type === 'image' || (a.mime_type && a.mime_type.startsWith('image/'))
  )
})

const documents = computed(() => {
  return attachments.value.filter((a: any) => 
    a.type !== 'image' && !(a.mime_type && a.mime_type.startsWith('image/'))
  )
})

const canClaimProject = computed(() => {
  if (!project.value || !currentUser.value) return false
  // 项目状态为已提交且没有项目经理，且当前用户是项目经理或管理员
  const isManagerOrAdmin = ['project_manager', 'admin'].includes(currentUser.value.role)
  // 严格检查：没有manager_id或者manager_id为空字符串
  const hasNoManager = !project.value.manager_id || project.value.manager_id === ''
  return project.value.status === 'submitted' && hasNoManager && isManagerOrAdmin
})

const canAssignReviewers = computed(() => {
  if (!project.value || !currentUser.value) return false
  // 必须是当前项目的项目经理才能分配专家
  const isManager = project.value.manager_id === currentUser.value.id
  const canAssign = ['submitted', 'under_review'].includes(project.value.status)
  // 只有项目经理可以分配专家，待领取项目（无manager_id）不显示分配专家按钮
  return isManager && canAssign
})

const hasReviewFeedback = computed(() => {
  return reviewFeedback.value.length > 0
})

const reviewStats = computed(() => {
  const total = reviewFeedback.value.length
  if (total === 0) return { total: 0, avgScore: 0, approveCount: 0, revisionCount: 0, rejectCount: 0 }
  
  const scores = reviewFeedback.value.filter((r: any) => r.score).map((r: any) => r.score)
  const avgScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0
  
  const approveCount = reviewFeedback.value.filter((r: any) => r.recommendation === 'approve').length
  const revisionCount = reviewFeedback.value.filter((r: any) => r.recommendation === 'revision').length
  const rejectCount = reviewFeedback.value.filter((r: any) => r.recommendation === 'reject').length
  
  return { total, avgScore, approveCount, revisionCount, rejectCount }
})

// 方法
const loadCurrentUser = async () => {
  try {
    const userInfoStr = localStorage.getItem('userInfo')
    if (userInfoStr) {
      currentUser.value = JSON.parse(userInfoStr)
    }
  } catch (error) {
    console.error('加载用户信息失败:', error)
  }
}

const loadProjectDetail = async () => {
  const projectId = route.params.id as string
  if (!projectId) {
    errorMessage.value = '项目ID无效'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const response = await api.get(`/projects/${projectId}`)
    if (response.success && response.data) {
      project.value = response.data
      teamMembers.value = response.data.team_members || []
      budgetItems.value = response.data.budget_items || []
      attachments.value = response.data.attachments || []
      
      // 加载评审意见
      await loadReviewFeedback(projectId)
    } else {
      errorMessage.value = response.error || '加载项目详情失败'
    }
  } catch (error: any) {
    console.error('加载项目详情失败:', error)
    errorMessage.value = error.message || '网络错误'
  } finally {
    loading.value = false
  }
}

const loadReviewFeedback = async (projectId: string) => {
  try {
    const response = await api.get(`/assistant/projects/${projectId}/reviews`)
    if (response.success) {
      reviewFeedback.value = response.data || []
    }
  } catch (error) {
    console.error('加载评审意见失败:', error)
    reviewFeedback.value = []
  }
}

const goBack = () => {
  // 根据来源参数返回正确的页面
  const from = route.query.from as string
  if (from === 'my') {
    router.push('/assistant/projects/my')
  } else if (from === 'unassigned') {
    router.push('/assistant/projects/unassigned')
  } else if (from === 'terminate') {
    // 从终止项目页面跳转过来的
    router.push('/assistant/terminate-projects')
  } else {
    // 默认返回项目管理页面
    router.push('/assistant/projects')
  }
}

const claimProject = async () => {
  if (!project.value) return
  
  try {
    await ElMessageBox.confirm(
      `确定要领取项目 "${project.value.title}" 吗？`,
      '确认领取',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    
    const response = await api.post('/assistant/projects/claim', {
      projectId: project.value.id,
    })
    
    if (response.success) {
      ElMessage.success('项目领取成功')
      await loadProjectDetail()
    } else {
      ElMessage.error(response.error || '领取失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('领取项目失败:', error)
      ElMessage.error('领取失败')
    }
  }
}

const assignReviewers = () => {
  if (project.value) {
    router.push(`/assistant/projects/${project.value.id}/assign-reviewers`)
  }
}

const exportProject = () => {
  ElMessage.info('导出功能开发中...')
}

const downloadAttachment = async (attachment: any) => {
  try {
    ElMessage.info('正在下载...')
    const token = localStorage.getItem('token')
    const response = await fetch(
      `http://localhost:3002/api/projects/attachments/${attachment.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    if (!response.ok) throw new Error('下载失败')
    
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = attachment.file_name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    ElMessage.success('下载成功')
  } catch (error: any) {
    console.error('下载失败:', error)
    ElMessage.error(error.message || '下载失败')
  }
}

// 格式化方法
const formatDate = (dateString?: string) => {
  if (!dateString) return '未设置'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  } catch {
    return dateString
  }
}

const formatDateTime = (dateString?: string) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileIcon = (mimeType?: string) => {
  if (!mimeType) return '📎'
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType === 'application/pdf') return '📄'
  if (mimeType.includes('word')) return '📝'
  if (mimeType.includes('zip')) return '🗜️'
  return '📎'
}

const getStatusText = (status?: string) => {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    under_review: '专家评审中',
    revision: '需修改',
    batch_review: '集中评审中',
    approved: '已批准',
    incubating: '孵化中',
    rejected: '未通过',
    completed: '已完成',
    terminated: '已终止',
  }
  return statusMap[status || ''] || status
}

const getStatusClass = (status?: string) => {
  const classMap: Record<string, string> = {
    draft: 'draft',
    submitted: 'submitted',
    under_review: 'reviewing',
    revision: 'revision',
    batch_review: 'reviewing',
    approved: 'approved',
    incubating: 'ongoing',
    completed: 'completed',
    rejected: 'rejected',
    terminated: 'rejected',
  }
  return classMap[status || ''] || ''
}

const getStatusDescription = (status?: string) => {
  const descMap: Record<string, string> = {
    draft: '项目草稿，尚未提交审核',
    submitted: '项目已提交，等待专家评审',
    under_review: '项目正在由专家进行评审',
    revision: '需要根据评审意见修改后重新提交',
    batch_review: '项目进入集中评审环节',
    approved: '项目已通过评审，等待立项',
    incubating: '项目已立项，正在孵化中',
    rejected: '项目未通过评审',
    completed: '项目已完成',
    terminated: '项目已终止',
  }
  return descMap[status || ''] || '未知状态'
}

const getTechMaturityText = (maturity?: string) => {
  const map: Record<string, string> = {
    rd: '研发阶段',
    pilot: '小试阶段',
    intermediate_trial: '中试阶段',
    small_batch_prod: '小批量生产',
  }
  return map[maturity || ''] || maturity || '未指定'
}

const getMemberRoleText = (role?: string) => {
  const roleMap: Record<string, string> = {
    principal: '项目负责人',
    contact: '联系人',
    other: '其他成员',
  }
  return roleMap[role || ''] || role || '成员'
}

const getMemberRoleClass = (role?: string) => {
  const classMap: Record<string, string> = {
    principal: 'principal',
    contact: 'contact',
    other: 'other',
  }
  return classMap[role || ''] || ''
}

const getRecommendationText = (recommendation?: string) => {
  const map: Record<string, string> = {
    approve: '推荐通过',
    revision: '建议修改',
    reject: '建议拒绝',
  }
  return map[recommendation || ''] || recommendation
}

const getReviewStatusText = (status?: string) => {
  const map: Record<string, string> = {
    accepted: '通过',
    declined: '拒绝',
    reviewing: '评审中',
    draft: '待评审',
  }
  return map[status || ''] || status || '未知'
}

const getReviewStatusClass = (status?: string) => {
  const map: Record<string, string> = {
    accepted: 'accepted',
    declined: 'declined',
    reviewing: 'reviewing',
    draft: 'pending',
  }
  return map[status || ''] || 'pending'
}

const getProgressWidth = (status: string) => {
  const progressMap: Record<string, number> = {
    draft: 20,
    submitted: 40,
    under_review: 50,
    revision: 45,
    batch_review: 55,
    approved: 70,
    incubating: 85,
    completed: 100,
    rejected: 100,
    terminated: 100,
  }
  return progressMap[status] || 0
}

const getProgressClass = (status: string) => {
  const classMap: Record<string, string> = {
    draft: 'draft',
    submitted: 'submitted',
    under_review: 'reviewing',
    revision: 'reviewing',
    batch_review: 'reviewing',
    approved: 'approved',
    incubating: 'ongoing',
    completed: 'completed',
    rejected: 'rejected',
  }
  return classMap[status] || ''
}

const getProgressText = (status: string) => {
  const textMap: Record<string, string> = {
    draft: '待提交',
    submitted: '等待专家评审',
    under_review: '专家评审中',
    revision: '修改后重新提交',
    batch_review: '集中评审中',
    approved: '已批准，等待立项',
    incubating: '项目孵化中',
    completed: '项目已完成',
    rejected: '未通过',
    terminated: '已终止',
  }
  return textMap[status] || ''
}

const formatDomainsWithOther = (domains: any[], otherText?: string): string[] => {
  if (!domains || !Array.isArray(domains)) return []
  return domains.map((d: any) => {
    const name = d.name || d
    if ((name === '其他' || name === 'other') && otherText) {
      return otherText
    }
    return name
  })
}

const achievementTransformMap: Record<string, string> = {
  'patent': '专利',
  'paper': '论文',
  'software_copyright': '软件著作权',
  'technical_standard': '技术标准',
  'prototype': '原型产品',
  'pilot': '中试产品',
  'industrialization': '产业化成果',
  'other': '其他',
  'tech_transfer': '技术转让',
  'tech_license': '技术许可',
  'equity_investment': '作价投资',
  'joint_dev': '联合开发',
}

const formatAchievementTransformWithOther = (transforms: any, otherText?: string): string[] => {
  if (!transforms) return []
  let arr = transforms
  if (typeof transforms === 'string') {
    try {
      arr = JSON.parse(transforms)
    } catch {
      arr = transforms.split(',').map((s: string) => s.trim()).filter(Boolean)
    }
  }
  if (!Array.isArray(arr) || arr.length === 0) return []
  return arr.map((t: string) => {
    if (t === 'other' && otherText) return otherText
    return achievementTransformMap[t] || t
  })
}

const pocStageMap: Record<string, string> = {
  'principle_validation': '原理验证',
  'prototype_development': '样机开发',
  'pilot_test': '中试',
  'market_validation': '市场验证',
  'multi_stage': '多阶段组合',
  'multi_stage_combo': '多阶段组合',
  'creative_verify': '创意性验证',
  'feasibility_verify': '可行性验证',
  'commercial_verify': '商业化验证',
}

const formatPocStageWithNote = (stages: any, note?: string): string[] => {
  if (!stages) return []
  let arr = stages
  if (typeof stages === 'string') {
    try {
      arr = JSON.parse(stages)
    } catch {
      arr = stages.split(',').map((s: string) => s.trim()).filter(Boolean)
    }
  }
  if (!Array.isArray(arr) || arr.length === 0) return []
  return arr.map((s: string) => {
    if ((s === 'multi_stage' || s === 'multi_stage_combo') && note) return note
    return pocStageMap[s] || s
  })
}

// 监听URL参数，自动切换到评审意见标签
watch(() => route.query.tab, (tab) => {
  if (tab === 'reviews') {
    activeTab.value = 'reviews'
  }
}, { immediate: true })

// 初始化
onMounted(async () => {
  await loadCurrentUser()
  await loadProjectDetail()
})
</script>

<style scoped>
.manager-project-detail {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
}

/* 页面标题 */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.back-workbench-box {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 18px;
  border: 1px solid rgba(179, 27, 27, 0.35);
  border-radius: 8px;
  background: linear-gradient(180deg, #fffbfb 0%, #fff5f5 100%);
  color: #b31b1b;
  font-size: 15px;
  font-weight: 500;
  font-family: 'STZhongsong', '华文中宋', 'SimSun', serif;
  cursor: pointer;
  transition: all 0.2s;
}

.back-workbench-box:hover {
  background: #fff0f0;
  border-color: #b31b1b;
  box-shadow: 0 2px 8px rgba(179, 27, 27, 0.12);
}

.back-workbench-box .back-icon {
  font-size: 18px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
}

.header-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.header-subtitle {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.project-no {
  font-size: 14px;
  color: #666;
  background: #f5f7fa;
  padding: 4px 12px;
  border-radius: 4px;
  font-family: monospace;
}

.status-badge {
  padding: 6px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
}

.status-badge.draft {
  background: #fff7e6;
  color: #fa8c16;
}

.status-badge.submitted {
  background: rgba(179,27,27,0.06);
  color: #b31b1b;
}

.status-badge.reviewing {
  background: #fde8e8;
  color: #b31b1b;
}

.status-badge.approved {
  background: #f6ffed;
  color: #52c41a;
}

.status-badge.ongoing {
  background: #fde8e8;
  color: #b31b1b;
}

.status-badge.completed {
  background: #f6ffed;
  color: #52c41a;
}

.status-badge.rejected {
  background: #fff2f0;
  color: #ff4d4f;
}

.loading-indicator {
  color: #b31b1b;
  font-size: 14px;
  margin-top: 8px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn.secondary {
  background: #f5f7fa;
  color: #666;
  border: 1px solid #d9d9d9;
}

.action-btn.secondary:hover {
  background: #e8e8e8;
}

.action-btn.primary {
  background: #b31b1b;
  color: white;
}

.action-btn.primary:hover {
  background: #8b0000;
}

.action-btn.info {
  background: #f0f5ff;
  color: #2f54eb;
  border: 1px solid #91caff;
}

.action-btn.info:hover {
  background: #d6e4ff;
}

/* 错误提示 */
.error-alert {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 20px;
}

.error-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.error-icon {
  font-size: 18px;
}

.error-text {
  flex: 1;
  color: #ff4d4f;
}

.error-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #b31b1b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  color: #b31b1b;
  font-weight: bold;
}

/* 标签导航 */
.tab-navigation {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  padding: 8px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow-x: auto;
}

.tab-btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: #f5f7fa;
  color: #666;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
  min-width: 80px;
}

.tab-btn:hover {
  background: #e8e8e8;
}

.tab-btn.active {
  background: #b31b1b;
  color: white;
}

/* 标签内容 */
.tab-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.tab-panel {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.section h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: #2c3e50;
  padding-bottom: 12px;
  border-bottom: 2px solid #b31b1b;
}

.content-box {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 20px;
  line-height: 1.8;
  color: #2c3e50;
  white-space: pre-wrap;
}

/* 标签样式 */
.domain-tags,
.transform-tags,
.poc-tags,
.keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.domain-tag,
.transform-tag,
.poc-tag,
.keyword-tag {
  background: #fde8e8;
  color: #b31b1b;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
}

/* 表格 */
.team-table,
.budget-table {
  overflow-x: auto;
}

.team-table table,
.budget-table table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
}

.team-table th,
.budget-table th {
  background: #f5f7fa;
  padding: 12px;
  text-align: left;
  font-weight: 500;
  color: #2c3e50;
  border: 1px solid #e8e8e8;
}

.team-table td,
.budget-table td {
  padding: 12px;
  border: 1px solid #e8e8e8;
  vertical-align: top;
}

.text-right {
  text-align: right;
}

.total-amount {
  color: #b31b1b;
  font-size: 16px;
}

/* 角色徽章 */
.role-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.role-badge.principal {
  background: #f6ffed;
  color: #52c41a;
}

.role-badge.contact {
  background: rgba(179,27,27,0.06);
  color: #b31b1b;
}

.role-badge.other {
  background: #f5f5f5;
  color: #666;
}

/* 进度条 */
.progress-container {
  padding: 20px;
  background: #fafafa;
  border-radius: 8px;
  text-align: center;
}

.progress-bar-large {
  height: 20px;
  background: #f5f5f5;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-fill-large {
  height: 100%;
  border-radius: 10px;
  transition: width 0.3s;
}

.progress-fill-large.draft {
  background: #fa8c16;
}

.progress-fill-large.submitted {
  background: #b31b1b;
}

.progress-fill-large.reviewing {
  background: #b31b1b;
}

.progress-fill-large.approved {
  background: #52c41a;
}

.progress-fill-large.ongoing {
  background: #b31b1b;
}

.progress-fill-large.completed {
  background: #52c41a;
}

.progress-text-large {
  font-size: 16px;
  font-weight: 500;
  color: #2c3e50;
}

/* 附件列表 */
.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  transition: all 0.3s;
}

.attachment-item:hover {
  border-color: #b31b1b;
  background: #fef6f6;
}

.attachment-icon {
  font-size: 28px;
  min-width: 48px;
  text-align: center;
}

.attachment-info {
  flex: 1;
}

.attachment-name {
  font-weight: 500;
  margin-bottom: 4px;
  color: #2c3e50;
}

.attachment-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: #999;
}

.attachment-desc {
  font-size: 12px;
  color: #666;
  margin-top: 8px;
}

.download-btn {
  padding: 8px 16px;
  background: #b31b1b;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.download-btn:hover {
  background: #8b0000;
}

/* 图片网格 */
.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 16px;
}

.image-card {
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  transition: all 0.3s;
}

.image-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #b31b1b;
}

.image-preview {
  width: 100%;
  height: 200px;
  overflow: hidden;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.image-card:hover .image-preview img {
  transform: scale(1.05);
}

.image-info {
  padding: 12px;
}

.image-name {
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 6px;
  word-break: break-all;
}

.image-desc {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
  line-height: 1.5;
}

.image-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #999;
}

.image-actions {
  display: flex;
  gap: 8px;
  padding: 0 12px 12px;
}

/* 评审意见 */
.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.review-card {
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 20px;
  background: #fafafa;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e8e8e8;
}

.reviewer-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.reviewer-name {
  font-weight: 600;
  color: #2c3e50;
}

.review-date {
  font-size: 13px;
  color: #999;
}

.review-score {
  font-size: 14px;
  color: #666;
}

.review-score strong {
  color: #b31b1b;
  font-size: 18px;
}

.review-section {
  margin-bottom: 16px;
}

.review-section h4 {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.review-section p {
  margin: 0;
  line-height: 1.6;
  color: #2c3e50;
}

.recommendation-badge {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
}

.recommendation-badge.approve {
  background: #f6ffed;
  color: #52c41a;
}

.recommendation-badge.revision {
  background: #fff7e6;
  color: #fa8c16;
}

.recommendation-badge.reject {
  background: #fff2f0;
  color: #ff4d4f;
}

/* 评审统计 */
.review-stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.stat-label {
  color: #666;
}

.stat-value {
  font-weight: 600;
  color: #2c3e50;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #7f8c8d;
  background: #fafafa;
  border-radius: 8px;
  border: 1px dashed #f0f0f0;
}

.empty-state .hint {
  margin-top: 12px;
  font-size: 13px;
  color: #999;
}

/* 现代评审卡片样式 */
.review-card-modern {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  margin-bottom: 20px;
  transition: box-shadow 0.3s ease;
}

.review-card-modern:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}

/* 评审结论头部 - 突出显示 */
.review-conclusion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  color: white;
}

.review-conclusion-header.accepted {
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
}

.review-conclusion-header.declined {
  background: linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%);
}

.review-conclusion-header.reviewing {
  background: linear-gradient(135deg, #faad14 0%, #d48806 100%);
}

.conclusion-main {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.conclusion-label {
  font-size: 13px;
  opacity: 0.9;
  font-weight: 400;
}

.conclusion-value {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 1px;
}

/* 专家信息区域 */
.reviewer-info-section {
  padding: 20px;
  background: #fafbfc;
  border-bottom: 1px solid #f0f0f0;
}

.info-row {
  display: flex;
  gap: 40px;
  margin-bottom: 12px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item.full-width {
  width: 100%;
}

.info-label {
  font-size: 12px;
  color: #8c8c8c;
  font-weight: 400;
}

.info-value {
  font-size: 15px;
  color: #262626;
  font-weight: 500;
}

.info-value.name {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a1a;
}

.info-value.field {
  color: #595959;
  line-height: 1.5;
}

/* 评审意见区域 */
.review-content-section {
  padding: 20px;
}

.content-header {
  margin-bottom: 12px;
}

.content-label {
  font-size: 13px;
  color: #8c8c8c;
  font-weight: 500;
  padding-left: 8px;
  border-left: 3px solid #1890ff;
}

.content-body {
  background: #f6ffed;
  border-radius: 8px;
  padding: 16px;
  border-left: 4px solid #52c41a;
}

.content-body p {
  margin: 0;
  font-size: 15px;
  line-height: 1.8;
  color: #262626;
  white-space: pre-wrap;
}

/* 底部操作栏 */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.action-left,
.action-right {
  display: flex;
  gap: 12px;
}

/* 响应式 */
@media (max-width: 768px) {
  .manager-project-detail {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .header-left {
    flex-wrap: wrap;
  }

  .back-workbench-box {
    width: 100%;
    justify-content: center;
  }

  .header-actions {
    flex-wrap: wrap;
    width: 100%;
  }

  .action-btn {
    flex: 1;
  }

  .tab-navigation {
    overflow-x: auto;
  }

  .tab-btn {
    min-width: 100px;
  }

  .action-bar {
    flex-direction: column;
    gap: 16px;
  }

  .action-left,
  .action-right {
    width: 100%;
    justify-content: center;
  }

  .review-stats {
    grid-template-columns: 1fr;
  }
}
</style>
