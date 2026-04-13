<template>
  <div class="reviewer-review">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>项目评审</h1>
        <div class="project-info">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item>评审工作台</el-breadcrumb-item>
            <el-breadcrumb-item>{{ projectTitle || '项目评审' }}</el-breadcrumb-item>
          </el-breadcrumb>
          <p v-if="projectCode" class="project-code">项目编号：{{ projectCode }}</p>
        </div>
      </div>
      <div class="header-right">
        <el-button-group>
          <el-button @click="saveAsDraft" :loading="saving" :disabled="isSubmitted">
            <el-icon><Document /></el-icon>
            保存草稿
          </el-button>
          <el-button
            type="primary"
            @click="submitReview"
            :loading="submitting"
            :disabled="isSubmitted || !canSubmit"
          >
            <el-icon><Check /></el-icon>
            提交评审
          </el-button>
        </el-button-group>
        <el-button @click="goBack">
          <el-icon><Back /></el-icon>
          返回列表
        </el-button>
      </div>
    </div>

    <!-- 状态提示 -->
    <div class="status-alert" v-if="showStatusAlert">
      <el-alert
        :title="statusAlertTitle"
        :type="statusAlertType"
        :closable="false"
        show-icon
        :description="statusAlertDescription"
      />
    </div>

    <!-- 主要评审内容 -->
    <div class="review-content" :class="{ submitted: isSubmitted }">
      <!-- 左侧：项目信息 -->
      <div class="left-panel">
        <!-- 项目信息卡片 -->
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <h3>项目基本信息</h3>
              <el-tag :type="projectStatusTag" size="small">{{ projectStatusText }}</el-tag>
            </div>
          </template>

          <div v-if="projectInfo" class="project-details">
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item label="项目标题">
                {{ projectTitle }}
              </el-descriptions-item>
              <el-descriptions-item label="项目类别">
                {{ projectInfo.category }}
              </el-descriptions-item>
              <el-descriptions-item label="研究领域">
                {{ projectInfo.research_field }}
              </el-descriptions-item>
              <el-descriptions-item label="关键词">
                {{ projectInfo.keywords }}
              </el-descriptions-item>
              <el-descriptions-item label="项目预算">
                ¥{{ formatNumber(projectInfo.budget_total) }}
              </el-descriptions-item>
              <el-descriptions-item label="研究周期">
                {{ projectInfo.duration_months }}个月
              </el-descriptions-item>
              <el-descriptions-item label="申请人">
                {{ projectInfo.applicant_name }}
              </el-descriptions-item>
              <el-descriptions-item label="申请单位">
                {{ projectInfo.applicant_department }}
              </el-descriptions-item>
            </el-descriptions>

            <div class="view-more">
              <el-button type="text" @click="viewProjectDetails">
                <el-icon><View /></el-icon>
                查看完整项目信息
              </el-button>
            </div>
          </div>

          <div v-else class="loading-info">
            <el-skeleton :rows="3" animated />
          </div>
        </el-card>

        <!-- 项目摘要 -->
        <el-card class="abstract-card">
          <template #header>
            <h3>项目摘要</h3>
          </template>
          <div v-if="projectInfo" class="abstract-content">
            {{ projectInfo.abstract }}
          </div>
          <div v-else class="loading-abstract">
            <el-skeleton :rows="4" animated />
          </div>
        </el-card>

        <!-- 评审结论 -->
        <el-card class="conclusion-card">
          <template #header>
            <h3>评审结论</h3>
          </template>

          <div class="conclusion-form">
            <el-form :model="reviewForm" label-width="100px">
              <el-form-item label="综合评分" required>
                <div class="total-score">
                  <el-rate
                    v-model.number="reviewForm.total_score"
                    :max="10"
                    :allow-half="true"
                    :disabled="isSubmitted"
                    show-score
                    text-color="#ff9900"
                    score-template="{value}分"
                    @change="updateTotalScore"
                  />
                  <span class="score-display">{{ reviewForm.total_score.toFixed(1) }}分</span>
                </div>
                <div class="score-tip">（根据各项评分自动计算）</div>
              </el-form-item>

              <el-form-item label="评审结论" required>
                <el-radio-group v-model="reviewForm.recommendation" :disabled="isSubmitted">
                  <el-radio label="approve" border>
                    <el-icon><CircleCheck /></el-icon>
                    通过
                  </el-radio>
                  <el-radio label="approve_with_revision" border>
                    <el-icon><Edit /></el-icon>
                    修改后通过
                  </el-radio>
                  <el-radio label="reject" border>
                    <el-icon><Close /></el-icon>
                    不通过
                  </el-radio>
                  <el-radio label="resubmit" border>
                    <el-icon><Refresh /></el-icon>
                    重新提交
                  </el-radio>
                </el-radio-group>
              </el-form-item>

              <el-form-item label="评审类型">
                <el-select
                  v-model="reviewForm.review_type"
                  :disabled="isSubmitted || !!reviewId"
                  placeholder="选择评审类型"
                >
                  <el-option label="立项评审" value="initial" />
                  <el-option label="中期评审" value="mid_term" />
                  <el-option label="结题评审" value="final" />
                  <el-option label="专项评审" value="special" />
                </el-select>
              </el-form-item>

              <el-form-item label="保密设置">
                <el-switch
                  v-model="reviewForm.is_confidential"
                  :disabled="isSubmitted"
                  active-text="对申请者保密"
                  inactive-text="公开评审意见"
                />
                <div class="confidential-tip">
                  <el-icon><Warning /></el-icon>
                  <span>选择保密后，您的评审意见将不对申请者公开</span>
                </div>
              </el-form-item>

              <el-form-item label="评审日期">
                <el-date-picker
                  v-model="reviewForm.review_date"
                  type="date"
                  placeholder="选择评审日期"
                  :disabled="isSubmitted"
                  value-format="YYYY-MM-DD"
                />
              </el-form-item>
            </el-form>
          </div>
        </el-card>
      </div>

      <!-- 右侧：评分细则和意见 -->
      <div class="right-panel">
        <!-- 评分细则 -->
        <el-card class="scoring-card">
          <template #header>
            <h3>评分细则（每项满分10分）</h3>
            <div class="scoring-tips">
              <el-tag type="info" size="small"
                >综合评分：{{ reviewForm.total_score.toFixed(1) }}分</el-tag
              >
              <el-tag :type="completionTag" size="small">{{ completionText }}</el-tag>
            </div>
          </template>

          <div class="scoring-form">
            <el-form :model="reviewForm" label-width="120px">
              <!-- 创新性评分 -->
              <el-form-item label="创新性" required>
                <div class="score-item">
                  <el-rate
                    v-model.number="reviewForm.innovation_score"
                    :max="10"
                    :allow-half="true"
                    :disabled="isSubmitted"
                    show-score
                    text-color="#ff9900"
                    score-template="{value}"
                    @change="calculateTotalScore"
                  />
                  <div class="score-description">
                    <p class="score-criteria">评分标准：</p>
                    <p>1-3分：创新性不足，多为已有研究</p>
                    <p>4-6分：有一定创新，但创新点有限</p>
                    <p>7-8分：具有明显创新，有独特思路</p>
                    <p>9-10分：创新性强，具有突破性</p>
                  </div>
                </div>
              </el-form-item>

              <!-- 可行性评分 -->
              <el-form-item label="可行性" required>
                <div class="score-item">
                  <el-rate
                    v-model.number="reviewForm.feasibility_score"
                    :max="10"
                    :allow-half="true"
                    :disabled="isSubmitted"
                    show-score
                    text-color="#ff9900"
                    score-template="{value}"
                    @change="calculateTotalScore"
                  />
                  <div class="score-description">
                    <p class="score-criteria">评分标准：</p>
                    <p>1-3分：技术路线不可行，资源不足</p>
                    <p>4-6分：基本可行，但存在明显障碍</p>
                    <p>7-8分：技术路线合理，可行性高</p>
                    <p>9-10分：方案完善，实施条件充分</p>
                  </div>
                </div>
              </el-form-item>

              <!-- 意义价值评分 -->
              <el-form-item label="意义价值" required>
                <div class="score-item">
                  <el-rate
                    v-model.number="reviewForm.significance_score"
                    :max="10"
                    :allow-half="true"
                    :disabled="isSubmitted"
                    show-score
                    text-color="#ff9900"
                    score-template="{value}"
                    @change="calculateTotalScore"
                  />
                  <div class="score-description">
                    <p class="score-criteria">评分标准：</p>
                    <p>1-3分：意义和价值有限</p>
                    <p>4-6分：有一定意义，但应用前景一般</p>
                    <p>7-8分：具有重要的理论和应用价值</p>
                    <p>9-10分：意义重大，具有战略价值</p>
                  </div>
                </div>
              </el-form-item>

              <!-- 团队基础评分 -->
              <el-form-item label="团队基础" required>
                <div class="score-item">
                  <el-rate
                    v-model.number="reviewForm.team_score"
                    :max="10"
                    :allow-half="true"
                    :disabled="isSubmitted"
                    show-score
                    text-color="#ff9900"
                    score-template="{value}"
                    @change="calculateTotalScore"
                  />
                  <div class="score-description">
                    <p class="score-criteria">评分标准：</p>
                    <p>1-3分：团队基础薄弱，经验不足</p>
                    <p>4-6分：团队基本合格，但有待加强</p>
                    <p>7-8分：团队结构合理，基础扎实</p>
                    <p>9-10分：团队实力雄厚，经验丰富</p>
                  </div>
                </div>
              </el-form-item>

              <!-- 预算合理性评分 -->
              <el-form-item label="预算合理性" required>
                <div class="score-item">
                  <el-rate
                    v-model.number="reviewForm.budget_score"
                    :max="10"
                    :allow-half="true"
                    :disabled="isSubmitted"
                    show-score
                    text-color="#ff9900"
                    score-template="{value}"
                    @change="calculateTotalScore"
                  />
                  <div class="score-description">
                    <p class="score-criteria">评分标准：</p>
                    <p>1-3分：预算不合理，浪费明显</p>
                    <p>4-6分：预算基本合理，可进一步优化</p>
                    <p>7-8分：预算合理，与项目需求匹配</p>
                    <p>9-10分：预算精确，使用计划详尽</p>
                  </div>
                </div>
              </el-form-item>
            </el-form>
          </div>
        </el-card>

        <!-- 评审意见 -->
        <el-card class="comments-card">
          <template #header>
            <h3>评审意见</h3>
            <div class="comment-tips">
              <el-tag type="warning" size="small">请客观、公正地填写评审意见</el-tag>
            </div>
          </template>

          <div class="comments-form">
            <el-form :model="reviewForm" label-width="100px">
              <el-form-item label="项目优点">
                <el-input
                  v-model="reviewForm.strengths"
                  type="textarea"
                  :rows="3"
                  :disabled="isSubmitted"
                  placeholder="请指出项目的优点和创新之处..."
                  maxlength="1000"
                  show-word-limit
                />
              </el-form-item>

              <el-form-item label="项目不足">
                <el-input
                  v-model="reviewForm.weaknesses"
                  type="textarea"
                  :rows="3"
                  :disabled="isSubmitted"
                  placeholder="请指出项目存在的问题和不足..."
                  maxlength="1000"
                  show-word-limit
                />
              </el-form-item>

              <el-form-item label="评审意见" required>
                <el-input
                  v-model="reviewForm.comments"
                  type="textarea"
                  :rows="4"
                  :disabled="isSubmitted"
                  placeholder="请详细说明您的评审意见..."
                  maxlength="2000"
                  show-word-limit
                  :class="{ 'error-field': !reviewForm.comments && showValidation }"
                />
                <div v-if="!reviewForm.comments && showValidation" class="error-message">
                  评审意见不能为空
                </div>
              </el-form-item>

              <el-form-item label="修改建议">
                <el-input
                  v-model="reviewForm.suggestions"
                  type="textarea"
                  :rows="3"
                  :disabled="isSubmitted"
                  placeholder="请提出具体的修改建议..."
                  maxlength="1000"
                  show-word-limit
                />
              </el-form-item>
            </el-form>
          </div>
        </el-card>

        <!-- 项目详情（折叠面板） -->
        <el-card class="details-card">
          <template #header>
            <div class="card-header">
              <h3>项目详细信息</h3>
              <el-button type="text" size="small" @click="toggleDetails">
                {{ showDetails ? '隐藏详情' : '显示详情' }}
              </el-button>
            </div>
          </template>

          <div v-if="showDetails">
            <!-- 项目成员 -->
            <div class="detail-section" v-if="projectMembers.length > 0">
              <h4>项目成员</h4>
              <el-table :data="projectMembers" size="small" stripe>
                <el-table-column prop="name" label="姓名" width="120" />
                <el-table-column prop="title" label="职称" width="120" />
                <el-table-column prop="member_role" label="角色" width="120" />
                <el-table-column prop="responsibility" label="主要职责" />
                <el-table-column prop="workload_percentage" label="工作量占比" width="100">
                  <template #default="{ row }">
                    {{ row.workload_percentage ? `${row.workload_percentage}%` : '-' }}
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <!-- 项目预算 -->
            <div class="detail-section" v-if="projectBudgets.length > 0">
              <h4>项目预算</h4>
              <el-table :data="projectBudgets" size="small" stripe>
                <el-table-column prop="category" label="预算类别" width="120" />
                <el-table-column prop="item_name" label="项目名称" min-width="150" />
                <el-table-column prop="description" label="详细说明" min-width="200" />
                <el-table-column prop="amount" label="金额" width="120">
                  <template #default="{ row }"> ¥{{ formatNumber(row.amount) }} </template>
                </el-table-column>
                <el-table-column prop="justification" label="预算依据" min-width="150" />
              </el-table>
            </div>
          </div>

          <div v-else class="details-summary">
            <el-button type="text" @click="toggleDetails">
              <el-icon><View /></el-icon>
              点击查看项目成员和预算详情
            </el-button>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="action-bar" v-if="!isSubmitted">
      <div class="action-left">
        <el-alert v-if="hasDraft" title="有未提交的草稿" type="warning" :closable="false" show-icon>
          上次保存时间：{{ formatTime(reviewForm.updated_at) }}
        </el-alert>
        <el-alert v-else title="未保存的草稿" type="info" :closable="false" show-icon>
          当前内容尚未保存
        </el-alert>
      </div>

      <div class="action-right">
        <el-button @click="resetForm" :disabled="saving || submitting">
          <el-icon><Refresh /></el-icon>
          重置
        </el-button>
        <el-button type="warning" @click="saveAsDraft" :loading="saving" :disabled="submitting">
          <el-icon><Document /></el-icon>
          保存草稿
        </el-button>
        <el-button
          type="primary"
          @click="submitReview"
          :loading="submitting"
          :disabled="saving || !canSubmit"
        >
          <el-icon><Check /></el-icon>
          提交评审
        </el-button>
      </div>
    </div>

    <!-- 提交确认对话框 -->
    <el-dialog
      v-model="confirmDialogVisible"
      title="确认提交评审"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="submit-confirm">
        <el-alert title="重要提示" type="warning" :closable="false" show-icon>
          提交后评审意见将不可修改，请确认所有内容填写正确。
        </el-alert>

        <div class="confirm-content">
          <h4>提交信息确认：</h4>
          <ul>
            <li>项目名称：{{ projectTitle }}</li>
            <li>综合评分：{{ reviewForm.total_score.toFixed(1) }}分</li>
            <li>评审结论：{{ getConclusionText(reviewForm.recommendation) }}</li>
            <li>评审类型：{{ getReviewTypeText(reviewForm.review_type) }}</li>
            <li>评审意见：{{ reviewForm.comments.substring(0, 100) }}...</li>
          </ul>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="confirmDialogVisible = false" :disabled="submitting">取消</el-button>
          <el-button type="primary" @click="confirmSubmit" :loading="submitting">
            确认提交
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { getApiBaseUrl, getApiOrigin } from '@/utils/request'
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Document,
  Check,
  Back,
  View,
  CircleCheck,
  Edit,
  Close,
  Refresh,
  Warning,
} from '@element-plus/icons-vue'
import axios from 'axios'

