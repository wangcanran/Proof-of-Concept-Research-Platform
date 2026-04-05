<template>
  <div class="review-detail">
    <!-- 页面头部 -->
    <div class="detail-header">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/reviewer/history' }">评审历史</el-breadcrumb-item>
        <el-breadcrumb-item>评审详情</el-breadcrumb-item>
      </el-breadcrumb>

      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">评审详情</h1>
          <p class="project-info">项目: {{ review.projectTitle }} | 编号: {{ review.projectId }}</p>
        </div>

        <div class="review-meta">
          <el-tag :type="getConclusionTagType(review.conclusion)" size="large">
            {{ review.conclusion }}
          </el-tag>
          <span class="review-date">提交时间: {{ formatDateTime(review.submittedAt) }}</span>
        </div>
      </div>
    </div>

    <!-- 主要内容 -->
    <div class="detail-content">
      <!-- 左侧：评审信息 -->
      <div class="review-info-column">
        <!-- 评分卡片 -->
        <el-card class="score-card">
          <template #header>
            <h3>评分详情</h3>
          </template>

          <div class="score-details">
            <div class="score-item" v-for="(score, key) in scoreDetails" :key="key">
              <div class="score-label">{{ score.label }}</div>
              <div class="score-progress">
                <el-progress
                  :percentage="getScorePercentage(score.value, score.max)"
                  :stroke-width="10"
                  :color="getScoreColor(score.value)"
                  :show-text="false"
                />
              </div>
              <div class="score-value">
                <span class="current-score">{{ score.value }}</span>
                <span class="max-score">/{{ score.max }}</span>
              </div>
            </div>

            <el-divider />

            <div class="total-score">
              <div class="total-label">总分</div>
              <div class="total-value">{{ review.scores.total }}/100</div>
              <div class="total-percentage">
                <el-progress
                  :percentage="getScorePercentage(review.scores.total, 100)"
                  :stroke-width="12"
                  :color="getTotalScoreColor(review.scores.total)"
                />
              </div>
            </div>
          </div>
        </el-card>

        <!-- 评审结论 -->
        <el-card class="conclusion-card">
          <template #header>
            <h3>评审结论</h3>
          </template>

          <div class="conclusion-details">
            <div class="conclusion-item">
              <span class="item-label">结论:</span>
              <el-tag :type="getConclusionTagType(review.conclusion)" size="medium">
                {{ review.conclusion }}
              </el-tag>
            </div>

            <div class="conclusion-item">
              <span class="item-label">资助建议:</span>
              <span class="item-value">{{ review.fundingRecommendation }}</span>
            </div>

            <div v-if="review.suggestedAmount" class="conclusion-item">
              <span class="item-label">建议金额:</span>
              <span class="item-value">¥{{ formatNumber(review.suggestedAmount) }}</span>
            </div>

            <div class="conclusion-item">
              <span class="item-label">评审专家:</span>
              <span class="item-value">{{ review.reviewerName }}</span>
            </div>

            <div class="conclusion-item">
              <span class="item-label">提交时间:</span>
              <span class="item-value">{{ formatDateTime(review.submittedAt) }}</span>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 右侧：评审意见 -->
      <div class="review-content-column">
        <!-- 详细意见 -->
        <el-card class="comments-card">
          <template #header>
            <div class="card-header-with-action">
              <h3>详细评审意见</h3>
              <el-button
                type="primary"
                size="small"
                @click="copyComments"
                v-if="review.detailedComments"
              >
                复制意见
              </el-button>
            </div>
          </template>

          <div class="comments-content">
            <template v-if="review.detailedComments">
              <div class="comments-text">
                {{ review.detailedComments }}
              </div>

              <div class="comments-stats">
                <span class="stat-item">
                  <i class="el-icon-document"></i>
                  {{ getTextLength(review.detailedComments) }} 字
                </span>
                <span class="stat-item">
                  <i class="el-icon-time"></i>
                  阅读约 {{ Math.ceil(getTextLength(review.detailedComments) / 400) }} 分钟
                </span>
              </div>
            </template>
            <div v-else class="empty-comments">
              <el-empty description="暂无详细评审意见" />
            </div>
          </div>
        </el-card>

        <!-- 保密意见 -->
        <el-card class="confidential-card">
          <template #header>
            <div class="confidential-header">
              <h3>
                <i class="el-icon-lock"></i>
                保密意见
              </h3>
              <el-tag type="info" size="small">仅管理部门可见</el-tag>
            </div>
          </template>

          <div class="confidential-content">
            <template v-if="review.confidentialComments">
              <div class="confidential-text">
                {{ review.confidentialComments }}
              </div>
            </template>
            <div v-else class="empty-confidential">
              <el-empty description="暂无保密意见" />
            </div>
          </div>
        </el-card>

        <!-- 项目摘要 -->
        <el-card class="project-summary-card">
          <template #header>
            <h3>项目摘要</h3>
          </template>

          <div class="project-basic-info">
            <el-descriptions :column="2" size="small" border>
              <el-descriptions-item label="项目名称">{{ project.title }}</el-descriptions-item>
              <el-descriptions-item label="项目类型">{{ project.type }}</el-descriptions-item>
              <el-descriptions-item label="申请人">{{ project.applicant }}</el-descriptions-item>
              <el-descriptions-item label="申请单位">{{
                project.organization
              }}</el-descriptions-item>
              <el-descriptions-item label="申请金额">
                ¥{{ formatNumber(project.budget) }}
              </el-descriptions-item>
              <el-descriptions-item label="研究周期"
                >{{ project.duration }}个月</el-descriptions-item
              >
            </el-descriptions>
          </div>

          <div class="project-abstract-section">
            <h4>项目摘要</h4>
            <div class="abstract-content">
              {{ project.abstract }}
            </div>
          </div>

          <div class="project-keywords-section">
            <h4>关键词</h4>
            <div class="keywords-list">
              <el-tag v-for="keyword in project.keywords" :key="keyword" size="small" type="info">
                {{ keyword }}
              </el-tag>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="detail-actions">
      <el-button @click="goBack" icon="el-icon-arrow-left"> 返回列表 </el-button>

      <el-button type="primary" @click="exportReview" icon="el-icon-download">
        导出评审报告
      </el-button>

      <el-button type="success" @click="shareReview" icon="el-icon-share" v-if="canShare">
        分享评审结果
      </el-button>

      <el-button type="info" @click="printReview" icon="el-icon-printer"> 打印 </el-button>
    </div>

    <!-- 导出对话框 -->
    <el-dialog v-model="exportDialogVisible" title="导出评审报告" width="500px">
      <div class="export-options">
        <el-form :model="exportForm" label-width="100px">
          <el-form-item label="导出格式">
            <el-radio-group v-model="exportForm.format">
              <el-radio label="pdf">PDF 文档</el-radio>
              <el-radio label="word">Word 文档</el-radio>
              <el-radio label="excel">Excel 表格</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="包含内容">
            <el-checkbox-group v-model="exportForm.includes">
              <el-checkbox label="scores">评分详情</el-checkbox>
              <el-checkbox label="comments">详细意见</el-checkbox>
              <el-checkbox label="confidential">保密意见</el-checkbox>
              <el-checkbox label="project">项目信息</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="水印设置">
            <el-switch
              v-model="exportForm.watermark"
              active-text="添加水印"
              inactive-text="无水印"
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="exportDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleExport" :loading="exporting"> 确认导出 </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DataManager } from '@/utils/dataManager'

