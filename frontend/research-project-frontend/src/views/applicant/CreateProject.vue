<!-- src/views/applicant/CreateProject.vue -->
<template>
  <div class="create-project-container">
    <!-- 页面标题和导航 -->
    <div class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="goBack">← 返回</button>
        <h1>项目申报</h1>
      </div>
      <div class="header-right">
        <div class="draft-info" v-if="isEditing && currentProject">
          正在编辑：{{ currentProject.title }} ({{ currentProject.project_code }})
        </div>
        <div class="header-actions">
          <button class="secondary-btn" @click="saveDraft" :disabled="saving">
            {{ saving ? '保存中...' : '💾 保存草稿' }}
          </button>
          <button class="primary-btn" @click="handleSubmit" :disabled="!canSubmit || submitting">
            {{ submitting ? '提交中...' : '📤 提交申报' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 数据库连接状态显示 -->
    <div v-if="showDebugInfo" class="db-status-bar">
      <div class="db-status-content">
        <span class="db-status-label">📊 数据库状态：</span>
        <span class="db-status-value" :class="{ connected: dbConnected }">
          {{ dbConnected ? '✅ 已连接' : '❌ 未连接' }}
        </span>
        <span class="db-user-info" v-if="currentUser">
          当前用户：{{ currentUser.name }} ({{ getUserRoleText(currentUser.role) }})
        </span>
        <button @click="toggleDebugInfo" class="db-toggle-btn">
          {{ showDebugInfo ? '隐藏' : '显示' }}调试
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">正在加载项目数据...</div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMessage" class="error-alert">
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <span class="error-text">{{ errorMessage }}</span>
        <button @click="errorMessage = ''" class="error-close">×</button>
      </div>
    </div>

    <!-- 申报步骤指示器 -->
    <div class="steps-container">
      <div
        v-for="(step, index) in steps"
        :key="step.key"
        class="step-item"
        :class="{
          active: currentStep === index + 1,
          completed: currentStep > index + 1,
        }"
        @click="jumpToStep(index + 1)"
      >
        <span class="step-number">{{ index + 1 }}</span>
        <span class="step-label">{{ step.label }}</span>
      </div>
    </div>

    <!-- 步骤1：基本信息 -->
    <div v-show="currentStep === 1" class="step-content">
      <div class="section-card">
        <h3 class="section-title">一、项目基本信息</h3>

        <div class="form-row">
          <div class="form-group">
            <label>项目标题 <span class="required">*</span></label>
            <input
              type="text"
              v-model="formData.title"
              placeholder="请输入项目标题"
              required
              maxlength="200"
              :disabled="loading"
            />
            <div class="char-counter">{{ formData.title.length }}/200</div>
          </div>

          <div class="form-group">
            <label>研究领域 <span class="required">*</span></label>
            <select v-model="formData.domain_id" required :disabled="loading">
              <option value="">请选择研究领域</option>
              <option v-for="domain in researchDomains" :key="domain.id" :value="domain.id">
                {{ domain.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>研究期限 <span class="required">*</span></label>
            <div class="date-range">
              <input
                type="date"
                v-model="formData.start_date"
                placeholder="开始日期"
                required
                :disabled="loading"
              />
              <span class="date-separator">至</span>
              <input
                type="date"
                v-model="formData.end_date"
                placeholder="结束日期"
                required
                :disabled="loading"
              />
            </div>
          </div>

          <div class="form-group">
            <label>研究周期（月）</label>
            <input type="text" :value="durationMonths + '个月'" disabled />
          </div>
        </div>

        <div class="form-group">
          <label>关键词 <span class="required">*</span></label>
          <div class="tags-input">
            <div class="tags-container">
              <span v-for="(keyword, index) in keywordsArray" :key="index" class="tag">
                {{ keyword }}
                <span class="remove-tag" @click="removeKeyword(index)" :disabled="loading">×</span>
              </span>
            </div>
            <input
              type="text"
              v-model="keywordInput"
              placeholder="输入关键词后按回车"
              @keydown.enter="addKeyword"
              @blur="addKeyword"
              maxlength="20"
              :disabled="loading"
            />
          </div>
          <div class="form-hint">建议添加3-5个关键词，用逗号或空格分隔</div>
        </div>
      </div>

      <div class="section-card">
        <h3 class="section-title">二、项目负责人信息</h3>

        <div class="form-row">
          <div class="form-group">
            <label>负责人姓名</label>
            <input type="text" :value="currentUser?.name || '未登录'" disabled />
          </div>

          <div class="form-group">
            <label>所属部门</label>
            <input type="text" :value="currentUser?.department || '未设置'" disabled />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>职称/职务</label>
            <input type="text" :value="currentUser?.title || '未设置'" disabled />
          </div>

          <div class="form-group">
            <label>联系电话</label>
            <input type="text" :value="currentUser?.phone || '未设置'" disabled />
          </div>
        </div>

        <div class="form-group">
          <label>电子邮箱</label>
          <input type="email" :value="currentUser?.email || '未设置'" disabled />
        </div>
      </div>
    </div>

    <!-- 步骤2：研究内容 -->
    <div v-show="currentStep === 2" class="step-content">
      <div class="section-card">
        <h3 class="section-title">三、研究内容与方案</h3>

        <div class="form-group">
          <label>项目摘要 <span class="required">*</span></label>
          <textarea
            v-model="formData.abstract"
            placeholder="请简要概括项目的主要内容、目标、方法和意义（500字以内）"
            rows="4"
            required
            maxlength="500"
            :disabled="loading"
          ></textarea>
          <div class="char-counter">{{ formData.abstract.length }}/500</div>
        </div>

        <div class="form-group">
          <label>研究背景与意义 <span class="required">*</span></label>
          <textarea
            v-model="formData.background"
            placeholder="请阐述项目的研究背景、国内外研究现状、理论意义和实际应用价值"
            rows="6"
            required
            :disabled="loading"
          ></textarea>
        </div>

        <div class="form-group">
          <label>研究目标与内容 <span class="required">*</span></label>
          <textarea
            v-model="formData.objectives"
            placeholder="请详细说明项目的研究目标、研究内容、拟解决的关键科学问题"
            rows="6"
            required
            :disabled="loading"
          ></textarea>
        </div>

        <div class="form-group">
          <label>研究方法与技术路线 <span class="required">*</span></label>
          <textarea
            v-model="formData.methodology"
            placeholder="请描述项目的研究方法、技术路线、实验方案等"
            rows="6"
            required
            :disabled="loading"
          ></textarea>
        </div>
      </div>
    </div>

    <!-- 步骤3：团队与成果 -->
    <div v-show="currentStep === 3" class="step-content">
      <div class="section-card">
        <h3 class="section-title">四、研究团队</h3>

        <div class="team-members">
          <div class="team-header">
            <h4>项目组成员</h4>
            <button type="button" class="add-btn" @click="addTeamMember" :disabled="loading">
              + 添加成员
            </button>
          </div>

          <div v-for="(member, index) in teamMembers" :key="index" class="member-card">
            <div class="member-header">
              <span>成员 {{ index + 1 }}</span>
              <button
                type="button"
                class="remove-btn"
                @click="removeTeamMember(index)"
                v-if="teamMembers.length > 1"
                :disabled="loading"
              >
                删除
              </button>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>姓名 <span class="required">*</span></label>
                <input
                  type="text"
                  v-model="member.name"
                  placeholder="请输入姓名"
                  required
                  :disabled="loading"
                />
              </div>

              <div class="form-group">
                <label>单位</label>
                <input
                  type="text"
                  v-model="member.organization"
                  placeholder="请输入所在单位"
                  :disabled="loading"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>职称</label>
                <input
                  type="text"
                  v-model="member.title"
                  placeholder="请输入职称"
                  :disabled="loading"
                />
              </div>

              <div class="form-group">
                <label>角色</label>
                <select v-model="member.member_role" :disabled="loading">
                  <option value="researcher">研究人员</option>
                  <option value="principal">项目负责人</option>
                  <option value="co_principal">共同负责人</option>
                  <option value="student">研究生/学生</option>
                  <option value="other">其他</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>分工/职责</label>
              <input
                type="text"
                v-model="member.responsibility"
                placeholder="请输入在研究中的分工"
                :disabled="loading"
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>工作量占比 (%)</label>
                <input
                  type="number"
                  v-model="member.workload_percentage"
                  min="0"
                  max="100"
                  placeholder="0-100"
                  :disabled="loading"
                />
              </div>

              <div class="form-group">
                <label>是否知名人物</label>
                <select v-model="member.is_notable" :disabled="loading">
                  <option :value="false">否</option>
                  <option :value="true">是</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="section-card">
        <h3 class="section-title">五、预期成果</h3>

        <div class="form-group">
          <label>预期成果描述 <span class="required">*</span></label>
          <textarea
            v-model="formData.expected_outcomes"
            placeholder="请描述项目预期取得的成果（论文、专利、软件著作权、技术报告等）"
            rows="4"
            required
            :disabled="loading"
          ></textarea>
        </div>
      </div>
    </div>

    <!-- 步骤4：经费预算 -->
    <div v-show="currentStep === 4" class="step-content">
      <div class="section-card">
        <h3 class="section-title">六、经费预算</h3>
        <p class="section-subtitle">请根据项目实际需求填写经费预算（单位：元）</p>

        <div class="budget-table">
          <table>
            <thead>
              <tr>
                <th>预算科目</th>
                <th>项目名称</th>
                <th>详细说明</th>
                <th>计算方法</th>
                <th>金额（元）</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in budgetItems" :key="index">
                <td>
                  <select v-model="item.category" class="budget-select" :disabled="loading">
                    <option value="">请选择科目</option>
                    <option value="设备费">设备费</option>
                    <option value="材料费">材料费</option>
                    <option value="测试费">测试/计算/分析费</option>
                    <option value="差旅费">差旅/会议/国际合作交流费</option>
                    <option value="会议费">会议费</option>
                    <option value="劳务费">劳务费</option>
                    <option value="专家咨询费">专家咨询费</option>
                    <option value="出版费">出版/文献/信息传播/知识产权事务费</option>
                    <option value="管理费">管理费</option>
                    <option value="其他">其他支出</option>
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    v-model="item.item_name"
                    placeholder="填写预算项目名称"
                    :disabled="loading"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    v-model="item.description"
                    placeholder="填写详细说明"
                    :disabled="loading"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    v-model="item.calculation_method"
                    placeholder="填写计算方法"
                    :disabled="loading"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    v-model="item.amount"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    @input="calculateTotal"
                    :disabled="loading"
                  />
                </td>
                <td>
                  <button
                    type="button"
                    class="table-btn danger"
                    @click="removeBudgetItem(index)"
                    :disabled="loading"
                  >
                    删除
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" class="total-label">预算合计</td>
                <td class="total-amount">¥ {{ totalBudget.toFixed(2) }}</td>
                <td>
                  <button
                    type="button"
                    class="table-btn primary"
                    @click="addBudgetItem"
                    :disabled="loading"
                  >
                    + 添加科目
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="budget-summary">
          <div class="summary-item">
            <span class="summary-label">经费总额：</span>
            <span class="summary-value">¥ {{ totalBudget.toFixed(2) }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">研究周期：</span>
            <span class="summary-value">{{ durationMonths }} 个月</span>
          </div>
        </div>

        <div class="form-group">
          <label>预算依据说明</label>
          <textarea
            v-model="budgetJustification"
            placeholder="请对经费预算的必要性、合理性进行说明"
            rows="4"
            :disabled="loading"
          ></textarea>
        </div>
      </div>
    </div>

    <!-- 底部导航按钮 -->
    <div class="step-navigation">
      <div class="nav-left">
        <button
          v-if="currentStep > 1"
          class="nav-btn secondary"
          @click="prevStep"
          :disabled="loading"
        >
          上一步
        </button>
      </div>

      <div class="nav-center">
        <div class="step-progress">
          <span>步骤 {{ currentStep }}/{{ steps.length }}</span>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
          </div>
        </div>
      </div>

      <div class="nav-right">
        <button
          v-if="currentStep < steps.length"
          class="nav-btn primary"
          @click="nextStep"
          :disabled="!canProceed || loading"
        >
          下一步
        </button>
        <button
          v-else
          class="nav-btn success"
          @click="handleSubmit"
          :disabled="!canSubmit || loading || submitting"
        >
          {{ submitting ? '提交中...' : '✅ 提交申报' }}
        </button>
      </div>
    </div>

    <!-- 提交确认对话框 -->
    <div v-if="showConfirmDialog" class="modal-overlay">
      <div class="modal-content">
        <h3>确认提交</h3>
        <p>提交后项目将进入审核流程，无法再修改。确认要提交吗？</p>

        <div class="modal-actions">
          <button class="modal-btn secondary" @click="showConfirmDialog = false">再检查一下</button>
          <button class="modal-btn primary" @click="confirmSubmit" :disabled="submitting">
            {{ submitting ? '提交中...' : '确认提交' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const router = useRouter()
const route = useRoute()

// API配置
const API_BASE_URL = 'http://localhost:3002/api'

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

// 请求拦截器 - 添加token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message)

    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('userInfo')
      ElMessage.error('登录已过期，请重新登录')
      router.push('/login')
    }

    return Promise.reject(error)
  },
)

// API状态
const loading = ref(false)
const saving = ref(false)
const submitting = ref(false)
const dbConnected = ref(false)
const showDebugInfo = ref(import.meta.env.DEV)

// 用户信息接口
interface User {
  id: string
  username: string
  name: string
  email: string
  role: string
  department?: string
  title?: string
  phone?: string
}

// 研究领域接口
interface ResearchDomain {
  id: string
  name: string
  code: string
  level: number
}

// 项目数据接口
interface Project {
  id: string
  project_code?: string
  title: string
  domain_id: string
  keywords: string
  abstract: string
  background: string
  objectives: string
  methodology: string
  expected_outcomes: string
  budget_total: number
  duration_months: number
  start_date?: string
  end_date?: string
  status: string
}

// 团队成员接口
interface TeamMember {
  name: string
  organization: string
  title: string
  member_role: string
  responsibility: string
  workload_percentage: number
  is_notable: boolean
}

// 预算项接口
interface BudgetItem {
  category: string
  item_name: string
  description: string
  calculation_method: string
  amount: number
}

// 数据状态
const currentUser = ref<User | null>(null)
const researchDomains = ref<ResearchDomain[]>([])
const currentProject = ref<Project | null>(null)
const isEditing = ref(false)

// 步骤配置
const steps = [
  { key: 'basic', label: '基本信息' },
  { key: 'content', label: '研究内容' },
  { key: 'team', label: '团队成果' },
  { key: 'budget', label: '经费预算' },
]

// 当前步骤
const currentStep = ref(1)
const showConfirmDialog = ref(false)
const errorMessage = ref('')
const keywordInput = ref('')

// 主表单数据
const formData = reactive({
  title: '',
  domain_id: '',
  keywords: '',
  abstract: '',
  background: '',
  objectives: '',
  methodology: '',
  expected_outcomes: '',
  budget_total: 0,
  duration_months: 0,
  start_date: '',
  end_date: '',
  status: 'draft' as const,
})

// 团队成员数据
const teamMembers = ref<TeamMember[]>([
  {
    name: '',
    organization: '',
    title: '',
    member_role: 'researcher',
    responsibility: '',
    workload_percentage: 0,
    is_notable: false,
  },
])

// 预算数据
const budgetItems = ref<BudgetItem[]>([
  {
    category: '',
    item_name: '',
    description: '',
    calculation_method: '',
    amount: 0,
  },
])
const budgetJustification = ref('')

// 计算属性
const progressPercentage = computed(() => {
  return (currentStep.value / steps.length) * 100
})

const totalBudget = computed(() => {
  return budgetItems.value.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
})

const durationMonths = computed(() => {
  if (!formData.start_date || !formData.end_date) return 0
  const start = new Date(formData.start_date)
  const end = new Date(formData.end_date)
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
})

const keywordsArray = computed(() => {
  return formData.keywords ? formData.keywords.split(',').filter((k) => k.trim()) : []
})

const canProceed = computed(() => {
  if (loading.value) return false

  switch (currentStep.value) {
    case 1:
      return (
        formData.title &&
        formData.domain_id &&
        formData.start_date &&
        formData.end_date &&
        keywordsArray.value.length >= 1
      )
    case 2:
      return formData.abstract && formData.background && formData.objectives && formData.methodology
    case 3:
      return formData.expected_outcomes && teamMembers.value.every((m) => m.name && m.name.trim())
    case 4:
      return (
        totalBudget.value > 0 &&
        budgetItems.value.every((item) => item.category && item.item_name && item.amount > 0)
      )
    default:
      return true
  }
})

const canSubmit = computed(() => {
  return canProceed.value && currentStep.value === steps.length
})

// 监听总预算变化
watch(totalBudget, (newTotal) => {
  formData.budget_total = newTotal
})

// 监听研究期限变化
watch(durationMonths, (newMonths) => {
  formData.duration_months = newMonths
})

// 获取用户角色文本
const getUserRoleText = (role?: string) => {
  const roleMap: Record<string, string> = {
    applicant: '申请人',
    reviewer: '评审专家',
    project_manager: '项目经理',
    admin: '管理员',
  }
  return roleMap[role || ''] || role || '用户'
}

// 加载研究领域
const loadResearchDomains = async () => {
  try {
    const response = await api.get('/research-domains')
    if (response.success && response.data) {
      researchDomains.value = response.data
    }
  } catch (error) {
    console.warn('加载研究领域失败:', error)
    // 使用默认研究领域
    researchDomains.value = [
      { id: '1', name: '数字孪生与元宇宙', code: 'DT_METAVERSE', level: 1 },
      { id: '2', name: '人工智能与机器学习', code: 'AI_ML', level: 1 },
      { id: '3', name: '大数据与数据治理', code: 'BIG_DATA', level: 1 },
    ]
  }
}

// 加载用户信息
const loadCurrentUser = async () => {
  try {
    const userInfoStr = localStorage.getItem('userInfo')
    if (userInfoStr) {
      currentUser.value = JSON.parse(userInfoStr)
    } else {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        currentUser.value = JSON.parse(userStr)
      }
    }

    if (!currentUser.value) {
      const response = await api.get('/auth/profile')
      if (response.success && response.data) {
        currentUser.value = response.data
      }
    }

    dbConnected.value = true
    console.log('✅ 用户信息加载成功:', currentUser.value?.name)
  } catch (error) {
    console.error('❌ 加载用户信息失败:', error)
    errorMessage.value = '加载用户信息失败'
  }
}

// 加载项目数据（编辑模式）
const loadProjectData = async (projectId: string) => {
  loading.value = true
  try {
    const response = await api.get(`/projects/${projectId}`)

    if (response.success && response.data) {
      const data = response.data.project || response.data
      currentProject.value = data
      isEditing.value = true

      // 填充表单
      formData.title = data.title || ''
      formData.domain_id = data.domain_id || ''
      formData.keywords = data.keywords || ''
      formData.abstract = data.abstract || ''
      formData.background = data.background || ''
      formData.objectives = data.objectives || ''
      formData.methodology = data.methodology || ''
      formData.expected_outcomes = data.expected_outcomes || ''
      formData.budget_total = data.budget_total || 0
      formData.duration_months = data.duration_months || 0
      formData.start_date = data.start_date ? data.start_date.split('T')[0] : ''
      formData.end_date = data.end_date ? data.end_date.split('T')[0] : ''

      // 加载团队成员
      if (data.members && data.members.length > 0) {
        teamMembers.value = data.members.map((m: any) => ({
          name: m.name || '',
          organization: m.organization || '',
          title: m.title || '',
          member_role: m.member_role || 'researcher',
          responsibility: m.responsibility || '',
          workload_percentage: m.workload_percentage || 0,
          is_notable: m.is_notable || false,
        }))
      }

      // 加载预算
      if (data.budgets && data.budgets.length > 0) {
        budgetItems.value = data.budgets.map((b: any) => ({
          category: b.category || '',
          item_name: b.item_name || '',
          description: b.description || '',
          calculation_method: b.calculation_method || '',
          amount: b.amount || 0,
        }))
      }

      ElMessage.success('项目数据加载成功')
    }
  } catch (error) {
    console.error('❌ 加载项目数据失败:', error)
    ElMessage.error('加载项目数据失败')
  } finally {
    loading.value = false
  }
}

// 关键词操作
const addKeyword = () => {
  const keywords = keywordInput.value.trim()
  if (keywords) {
    const newKeywords = keywords.split(/[\s,，]+/).filter((k) => k)
    const allKeywords = [...keywordsArray.value, ...newKeywords]
    const uniqueKeywords = [...new Set(allKeywords)].slice(0, 10)
    formData.keywords = uniqueKeywords.join(',')
    keywordInput.value = ''
  }
}

const removeKeyword = (index: number) => {
  const keywords = keywordsArray.value
  keywords.splice(index, 1)
  formData.keywords = keywords.join(',')
}

// 团队成员操作
const addTeamMember = () => {
  teamMembers.value.push({
    name: '',
    organization: '',
    title: '',
    member_role: 'researcher',
    responsibility: '',
    workload_percentage: 0,
    is_notable: false,
  })
}

const removeTeamMember = (index: number) => {
  if (teamMembers.value.length > 1) {
    teamMembers.value.splice(index, 1)
  }
}

// 预算操作
const addBudgetItem = () => {
  budgetItems.value.push({
    category: '',
    item_name: '',
    description: '',
    calculation_method: '',
    amount: 0,
  })
}

const removeBudgetItem = (index: number) => {
  if (budgetItems.value.length > 1) {
    budgetItems.value.splice(index, 1)
  }
}

const calculateTotal = () => {
  formData.budget_total = totalBudget.value
}

// 步骤导航
const nextStep = () => {
  if (canProceed.value && currentStep.value < steps.length) {
    currentStep.value++
    window.scrollTo(0, 0)
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
    window.scrollTo(0, 0)
  }
}

const jumpToStep = (step: number) => {
  if (step <= currentStep.value) {
    currentStep.value = step
    window.scrollTo(0, 0)
  }
}

// 保存草稿
const saveDraft = async () => {
  if (!currentUser.value) {
    ElMessage.error('请先登录')
    return
  }

  saving.value = true

  try {
    // 准备项目数据
    const projectData = {
      title: formData.title || '未命名项目',
      domain_id: formData.domain_id || null,
      keywords: formData.keywords || '',
      abstract: formData.abstract || '',
      background: formData.background || '',
      objectives: formData.objectives || '',
      methodology: formData.methodology || '',
      expected_outcomes: formData.expected_outcomes || '',
      budget_total: totalBudget.value,
      duration_months: durationMonths.value,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      status: 'draft',
    }

    let response

    if (isEditing.value && currentProject.value) {
      response = await api.put(`/projects/${currentProject.value.id}`, projectData)
    } else {
      response = await api.post('/projects', projectData)

      if (response.success && response.data?.id) {
        currentProject.value = {
          id: response.data.id,
          project_code: response.data.project_code,
          ...projectData,
        }
        isEditing.value = true
      }
    }

    if (response.success) {
      ElMessage.success('保存成功')
    } else {
      ElMessage.error(response.error || '保存失败')
    }
  } catch (error: any) {
    console.error('❌ 保存失败:', error)
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

// 提交项目
const handleSubmit = () => {
  if (!canSubmit.value) {
    ElMessage.warning('请完成所有必填项后再提交')
    return
  }
  showConfirmDialog.value = true
}

const confirmSubmit = async () => {
  submitting.value = true
  try {
    // 先保存
    if (!currentProject.value?.id) {
      await saveDraft()
      if (!currentProject.value?.id) {
        throw new Error('项目保存失败')
      }
    }

    const response = await api.put(`/projects/${currentProject.value.id}`, {
      status: 'submitted',
      submit_date: new Date().toISOString().split('T')[0],
    })

    if (response.success) {
      ElMessage.success('项目提交成功！')
      setTimeout(() => {
        router.push('/projects')
      }, 1500)
    } else {
      ElMessage.error(response.error || '提交失败')
    }
  } catch (error: any) {
    console.error('❌ 提交失败:', error)
    ElMessage.error(error.message || '提交失败')
  } finally {
    submitting.value = false
    showConfirmDialog.value = false
  }
}

// 返回
const goBack = async () => {
  try {
    await ElMessageBox.confirm('确定要离开吗？未保存的内容将会丢失。', '确认离开', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    router.back()
  } catch {
    // 用户取消
  }
}

// 调试信息
const toggleDebugInfo = () => {
  showDebugInfo.value = !showDebugInfo.value
}

// 初始化
onMounted(async () => {
  // 设置默认日期
  const today = new Date()
  const nextYear = new Date(today)
  nextYear.setFullYear(today.getFullYear() + 1)

  formData.start_date = today.toISOString().split('T')[0]
  formData.end_date = nextYear.toISOString().split('T')[0]

  await loadCurrentUser()
  await loadResearchDomains()

  const projectId = (route.query.id as string) || (route.params.id as string)
  if (projectId) {
    await loadProjectData(projectId)
  }
})
</script>

<style scoped>
/* 样式保持不变，与之前相同 */
.create-project-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  padding: 8px 16px;
  background: #f5f7fa;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.back-btn:hover {
  background: #e8e8e8;
}

.header-left h1 {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.draft-info {
  color: #fa8c16;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.primary-btn,
.secondary-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.primary-btn {
  background: #1890ff;
  color: white;
}

.primary-btn:hover:not(:disabled) {
  background: #40a9ff;
}

.primary-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.secondary-btn {
  background: #f5f7fa;
  color: #666;
  border: 1px solid #d9d9d9;
}

.secondary-btn:hover {
  background: #e8e8e8;
}

.db-status-bar {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 8px;
  padding: 12px 20px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.db-status-content {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.db-status-label {
  font-weight: bold;
  color: #52c41a;
}

.db-status-value {
  font-weight: bold;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 14px;
}

.db-status-value.connected {
  background: #d9f7be;
  color: #389e0d;
}

.db-status-value:not(.connected) {
  background: #fff2f0;
  color: #ff4d4f;
}

.db-user-info {
  color: #666;
  font-size: 14px;
}

.db-toggle-btn {
  padding: 4px 12px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  margin-left: auto;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
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
  margin-top: 20px;
  color: #1890ff;
  font-weight: bold;
}

.error-alert {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 8px;
  padding: 12px 20px;
  margin-bottom: 20px;
}

.error-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.error-icon {
  font-size: 20px;
}

.error-text {
  flex: 1;
  color: #ff4d4f;
}

.error-close {
  background: none;
  border: none;
  font-size: 20px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 步骤指示器 */
.steps-container {
  display: flex;
  margin-bottom: 32px;
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.step-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 12px;
  position: relative;
}

.step-item:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 24px;
  right: -50%;
  width: 100%;
  height: 2px;
  background: #e8e8e8;
  z-index: 1;
}

.step-item.completed:not(:last-child)::after {
  background: #52c41a;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f5f5f5;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  z-index: 2;
}

.step-item.active .step-number {
  background: #1890ff;
  color: white;
}

.step-item.completed .step-number {
  background: #52c41a;
  color: white;
}

.step-label {
  font-size: 14px;
  color: #666;
}

.step-item.active .step-label {
  color: #1890ff;
  font-weight: 500;
}

/* 内容区域 */
.step-content {
  background: white;
  border-radius: 12px;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-card {
  margin-bottom: 32px;
}

.section-card:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 18px;
  color: #2c3e50;
  margin: 0 0 24px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #1890ff;
}

.section-subtitle {
  color: #666;
  margin: -16px 0 24px 0;
  font-size: 14px;
}

/* 表单样式 */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #34495e;
}

.required {
  color: #ff4d4f;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.3s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.form-group input[disabled] {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

/* 关键词输入 */
.tags-input {
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 8px;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.tag {
  background: #e6f7ff;
  color: #1890ff;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.remove-tag {
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}

.remove-tag:hover {
  color: #ff4d4f;
}

.tags-input input {
  border: none;
  padding: 8px;
  width: 100%;
}

.tags-input input:focus {
  outline: none;
  box-shadow: none;
}

/* 字符计数器 */
.char-counter {
  text-align: right;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

/* 日期范围 */
.date-range {
  display: flex;
  align-items: center;
  gap: 12px;
}

.date-separator {
  color: #999;
  flex-shrink: 0;
}

/* 研究团队 */
.team-members {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 20px;
}

.team-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.team-header h4 {
  margin: 0;
  font-size: 16px;
}

.add-btn {
  padding: 6px 16px;
  background: #f5f7fa;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.add-btn:hover {
  background: #e8e8e8;
}

.member-card {
  padding: 16px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  margin-bottom: 16px;
}

.member-card:last-child {
  margin-bottom: 0;
}

.member-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.member-header span {
  font-weight: 500;
  color: #666;
}

.remove-btn {
  padding: 4px 12px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  color: #ff4d4f;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.remove-btn:hover {
  background: #ffccc7;
}

/* 预算表格 */
.budget-table {
  overflow-x: auto;
  margin-bottom: 24px;
}

.budget-table table {
  width: 100%;
  border-collapse: collapse;
}

.budget-table th {
  background: #f5f7fa;
  padding: 12px;
  text-align: left;
  font-weight: 500;
  color: #2c3e50;
  border: 1px solid #e8e8e8;
}

.budget-table td {
  padding: 12px;
  border: 1px solid #e8e8e8;
}

.budget-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.budget-table input[type='text'],
.budget-table input[type='number'] {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.table-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.table-btn.primary {
  background: #1890ff;
  color: white;
}

.table-btn.primary:hover {
  background: #40a9ff;
}

.table-btn.danger {
  background: #fff2f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
}

.table-btn.danger:hover {
  background: #ffccc7;
}

.budget-table tfoot {
  background: #f9f9f9;
}

.total-label {
  font-weight: bold;
  text-align: right;
}

.total-amount {
  font-weight: bold;
  color: #1890ff;
  font-size: 18px;
}

/* 预算汇总 */
.budget-summary {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
}

.summary-item {
  margin-bottom: 12px;
}

.summary-item:last-child {
  margin-bottom: 0;
}

.summary-label {
  font-weight: 500;
  color: #666;
}

.summary-value {
  color: #52c41a;
  font-size: 18px;
  font-weight: bold;
}

/* 底部导航 */
.step-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.nav-btn {
  padding: 12px 32px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.nav-btn.primary {
  background: #1890ff;
  color: white;
}

.nav-btn.primary:hover:not(:disabled) {
  background: #40a9ff;
}

.nav-btn.primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.nav-btn.secondary {
  background: #f5f7fa;
  color: #666;
  border: 1px solid #d9d9d9;
}

.nav-btn.secondary:hover {
  background: #e8e8e8;
}

.nav-btn.success {
  background: #52c41a;
  color: white;
}

.nav-btn.success:hover:not(:disabled) {
  background: #73d13d;
}

.step-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.step-progress span {
  font-size: 14px;
  color: #666;
}

.progress-bar {
  width: 200px;
  height: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #1890ff;
  border-radius: 4px;
  transition: width 0.3s;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 32px;
  max-width: 500px;
  width: 90%;
  text-align: center;
}

.modal-content h3 {
  margin: 0 0 16px 0;
  color: #2c3e50;
}

.modal-content p {
  margin: 0 0 24px 0;
  color: #666;
  line-height: 1.6;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.modal-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  min-width: 120px;
}

.modal-btn.primary {
  background: #1890ff;
  color: white;
}

.modal-btn.primary:hover {
  background: #40a9ff;
}

.modal-btn.secondary {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #d9d9d9;
}

.modal-btn.secondary:hover {
  background: #e8e8e8;
}

.form-hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

/* 响应式调整 */
@media (max-width: 992px) {
  .create-project-container {
    padding: 16px;
  }

  .step-content {
    padding: 24px;
  }

  .steps-container {
    padding: 12px;
  }

  .step-item:not(:last-child)::after {
    display: none;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-left,
  .header-right {
    width: 100%;
  }

  .header-actions {
    justify-content: flex-end;
  }

  .steps-container {
    flex-wrap: wrap;
    gap: 12px;
  }

  .step-item {
    flex: none;
    width: calc(50% - 12px);
  }

  .nav-left,
  .nav-right {
    width: 100%;
  }

  .nav-center {
    display: none;
  }

  .step-navigation {
    flex-direction: column;
    gap: 16px;
  }

  .nav-btn {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .step-item {
    width: 100%;
  }

  .modal-actions {
    flex-direction: column;
  }

  .modal-btn {
    width: 100%;
  }
}
</style>
