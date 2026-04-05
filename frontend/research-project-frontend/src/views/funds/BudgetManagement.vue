<template>
  <div class="budget-management">
    <div class="page-header">
      <h1>预算管理</h1>
      <div class="header-actions">
        <el-button @click="handlePrint" :loading="printing">
          <el-icon><Printer /></el-icon>
          打印报告
        </el-button>
        <el-button type="primary" :icon="Plus" @click="goToCreate" :loading="loading.create"
          >创建预算</el-button
        >
        <el-button :icon="Refresh" @click="refreshData" :loading="loading.refresh">刷新</el-button>
        <el-button :icon="Download" @click="exportData" :loading="loading.export">导出</el-button>
        <el-button :icon="Setting" @click="openSettings" :loading="loading.settings"
          >预算设置</el-button
        >
      </div>
    </div>

    <div id="print-content" class="print-content">
      <div class="print-header">
        <h1>预算管理报告</h1>
        <p>生成时间：{{ new Date().toLocaleString('zh-CN') }}</p>
      </div>

      <div class="budget-stats">
        <el-row :gutter="16">
          <el-col :span="6"
            ><div class="stat-card">
              <div class="stat-icon" style="background: rgba(179,27,27,0.06); color: #b31b1b">💰</div>
              <div class="stat-content">
                <div class="stat-value">¥{{ formatAmount(stats.totalBudget) }}</div>
                <div class="stat-label">总预算</div>
              </div>
            </div></el-col
          >
          <el-col :span="6"
            ><div class="stat-card">
              <div class="stat-icon" style="background: #f6ffed; color: #52c41a">📊</div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.categoryCount }}</div>
                <div class="stat-label">预算科目</div>
              </div>
            </div></el-col
          >
          <el-col :span="6"
            ><div class="stat-card">
              <div class="stat-icon" style="background: #fff7e6; color: #fa8c16">⚠️</div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.warningCount }}</div>
                <div class="stat-label">预警科目</div>
              </div>
            </div></el-col
          >
          <el-col :span="6"
            ><div class="stat-card">
              <div class="stat-icon" style="background: #fff2f0; color: #ff4d4f">🚨</div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.overrunCount }}</div>
                <div class="stat-label">超支科目</div>
              </div>
            </div></el-col
          >
        </el-row>
      </div>

      <div class="execution-progress">
        <h3>项目预算执行进度</h3>
        <div class="progress-chart">
          <div v-for="item in executionProgress" :key="item.projectId" class="progress-item">
            <div class="project-info">
              <div class="project-name">{{ item.project }}</div>
              <div class="project-code">{{ item.projectCode }}</div>
            </div>
            <div class="progress-bar">
              <el-progress
                :percentage="item.percentage"
                :status="getProgressStatus(item.percentage)"
                :stroke-width="10"
                :show-text="false"
              />
              <div class="progress-labels">
                <span>预算: ¥{{ formatAmount(item.budget) }}</span
                ><span>已用: ¥{{ formatAmount(item.used) }}</span
                ><span>余额: ¥{{ formatAmount(item.remaining) }}</span>
              </div>
            </div>
            <div class="project-status">
              <el-tag :type="getExecutionStatusType(item.percentage)">{{
                getExecutionStatusText(item.percentage)
              }}</el-tag>
            </div>
          </div>
        </div>
      </div>

      <div class="filter-section no-print">
        <el-row :gutter="16"
          ><el-col :span="6"
            ><el-input
              v-model="filters.search"
              placeholder="搜索预算科目/项目名称"
              clearable
              @clear="handleSearch" /></el-col
          ><el-col :span="6"
            ><el-select
              v-model="filters.projectId"
              placeholder="选择项目"
              clearable
              @change="handleSearch"
              ><el-option
                v-for="p in availableProjects"
                :key="p.id"
                :label="p.title"
                :value="p.id" /></el-select></el-col
          ><el-col :span="6"
            ><el-select
              v-model="filters.category"
              placeholder="预算类别"
              clearable
              @change="handleSearch"
              ><el-option
                v-for="c in budgetCategories"
                :key="c"
                :label="c"
                :value="c" /></el-select></el-col
          ><el-col :span="6"
            ><el-button type="primary" @click="handleSearch">搜索</el-button
            ><el-button @click="resetFilters">重置</el-button></el-col
          ></el-row
        >
      </div>

      <div class="budget-table">
        <el-table
          :data="budgets"
          v-loading="loading.table"
          @selection-change="handleSelectionChange"
          ><el-table-column type="selection" width="55" /><el-table-column
            prop="project_title"
            label="项目名称"
            width="180"
          /><el-table-column prop="category" label="预算类别" width="120"
            ><template #default="{ row }"
              ><el-tag :type="getCategoryType(row.category)" size="small">{{
                row.category
              }}</el-tag></template
            ></el-table-column
          ><el-table-column prop="item_name" label="预算事项" width="200" /><el-table-column
            prop="description"
            label="说明"
            width="200"
            show-overflow-tooltip
          /><el-table-column prop="amount" label="预算金额" width="120"
            ><template #default="{ row }"
              >¥{{ formatAmount(row.amount) }}</template
            ></el-table-column
          ><el-table-column prop="usage_rate" label="使用率" width="100"
            ><template #default="{ row }"
              ><el-progress
                :percentage="row.usage_rate"
                :status="getProgressStatus(row.usage_rate)"
                :stroke-width="6"
                :show-text="false"
              /><span>{{ row.usage_rate }}%</span></template
            ></el-table-column
          ><el-table-column label="操作" width="150" fixed="right"
            ><template #default="{ row }"
              ><el-button size="small" type="text" @click="viewBudget(row)">查看</el-button
              ><el-button size="small" type="text" @click="editBudget(row)"
                >编辑</el-button
              ></template
            ></el-table-column
          ></el-table
        >
      </div>

      <div class="pagination-section no-print" v-if="pagination.total > 0">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Refresh, Download, Setting, Printer } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const router = useRouter()
