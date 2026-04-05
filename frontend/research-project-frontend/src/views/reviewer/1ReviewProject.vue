<template>
  <div class="review-project-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-main">
        <h1>
          <el-icon><Document /></el-icon>
          {{ isEditMode ? '编辑评审' : '项目评审' }}
        </h1>
        <div class="project-breadcrumb">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item>评审工作台</el-breadcrumb-item>
            <el-breadcrumb-item v-if="projectInfo">{{ projectInfo.title }}</el-breadcrumb-item>
            <el-breadcrumb-item>{{ isEditMode ? '编辑评审' : '创建评审' }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
      </div>

      <div class="header-actions">
        <el-button-group>
          <el-button @click="goBack" plain>
            <el-icon><Back /></el-icon>
            返回
          </el-button>
          <el-button @click="saveDraft" :loading="saving" :disabled="submitted">
            <el-icon><DocumentAdd /></el-icon>
            保存草稿
          </el-button>
          <el-button
            type="primary"
            @click="submitReview"
            :loading="submitting"
            :disabled="submitted || !canSubmit"
          >
            <el-icon><Check /></el-icon>
            {{ submitted ? '已提交' : '提交评审' }}
          </el-button>
        </el-button-group>
      </div>
    </div>

    <!-- 状态提示 -->
    <div v-if="submitted" class="status-alert">
      <el-alert type="success" :closable="false" show-icon>
        <template #title> 评审已提交于 {{ formatDate(reviewForm.submitted_at) }} </template>
        <p>您的评审意见已成功提交，将进入项目决策流程。</p>
      </el-alert>
    </div>

    <div v-else-if="hasDraft" class="status-alert">
      <el-alert type="warning" :closable="false" show-icon>
        <template #title> 有未提交的评审草稿 </template>
        <p>上次保存时间：{{ formatDate(reviewForm.updated_at) }}，请及时提交。</p>
      </el-alert>
    </div>

    <!-- 主要内容区域 -->
    <div class="review-content">
      <!-- 左侧：项目信息 -->
      <div class="left-panel">
        <!-- 项目信息卡片 -->
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <h3>
                <el-icon><Notebook /></el-icon>
                项目基本信息
              </h3>
              <el-tag :type="getProjectStatusTag(projectInfo?.status)">
                {{ getProjectStatusText(projectInfo?.status) }}
              </el-tag>
            </div>
          </template>

          <div v-if="projectInfo" class="project-details">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="项目编号">
                <el-tag type="info">{{ projectInfo.project_code }}</el-tag>
              </el-descriptions-item>

              <el-descriptions-item label="项目标题">
                <strong>{{ projectInfo.title }}</strong>
              </el-descriptions-item>

              <el-descriptions-item label="项目类别">
                {{ projectInfo.category }}
              </el-descriptions-item>

              <el-descriptions-item label="研究领域">
                {{ projectInfo.research_field }}
              </el-descriptions-item>

              <el-descriptions-item label="申请金额">
                <span class="budget">{{ formatCurrency(projectInfo.budget_total) }}</span>
              </el-descriptions-item>

              <el-descriptions-item label="研究周期">
                {{ projectInfo.duration_months }} 个月
              </el-descriptions-item>

              <el-descriptions-item label="申请人">
                {{ projectInfo.applicant_name }}
              </el-descriptions-item>

              <el-descriptions-item label="所属单位">
                {{ projectInfo.applicant_department }}
              </el-descriptions-item>
            </el-descriptions>

            <div class="view-actions">
              <el-button type="primary" text @click="viewFullProject">
                <el-icon><View /></el-icon>
                查看完整项目信息
              </el-button>
            </div>
          </div>

          <div v-else class="loading-section">
            <el-skeleton :rows="4" animated />
          </div>
        </el-card>

        <!-- 项目摘要 -->
        <el-card class="abstract-card">
          <template #header>
            <h3>
              <el-icon><Files /></el-icon>
              项目摘要
            </h3>
          </template>

          <div v-if="projectInfo" class="abstract-content">
            <p>{{ projectInfo.abstract }}</p>
          </div>

          <div v-else class="loading-section">
            <el-skeleton :rows="3" animated />
          </div>
        </el-card>
      </div>

      <!-- 右侧：评审表单 -->
      <div class="right-panel">
        <!-- 评分区域 -->
        <el-card class="scoring-card">
          <template #header>
            <div class="scoring-header">
              <h3>
                <el-icon><Star /></el-icon>
                项目评分（每项满分10分）
              </h3>
              <div class="scoring-summary">
                <el-tag :type="getScoreTag(reviewForm.total_score)" size="large">
                  综合评分：{{ reviewForm.total_score.toFixed(1) }}分
                </el-tag>
                <span class="completion"> 完成度：{{ completionRate }}% </span>
              </div>
            </div>
          </template>

          <div class="scoring-items">
            <div v-for="item in scoringItems" :key="item.field" class="scoring-item">
              <div class="score-label">
                <span class="label-text">{{ item.label }}</span>
                <span class="required">*</span>
              </div>

              <div class="score-control">
                <el-rate
                  v-model="reviewForm[item.field]"
                  :max="10"
                  :allow-half="true"
                  :disabled="submitted"
                  show-score
                  text-color="#ff9900"
                  score-template="{value}"
                  @change="calculateTotalScore"
                />

                <div class="score-display">
                  <span class="score-value">{{ reviewForm[item.field]?.toFixed(1) || '0.0' }}</span>
                  <span class="score-unit">分</span>
                </div>
              </div>

              <div class="score-description">
                <p class="description-title">评分标准：</p>
                <ul class="description-list">
                  <li v-for="(desc, idx) in item.description" :key="idx">{{ desc }}</li>
                </ul>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 评审意见区域 -->
        <el-card class="comments-card">
          <template #header>
            <h3>
              <el-icon><EditPen /></el-icon>
              评审意见
            </h3>
          </template>

          <div class="comment-sections">
            <div class="comment-item">
              <label class="comment-label">
                项目优点与创新点
                <span class="optional">（选填）</span>
              </label>
              <el-input
                v-model="reviewForm.strengths"
                type="textarea"
                :rows="3"
                :disabled="submitted"
                placeholder="请指出项目的优点和创新之处..."
                maxlength="500"
                show-word-limit
              />
            </div>

            <div class="comment-item">
              <label class="comment-label">
                项目不足与改进空间
                <span class="optional">（选填）</span>
              </label>
              <el-input
                v-model="reviewForm.weaknesses"
                type="textarea"
                :rows="3"
                :disabled="submitted"
                placeholder="请指出项目存在的问题和不足..."
                maxlength="500"
                show-word-limit
              />
            </div>

            <div class="comment-item required">
              <label class="comment-label">
                综合评价与建议
                <span class="required">*</span>
              </label>
              <el-input
                v-model="reviewForm.comments"
                type="textarea"
                :rows="4"
                :disabled="submitted"
                placeholder="请详细说明您的评审意见..."
                maxlength="1000"
                show-word-limit
                :class="{ 'error-field': !reviewForm.comments && showValidation }"
              />
              <div v-if="!reviewForm.comments && showValidation" class="error-message">
                综合评价不能为空
              </div>
            </div>

            <div class="comment-item">
              <label class="comment-label">
                具体修改建议
                <span class="optional">（选填）</span>
              </label>
              <el-input
                v-model="reviewForm.suggestions"
                type="textarea"
                :rows="3"
                :disabled="submitted"
                placeholder="请提出具体的修改建议..."
                maxlength="500"
                show-word-limit
              />
            </div>
          </div>
        </el-card>

        <!-- 评审结论区域 -->
        <el-card class="conclusion-card">
          <template #header>
            <h3>
              <el-icon><Flag /></el-icon>
              评审结论
            </h3>
          </template>

          <div class="conclusion-content">
            <div class="conclusion-item required">
              <label class="conclusion-label">
                评审结论
                <span class="required">*</span>
              </label>
              <el-radio-group
                v-model="reviewForm.recommendation"
                :disabled="submitted"
                class="conclusion-options"
              >
                <el-radio label="approve" border>
                  <div class="conclusion-option">
                    <el-icon class="option-icon approve"><CircleCheck /></el-icon>
                    <div class="option-content">
                      <div class="option-title">通过</div>
                      <div class="option-desc">项目质量优秀，建议立项</div>
                    </div>
                  </div>
                </el-radio>

                <el-radio label="approve_with_revision" border>
                  <div class="conclusion-option">
                    <el-icon class="option-icon revision"><Edit /></el-icon>
                    <div class="option-content">
                      <div class="option-title">修改后通过</div>
                      <div class="option-desc">基本符合要求，需修改后立项</div>
                    </div>
                  </div>
                </el-radio>

                <el-radio label="reject" border>
                  <div class="conclusion-option">
                    <el-icon class="option-icon reject"><Close /></el-icon>
                    <div class="option-content">
                      <div class="option-title">不通过</div>
                      <div class="option-desc">不符合立项要求，不建议立项</div>
                    </div>
                  </div>
                </el-radio>

                <el-radio label="resubmit" border>
                  <div class="conclusion-option">
                    <el-icon class="option-icon resubmit"><Refresh /></el-icon>
                    <div class="option-content">
                      <div class="option-title">重新提交</div>
                      <div class="option-desc">需重大修改后重新提交</div>
                    </div>
                  </div>
                </el-radio>
              </el-radio-group>

              <div v-if="!reviewForm.recommendation && showValidation" class="error-message">
                请选择评审结论
              </div>
            </div>

            <div class="conclusion-options">
              <div class="option-item">
                <label class="option-label">
                  <el-switch
                    v-model="reviewForm.is_confidential"
                    :disabled="submitted"
                    active-text="对申请者保密"
                    inactive-text="公开评审意见"
                  />
                </label>
                <p class="option-tip">
                  <el-icon><Warning /></el-icon>
                  选择保密后，您的评审意见将不对项目申请者公开
                </p>
              </div>

              <div class="option-item">
                <label class="option-label">评审类型</label>
                <el-select
                  v-model="reviewForm.review_type"
                  :disabled="submitted || isEditMode"
                  placeholder="选择评审类型"
                  class="type-select"
                >
                  <el-option label="立项评审" value="initial" />
                  <el-option label="中期评审" value="mid_term" />
                  <el-option label="结题评审" value="final" />
                  <el-option label="专项评审" value="special" />
                </el-select>
              </div>

              <div class="option-item">
                <label class="option-label">评审日期</label>
                <el-date-picker
                  v-model="reviewForm.review_date"
                  type="date"
                  placeholder="选择评审日期"
                  :disabled="submitted"
                  value-format="YYYY-MM-DD"
                  class="date-picker"
                />
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div v-if="!submitted" class="action-bar">
      <div class="action-content">
        <div class="action-left">
          <el-alert
            :title="actionAlert.title"
            :type="actionAlert.type"
            :closable="false"
            show-icon
            center
          >
            {{ actionAlert.message }}
          </el-alert>
        </div>

        <div class="action-right">
          <el-button @click="resetForm" :disabled="saving || submitting">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
          <el-button type="warning" @click="saveDraft" :loading="saving" :disabled="submitting">
            <el-icon><DocumentAdd /></el-icon>
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
    </div>

    <!-- 提交确认对话框 -->
    <el-dialog
      v-model="showConfirmDialog"
      title="确认提交评审"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="confirm-content">
        <el-alert type="warning" :closable="false" show-icon>
          <template #title> 重要提示 </template>
          提交后评审意见将不可修改，请确认所有内容填写正确。
        </el-alert>

        <div class="review-summary">
          <h4>提交信息确认：</h4>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="项目名称">
              {{ projectInfo?.title }}
            </el-descriptions-item>

            <el-descriptions-item label="综合评分">
              <el-rate
                v-model="reviewForm.total_score"
                disabled
                :max="10"
                :allow-half="true"
                text-color="#ff9900"
                score-template="{value}"
              />
              <span class="summary-score">{{ reviewForm.total_score.toFixed(1) }}分</span>
            </el-descriptions-item>

            <el-descriptions-item label="评审结论">
              <el-tag :type="getConclusionTag(reviewForm.recommendation)" size="small">
                {{ getConclusionText(reviewForm.recommendation) }}
              </el-tag>
            </el-descriptions-item>

            <el-descriptions-item label="评审意见">
              <p class="summary-comment">{{ reviewForm.comments?.substring(0, 100) }}...</p>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showConfirmDialog = false" :disabled="submitting"> 取消 </el-button>
          <el-button type="primary" @click="confirmSubmit" :loading="submitting">
            确认提交
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Document,
  Back,
  DocumentAdd,
  Check,
  Notebook,
  Files,
  View,
  Star,
  EditPen,
  Flag,
  CircleCheck,
  Edit,
  Close,
  Refresh,
  Warning,
} from '@element-plus/icons-vue'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()

