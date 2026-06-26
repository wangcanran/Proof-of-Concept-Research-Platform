<template>
  <div class="activity-review-page assistant-ruc-theme">
    <div class="page-header">
      <div class="header-left">
        <el-button class="back-btn" @click="goDashboard">
          <el-icon><ArrowLeft /></el-icon>
          返回工作台
        </el-button>
        <h1 class="page-title">活动审核</h1>
        <div class="page-description">审核项目申请人提交的路演、产业交流等活动登记</div>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-card pending">
        <div class="stat-num">{{ stats.pending }}</div>
        <div class="stat-label">待审批</div>
      </div>
      <div class="stat-card approved">
        <div class="stat-num">{{ stats.approved }}</div>
        <div class="stat-label">已通过</div>
      </div>
      <div class="stat-card rejected">
        <div class="stat-num">{{ stats.rejected }}</div>
        <div class="stat-label">已驳回</div>
      </div>
    </div>

    <div class="filter-toolbar">
      <el-input
        v-model="filters.keyword"
        placeholder="搜索活动标题、项目、提交人"
        class="search-input"
        clearable
        @keyup.enter="loadList"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="filters.status" placeholder="审批状态" clearable class="filter-select" @change="loadList">
        <el-option label="全部" value="" />
        <el-option label="待审批" value="submitted" />
        <el-option label="已通过" value="approved" />
        <el-option label="已驳回" value="rejected" />
      </el-select>
      <el-button type="primary" @click="loadList">搜索</el-button>
      <el-button @click="resetFilters">重置</el-button>
    </div>

    <div class="table-wrap">
      <el-table v-loading="loading" :data="list" stripe style="width: 100%">
        <el-table-column prop="title" label="活动标题" min-width="180" show-overflow-tooltip />
        <el-table-column prop="project_title" label="所属项目" min-width="160" show-overflow-tooltip />
        <el-table-column prop="project_code" label="项目编号" width="120" show-overflow-tooltip />
        <el-table-column prop="record_date" label="活动日期" width="110">
          <template #default="{ row }">{{ formatDate(row.record_date || row.created_at) }}</template>
        </el-table-column>
        <el-table-column prop="creator_name" label="提交人" width="100" />
        <el-table-column prop="created_at" label="提交时间" width="160">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDetail(row)">查看</el-button>
            <template v-if="row.status === 'submitted'">
              <el-button
                link
                type="success"
                size="small"
                :disabled="reviewingId === row.id"
                @click="review(row, 'approve')"
              >
                通过
              </el-button>
              <el-button
                link
                type="danger"
                size="small"
                :disabled="reviewingId === row.id"
                @click="review(row, 'reject')"
              >
                驳回
              </el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadList"
          @current-change="loadList"
        />
      </div>
    </div>

    <el-dialog v-model="detailVisible" title="活动详情" width="640px" destroy-on-close>
      <template v-if="currentRow">
        <div class="detail-block">
          <div class="detail-label">活动标题</div>
          <div class="detail-value">{{ currentRow.title }}</div>
        </div>
        <div class="detail-block">
          <div class="detail-label">所属项目</div>
          <div class="detail-value">{{ currentRow.project_title }}（{{ currentRow.project_code || '—' }}）</div>
        </div>
        <div class="detail-block">
          <div class="detail-label">活动日期</div>
          <div class="detail-value">{{ formatDate(currentRow.record_date || currentRow.created_at) }}</div>
        </div>
        <div class="detail-block">
          <div class="detail-label">活动说明</div>
          <div class="detail-value pre-wrap">{{ currentRow.description || '—' }}</div>
        </div>
        <div v-if="currentRow.files?.length" class="detail-block">
          <div class="detail-label">附件</div>
          <div class="file-list">
            <div v-for="file in currentRow.files" :key="file.id" class="file-row">
              <span>{{ file.file_name }}</span>
              <el-button link type="primary" size="small" @click="downloadFile(file)">下载</el-button>
            </div>
          </div>
        </div>
        <div v-if="currentRow.review_comment" class="detail-block">
          <div class="detail-label">审批意见</div>
          <div class="detail-value">{{ currentRow.review_comment }}</div>
        </div>
      </template>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <template v-if="currentRow?.status === 'submitted'">
          <el-button type="success" :loading="reviewingId === currentRow.id" @click="review(currentRow, 'approve')">
            通过
          </el-button>
          <el-button type="danger" :loading="reviewingId === currentRow.id" @click="review(currentRow, 'reject')">
            驳回
          </el-button>
        </template>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Search } from '@element-plus/icons-vue'