const router = useRouter()
const route = useRoute()

// 评审记录
const review = ref({})

// 项目信息
const project = ref({})

// 导出相关
const exportDialogVisible = ref(false)
const exporting = ref(false)
const exportForm = reactive({
  format: 'pdf',
  includes: ['scores', 'comments', 'project'],
  watermark: true,
})

// 计算属性
const scoreDetails = computed(() => {
  if (!review.value.scores) return []

  return [
    { label: '创新性', value: review.value.scores.innovation || 0, max: 25 },
    { label: '科学性', value: review.value.scores.scientific || 0, max: 25 },
    { label: '可行性', value: review.value.scores.feasibility || 0, max: 25 },
    { label: '研究价值', value: review.value.scores.value || 0, max: 25 },
  ]
})

const canShare = computed(() => {
  return navigator.share && !review.value.confidentialComments
})

// 方法
const loadReviewData = () => {
  const reviewId = route.params.id || route.query.id
  if (!reviewId) {
    ElMessage.error('未指定评审记录')
    router.push('/reviewer/history')
    return
  }

  // 查找评审记录
  const reviewHistory = DataManager.reviewHistory
  const foundReview = reviewHistory.find((r) => r.id === reviewId)

  if (!foundReview) {
    ElMessage.error('评审记录不存在')
    router.push('/reviewer/history')
    return
  }

  review.value = { ...foundReview }

  // 加载项目信息
  const projectData = DataManager.getProjectById(foundReview.projectId)
  project.value = projectData || {
    title: foundReview.projectTitle,
    type: foundReview.projectType,
    abstract: '项目信息未找到',
  }
}

const getConclusionTagType = (conclusion) => {
  const types = {
    通过: 'success',
    修改后重审: 'warning',
    不通过: 'danger',
  }
  return types[conclusion] || 'info'
}

const getScorePercentage = (score, max) => {
  return Math.round((score / max) * 100)
}

const getScoreColor = (score) => {
  const percentage = (score / 25) * 100
  if (percentage >= 85) return '#67C23A' // 优秀
  if (percentage >= 70) return '#409EFF' // 良好
  if (percentage >= 60) return '#E6A23C' // 一般
  return '#F56C6C' // 较差
}

const getTotalScoreColor = (totalScore) => {
  if (totalScore >= 85) return '#67C23A' // 优秀
  if (totalScore >= 70) return '#409EFF' // 良好
  if (totalScore >= 60) return '#E6A23C' // 合格
  return '#F56C6C' // 不合格
}

const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatNumber = (num) => {
  if (!num && num !== 0) return '0'
  return Number(num).toLocaleString('zh-CN')
}

