<template>
  <div class="review-history-page">
    <div class="page-header">
      <button type="button" class="back-workbench-box" @click="goToDashboard">
        <el-icon class="back-icon"><ArrowLeft /></el-icon>
        <span class="back-text">返回工作台</span>
      </button>

      <div class="header-content">
        <div class="header-main">
          <h1>
            <el-icon><Document /></el-icon>
            评审历史
          </h1>
          <p class="subtitle">查看您已完成的所有评审记录</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="exportData">
            <el-icon><Download /></el-icon>
            导出数据
          </el-button>
        </div>
      </div>
    </div>

    <div class="content-container">
      <!-- 统计卡片 -->
      <div class="stats-cards">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">总评审数</div>
          </div>
        </el-card>

        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-value">{{ stats.approvedCount }}</div>
            <div class="stat-label">通过（含修改后通过/重新提交）</div>
          </div>
        </el-card>

        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-value">{{ stats.approvalRate }}%</div>
            <div class="stat-label">通过率</div>
          </div>
        </el-card>

        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-value">{{ stats.rejectedCount }}</div>
            <div class="stat-label">不通过</div>
          </div>
        </el-card>
      </div>

      <!-- 筛选条件 -->
      <el-card class="filter-card" shadow="never">
        <div class="filter-content">
          <el-form :inline="true" :model="filterForm">
            <el-form-item label="项目名称">
              <el-input v-model="filterForm.keyword" placeholder="请输入项目名称或编号" clearable />
            </el-form-item>

            <el-form-item label="评审结论">
              <el-select v-model="filterForm.recommendation" placeholder="全部结论" clearable>
                <el-option label="通过" value="approve" />
                <el-option label="修改后通过" value="approve_with_revision" />
                <el-option label="不通过" value="reject" />
                <el-option label="重新提交" value="resubmit" />
              </el-select>
            </el-form-item>

            <el-form-item label="评审时间">
              <el-date-picker
                v-model="filterForm.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                clearable
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="handleSearch">
                <el-icon><Search /></el-icon>
                搜索
              </el-button>
              <el-button @click="resetFilter">
                <el-icon><Refresh /></el-icon>
                重置
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-card>

      <!-- 评审记录表格 -->
      <el-card class="table-card" shadow="never">
        <el-table
          :data="reviews"
          v-loading="loading"
          stripe
          style="width: 100%"
          @row-click="viewReviewDetail"
        >
          <el-table-column prop="project_code" label="项目编号" width="150" />
          <el-table-column prop="project_title" label="项目名称" min-width="200">
            <template #default="{ row }">
              <div class="project-title-cell">
                <span class="title">{{ row.project_title }}</span>
                <div class="applicant">{{ row.applicant_name }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="review_date" label="评审日期" width="120">
            <template #default="{ row }">
              {{ formatDate(row.review_date) }}
            </template>
          </el-table-column>
          <el-table-column prop="recommendation" label="评审结论" width="120">
            <template #default="{ row }">
              <el-tag :type="getConclusionType(row.recommendation)" size="small">
                {{ getConclusionText(row.recommendation) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="project_status" label="项目状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.project_status)" size="small">
                {{ getStatusText(row.project_status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click.stop="viewReviewDetail(row)">
                查看详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.current"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="pagination.total"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Document, Download, Search, Refresh } from '@element-plus/icons-vue'
import request from '@/utils/request'

const router = useRouter()

// 状态管理
const loading = ref(false)
const reviews = ref<any[]>([])
const stats = ref({
  total: 0,
  approvedCount: 0,
  rejectedCount: 0,
  approvalRate: 0,
})
const filterForm = ref({
  keyword: '',
  recommendation: '',
  dateRange: [],
})
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
})

// 方法
const loadReviewHistory = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.value.current,
      pageSize: pagination.value.pageSize,
    }

    if (filterForm.value.keyword) {
      params.keyword = filterForm.value.keyword
    }

    if (filterForm.value.recommendation) {
      params.recommendation = filterForm.value.recommendation
    }

    if (filterForm.value.dateRange && filterForm.value.dateRange.length === 2) {
      params.startDate = filterForm.value.dateRange[0]
      params.endDate = filterForm.value.dateRange[1]
    }

    const response = await request.get('/api/reviewer/reviews', { params })

    if (response.success) {
      reviews.value = response.data || []
      pagination.value.total = response.total || 0
      const total = Number(response.total || 0)
      const approvedCount = reviews.value.filter((item) =>
        ['approve', 'approve_with_revision', 'resubmit'].includes(item.recommendation),
      ).length
      const rejectedCount = reviews.value.filter((item) => item.recommendation === 'reject').length
      stats.value = {
        total,
        approvedCount,
        rejectedCount,
        approvalRate: total > 0 ? Math.round((approvedCount / total) * 100) : 0,
      }
    } else {
      ElMessage.error('加载评审历史失败')
    }
  } catch (error) {
    console.error('加载评审历史失败:', error)
    ElMessage.error('加载评审历史失败')
  } finally {
    loading.value = false
  }
}
const viewReviewDetail = (review: any) => {
  router.push(`/reviewer/reviews/${review.id}`)
}

const handleSearch = () => {
  pagination.value.current = 1
  loadReviewHistory()
}

const resetFilter = () => {
  filterForm.value = {
    keyword: '',
    recommendation: '',
    dateRange: [],
  }
  pagination.value.current = 1
  loadReviewHistory()
}

const handleSizeChange = (size: number) => {
  pagination.value.pageSize = size
  pagination.value.current = 1
  loadReviewHistory()
}

const handleCurrentChange = (page: number) => {
  pagination.value.current = page
  loadReviewHistory()
}

const exportData = async () => {
  try {
    ElMessage.info('导出功能正在开发中')
    // 实际实现时可以使用第三方库如 xlsx 或 csv-export
  } catch (error) {
    console.error('导出数据失败:', error)
    ElMessage.error('导出数据失败')
  }
}

const goToDashboard = () => {
  router.push('/reviewer/dashboard')
}

// 辅助函数
const formatDate = (dateString: string) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  } catch {
    return dateString
  }
}

