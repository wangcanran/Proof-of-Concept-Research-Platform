<!-- src/views/assistant/ApplicationDetail.vue -->
<template>
  <div class="application-detail">
    <!-- 页面标题和返回按钮 -->
    <div class="page-header">
      <el-button type="text" @click="goBack" :icon="ArrowLeft"> 返回列表 </el-button>
      <h1 class="page-title">项目申请详情</h1>
      <div class="header-actions">
        <el-button @click="exportApplication" :icon="Download"> 导出 </el-button>
        <el-button @click="printPage" :icon="Printer"> 打印 </el-button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="10" animated />
    </div>

    <!-- 申请详情卡片 -->
    <div v-else class="detail-container">
      <!-- 基本信息卡片 -->
      <div class="info-card">
        <div class="card-header">
          <h3 class="card-title">基本信息</h3>
          <el-tag :type="getStatusTagType(application.status)" size="large">
            {{ getStatusText(application.status) }}
          </el-tag>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <label class="info-label">项目编号：</label>
            <span class="info-value">{{ application.project_code }}</span>
          </div>
          <div class="info-item">
            <label class="info-label">项目标题：</label>
            <span class="info-value">{{ application.title }}</span>
          </div>
          <div class="info-item">
            <label class="info-label">申请类别：</label>
            <span class="info-value">{{ getCategoryText(application.category) }}</span>
          </div>
          <div class="info-item">
            <label class="info-label">研究领域：</label>
            <span class="info-value">{{ application.research_field }}</span>
          </div>
          <div class="info-item">
            <label class="info-label">申请人：</label>
            <span class="info-value">{{ application.applicant_name }}</span>
          </div>
          <div class="info-item">
            <label class="info-label">申请日期：</label>
            <span class="info-value">{{ formatDate(application.created_at) }}</span>
          </div>
          <div class="info-item">
            <label class="info-label">研究周期：</label>
            <span class="info-value">{{ application.duration_months }}个月</span>
          </div>
          <div class="info-item">
            <label class="info-label">总预算：</label>
            <span class="info-value">¥{{ formatAmount(application.budget_total) }}</span>
          </div>
        </div>
      </div>

      <!-- 审核操作卡片 -->
      <div class="review-card" v-if="application.status === 'submitted'">
        <h3 class="card-title">审核操作</h3>

        <div class="review-form">
          <el-form ref="reviewFormRef" :model="reviewForm" :rules="reviewRules">
            <el-form-item label="审核结果" prop="result">
              <el-radio-group v-model="reviewForm.result">
                <el-radio label="approved">通过</el-radio>
                <el-radio label="rejected">不通过</el-radio>
                <el-radio label="returned">退回修改</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="审核意见" prop="comment">
              <el-input
                v-model="reviewForm.comment"
                type="textarea"
                :rows="4"
                placeholder="请输入审核意见"
                show-word-limit
                maxlength="1000"
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="submitReview" :loading="reviewLoading">
                提交审核
              </el-button>
              <el-button @click="resetReviewForm">重置</el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>

      <!-- 预算明细卡片 -->
      <div class="budget-card">
        <h3 class="card-title">预算明细</h3>

        <el-table :data="budgetItems" border stripe style="width: 100%">
          <el-table-column prop="category" label="预算类别" width="120">
            <template #default="{ row }">
              {{ getBudgetCategoryText(row.category) }}
            </template>
          </el-table-column>
          <el-table-column prop="item_name" label="项目名称" />
          <el-table-column prop="amount" label="金额" width="120" align="right">
            <template #default="{ row }"> ¥{{ formatAmount(row.amount) }} </template>
          </el-table-column>
          <el-table-column prop="justification" label="预算依据" show-overflow-tooltip />
        </el-table>

        <div class="budget-summary">
          <span class="total-label">预算总额：</span>
          <span class="total-amount">¥{{ formatAmount(totalBudget) }}</span>
        </div>
      </div>

      <!-- 审核历史 -->
      <div class="history-card" v-if="reviewHistory.length > 0">
        <h3 class="card-title">审核历史</h3>

        <div class="timeline-container">
          <div class="timeline-item" v-for="(history, index) in reviewHistory" :key="index">
            <div class="timeline-dot" :class="getHistoryDotClass(history.action)"></div>
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="timeline-action">{{ getHistoryActionText(history.action) }}</span>
                <span class="timeline-time">{{ formatDateTime(history.created_at) }}</span>
              </div>
              <div class="timeline-description" v-if="history.comment">
                {{ history.comment }}
              </div>
              <div class="timeline-reviewer" v-if="history.reviewer_name">
                处理人：{{ history.reviewer_name }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import request from '@/utils/request'
import { ArrowLeft, Download, Printer } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const application = ref<any>({})
const budgetItems = ref<any[]>([])
const reviewHistory = ref<any[]>([])
const reviewFormRef = ref<FormInstance>()
const reviewLoading = ref(false)

const reviewForm = reactive({
  result: '',
  comment: '',
})

const reviewRules = {
  result: [{ required: true, message: '请选择审核结果', trigger: 'blur' }],
  comment: [
    { required: true, message: '请输入审核意见', trigger: 'blur' },
    { min: 10, message: '审核意见至少10个字符', trigger: 'blur' },
  ],
}

// 计算属性
const totalBudget = computed(() => {
  return budgetItems.value.reduce((sum, item) => sum + Number(item.amount), 0)
})

// 初始化加载数据
onMounted(() => {
  const applicationId = route.params.id
  loadApplicationDetail(applicationId)
  loadBudgetItems(applicationId)
  loadReviewHistory(applicationId)
})

const loadApplicationDetail = async (id: string) => {
  try {
    const response = await request.get(`/api/assistant/applications/${id}`)
    if (response.success) {
      application.value = response.data
    }
  } catch (error) {
    console.error('加载申请详情失败:', error)
    ElMessage.error('加载申请详情失败')
  } finally {
    loading.value = false
  }
}

const loadBudgetItems = async (projectId: string) => {
  try {
    const response = await request.get(`/api/assistant/projects/${projectId}/budget`)
    if (response.success) {
      budgetItems.value = response.data
    }
  } catch (error) {
    console.error('加载预算明细失败:', error)
  }
}

const loadReviewHistory = async (id: string) => {
  try {
    const response = await request.get(`/api/assistant/applications/${id}/history`)
    if (response.success) {
      reviewHistory.value = response.data
    }
  } catch (error) {
    console.error('加载审核历史失败:', error)
  }
}

// 工具函数
const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    under_review: '审核中',
    approved: '已批准',
    rejected: '已拒绝',
  }
  return map[status] || status
}