// ============ 状态管理 ============
const loading = ref(false)
const saving = ref(false)
const submitting = ref(false)
const showValidation = ref(false)
const showConfirmDialog = ref(false)

// 评审ID和项目ID
const reviewId = ref('')
const projectId = ref('')

// 项目信息
const projectInfo = ref<any>(null)
const projectMembers = ref<any[]>([])
const projectBudgets = ref<any[]>([])

// 评审表单
const reviewForm = ref({
  // 评分
  innovation_score: 0,
  feasibility_score: 0,
  significance_score: 0,
  team_score: 0,
  budget_score: 0,
  total_score: 0,

  // 意见
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

// ============ 计算属性 ============
const isEditMode = computed(() => !!reviewId.value)
const submitted = computed(() => reviewForm.value.status === 'submitted')
const hasDraft = computed(() => reviewForm.value.status === 'draft' && reviewForm.value.updated_at)

const completionRate = computed(() => {
  const fields = [
    reviewForm.value.innovation_score,
    reviewForm.value.feasibility_score,
    reviewForm.value.significance_score,
    reviewForm.value.team_score,
    reviewForm.value.budget_score,
    reviewForm.value.comments,
    reviewForm.value.recommendation,
  ]

  const completed = fields.filter((value) => {
    if (typeof value === 'number') return value > 0
    if (typeof value === 'string') return value.trim().length > 0
    return false
  }).length

  return Math.round((completed / fields.length) * 100)
})

const canSubmit = computed(() => {
  return (
    reviewForm.value.total_score > 0 &&
    reviewForm.value.comments.trim().length > 0 &&
    reviewForm.value.recommendation &&
    completionRate.value >= 80
  )
})

const actionAlert = computed(() => {
  if (submitted.value) {
    return {
      title: '评审已提交',
      type: 'success',
      message: `您的评审意见已于 ${formatDate(reviewForm.value.submitted_at)} 提交`,
    }
  }

  if (hasDraft.value) {
    return {
      title: '有未提交的草稿',
      type: 'warning',
      message: `上次保存时间：${formatDate(reviewForm.value.updated_at)}`,
    }
  }

  return {
    title: '请完成评审内容',
    type: 'info',
    message: '所有标*号为必填项',
  }
})

// 评分项配置
const scoringItems = [
  {
    field: 'innovation_score',
    label: '创新性',
    description: [
      '9-10分：创新性强，具有突破性',
      '7-8分：具有明显创新，有独特思路',
      '5-6分：有一定创新，但创新点有限',
      '1-4分：创新性不足，多为已有研究',
    ],
  },
  {
    field: 'feasibility_score',
    label: '可行性',
    description: [
      '9-10分：方案完善，实施条件充分',
      '7-8分：技术路线合理，可行性高',
      '5-6分：基本可行，但存在明显障碍',
      '1-4分：技术路线不可行，资源不足',
    ],
  },
  {
    field: 'significance_score',
    label: '意义价值',
    description: [
      '9-10分：意义重大，具有战略价值',
      '7-8分：具有重要的理论和应用价值',
      '5-6分：有一定意义，但应用前景一般',
      '1-4分：意义和价值有限',
    ],
  },
  {
    field: 'team_score',
    label: '团队基础',
    description: [
      '9-10分：团队实力雄厚，经验丰富',
      '7-8分：团队结构合理，基础扎实',
      '5-6分：团队基本合格，但有待加强',
      '1-4分：团队基础薄弱，经验不足',
    ],
  },
  {
    field: 'budget_score',
    label: '预算合理性',
    description: [
      '9-10分：预算精确，使用计划详尽',
      '7-8分：预算合理，与项目需求匹配',
      '5-6分：预算基本合理，可进一步优化',
      '1-4分：预算不合理，浪费明显',
    ],
  },
]

// ============ 方法 ============
// 计算总分
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

// 加载评审数据
const loadReviewData = async () => {
  loading.value = true

  try {
    console.log('🔄 加载评审数据，路由信息:', route)

    // 从路由获取参数
    reviewId.value = (route.params.id as string) || ''
    projectId.value = (route.query.projectId as string) || ''

    console.log('参数解析:', { reviewId: reviewId.value, projectId: projectId.value })

    // 如果有reviewId，加载已有评审
    if (reviewId.value) {
      const response = await request.get(`/api/reviewer/reviews/${reviewId.value}`)

      if (response.success) {
        const data = response.data
        console.log('评审数据加载成功:', data)

        // 填充表单
        Object.assign(reviewForm.value, {
          innovation_score: Number(data.innovation_score) || 0,
          feasibility_score: Number(data.feasibility_score) || 0,
          significance_score: Number(data.significance_score) || 0,
          team_score: Number(data.team_score) || 0,
          budget_score: Number(data.budget_score) || 0,
          total_score: Number(data.total_score) || 0,
          strengths: data.strengths || '',
          weaknesses: data.weaknesses || '',
          comments: data.comments || '',
          suggestions: data.suggestions || '',
          recommendation: data.recommendation || '',
          review_type: data.review_type || 'initial',
          is_confidential: Boolean(data.is_confidential),
          review_date: data.review_date || new Date().toISOString().split('T')[0],
          status: data.status || 'draft',
          submitted_at: data.submitted_at,
          updated_at: data.updated_at,
        })

        // 获取项目信息
        if (data.project_info) {
          projectInfo.value = data.project_info
          projectId.value = data.project_id
        }
      }
    }

    // 如果有projectId但还没有项目信息，加载项目信息
    if (projectId.value && !projectInfo.value) {
      await loadProjectInfo(projectId.value)
    }

    // 如果既没有reviewId也没有projectId，显示错误
    if (!reviewId.value && !projectId.value) {
      ElMessage.error('请提供评审ID或项目ID')
      router.push('/reviewer/reviews')
    }
  } catch (error: any) {
    console.error('加载评审数据失败:', error)

    if (error.response?.status === 401) {
      ElMessage.error('登录已过期')
      router.push('/login')
    } else if (error.response?.status === 404) {
      ElMessage.warning('评审记录不存在')

      // 如果是编辑模式但记录不存在，创建新评审
      if (reviewId.value && projectId.value) {
        ElMessage.info('将创建新评审')
        reviewForm.value.status = 'draft'
      } else {
        router.push('/reviewer/reviews')
      }
    } else {
      ElMessage.error('加载失败: ' + (error.message || '网络错误'))
    }
  } finally {
    loading.value = false
  }
}

// 加载项目信息
const loadProjectInfo = async (id: string) => {
  try {
    const response = await request.get(`/api/projects/${id}`)

    if (response.success) {
      projectInfo.value = response.data
      console.log('项目信息加载成功:', projectInfo.value)
    }
  } catch (error) {
    console.error('加载项目信息失败:', error)
    ElMessage.warning('项目信息加载失败，继续填写评审')
  }
}

// 保存草稿
const saveDraft = async () => {
  showValidation.value = false
  saving.value = true

  try {
    const data = {
      project_id: projectId.value,
      ...reviewForm.value,
      status: 'draft',
      updated_at: new Date().toISOString(),
    }

    let response
    if (reviewId.value) {
      response = await request.put(`/api/reviewer/reviews/${reviewId.value}`, data)
    } else {
      response = await request.post('/api/reviewer/reviews', data)

      if (response.success && response.review_id) {
        reviewId.value = response.review_id
        router.replace({ params: { id: reviewId.value } })
      }
    }

    if (response.success) {
      reviewForm.value.updated_at = new Date().toISOString()
      ElMessage.success('草稿保存成功')
    }
  } catch (error: any) {
    console.error('保存草稿失败:', error)
    ElMessage.error('保存失败: ' + (error.message || '网络错误'))
  } finally {
    saving.value = false
  }
}

// 提交评审
const submitReview = () => {
  showValidation.value = true

  // 验证必填项
  if (!reviewForm.value.comments.trim()) {
    ElMessage.warning('请填写综合评价与建议')
    return
  }

  if (!reviewForm.value.recommendation) {
    ElMessage.warning('请选择评审结论')
    return
  }

  if (reviewForm.value.total_score <= 0) {
    ElMessage.warning('请至少完成一项评分')
    return
  }

  showConfirmDialog.value = true
}

// 确认提交
const confirmSubmit = async () => {
  submitting.value = true

  try {
    const data = {
      project_id: projectId.value,
      ...reviewForm.value,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    }

    let response
    if (reviewId.value) {
      response = await request.put(`/api/reviewer/reviews/${reviewId.value}/submit`, data)
    } else {
      response = await request.post('/api/reviewer/reviews/submit', data)
    }

    if (response.success) {
      reviewForm.value.status = 'submitted'
      reviewForm.value.submitted_at = new Date().toISOString()
      showConfirmDialog.value = false

      ElMessage.success('评审提交成功')

      // 2秒后返回列表
      setTimeout(() => {
        router.push('/reviewer/reviews')
      }, 2000)
    }
  } catch (error: any) {
    console.error('提交评审失败:', error)
    ElMessage.error('提交失败: ' + (error.message || '网络错误'))
  } finally {
    submitting.value = false
  }
}

// 重置表单
const resetForm = () => {
  ElMessageBox.confirm('确定要重置所有填写内容吗？', '确认重置', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      // 重置评分
      reviewForm.value.innovation_score = 0
      reviewForm.value.feasibility_score = 0
      reviewForm.value.significance_score = 0
      reviewForm.value.team_score = 0
      reviewForm.value.budget_score = 0
      reviewForm.value.total_score = 0

      // 重置文本
      reviewForm.value.strengths = ''
      reviewForm.value.weaknesses = ''
      reviewForm.value.comments = ''
      reviewForm.value.suggestions = ''
      reviewForm.value.recommendation = ''

      // 重置其他
      reviewForm.value.is_confidential = false
      reviewForm.value.review_date = new Date().toISOString().split('T')[0]

      showValidation.value = false

      ElMessage.success('表单已重置')
    })
    .catch(() => {
      // 取消
    })
}

// 返回
const goBack = () => {
  router.push('/reviewer/reviews')
}

// 查看完整项目
const viewFullProject = () => {
  if (projectId.value) {
    router.push(`/projects/${projectId.value}`)
  }
}

// ============ 辅助函数 ============
const formatDate = (dateString: string | null) => {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN')
  } catch {
    return dateString
  }
}

