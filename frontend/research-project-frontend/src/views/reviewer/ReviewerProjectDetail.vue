<!-- src/views/reviewer/ReviewerProjectDetail.vue -->
<template>
  <div class="reviewer-project-detail">
    <!-- 顶部导航 -->
    <header class="detail-header">
      <div class="header-content">
        <div class="back-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </div>
        <div class="header-info">
          <h1 class="project-title">{{ project.title }}</h1>
          <div class="project-meta">
            <span class="project-code">{{ project.project_code }}</span>
            <el-tag :type="getStatusType(project.status)" size="small">
              {{ getStatusText(project.status) }}
            </el-tag>
            <span class="category">{{ project.category }}</span>
          </div>
        </div>
      </div>

      <div class="header-actions">
        <div class="action-buttons">
          <el-button
            type="primary"
            @click="startReview"
            v-if="!myReview && project.status === 'under_review'"
            class="review-btn"
          >
            <el-icon><EditPen /></el-icon>
            开始评审
          </el-button>

          <el-button
            type="success"
            @click="viewMyReview"
            v-if="myReview && myReview.status === 'submitted'"
            class="my-review-btn"
          >
            <el-icon><View /></el-icon>
            查看我的评审
          </el-button>

          <el-button
            type="warning"
            @click="continueReview"
            v-if="myReview && myReview.status === 'draft'"
            class="continue-btn"
          >
            <el-icon><Edit /></el-icon>
            继续评审
          </el-button>

          <el-button @click="refreshData" class="refresh-btn">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>

        <!-- 评审状态指示器 -->
        <div class="review-status" v-if="myReview">
          <div class="status-indicator" :class="myReview.status">
            <span class="status-text">
              {{ getReviewStatusText(myReview.status) }}
            </span>
            <span class="status-time" v-if="myReview.submitted_at">
              {{ formatTime(myReview.submitted_at) }}
            </span>
          </div>
        </div>
      </div>
    </header>

    <!-- 主内容区域 -->
    <div class="detail-content">
      <!-- 左侧项目信息 -->
      <div class="left-column">
        <!-- 基本信息卡片 -->
        <el-card class="info-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <h3>
                <el-icon><InfoFilled /></el-icon> 项目基本信息
              </h3>
            </div>
          </template>

          <div class="info-grid">
            <div class="info-item">
              <label>申请人：</label>
              <span class="applicant">{{ project.applicant_name }}</span>
            </div>

            <div class="info-item">
              <label>所属单位：</label>
              <span>{{ project.applicant_department }}</span>
            </div>

            <div class="info-item">
              <label>研究领域：</label>
              <span class="research-field">{{ project.research_field }}</span>
            </div>

            <div class="info-item">
              <label>总预算：</label>
              <span class="budget">{{ formatCurrency(project.budget_total) }}</span>
            </div>

            <div class="info-item">
              <label>研究周期：</label>
              <span>{{ project.duration_months }}个月</span>
            </div>

            <div class="info-item">
              <label>提交日期：</label>
              <span>{{ formatDate(project.submit_date) }}</span>
            </div>

            <div class="info-item">
              <label>评审截止：</label>
              <span :class="getDeadlineClass(project.review_deadline)">
                {{ formatDate(project.review_deadline) }}
              </span>
            </div>

            <div class="info-item">
              <label>关键词：</label>
              <span class="keywords">{{ project.keywords || '未设置' }}</span>
            </div>
          </div>
        </el-card>

        <!-- 项目摘要 -->
        <el-card class="abstract-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <h3>
                <el-icon><Document /></el-icon> 项目摘要
              </h3>
            </div>
          </template>

          <div class="abstract-content">
            <div class="content-text" v-html="formatText(project.abstract)"></div>
          </div>
        </el-card>

        <!-- 研究目标和预期成果 -->
        <el-card class="goals-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <h3>
                <el-icon><Flag /></el-icon> 研究目标与预期成果
              </h3>
            </div>
          </template>

          <div class="goals-content">
            <div class="section" v-if="project.objectives">
              <h4>研究目标</h4>
              <div class="content-text" v-html="formatText(project.objectives)"></div>
            </div>

            <div class="section" v-if="project.expected_outcomes">
              <h4>预期成果</h4>
              <div class="content-text" v-html="formatText(project.expected_outcomes)"></div>
            </div>

            <div class="section" v-if="project.methodology">
              <h4>研究方法</h4>
              <div class="content-text" v-html="formatText(project.methodology)"></div>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 右侧评审相关信息 -->
      <div class="right-column">
        <!-- 项目成员 -->
        <el-card class="members-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <h3>
                <el-icon><User /></el-icon> 项目团队
              </h3>
              <span class="count-badge">{{ members.length }}人</span>
            </div>
          </template>

          <div class="members-list">
            <div
              v-for="member in members"
              :key="member.id"
              class="member-item"
              :class="member.role"
            >
              <div class="member-avatar">{{ getInitial(member.name) }}</div>
              <div class="member-info">
                <div class="member-header">
                  <span class="member-name">{{ member.name }}</span>
                  <el-tag :type="getRoleType(member.role)" size="small">
                    {{ getRoleText(member.role) }}
                  </el-tag>
                </div>
                <div class="member-details">
                  <span class="member-title">{{ member.title }}</span>
                  <span class="member-department">{{ member.department }}</span>
                </div>
                <div class="member-workload" v-if="member.workload_percentage">
                  <span class="workload-label">工作量：</span>
                  <span class="workload-value">{{ member.workload_percentage }}%</span>
                </div>
                <div class="member-responsibility" v-if="member.responsibility">
                  <span class="responsibility-text">{{ member.responsibility }}</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 项目预算 -->
        <el-card class="budget-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <h3>
                <el-icon><Coin /></el-icon> 项目预算
              </h3>
              <span class="budget-total">{{ formatCurrency(totalBudget) }}</span>
            </div>
          </template>

          <div class="budget-list">
            <div v-for="item in budget" :key="item.id" class="budget-item">
              <div class="budget-header">
                <span class="budget-name">{{ item.item_name }}</span>
                <span class="budget-category">
                  <el-tag size="small" type="info">{{ item.category }}</el-tag>
                </span>
                <span class="budget-amount">{{ formatCurrency(item.amount) }}</span>
              </div>
              <div class="budget-details" v-if="item.description">
                <span class="budget-desc">{{ item.description }}</span>
              </div>
            </div>
          </div>

          <div class="budget-summary">
            <div class="summary-row">
              <span class="summary-label">预算总计：</span>
              <span class="summary-value">{{ formatCurrency(totalBudget) }}</span>
            </div>
            <div
              class="summary-row"
              v-if="project.budget_total && totalBudget !== project.budget_total"
            >
              <span class="summary-label">预算差异：</span>
              <span class="summary-diff" :class="getDiffClass(project.budget_total - totalBudget)">
                {{ formatCurrency(project.budget_total - totalBudget) }}
              </span>
            </div>
          </div>
        </el-card>

        <!-- 已有评审意见 -->
        <el-card class="reviews-card" shadow="hover" v-if="reviews.length > 0">
          <template #header>
            <div class="card-header">
              <h3>
                <el-icon><ChatLineRound /></el-icon> 其他专家评审
              </h3>
              <span class="count-badge">{{ reviews.length }}条</span>
            </div>
          </template>

          <div class="reviews-list">
            <div v-for="review in reviews" :key="review.id" class="review-item">
              <div class="review-header">
                <div class="reviewer-info">
                  <div class="reviewer-avatar">{{ getInitial(review.reviewer_name) }}</div>
                  <div class="reviewer-details">
                    <span class="reviewer-name">{{ review.reviewer_name }}</span>
                    <span class="reviewer-title">{{ review.reviewer_title }}</span>
                  </div>
                </div>
                <div class="review-meta">
                  <span class="review-date">{{ formatDate(review.review_date) }}</span>
                  <el-tag
                    :type="getConclusionType(review.recommendation)"
                    size="small"
                    class="review-conclusion"
                  >
                    {{ getConclusionText(review.recommendation) }}
                  </el-tag>
                </div>
              </div>

              <div class="review-scores">
                <div class="score-item" v-if="review.innovation_score">
                  <span class="score-label">创新性</span>
                  <div class="score-bar">
                    <div
                      class="score-fill"
                      :style="{ width: (review.innovation_score / 10) * 100 + '%' }"
                      :class="getScoreClass(review.innovation_score)"
                    ></div>
                  </div>
                  <span class="score-value">{{ review.innovation_score.toFixed(1) }}</span>
                </div>

                <div class="score-item" v-if="review.feasibility_score">
                  <span class="score-label">可行性</span>
                  <div class="score-bar">
                    <div
                      class="score-fill"
                      :style="{ width: (review.feasibility_score / 10) * 100 + '%' }"
                      :class="getScoreClass(review.feasibility_score)"
                    ></div>
                  </div>
                  <span class="score-value">{{ review.feasibility_score.toFixed(1) }}</span>
                </div>

                <div class="score-total">
                  <span class="total-label">综合评分：</span>
                  <span class="total-value">{{ review.total_score.toFixed(1) }}</span>
                  <el-rate
                    v-model="review.total_score"
                    disabled
                    :max="10"
                    :allow-half="true"
                    size="small"
                  />
                </div>
              </div>

              <div class="review-comment" v-if="!review.is_confidential && review.comments">
                <div class="comment-text">{{ truncateText(review.comments, 150) }}</div>
                <div class="comment-more" v-if="review.comments.length > 150">
                  <el-button type="text" size="small" @click="viewFullReview(review)">
                    查看完整评审
                  </el-button>
                </div>
              </div>

              <div class="confidential-notice" v-else-if="review.is_confidential">
                <el-alert
                  title="此评审意见对申请人保密"
                  type="warning"
                  :closable="false"
                  center
                  show-icon
                />
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-text">正在加载项目详情...</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  EditPen,
  View,
  Edit,
  Refresh,
  InfoFilled,
  Document,
  Flag,
  User,
  Coin,
  ChatLineRound,
} from '@element-plus/icons-vue'
import request from '@/utils/request'