const route = useRoute()
const router = useRouter()

// 路由参数
const reviewId = ref<string>('')
const projectId = ref<string>('')

// 数据
const projectInfo = ref<any>(null)
const projectMembers = ref<any[]>([])
const projectBudgets = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const submitting = ref(false)
const showDetails = ref(false)
const confirmDialogVisible = ref(false)
const showValidation = ref(false)

// 评审表单 - 根据后端API调整字段
const reviewForm = ref({
  // 评分
  innovation_score: 0,
  feasibility_score: 0,
  significance_score: 0,
  team_score: 0,
  budget_score: 0,
  total_score: 0,

  // 评审意见
  strengths: '',
  weaknesses: '',
  comments: '',
  suggestions: '',

  // 结论
  recommendation: '',
  review_type: 'initial',
  is_confidential: false,
  review_date: new Date().toISOString().split('T')[0],

  // 状态
  status: 'draft',
  submitted_at: null as string | null,
  updated_at: null as string | null,
})

// 计算属性
const projectTitle = computed(
  () => projectInfo.value?.project_title || projectInfo.value?.title || '',
)
const projectCode = computed(() => projectInfo.value?.project_code || '')
const projectStatusTag = computed(() => {
  const status = projectInfo.value?.project_status || projectInfo.value?.status
  const statusMap = {
    draft: 'info',
    submitted: '',
    under_review: 'warning',
    review_completed: 'success',
    approved: 'success',
    rejected: 'danger',
  }
  return statusMap[status] || 'info'
})
const projectStatusText = computed(() => {
  const status = projectInfo.value?.project_status || projectInfo.value?.status
  const statusMap = {
    draft: '草稿',
    submitted: '已提交',
    under_review: '评审中',
    review_completed: '评审完成',
    approved: '已批准',
    rejected: '已拒绝',
  }
  return statusMap[status] || status
})
const isSubmitted = computed(() => reviewForm.value.status === 'submitted')
const hasDraft = computed(() => reviewForm.value.status === 'draft' && reviewForm.value.updated_at)
const completionTag = computed(() => {
  const completed = completedScores.value
  if (completed === 5) return 'success'
  if (completed >= 3) return 'warning'
  return 'danger'
})
const completionText = computed(() => {
  const completed = completedScores.value
  return `已完成 ${completed}/5 项评分`
})
const completedScores = computed(() => {
  const scores = [
    reviewForm.value.innovation_score,
    reviewForm.value.feasibility_score,
    reviewForm.value.significance_score,
    reviewForm.value.team_score,
    reviewForm.value.budget_score,
  ]
  return scores.filter((score) => score > 0).length
})
const canSubmit = computed(() => {
  return (
    completedScores.value > 0 &&
    reviewForm.value.comments.trim().length > 0 &&
    reviewForm.value.recommendation
  )
})
const showStatusAlert = computed(() => isSubmitted.value || hasDraft.value)
const statusAlertTitle = computed(() => {
  if (isSubmitted.value) return '评审已提交'
  if (hasDraft.value) return '有未提交的草稿'
  return ''
})
const statusAlertType = computed(() => {
  if (isSubmitted.value) return 'success'
  if (hasDraft.value) return 'warning'
  return 'info'
})
const statusAlertDescription = computed(() => {
  if (isSubmitted.value) {
    return `您的评审意见已于 ${formatTime(reviewForm.value.submitted_at)} 提交，不可再修改。`
  }
  if (hasDraft.value) {
    return `上次保存时间：${formatTime(reviewForm.value.updated_at)}，请及时提交评审。`
  }
  return ''
})

