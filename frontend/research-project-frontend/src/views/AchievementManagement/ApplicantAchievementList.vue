<template>
  <div class="section-card list-section">
    <div class="section-header">
      <h3 class="section-title">
        <span class="section-icon">📋</span>
        已登记成果
      </h3>
      <span class="section-hint">本人提交的记录及审核状态</span>
    </div>

    <div class="list-body">
      <div class="search-filter">
        <el-row :gutter="12">
          <el-col :span="8">
            <el-input
              v-model="searchQuery"
              placeholder="搜索成果名称"
              clearable
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            />
          </el-col>
          <el-col :span="6">
            <el-select
              v-model="filterStatus"
              placeholder="审核状态"
              clearable
              @change="handleFilter"
            >
              <el-option label="草稿" value="draft" />
              <el-option label="待审核" value="submitted" />
              <el-option label="已核实" value="verified" />
              <el-option label="已驳回" value="rejected" />
            </el-select>
          </el-col>
          <el-col :span="10">
            <div class="button-group">
              <el-button @click="handleReset" plain size="small">重置</el-button>
              <el-button type="primary" size="small" @click="handleSearch">搜索</el-button>
            </div>
          </el-col>
        </el-row>
      </div>

      <el-table
        :data="achievementList"
        v-loading="loading"
        border
        size="small"
        class="achievement-table"
        empty-text="暂无登记记录，请在下方填写表单提交"
      >
        <el-table-column prop="title" label="成果名称" min-width="180">
          <template #default="{ row }">
            <span class="type-badge">{{ getTypeLabel(row.type as string) }}</span>
            {{ row.title }}
          </template>
        </el-table-column>
        <el-table-column label="所属项目" width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ (row.project as { title?: string })?.title || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="产出日期" width="110">
          <template #default="{ row }">{{ formatDate(row.achievement_date as string) }}</template>
        </el-table-column>
        <el-table-column label="审核状态" width="90">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status as string)" size="small">
              {{ getStatusLabel(row.status as string) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审核意见" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{
              row.verification_comment ||
              (row.status === 'submitted' ? '等待审核' : '-')
            }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleViewDetail(row as { id: string })">
              查看
            </el-button>
            <el-button
              type="primary"
              link
              size="small"
              @click="handleEdit(row as { id: string })"
              :disabled="row.status !== 'draft' && row.status !== 'submitted'"
            >
              编辑
            </el-button>
            <el-button
              type="danger"
              link
              size="small"
              @click="handleDelete(row as { id: string; title: string })"
              :disabled="row.status !== 'draft'"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[5, 10, 20]"
          :total="totalAchievements"
          layout="total, prev, pager, next"
          small
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { achievementAPI } from '@/api/achievements'

const router = useRouter()

const searchQuery = ref('')
const filterStatus = ref('')
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(5)
const totalAchievements = ref(0)
const achievementList = ref<Record<string, unknown>[]>([])

const getTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    paper: '论文',
    patent: '专利',
    software: '软著',
    report: '报告',
    prototype: '样机',
    standard: '标准',
    other: '其他',
    award: '奖项',
  }
  return map[type] || type
}

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    draft: '草稿',
    submitted: '待审核',
    verified: '已核实',
    rejected: '已驳回',
  }
  return map[status] || status
}

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    draft: 'info',
    submitted: 'warning',
    verified: 'success',
    rejected: 'danger',
  }
  return map[status] || 'info'
}

const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleDateString('zh-CN')
  } catch {
    return dateString
  }
}

const fetchAchievementList = async () => {
  loading.value = true
  try {
    const response = await achievementAPI.getAchievements({
      page: currentPage.value,
      limit: pageSize.value,
      status: filterStatus.value || undefined,
      search: searchQuery.value || undefined,
    })
    if (response.success) {
      achievementList.value = response.data || []
      totalAchievements.value = response.total ?? achievementList.value.length
    } else {
      achievementList.value = []
    }
  } catch {
    achievementList.value = []
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  fetchAchievementList()
}

const handleFilter = () => {
  currentPage.value = 1
  fetchAchievementList()
}

const handleReset = () => {
  searchQuery.value = ''
  filterStatus.value = ''
  currentPage.value = 1
  fetchAchievementList()
}

const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1
  fetchAchievementList()
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
  fetchAchievementList()
}

const handleViewDetail = (row: { id: string }) => {
  router.push(`/achievements/${row.id}/detail`)
}

const handleEdit = (row: { id: string }) => {
  router.push(`/achievements/${row.id}/edit`)
}

const handleDelete = async (row: { id: string; title: string }) => {
  try {
    await ElMessageBox.confirm(`确定删除「${row.title}」？`, '删除确认', { type: 'warning' })
    const response = await achievementAPI.deleteAchievement(row.id)
    if (response.success) {
      ElMessage.success('已删除')
      fetchAchievementList()
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('删除失败')
  }
}

defineExpose({ refresh: fetchAchievementList })

onMounted(() => {
  fetchAchievementList()
})
</script>

<style scoped>
.section-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
  overflow: hidden;
}

.section-header {
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.section-title {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.section-hint {
  font-size: 13px;
  color: #999;
}

.list-body {
  padding: 16px 24px 20px;
}

.search-filter {
  margin-bottom: 16px;
}

.button-group {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.type-badge {
  display: inline-block;
  padding: 2px 8px;
  margin-right: 6px;
  border-radius: 4px;
  font-size: 11px;
  background: rgba(179, 27, 27, 0.06);
  color: #b31b1b;
}

.achievement-table {
  width: 100%;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.list-section :deep(.el-button--primary) {
  --el-button-bg-color: #b31b1b;
  --el-button-border-color: #b31b1b;
  --el-button-hover-bg-color: #8b1515;
  --el-button-hover-border-color: #8b1515;
}

.list-section :deep(.el-button--primary.is-plain) {
  --el-button-text-color: #b31b1b;
  --el-button-border-color: #b31b1b;
  --el-button-hover-text-color: #8b1515;
  --el-button-hover-border-color: #8b1515;
  --el-button-hover-bg-color: rgba(179, 27, 27, 0.06);
}

.list-section :deep(.el-button--primary.is-link) {
  --el-button-text-color: #b31b1b;
  --el-button-hover-text-color: #8b1515;
}

.list-section :deep(.el-input__wrapper:focus-within) {
  box-shadow: 0 0 0 1px #b31b1b inset;
}

.list-section :deep(.el-pagination.is-background .el-pager li.is-active) {
  background-color: #b31b1b;
}

.list-section :deep(.el-table th.el-table__cell) {
  background: #fafafa;
  color: #2c3e50;
  font-weight: 600;
}
</style>