const router = useRouter()
const route = useRoute()

// 状态管理
const loading = ref(false)
const project = ref<any>({
  id: '',
  project_code: '',
  title: '',
  status: '',
  category: '',
  research_field: '',
  abstract: '',
  objectives: '',
  methodology: '',
  expected_outcomes: '',
  budget_total: 0,
  duration_months: 0,
  submit_date: '',
  review_deadline: '',
  applicant_name: '',
  applicant_department: '',
  keywords: '',
  background: '',
  remarks: '',
})
const members = ref<any[]>([])
const budget = ref<any[]>([])
const achievements = ref<any[]>([])
const reviews = ref<any[]>([])
const myReview = ref<any>(null)
const stages = ref<any[]>([])

// 计算属性
const totalBudget = computed(() => {
  return budget.value.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
})

// 方法
const loadProjectDetail = async () => {
  loading.value = true
  try {
    const projectId = route.params.id

    const response = await request.get(`/api/reviewer/projects/${projectId}`)

    if (response.success) {
      project.value = response.data.project || {}
      members.value = response.data.members || []
      budget.value = response.data.budget || []
      achievements.value = response.data.achievements || []
      reviews.value = response.data.reviews || []
      myReview.value = response.data.myReview
      stages.value = response.data.stages || []

      console.log('✅ 评审专家项目详情加载成功')
    } else {
      ElMessage.error('加载项目详情失败')
    }
  } catch (error) {
    console.error('加载项目详情失败:', error)
    ElMessage.error('加载项目详情失败')
  } finally {
    loading.value = false
  }
}