const API_BASE_URL = 'http://localhost:3002/api'
const api = axios.create({ baseURL: API_BASE_URL, timeout: 10000 })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
api.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error),
)

const loading = reactive({
  table: false,
  refresh: false,
  create: false,
  export: false,
  settings: false,
})
const printing = ref(false)
const stats = reactive({ totalBudget: 0, categoryCount: 0, warningCount: 0, overrunCount: 0 })
const executionProgress = ref([])
const budgets = ref([])
const availableProjects = ref([])
const budgetCategories = [
  '设备费',
  '材料费',
  '测试费',
  '差旅费',
  '会议费',
  '劳务费',
  '专家咨询费',
  '出版费',
  '管理费',
  '其他',
]
const filters = reactive({ search: '', projectId: '', category: '' })
const pagination = reactive({ current: 1, size: 10, total: 0 })
const selectedRows = ref([])

const formatAmount = (amount: number) =>
  amount?.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'
const getProgressStatus = (p: number) => (p >= 95 ? 'exception' : p >= 80 ? 'warning' : 'success')
const getExecutionStatusType = (p: number) =>
  p >= 95 ? 'danger' : p >= 80 ? 'warning' : p === 0 ? 'info' : 'success'
const getExecutionStatusText = (p: number) =>
  p >= 95 ? '超支' : p >= 80 ? '预警' : p === 0 ? '未使用' : '正常'
const getCategoryType = (c: string) =>
  ({ 设备费: 'primary', 材料费: 'success', 差旅费: 'warning', 会议费: 'danger', 劳务费: 'info' })[
    c
  ] || ''

const fetchStats = async () => {
  try {
    const res = await api.get('/budget/execution')
    if (res.success && res.data) {
      stats.totalBudget = res.data.reduce((s, i) => s + (i.budget || 0), 0)
      stats.categoryCount = res.data.length
      stats.warningCount = res.data.filter(
        (i) => (i.percentage || 0) >= 70 && (i.percentage || 0) < 95,
      ).length
      stats.overrunCount = res.data.filter((i) => (i.percentage || 0) >= 95).length
    }
  } catch (error) {
    console.error(error)
  }
}

const fetchExecutionProgress = async () => {
  try {
    const res = await api.get('/budget/execution')
    if (res.success && res.data) {
      executionProgress.value = res.data.map((i) => ({
        project: i.title,
        projectCode: i.project_code,
        projectId: i.id,
        budget: i.budget,
        used: i.used,
        remaining: i.balance,
        percentage: i.percentage,
      }))
    }
  } catch (error) {
    console.error(error)
  }
}

const fetchProjects = async () => {
  try {
    const res = await api.get('/projects')
    if (res.success && res.data) availableProjects.value = res.data
  } catch (error) {
    console.error(error)
  }
}