// 方法
const loadReviewData = async () => {
  loading.value = true
  console.log('1️⃣ 开始加载评审数据...')
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      ElMessage.error('请先登录')
      router.push('/login')
      return
    }
    console.log('3:', route.params, route.query)
    // 根据路由参数初始化
    if (route.params.id) {
      reviewId.value = route.params.id as string
    }

    if (route.query.projectId) {
      projectId.value = route.query.projectId as string
    }

    console.log('🔄 加载评审数据:', {
      reviewId: reviewId.value,
      projectId: projectId.value,
      routeParams: route.params,
      routeQuery: route.query,
    })

    // 如果有reviewId，加载已有评审数据
    if (reviewId.value) {
      // ✅ 使用正确的API路径
      const response = await axios.get(
        `${getApiBaseUrl()}/reviewer/viewreview/${reviewId.value}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )

      console.log('📥 评审数据响应:', response.data)

      if (response.data.success) {
        const reviewData = response.data.data

        // 填充表单
        reviewForm.value = {
          innovation_score: parseFloat(reviewData.innovation_score) || 0,
          feasibility_score: parseFloat(reviewData.feasibility_score) || 0,
          significance_score: parseFloat(reviewData.significance_score) || 0,
          team_score: parseFloat(reviewData.team_score) || 0,
          budget_score: parseFloat(reviewData.budget_score) || 0,
          total_score: parseFloat(reviewData.total_score) || 0,
          strengths: reviewData.strengths || '',
          weaknesses: reviewData.weaknesses || '',
          comments: reviewData.comments || '',
          suggestions: reviewData.suggestions || '',
          recommendation: reviewData.recommendation || '',
          review_type: reviewData.review_type || 'initial',
          is_confidential: Boolean(reviewData.is_confidential),
          review_date: reviewData.review_date || new Date().toISOString().split('T')[0],
          status: reviewData.status || 'draft',
          submitted_at: reviewData.submitted_at,
          updated_at: reviewData.updated_at,
        }

        // 设置项目信息
        if (reviewData.project_info) {
          projectInfo.value = {
            ...reviewData.project_info,
            applicant_name: reviewData.applicant_info?.name,
            applicant_department: reviewData.applicant_info?.department,
          }

          projectMembers.value = reviewData.project_info.members || []
          projectBudgets.value = reviewData.project_info.budgets || []
        } else if (reviewData.project_title) {
          // 兼容旧数据结构
          projectInfo.value = {
            title: reviewData.project_title,
            project_code: reviewData.project_code,
            abstract: reviewData.project_abstract,
            category: reviewData.project_category,
            budget_total: reviewData.budget_total,
            duration_months: reviewData.duration_months,
            applicant_name: reviewData.applicant_name,
            applicant_department: reviewData.applicant_department,
          }
        }

        // 如果没有项目ID，从评审数据中获取
        if (!projectId.value && reviewData.project_id) {
          projectId.value = reviewData.project_id
        }
      }
    }

    // 如果没有项目信息但有关联项目，加载项目信息
    if (!projectInfo.value && projectId.value) {
      await loadProjectInfo(projectId.value, token)
    }

    // 如果既没有评审数据也没有项目信息，显示错误
    if (!projectInfo.value) {
      ElMessage.error('无法加载项目信息')
      router.push('/reviewer/viewreview')
      return
    }
  } catch (error: any) {
    console.error('❌ 加载评审数据失败:', error)

    if (error.response?.status === 401) {
      ElMessage.error('登录已过期，请重新登录')
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    } else if (error.response?.status === 404) {
      ElMessage.warning('评审记录不存在')
      router.push('/reviewer/viewreview')
    } else {
      ElMessage.error('加载评审数据失败：' + (error.response?.data?.error || error.message))
    }
  } finally {
    loading.value = false
  }
}

const loadProjectInfo = async (projectId: string, token: string) => {
  try {
    const response = await axios.get(`${getApiBaseUrl()}/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (response.data.success) {
      const projectData = response.data.data?.project
      const applicantData = response.data.data?.members?.find((m: any) => m.role === 'principal')

      projectInfo.value = {
        ...projectData,
        applicant_name: applicantData?.name,
        applicant_department: applicantData?.department,
      }

      projectMembers.value = response.data.data?.members || []
      projectBudgets.value = response.data.data?.budgets || []
    }
  } catch (error) {
    console.error('加载项目信息失败:', error)
  }
}