import request, { getApiBaseUrl } from '@/utils/request'

const router = useRouter()
const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const reviewingId = ref('')
const detailVisible = ref(false)
const currentRow = ref<any>(null)
const stats = ref({ pending: 0, approved: 0, rejected: 0 })
const filters = ref({ keyword: '', status: 'submitted' })

const STATUS_LABELS: Record<string, string> = {
  submitted: '待审批',
  approved: '已通过',
  rejected: '已驳回',
}

function statusLabel(s: string) {
  return STATUS_LABELS[s] || s
}

function statusType(s: string) {
  const m: Record<string, string> = { submitted: 'warning', approved: 'success', rejected: 'danger' }
  return m[s] || 'info'
}

function formatDate(d?: string) {
  if (!d) return '—'
  return String(d).slice(0, 10)
}

function formatDateTime(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleString('zh-CN')
}

async function loadList() {
  loading.value = true
  try {
    const res = await request.get('/api/assistant/incubation-achievements/list', {
      params: {
        keyword: filters.value.keyword || undefined,
        status: filters.value.status || undefined,
        page: page.value,
        page_size: pageSize.value,
      },
    })
    if (res.success) {
      list.value = res.data || []
      total.value = res.total || 0
      if (res.stats) stats.value = res.stats
    }
  } catch (e: any) {
    ElMessage.error(e.response?.data?.error || '加载失败')
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.value = { keyword: '', status: 'submitted' }
  page.value = 1
  loadList()
}

function openDetail(row: any) {
  currentRow.value = row
  detailVisible.value = true
}

async function downloadFile(file: { id: string; file_name: string }) {
  try {
    const token = localStorage.getItem('token')
    const response = await fetch(`${getApiBaseUrl()}/incubation-achievements/files/${file.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new Error('下载失败')
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = file.file_name || '附件'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch {
    ElMessage.error('下载失败')
  }
}

async function review(row: any, action: 'approve' | 'reject') {
  let comment = ''
  if (action === 'reject') {
    try {
      const { value } = await ElMessageBox.prompt('请填写驳回意见（可选）', '驳回活动', {
        confirmButtonText: '确认驳回',
        cancelButtonText: '取消',
        inputType: 'textarea',
      })
      comment = value || ''
    } catch {
      return
    }
  } else {
    try {
      await ElMessageBox.confirm(`确定通过活动「${row.title}」吗？`, '审批通过', {
        confirmButtonText: '通过',
        cancelButtonText: '取消',
        type: 'success',
      })
    } catch {
      return
    }
  }

  reviewingId.value = row.id
  try {
    const res = await request.post(`/api/assistant/incubation-achievements/${row.id}/review`, {
      action,
      comment,
    })
    if (res.success) {
      ElMessage.success(res.message || '操作成功')
      detailVisible.value = false
      await loadList()
    } else {
      ElMessage.error(res.error || '操作失败')
    }
  } catch (e: any) {
    ElMessage.error(e.response?.data?.error || '操作失败')
  } finally {
    reviewingId.value = ''
  }
}

function goDashboard() {
  router.push('/assistant/dashboard')
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.activity-review-page {
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

.stat-card.approved .stat-num {
  color: #059669;
}

.stat-card.rejected .stat-num {
  color: #dc2626;
}

.filter-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  padding: 16px;
  background: #fff;
  border-radius: 10px;
}

.search-input {
  width: 280px;
}

.filter-select {
  width: 140px;
}

.table-wrap {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.detail-block {
  margin-bottom: 14px;
}

.detail-label {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 4px;
}

.detail-value {
  font-size: 14px;
  color: #111827;
}

.pre-wrap {
  white-space: pre-wrap;
  line-height: 1.6;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.file-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 13px;
}
</style>
