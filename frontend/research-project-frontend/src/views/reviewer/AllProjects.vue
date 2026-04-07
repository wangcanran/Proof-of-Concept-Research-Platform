<template>
  <div class="all-projects-page">
    <div class="page-header">
      <button type="button" class="back-workbench-box" @click="goToDashboard">
        <el-icon class="back-icon"><ArrowLeft /></el-icon>
        <span class="back-text">返回工作台</span>
      </button>

      <div class="header-content">
        <div class="header-main">
          <h1>
            <el-icon><FolderOpened /></el-icon>
            项目浏览
          </h1>
          <p class="subtitle">查看系统中所有科研项目</p>
        </div>
      </div>
    </div>

    <div class="content-container">
      <!-- 筛选条件 -->
      <el-card class="filter-card" shadow="never">
        <div class="filter-content">
          <el-form :inline="true" :model="filterForm">
            <el-form-item label="项目状态">
              <el-select v-model="filterForm.status" placeholder="全部状态" clearable>
                <el-option label="草稿" value="draft" />
                <el-option label="已提交" value="submitted" />
                <el-option label="审核中" value="under_review" />
                <el-option label="已批准" value="approved" />
                <el-option label="进行中" value="in_progress" />
                <el-option label="已完成" value="completed" />
                <el-option label="已拒绝" value="rejected" />
              </el-select>
            </el-form-item>

            <el-form-item label="项目类别">
              <el-select v-model="filterForm.category" placeholder="全部类别" clearable>
                <el-option label="基础研究" value="基础研究" />
                <el-option label="应用研究" value="应用研究" />
                <el-option label="技术开发" value="技术开发" />
                <el-option label="成果转化" value="成果转化" />
                <el-option label="平台建设" value="平台建设" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>

            <el-form-item label="关键词">
              <el-input
                v-model="filterForm.keyword"
                placeholder="项目名称、申请人、摘要"
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

      <!-- 状态统计 -->
      <div class="status-stats">
        <el-card
          shadow="hover"
          class="stat-item"
          v-for="(count, status) in statusStats"
          :key="status"
          @click="filterByStatus(status)"
          :class="{ active: filterForm.status === status }"
        >
          <div class="stat-content">
            <div class="stat-value">{{ count }}</div>
            <div class="stat-label">{{ getStatusText(status) }}</div>
          </div>
        </el-card>
      </div>

      <!-- 项目列表 -->
      <el-card class="projects-card" shadow="never">
        <div class="projects-list">
          <div v-for="project in projects" :key="project.id" class="project-item">
            <div class="project-header">
              <div class="project-badges">
                <el-tag :type="getStatusType(project.status)" size="small">
                  {{ getStatusText(project.status) }}
                </el-tag>
                <el-tag size="small" type="info">
                  {{ project.category }}
                </el-tag>
              </div>
              <span class="project-code">{{ project.project_code }}</span>
            </div>

            <div class="project-content">
              <h3 class="project-title">{{ project.title }}</h3>

              <div class="project-info">
                <div class="info-item">
                  <el-icon><User /></el-icon>
                  <span>{{ project.applicant_name }}</span>
                </div>

                <div class="info-item">
                  <el-icon><OfficeBuilding /></el-icon>
                  <span>{{ project.applicant_department }}</span>
                </div>

                <div class="info-item">
                  <el-icon><Coin /></el-icon>
                  <span>{{ formatCurrency(project.budget_total) }}</span>
                </div>

                <div class="info-item">
                  <el-icon><Calendar /></el-icon>
                  <span>周期：{{ project.duration_months }}个月</span>
                </div>

                <div v-if="project.review_count > 0" class="info-item">
                  <el-icon><Star /></el-icon>
                  <span>
                    已评审：{{ project.review_count }}人
                    <span v-if="project.avg_score" class="avg-score">
                      (平均分：{{ parseFloat(project.avg_score).toFixed(1) }})
                    </span>
                  </span>
                </div>
              </div>

              <div class="project-abstract">
                <p>{{ truncateText(project.abstract, 150) }}</p>
              </div>
            </div>

            <div class="project-actions">
              <el-button @click="viewProjectDetail(project)">
                <el-icon><View /></el-icon>
                查看详情
              </el-button>
              <el-button
                v-if="project.status === 'under_review' && !hasReviewed(project)"
                type="primary"
                @click="startReview(project)"
              >
                <el-icon><Edit /></el-icon>
                进行评审
              </el-button>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="projects.length === 0" class="empty-state">
            <el-empty description="暂无项目" :image-size="150" />
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="projects.length > 0" class="pagination-container">
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
import {
  ArrowLeft,
  FolderOpened,
  Search,
  Refresh,
  User,
  OfficeBuilding,
  Coin,
  Calendar,
  Star,
  View,
  Edit,
} from '@element-plus/icons-vue'
import request from '@/utils/request'

const router = useRouter()

// 状态管理
const loading = ref(false)
const projects = ref<any[]>([])
const statusStats = ref<Record<string, number>>({})
const filterForm = ref({
  status: '',
  category: '',
  keyword: '',
})
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
})

