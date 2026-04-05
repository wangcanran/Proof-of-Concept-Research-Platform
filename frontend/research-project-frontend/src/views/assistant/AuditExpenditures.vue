<!-- src/views/assistant/AuditExpenditures.vue -->
<template>
  <div class="audit-expenditures-page">
    <!-- 页面标题和操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">支出审核管理</h1>
        <div class="breadcrumb">
          <span>工作台</span>
          <span class="separator">/</span>
          <span class="current">支出审核</span>
        </div>
      </div>
      <div class="header-right">
        <div class="filter-bar">
          <el-input
            v-model="searchQuery"
            placeholder="搜索支出编号、项目、收款方..."
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
            placeholder="状态筛选"
            clearable
            class="status-filter"
            @change="handleFilter"
          >
            <el-option label="全部" value="all" />
            <el-option label="待审核" value="submitted" />
            <el-option label="审核中" value="under_review" />
            <el-option label="已批准" value="approved" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>

          <el-select
            v-model="filterCategory"
            placeholder="支出类别"
            clearable
            class="category-filter"
            @change="handleFilter"
          >
            <el-option label="设备费" value="设备费" />
            <el-option label="材料费" value="材料费" />
            <el-option label="测试费" value="测试费" />
            <el-option label="差旅费" value="差旅费" />
            <el-option label="会议费" value="会议费" />
            <el-option label="劳务费" value="劳务费" />
            <el-option label="专家咨询费" value="专家咨询费" />
            <el-option label="出版费" value="出版费" />
            <el-option label="管理费" value="管理费" />
            <el-option label="其他" value="其他" />
          </el-select>

          <el-select
            v-model="filterDateRange"
            placeholder="支出时间"
            clearable
            class="date-filter"
            @change="handleFilter"
          >
            <el-option label="今天" value="today" />
            <el-option label="本周" value="week" />
            <el-option label="本月" value="month" />
            <el-option label="本季度" value="quarter" />
          </el-select>

          <el-button type="primary" @click="handleSearch" :loading="loading">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>

          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards" v-if="!loading">
      <el-row :gutter="20">
        <el-col :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
          <div class="stat-card pending">
            <div class="stat-content">
              <div class="stat-number">{{ stats.pending || 0 }}</div>
              <div class="stat-label">待审核</div>
            </div>
            <div class="stat-icon">
              <span class="icon">⏳</span>
            </div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
          <div class="stat-card reviewing">
            <div class="stat-content">
              <div class="stat-number">{{ stats.reviewing || 0 }}</div>
              <div class="stat-label">审核中</div>
            </div>
            <div class="stat-icon">
              <span class="icon">📝</span>
            </div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
          <div class="stat-card approved">
            <div class="stat-content">
              <div class="stat-number">{{ stats.approved || 0 }}</div>
              <div class="stat-label">已批准</div>
            </div>
            <div class="stat-icon">
              <span class="icon">✅</span>
            </div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
          <div class="stat-card rejected">
            <div class="stat-content">
              <div class="stat-number">{{ stats.rejected || 0 }}</div>
              <div class="stat-label">已拒绝</div>
            </div>
            <div class="stat-icon">
              <span class="icon">❌</span>
            </div>
          </div>
        </el-col>
      </el-row>

      <!-- 金额统计 -->
      <el-row :gutter="20" style="margin-top: 20px">
        <el-col :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
          <div class="stat-card amount">
            <div class="stat-content">
              <div class="stat-number">¥{{ formatCurrency(stats.total_amount || 0) }}</div>
              <div class="stat-label">总支出金额</div>
            </div>
            <div class="stat-icon">
              <span class="icon">💰</span>
            </div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
          <div class="stat-card amount-pending">
            <div class="stat-content">
              <div class="stat-number">¥{{ formatCurrency(stats.pending_amount || 0) }}</div>
              <div class="stat-label">待审核金额</div>
            </div>
            <div class="stat-icon">
              <span class="icon">⏳</span>
            </div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
          <div class="stat-card amount-approved">
            <div class="stat-content">
              <div class="stat-number">¥{{ formatCurrency(stats.approved_amount || 0) }}</div>
              <div class="stat-label">已批准金额</div>
            </div>
            <div class="stat-icon">
              <span class="icon">✅</span>
            </div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
          <div class="stat-card amount-rejected">
            <div class="stat-content">
              <div class="stat-number">¥{{ formatCurrency(stats.rejected_amount || 0) }}</div>
              <div class="stat-label">已拒绝金额</div>
            </div>
            <div class="stat-icon">
              <span class="icon">❌</span>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="8" animated />
    </div>

    <!-- 主要表格 -->
    <div v-else class="main-content">
      <el-card class="table-card">
        <template #header>
          <div class="table-header">
            <span class="table-title">支出记录列表</span>
            <div class="table-actions">
              <el-button type="info" size="small" @click="exportToExcel">
                <el-icon><Download /></el-icon>
                导出
              </el-button>
              <el-button
                type="success"
                size="small"
                @click="batchApprove"
                :disabled="selectedIds.length === 0"
              >
                <el-icon><Check /></el-icon>
                批量批准
              </el-button>
              <el-button
                type="danger"
                size="small"
                @click="batchReject"
                :disabled="selectedIds.length === 0"
              >
                <el-icon><Close /></el-icon>
                批量拒绝
              </el-button>
            </div>
          </div>
        </template>

        <el-table
          v-loading="tableLoading"
          :data="expenditureList"
          @selection-change="handleSelectionChange"
          style="width: 100%"
          :header-cell-style="{ background: '#f5f7fa', color: '#333' }"
        >
          <el-table-column type="selection" width="55" align="center" />

          <el-table-column prop="expense_no" label="支出编号" width="160">
            <template #default="{ row }">
              <span class="expense-no">{{ row.expense_no }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="project_info.title" label="项目信息" min-width="200">
            <template #default="{ row }">
              <div class="project-info-cell">
                <div class="project-title">{{ row.project_info?.title }}</div>
                <div class="project-meta">
                  <el-tag size="small" type="info">{{ row.project_info?.category }}</el-tag>
                  <span class="project-code">{{ row.project_info?.project_code }}</span>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="category" label="支出类别" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="getCategoryTagType(row.category)" size="small">
                {{ row.category }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="item_name" label="支出项目" width="150">
            <template #default="{ row }">
              <div class="item-name">{{ row.item_name }}</div>
            </template>
          </el-table-column>

          <el-table-column prop="amount" label="金额" width="120" align="right">
            <template #default="{ row }">
              <span class="amount">¥{{ formatCurrency(row.amount) }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="expense_date" label="支出日期" width="120" sortable>
            <template #default="{ row }">
              {{ formatDate(row.expense_date) }}
            </template>
          </el-table-column>

          <el-table-column prop="payee" label="收款方" width="150">
            <template #default="{ row }">
              <div class="payee">{{ row.payee || '--' }}</div>
            </template>
          </el-table-column>

          <el-table-column prop="status" label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.status)" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="review_date" label="审核日期" width="120">
            <template #default="{ row }">
              {{ row.review_date ? formatDate(row.review_date) : '--' }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button size="small" type="primary" plain @click="viewDetail(row)">
                  <el-icon><View /></el-icon>
                  详情
                </el-button>

                <el-button
                  v-if="row.status === 'submitted' || row.status === 'under_review'"
                  size="small"
                  type="success"
                  plain
                  @click="handleApprove(row)"
                >
                  <el-icon><Check /></el-icon>
                  批准
                </el-button>

                <el-button
                  v-if="row.status === 'submitted' || row.status === 'under_review'"
                  size="small"
                  type="danger"
                  plain
                  @click="handleReject(row)"
                >
                  <el-icon><Close /></el-icon>
                  拒绝
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-container">
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
      </el-card>
    </div>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="`支出记录详情 - ${currentDetail?.expense_no || ''}`"
      width="900px"
      @closed="handleDialogClosed"
    >
      <div v-if="currentDetail" class="detail-content">
        <el-tabs v-model="activeTab">
          <!-- 基本信息标签页 -->
          <el-tab-pane label="基本信息" name="basic">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="支出编号">
                {{ currentDetail.expense_no }}
              </el-descriptions-item>
              <el-descriptions-item label="支出状态">
                <el-tag :type="getStatusTagType(currentDetail.status)" size="small">
                  {{ getStatusText(currentDetail.status) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="项目名称">
                {{ currentDetail.project_info?.title }}
              </el-descriptions-item>
              <el-descriptions-item label="项目编号">
                {{ currentDetail.project_info?.project_code }}
              </el-descriptions-item>
              <el-descriptions-item label="申请人">
                {{ currentDetail.applicant_info?.name }}
                ({{ currentDetail.applicant_info?.department }})
              </el-descriptions-item>
              <el-descriptions-item label="支出金额">
                <span class="amount-large">¥{{ formatCurrency(currentDetail.amount) }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="支出类别">
                <el-tag :type="getCategoryTagType(currentDetail.category)" size="small">
                  {{ currentDetail.category }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="支出日期">
                {{ formatDate(currentDetail.expense_date) }}
              </el-descriptions-item>
              <el-descriptions-item label="收款方">
                {{ currentDetail.payee || '--' }}
              </el-descriptions-item>
              <el-descriptions-item label="支出说明" :span="2">
                <div class="description-content">{{ currentDetail.description || '无' }}</div>
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>

          <!-- 凭证材料标签页 -->
          <el-tab-pane label="凭证材料" name="attachments">
            <div class="attachments-section">
              <h4>支出凭证</h4>
              <div v-if="currentDetail.supporting_docs?.length > 0" class="docs-grid">
                <div
                  v-for="(doc, index) in currentDetail.supporting_docs"
                  :key="index"
                  class="doc-card"
                >
                  <div class="doc-preview" @click="previewFile(doc)">
                    <el-icon v-if="isImageFile(doc)" size="40"><Picture /></el-icon>
                    <el-icon v-else size="40"><Document /></el-icon>
                    <div class="doc-name">{{ getFileName(doc) }}</div>
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
                <el-empty description="暂无凭证材料" />
              </div>
            </div>
          </el-tab-pane>

          <!-- 审核信息标签页 -->
          <el-tab-pane label="审核信息" name="review">
            <div class="review-info">
              <div v-if="currentDetail.status !== 'draft' && currentDetail.status !== 'submitted'">
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="审核人">
                    {{ currentDetail.reviewer_info?.name || '--' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="审核日期">
                    {{ currentDetail.review_date ? formatDate(currentDetail.review_date) : '--' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="审核意见" :span="2">
                    <div class="review-comment">{{ currentDetail.review_comment || '无' }}</div>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
              <div v-else>
                <el-empty description="尚未审核" />
              </div>
            </div>
          </el-tab-pane>

          <!-- 关联信息标签页 -->
          <el-tab-pane label="关联信息" name="related">
            <div class="related-info">
              <div v-if="currentDetail.funding_app_info">
                <h4>关联经费申请</h4>
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="申请编号">
                    {{ currentDetail.funding_app_info.application_no }}
                  </el-descriptions-item>
                  <el-descriptions-item label="申请状态">
                    <el-tag
                      :type="getStatusTagType(currentDetail.funding_app_info.status)"
                      size="small"
                    >
                      {{ getStatusText(currentDetail.funding_app_info.status) }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="申请金额">
                    ¥{{ formatCurrency(currentDetail.funding_app_info.apply_amount) }}
                  </el-descriptions-item>
                  <el-descriptions-item label="申请日期">
                    {{ formatDate(currentDetail.funding_app_info.apply_date) }}
                  </el-descriptions-item>
                </el-descriptions>
              </div>
              <div v-else>
                <el-empty description="未关联经费申请" />
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
                <el-radio label="approve">批准</el-radio>
                <el-radio label="reject">拒绝</el-radio>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  Refresh,
  Download,
  Check,
  Close,
  View,
  Picture,
  Document,
} from '@element-plus/icons-vue'
import request from '@/utils/request'

interface ExpenditureRecord {
  id: string
  expense_no: string
  project_id: string
  funding_app_id?: string
  category: string
  item_name: string
  amount: number
  expense_date: string
  payee?: string
  description?: string
  supporting_docs: string[]
  status: string
  reviewer_id?: string
  review_date?: string
  review_comment?: string
  project_info?: {
    id: string
    title: string
    project_code: string
    category: string
  }
  applicant_info?: {
    id: string
    name: string
    department: string
  }
  reviewer_info?: {
    id: string
    name: string
  }
  funding_app_info?: {
    id: string
    application_no: string
    apply_amount: number
    status: string
    apply_date: string
  }
}

// 响应式数据
const loading = ref(true)
const tableLoading = ref(false)
const expenditureList = ref<ExpenditureRecord[]>([])
const selectedIds = ref<string[]>([])
const searchQuery = ref('')
const filterStatus = ref('all')
const filterCategory = ref('')
const filterDateRange = ref('')
const stats = ref({
  pending: 0,
  reviewing: 0,
  approved: 0,
  rejected: 0,
  total_amount: 0,
  pending_amount: 0,
  approved_amount: 0,
  rejected_amount: 0,
})

// 分页
const pagination = ref({
  current: 1,
  size: 10,
  total: 0,
})

// 详情对话框
const detailDialogVisible = ref(false)
const currentDetail = ref<ExpenditureRecord | null>(null)
const activeTab = ref('basic')
const reviewForm = ref({
  recommendation: 'approve',
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
const selectedExpenditures = computed(() => {
  return expenditureList.value.filter((item) => selectedIds.value.includes(item.id))
})

// 工具函数
const formatCurrency = (amount: number) => {
  return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

const formatDate = (dateString: string) => {
  if (!dateString) return '--'
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    submitted: '待审核',
    under_review: '审核中',
    approved: '已批准',
    rejected: '已拒绝',
  }
  return statusMap[status] || status
}

const getStatusTagType = (status: string) => {
  const typeMap: Record<string, string> = {
    draft: 'info',
    submitted: 'warning',
    under_review: 'primary',
    approved: 'success',
    rejected: 'danger',
  }
  return typeMap[status] || 'info'
}

const getCategoryTagType = (category: string) => {
  const typeMap: Record<string, string> = {
    设备费: '',
    材料费: 'success',
    测试费: 'warning',
    差旅费: 'info',
    会议费: '',
    劳务费: 'success',
    专家咨询费: 'warning',
    出版费: 'info',
    管理费: '',
    其他: 'info',
  }
  return typeMap[category] || 'info'
}

const getFileName = (filePath: string) => {
  return filePath.split('/').pop() || filePath
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
const loadExpenditureData = async () => {
  tableLoading.value = true
  try {
    const params = {
      page: pagination.value.current,
      pageSize: pagination.value.size,
      search: searchQuery.value,
      status: filterStatus.value === 'all' ? '' : filterStatus.value,
      category: filterCategory.value,
      dateRange: filterDateRange.value,
    }

    console.log('请求参数:', params)

    const response = await request.get('/api/assistant/expenditures/list', {
      params: params,
    })

    if (response.success) {
      expenditureList.value = response.data.list || []
      pagination.value.total = response.data.total || 0
      stats.value = response.data.stats || stats.value
    } else {
      ElMessage.error(response.error || '加载数据失败')
    }
  } catch (error) {
    console.error('加载支出数据失败:', error)
    ElMessage.error('网络错误，加载数据失败')
  } finally {
    tableLoading.value = false
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const response = await request.get('/api/assistant/expenditures/stats')
    if (response.success) {
      stats.value = response.data.summary || stats.value
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

// 事件处理
const handleSearch = () => {
  pagination.value.current = 1
  loadExpenditureData()
}

const handleFilter = () => {
  pagination.value.current = 1
  loadExpenditureData()
}

const handleReset = () => {
  searchQuery.value = ''
  filterStatus.value = 'all'
  filterCategory.value = ''
  filterDateRange.value = ''
  pagination.value.current = 1
  loadExpenditureData()
}

const handleSelectionChange = (selection: ExpenditureRecord[]) => {
  selectedIds.value = selection.map((item) => item.id)
}

const handleSizeChange = (size: number) => {
  pagination.value.size = size
  pagination.value.current = 1
  loadExpenditureData()
}

const handleCurrentChange = (page: number) => {
  pagination.value.current = page
  loadExpenditureData()
}

const viewDetail = async (row: ExpenditureRecord) => {
  try {
    const response = await request.get(`/api/assistant/expenditures/${row.id}`)
    if (response.success) {
      currentDetail.value = response.data.expenditure
      detailDialogVisible.value = true
      activeTab.value = 'basic'
      reviewForm.value = {
        recommendation: 'approve',
        comment: '',
      }
    }
  } catch (error) {
    console.error('获取详情失败:', error)
    ElMessage.error('获取详情失败')
  }
}

const handleApprove = (row: ExpenditureRecord) => {
  currentDetail.value = row
  reviewForm.value = {
    recommendation: 'approve',
    comment: '',
  }
  detailDialogVisible.value = true
}

const handleReject = (row: ExpenditureRecord) => {
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
    recommendation: 'approve',
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
    // 图片文件直接预览
    previewFileUrl.value = `/api/files/download?path=${encodeURIComponent(filePath)}`
    previewFileName.value = fileName
    isImagePreview.value = true
    isPdfPreview.value = false
    previewDialogVisible.value = true
  } else if (isPdfFile(filePath)) {
    // PDF文件预览
    previewFileUrl.value = `/api/files/download?path=${encodeURIComponent(filePath)}`
    previewFileName.value = fileName
    isImagePreview.value = false
    isPdfPreview.value = true
    previewDialogVisible.value = true
  } else {
    // 其他文件类型提示下载
    ElMessage.info('该文件类型不支持预览，请下载查看')
    downloadFile(filePath)
  }
}

// 提交审核
const submitReview = async () => {
  if (!currentDetail.value) return

  if (!reviewForm.value.comment.trim()) {
    ElMessage.warning('请填写审核意见')
    return
  }

  reviewLoading.value = true
  try {
    const response = await request.post(
      `/api/assistant/expenditures/${currentDetail.value.id}/review`,
      {
        recommendation: reviewForm.value.recommendation,
        comment: reviewForm.value.comment,
      },
    )

    if (response.success) {
      ElMessage.success('审核提交成功')
      detailDialogVisible.value = false
      loadExpenditureData()
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
const batchApprove = async () => {
  if (selectedIds.value.length === 0) return

  try {
    await ElMessageBox.confirm(
      `确定要批量批准选中的 ${selectedIds.value.length} 条支出记录吗？`,
      '批量批准',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    const response = await request.post('/api/assistant/expenditures/batch-approve', {
      ids: selectedIds.value,
      comment: '批量批准',
    })

    if (response.success) {
      ElMessage.success('批量批准成功')
      selectedIds.value = []
      loadExpenditureData()
      loadStats()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量批准失败')
    }
  }
}

const batchReject = async () => {
  if (selectedIds.value.length === 0) return

  try {
    const result = await ElMessageBox.prompt('请输入拒绝原因', '批量拒绝', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputPlaceholder: '请输入拒绝原因',
    })

    const comment = result.value
    if (!comment.trim()) {
      ElMessage.warning('请填写拒绝原因')
      return
    }

    const response = await request.post('/api/assistant/expenditures/batch-reject', {
      ids: selectedIds.value,
      comment: comment,
    })

    if (response.success) {
      ElMessage.success('批量拒绝成功')
      selectedIds.value = []
      loadExpenditureData()
      loadStats()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量拒绝失败')
    }
  }
}

// 导出Excel
const exportToExcel = async () => {
  try {
    const params = {
      search: searchQuery.value,
      status: filterStatus.value === 'all' ? '' : filterStatus.value,
      category: filterCategory.value,
      dateRange: filterDateRange.value,
    }

    const response = await request.get('/api/assistant/expenditures/export', {
      responseType: 'blob',
      params: params,
    })

    const blob = new Blob([response], { type: 'application/vnd.ms-excel' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `支出审核记录_${new Date().toISOString().split('T')[0]}.xlsx`
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

// 生命周期
onMounted(() => {
  loadExpenditureData()
  loadStats()
})
</script>

<style scoped>
.audit-expenditures-page {
  padding: 20px;
  min-height: 100vh;
  background: #f0f2f5;
}

/* 页面标题样式 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.header-left {
  flex: 1;
  min-width: 300px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 8px;
}

.breadcrumb {
  font-size: 14px;
  color: #86909c;
}

.breadcrumb .separator {
  margin: 0 8px;
}

.breadcrumb .current {
  color: #722ed1;
  font-weight: 500;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.search-input {
  width: 300px;
}

.status-filter,
.category-filter,
.date-filter {
  width: 140px;
}

/* 统计卡片 */
.stats-cards {
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-radius: 12px;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
  height: 100px;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-card.pending {
  background: linear-gradient(135deg, #ffa940 0%, #fa8c16 100%);
}

.stat-card.reviewing {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
}

.stat-card.approved {
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
}

.stat-card.rejected {
  background: linear-gradient(135deg, #ff4d4f 0%, #d9363e 100%);
}

.stat-card.amount {
  background: linear-gradient(135deg, #722ed1 0%, #eb2f96 100%);
}

.stat-card.amount-pending {
  background: linear-gradient(135deg, #ffa940 0%, #fa8c16 100%);
}

.stat-card.amount-approved {
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
}

.stat-card.amount-rejected {
  background: linear-gradient(135deg, #ff4d4f 0%, #d9363e 100%);
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
}

.stat-icon .icon {
  font-size: 40px;
  opacity: 0.8;
}

/* 表格卡片 */
.table-card {
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-title {
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
}

.table-actions {
  display: flex;
  gap: 8px;
}

/* 单元格样式 */
.expense-no {
  font-family: monospace;
  font-weight: 600;
  color: #722ed1;
  background: #f9f0ff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
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
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

.project-code {
  font-size: 12px;
  color: #86909c;
  font-family: monospace;
}

.item-name {
  font-weight: 500;
  color: #1d2129;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.amount {
  font-weight: 600;
  color: #52c41a;
  font-size: 14px;
}

.payee {
  color: #1d2129;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.action-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* 分页样式 */
.pagination-container {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

/* 详情对话框样式 */
.detail-content {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 8px;
}

.amount-large {
  font-size: 18px;
  font-weight: 700;
  color: #52c41a;
}

.description-content {
  padding: 8px;
  background: #fafafa;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
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
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
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
  border-color: #1890ff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.doc-preview {
  padding: 24px;
  text-align: center;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.doc-preview .el-icon {
  color: #1890ff;
  margin-bottom: 8px;
}

.doc-name {
  font-size: 12px;
  color: #666;
  word-break: break-all;
  line-height: 1.4;
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
  padding: 8px;
  background: #fafafa;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 关联信息样式 */
.related-info {
  margin-top: 16px;
}

.related-info h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #1d2129;
  font-weight: 600;
}

/* 审核操作样式 */
.review-actions {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}

.review-actions h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #1d2129;
  font-weight: 600;
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

/* 加载状态 */
.loading-container {
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-left {
    margin-bottom: 16px;
  }

  .filter-bar {
    flex-direction: column;
  }

  .search-input,
  .status-filter,
  .category-filter,
  .date-filter {
    width: 100%;
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