const fetchBudgets = async () => {
  loading.table = true
  try {
    const params = new URLSearchParams({ page: pagination.current, limit: pagination.size })
    if (filters.search) params.append('search', filters.search)
    if (filters.projectId) params.append('project_id', filters.projectId)
    if (filters.category) params.append('category', filters.category)
    const res = await api.get(`/budgets?${params}`)
    if (res.success && res.data) {
      budgets.value = (res.data || []).map((i) => ({
        ...i,
        usage_rate: i.amount > 0 ? Math.round(((i.used_amount || 0) / i.amount) * 100) : 0,
        project_title: i.project_title || '未知项目',
      }))
      pagination.total = res.total || 0
    }
  } catch (error) {
    ElMessage.error('获取预算列表失败')
  } finally {
    loading.table = false
  }
}

const refreshData = async () => {
  loading.refresh = true
  try {
    await Promise.all([fetchStats(), fetchExecutionProgress(), fetchProjects(), fetchBudgets()])
    ElMessage.success('数据刷新成功')
  } catch (error) {
    ElMessage.error('刷新失败')
  } finally {
    loading.refresh = false
  }
}

const handlePrint = () => {
  printing.value = true
  setTimeout(() => {
    const content = document.getElementById('print-content')
    if (!content) {
      ElMessage.error('无法获取打印内容')
      printing.value = false
      return
    }
    const win = window.open('', '_blank')
    if (!win) {
      ElMessage.error('无法打开打印窗口')
      printing.value = false
      return
    }
    const styles = document.querySelectorAll('style')
    let stylesHtml = ''
    styles.forEach((s) => (stylesHtml += s.outerHTML))
    win.document.write(
      `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>预算管理报告</title>${stylesHtml}<style>@media print{.no-print,.el-button,.header-actions,.filter-section,.pagination-section{display:none!important}.print-header{display:block!important;text-align:center;margin-bottom:30px;padding-bottom:20px;border-bottom:2px solid #b31b1b}.stats-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}.stat-card{break-inside:avoid}.budget-table{break-inside:avoid}} .print-header{display:none}</style></head><body>${content.outerHTML}</body></html>`,
    )
    win.document.close()
    win.onload = () => {
      win.print()
      win.onafterprint = () => win.close()
    }
    printing.value = false
  }, 100)
}

const goToCreate = () => router.push('/funds/budget/create')
const exportData = () => {
  ElMessage.info('导出功能开发中')
}
const openSettings = () => {
  ElMessage.info('设置功能开发中')
}
const handleSearch = () => {
  pagination.current = 1
  fetchBudgets()
}
const resetFilters = () => {
  filters.search = ''
  filters.projectId = ''
  filters.category = ''
  pagination.current = 1
  fetchBudgets()
}
const viewBudget = (row) => {
  ElMessage.info(`查看预算: ${row.item_name}`)
}
const editBudget = (row) => {
  router.push(`/funds/budget/edit/${row.id}`)
}
const handleSelectionChange = (selection) => {
  selectedRows.value = selection
}
const handleSizeChange = (val) => {
  pagination.size = val
  pagination.current = 1
  fetchBudgets()
}
const handleCurrentChange = (val) => {
  pagination.current = val
  fetchBudgets()
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.budget-management {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.page-header h1 {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
}
.header-actions {
  display: flex;
  gap: 12px;
}
.budget-stats {
  margin-bottom: 24px;
}
.stat-card {
  display: flex;
  align-items: center;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-right: 16px;
}
.stat-content {
  flex: 1;
}
.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 4px;
}
.stat-label {
  font-size: 14px;
  color: #7f8c8d;
}
.execution-progress {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
}
.execution-progress h3 {
  margin-top: 0;
  margin-bottom: 16px;
}
.progress-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  margin-bottom: 16px;
}
.progress-item:last-child {
  margin-bottom: 0;
}
.project-info {
  min-width: 200px;
}
.project-name {
  font-weight: 500;
  margin-bottom: 4px;
}
.project-code {
  font-size: 12px;
  color: #7f8c8d;
}
.progress-bar {
  flex: 1;
  margin: 0 24px;
}
.progress-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: #7f8c8d;
}
.project-status {
  min-width: 80px;
  text-align: center;
}
.filter-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}
.budget-table {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}
.pagination-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  justify-content: center;
}
@media (max-width: 992px) {
  .progress-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .progress-bar {
    margin: 12px 0;
    width: 100%;
  }
}
</style>