const getStatusTagType = (status: string) => {
  const map: Record<string, string> = {
    draft: 'info',
    submitted: 'warning',
    under_review: 'primary',
    approved: 'success',
    rejected: 'danger',
  }
  return map[status] || 'info'
}

const getCategoryText = (category: string) => {
  const map: Record<string, string> = {
    基础研究: '基础研究',
    应用研究: '应用研究',
    技术开发: '技术开发',
    成果转化: '成果转化',
    平台建设: '平台建设',
    其他: '其他',
  }
  return map[category] || category
}

const getBudgetCategoryText = (category: string) => {
  const map: Record<string, string> = {
    设备费: '设备费',
    材料费: '材料费',
    测试费: '测试费',
    差旅费: '差旅费',
    会议费: '会议费',
    劳务费: '劳务费',
    专家咨询费: '专家咨询费',
    出版费: '出版费',
    管理费: '管理费',
    其他: '其他',
  }
  return map[category] || category
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const getHistoryActionText = (action: string) => {
  const map: Record<string, string> = {
    create: '创建申请',
    submit: '提交申请',
    review: '审核',
    approve: '批准',
    reject: '拒绝',
    return: '退回修改',
  }
  return map[action] || action
}

const getHistoryDotClass = (action: string) => {
  const map: Record<string, string> = {
    create: 'dot-info',
    submit: 'dot-warning',
    review: 'dot-primary',
    approve: 'dot-success',
    reject: 'dot-danger',
    return: 'dot-warning',
  }
  return map[action] || 'dot-info'
}

// 操作方法
const goBack = () => {
  router.push('/assistant/applications')
}

const submitReview = async () => {
  if (!reviewFormRef.value) return

  try {
    await reviewFormRef.value.validate()

    await ElMessageBox.confirm('确定要提交审核吗？审核结果将通知申请人。', '确认审核', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })

    reviewLoading.value = true

    const response = await request.post(
      `/api/assistant/applications/${route.params.id}/review`,
      reviewForm,
    )

    if (response.success) {
      ElMessage.success('审核提交成功')
      resetReviewForm()
      loadApplicationDetail(route.params.id as string)
      loadReviewHistory(route.params.id as string)
    }
  } catch (error) {
    // 用户取消或验证失败
  } finally {
    reviewLoading.value = false
  }
}

const resetReviewForm = () => {
  reviewForm.result = ''
  reviewForm.comment = ''
  if (reviewFormRef.value) {
    reviewFormRef.value.clearValidate()
  }
}

const exportApplication = async () => {
  try {
    const response = await request.get(`/api/assistant/applications/${route.params.id}/export`, {
      responseType: 'blob',
    })

    const url = window.URL.createObjectURL(new Blob([response]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `application_${application.value.project_code}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

const printPage = () => {
  window.print()
}
</script>

<style scoped>
.application-detail {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 70px);
}

/* 页面标题 */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e8e8e8;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 加载状态 */
.loading-container {
  background: white;
  padding: 40px;
  border-radius: 12px;
}

/* 详情容器 */
.detail-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 卡片通用样式 */
.info-card,
.review-card,
.budget-card,
.history-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.card-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

/* 基本信息网格 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 13px;
  color: #7f8c8d;
}

.info-value {
  font-size: 14px;
  color: #2c3e50;
  font-weight: 500;
}

/* 审核表单 */
.review-form {
  max-width: 600px;
}

/* 预算表格 */
.budget-summary {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 2px solid #f0f0f0;
  text-align: right;
}

.total-label {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.total-amount {
  font-size: 20px;
  font-weight: 700;
  color: #fa8c16;
  margin-left: 12px;
}

/* 时间线样式 */
.timeline-container {
  position: relative;
  padding-left: 24px;
}

.timeline-container::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #f0f0f0;
}

.timeline-item {
  position: relative;
  margin-bottom: 24px;
}

.timeline-dot {
  position: absolute;
  left: -24px;
  top: 4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 3px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.timeline-dot.dot-info {
  background: #b31b1b;
}

.timeline-dot.dot-warning {
  background: #fa8c16;
}

.timeline-dot.dot-primary {
  background: #b31b1b;
}

.timeline-dot.dot-success {
  background: #52c41a;
}

.timeline-dot.dot-danger {
  background: #ff4d4f;
}

.timeline-content {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.timeline-action {
  font-weight: 600;
  color: #2c3e50;
}

.timeline-time {
  font-size: 12px;
  color: #7f8c8d;
}

.timeline-description {
  margin: 8px 0;
  color: #666;
  line-height: 1.5;
}

.timeline-reviewer {
  font-size: 12px;
  color: #7f8c8d;
  font-style: italic;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .timeline-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}

@media print {
  .page-header .header-actions,
  .review-card {
    display: none !important;
  }
}
</style>
