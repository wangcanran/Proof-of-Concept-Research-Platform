<template>
  <div class="expenditure-management">
    <div class="page-header">
      <h1>预算支出管理</h1>
      <div class="header-actions">
        <el-button @click="handlePrint" :loading="printing">
          <el-icon><Printer /></el-icon>
          打印报告
        </el-button>
        <el-button type="primary" :icon="Plus" @click="goToCreateBudget" :loading="loading.apply"
          >新增预算</el-button
        >
        <el-button :icon="Refresh" @click="refreshData" :loading="loading.refresh">刷新</el-button>
        <el-button :icon="Download" @click="exportData" :loading="loading.export">导出</el-button>
      </div>
    </div>

    <div id="print-content" class="print-content">
      <div class="print-header">
        <h1>预算支出报告</h1>
        <p>生成时间：{{ new Date().toLocaleString('zh-CN') }}</p>
      </div>

      <div class="expenditure-stats">
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
                <div class="stat-value">¥{{ formatAmount(stats.usedAmount) }}</div>
                <div class="stat-label">已使用</div>
                <div class="stat-percent">{{ stats.usedPercent }}%</div>
              </div>
            </div></el-col
          >
          <el-col :span="6"
            ><div class="stat-card">
              <div class="stat-icon" style="background: #fff2f0; color: #ff4d4f">✅</div>
              <div class="stat-content">
                <div class="stat-value">¥{{ formatAmount(stats.remainingAmount) }}</div>
                <div class="stat-label">可用余额</div>
              </div>
            </div></el-col
          >
          <el-col :span="6"
            ><div class="stat-card">
              <div class="stat-icon" style="background: #fff7e6; color: #fa8c16">📋</div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.budgetCount }}</div>
                <div class="stat-label">预算项目</div>
              </div>
            </div></el-col
          >
        </el-row>
      </div>

      <div class="category-stats" v-if="categoryStats.length > 0">
        <h3>预算分类统计</h3>
        <el-row :gutter="16">
          <el-col :span="8" v-for="c in categoryStats.slice(0, 6)" :key="c.category">
            <div class="category-item">
              <div class="category-label">
                <span
                  class="category-color"
                  :style="{ backgroundColor: getCategoryColor(c.category) }"
                ></span
                >{{ c.category }}
              </div>
              <div class="category-amount">¥{{ formatAmount(c.total_budget) }}</div>
              <div class="category-percent">{{ c.percentage }}%</div>
            </div>
          </el-col>
        </el-row>
      </div>

      <div class="filter-section no-print">
        <el-row :gutter="16"
          ><el-col :span="6"
            ><el-input
              v-model="filters.search"
              placeholder="搜索预算事项"
              clearable
              @clear="handleSearch" /></el-col
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
            ><el-button type="primary" @click="handleSearch">搜索</el-button
            ><el-button @click="resetFilters">重置</el-button></el-col
          ></el-row
        >
      </div>

      <div class="expenditure-table">
        <el-table
          :data="budgetItems"
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
          ><el-table-column label="操作" width="100" fixed="right"
            ><template #default="{ row }"
              ><el-button size="small" type="text" @click="viewBudget(row)"
                >查看</el-button
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
import { getApiBaseUrl } from '@/utils/request'
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Refresh, Download, Printer } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()
const API_BASE_URL = getApiBaseUrl()
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

const loading = reactive({ table: false, refresh: false, apply: false, export: false })
const printing = ref(false)
const stats = reactive({
  totalBudget: 0,
  usedAmount: 0,
  remainingAmount: 0,
  usedPercent: 0,
  budgetCount: 0,
})
const categoryStats = ref([])
const budgetItems = ref([])
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
const filters = reactive({ search: '', category: '', projectId: '' })
const pagination = reactive({ current: 1, size: 10, total: 0 })
const selectedRows = ref([])

const formatAmount = (amount: number) =>
  amount?.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'
const getProgressStatus = (p: number) => (p >= 95 ? 'exception' : p >= 80 ? 'warning' : 'success')
const getCategoryType = (c: string) =>
  ({ 设备费: 'primary', 材料费: 'success', 差旅费: 'warning', 会议费: 'danger', 劳务费: 'info' })[
    c
  ] || ''