const getTextLength = (text) => {
  return text ? text.length : 0
}

const copyComments = () => {
  if (!review.value.detailedComments) return

  navigator.clipboard
    .writeText(review.value.detailedComments)
    .then(() => {
      ElMessage.success('评审意见已复制到剪贴板')
    })
    .catch((err) => {
      console.error('复制失败:', err)
      ElMessage.error('复制失败')
    })
}

const goBack = () => {
  router.push('/reviewer/history')
}

const exportReview = () => {
  exportDialogVisible.value = true
}

const handleExport = async () => {
  try {
    exporting.value = true

    // 模拟导出过程
    await new Promise((resolve) => setTimeout(resolve, 1500))

    ElMessage.success({
      message: `评审报告已导出为${exportForm.format.toUpperCase()}格式`,
      duration: 3000,
    })

    exportDialogVisible.value = false
    exporting.value = false
  } catch (error) {
    ElMessage.error('导出失败')
    exporting.value = false
  }
}

const shareReview = () => {
  if (!canShare.value) return

  const shareData = {
    title: `项目评审报告 - ${review.value.projectTitle}`,
    text: `项目名称: ${review.value.projectTitle}\n评审结论: ${review.value.conclusion}\n总分: ${review.value.scores.total}/100`,
    url: window.location.href,
  }

  navigator
    .share(shareData)
    .then(() => {
      ElMessage.success('分享成功')
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        ElMessage.error('分享失败')
      }
    })
}

const printReview = () => {
  window.print()
}

// 生命周期
onMounted(() => {
  // 检查权限
  const userRole = localStorage.getItem('userRole')
  if (!['REVIEWER', 'ADMIN'].includes(userRole)) {
    ElMessage.error('无权限查看评审详情')
    router.push('/')
    return
  }

  loadReviewData()
})
</script>

<style scoped>
.review-detail {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.detail-header {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e4e7ed;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
}

.title-section .page-title {
  margin: 0;
  color: #303133;
  font-size: 24px;
}

.project-info {
  margin: 8px 0 0;
  color: #909399;
  font-size: 14px;
}

.review-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.review-date {
  color: #c0c4cc;
  font-size: 13px;
}

.detail-content {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 20px;
  margin-bottom: 30px;
}

@media (max-width: 1200px) {
  .detail-content {
    grid-template-columns: 1fr;
  }
}

/* 左侧样式 */
.review-info-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.score-card,
.conclusion-card {
  height: fit-content;
}

.score-details {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.score-item {
  display: grid;
  grid-template-columns: 80px 1fr 60px;
  align-items: center;
  gap: 15px;
}

.score-label {
  font-size: 14px;
  color: #606266;
}

.score-progress {
  flex: 1;
}

.score-value {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
}

.current-score {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.max-score {
  font-size: 12px;
  color: #909399;
}

.total-score {
  display: grid;
  grid-template-columns: 80px 60px 1fr;
  align-items: center;
  gap: 15px;
}

.total-label {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.total-value {
  font-size: 20px;
  font-weight: bold;
  color: #409eff;
  text-align: center;
}

.total-percentage {
  flex: 1;
}

.conclusion-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.conclusion-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.item-label {
  min-width: 80px;
  font-size: 14px;
  color: #606266;
}

.item-value {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

/* 右侧样式 */
.review-content-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-header-with-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comments-content,
.confidential-content {
  min-height: 200px;
}

.comments-text,
.confidential-text {
  line-height: 1.8;
  color: #303133;
  white-space: pre-wrap;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
}

.comments-stats {
  display: flex;
  gap: 20px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #e4e7ed;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #909399;
  font-size: 13px;
}

.empty-comments,
.empty-confidential {
  padding: 40px 0;
}

.confidential-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.confidential-header h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.project-summary-card {
  margin-top: 10px;
}

.project-basic-info {
  margin-bottom: 20px;
}

.project-abstract-section,
.project-keywords-section {
  margin-top: 20px;
}

.project-abstract-section h4,
.project-keywords-section h4 {
  margin: 0 0 10px 0;
  color: #303133;
}

.abstract-content {
  line-height: 1.6;
  color: #606266;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 4px;
}

.keywords-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

/* 操作按钮 */
.detail-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
  padding: 20px;
  border-top: 1px solid #e4e7ed;
  background: white;
  position: sticky;
  bottom: 0;
}

/* 导出对话框 */
.export-options {
  padding: 10px 0;
}

@media (max-width: 768px) {
  .review-detail {
    padding: 15px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .review-meta {
    align-items: flex-start;
  }

  .score-item,
  .total-score {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .detail-actions {
    flex-wrap: wrap;
  }
}

/* 打印样式 */
@media print {
  .detail-actions,
  .el-dialog__wrapper,
  .el-breadcrumb {
    display: none !important;
  }

  .review-detail {
    padding: 0;
  }

  .detail-content {
    display: block;
  }

  .review-info-column,
  .review-content-column {
    break-inside: avoid;
  }
}
</style>