const formatCurrency = (amount: number) => {
  if (!amount) return '¥0'
  const num = Number(amount)
  if (num >= 100000000) return '¥' + (num / 100000000).toFixed(2) + '亿'
  if (num >= 10000) return '¥' + (num / 10000).toFixed(2) + '万'
  return '¥' + num.toFixed(2)
}

const getProjectStatusTag = (status: string) => {
  const map: Record<string, string> = {
    under_review: 'warning',
    draft: 'info',
    submitted: 'primary',
    approved: 'success',
    rejected: 'danger',
  }
  return map[status] || 'info'
}

const getProjectStatusText = (status: string) => {
  const map: Record<string, string> = {
    under_review: '评审中',
    draft: '草稿',
    submitted: '已提交',
    approved: '已批准',
    rejected: '已拒绝',
  }
  return map[status] || status
}

const getScoreTag = (score: number) => {
  if (score >= 8) return 'success'
  if (score >= 6) return 'warning'
  return 'danger'
}

const getConclusionTag = (conclusion: string) => {
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

// ============ 生命周期 ============
onMounted(() => {
  console.log('🎯 项目评审页面加载')
  loadReviewData()
})
</script>

<style scoped>
/* CSS样式 - 保持简洁美观的设计 */
.review-project-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  padding: 20px;
}

