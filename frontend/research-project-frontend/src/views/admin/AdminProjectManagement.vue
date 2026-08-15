<template>
  <div class="admin-project-page">
    <header class="page-head">
      <div>
        <h1>项目管理</h1>
        <p>查看全部项目，勾选后批量导出 Word 文档。</p>
      </div>
      <div class="head-actions">
        <el-button :icon="Refresh" :loading="loading" @click="loadProjects">刷新</el-button>
        <el-button
          color="#b31b1b"
          :dark="true"
          :icon="Download"
          :loading="exporting"
          :disabled="selectedIds.length === 0"
          @click="handleExportWord"
        >
          导出选中
        </el-button>
      </div>
    </header>

    <section class="summary-strip" aria-label="项目汇总">
      <div class="summary-item">
        <span>项目总数</span>
        <strong>{{ projects.length }}</strong>
      </div>
      <div class="summary-item">
        <span>已选择</span>
        <strong>{{ selectedIds.length }}</strong>
      </div>
      <div class="summary-item">
        <span>评审中</span>
        <strong>{{ reviewingCount }}</strong>
      </div>
      <div class="summary-item">
        <span>已批准</span>
        <strong>{{ approvedCount }}</strong>
      </div>
    </section>

    <section class="list-shell">
      <div class="toolbar">
        <el-input
          v-model="keyword"
          clearable
          :prefix-icon="Search"
          placeholder="搜索项目名称、编号、申请人、项目经理"
          class="search-input"
          @keyup.enter="loadProjects"
          @clear="loadProjects"
        />
        <el-select v-model="status" class="status-select" @change="loadProjects">
          <el-option label="全部状态" value="all" />
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-button :icon="Check" @click="toggleSelectAll">{{ isAllSelected ? '清空选择' : '全选当前页' }}</el-button>
      </div>

      <div class="table-wrap" v-loading="loading">
        <table class="project-table">
          <thead>
            <tr>
              <th class="select-col">
                <el-checkbox :model-value="isAllSelected" :indeterminate="isIndeterminate" @change="toggleSelectAll" />
              </th>
              <th>项目</th>
              <th>申请人</th>
              <th>项目经理</th>
              <th>预算</th>
              <th>评审</th>
              <th>平均分</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="project in projects"
              :key="project.id"
              :class="{ selected: selectedIds.includes(project.id) }"
              @click="toggleProject(project.id)"
            >
              <td class="select-col" @click.stop>
                <el-checkbox :model-value="selectedIds.includes(project.id)" @change="toggleProject(project.id)" />
              </td>
              <td class="project-cell">
                <div class="project-title">{{ project.title || '未命名项目' }}</div>
                <div class="project-code">{{ project.project_code || '未编号' }}</div>
              </td>
              <td>{{ project.applicant_name || '未填写' }}</td>
              <td>{{ project.manager_name || '未分配' }}</td>
              <td class="number-cell">¥ {{ formatAmount(project.budget_total) }}</td>
              <td class="number-cell">{{ project.review_count || 0 }} 人</td>
              <td class="number-cell">
                {{ project.avg_review_score != null ? Number(project.avg_review_score).toFixed(1) : '暂无' }}
              </td>
              <td>
                <el-tag :type="getStatusTag(project.status)" effect="light" round>
                  {{ getStatusText(project.status) }}
                </el-tag>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="projects.length === 0 && !loading" class="empty-state">暂无项目</div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Check, Download, Refresh, Search } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { adminExportWordZip } from '@/utils/exportDownload'

type ProjectRow = {
  id: string
  project_code?: string
  title?: string
  status?: string
  applicant_name?: string
  manager_name?: string
  budget_total?: number
  review_count?: number
  avg_review_score?: number | null
}

type ApiResponse<T> = {
  success?: boolean
  data?: T
  error?: string
  message?: string
}

const loading = ref(false)
const exporting = ref(false)
const keyword = ref('')
const status = ref('all')
const projects = ref<ProjectRow[]>([])
const selectedIds = ref<string[]>([])

const statusOptions = [
  { value: 'draft', label: '草稿' },
  { value: 'submitted', label: '已提交' },
  { value: 'under_review', label: '专家评审中' },
  { value: 'approved', label: '已批准' },
  { value: 'incubating', label: '孵化中' },
  { value: 'rejected', label: '未通过' },
  { value: 'completed', label: '已完成' },
]

const isAllSelected = computed(() => {
  return projects.value.length > 0 && projects.value.every((project) => selectedIds.value.includes(project.id))
})

const isIndeterminate = computed(() => {
  return selectedIds.value.length > 0 && !isAllSelected.value
})

const reviewingCount = computed(() => {
  return projects.value.filter((project) => project.status === 'under_review').length
})