const calculateTotalScore = () => {
  const scores = [
    reviewForm.value.innovation_score,
    reviewForm.value.feasibility_score,
    reviewForm.value.significance_score,
    reviewForm.value.team_score,
    reviewForm.value.budget_score,
  ]
  const validScores = scores.filter((score) => score > 0)
  if (validScores.length > 0) {
    const sum = validScores.reduce((a, b) => a + b, 0)
    reviewForm.value.total_score = Number((sum / validScores.length).toFixed(1))
  } else {
    reviewForm.value.total_score = 0
  }
}

const updateTotalScore = (score: number) => {
  reviewForm.value.total_score = score
}

const saveAsDraft = async () => {
  // 隐藏验证提示
  showValidation.value = false

  // 验证必要字段
  if (!reviewForm.value.comments.trim()) {
    showValidation.value = true
    ElMessage.warning('请填写评审意见')
    return
  }

  // 验证 recommendation 是否有效
  if (reviewForm.value.recommendation) {
    const validRecommendations = ['approve', 'approve_with_revision', 'reject', 'resubmit']
    if (!validRecommendations.includes(reviewForm.value.recommendation)) {
      ElMessage.warning('请选择有效的评审结论')
      return
    }
  }

  saving.value = true

  try {
    const token = localStorage.getItem('token')
    const now = new Date().toISOString()

    const dataToSave = {
      // 评分
      innovation_score: reviewForm.value.innovation_score,
      feasibility_score: reviewForm.value.feasibility_score,
      significance_score: reviewForm.value.significance_score,
      team_score: reviewForm.value.team_score,
      budget_score: reviewForm.value.budget_score,

      // 评审意见
      strengths: reviewForm.value.strengths,
      weaknesses: reviewForm.value.weaknesses,
      comments: reviewForm.value.comments,
      suggestions: reviewForm.value.suggestions,

      // 结论
      recommendation:
        reviewForm.value.recommendation.trim() === '' ? null : reviewForm.value.recommendation,

      review_type: reviewForm.value.review_type,
      is_confidential: reviewForm.value.is_confidential,
      review_date: reviewForm.value.review_date,
      status: 'draft',
      updated_at: now,
      project_id: projectId.value,
    }

    // 移除空值的字段
    Object.keys(dataToSave).forEach((key) => {
      if (
        dataToSave[key as keyof typeof dataToSave] === '' ||
        dataToSave[key as keyof typeof dataToSave] === null ||
        dataToSave[key as keyof typeof dataToSave] === undefined
      ) {
        delete dataToSave[key as keyof typeof dataToSave]
      }
    })

    let response
    let newReviewId = reviewId.value

    if (reviewId.value) {
      // ✅ 使用正确的API路径
      response = await axios.put(
        `${getApiBaseUrl()}/reviewer/viewreview/${reviewId.value}`,
        dataToSave,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      )
    } else {
      // ✅ 使用正确的API路径
      response = await axios.post(`${getApiBaseUrl()}/reviewer/viewreview`, dataToSave, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.data.success && response.data.review_id) {
        newReviewId = response.data.review_id
        reviewId.value = newReviewId

        // 更新URL参数
        router.replace({
          query: {
            ...route.query,
            reviewId: newReviewId,
            projectId: projectId.value,
          },
        })
      }
    }

    if (response.data.success) {
      reviewForm.value.updated_at = now
      ElMessage.success('评审草稿已保存')
    }
  } catch (error: any) {
    console.error('保存草稿失败:', error)
    ElMessage.error('保存失败：' + (error.response?.data?.error || error.message))
  } finally {
    saving.value = false
  }
}

