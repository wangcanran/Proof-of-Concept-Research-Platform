<template>
  <div class="reviewer-history">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>评审历史记录</h1>
        <p class="subtitle">查看您的所有评审项目历史记录</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="refreshData" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button @click="exportData">
          <el-icon><Download /></el-icon>
          导出数据
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-card shadow="hover" class="stats-card">
        <div class="card-content">
          <div class="card-icon total-icon">
            <el-icon><Document /></el-icon>
          </div>
          <div class="card-info">
            <div class="card-value">{{ stats.totalReviews || 0 }}</div>
            <div class="card-label">总评审项目</div>
          </div>
        </div>
      </el-card>

      <el-card shadow="hover" class="stats-card">
        <div class="card-content">
          <div class="card-icon average-icon">
            <el-icon><Star /></el-icon>
          </div>
          <div class="card-info">
            <div class="card-value">{{ stats.averageScore || 0 }}</div>
            <div class="card-label">平均评分</div>
          </div>
        </div>
      </el-card>

      <el-card shadow="hover" class="stats-card">
        <div class="card-content">
          <div class="card-icon approve-icon">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <div class="card-info">
            <div class="card-value">{{ stats.approveCount || 0 }}</div>
            <div class="card-label">通过项目</div>
          </div>
        </div>
      </el-card>

      <el-card shadow="hover" class="stats-card">
        <div class="card-content">
          <div class="card-icon pending-icon">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="card-info">
            <div class="card-value">{{ stats.pendingReviews || 0 }}</div>
            <div class="card-label">待评审项目</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 过滤条件 -->
    <el-card class="filter-card">
      <div class="filter-container">
        <el-form :model="filter" label-width="80px" class="filter-form">
          <el-row :gutter="20">
            <el-col :xs="24" :sm="12" :md="6">
              <el-form-item label="项目名称">
                <el-input
                  v-model="filter.search"
                  placeholder="搜索项目名称"
                  clearable
                  @clear="handleSearch"
                  @keyup.enter="handleSearch"
                >
                  <template #append>
                    <el-button @click="handleSearch">
                      <el-icon><Search /></el-icon>
                    </el-button>
                  </template>
                </el-input>
              </el-form-item>
            </el-col>

            <el-col :xs="24" :sm="12" :md="6">
              <el-form-item label="评审类型">
                <el-select
                  v-model="filter.review_type"
                  placeholder="全部类型"
                  clearable
                  @change="handleFilterChange"
                >
                  <el-option label="立项评审" value="initial" />
                  <el-option label="中期评审" value="mid_term" />
                  <el-option label="结题评审" value="final" />
                  <el-option label="专项评审" value="special" />
                </el-select>
              </el-form-item>
            </el-col>

            <el-col :xs="24" :sm="12" :md="6">
              <el-form-item label="评审结论">
                <el-select
                  v-model="filter.recommendation"
                  placeholder="全部结论"
                  clearable
                  @change="handleFilterChange"
                >
                  <el-option label="通过" value="approve" />
                  <el-option label="修改后重审" value="approve_with_revision" />
                  <el-option label="不通过" value="reject" />
                  <el-option label="重新提交" value="resubmit" />
                </el-select>
              </el-form-item>
            </el-col>

            <el-col :xs="24" :sm="12" :md="6">
              <el-form-item label="日期范围">
                <el-date-picker
                  v-model="filter.dateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  value-format="YYYY-MM-DD"
                  @change="handleDateChange"
                  clearable
                />
              </el-form-item>
            </el-col>
          </el-row>

          <div class="filter-actions">
            <el-button type="primary" @click="handleSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="resetFilters">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
          </div>
        </el-form>
      </div>
    </el-card>

    <!-- 评审历史列表 -->
    <el-card>
      <template #header>
        <div class="table-header">
          <h3>评审历史列表</h3>
          <div class="table-actions">
            <el-button
              type="text"
              @click="toggleShowDetails"
              :icon="showDetails ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"
            >
              {{ showDetails ? '隐藏详情' : '显示详情' }}
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="6" animated />
      </div>

      <div v-else>
        <el-table
          :data="reviewHistory"
          v-loading="tableLoading"
          style="width: 100%"
          @sort-change="handleSortChange"
        >
          <el-table-column prop="project_code" label="项目编号" width="120" sortable="custom">
            <template #default="{ row }">
              <el-tag type="info" size="small">{{ row.project_code }}</el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="project_title" label="项目名称" min-width="200" sortable="custom">
            <template #default="{ row }">
              <div class="project-title" @click="viewProject(row.project_id)">
                {{ row.project_title }}
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="review_type" label="评审类型" width="100">
            <template #default="{ row }">
              <el-tag :type="getReviewTypeTag(row.review_type)" size="small">
                {{ getReviewTypeText(row.review_type) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="submitted_at" label="评审日期" width="120" sortable="custom">
            <template #default="{ row }">
              {{ formatDate(row.submitted_at) }}
            </template>
          </el-table-column>

          <el-table-column prop="total_score" label="综合评分" width="100" sortable="custom">
            <template #default="{ row }">
              <el-rate
                v-model="row.total_score"
                disabled
                :max="10"
                :allow-half="true"
                show-score
                text-color="#ff9900"
                score-template="{value}"
              />
            </template>
          </el-table-column>

          <el-table-column prop="recommendation" label="评审结论" width="120">
            <template #default="{ row }">
              <el-tag :type="getConclusionType(row.recommendation)" size="small">
                {{ getConclusionText(row.recommendation) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button type="primary" size="small" @click="viewReviewDetail(row.id)">
                  查看详情
                </el-button>
                <el-button
                  v-if="row.status === 'draft'"
                  type="warning"
                  size="small"
                  @click="editReview(row.id)"
                >
                  继续评审
                </el-button>
              </div>
            </template>
          </el-table-column>

          <!-- 详情展开行 -->
          <el-table-column type="expand" width="60">
            <template #default="{ row }">
              <div v-if="showDetails" class="review-detail-expand">
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="创新性评分">
                    <el-rate v-model="row.innovation_score" disabled :max="10" :allow-half="true" />
                    <span class="score-text">{{ row.innovation_score }}分</span>
                  </el-descriptions-item>

                  <el-descriptions-item label="可行性评分">
                    <el-rate
                      v-model="row.feasibility_score"
                      disabled
                      :max="10"
                      :allow-half="true"
                    />
                    <span class="score-text">{{ row.feasibility_score }}分</span>
                  </el-descriptions-item>

                  <el-descriptions-item label="意义价值评分">
                    <el-rate
                      v-model="row.significance_score"
                      disabled
                      :max="10"
                      :allow-half="true"
                    />
                    <span class="score-text">{{ row.significance_score }}分</span>
                  </el-descriptions-item>

                  <el-descriptions-item label="团队基础评分">
                    <el-rate v-model="row.team_score" disabled :max="10" :allow-half="true" />
                    <span class="score-text">{{ row.team_score }}分</span>
                  </el-descriptions-item>

                  <el-descriptions-item label="预算合理性评分">
                    <el-rate v-model="row.budget_score" disabled :max="10" :allow-half="true" />
                    <span class="score-text">{{ row.budget_score }}分</span>
                  </el-descriptions-item>

                  <el-descriptions-item label="项目优点" :span="2">
                    <div class="multiline-text">{{ row.strengths || '暂无' }}</div>
                  </el-descriptions-item>

                  <el-descriptions-item label="项目不足" :span="2">
                    <div class="multiline-text">{{ row.weaknesses || '暂无' }}</div>
                  </el-descriptions-item>

                  <el-descriptions-item label="评审意见" :span="2">
                    <div class="multiline-text">{{ row.comments || '暂无' }}</div>
                  </el-descriptions-item>

                  <el-descriptions-item label="修改建议" :span="2">
                    <div class="multiline-text">{{ row.suggestions || '暂无' }}</div>
                  </el-descriptions-item>

                  <el-descriptions-item label="评审状态">
                    <el-tag :type="row.status === 'submitted' ? 'success' : 'warning'" size="small">
                      {{ getReviewStatusText(row.status) }}
                    </el-tag>
                  </el-descriptions-item>

                  <el-descriptions-item label="是否对申请者保密">
                    <el-tag :type="row.is_confidential ? 'danger' : 'success'" size="small">
                      {{ row.is_confidential ? '是' : '否' }}
                    </el-tag>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.limit"
            :total="pagination.total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </el-card>

    <!-- 评审详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="评审详情"
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-if="selectedReview" class="review-detail-dialog">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="项目编号">
            {{ selectedReview.project_code }}
          </el-descriptions-item>

          <el-descriptions-item label="项目名称">
            <div class="project-title-link" @click="viewProject(selectedReview.project_id)">
              {{ selectedReview.project_title }}
            </div>
          </el-descriptions-item>

          <el-descriptions-item label="评审类型">
            <el-tag :type="getReviewTypeTag(selectedReview.review_type)" size="small">
              {{ getReviewTypeText(selectedReview.review_type) }}
            </el-tag>
          </el-descriptions-item>

          <el-descriptions-item label="评审日期">
            {{ formatDate(selectedReview.submitted_at) }}
          </el-descriptions-item>

          <el-descriptions-item label="评审状态">
            <el-tag
              :type="selectedReview.status === 'submitted' ? 'success' : 'warning'"
              size="small"
            >
              {{ getReviewStatusText(selectedReview.status) }}
            </el-tag>
          </el-descriptions-item>

          <el-descriptions-item label="是否保密">
            <el-tag :type="selectedReview.is_confidential ? 'danger' : 'success'" size="small">
              {{ selectedReview.is_confidential ? '是' : '否' }}
            </el-tag>
          </el-descriptions-item>

          <!-- 评分详情 -->
          <el-descriptions-item label="创新性" :span="1">
            <div class="score-item">
              <el-rate
                v-model="selectedReview.innovation_score"
                disabled
                :max="10"
                :allow-half="true"
              />
              <span class="score-value">{{ selectedReview.innovation_score }}分</span>
            </div>
          </el-descriptions-item>

          <el-descriptions-item label="可行性" :span="1">
            <div class="score-item">
              <el-rate
                v-model="selectedReview.feasibility_score"
                disabled
                :max="10"
                :allow-half="true"
              />
              <span class="score-value">{{ selectedReview.feasibility_score }}分</span>
            </div>
          </el-descriptions-item>

          <el-descriptions-item label="意义价值" :span="1">
            <div class="score-item">
              <el-rate
                v-model="selectedReview.significance_score"
                disabled
                :max="10"
                :allow-half="true"
              />
              <span class="score-value">{{ selectedReview.significance_score }}分</span>
            </div>
          </el-descriptions-item>

          <el-descriptions-item label="团队基础" :span="1">
            <div class="score-item">
              <el-rate v-model="selectedReview.team_score" disabled :max="10" :allow-half="true" />
              <span class="score-value">{{ selectedReview.team_score }}分</span>
            </div>
          </el-descriptions-item>

          <el-descriptions-item label="预算合理性" :span="1">
            <div class="score-item">
              <el-rate
                v-model="selectedReview.budget_score"
                disabled
                :max="10"
                :allow-half="true"
              />
              <span class="score-value">{{ selectedReview.budget_score }}分</span>
            </div>
          </el-descriptions-item>

          <el-descriptions-item label="综合评分" :span="1">
            <div class="total-score">
              <el-rate v-model="selectedReview.total_score" disabled :max="10" :allow-half="true" />
              <span class="total-score-value">{{ selectedReview.total_score }}分</span>
            </div>
          </el-descriptions-item>

          <el-descriptions-item label="评审结论" :span="2">
            <el-tag :type="getConclusionType(selectedReview.recommendation)" size="large">
              {{ getConclusionText(selectedReview.recommendation) }}
            </el-tag>
          </el-descriptions-item>

          <el-descriptions-item label="项目优点" :span="2">
            <div class="detail-content">{{ selectedReview.strengths || '暂无' }}</div>
          </el-descriptions-item>

          <el-descriptions-item label="项目不足" :span="2">
            <div class="detail-content">{{ selectedReview.weaknesses || '暂无' }}</div>
          </el-descriptions-item>

          <el-descriptions-item label="评审意见" :span="2">
            <div class="detail-content">{{ selectedReview.comments || '暂无' }}</div>
          </el-descriptions-item>

          <el-descriptions-item label="修改建议" :span="2">
            <div class="detail-content">{{ selectedReview.suggestions || '暂无' }}</div>
          </el-descriptions-item>

          <el-descriptions-item label="申请人信息" :span="2">
            <div v-if="selectedReview.applicant_info">
              <p>姓名：{{ selectedReview.applicant_info.name || '未知' }}</p>
              <p>单位：{{ selectedReview.applicant_info.department || '未知' }}</p>
            </div>
            <div v-else>暂无</div>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailDialogVisible = false">关闭</el-button>
          <el-button
            v-if="selectedReview && selectedReview.status === 'draft'"
            type="primary"
            @click="editReview(selectedReview.id)"
          >
            继续评审
          </el-button>
          <el-button
            v-if="selectedReview && selectedReview.status === 'submitted'"
            type="success"
            @click="exportReview(selectedReview)"
          >
            导出评审表
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh,
  Download,
  Document,
  Star,
  CircleCheck,
  Clock,
  Search,
} from '@element-plus/icons-vue'
import axios from 'axios'

const router = useRouter()

// 数据
const reviewHistory = ref([])
const loading = ref(false)
const tableLoading = ref(false)
const stats = ref({
  totalReviews: 0,
  averageScore: 0,
  approveCount: 0,
  pendingReviews: 0,
})
const selectedReview = ref(null)
const detailDialogVisible = ref(false)
const showDetails = ref(false)

// 过滤条件
const filter = ref({
  search: '',
  review_type: '',
  recommendation: '',
  dateRange: [],
  start_date: '',
  end_date: '',
})

// 分页
const pagination = ref({
  page: 1,
  limit: 10,
  total: 0,
  sort_by: 'submitted_at',
  sort_order: 'desc',
})

// 加载数据
const loadReviewHistory = async () => {
  tableLoading.value = true

  try {
    const token = localStorage.getItem('token')
    if (!token) {
      ElMessage.error('请先登录')
      router.push('/login')
      return
    }

    // 构建查询参数
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      sort_by: pagination.value.sort_by,
      sort_order: pagination.value.sort_order,
      ...filter.value,
    }

    // 处理日期范围
    if (filter.value.dateRange && filter.value.dateRange.length === 2) {
      params.start_date = filter.value.dateRange[0]
      params.end_date = filter.value.dateRange[1]
    }

    console.log('📡 加载评审历史，参数:', params)

    const response = await axios.get('http://localhost:3002/api/reviewer/history', {
      params,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    console.log('📡 评审历史响应:', response.data)

    if (response.data.success) {
      const data = response.data.data

      // 确保 reviewHistory 是数组
      reviewHistory.value = Array.isArray(data.reviews) ? data.reviews : []

      // 更新分页信息
      if (data.pagination) {
        pagination.value = {
          ...pagination.value,
          total: data.pagination.total || 0,
        }
      }

      // 更新统计数据
      if (data.stats) {
        stats.value = {
          totalReviews: data.stats.total_reviews || 0,
          averageScore: data.stats.average_score || 0,
          approveCount: data.stats.approve_count || 0,
          pendingReviews: data.stats.pending_reviews || 0,
        }
      }

      console.log(`✅ 加载评审历史成功，共 ${reviewHistory.value.length} 条`)
    } else {
      ElMessage.error('加载评审历史失败：' + (response.data.error || '未知错误'))
      reviewHistory.value = []
    }
  } catch (error) {
    console.error('加载评审历史失败:', error)

    if (error.response?.status === 401) {
      ElMessage.error('登录已过期，请重新登录')
      localStorage.clear()
      router.push('/login')
    } else if (error.response?.status === 404) {
      // API不存在，可能后端还没实现这个接口，先显示模拟数据
      ElMessage.warning('评审历史API暂不可用，显示示例数据')
      loadMockData()
    } else {
      ElMessage.error('加载评审历史失败：' + (error.message || '网络错误'))
      reviewHistory.value = []
    }
  } finally {
    tableLoading.value = false
    loading.value = false
  }
}

// 模拟数据（当API不可用时使用）
const loadMockData = () => {
  reviewHistory.value = [
    {
      id: '1',
      project_id: 'proj_001',
      project_code: 'PROJ-202401-001',
      project_title: '基于人工智能的医疗诊断系统研究',
      review_type: 'initial',
      review_date: '2024-01-15',
      innovation_score: 8.5,
      feasibility_score: 7.0,
      significance_score: 9.0,
      team_score: 7.5,
      budget_score: 6.5,
      total_score: 7.7,
      recommendation: 'approve',
      strengths: '研究目标明确，创新性强，应用前景广阔',
      weaknesses: '技术路线不够详细，团队经验稍显不足',
      comments: '项目整体可行，建议细化技术实施方案',
      suggestions: '建议补充技术细节，加强团队技术实力',
      status: 'submitted',
      is_confidential: false,
    },
    {
      id: '2',
      project_id: 'proj_002',
      project_code: 'PROJ-202401-002',
      project_title: '新能源汽车电池管理系统研发',
      review_type: 'mid_term',
      review_date: '2024-01-10',
      innovation_score: 7.0,
      feasibility_score: 8.0,
      significance_score: 8.5,
      team_score: 8.0,
      budget_score: 7.5,
      total_score: 7.8,
      recommendation: 'approve_with_revision',
      strengths: '团队实力强，前期工作扎实',
      weaknesses: '进展稍慢，需要加快进度',
      comments: '中期进展良好，但需要按计划推进',
      suggestions: '建议优化时间安排，确保按期完成',
      status: 'submitted',
      is_confidential: false,
    },
  ]

  stats.value = {
    totalReviews: 2,
    averageScore: 7.75,
    approveCount: 1,
    pendingReviews: 0,
  }

  pagination.value.total = 2
}

// 加载统计数据
const loadStats = async () => {
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get('http://localhost:3002/api/reviewer/stats', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (response.data.success) {
      stats.value = response.data.data
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

// 搜索处理
const handleSearch = () => {
  pagination.value.page = 1
  loadReviewHistory()
}

// 过滤条件变化
const handleFilterChange = () => {
  handleSearch()
}

// 日期变化处理
const handleDateChange = () => {
  handleSearch()
}

// 重置过滤器
const resetFilters = () => {
  filter.value = {
    search: '',
    review_type: '',
    recommendation: '',
    dateRange: [],
    start_date: '',
    end_date: '',
  }
  pagination.value.page = 1
  loadReviewHistory()
}

// 分页大小变化
const handleSizeChange = (size) => {
  pagination.value.limit = size
  pagination.value.page = 1
  loadReviewHistory()
}

// 页码变化
const handlePageChange = (page) => {
  pagination.value.page = page
  loadReviewHistory()
}

// 排序变化
const handleSortChange = ({ prop, order }) => {
  if (prop && order) {
    pagination.value.sort_by = prop
    pagination.value.sort_order = order === 'ascending' ? 'asc' : 'desc'
  } else {
    pagination.value.sort_by = 'submitted_at'
    pagination.value.sort_order = 'desc'
  }
  loadReviewHistory()
}

// 查看项目详情
const viewProject = (projectId) => {
  if (projectId) {
    router.push(`/projects/${projectId}`)
  }
}

// 查看评审详情
const viewReviewDetail = async (reviewId) => {
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get(`http://localhost:3002/api/reviewer/review/${reviewId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (response.data.success) {
      selectedReview.value = response.data.data
      detailDialogVisible.value = true
    } else {
      ElMessage.error('获取评审详情失败')
    }
  } catch (error) {
    console.error('获取评审详情失败:', error)

    // 如果API不可用，从当前列表查找
    const review = reviewHistory.value.find((r) => r.id === reviewId)
    if (review) {
      selectedReview.value = review
      detailDialogVisible.value = true
    } else {
      ElMessage.error('获取评审详情失败')
    }
  }
}

// 编辑评审（继续评审）
const editReview = (reviewId) => {
  router.push({
    path: '/reviewer/review',
    query: { reviewId },
  })
}

// 导出评审表
const exportReview = (review) => {
  try {
    // 创建评审表HTML
    const reviewHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>评审表 - ${review.project_title}</title>
        <style>
          body { font-family: 'SimSun', serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .info-table td { border: 1px solid #000; padding: 8px; }
          .score-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .score-table td, .score-table th { border: 1px solid #000; padding: 8px; text-align: center; }
          .comments { margin-top: 20px; }
          .comments h3 { margin-bottom: 10px; }
          .comments p { line-height: 1.6; }
          .signature { margin-top: 50px; text-align: right; }
          .page-break { page-break-before: always; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">科研项目评审表</div>
          <div>评审编号：${review.id}</div>
        </div>

        <table class="info-table">
          <tr>
            <td width="20%">项目编号</td>
            <td width="30%">${review.project_code}</td>
            <td width="20%">项目名称</td>
            <td width="30%">${review.project_title}</td>
          </tr>
          <tr>
            <td>评审类型</td>
            <td>${getReviewTypeText(review.review_type)}</td>
            <td>评审日期</td>
            <td>${formatDate(review.submitted_at)}</td>
          </tr>
          <tr>
            <td>评审专家</td>
            <td>${localStorage.getItem('userName') || '评审专家'}</td>
            <td>评审结论</td>
            <td>${getConclusionText(review.recommendation)}</td>
          </tr>
        </table>

        <h3>评分详情</h3>
        <table class="score-table">
          <thead>
            <tr>
              <th>评价指标</th>
              <th>权重</th>
              <th>评分（满分10分）</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>创新性</td>
              <td>20%</td>
              <td>${review.innovation_score}</td>
              <td></td>
            </tr>
            <tr>
              <td>可行性</td>
              <td>20%</td>
              <td>${review.feasibility_score}</td>
              <td></td>
            </tr>
            <tr>
              <td>意义价值</td>
              <td>20%</td>
              <td>${review.significance_score}</td>
              <td></td>
            </tr>
            <tr>
              <td>团队基础</td>
              <td>20%</td>
              <td>${review.team_score}</td>
              <td></td>
            </tr>
            <tr>
              <td>预算合理性</td>
              <td>20%</td>
              <td>${review.budget_score}</td>
              <td></td>
            </tr>
            <tr>
              <td colspan="2"><strong>综合评分</strong></td>
              <td colspan="2"><strong>${review.total_score}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="comments">
          <h3>评审意见</h3>
          <p><strong>项目优点：</strong>${review.strengths || '暂无'}</p>
          <p><strong>项目不足：</strong>${review.weaknesses || '暂无'}</p>
          <p><strong>评审意见：</strong>${review.comments || '暂无'}</p>
          <p><strong>修改建议：</strong>${review.suggestions || '暂无'}</p>
        </div>

        <div class="signature">
          <p>评审专家签名：___________________</p>
          <p>日期：${new Date().toLocaleDateString('zh-CN')}</p>
        </div>
      </body>
      </html>
    `

    // 创建Blob并下载
    const blob = new Blob([reviewHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `评审表_${review.project_code}_${new Date().getTime()}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    ElMessage.success('评审表导出成功')
  } catch (error) {
    console.error('导出评审表失败:', error)
    ElMessage.error('导出失败')
  }
}

// 导出数据
const exportData = () => {
  try {
    const csvContent = [
      ['项目编号', '项目名称', '评审类型', '评审日期', '综合评分', '评审结论', '评审状态'].join(
        ',',
      ),
      ...reviewHistory.value.map((review) =>
        [
          review.project_code,
          `"${review.project_title}"`,
          getReviewTypeText(review.review_type),
          review.submitted_at,
          review.total_score,
          getConclusionText(review.recommendation),
          getReviewStatusText(review.status),
        ].join(','),
      ),
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `评审历史_${new Date().getTime()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    ElMessage.success('数据导出成功')
  } catch (error) {
    console.error('导出数据失败:', error)
    ElMessage.error('导出失败')
  }
}

// 刷新数据
const refreshData = () => {
  loading.value = true
  loadReviewHistory()
  loadStats()
}

// 切换显示详情
const toggleShowDetails = () => {
  showDetails.value = !showDetails.value
}

// 辅助函数
const getReviewTypeText = (type) => {
  const typeMap = {
    initial: '立项评审',
    mid_term: '中期评审',
    final: '结题评审',
    special: '专项评审',
  }
  return typeMap[type] || type
}

const getReviewTypeTag = (type) => {
  const typeMap = {
    initial: 'primary',
    mid_term: 'warning',
    final: 'success',
    special: 'info',
  }
  return typeMap[type] || 'info'
}

const getConclusionText = (recommendation) => {
  const conclusionMap = {
    approve: '通过',
    approve_with_revision: '修改后重审',
    reject: '不通过',
    resubmit: '重新提交',
  }
  return conclusionMap[recommendation] || recommendation || '未完成'
}

const getConclusionType = (recommendation) => {
  const typeMap = {
    approve: 'success',
    approve_with_revision: 'warning',
    reject: 'danger',
    resubmit: 'info',
  }
  return typeMap[recommendation] || 'info'
}

const getReviewStatusText = (status) => {
  const statusMap = {
    draft: '草稿',
    submitted: '已提交',
    locked: '已锁定',
  }
  return statusMap[status] || status
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    return date.toLocaleDateString('zh-CN')
  } catch {
    return dateString
  }
}

// 生命周期
onMounted(() => {
  loadReviewHistory()
  loadStats()
})
</script>

<style scoped>
.reviewer-history {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e4e7ed;
}

.header-left h1 {
  margin: 0;
  color: #303133;
  font-size: 24px;
}

.subtitle {
  margin: 8px 0 0;
  color: #909399;
  font-size: 14px;
}

.header-right {
  display: flex;
  gap: 15px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stats-card {
  transition: all 0.3s ease;
}

.stats-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-content {
  display: flex;
  align-items: center;
}

.card-icon {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
  font-size: 28px;
  color: white;
}

.total-icon {
  background: linear-gradient(135deg, #409eff, #66b1ff);
}

.average-icon {
  background: linear-gradient(135deg, #e6a23c, #ebb563);
}

.approve-icon {
  background: linear-gradient(135deg, #67c23a, #85ce61);
}

.pending-icon {
  background: linear-gradient(135deg, #909399, #a6a9ad);
}

.card-info {
  flex: 1;
}

.card-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
  margin-bottom: 5px;
}

.card-label {
  font-size: 14px;
  color: #909399;
}

.filter-card {
  margin-bottom: 30px;
}

.filter-container {
  padding: 10px 0;
}

.filter-form {
  margin-bottom: 0;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 10px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-actions {
  display: flex;
  gap: 10px;
}

.loading-container {
  padding: 40px 0;
}

.project-title {
  color: #409eff;
  cursor: pointer;
  font-weight: 500;
}

.project-title:hover {
  color: #66b1ff;
  text-decoration: underline;
}

.score-text {
  margin-left: 10px;
  color: #e6a23c;
  font-weight: 500;
}

.multiline-text {
  white-space: pre-wrap;
  line-height: 1.5;
  max-height: 100px;
  overflow-y: auto;
  padding: 5px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.review-detail-expand {
  padding: 20px;
  background-color: #fafafa;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

/* 详情弹窗样式 */
.review-detail-dialog {
  max-height: 600px;
  overflow-y: auto;
  padding-right: 10px;
}

.project-title-link {
  color: #409eff;
  cursor: pointer;
  font-weight: 500;
}

.project-title-link:hover {
  color: #66b1ff;
  text-decoration: underline;
}

.score-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.score-value {
  color: #e6a23c;
  font-weight: bold;
  min-width: 40px;
}

.total-score {
  display: flex;
  align-items: center;
  gap: 15px;
}

.total-score-value {
  font-size: 18px;
  font-weight: bold;
  color: #e6a23c;
}

.detail-content {
  white-space: pre-wrap;
  line-height: 1.6;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
  margin-top: 5px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .header-right {
    width: 100%;
    justify-content: flex-start;
  }

  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .filter-actions {
    justify-content: center;
  }

  .action-buttons {
    flex-direction: column;
    gap: 5px;
  }
}

@media (max-width: 480px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }
}
</style>