const getCategoryColor = (c: string) =>
  ({
    设备费: '#b31b1b',
    材料费: '#52c41a',
    差旅费: '#fa8c16',
    会议费: '#f759ab',
    劳务费: '#722ed1',
    测试费: '#13c2c2',
    专家咨询费: '#eb2f96',
    出版费: '#fa541c',
    管理费: '#2f54eb',
    其他: '#8c8c8c',
  })[c] || '#8c8c8c'

const fetchStats = async () => {
  try {
    const res = await api.get('/expenditures/stats')
    if (res.success && res.data) {
      stats.totalBudget = res.data.total_budget || 0
      stats.usedAmount = res.data.approved_amount || 0
      stats.remainingAmount = stats.totalBudget - stats.usedAmount
      stats.usedPercent =
        stats.totalBudget > 0 ? Math.round((stats.usedAmount / stats.totalBudget) * 100) : 0
      stats.budgetCount = res.data.budget_count || 0
    }
  } catch (error) {
    console.error(error)
  }
}

const fetchCategoryStats = async () => {
  try {
    const res = await api.get('/expenditures/category-stats')
    if (res.success && res.data) {
      const total = res.data.reduce((s, i) => s + (i.total_amount || 0), 0)
      categoryStats.value = res.data.map((i) => ({
        category: i.category,
        total_budget: i.total_amount,
        percentage: total > 0 ? Math.round((i.total_amount / total) * 100) : 0,
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

const fetchBudgetItems = async () => {
  loading.table = true
  try {
    const params = new URLSearchParams({ page: pagination.current, limit: pagination.size })
    if (filters.search) params.append('search', filters.search)
    if (filters.category) params.append('category', filters.category)
    if (filters.projectId) params.append('project_id', filters.projectId)
    const res = await api.get(`/expenditures?${params}`)
    if (res.success && res.data) {
      budgetItems.value = (res.data || []).map((i) => ({
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
    await Promise.all([fetchStats(), fetchCategoryStats(), fetchProjects(), fetchBudgetItems()])
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
      `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>预算支出报告</title>${stylesHtml}<style>@media print{.no-print,.el-button,.header-actions,.filter-section,.pagination-section{display:none!important}.print-header{display:block!important;text-align:center;margin-bottom:30px;padding-bottom:20px;border-bottom:2px solid #b31b1b}.stats-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}.stat-card{break-inside:avoid}.expenditure-table{break-inside:avoid}} .print-header{display:none}</style></head><body>${content.outerHTML}</body></html>`,
    )
    win.document.close()
    win.onload = () => {
      win.print()
      win.onafterprint = () => win.close()
    }
    printing.value = false
  }, 100)
}

const goToCreateBudget = () => router.push('/funds/budget/create')
const exportData = () => {
  ElMessage.info('导出功能开发中')
}
const handleSearch = () => {
  pagination.current = 1
  fetchBudgetItems()
}
const resetFilters = () => {
  filters.search = ''
  filters.category = ''
  filters.projectId = ''
  pagination.current = 1
  fetchBudgetItems()
}
const viewBudget = (row) => {
  ElMessage.info(`查看预算: ${row.item_name}`)
}
const handleSelectionChange = (selection) => {
  selectedRows.value = selection
}
const handleSizeChange = (val) => {
  pagination.size = val
  pagination.current = 1
  fetchBudgetItems()
}
const handleCurrentChange = (val) => {
  pagination.current = val
  fetchBudgetItems()
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.expenditure-management {
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
.expenditure-stats {
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
.stat-percent {
  font-size: 12px;
  color: #b31b1b;
  margin-top: 4px;
}
.category-stats {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
}
.category-stats h3 {
  margin-top: 0;
  margin-bottom: 16px;
}
.category-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}
.category-item:last-child {
  border-bottom: none;
}
.category-label {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}
.category-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}
.category-amount {
  font-weight: 500;
  min-width: 100px;
  text-align: right;
  margin-right: 16px;
}
.category-percent {
  font-size: 12px;
  color: #7f8c8d;
  min-width: 40px;
}
.filter-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}
.expenditure-table {
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
@media (max-width: 768px) {
  .category-item {
    flex-wrap: wrap;
    gap: 8px;
  }
  .category-amount {
    margin-left: auto;
  }
}
</style>