// 方法
const loadAllProjects = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.value.current,
      pageSize: pagination.value.pageSize,
    }

    if (filterForm.value.status) {
      params.status = filterForm.value.status
    }

    if (filterForm.value.category) {
      params.category = filterForm.value.category
    }

    if (filterForm.value.keyword) {
      params.keyword = filterForm.value.keyword
    }

    const response = await request.get('/api/reviewer/all-projects', { params })

    if (response && response.success) {
      const payload = response.data || {}
      projects.value = payload.projects || []
      pagination.value.total = payload.pagination?.total ?? 0
      statusStats.value = payload.stats || {}
    } else {
      const msg = (response && (response.error || response.message)) || '服务器未返回成功状态'
      ElMessage.error(`加载项目列表失败：${msg}`)
    }
  } catch (error: any) {
    console.error('加载项目列表失败:', error?.response?.data || error)
    const status = error?.response?.status
    const data = error?.response?.data
    const hint =
      status === 403
        ? '没有权限（请用评审专家账号登录）'
        : status === 404
          ? '接口不存在，请确认后端已启动且为最新代码'
          : data?.error || data?.message || error?.message || '网络或服务器错误'
    ElMessage.error(`加载项目列表失败：${hint}`)
  } finally {
    loading.value = false
  }
}

const viewProjectDetail = (project: any) => {
  router.push(`/reviewer/project-detail/${project.id}`)
}

const startReview = (project: any) => {
  router.push({
    path: '/reviewer/review',
    query: {
      projectId: project.id,
      projectCode: project.project_code,
    },
  })
}

const filterByStatus = (status: string) => {
  filterForm.value.status = filterForm.value.status === status ? '' : status
  handleSearch()
}

const hasReviewed = (project: any) => {
  // 这里需要根据实际情况判断当前专家是否已评审过该项目
  // 暂时返回false，实际实现时需要调用API检查
  return false
}

const handleSearch = () => {
  pagination.value.current = 1
  loadAllProjects()
}

const resetFilter = () => {
  filterForm.value = {
    status: '',
    category: '',
    keyword: '',
  }
  pagination.value.current = 1
  loadAllProjects()
}

const handleSizeChange = (size: number) => {
  pagination.value.pageSize = size
  pagination.value.current = 1
  loadAllProjects()
}

const handleCurrentChange = (page: number) => {
  pagination.value.current = page
  loadAllProjects()
}

const goToDashboard = () => {
  router.push('/reviewer/dashboard')
}

// 辅助函数
const formatCurrency = (amount: number) => {
  if (!amount) return '¥0'
  const num = Number(amount)
  if (num >= 100000000) return '¥' + (num / 100000000).toFixed(2) + '亿'
  if (num >= 10000) return '¥' + (num / 10000).toFixed(2) + '万'
  return '¥' + num.toFixed(2)
}

const truncateText = (text: string, maxLength: number) => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
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
  loadAllProjects()
})
</script>

<style scoped>
.all-projects-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20px;
}

.all-projects-page :deep(.el-button--primary) {
  --el-button-bg-color: #b31b1b;
  --el-button-border-color: #b31b1b;
  --el-button-hover-bg-color: #8b1515;
  --el-button-hover-border-color: #8b1515;
  --el-button-active-bg-color: #8b1515;
  --el-button-active-border-color: #8b1515;
}

.all-projects-page :deep(.el-pagination .el-pager li.is-active) {
  color: #b31b1b;
  font-weight: 600;
}

.all-projects-page :deep(.el-pagination .el-pager li:hover) {
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
  .back-workbench-box {
    width: 100%;
    justify-content: center;
  }
}

.filter-card {
  margin-bottom: 20px;
  background: #ffffff;
  border-radius: 8px;
}

.filter-content {
  padding: 16px;
}

.status-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.stat-item {
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.stat-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-item.active {
  border-color: #b31b1b;
}

.stat-content {
  padding: 16px;
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #b31b1b;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.projects-card {
  background: #ffffff;
  border-radius: 8px;
}

.projects-list {
  min-height: 400px;
}

.project-item {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
  background: #ffffff;
  transition: all 0.3s;
}

.project-item:hover {
  border-color: #b31b1b;
  box-shadow: 0 2px 12px rgba(179, 27, 27, 0.12);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.project-badges {
  display: flex;
  gap: 8px;
}

.project-code {
  font-family: 'Monaco', 'Consolas', monospace;
  color: #909399;
  font-size: 14px;
}

.project-title {
  margin: 0 0 12px 0;
  font-size: 18px;
  color: #303133;
  line-height: 1.4;
}

.project-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
  font-size: 14px;
}

.avg-score {
  color: #faad14;
  font-weight: 500;
}

.project-abstract {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 4px;
  margin-bottom: 16px;
}

.project-abstract p {
  margin: 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
}

.project-actions {
  display: flex;
  gap: 12px;
}

.empty-state {
  padding: 80px 0;
  text-align: center;
}

.pagination-container {
  padding: 20px;
  text-align: center;
  border-top: 1px solid #f0f0f0;
}

@media (max-width: 768px) {
  .project-info {
    grid-template-columns: 1fr;
  }

  .project-actions {
    flex-direction: column;
  }
}
</style>
