<!-- src/views/reviewer/ReviewProject.vue -->
<template>
  <div class="review-project-page">
    <el-page-header @back="goBack">
      <template #content>
        <div class="page-header-content">
          <h1>项目评审</h1>
          <span class="subtitle">项目编号：{{ projectData.project_code }}</span>
        </div>
      </template>
      <template #extra>
        <el-button @click="saveDraft" :loading="saving">
          <el-icon><Document /></el-icon>
          保存草稿
        </el-button>
        <el-button type="primary" @click="submitReview" :loading="submitting">
          <el-icon><Check /></el-icon>
          提交评审
        </el-button>
      </template>
    </el-page-header>

    <div class="content-container">
      <!-- 项目基本信息 -->
      <el-card class="section-card" shadow="never">
        <template #header>
          <h3>项目基本信息</h3>
        </template>

        <div class="project-basic-info">
          <div class="info-grid">
            <div class="info-item">
              <label>项目名称：</label>
              <span>{{ projectData.title }}</span>
            </div>

            <div class="info-item">
              <label>申请人：</label>
              <span>{{ projectData.applicant_name }}</span>
            </div>

            <div class="info-item">
              <label>所属单位：</label>
              <span>{{ projectData.applicant_department }}</span>
            </div>

            <div class="info-item">
              <label>项目类别：</label>
              <span>{{ projectData.category }}</span>
            </div>

            <div class="info-item">
              <label>研究领域：</label>
              <span>{{ projectData.research_field }}</span>
            </div>

            <div class="info-item">
              <label>总预算：</label>
              <span>{{ formatCurrency(projectData.budget_total) }}</span>
            </div>

            <div class="info-item">
              <label>研究周期：</label>
              <span>{{ projectData.duration_months }}个月</span>
            </div>
          </div>
        </div>

        <div class="project-abstract">
          <h4>项目摘要</h4>
          <p>{{ projectData.abstract }}</p>
        </div>
      </el-card>

      <!-- 评审表单 -->
      <el-card class="section-card review-form" shadow="never">
        <template #header>
          <h3>评审意见</h3>
        </template>

        <el-form :model="reviewForm" :rules="rules" ref="reviewFormRef" label-width="120px">
          <!-- 评分部分 - 使用滑动条 -->
          <div class="score-section">
            <h4>项目评分（1-10分）</h4>

            <!-- 创新性评分 -->
            <div class="score-item-row">
              <div class="score-item-header">
                <span class="score-label">创新性：</span>
                <span class="score-value-display">{{
                  reviewForm.innovation_score.toFixed(1)
                }}</span>
                <el-rate
                  v-model="reviewForm.innovation_score"
                  disabled
                  :max="10"
                  :allow-half="true"
                  size="small"
                  class="score-rate-preview"
                />
              </div>
              <div class="slider-container">
                <el-slider
                  v-model="reviewForm.innovation_score"
                  :min="0"
                  :max="10"
                  :step="0.5"
                  show-stops
                  show-input
                  input-size="small"
                  :marks="scoreMarks"
                  @change="updateScore('innovation_score')"
                >
                  <template #mark="{ mark, position }">
                    <div
                      class="custom-slider-mark"
                      :style="{ left: position + '%' }"
                      :title="mark.label"
                    >
                      {{ mark.label }}
                    </div>
                  </template>
                </el-slider>
                <div class="slider-legend">
                  <span class="legend-item poor">差 (1-3分)</span>
                  <span class="legend-item average">中 (4-6分)</span>
                  <span class="legend-item good">良 (7-8分)</span>
                  <span class="legend-item excellent">优 (9-10分)</span>
                </div>
              </div>
            </div>

            <!-- 可行性评分 -->
            <div class="score-item-row">
              <div class="score-item-header">
                <span class="score-label">可行性：</span>
                <span class="score-value-display">{{
                  reviewForm.feasibility_score.toFixed(1)
                }}</span>
                <el-rate
                  v-model="reviewForm.feasibility_score"
                  disabled
                  :max="10"
                  :allow-half="true"
                  size="small"
                  class="score-rate-preview"
                />
              </div>
              <div class="slider-container">
                <el-slider
                  v-model="reviewForm.feasibility_score"
                  :min="0"
                  :max="10"
                  :step="0.5"
                  show-stops
                  show-input
                  input-size="small"
                  :marks="scoreMarks"
                  @change="updateScore('feasibility_score')"
                />
              </div>
            </div>

            <!-- 意义价值评分 -->
            <div class="score-item-row">
              <div class="score-item-header">
                <span class="score-label">意义价值：</span>
                <span class="score-value-display">{{
                  reviewForm.significance_score.toFixed(1)
                }}</span>
                <el-rate
                  v-model="reviewForm.significance_score"
                  disabled
                  :max="10"
                  :allow-half="true"
                  size="small"
                  class="score-rate-preview"
                />
              </div>
              <div class="slider-container">
                <el-slider
                  v-model="reviewForm.significance_score"
                  :min="0"
                  :max="10"
                  :step="0.5"
                  show-stops
                  show-input
                  input-size="small"
                  :marks="scoreMarks"
                  @change="updateScore('significance_score')"
                />
              </div>
            </div>

            <!-- 团队基础评分 -->
            <div class="score-item-row">
              <div class="score-item-header">
                <span class="score-label">团队基础：</span>
                <span class="score-value-display">{{ reviewForm.team_score.toFixed(1) }}</span>
                <el-rate
                  v-model="reviewForm.team_score"
                  disabled
                  :max="10"
                  :allow-half="true"
                  size="small"
                  class="score-rate-preview"
                />
              </div>
              <div class="slider-container">
                <el-slider
                  v-model="reviewForm.team_score"
                  :min="0"
                  :max="10"
                  :step="0.5"
                  show-stops
                  show-input
                  input-size="small"
                  :marks="scoreMarks"
                  @change="updateScore('team_score')"
                />
              </div>
            </div>

            <!-- 预算合理性评分 -->
            <div class="score-item-row">
              <div class="score-item-header">
                <span class="score-label">预算合理性：</span>
                <span class="score-value-display">{{ reviewForm.budget_score.toFixed(1) }}</span>
                <el-rate
                  v-model="reviewForm.budget_score"
                  disabled
                  :max="10"
                  :allow-half="true"
                  size="small"
                  class="score-rate-preview"
                />
              </div>
              <div class="slider-container">
                <el-slider
                  v-model="reviewForm.budget_score"
                  :min="0"
                  :max="10"
                  :step="0.5"
                  show-stops
                  show-input
                  input-size="small"
                  :marks="scoreMarks"
                  @change="updateScore('budget_score')"
                />
              </div>
            </div>

            <!-- 综合评分显示 -->
            <div class="total-score-row">
              <div class="total-score-left">
                <span class="total-score-label">综合评分：</span>
                <span class="total-score-value">{{ totalScore.toFixed(1) }}</span>
              </div>
              <div class="total-score-right">
                <el-rate v-model="totalScore" disabled :max="10" :allow-half="true" size="large" />
                <span class="score-level" :class="getScoreLevelClass(totalScore)">
                  {{ getScoreLevelText(totalScore) }}
                </span>
              </div>
            </div>
          </div>

          <!-- 文本评价部分 -->
          <div class="text-review-section">
            <el-form-item label="项目优点：" prop="strengths">
              <el-input
                v-model="reviewForm.strengths"
                type="textarea"
                :rows="3"
                placeholder="请描述项目的优势和创新点"
                maxlength="1000"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="不足之处：" prop="weaknesses">
              <el-input
                v-model="reviewForm.weaknesses"
                type="textarea"
                :rows="3"
                placeholder="请指出项目存在的不足和问题"
                maxlength="1000"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="评审结论：" prop="recommendation" class="recommendation-form-item">
              <el-radio-group v-model="reviewForm.recommendation" class="recommendation-group">
                <el-radio label="approve" class="recommendation-item approve">
                  <span class="recommendation-label">通过</span>
                </el-radio>
                <el-radio
                  label="approve_with_revision"
                  class="recommendation-item approve-with-revision"
                >
                  <span class="recommendation-label">修改后通过</span>
                </el-radio>
                <el-radio label="resubmit" class="recommendation-item resubmit">
                  <span class="recommendation-label">重新提交</span>
                </el-radio>
                <el-radio label="reject" class="recommendation-item reject">
                  <span class="recommendation-label">不通过</span>
                </el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="评审意见：" prop="comments">
              <el-input
                v-model="reviewForm.comments"
                type="textarea"
                :rows="6"
                placeholder="请详细阐述您的评审意见和建议"
                maxlength="2000"
                show-word-limit
                required
              />
            </el-form-item>

            <el-form-item label="修改建议：" prop="suggestions">
              <el-input
                v-model="reviewForm.suggestions"
                type="textarea"
                :rows="4"
                placeholder="如有需要，请提供具体的修改建议"
                maxlength="1000"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="保密设置：" prop="is_confidential">
              <el-switch
                v-model="reviewForm.is_confidential"
                active-text="对申请人保密"
                inactive-text="向申请人公开"
                :active-value="true"
                :inactive-value="false"
              />
              <span class="confidential-tip">（选择保密后，评审意见不会向申请人显示）</span>
            </el-form-item>
          </div>
        </el-form>
      </el-card>

      <!-- 其他专家评审（如果已存在） -->
      <el-card v-if="otherReviews.length > 0" class="section-card" shadow="never">
        <template #header>
          <h3>其他专家评审意见</h3>
        </template>

        <div class="other-reviews">
          <div v-for="review in otherReviews" :key="review.id" class="review-item">
            <div class="review-header">
              <span class="reviewer-name">{{ review.reviewer_name }}</span>
              <el-tag :type="getConclusionType(review.recommendation)" size="small">
                {{ getConclusionText(review.recommendation) }}
              </el-tag>
              <span class="review-score">综合评分：{{ review.total_score }}</span>
            </div>

            <div class="review-scores-breakdown">
              <div class="score-breakdown-item">
                <span>创新性：{{ review.innovation_score }}</span>
                <span>可行性：{{ review.feasibility_score }}</span>
                <span>意义价值：{{ review.significance_score }}</span>
              </div>
            </div>

            <p v-if="!review.is_confidential" class="review-comment">
              {{ review.comments }}
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
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox, FormInstance } from 'element-plus'
import { Document, Check } from '@element-plus/icons-vue'
import request from '@/utils/request'