const startReview = () => {
  ElMessageBox.confirm('开始评审此项目？', '确认开始评审', {
    confirmButtonText: '开始评审',
    cancelButtonText: '取消',
    type: 'info',
  }).then(() => {
    router.push({
      path: '/reviewer/review',
      query: {
        projectId: project.value.id,
        projectCode: project.value.project_code,
      },
    })
  })
}

const continueReview = () => {
  router.push({
    path: '/reviewer/review',
    query: {
      projectId: project.value.id,
      projectCode: project.value.project_code,
    },
  })
}

const viewMyReview = () => {
  if (myReview.value) {
    router.push(`/reviewer/reviews/${myReview.value.id}`)
  }
}

const viewFullReview = (review: any) => {
  router.push(`/reviewer/reviews/${review.id}`)
}

const refreshData = () => {
  loadProjectDetail()
  ElMessage.success('数据已刷新')
}

const goBack = () => {
  router.back()
}

// 辅助函数
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

const getReviewStatusText = (status: string) => {
  const map: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    locked: '已锁定',
  }
  return map[status] || status
}

const getRoleType = (role: string) => {
  const map: Record<string, string> = {
    principal: 'danger',
    co_researcher: 'warning',
    research_assistant: 'primary',
    student: 'info',
    other: '',
  }
  return map[role] || ''
}

const getRoleText = (role: string) => {
  const map: Record<string, string> = {
    principal: '负责人',
    co_researcher: '合作研究员',
    research_assistant: '科研助理',
    student: '学生',
    other: '其他',
  }
  return map[role] || role
}