const submitReview = () => {
  // 显示验证提示
  showValidation.value = true

  // 验证必要字段
  if (!reviewForm.value.comments.trim()) {
    ElMessage.warning('请填写评审意见')
    return
  }

  if (!reviewForm.value.recommendation) {
    ElMessage.warning('请选择评审结论')
    return
  }

  if (completedScores.value === 0) {
    ElMessage.warning('请至少完成一项评分')
    return
  }

  confirmDialogVisible.value = true
}

const confirmSubmit = async () => {
  submitting.value = true

  try {
    const token = localStorage.getItem('token')

    // 验证必要字段
    if (!reviewForm.value.recommendation) {
      ElMessage.error('请选择评审结论')
      submitting.value = false
      return
    }

    if (!reviewForm.value.comments.trim()) {
      ElMessage.error('请填写评审意见')
      submitting.value = false
      return
    }

    const validRecommendations = ['approve', 'approve_with_revision', 'reject', 'resubmit']
    if (!validRecommendations.includes(reviewForm.value.recommendation)) {
      ElMessage.error('请选择有效的评审结论')
      submitting.value = false
      return
    }

    // 准备提交数据
    const dataToSubmit = {
      // 评分
      innovation_score: reviewForm.value.innovation_score,
      feasibility_score: reviewForm.value.feasibility_score,
      significance_score: reviewForm.value.significance_score,
      team_score: reviewForm.value.team_score,
      budget_score: reviewForm.value.budget_score,

      // 评审意见
      strengths: reviewForm.value.strengths,
      weaknesses: reviewForm.value.weaknesses,
      comments: reviewForm.value.comments,
      suggestions: reviewForm.value.suggestions,

      // 结论
      recommendation: reviewForm.value.recommendation,

      // 其他
      review_type: reviewForm.value.review_type,
      is_confidential: reviewForm.value.is_confidential,
      review_date: reviewForm.value.review_date,
      status: 'submitted',
    }

    console.log('📤 提交评审数据:', dataToSubmit)

    let response
    let newReviewId = reviewId.value

    if (reviewId.value) {
      // ✅ 使用正确的API路径
      response = await axios.post(
        `${getApiBaseUrl()}/reviewer/viewreview/${reviewId.value}/submit`,
        dataToSubmit,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      )
    } else {
      // 创建并提交新评审
      const createData = {
        ...dataToSubmit,
        project_id: projectId.value,
      }

      response = await axios.post(`${getApiBaseUrl()}/reviewer/viewreview`, createData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.data.success && response.data.review_id) {
        newReviewId = response.data.review_id
        reviewId.value = newReviewId
      }
    }

    console.log('📥 提交评审响应:', response.data)

    if (response.data.success) {
      // 更新本地状态
      reviewForm.value.status = 'submitted'
      reviewForm.value.submitted_at = new Date().toISOString()
      confirmDialogVisible.value = false

      ElMessage.success(response.data.message || '评审提交成功')

      // 等待2秒后跳转，让用户看到成功消息
      setTimeout(() => {
        router.push('/reviewer/viewreview')
      }, 2000)
    } else {
      ElMessage.error(response.data.error || '提交失败')
    }
  } catch (error: any) {
    console.error('提交评审失败:', error)

    let errorMessage = '提交失败'
    if (error.response) {
      errorMessage =
        error.response.data?.error || error.response.data?.message || error.response.statusText
      console.error('错误响应:', error.response.data)
    } else if (error.request) {
      errorMessage = '网络错误：请检查服务器是否运行'
      console.error('没有收到响应:', error.request)
    } else {
      errorMessage = error.message
    }

    ElMessage.error(errorMessage)
  } finally {
    submitting.value = false
  }
}

