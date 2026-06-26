<!-- src/views/assistant/AuditAchievements.vue -->
<template>
  <div class="audit-achievements-page assistant-ruc-theme">
    <div class="page-header">
      <el-button class="back-btn" @click="goDashboard">
        <el-icon><ArrowLeft /></el-icon>
        返回工作台
      </el-button>
      <h1 class="page-title">科研成果审核</h1>
      <div class="page-description">审核本人负责项目下申请人提交的论文、专利、软著等科研成果</div>
    </div>

    <div class="stats-row">
      <div class="stat-card pending">
        <div class="stat-num">{{ stats.pending || 0 }}</div>
        <div class="stat-label">待审核</div>
      </div>
      <div class="stat-card verified">
        <div class="stat-num">{{ stats.verified || 0 }}</div>
        <div class="stat-label">已核实</div>
      </div>
      <div class="stat-card rejected">
        <div class="stat-num">{{ stats.rejected || 0 }}</div>
        <div class="stat-label">已驳回</div>
      </div>
    </div>

    <div class="filter-toolbar">
      <el-input
        v-model="searchQuery"
        placeholder="搜索成果标题、项目、提交人"
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
        v-model="filterStatus"
        placeholder="审核状态"
        clearable
        class="filter-select"
        @change="handleFilter"
      >
        <el-option label="全部" value="all" />
        <el-option label="待审核" value="submitted" />
        <el-option label="已核实" value="verified" />
        <el-option label="已驳回" value="rejected" />
      </el-select>
      <el-select
        v-model="filterType"
        placeholder="成果类型"
        clearable
        class="filter-select"
        @change="handleFilter"
      >
        <el-option label="论文" value="paper" />
        <el-option label="专利" value="patent" />
        <el-option label="软件著作权" value="software" />
        <el-option label="研究报告" value="report" />
        <el-option label="原型样机" value="prototype" />
        <el-option label="技术标准" value="standard" />
        <el-option label="其他" value="other" />
      </el-select>
      <el-select
        v-model="filterYear"
        placeholder="成果年份"
        clearable
        class="filter-select filter-select--year"
        @change="handleFilter"
      >
        <el-option v-for="year in years" :key="year" :label="year + '年'" :value="year" />
      </el-select>
      <el-button type="primary" @click="handleSearch" :loading="tableLoading">搜索</el-button>
      <el-button @click="handleReset">重置</el-button>
    </div>

    <div class="table-wrap">
      <div class="table-toolbar">
        <span class="table-toolbar-title">成果列表</span>
        <div class="table-toolbar-actions">
          <el-button size="small" @click="exportToExcel">
            <el-icon><Download /></el-icon>
            导出
          </el-button>
          <el-button
            type="success"
            size="small"
            @click="batchVerify"
            :disabled="selectedIds.length === 0"
          >
            <el-icon><Check /></el-icon>
            批量核实
          </el-button>
          <el-button
            type="danger"
            size="small"
            plain
            @click="batchReject"
            :disabled="selectedIds.length === 0"
          >
            <el-icon><Close /></el-icon>
            批量驳回
          </el-button>
        </div>
      </div>

        <el-table
          v-loading="tableLoading"
          :data="achievementList"
          stripe
          @selection-change="handleSelectionChange"
          style="width: 100%"
        >
          <el-table-column type="selection" width="55" align="center" />

          <el-table-column prop="title" label="成果标题" min-width="250">
            <template #default="{ row }">
              <div class="achievement-title-cell">
                <div class="achievement-title">{{ row.title }}</div>
                <div class="achievement-meta">
                  <el-tag :type="getTypeTagType(row.type)" size="small">
                    {{ getTypeText(row.type) }}
                  </el-tag>
                  <span v-if="row.creator_info?.name" class="achievement-submitter">
                    {{ row.creator_info.name }}
                  </span>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="project_info.title" label="关联项目" width="180">
            <template #default="{ row }">
              <div class="project-info-cell">
                <div class="project-title">{{ row.project_info?.title }}</div>
                <div class="project-code">{{ row.project_info?.project_code }}</div>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="creator_info.name" label="提交人" width="120">
            <template #default="{ row }">
              <div class="authors-cell">
                {{ row.creator_info?.name || '--' }}
                <div v-if="row.creator_info?.department" class="sub-info">
                  {{ row.creator_info.department }}
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="achievement_date" label="成果日期" width="120" sortable>
            <template #default="{ row }">
              {{ formatDate(row.achievement_date) }}
            </template>
          </el-table-column>

          <el-table-column prop="status" label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.status)" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="verified_date" label="核实日期" width="120">
            <template #default="{ row }">
              {{ row.verified_date ? formatDate(row.verified_date) : '--' }}
            </template>
          </el-table-column>

          <el-table-column prop="verifier_info.name" label="审核人" width="100">
            <template #default="{ row }">
              <div class="verifier-cell">{{ row.verifier_info?.name || '--' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button size="small" type="primary" plain @click="viewDetail(row)">
                  <el-icon><View /></el-icon>
                  详情
                </el-button>

                <el-button
                  v-if="row.status === 'submitted'"
                  size="small"
                  type="success"
                  plain
                  @click="handleVerify(row)"
                >
                  <el-icon><Check /></el-icon>
                  核实
                </el-button>

                <el-button
                  v-if="row.status === 'submitted'"
                  size="small"
                  type="danger"
                  plain
                  @click="handleReject(row)"
                >
                  <el-icon><Close /></el-icon>
                  驳回
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-wrap">
          <el-pagination
            v-model:current-page="pagination.current"
            v-model:page-size="pagination.size"
            :total="pagination.total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
    </div>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="`科研成果详情 - ${currentDetail?.title || ''}`"
      width="900px"
      @closed="handleDialogClosed"
    >
      <div v-if="currentDetail" class="detail-content">
        <el-tabs v-model="activeTab">
          <!-- 基本信息标签页 -->
          <el-tab-pane label="基本信息" name="basic">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="成果标题">
                {{ currentDetail.title }}
              </el-descriptions-item>
              <el-descriptions-item label="成果类型">
                <el-tag :type="getTypeTagType(currentDetail.type)" size="small">
                  {{ getTypeText(currentDetail.type) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="关联项目">
                {{ currentDetail.project_info?.title }}
                <div class="sub-info">项目编号：{{ currentDetail.project_info?.project_code }}</div>
              </el-descriptions-item>
              <el-descriptions-item label="成果状态">
                <el-tag :type="getStatusTagType(currentDetail.status)" size="small">
                  {{ getStatusText(currentDetail.status) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="成果日期">
                {{ formatDate(currentDetail.achievement_date) }}
              </el-descriptions-item>
              <el-descriptions-item label="创建人">
                {{ currentDetail.creator_info?.name }}
                ({{ currentDetail.creator_info?.department }})
              </el-descriptions-item>
              <el-descriptions-item label="作者列表" :span="2">
                <div class="authors-list">
                  <el-tag
                    v-for="(author, index) in parseAuthors(currentDetail.authors)"
                    :key="index"
                    size="small"
                    style="margin-right: 8px; margin-bottom: 8px"
                  >
                    {{ author }}
                  </el-tag>
                </div>
              </el-descriptions-item>
              <el-descriptions-item label="关键词" :span="2">
                <div class="keywords-list">
                  <el-tag
                    v-for="(keyword, index) in formatKeywordsArray(currentDetail.keywords)"
                    :key="index"
                    type="info"
                    size="small"
                    style="margin-right: 8px; margin-bottom: 8px"
                  >
                    {{ keyword }}
                  </el-tag>
                </div>
              </el-descriptions-item>
              <el-descriptions-item label="成果描述" :span="2">
                <div class="description-content">{{ currentDetail.description || '无' }}</div>
              </el-descriptions-item>
              <el-descriptions-item label="外部链接" :span="2">
                <div class="external-link">
                  <el-link
                    v-if="currentDetail.external_link"
                    :href="currentDetail.external_link"
                    target="_blank"
                    type="primary"
                  >
                    {{ currentDetail.external_link }}
                    <el-icon><Link /></el-icon>
                  </el-link>
                  <span v-else>无</span>
                </div>
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>

          <!-- 附件材料标签页 -->
          <el-tab-pane label="附件材料" name="attachments">
            <div class="attachments-section">
              <h4>成果附件</h4>
              <div v-if="currentDetail.attachment_urls?.length > 0" class="docs-grid">
                <div
                  v-for="(doc, index) in currentDetail.attachment_urls"
                  :key="index"
                  class="doc-card"
                >
                  <div class="doc-preview" @click="previewFile(doc)">
                    <el-icon v-if="isImageFile(doc)" size="40"><Picture /></el-icon>
                    <el-icon v-else-if="isPdfFile(doc)" size="40"><Document /></el-icon>
                    <el-icon v-else size="40"><Files /></el-icon>
                    <div class="doc-name">{{ getFileName(doc) }}</div>
                    <div class="doc-size">{{ formatFileSize(getFileSize(doc)) }}</div>
                  </div>
                  <div class="doc-actions">
                    <el-button type="text" size="small" @click="downloadFile(doc)">
                      <el-icon><Download /></el-icon>
                      下载
                    </el-button>
                    <el-button type="text" size="small" @click="previewFile(doc)">
                      <el-icon><View /></el-icon>
                      预览
                    </el-button>
                  </div>
                </div>
              </div>
              <div v-else class="no-attachments">
                <el-empty description="暂无附件材料" />
              </div>
            </div>
          </el-tab-pane>

          <!-- 审核信息标签页 -->
          <el-tab-pane label="审核信息" name="review">
            <div class="review-info">
              <div v-if="currentDetail.status !== 'draft' && currentDetail.status !== 'submitted'">
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="审核人">
                    {{ currentDetail.verifier_info?.name || '--' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="审核日期">
                    {{
                      currentDetail.verified_date ? formatDate(currentDetail.verified_date) : '--'
                    }}
                  </el-descriptions-item>
                  <el-descriptions-item label="审核意见" :span="2">
                    <div class="review-comment">
                      {{ currentDetail.verification_comment || '无' }}
                    </div>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
              <div v-else>
                <el-empty description="尚未审核" />
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>

        <!-- 审核操作 -->
        <div
          v-if="currentDetail.status === 'submitted' || currentDetail.status === 'under_review'"
          class="review-actions"
        >
          <h4>审核操作</h4>
          <el-form :model="reviewForm" label-width="80px">
            <el-form-item label="审核结果">
              <el-radio-group v-model="reviewForm.recommendation">
                <el-radio label="verify">核实通过</el-radio>
                <el-radio label="reject">驳回修改</el-radio>
                <el-radio label="return">退回补充</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="审核意见">
              <el-input
                v-model="reviewForm.comment"
                type="textarea"
                :rows="4"
                placeholder="请输入审核意见，如发现问题请详细说明"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="submitReview" :loading="reviewLoading">
                提交审核
              </el-button>
              <el-button @click="detailDialogVisible = false">取消</el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </el-dialog>

    <!-- 文件预览对话框 -->
    <el-dialog
      v-model="previewDialogVisible"
      :title="`预览文件 - ${previewFileName}`"
      width="80%"
      top="5vh"
    >
      <div class="preview-container">
        <div v-if="isImagePreview" class="image-preview">
          <img :src="previewFileUrl" :alt="previewFileName" class="preview-image" />
        </div>
        <div v-else-if="isPdfPreview" class="pdf-preview">
          <iframe :src="previewFileUrl" class="preview-pdf" title="PDF预览"></iframe>
        </div>
        <div v-else class="unsupported-preview">
          <el-empty description="该文件类型不支持预览，请下载查看" />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  Download,
  Check,
  Close,
  View,
  Link,
  Picture,
  Document,
  Files,
  ArrowLeft,
} from '@element-plus/icons-vue'
import request from '@/utils/request'

const router = useRouter()

const goDashboard = () => {
  router.push('/assistant/dashboard')
}

interface ProjectAchievement {
  id: string
  project_id: string
  type: string
  title: string
  description?: string
  keywords?: string
  status: string
  achievement_date: string
  authors: any
  attachment_urls: string[]
  external_link?: string
  verified_by?: string
  verified_date?: string
  verification_comment?: string
  published_date?: string
  publish_link?: string
  project_info?: {
    id: string
    title: string
    project_code: string
    category: string
  }
  creator_info?: {
    id: string
    name: string
    department: string
  }
  verifier_info?: {
    id: string
    name: string
  }
}

// 响应式数据
const loading = ref(false)
const tableLoading = ref(true)
const achievementList = ref<ProjectAchievement[]>([])
const selectedIds = ref<string[]>([])
const searchQuery = ref('')
const filterStatus = ref('all')
const filterType = ref('')
const filterYear = ref('')
const stats = ref({
  pending: 0,
  reviewing: 0,
  verified: 0,
  rejected: 0,
  by_type: {
    paper: 0,
    patent: 0,
    software: 0,
    others: 0,
  },
})

// 分页
const pagination = ref({
  current: 1,
  size: 10,
  total: 0,
})

// 详情对话框
const detailDialogVisible = ref(false)
const currentDetail = ref<ProjectAchievement | null>(null)
const activeTab = ref('basic')
const reviewForm = ref({
  recommendation: 'verify',
  comment: '',
})
const reviewLoading = ref(false)

// 预览对话框
const previewDialogVisible = ref(false)
const previewFileUrl = ref('')
const previewFileName = ref('')
const isImagePreview = ref(false)
const isPdfPreview = ref(false)

// 计算属性
const years = computed(() => {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let i = currentYear; i >= currentYear - 10; i--) {
    years.push(i)
  }
  return years
})

const selectedAchievements = computed(() => {
  return achievementList.value.filter((item) => selectedIds.value.includes(item.id))
})

// 工具函数
const formatDate = (dateString: string) => {
  if (!dateString) return '--'
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

const getTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    paper: '论文',
    patent: '专利',
    software: '软件著作权',
    report: '研究报告',
    prototype: '原型样机',
    standard: '技术标准',
    other: '其他',
  }
  return typeMap[type] || type
}

const getTypeTagType = (type: string) => {
  const typeMap: Record<string, string> = {
    paper: 'primary',
    patent: 'success',
    software: 'warning',
    report: 'info',
    prototype: '',
    standard: 'success',
    other: 'info',
  }
  return typeMap[type] || 'info'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    submitted: '待审核',
    under_review: '审核中',
    verified: '已核实',
    rejected: '已驳回',
  }
  return statusMap[status] || status
}

const getStatusTagType = (status: string) => {
  const typeMap: Record<string, string> = {
    draft: 'info',
    submitted: 'warning',
    under_review: 'primary',
    verified: 'success',
    rejected: 'danger',
  }
  return typeMap[status] || 'info'
}

const formatAuthors = (authors: any) => {
  if (!authors) return '--'
  try {
    const authorList = typeof authors === 'string' ? JSON.parse(authors) : authors
    if (Array.isArray(authorList) && authorList.length > 0) {
      return authorList.slice(0, 3).join('、') + (authorList.length > 3 ? '等' : '')
    }
    return '--'
  } catch {
    return '--'
  }
}

const parseAuthors = (authors: any) => {
  if (!authors) return []
  try {
    return typeof authors === 'string' ? JSON.parse(authors) : authors
  } catch {
    return []
  }
}

const formatKeywords = (keywords: string | string[] | null | undefined) => {
  if (!keywords || (Array.isArray(keywords) && keywords.length === 0)) return ''
  if (Array.isArray(keywords)) {
    return keywords.slice(0, 3).join('，') + (keywords.length > 3 ? '...' : '')
  }
  const keywordArray = String(keywords).split(/[,，;；]/).filter((k) => k.trim())
  if (!keywordArray.length) return ''
  return keywordArray.slice(0, 3).join('，') + (keywordArray.length > 3 ? '...' : '')
}

const formatKeywordsArray = (keywords: string | string[] | null | undefined) => {
  if (!keywords) return []
  if (Array.isArray(keywords)) return keywords.filter(Boolean).slice(0, 10)
  return String(keywords)
    .split(/[,，;；]/)
    .filter((k) => k.trim())
    .slice(0, 10)
}

const getFileName = (filePath: string) => {
  return filePath.split('/').pop() || filePath
}

const getFileSize = (filePath: string) => {
  // 这里应该从服务器获取文件大小，暂时返回模拟值
  return 1024 * 1024 // 1MB
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const isImageFile = (filePath: string) => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
  const lowerPath = filePath.toLowerCase()
  return imageExtensions.some((ext) => lowerPath.endsWith(ext))
}

const isPdfFile = (filePath: string) => {
  return filePath.toLowerCase().endsWith('.pdf')
}

// 数据加载
const loadAchievementData = async () => {
  tableLoading.value = true
  try {
    const params = {
      page: pagination.value.current,
      pageSize: pagination.value.size,
      search: searchQuery.value,
      status: filterStatus.value === 'all' ? '' : filterStatus.value,
      type: filterType.value,
      year: filterYear.value,
    }

    console.log('请求参数:', params)

    const response = await request.get('/api/assistant/achievements/list', {
      params: params,
    })

    if (response.success) {
      achievementList.value = response.data.list || []
      pagination.value.total =
        response.data.pagination?.total ?? response.data.total ?? achievementList.value.length
      if (response.data.stats) {
        stats.value = {
          ...stats.value,
          ...response.data.stats,
          pending: Number(response.data.stats.pending) || 0,
          verified: Number(response.data.stats.verified) || 0,
          rejected: Number(response.data.stats.rejected) || 0,
          by_type: response.data.stats.by_type || stats.value.by_type,
        }
      }
    } else {
      ElMessage.error(response.error || '加载数据失败')
    }
  } catch (error) {
    console.error('加载科研成果数据失败:', error)
    ElMessage.error('网络错误，加载数据失败')
  } finally {
    tableLoading.value = false
    loading.value = false
  }
}
const handleSearch = () => {
  pagination.value.current = 1
  loadAchievementData()
}

const handleFilter = () => {
  pagination.value.current = 1
  loadAchievementData()
}

const handleReset = () => {
  searchQuery.value = ''
  filterStatus.value = 'all'
  filterType.value = ''
  filterYear.value = ''
  pagination.value.current = 1
  loadAchievementData()
}

const handleSelectionChange = (selection: ProjectAchievement[]) => {
  selectedIds.value = selection.map((item) => item.id)
}

const handleSizeChange = (size: number) => {
  pagination.value.size = size
  pagination.value.current = 1
  loadAchievementData()
}

const handleCurrentChange = (page: number) => {
  pagination.value.current = page
  loadAchievementData()
}

const viewDetail = async (row: ProjectAchievement) => {
  try {
    const response = await request.get(`/api/assistant/achievements/${row.id}`)
    if (response.success) {
      currentDetail.value = response.data.achievement
      detailDialogVisible.value = true
      activeTab.value = 'basic'
      reviewForm.value = {
        recommendation: 'verify',
        comment: '',
      }
    }
  } catch (error) {
    console.error('获取详情失败:', error)
    ElMessage.error('获取详情失败')
  }
}

const handleVerify = (row: ProjectAchievement) => {
  currentDetail.value = row
  reviewForm.value = {
    recommendation: 'verify',
    comment: '',
  }
  detailDialogVisible.value = true
}

const handleReject = (row: ProjectAchievement) => {
  currentDetail.value = row
  reviewForm.value = {
    recommendation: 'reject',
    comment: '',
  }
  detailDialogVisible.value = true
}

const handleDialogClosed = () => {
  currentDetail.value = null
  activeTab.value = 'basic'
  reviewForm.value = {
    recommendation: 'verify',
    comment: '',
  }
}

// 文件操作
const downloadFile = (filePath: string) => {
  const fileName = getFileName(filePath)
  const downloadUrl = `/api/files/download?path=${encodeURIComponent(filePath)}`

  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const previewFile = async (filePath: string) => {
  const fileName = getFileName(filePath)

  if (isImageFile(filePath)) {
    previewFileUrl.value = `/api/files/download?path=${encodeURIComponent(filePath)}`
    previewFileName.value = fileName
    isImagePreview.value = true
    isPdfPreview.value = false
    previewDialogVisible.value = true
  } else if (isPdfFile(filePath)) {
    previewFileUrl.value = `/api/files/download?path=${encodeURIComponent(filePath)}`
    previewFileName.value = fileName
    isImagePreview.value = false
    isPdfPreview.value = true
    previewDialogVisible.value = true
  } else {
    ElMessage.info('该文件类型不支持预览，请下载查看')
    downloadFile(filePath)
  }
}

// 审核操作
const submitReview = async () => {
  if (!currentDetail.value) return

  if (!reviewForm.value.comment.trim()) {
    ElMessage.warning('请填写审核意见')
    return
  }

  reviewLoading.value = true
  try {
    const response = await request.post(
      `/api/assistant/achievements/${currentDetail.value.id}/review`,
      {
        recommendation: reviewForm.value.recommendation,
        comment: reviewForm.value.comment,
      },
    )

    if (response.success) {
      ElMessage.success('审核提交成功')
      detailDialogVisible.value = false
      loadAchievementData()
      loadStats()
    } else {
      ElMessage.error(response.error || '审核提交失败')
    }
  } catch (error) {
    console.error('提交审核失败:', error)
    ElMessage.error('提交审核失败')
  } finally {
    reviewLoading.value = false
  }
}

// 批量操作
const batchVerify = async () => {
  if (selectedIds.value.length === 0) return

  try {
    await ElMessageBox.confirm(
      `确定要批量核实选中的 ${selectedIds.value.length} 项科研成果吗？`,
      '批量核实',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    const response = await request.post('/api/assistant/achievements/batch-verify', {
      ids: selectedIds.value,
      comment: '批量核实通过',
    })

    if (response.success) {
      ElMessage.success('批量核实成功')
      selectedIds.value = []
      loadAchievementData()
      loadStats()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量核实失败')
    }
  }
}

const batchReject = async () => {
  if (selectedIds.value.length === 0) return

  try {
    const result = await ElMessageBox.prompt('请输入驳回原因', '批量驳回', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputPlaceholder: '请输入驳回原因',
    })

    const comment = result.value
    if (!comment.trim()) {
      ElMessage.warning('请填写驳回原因')
      return
    }

    const response = await request.post('/api/assistant/achievements/batch-reject', {
      ids: selectedIds.value,
      comment: comment,
    })

    if (response.success) {
      ElMessage.success('批量驳回成功')
      selectedIds.value = []
      loadAchievementData()
      loadStats()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量驳回失败')
    }
  }
}

// 导出Excel
const exportToExcel = async () => {
  try {
    const params = {
      search: searchQuery.value,
      status: filterStatus.value === 'all' ? '' : filterStatus.value,
      type: filterType.value,
      year: filterYear.value,
    }

    const response = await request.get('/api/assistant/achievements/export', {
      responseType: 'blob',
      params: params,
    })

    const blob = new Blob([response], { type: 'application/vnd.ms-excel' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `科研成果审核记录_${new Date().toISOString().split('T')[0]}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

onMounted(() => {
  loadAchievementData()
})
</script>

<style scoped>
.audit-achievements-page {
  padding: 24px;
  min-height: 100vh;
  background: #f5f7fa;
}

.page-header {
  margin-bottom: 20px;
}

.back-btn {
  margin-bottom: 12px;
}

.page-title {
  margin: 0 0 6px;
  font-size: 24px;
  font-weight: 600;
  color: #1a1a2e;
}

.page-description {
  color: #6b7280;
  font-size: 14px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 16px 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.stat-num {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

.stat-label {
  margin-top: 4px;
  font-size: 13px;
  color: #6b7280;
}

.stat-card.pending .stat-num {
  color: #d97706;
}

.stat-card.verified .stat-num {
  color: #059669;
}

.stat-card.rejected .stat-num {
  color: #dc2626;
}

.filter-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  padding: 16px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.search-input {
  width: 280px;
}

.filter-select {
  width: 130px;
}

.filter-select--year {
  width: 110px;
}

.table-wrap {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}

.table-toolbar-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
}

.table-toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

/* 单元格样式 */
.achievement-title-cell {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.achievement-title {
  font-weight: 600;
  color: #1d2129;
  line-height: 1.4;
  font-size: 14px;
}

.achievement-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.achievement-submitter {
  font-size: 12px;
  color: #86909c;
  line-height: 1.4;
}

.project-info-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.project-title {
  font-weight: 500;
  color: #1d2129;
  line-height: 1.4;
  font-size: 13px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-code {
  font-size: 12px;
  color: #86909c;
  font-family: monospace;
}

.authors-cell {
  color: #1d2129;
  line-height: 1.4;
  font-size: 13px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.verifier-cell {
  color: #1d2129;
  line-height: 1.4;
  font-size: 13px;
}

.action-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* 分页样式 - 保留兼容 */

/* 详情对话框样式 */
.detail-content {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 8px;
}

.sub-info {
  font-size: 12px;
  color: #86909c;
  margin-top: 4px;
}

.authors-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.keywords-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.description-content {
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

.external-link {
  word-break: break-all;
}

/* 附件样式 */
.attachments-section {
  margin-top: 16px;
}

.attachments-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #1d2129;
  font-weight: 600;
}

.docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.doc-card {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s;
  background: white;
}

.doc-card:hover {
  border-color: #b31b1b;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.doc-preview {
  padding: 24px 16px;
  text-align: center;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.doc-preview .el-icon {
  color: #b31b1b;
  margin-bottom: 8px;
}

.doc-name {
  font-size: 12px;
  color: #666;
  word-break: break-all;
  line-height: 1.4;
  margin-bottom: 4px;
}

.doc-size {
  font-size: 11px;
  color: #999;
}

.doc-actions {
  display: flex;
  justify-content: space-around;
  padding: 8px;
  background: white;
}

.no-attachments {
  padding: 40px;
  text-align: center;
}

/* 审核信息样式 */
.review-info {
  margin-top: 16px;
}

.review-comment {
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

/* 转化信息样式 */
.transfer-info {
  margin-top: 16px;
}

.transfer-info h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #1d2129;
  font-weight: 600;
}

.transfer-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.transfer-item {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 16px;
  background: #fafafa;
}

.transfer-description {
  padding: 8px;
  background: white;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
}

/* 审核操作样式 */
.review-actions,
.publish-actions,
.transfer-actions {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}

.review-actions h4,
.publish-actions h4,
.transfer-actions h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #1d2129;
  font-weight: 600;
}

/* 转化对话框样式 */
.transfer-dialog-content {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 8px;
}

/* 预览容器样式 */
.preview-container {
  height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview {
  max-height: 100%;
  overflow: auto;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.pdf-preview {
  width: 100%;
  height: 100%;
}

.preview-pdf {
  width: 100%;
  height: 100%;
  border: none;
}

.unsupported-preview {
  padding: 40px;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .audit-achievements-page {
    padding: 16px;
  }

  .stats-row {
    grid-template-columns: 1fr;
  }

  .search-input,
  .filter-select,
  .filter-select--year {
    width: 100%;
  }

  .table-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-buttons .el-button {
    width: 100%;
    margin-bottom: 4px;
  }

  .docs-grid {
    grid-template-columns: 1fr;
  }
}
</style>
