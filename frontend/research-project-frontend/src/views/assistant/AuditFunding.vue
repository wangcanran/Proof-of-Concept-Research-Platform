<!-- src/views/assistant/AuditFunding.vue -->
<template>
  <div class="audit-funding-page assistant-ruc-theme">
    <!-- 页面标题和操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">经费审核管理</h1>
        <div class="breadcrumb">
          <span>工作台</span>
          <span class="separator">/</span>
          <span class="current">经费审核</span>
        </div>
      </div>
      <div class="header-right">
        <div class="filter-bar">
          <el-input
            v-model="searchQuery"
            placeholder="搜索项目编号、申请人、标题..."
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
            <el-option label="已拨款" value="paid" />
          </el-select>

          <el-select
            v-model="filterDateRange"
            placeholder="申请时间"
            clearable
            class="date-filter"
            @change="handleFilter"
          >
            <el-option label="今天" value="today" />
            <el-option label="本周" value="week" />
            <el-option label="本月" value="month" />
            <el-option label="自定义" value="custom" />
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
            <span class="table-title">经费申请列表</span>
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
          :data="fundingList"
          @selection-change="handleSelectionChange"
          style="width: 100%"
          :header-cell-style="{ background: '#f5f7fa', color: '#333' }"
        >
          <el-table-column type="selection" width="55" align="center" />

          <el-table-column prop="application_no" label="申请编号" width="160">
            <template #default="{ row }">
              <span class="application-no">{{ row.application_no }}</span>
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

          <el-table-column prop="applicant_info.name" label="申请人" width="120">
            <template #default="{ row }">
              <div class="applicant-cell">
                <div class="applicant-avatar">{{ row.applicant_info?.name?.charAt(0) }}</div>
                <div class="applicant-details">
                  <div class="applicant-name">{{ row.applicant_info?.name }}</div>
                  <div class="applicant-department">{{ row.applicant_info?.department }}</div>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="apply_amount" label="申请金额" width="120" align="right">
            <template #default="{ row }">
              <span class="amount">¥{{ formatCurrency(row.apply_amount) }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="apply_date" label="申请日期" width="120" sortable>
            <template #default="{ row }">
              {{ formatDate(row.apply_date) }}
            </template>
          </el-table-column>

          <el-table-column prop="status" label="状态" width="120" align="center">
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

                <el-button
                  v-if="row.status === 'approved'"
                  size="small"
                  type="warning"
                  plain
                  @click="handleMarkAsPaid(row)"
                >
                  <el-icon><Money /></el-icon>
                  标记已拨款
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
      :title="`经费申请详情 - ${currentDetail?.application_no || ''}`"
      width="800px"
      @closed="handleDialogClosed"
    >
      <div v-if="currentDetail" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申请编号">
            {{ currentDetail.application_no }}
          </el-descriptions-item>
          <el-descriptions-item label="申请状态">
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
          <el-descriptions-item label="申请金额">
            <span class="amount-large">¥{{ formatCurrency(currentDetail.apply_amount) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="申请日期">
            {{ formatDate(currentDetail.apply_date) }}
          </el-descriptions-item>
          <el-descriptions-item label="申请用途" :span="2">
            <div class="purpose-content">{{ currentDetail.purpose }}</div>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 支撑材料 -->
        <div v-if="currentDetail.supporting_docs?.length > 0" class="supporting-docs">
          <h4>支撑材料</h4>
          <div class="docs-list">
            <div
              v-for="(doc, index) in currentDetail.supporting_docs"
              :key="index"
              class="doc-item"
              @click="downloadFile(doc)"
            >
              <el-icon><Document /></el-icon>
              <span class="doc-name">{{ getFileName(doc) }}</span>
              <el-button type="text" size="small">下载</el-button>
            </div>
          </div>
        </div>

        <!-- 审核信息 -->
        <div
          v-if="currentDetail.status !== 'draft' && currentDetail.status !== 'submitted'"
          class="review-info"
        >
          <h4>审核信息</h4>
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
                <el-radio label="approve_with_revision">有条件批准</el-radio>
                <el-radio label="reject">拒绝</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="审核意见">
              <el-input
                v-model="reviewForm.comment"
                type="textarea"
                :rows="4"
                placeholder="请输入审核意见"
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

    <!-- 拨款对话框 -->
    <el-dialog v-model="paymentDialogVisible" title="标记已拨款" width="500px">
      <div v-if="currentDetail">
        <p>
          请确认已将经费拨付给项目 <strong>{{ currentDetail.project_info?.title }}</strong>
        </p>
        <p>申请编号: {{ currentDetail.application_no }}</p>
        <p>申请金额: ¥{{ formatCurrency(currentDetail.apply_amount) }}</p>

        <el-form :model="paymentForm" label-width="100px" style="margin-top: 20px">
          <el-form-item label="拨款日期">
            <el-date-picker
              v-model="paymentForm.payment_date"
              type="date"
              placeholder="选择拨款日期"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
          <el-form-item label="拨款凭证">
            <el-input v-model="paymentForm.payment_voucher" placeholder="请输入凭证编号或说明" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="submitPayment" :loading="paymentLoading">
              确认拨款
            </el-button>
            <el-button @click="paymentDialogVisible = false">取消</el-button>
          </el-form-item>
        </el-form>
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
  Money,
  Document,
} from '@element-plus/icons-vue'
import request from '@/utils/request'

interface FundingApplication {
  id: string
  application_no: string
  project_id: string
  apply_amount: number
  purpose: string
  supporting_docs: string[]
  status: string
  apply_date: string
  reviewer_id?: string
  review_date?: string
  review_comment?: string
  payment_date?: string
  payment_voucher?: string
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
}

// 响应式数据
const loading = ref(true)
const tableLoading = ref(false)
const fundingList = ref<FundingApplication[]>([])
const selectedIds = ref<string[]>([])
const searchQuery = ref('')
const filterStatus = ref('all')
const filterDateRange = ref('')
const stats = ref({
  pending: 0,
  reviewing: 0,
  approved: 0,
  rejected: 0,
  paid: 0,
})

// 分页
const pagination = ref({
  current: 1,
  size: 10,
  total: 0,
})

// 详情对话框
const detailDialogVisible = ref(false)
const currentDetail = ref<FundingApplication | null>(null)
const reviewForm = ref({
  recommendation: 'approve',
  comment: '',
})
const reviewLoading = ref(false)

// 拨款对话框
const paymentDialogVisible = ref(false)
const paymentForm = ref({
  payment_date: new Date().toISOString().split('T')[0],
  payment_voucher: '',
})
const paymentLoading = ref(false)

// 计算属性
const selectedApplications = computed(() => {
  return fundingList.value.filter((item) => selectedIds.value.includes(item.id))
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
    paid: '已拨款',
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
    paid: '',
  }
  return typeMap[status] || 'info'
}

const getFileName = (filePath: string) => {
  return filePath.split('/').pop() || filePath
}

// 数据加载
const loadFundingData = async () => {
  tableLoading.value = true
  try {
    const response = await request.get('/api/assistant/funding/list', {
      params: {
        page: pagination.value.current,
        pageSize: pagination.value.size,
        search: searchQuery.value,
        status: filterStatus.value === 'all' ? '' : filterStatus.value,
        dateRange: filterDateRange.value,
      },
    })

    if (response.success) {
      fundingList.value = response.data.list || []
      pagination.value.total = response.data.total || 0
      stats.value = response.data.stats || stats.value
    } else {
      ElMessage.error(response.error || '加载数据失败')
    }
  } catch (error) {
    console.error('加载经费数据失败:', error)
    ElMessage.error('网络错误，加载数据失败')
  } finally {
    tableLoading.value = false
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const response = await request.get('/api/assistant/funding/stats')
    if (response.success) {
      stats.value = response.data
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

// 事件处理
const handleSearch = () => {
  pagination.value.current = 1
  loadFundingData()
}

const handleFilter = () => {
  pagination.value.current = 1
  loadFundingData()
}

const handleReset = () => {
  searchQuery.value = ''
  filterStatus.value = 'all'
  filterDateRange.value = ''
  pagination.value.current = 1
  loadFundingData()
}

const handleSelectionChange = (selection: FundingApplication[]) => {
  selectedIds.value = selection.map((item) => item.id)
}

const handleSizeChange = (size: number) => {
  pagination.value.size = size
  pagination.value.current = 1
  loadFundingData()
}

const handleCurrentChange = (page: number) => {
  pagination.value.current = page
  loadFundingData()
}

const viewDetail = async (row: FundingApplication) => {
  try {
    const response = await request.get(`/api/assistant/funding/${row.id}`)
    if (response.success) {
      currentDetail.value = response.data
      detailDialogVisible.value = true
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

const handleApprove = (row: FundingApplication) => {
  currentDetail.value = row
  reviewForm.value = {
    recommendation: 'approve',
    comment: '',
  }
  detailDialogVisible.value = true
}

const handleReject = (row: FundingApplication) => {
  currentDetail.value = row
  reviewForm.value = {
    recommendation: 'reject',
    comment: '',
  }
  detailDialogVisible.value = true
}

const handleMarkAsPaid = (row: FundingApplication) => {
  currentDetail.value = row
  paymentForm.value = {
    payment_date: new Date().toISOString().split('T')[0],
    payment_voucher: '',
  }
  paymentDialogVisible.value = true
}

const handleDialogClosed = () => {
  currentDetail.value = null
  reviewForm.value = {
    recommendation: 'approve',
    comment: '',
  }
}

const downloadFile = (filePath: string) => {
  // 这里应该实现文件下载逻辑
  const fileName = getFileName(filePath)
  const downloadUrl = `/api/files/download?path=${encodeURIComponent(filePath)}`

  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
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
    const response = await request.post(`/api/assistant/funding/${currentDetail.value.id}/review`, {
      recommendation: reviewForm.value.recommendation,
      comment: reviewForm.value.comment,
    })

    if (response.success) {
      ElMessage.success('审核提交成功')
      detailDialogVisible.value = false
      loadFundingData()
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

// 确认拨款
const submitPayment = async () => {
  if (!currentDetail.value) return

  if (!paymentForm.value.payment_date) {
    ElMessage.warning('请选择拨款日期')
    return
  }

  paymentLoading.value = true
  try {
    const response = await request.post(
      `/api/assistant/funding/${currentDetail.value.id}/payment`,
      {
        payment_date: paymentForm.value.payment_date,
        payment_voucher: paymentForm.value.payment_voucher,
      },
    )

    if (response.success) {
      ElMessage.success('标记拨款成功')
      paymentDialogVisible.value = false
      loadFundingData()
      loadStats()
    } else {
      ElMessage.error(response.error || '标记拨款失败')
    }
  } catch (error) {
    console.error('标记拨款失败:', error)
    ElMessage.error('标记拨款失败')
  } finally {
    paymentLoading.value = false
  }
}

// 批量操作
const batchApprove = async () => {
  if (selectedIds.value.length === 0) return

  try {
    await ElMessageBox.confirm(
      `确定要批量批准选中的 ${selectedIds.value.length} 个经费申请吗？`,
      '批量批准',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    const response = await request.post('/api/assistant/funding/batch-approve', {
      ids: selectedIds.value,
      comment: '批量批准',
    })

    if (response.success) {
      ElMessage.success('批量批准成功')
      selectedIds.value = []
      loadFundingData()
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
    await ElMessageBox.prompt('请输入拒绝原因', '批量拒绝', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputPlaceholder: '请输入拒绝原因',
    }).then(async ({ value }) => {
      const response = await request.post('/api/assistant/funding/batch-reject', {
        ids: selectedIds.value,
        comment: value,
      })

      if (response.success) {
        ElMessage.success('批量拒绝成功')
        selectedIds.value = []
        loadFundingData()
        loadStats()
      }
    })
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量拒绝失败')
    }
  }
}

// 导出Excel
const exportToExcel = async () => {
  try {
    const response = await request.get('/api/assistant/funding/export', {
      responseType: 'blob',
      params: {
        search: searchQuery.value,
        status: filterStatus.value === 'all' ? '' : filterStatus.value,
        dateRange: filterDateRange.value,
      },
    })

    const blob = new Blob([response], { type: 'application/vnd.ms-excel' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `经费审核记录_${new Date().toISOString().split('T')[0]}.xlsx`
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
  loadFundingData()
  loadStats()
})
</script>

<style scoped>
.audit-funding-page {
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
  color: #165dff;
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
  width: 280px;
}

.status-filter,
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
  background: linear-gradient(135deg, #c44747 0%, #b31b1b 100%);
}

.stat-card.reviewing {
  background: linear-gradient(135deg, #b31b1b 0%, #8b1515 100%);
}

.stat-card.approved {
  background: linear-gradient(135deg, #c44747 0%, #b31b1b 100%);
}

.stat-card.rejected {
  background: linear-gradient(135deg, #ff4d4f 0%, #d9363e 100%);
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
}

.stat-icon .icon {
  font-size: 48px;
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
.application-no {
  font-family: monospace;
  font-weight: 600;
  color: #b31b1b;
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

.applicant-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.applicant-avatar {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #b31b1b 0%, #8b1515 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
}

.applicant-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.applicant-name {
  font-weight: 500;
  color: #1d2129;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.applicant-department {
  font-size: 12px;
  color: #86909c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.amount {
  font-weight: 600;
  color: #b31b1b;
  font-size: 14px;
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
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 8px;
}

.amount-large {
  font-size: 18px;
  font-weight: 700;
  color: #b31b1b;
}

.purpose-content {
  padding: 8px;
  background: #fafafa;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
}

.supporting-docs,
.review-info,
.review-actions {
  margin-top: 24px;
}

.supporting-docs h4,
.review-info h4,
.review-actions h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #1d2129;
  font-weight: 600;
}

.docs-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.doc-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.doc-item:hover {
  background: #e8e8e8;
}

.doc-item .el-icon {
  margin-right: 8px;
  color: #b31b1b;
}

.doc-name {
  flex: 1;
  font-size: 14px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-comment {
  padding: 8px;
  background: #fafafa;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
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
}
</style>