const resetForm = () => {
  ElMessageBox.confirm('确定要重置所有填写内容吗？', '确认重置', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      // 重置分数字段
      reviewForm.value.innovation_score = 0
      reviewForm.value.feasibility_score = 0
      reviewForm.value.significance_score = 0
      reviewForm.value.team_score = 0
      reviewForm.value.budget_score = 0
      reviewForm.value.total_score = 0

      // 重置文本字段
      reviewForm.value.strengths = ''
      reviewForm.value.weaknesses = ''
      reviewForm.value.comments = ''
      reviewForm.value.suggestions = ''
      reviewForm.value.recommendation = ''

      // 重置其他字段
      reviewForm.value.review_type = 'initial'
      reviewForm.value.is_confidential = false
      reviewForm.value.review_date = new Date().toISOString().split('T')[0]
      reviewForm.value.status = 'draft'
      reviewForm.value.submitted_at = null
      reviewForm.value.updated_at = null

      showValidation.value = false

      ElMessage.success('表单已重置')
    })
    .catch(() => {
      // 用户取消
    })
}

const toggleDetails = () => {
  showDetails.value = !showDetails.value
}

const viewProjectDetails = () => {
  const pid = projectId.value
  if (pid) {
    router.push(`/projects/${pid}`)
  }
}

