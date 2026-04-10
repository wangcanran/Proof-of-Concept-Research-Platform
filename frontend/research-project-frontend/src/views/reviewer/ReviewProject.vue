<!-- src/views/reviewer/ReviewProject.vue -->
<template>
  <div class="review-project-page">
    <div class="page-header">
      <button type="button" class="back-workbench-box" @click="goToPendingProjects">
        <el-icon class="back-icon"><ArrowLeft /></el-icon>
        <span class="back-text">返回</span>
      </button>

      <div class="header-content">
        <div class="header-main">
          <h1>项目评审</h1>
          <p class="subtitle">项目编号：{{ projectData.project_code }}</p>
        </div>
        <div class="header-actions">
          <el-button v-if="!reviewLocked" @click="saveDraft" :loading="saving">
            <el-icon><Document /></el-icon>
            保存草稿
          </el-button>
          <el-button v-if="!reviewLocked" type="primary" @click="submitReview" :loading="submitting">
            <el-icon><Check /></el-icon>
            提交评审
          </el-button>
        </div>
      </div>
    </div>

    <div class="content-container">
      <el-alert
        v-if="reviewLocked"
        type="info"
        show-icon
        :closable="false"
        class="assignment-readonly-alert"
        title="该专家分配任务（ExpertAssignment）已结束，仅可查看。"
      />

      <!-- 与库表 ExpertAssignment 对应的评审任务 -->
      <el-card v-if="existingReview" class="section-card assignment-meta-card" shadow="never">
        <template #header>
          <h3>评审任务（专家分配）</h3>
        </template>
        <div class="info-grid assignment-meta-grid">
          <div class="info-item">
            <label>分配记录 ID</label>
            <span class="mono">{{ existingReview.id }}</span>
          </div>
          <div class="info-item">
            <label>任务状态</label>
            <el-tag :type="assignmentStatusTag(existingReview.status)" size="small">{{
              assignmentStatusLabel(existingReview.status)
            }}</el-tag>
          </div>
          <div class="info-item">
            <label>分配时间</label>
            <span>{{ formatDateTime(existingReview.assigned_at) || '—' }}</span>
          </div>
          <div class="info-item">
            <label>截止时间</label>
            <span>{{ formatDateTime(existingReview.deadline) || '未设置' }}</span>
          </div>
        </div>
      </el-card>

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
              <label>研究领域：</label>
              <span>{{ projectData.research_field || '—' }}</span>
            </div>

            <div class="info-item">
              <label>总预算：</label>
              <span>{{ formatCurrency(projectData.budget_total) }}</span>
            </div>

            <div class="info-item">
              <label>研究周期：</label>
              <span>{{
                projectData.duration_months != null ? `${projectData.duration_months} 个月` : '—'
              }}</span>
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

        <el-form
          :model="reviewForm"
          :rules="rules"
          ref="reviewFormRef"
          label-width="120px"
          :disabled="reviewLocked"
        >
          <!-- 文本评价 -->
          <div class="text-review-section">
            <el-form-item label="项目优点" prop="strengths">
              <el-input
                v-model="reviewForm.strengths"
                type="textarea"
                :rows="3"
                placeholder="请描述项目的优势和创新点"
                maxlength="1000"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="不足之处" prop="weaknesses">
              <el-input
                v-model="reviewForm.weaknesses"
                type="textarea"
                :rows="3"
                placeholder="请指出项目存在的不足和问题"
                maxlength="1000"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="评审结论" prop="recommendation" class="recommendation-form-item">
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

            <el-form-item label="评审意见" prop="comments">
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

            <el-form-item label="修改建议" prop="suggestions">
              <el-input
                v-model="reviewForm.suggestions"
                type="textarea"
                :rows="4"
                placeholder="如有需要，请提供具体的修改建议"
                maxlength="1000"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="保密设置" prop="is_confidential">
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
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { ArrowLeft, Document, Check } from '@element-plus/icons-vue'
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

// 评审表单（与 ExpertAssignment.comment JSON 一致，无打分字段）
const reviewForm = ref({
  strengths: '',
  weaknesses: '',
  recommendation: '',
  comments: '',
  suggestions: '',
  is_confidential: false,
})

/** 与 ExpertAssignment.status 一致：accepted / declined 表示本轮评审已提交 */
const reviewLocked = computed(() => {
  const s = existingReview.value?.status
  return s === 'accepted' || s === 'declined'
})

const assignmentStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    reviewing: '评审中',
    accepted: '已提交',
    declined: '已拒绝',
    expired: '已过期',
  }
  return map[status] || status
}

const assignmentStatusTag = (status: string) => {
  const map: Record<string, string> = {
    reviewing: 'warning',
    accepted: 'success',
    declined: 'danger',
    expired: 'info',
  }
  return map[status] || 'info'
}

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

      if (existingReview.value) {
        const er = existingReview.value
        reviewForm.value = {
          strengths: er.strengths || '',
          weaknesses: er.weaknesses || '',
          recommendation: er.recommendation || '',
          comments: er.comments || '',
          suggestions: er.suggestions || '',
          is_confidential: !!er.is_confidential,
        }
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

const goToPendingProjects = () => {
  router.push('/reviewer/pending-projects')
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

const formatDateTime = (dateString: string | null | undefined) => {
  if (!dateString) return ''
  return formatDate(dateString)
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
  background: #f5f7fa;
  padding: 20px;
}

.assignment-readonly-alert {
  margin-bottom: 16px;
}

.assignment-meta-card .assignment-meta-grid .info-item label {
  min-width: 96px;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  word-break: break-all;
}

.review-project-page :deep(.el-button--primary) {
  --el-button-bg-color: #b31b1b;
  --el-button-border-color: #b31b1b;
  --el-button-hover-bg-color: #8b1515;
  --el-button-hover-border-color: #8b1515;
  --el-button-active-bg-color: #8b1515;
  --el-button-active-border-color: #8b1515;
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

/* 文本评价 */
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
  border-color: #b31b1b;
  background: rgba(179,27,27,0.04);
}

:deep(.el-radio__input.is-checked + .recommendation-item) {
  border-color: #b31b1b;
  background: rgba(179,27,27,0.08);
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
  color: #b31b1b;
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
  color: #b31b1b;
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

/* 响应式设置 */
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

/* 响应式设置 */
@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .review-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