const router = useRouter()
const route = useRoute()
const reviewFormRef = ref<FormInstance>()

// 状态管理
const loading = ref(false)
const saving = ref(false)
const submitting = ref(false)
const projectData = ref<any>({})
const otherReviews = ref<any[]>([])
const existingReview = ref<any>(null)

// 评分刻度标记
const scoreMarks = ref({
  0: { label: '0', style: { color: '#909399' } },
  2.5: { label: '2.5', style: { color: '#909399' } },
  5: { label: '5', style: { color: '#909399' } },
  7.5: { label: '7.5', style: { color: '#909399' } },
  10: { label: '10', style: { color: '#909399' } },
})

// 评审表单
const reviewForm = ref({
  innovation_score: 0,
  feasibility_score: 0,
  significance_score: 0,
  team_score: 0,
  budget_score: 0,
  strengths: '',
  weaknesses: '',
  recommendation: '',
  comments: '',
  suggestions: '',
  is_confidential: false,
})

// 计算属性
const totalScore = computed(() => {
  const scores = [
    reviewForm.value.innovation_score,
    reviewForm.value.feasibility_score,
    reviewForm.value.significance_score,
    reviewForm.value.team_score,
    reviewForm.value.budget_score,
  ]
  const validScores = scores.filter((score) => score > 0)
  return validScores.length > 0
    ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length
    : 0
})