const goBack = () => {
  router.push('/reviewer/viewreview')
}

const getConclusionText = (recommendation: string) => {
  const conclusionMap: Record<string, string> = {
    approve: '通过',
    approve_with_revision: '修改后通过',
    reject: '不通过',
    resubmit: '重新提交',
  }
  return conclusionMap[recommendation] || recommendation
}

const getReviewTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    initial: '立项评审',
    mid_term: '中期评审',
    final: '结题评审',
    special: '专项评审',
  }
  return typeMap[type] || type
}

const formatNumber = (num: number | string | null) => {
  if (num === null || num === undefined || num === '') return '0'
  const number = Number(num)
  if (isNaN(number)) return '0'
  return number.toLocaleString('zh-CN')
}

const formatTime = (dateString: string | null) => {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

// 监听评分变化，自动更新总分
watch(
  [
    () => reviewForm.value.innovation_score,
    () => reviewForm.value.feasibility_score,
    () => reviewForm.value.significance_score,
    () => reviewForm.value.team_score,
    () => reviewForm.value.budget_score,
  ],
  calculateTotalScore,
)

// 生命周期
onMounted(() => {
  loadReviewData()
})
</script>

<style scoped>
.reviewer-review {
  padding: 20px;
  max-width: 1600px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.header-left h1 {
  margin: 0 0 10px 0;
  color: #303133;
  font-size: 24px;
}

.project-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.project-code {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.header-right {
  display: flex;
  gap: 15px;
  align-items: center;
}

.status-alert {
  margin-bottom: 20px;
}

.review-content {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 20px;
  margin-bottom: 80px;
}

.review-content.submitted {
  opacity: 0.8;
}

.left-panel,
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-card,
.abstract-card,
.conclusion-card,
.scoring-card,
.comments-card,
.details-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-details {
  padding: 10px 0;
}

.view-more {
  margin-top: 15px;
  text-align: center;
  border-top: 1px solid #f0f0f0;
  padding-top: 15px;
}

.abstract-content {
  line-height: 1.6;
  color: #606266;
  white-space: pre-wrap;
}

.conclusion-form {
  padding: 10px 0;
}

.total-score {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 10px;
}

.score-display {
  font-size: 24px;
  font-weight: bold;
  color: #e6a23c;
  min-width: 60px;
}

.score-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.confidential-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 8px 12px;
  background-color: #f0f9ff;
  border-radius: 4px;
  font-size: 13px;
  color: #409eff;
}

.scoring-form {
  padding: 10px 0;
}

.score-item {
  display: flex;
  align-items: flex-start;
  gap: 30px;
  margin-bottom: 20px;
}

.score-description {
  flex: 1;
  padding: 10px 15px;
  background-color: #f8f9fa;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.5;
  color: #606266;
}

.score-criteria {
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.comments-form {
  padding: 10px 0;
}

.error-field :deep(.el-textarea__inner) {
  border-color: #f56c6c;
}

.error-message {
  color: #f56c6c;
  font-size: 12px;
  margin-top: 5px;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h4 {
  margin: 0 0 10px 0;
  color: #303133;
  font-size: 16px;
}

.details-summary {
  text-align: center;
  padding: 30px 0;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 15px 20px;
  border-top: 1px solid #e4e7ed;
  box-shadow: 0 -2px 12px 0 rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1000;
}

.action-left {
  flex: 1;
}

.action-right {
  display: flex;
  gap: 15px;
}

.submit-confirm {
  padding: 10px;
}

.confirm-content {
  margin-top: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.confirm-content h4 {
  margin: 0 0 10px 0;
  color: #303133;
}

.confirm-content ul {
  margin: 0;
  padding-left: 20px;
}

.confirm-content li {
  margin-bottom: 5px;
  color: #606266;
  line-height: 1.6;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .review-content {
    grid-template-columns: 1fr;
  }

  .left-panel,
  .right-panel {
    max-width: 100%;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .header-right {
    width: 100%;
    justify-content: space-between;
  }

  .score-item {
    flex-direction: column;
    gap: 15px;
  }

  .action-bar {
    flex-direction: column;
    gap: 15px;
    padding: 15px;
  }

  .action-right {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .review-content {
    gap: 15px;
  }

  .action-right {
    flex-direction: column;
    width: 100%;
  }

  .action-right .el-button {
    width: 100%;
  }
}
</style>