.page-header {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.header-main h1 {
  margin: 0 0 12px 0;
  font-size: 24px;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-breadcrumb {
  color: #909399;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.status-alert {
  margin-bottom: 24px;
  border-radius: 8px;
  overflow: hidden;
}

.review-content {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 24px;
  margin-bottom: 80px;
}

.left-panel,
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-card,
.abstract-card,
.scoring-card,
.comments-card,
.conclusion-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.project-details,
.abstract-content {
  padding: 20px;
}

.budget {
  color: #e6a23c;
  font-weight: bold;
  font-size: 18px;
}

.view-actions {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
  text-align: center;
}

.loading-section {
  padding: 30px 20px;
}

.scoring-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.scoring-summary {
  display: flex;
  align-items: center;
  gap: 20px;
}

.completion {
  color: #409eff;
  font-weight: 500;
}

.scoring-items {
  padding: 20px;
}

.scoring-item {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px dashed #f0f0f0;
}

.scoring-item:last-child {
  margin-bottom: 0;
  border-bottom: none;
}

.score-label {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 15px;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.required {
  color: #ff4d4f;
}

.score-control {
  display: flex;
  align-items: center;
  gap: 30px;
  margin-bottom: 15px;
}

.score-display {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.score-value {
  font-size: 24px;
  font-weight: bold;
  color: #e6a23c;
}

.score-unit {
  color: #909399;
  font-size: 14px;
}

.score-description {
  background: #f8f9fa;
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 13px;
  color: #666;
}

.description-title {
  font-weight: 500;
  margin-bottom: 8px;
  color: #303133;
}

.description-list {
  margin: 0;
  padding-left: 20px;
  line-height: 1.6;
}

.comment-sections {
  padding: 20px;
}

.comment-item {
  margin-bottom: 24px;
}

.comment-item:last-child {
  margin-bottom: 0;
}

.comment-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #303133;
}

.optional {
  color: #909399;
  font-size: 12px;
  font-weight: normal;
}

.error-field :deep(.el-textarea__inner) {
  border-color: #ff4d4f;
}

.error-message {
  color: #ff4d4f;
  font-size: 12px;
  margin-top: 5px;
}

.conclusion-content {
  padding: 20px;
}

.conclusion-item {
  margin-bottom: 30px;
}

.conclusion-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 15px;
}

.conclusion-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
}

.option-icon {
  font-size: 24px;
}

.option-icon.approve {
  color: #52c41a;
}

.option-icon.revision {
  color: #fa8c16;
}

.option-icon.reject {
  color: #ff4d4f;
}

.option-icon.resubmit {
  color: #1890ff;
}

.option-content {
  flex: 1;
}

.option-title {
  font-weight: 500;
  margin-bottom: 4px;
}

.option-desc {
  font-size: 12px;
  color: #909399;
}

.conclusion-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.option-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-label {
  font-weight: 500;
  color: #606266;
}

.option-tip {
  font-size: 12px;
  color: #909399;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.type-select,
.date-picker {
  width: 100%;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid #e4e7ed;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.08);
  padding: 16px 20px;
  z-index: 1000;
}

.action-content {
  max-width: 1600px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-left {
  flex: 1;
}

.action-right {
  display: flex;
  gap: 15px;
}

/* 确认对话框样式 */
.confirm-content {
  padding: 10px;
}

.review-summary {
  margin-top: 20px;
}

.review-summary h4 {
  margin: 0 0 15px 0;
  color: #303133;
}

.summary-score {
  margin-left: 10px;
  color: #e6a23c;
  font-weight: bold;
}

.summary-comment {
  margin: 0;
  color: #666;
  line-height: 1.5;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .review-content {
    grid-template-columns: 1fr;
  }

  .conclusion-options {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 20px;
  }

  .header-actions {
    justify-content: center;
  }

  .scoring-header {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }

  .scoring-summary {
    justify-content: space-between;
  }

  .score-control {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }

  .conclusion-options {
    grid-template-columns: 1fr;
  }

  .action-content {
    flex-direction: column;
    gap: 15px;
  }

  .action-right {
    width: 100%;
    justify-content: center;
  }
}
</style>