// 表单验证规则
const rules = {
  comments: [{ required: true, message: '评审意见不能为空', trigger: 'blur' }],
  recommendation: [{ required: true, message: '请选择评审结论', trigger: 'change' }],
}

// 方法
const loadProjectData = async () => {
  loading.value = true
  try {
    const projectId = route.query.projectId
    if (!projectId) {
      ElMessage.error('项目ID不存在')
      router.back()
      return
    }

    const response = await request.get('/api/reviewer/project-for-review', {
      params: { projectId },
    })

    if (response.success) {
      projectData.value = response.data.project
      otherReviews.value = response.data.otherReviews || []
      existingReview.value = response.data.existingReview

      // 如果有已存在的评审，加载数据
      if (existingReview.value) {
        loadExistingReview()
      }
    } else {
      ElMessage.error('加载项目数据失败')
      router.back()
    }
  } catch (error) {
    console.error('加载项目数据失败:', error)
    ElMessage.error('加载项目数据失败')
    router.back()
  } finally {
    loading.value = false
  }
}

const loadExistingReview = async () => {
  if (!existingReview.value) return

  try {
    const response = await request.get('/api/reviewer/review-detail', {
      params: { reviewId: existingReview.value.id },
    })

    if (response.success && response.data.review) {
      const review = response.data.review
      reviewForm.value = {
        innovation_score: review.innovation_score || 0,
        feasibility_score: review.feasibility_score || 0,
        significance_score: review.significance_score || 0,
        team_score: review.team_score || 0,
        budget_score: review.budget_score || 0,
        strengths: review.strengths || '',
        weaknesses: review.weaknesses || '',
        recommendation: review.recommendation || '',
        comments: review.comments || '',
        suggestions: review.suggestions || '',
        is_confidential: review.is_confidential || false,
      }
    }
  } catch (error) {
    console.error('加载已有评审失败:', error)
  }
}