const getConclusionType = (conclusion: string) => {
  const map: Record<string, string> = {
    approve: 'success',
    approve_with_revision: 'warning',
    reject: 'danger',
    resubmit: 'info',
    通过: 'success',
    approved: 'success',
  }
  return map[conclusion] || 'info'
}

const getConclusionText = (conclusion: string) => {
  const map: Record<string, string> = {
    approve: '通过',
    approve_with_revision: '修改后通过',
    reject: '不通过',
    resubmit: '重新提交',
  }
  return map[conclusion] || conclusion
}

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    draft: 'info',
    submitted: '',
    under_review: 'warning',
    approved: 'success',
    in_progress: 'primary',
    completed: 'success',
    rejected: 'danger',
  }
  return map[status] || ''
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    under_review: '审核中',
    approved: '已批准',
    in_progress: '进行中',
    completed: '已完成',
    rejected: '已拒绝',
  }
  return map[status] || status
}

// 生命周期
onMounted(() => {
  loadReviewHistory()
})
</script>

<style scoped>
.review-history-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20px;
}

.review-history-page :deep(.el-button--primary) {
  --el-button-bg-color: #b31b1b;
  --el-button-border-color: #b31b1b;
  --el-button-hover-bg-color: #8b1515;
  --el-button-hover-border-color: #8b1515;
  --el-button-active-bg-color: #8b1515;
  --el-button-active-border-color: #8b1515;
}

.review-history-page :deep(.el-button--primary.is-link) {
  --el-button-text-color: #b31b1b;
}

.review-history-page :deep(.el-pagination .el-pager li.is-active) {
  color: #b31b1b;
  font-weight: 600;
}

.review-history-page :deep(.el-pagination .el-pager li:hover) {
  color: #8b1515;
}

.page-header {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.back-workbench-box {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  padding: 10px 18px;
  border: 1px solid rgba(179, 27, 27, 0.35);
  border-radius: 8px;
  background: linear-gradient(180deg, #fffbfb 0%, #fff5f5 100%);
  color: #b31b1b;
  font-size: 15px;
  font-weight: 500;
  font-family: 'STZhongsong', '华文中宋', 'SimSun', serif;
  cursor: pointer;
  transition:
    background 0.2s,
    border-color 0.2s,
    box-shadow 0.2s;
}

.back-workbench-box:hover {
  background: #fff0f0;
  border-color: #b31b1b;
  box-shadow: 0 2px 8px rgba(179, 27, 27, 0.12);
}

.back-workbench-box:active {
  background: #ffe8e8;
}

.back-workbench-box .back-icon {
  font-size: 18px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.header-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;
}

.header-main h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'STZhongsong', '华文中宋', 'SimSun', serif;
}

.header-main .subtitle {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.content-container {
  margin-top: 0;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .header-actions {
    justify-content: center;
  }

  .back-workbench-box {
    width: 100%;
    justify-content: center;
  }
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: #ffffff;
  border-radius: 8px;
}

.stat-content {
  padding: 20px;
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #b31b1b;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.filter-card {
  margin-bottom: 20px;
  background: #ffffff;
  border-radius: 8px;
}

.filter-content {
  padding: 16px;
}

.table-card {
  background: #ffffff;
  border-radius: 8px;
}

.table-card :deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
}

.table-card :deep(.el-table__row) {
  cursor: pointer;
}

.table-card :deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}

.project-title-cell {
  display: flex;
  flex-direction: column;
}

.project-title-cell .title {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.project-title-cell .applicant {
  font-size: 12px;
  color: #909399;
}

.score-text {
  margin-left: 8px;
  color: #faad14;
  font-weight: 500;
}

.pagination-container {
  padding: 20px;
  text-align: center;
}

@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .filter-content .el-form-item {
    margin-bottom: 12px;
  }
}
</style>