const approvedCount = computed(() => {
  return projects.value.filter((project) => ['approved', 'incubating', 'completed'].includes(project.status || '')).length
})

async function loadProjects() {
  loading.value = true
  try {
    const response = await request.get<ApiResponse<ProjectRow[]>>('/api/admin/projects', {
      params: {
        keyword: keyword.value.trim(),
        status: status.value,
      },
    })
    if (!response.success) {
      throw new Error(response.error || response.message || '加载项目失败')
    }
    projects.value = response.data || []
    const visibleIds = new Set(projects.value.map((project) => project.id))
    selectedIds.value = selectedIds.value.filter((id) => visibleIds.has(id))
  } catch (error: any) {
    ElMessage.error(error?.message || '加载项目失败')
  } finally {
    loading.value = false
  }
}

function toggleProject(projectId: string) {
  if (selectedIds.value.includes(projectId)) {
    selectedIds.value = selectedIds.value.filter((id) => id !== projectId)
  } else {
    selectedIds.value = [...selectedIds.value, projectId]
  }
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = projects.value.map((project) => project.id)
  }
}

async function handleExportWord() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请先勾选要导出的项目')
    return
  }
  exporting.value = true
  try {
    await adminExportWordZip(
      request,
      '/api/admin/projects/export-word',
      { ids: selectedIds.value.join(',') },
      `项目导出_${new Date().toISOString().slice(0, 10)}.zip`,
    )
    ElMessage.success('导出完成')
  } catch (e: any) {
    ElMessage.error(e?.message || '导出失败')
  } finally {
    exporting.value = false
  }
}

function formatAmount(amount?: number) {
  return Number(amount || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function getStatusText(value?: string) {
  const map: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    under_review: '专家评审中',
    approved: '已批准',
    incubating: '孵化中',
    rejected: '未通过',
    completed: '已完成',
  }
  return map[value || ''] || value || '未知'
}

function getStatusTag(value?: string) {
  const map: Record<string, 'success' | 'warning' | 'info' | 'danger'> = {
    draft: 'info',
    submitted: 'warning',
    under_review: 'warning',
    approved: 'success',
    incubating: 'success',
    rejected: 'danger',
    completed: 'success',
  }
  return map[value || ''] || 'info'
}

onMounted(() => {
  loadProjects()
})
</script>

<style scoped>
.admin-project-page {
  min-height: 100%;
  padding: 24px 28px;
  background: #f6f7f9;
  color: #303133;
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}

.page-head h1 {
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 650;
  line-height: 1.25;
}

.page-head p {
  margin: 0;
  color: #69717d;
  font-size: 14px;
  line-height: 1.6;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr));
  gap: 1px;
  margin-bottom: 14px;
  overflow: hidden;
  border: 1px solid #e3e6eb;
  border-radius: 6px;
  background: #e3e6eb;
}

.summary-item {
  padding: 12px 14px;
  background: #fff;
}

.summary-item span {
  display: block;
  margin-bottom: 4px;
  color: #7c8490;
  font-size: 12px;
}

.summary-item strong {
  color: #2f343b;
  font-size: 20px;
  font-weight: 650;
}

.list-shell {
  border: 1px solid #e3e6eb;
  border-radius: 6px;
  background: #fff;
  overflow: hidden;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-bottom: 1px solid #eceff3;
  background: #fff;
}

.search-input {
  width: min(420px, 42vw);
}

.status-select {
  width: 170px;
}

.table-wrap {
  min-height: 220px;
  overflow-x: auto;
}

.project-table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
  table-layout: fixed;
}

.project-table th {
  padding: 11px 12px;
  color: #69717d;
  background: #fafbfc;
  border-bottom: 1px solid #eceff3;
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
}

.project-table td {
  padding: 13px 12px;
  border-bottom: 1px solid #f0f2f5;
  color: #3f4650;
  font-size: 13px;
  vertical-align: middle;
}

.project-table tbody tr {
  cursor: pointer;
}

.project-table tbody tr:hover {
  background: #fff8f8;
}

.project-table tbody tr.selected {
  background: #fff4f4;
}

.select-col {
  width: 48px;
  text-align: center !important;
}

.project-cell {
  width: 34%;
}

.project-title {
  overflow: hidden;
  color: #252b33;
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-code {
  margin-top: 4px;
  color: #9a3b3b;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}

.number-cell {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.empty-state {
  padding: 44px 20px;
  color: #9098a3;
  text-align: center;
}

@media (max-width: 768px) {
  .admin-project-page {
    padding: 18px 16px;
  }

  .page-head,
  .head-actions,
  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .summary-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .search-input,
  .status-select {
    width: 100%;
  }
}
</style>