const updateScore = (scoreType: string) => {
  // 可以在这里添加分数变化的逻辑
  console.log(`${scoreType} 分数更新为: ${reviewForm.value[scoreType]}`)
}

const getScoreLevelClass = (score: number) => {
  if (score >= 9) return 'excellent'
  if (score >= 7) return 'good'
  if (score >= 5) return 'average'
  return 'poor'
}

const getScoreLevelText = (score: number) => {
  if (score >= 9) return '优秀'
  if (score >= 7) return '良好'
  if (score >= 5) return '中等'
  return '待改进'
}

const saveDraft = async () => {
  saving.value = true
  try {
    await request.post('/api/reviewer/save-review-draft', {
      project_id: projectData.value.id,
      ...reviewForm.value,
    })
    ElMessage.success('草稿保存成功')
  } catch (error) {
    console.error('保存草稿失败:', error)
    ElMessage.error('保存草稿失败')
  } finally {
    saving.value = false
  }
}

const submitReview = async () => {
  if (!reviewFormRef.value) return

  await reviewFormRef.value.validate(async (valid) => {
    if (!valid) {
      ElMessage.warning('请填写完整的评审信息')
      return
    }

    await ElMessageBox.confirm('确认提交评审意见？提交后将无法修改。', '确认提交', {
      confirmButtonText: '确认提交',
      cancelButtonText: '取消',
      type: 'warning',
    })

    submitting.value = true
    try {
      await request.post('/api/reviewer/submit-review', {
        project_id: projectData.value.id,
        ...reviewForm.value,
      })

      ElMessage.success('评审提交成功')
      router.push('/reviewer/dashboard')
    } catch (error) {
      console.error('提交评审失败:', error)
      ElMessage.error('提交评审失败')
    } finally {
      submitting.value = false
    }
  })
}

const goBack = () => {
  router.back()
}

// 辅助函数
const formatCurrency = (amount: number) => {
  if (!amount) return '¥0'
  const num = Number(amount)
  if (num >= 100000000) return '¥' + (num / 100000000).toFixed(2) + '亿'
  if (num >= 10000) return '¥' + (num / 10000).toFixed(2) + '万'
  return '¥' + num.toFixed(2)
}