const getConclusionType = (conclusion: string) => {
  const map: Record<string, string> = {
    approve: 'success',
    approve_with_revision: 'warning',
    reject: 'danger',
    resubmit: 'info',
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

const getScoreClass = (score: number) => {
  if (score >= 9) return 'excellent'
  if (score >= 7) return 'good'
  if (score >= 5) return 'average'
  return 'poor'
}

const getDeadlineClass = (deadline: string) => {
  if (!deadline) return ''
  const date = new Date(deadline)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'expired'
  if (diffDays <= 3) return 'urgent'
  if (diffDays <= 7) return 'warning'
  return ''
}

const getDiffClass = (diff: number) => {
  return diff > 0 ? 'positive' : diff < 0 ? 'negative' : 'neutral'
}

const formatCurrency = (amount: number) => {
  if (!amount) return '¥0'
  const num = Number(amount)
  if (num >= 100000000) return '¥' + (num / 100000000).toFixed(2) + '亿'
  if (num >= 10000) return '¥' + (num / 10000).toFixed(2) + '万'
  return '¥' + num.toFixed(2)
}

const formatDate = (dateString: string) => {
  if (!dateString) return '未设置'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  } catch {
    return dateString
  }
}

const formatTime = (dateString: string) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return '今天'
    if (diffDays === 1) return '昨天'
    if (diffDays < 7) return `${diffDays}天前`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`
    return formatDate(dateString)
  } catch {
    return dateString
  }
}

const formatText = (text: string) => {
  if (!text) return ''
  return text.replace(/\n/g, '<br>')
}

const truncateText = (text: string, maxLength: number) => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

const getInitial = (name: string) => {
  if (!name) return '?'
  return name.charAt(0).toUpperCase()
}

// 生命周期
onMounted(() => {
  loadProjectDetail()
})
</script>

<style scoped>
.reviewer-project-detail {
  min-height: 100vh;
  background: #f5f7fa;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 顶部导航 */
.detail-header {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  color: white;
  padding: 0 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.header-content {
  display: flex;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;
  margin-right: 24px;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.header-info {
  flex: 1;
}

.project-title {
  margin: 0 0 8px 0;
  font-size: 22px;
  font-weight: 600;
  color: white;
}

.project-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.project-code {
  font-family: 'Monaco', 'Consolas', monospace;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}

.category {
  opacity: 0.9;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.review-btn {
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
  border: none;
  font-weight: 500;
}

.my-review-btn {
  background: linear-gradient(135deg, #722ed1 0%, #531dab 100%);
  border: none;
  font-weight: 500;
}

.continue-btn {
  background: linear-gradient(135deg, #faad14 0%, #d48806 100%);
  border: none;
  font-weight: 500;
}

.refresh-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
}

.refresh-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.review-status {
  text-align: right;
}

.status-indicator {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.status-text {
  font-size: 14px;
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.2);
}

.status-indicator.draft .status-text {
  background: #fff3cd;
  color: #856404;
}

.status-indicator.submitted .status-text {
  background: #d4edda;
  color: #155724;
}

.status-indicator.locked .status-text {
  background: #f8d7da;
  color: #721c24;
}

.status-time {
  font-size: 12px;
  opacity: 0.8;
}

/* 主内容区域 */
.detail-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

@media (max-width: 1200px) {
  .detail-content {
    grid-template-columns: 1fr;
  }
}

/* 卡片通用样式 */
.info-card,
.abstract-card,
.goals-card,
.members-card,
.budget-card,
.reviews-card {
  background: white;
  border-radius: 12px;
  border: none;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition:
    transform 0.3s,
    box-shadow 0.3s;
}

.info-card:hover,
.abstract-card:hover,
.goals-card:hover,
.members-card:hover,
.budget-card:hover,
.reviews-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 8px;
}

.count-badge {
  background: #1890ff;
  color: white;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.budget-total {
  font-size: 18px;
  font-weight: 600;
  color: #1890ff;
}

/* 基本信息网格 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 20px;
}

@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item label {
  font-size: 13px;
  color: #7f8c8d;
  font-weight: 500;
}

.info-item span {
  font-size: 14px;
  color: #2c3e50;
  line-height: 1.4;
}

.info-item .applicant {
  font-weight: 600;
  color: #1890ff;
}

.info-item .research-field {
  font-weight: 500;
}

.info-item .budget {
  font-weight: 600;
  color: #52c41a;
}

.info-item .keywords {
  color: #722ed1;
  font-style: italic;
}

.expired {
  color: #ff4d4f;
}

.urgent {
  color: #fa8c16;
  font-weight: 600;
}

.warning {
  color: #fadb14;
  font-weight: 500;
}

/* 摘要内容 */
.abstract-content {
  padding: 20px;
}

.content-text {
  color: #606266;
  line-height: 1.8;
  font-size: 14px;
}

/* 研究目标 */
.goals-content {
  padding: 20px;
}

.section {
  margin-bottom: 24px;
}

.section:last-child {
  margin-bottom: 0;
}

.section h4 {
  margin: 0 0 12px 0;
  font-size: 15px;
  color: #303133;
  font-weight: 600;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

/* 项目成员 */
.members-list {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.member-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: #fafafa;
  transition: all 0.3s;
}

.member-item:hover {
  border-color: #1890ff;
  background: #f0f9ff;
}

.member-avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 16px;
  flex-shrink: 0;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.member-name {
  font-weight: 600;
  color: #2c3e50;
  font-size: 15px;
}

.member-details {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 13px;
  color: #7f8c8d;
}

.member-workload {
  font-size: 13px;
}

.workload-label {
  color: #7f8c8d;
}

.workload-value {
  color: #1890ff;
  font-weight: 500;
}

.member-responsibility {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e8e8e8;
}

.responsibility-text {
  font-size: 13px;
  color: #606266;
  font-style: italic;
}

/* 项目预算 */
.budget-list {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.budget-item {
  padding: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: white;
}

.budget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  gap: 12px;
}

.budget-name {
  flex: 1;
  font-weight: 500;
  color: #2c3e50;
  font-size: 14px;
}

.budget-amount {
  font-weight: 600;
  color: #1890ff;
  font-size: 15px;
  min-width: 80px;
  text-align: right;
}

.budget-details {
  padding-top: 8px;
  border-top: 1px solid #f5f5f5;
}

.budget-desc {
  font-size: 13px;
  color: #7f8c8d;
  line-height: 1.6;
}

.budget-summary {
  padding: 20px;
  border-top: 1px solid #f0f0f0;
  background: #f8f9fa;
  border-radius: 0 0 12px 12px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.summary-label {
  font-size: 15px;
  color: #606266;
}

.summary-value {
  font-size: 20px;
  font-weight: 600;
  color: #1890ff;
}

.summary-diff {
  font-size: 16px;
  font-weight: 500;
}

.summary-diff.positive {
  color: #52c41a;
}

.summary-diff.negative {
  color: #ff4d4f;
}

.summary-diff.neutral {
  color: #7f8c8d;
}

/* 评审意见 */
.reviews-list {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.review-item {
  padding: 20px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: #fafafa;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.reviewer-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.reviewer-avatar {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #722ed1 0%, #531dab 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
}

.reviewer-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.reviewer-name {
  font-weight: 500;
  color: #2c3e50;
  font-size: 14px;
}

.reviewer-title {
  font-size: 12px;
  color: #7f8c8d;
}

.review-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.review-date {
  font-size: 12px;
  color: #7f8c8d;
}

.review-conclusion {
  font-weight: 500;
}

.review-scores {
  margin-bottom: 16px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.score-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.score-item:last-child {
  margin-bottom: 0;
}

.score-label {
  font-size: 13px;
  color: #606266;
  width: 60px;
}

.score-bar {
  flex: 1;
  height: 6px;
  background: #f5f5f5;
  border-radius: 3px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.score-fill.excellent {
  background: linear-gradient(90deg, #52c41a, #73d13d);
}

.score-fill.good {
  background: linear-gradient(90deg, #1890ff, #40a9ff);
}

.score-fill.average {
  background: linear-gradient(90deg, #faad14, #ffc53d);
}

.score-fill.poor {
  background: linear-gradient(90deg, #ff4d4f, #ff7875);
}

.score-value {
  font-size: 13px;
  font-weight: 600;
  color: #1890ff;
  width: 40px;
  text-align: right;
}

.score-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.total-label {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.total-value {
  font-size: 18px;
  font-weight: 700;
  color: #52c41a;
}

.review-comment {
  padding: 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.comment-text {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  margin-bottom: 8px;
}

.comment-more {
  text-align: right;
}

.confidential-notice {
  padding: 12px;
}

/* 加载状态 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.loading-content {
  text-align: center;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-text {
  color: #666;
  font-size: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .detail-header {
    padding: 0 16px;
  }

  .detail-content {
    padding: 16px;
  }

  .header-actions {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .action-buttons {
    flex-wrap: wrap;
  }

  .review-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .review-meta {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
