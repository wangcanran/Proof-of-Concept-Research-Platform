<template>
  <div class="review-detail-page">
    <el-page-header @back="goBack">
      <template #content>
        <div class="page-header-content">
          <h1>评审详情</h1>
          <span class="subtitle">评审编号：{{ reviewData.id }}</span>
        </div>
      </template>
    </el-page-header>

    <div class="content-container">
      <!-- 评审基本信息 -->
      <el-card class="section-card" shadow="never">
        <template #header>
          <div class="section-header">
            <h3>评审基本信息</h3>
            <el-tag :type="getConclusionType(reviewData.recommendation)" size="large">
              {{ getConclusionText(reviewData.recommendation) }}
            </el-tag>
          </div>
        </template>

        <div class="basic-info-grid">
          <div class="info-item">
            <label>项目名称：</label>
            <span>{{ reviewData.project_title }}</span>
          </div>

          <div class="info-item">
            <label>项目编号：</label>
            <span>{{ reviewData.project_code }}</span>
          </div>

          <div class="info-item">
            <label>评审专家：</label>
            <span>{{ reviewData.reviewer_name }}</span>
            <span v-if="reviewData.reviewer_title" class="title">{{
              reviewData.reviewer_title
            }}</span>
          </div>

          <div class="info-item">
            <label>评审日期：</label>
            <span>{{ formatDateTime(reviewData.review_date) }}</span>
          </div>

          <div class="info-item">
            <label>评审类型：</label>
            <span>{{ getReviewTypeText(reviewData.review_type) }}</span>
          </div>

          <div class="info-item">
            <label>保密设置：</label>
            <el-tag :type="reviewData.is_confidential ? 'warning' : 'success'" size="small">
              {{ reviewData.is_confidential ? '对申请人保密' : '向申请人公开' }}
            </el-tag>
          </div>
        </div>
      </el-card>

      <!-- 评分详情 -->
      <el-card class="section-card" shadow="never">
        <template #header>
          <h3>评分详情</h3>
        </template>

        <div class="score-detail">
          <div class="score-section">
            <h4>各项评分</h4>
            <div class="score-items">
              <div class="score-item">
                <span class="score-label">创新性：</span>
                <el-rate
                  v-model="reviewData.innovation_score"
                  disabled
                  :max="10"
                  :allow-half="true"
                  size="large"
                />
                <span class="score-value">{{ reviewData.innovation_score }}</span>
              </div>

              <div class="score-item">
                <span class="score-label">可行性：</span>
                <el-rate
                  v-model="reviewData.feasibility_score"
                  disabled
                  :max="10"
                  :allow-half="true"
                  size="large"
                />
                <span class="score-value">{{ reviewData.feasibility_score }}</span>
              </div>

              <div class="score-item">
                <span class="score-label">意义价值：</span>
                <el-rate
                  v-model="reviewData.significance_score"
                  disabled
                  :max="10"
                  :allow-half="true"
                  size="large"
                />
                <span class="score-value">{{ reviewData.significance_score }}</span>
              </div>

              <div class="score-item">
                <span class="score-label">团队基础：</span>
                <el-rate
                  v-model="reviewData.team_score"
                  disabled
                  :max="10"
                  :allow-half="true"
                  size="large"
                />
                <span class="score-value">{{ reviewData.team_score }}</span>
              </div>

              <div class="score-item">
                <span class="score-label">预算合理性：</span>
                <el-rate
                  v-model="reviewData.budget_score"
                  disabled
                  :max="10"
                  :allow-half="true"
                  size="large"
                />
                <span class="score-value">{{ reviewData.budget_score }}</span>
              </div>
            </div>
          </div>

          <div class="total-score-section">
            <div class="total-score-card">
              <div class="total-score-label">综合评分</div>
              <div class="total-score-value">{{ reviewData.total_score.toFixed(1) }}</div>
              <div class="total-score-rating">
                <el-rate
                  v-model="reviewData.total_score"
                  disabled
                  :max="10"
                  :allow-half="true"
                  size="large"
                />
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 评审意见 -->
      <el-card class="section-card" shadow="never">
        <template #header>
          <h3>评审意见</h3>
        </template>

        <div class="review-content">
          <div v-if="reviewData.strengths" class="review-section">
            <h4>项目优点</h4>
            <div class="content-box">
              {{ reviewData.strengths }}
            </div>
          </div>

          <div v-if="reviewData.weaknesses" class="review-section">
            <h4>不足之处</h4>
            <div class="content-box">
              {{ reviewData.weaknesses }}
            </div>
          </div>

          <div class="review-section">
            <h4>评审意见</h4>
            <div class="content-box">
              {{ reviewData.comments }}
            </div>
          </div>

          <div v-if="reviewData.suggestions" class="review-section">
            <h4>修改建议</h4>
            <div class="content-box">
              {{ reviewData.suggestions }}
            </div>
          </div>
        </div>
      </el-card>

      <!-- 其他专家评审（如果存在） -->
      <el-card v-if="otherReviews.length > 0" class="section-card" shadow="never">
        <template #header>
          <h3>其他专家评审意见</h3>
        </template>

        <div class="other-reviews">
          <div v-for="review in otherReviews" :key="review.id" class="other-review-item">
            <div class="other-review-header">
              <span class="reviewer-name">{{ review.reviewer_name }}</span>
              <span v-if="review.reviewer_title" class="reviewer-title">{{
                review.reviewer_title
              }}</span>
              <el-tag :type="getConclusionType(review.recommendation)" size="small">
                {{ getConclusionText(review.recommendation) }}
              </el-tag>
              <span class="review-score">评分：{{ review.total_score }}</span>
            </div>

            <p v-if="!review.is_confidential" class="review-comment">
              {{ truncateText(review.comments, 200) }}
            </p>
            <p v-else class="confidential-comment">⚠️ 此评审意见对申请人保密</p>

            <div class="review-time">
              {{ formatDate(review.review_date) }}
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()
const route = useRoute()