const formatDate = (dateString: string) => {
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

// 生命周期
onMounted(() => {
  loadProjectData()
})
</script>

<style scoped>
.review-project-page {
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

.project-basic-info {
  padding: 20px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
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
  flex: 1;
}

.project-abstract {
  padding: 20px;
  border-top: 1px solid #f0f0f0;
}

.project-abstract h4 {
  margin: 0 0 12px 0;
  color: #303133;
}

.project-abstract p {
  margin: 0;
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
}

.review-form :deep(.el-form-item) {
  margin-bottom: 24px;
}

/* 评分部分样式 */
.score-section {
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 24px;
}

.score-section h4 {
  margin: 0 0 24px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.score-item-row {
  margin-bottom: 24px;
  padding: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: #fafafa;
  transition: all 0.3s;
}

.score-item-row:hover {
  border-color: #1890ff;
  background: #f0f9ff;
}

.score-item-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
}

.score-label {
  font-weight: 600;
  color: #303133;
  font-size: 15px;
  min-width: 80px;
}

.score-value-display {
  font-weight: bold;
  font-size: 18px;
  color: #1890ff;
  min-width: 40px;
  text-align: center;
}

.score-rate-preview {
  margin-left: auto;
}

.slider-container {
  padding: 0 8px;
}

:deep(.el-slider) {
  width: 100%;
}

:deep(.el-slider__runway) {
  height: 8px;
  background: linear-gradient(
    90deg,
    #ff4d4f 0%,
    #ff4d4f 30%,
    #faad14 30%,
    #faad14 60%,
    #1890ff 60%,
    #1890ff 80%,
    #52c41a 80%,
    #52c41a 100%
  );
}

:deep(.el-slider__bar) {
  height: 8px;
  background: transparent;
}

:deep(.el-slider__button) {
  width: 20px;
  height: 20px;
  border: 2px solid #1890ff;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

:deep(.el-slider__button-wrapper) {
  z-index: 2;
}

:deep(.el-slider__stop) {
  width: 2px;
  height: 12px;
  background: #fff;
  border: 1px solid #d9d9d9;
}

.custom-slider-mark {
  position: absolute;
  transform: translateX(-50%);
  top: 20px;
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}

.slider-legend {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  padding: 0 4px;
}

.legend-item {
  font-size: 11px;
  color: #909399;
  position: relative;
  padding-left: 12px;
}

.legend-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.legend-item.poor::before {
  background: #ff4d4f;
}

.legend-item.average::before {
  background: #faad14;
}

.legend-item.good::before {
  background: #1890ff;
}

.legend-item.excellent::before {
  background: #52c41a;
}

/* 综合评分样式 */
.total-score-row {
  margin-top: 24px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-score-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.total-score-label {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.total-score-value {
  font-size: 32px;
  font-weight: bold;
  color: #1890ff;
}

.total-score-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.score-level {
  font-size: 16px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 6px;
}

.score-level.excellent {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.score-level.good {
  background: #e6f7ff;
  color: #1890ff;
  border: 1px solid #91d5ff;
}

.score-level.average {
  background: #fff7e6;
  color: #faad14;
  border: 1px solid #ffd591;
}

.score-level.poor {
  background: #fff2f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
}

/* 文本评价部分 */
.text-review-section {
  padding: 20px;
}

/* 评审结论样式 */
/* 评审结论样式 */
.recommendation-form-item :deep(.el-form-item__content) {
  line-height: 1;
}

.recommendation-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  width: 100%;
}

.recommendation-item {
  margin: 0 !important;
  padding: 8px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #fafafa;
  transition: all 0.2s ease;
  height: 36px;
  line-height: 20px;
  display: flex;
  align-items: center;
}

.recommendation-item:hover {
  border-color: #1890ff;
  background: #f0f9ff;
}

:deep(.el-radio__input.is-checked + .recommendation-item) {
  border-color: #1890ff;
  background: #e6f7ff;
}

/* 单选按钮和标签在同一行对齐 */
.recommendation-item :deep(.el-radio__label) {
  padding-left: 8px;
  font-size: 14px;
  color: #333;
  display: flex;
  align-items: center;
}

/* 不同结论的颜色样式 */
.recommendation-item.approve :deep(.el-radio__label) {
  color: #52c41a;
}

.recommendation-item.approve-with-revision :deep(.el-radio__label) {
  color: #faad14;
}

.recommendation-item.resubmit :deep(.el-radio__label) {
  color: #1890ff;
}

.recommendation-item.reject :deep(.el-radio__label) {
  color: #ff4d4f;
}

/* 选中状态的颜色 */
.recommendation-item.approve :deep(.el-radio__input.is-checked + .el-radio__label) {
  color: #52c41a;
  font-weight: 600;
}

.recommendation-item.approve-with-revision :deep(.el-radio__input.is-checked + .el-radio__label) {
  color: #faad14;
  font-weight: 600;
}

.recommendation-item.resubmit :deep(.el-radio__input.is-checked + .el-radio__label) {
  color: #1890ff;
  font-weight: 600;
}

.recommendation-item.reject :deep(.el-radio__input.is-checked + .el-radio__label) {
  color: #ff4d4f;
  font-weight: 600;
}

/* 单选按钮样式调整 */
.recommendation-item :deep(.el-radio__inner) {
  width: 16px;
  height: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .recommendation-group {
    gap: 8px;
  }

  .recommendation-item {
    padding: 6px 12px;
    font-size: 13px;
  }
}

.confidential-tip {
  font-size: 12px;
  color: #909399;
  margin-left: 12px;
}

/* 其他专家评审 */
.other-reviews {
  padding: 20px;
}

.review-item {
  padding: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  margin-bottom: 12px;
}

.review-header {
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

.review-score {
  font-size: 14px;
  color: #1890ff;
  margin-left: auto;
}

.review-scores-breakdown {
  margin-bottom: 12px;
  padding: 8px 0;
  border-top: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
}

.score-breakdown-item {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #606266;
}

.review-comment {
  margin: 0 0 12px 0;
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
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

/* 响应式设计 */
@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .score-item-header {
    flex-wrap: wrap;
    gap: 8px;
  }

  .total-score-row {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .slider-legend {
    flex-direction: column;
    gap: 4px;
  }

  .score-breakdown-item {
    flex-direction: column;
    gap: 4px;
  }

  .review-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .review-score {
    margin-left: 0;
  }
}
</style>