// 状态管理
const loading = ref(false)
const reviewData = ref<any>({
  id: '',
  project_title: '',
  project_code: '',
  reviewer_name: '',
  reviewer_title: '',
  review_date: '',
  review_type: '',
  innovation_score: 0,
  feasibility_score: 0,
  significance_score: 0,
  team_score: 0,
  budget_score: 0,
  total_score: 0,
  strengths: '',
  weaknesses: '',
  recommendation: '',
  comments: '',
  suggestions: '',
  is_confidential: false,
})
const otherReviews = ref<any[]>([])

// 方法
const loadReviewDetail = async () => {
  loading.value = true
  try {
    const reviewId = route.params.id
    if (!reviewId) {
      ElMessage.error('评审ID不存在')
      router.back()
      return
    }

    const response = await request.get('/api/reviewer/review-detail', {
      params: { reviewId },
    })

    if (response.success) {
      reviewData.value = response.data.review || {}
      otherReviews.value = response.data.otherReviews || []
    } else {
      ElMessage.error('加载评审详情失败')
      router.back()
    }
  } catch (error) {
    console.error('加载评审详情失败:', error)
    ElMessage.error('加载评审详情失败')
    router.back()
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.back()
}

// 辅助函数
const formatDateTime = (dateString: string) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    return (
      date.toLocaleDateString('zh-CN') +
      ' ' +
      date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    )
  } catch {
    return dateString
  }
}

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  } catch {
    return dateString
  }
}

const getReviewTypeText = (type: string) => {
  const map: Record<string, string> = {
    initial: '初始评审',
    mid_term: '中期评审',
    final: '结题评审',
    special: '专项评审',
  }
  return map[type] || type
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

const truncateText = (text: string, maxLength: number) => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

// 生命周期
onMounted(() => {
  loadReviewDetail()
})
</script>

<style scoped>
.review-detail-page {
  min-height: 100vh;
  background: #f0f2f5;
  padding: 20px;
}

.page-header-content h1 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.page-header-content .subtitle {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.content-container {
  margin-top: 20px;
}

.section-card {
  margin-bottom: 20px;
  background: #ffffff;
  border-radius: 8px;
}

.section-card :deep(.el-card__header) {
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.section-card h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.basic-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  padding: 20px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.info-item label {
  font-weight: 500;
  color: #606266;
  min-width: 80px;
  text-align: right;
}

.info-item span {
  color: #303133;
}

.info-item .title {
  font-size: 12px;
  color: #909399;
  margin-left: 4px;
}

.score-detail {
  display: flex;
  gap: 40px;
  padding: 20px;
}

.score-section {
  flex: 1;
}

.score-section h4 {
  margin: 0 0 20px 0;
  color: #303133;
}

.score-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.score-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.score-label {
  font-weight: 500;
  color: #606266;
  min-width: 100px;
}

.score-value {
  font-weight: bold;
  color: #1890ff;
  min-width: 40px;
}

.total-score-section {
  width: 200px;
}

.total-score-card {
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  text-align: center;
  color: white;
}

.total-score-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.total-score-value {
  font-size: 36px;
  font-weight: bold;
  margin-bottom: 12px;
}

.total-score-rating :deep(.el-rate__icon) {
  font-size: 24px;
  margin-right: 2px;
}

.review-content {
  padding: 20px;
}

.review-section {
  margin-bottom: 24px;
}

.review-section h4 {
  margin: 0 0 12px 0;
  color: #303133;
  font-size: 16px;
}

.review-section .content-box {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  white-space: pre-wrap;
  line-height: 1.6;
  color: #606266;
}

.other-reviews {
  padding: 20px;
}

.other-review-item {
  padding: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  margin-bottom: 12px;
}

.other-review-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.reviewer-name {
  font-weight: 500;
  color: #303133;
}

.reviewer-title {
  font-size: 12px;
  color: #909399;
}

.review-score {
  font-size: 14px;
  color: #1890ff;
  margin-left: auto;
}

.review-comment {
  margin: 0 0 12px 0;
  color: #606266;
  line-height: 1.6;
}

.confidential-comment {
  margin: 0 0 12px 0;
  color: #faad14;
  font-style: italic;
}

.review-time {
  font-size: 12px;
  color: #909399;
  text-align: right;
}

@media (max-width: 768px) {
  .score-detail {
    flex-direction: column;
    gap: 24px;
  }

  .total-score-section {
    width: 100%;
  }

  .basic-info-grid {
    grid-template-columns: 1fr;
  }

  .other-review-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .review-score {
    margin-left: 0;
  }
}
</style>
