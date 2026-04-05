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
        </div>

        <div class="form-group full-width">
          <label>研究领域 <span class="required">*</span></label>
          <div class="domains-buttons">
            <button
              v-for="domain in researchDomains"
              :key="domain.id"
              type="button"
              class="domain-btn"
              :class="{ active: selectedDomains.includes(domain.id) }"
              @click="toggleDomain(domain.id)"
              :disabled="loading"
            >
              {{ domain.name }}
            </button>
          </div>
          <div class="form-hint">
            <span>✅ 已选择 {{ selectedDomains.length }} 个研究领域</span>
            <span v-if="selectedDomains.length === 0" class="required-hint"
              >（请至少选择一个）</span
            >
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>技术成熟度</label>
            <select v-model="formData.tech_maturity" :disabled="loading">
              <option value="">请选择技术成熟度</option>
              <option value="rd">研发阶段（理论模型验证完成，未形成样机）</option>
              <option value="pilot">小试阶段（原理样机开发完成，可初步测试）</option>
              <option value="intermediate_trial">中试阶段（小批量样品试制，达标率≥80%）</option>
              <option value="small_batch_prod">小批量生产阶段（量产工艺基础 + 少量订单）</option>
            </select>
          </div>

          <div class="form-group">
            <label>预期成果转化形式</label>
            <div class="checkbox-group">
              <label v-for="opt in transformOptions" :key="opt.value" class="checkbox-label">
                <input type="checkbox" :value="opt.value" v-model="achievementTransform" />
                {{ opt.label }}
              </label>
              <div v-if="achievementTransform.includes('other')" class="other-input">
                <input
                  type="text"
                  v-model="formData.achievement_transform_other_text"
                  placeholder="请注明其他转化形式"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>概念验证阶段需求</label>
            <div class="checkbox-group">
              <label v-for="opt in pocOptions" :key="opt.value" class="checkbox-label">
                <input type="checkbox" :value="opt.value" v-model="pocStageRequirement" />
                {{ opt.label }}
              </label>
              <div v-if="pocStageRequirement.includes('multi_stage_combo')" class="other-input">
                <input
                  type="text"
                  v-model="formData.poc_multi_stage_note"
                  placeholder="请说明多阶段组合情况"
                />
              </div>
            </div>
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
            <label>所属部门/单位</label>
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

    <!-- 步骤2：项目详细介绍 -->
    <div v-show="currentStep === 2" class="step-content">
      <div class="section-card">
        <h3 class="section-title">三、项目详细介绍</h3>

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
          <label>成果简介（背景、痛点、技术方案、竞争优势、创新点等）</label>
          <textarea
            v-model="formData.detailed_introduction_part1"
            placeholder="请阐述项目的研究背景、解决的核心问题、技术创新性、推广应用价值等"
            rows="8"
            :disabled="loading"
          ></textarea>
        </div>

        <div class="form-group">
          <label>知识产权情况</label>
          <textarea
            v-model="formData.detailed_introduction_part2"
            placeholder="请说明知识产权权属、专利/软著数量、核心知识产权摘要等"
            rows="6"
            :disabled="loading"
          ></textarea>
        </div>

        <div class="form-group">
          <label>已有应用/试点情况</label>
          <textarea
            v-model="formData.detailed_introduction_part3"
            placeholder="请说明已有应用案例、试点情况、获奖情况等（无则填「无」）"
            rows="6"
            :disabled="loading"
          ></textarea>
        </div>

        <div class="form-group">
          <label>实施计划</label>
          <textarea
            v-model="formData.implementation_plan"
            placeholder="请说明项目实施计划、时间安排等"
            rows="6"
            :disabled="loading"
          ></textarea>
        </div>

        <div class="form-group">
          <label>其他补充说明</label>
          <textarea
            v-model="formData.supplementary_info"
            placeholder="其他需要补充说明的内容"
            rows="4"
            :disabled="loading"
          ></textarea>
        </div>
      </div>
    </div>

    <!-- 步骤3：团队与成员 -->
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
                <label>邮箱</label>
                <input
                  type="email"
                  v-model="member.email"
                  placeholder="请输入邮箱"
                  :disabled="loading"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>所属单位</label>
                <input
                  type="text"
                  v-model="member.organization"
                  placeholder="请输入所在单位"
                  :disabled="loading"
                />
              </div>

              <div class="form-group">
                <label>职称</label>
                <input
                  type="text"
                  v-model="member.title"
                  placeholder="请输入职称"
                  :disabled="loading"
                />
              </div>
            </div>

            <div class="form-group">
              <label>项目角色 <span class="required">*</span></label>
              <select v-model="member.role" :disabled="loading">
                <option value="principal">项目负责人</option>
                <option value="contact">联系人</option>
                <option value="other">其他成员</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 步骤4：经费预算 -->
    <div v-show="currentStep === 4" class="step-content">
      <div class="section-card">
        <h3 class="section-title">五、经费预算</h3>
        <p class="section-subtitle">请根据项目实际需求填写经费预算（单位：元）</p>

        <div class="budget-table">
          <table>
            <thead>
              <tr>
                <th>预算科目</th>
                <th>项目名称</th>
                <th>详细说明</th>
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
                    <option value="测试费">测试费</option>
                    <option value="差旅费">差旅费</option>
                    <option value="会议费">会议费</option>
                    <option value="劳务费">劳务费</option>
                    <option value="专家咨询费">专家咨询费</option>
                    <option value="出版费">出版费</option>
                    <option value="管理费">管理费</option>
                    <option value="其他">其他</option>
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
                <td colspan="3" class="total-label">预算合计</td>
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
      </div>
    </div>

    <!-- 步骤5：附件材料 -->
    <div v-show="currentStep === 5" class="step-content">
      <div class="section-card">
        <h3 class="section-title">六、附件材料</h3>
        <p class="section-subtitle">请上传项目相关的附件材料（图片、文档等）</p>

        <!-- 附件上传区域 -->
        <div class="attachments-section">
          <div
            class="upload-area"
            @dragover.prevent
            @drop.prevent="handleDrop"
            @click="triggerFileInput"
          >
            <div class="upload-icon">📎</div>
            <div class="upload-text">
              <span>点击或拖拽文件到此区域上传</span>
              <span class="upload-hint">支持 JPG、PNG、PDF、DOC、ZIP 格式，单个文件不超过10MB</span>
            </div>
            <input
              type="file"
              ref="fileInput"
              multiple
              accept="image/*,.pdf,.doc,.docx,.zip"
              style="display: none"
              @change="handleFileSelect"
            />
          </div>

          <!-- 附件列表 -->
          <div v-if="attachments.length > 0" class="attachments-list">
            <div
              v-for="(file, index) in attachments"
              :key="file.id || index"
              class="attachment-item"
            >
              <div class="attachment-info">
                <span class="attachment-icon">{{ getFileIcon(file.mime_type) }}</span>
                <div class="attachment-details">
                  <span class="attachment-name">{{ file.originalName || file.file_name }}</span>
                  <span class="attachment-size">{{ formatFileSize(file.file_size) }}</span>
                </div>
                <div class="attachment-actions">
                  <button
                    type="button"
                    class="preview-btn"
                    @click="previewAttachment(file)"
                    :disabled="uploading"
                  >
                    👁️
                  </button>
                  <button
                    type="button"
                    class="remove-btn"
                    @click="removeAttachment(index)"
                    :disabled="uploading"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div v-if="file.uploading" class="upload-progress">
                <div class="progress-fill-bar" :style="{ width: file.progress + '%' }"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>附件说明</label>
          <textarea
            v-model="attachmentDescription"
            placeholder="请说明附件的用途和内容"
            rows="3"
            :disabled="uploading"
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const router = useRouter()
const route = useRoute()

// API配置
const API_BASE_URL = 'http://localhost:3002/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear()
      router.push('/login')
    }
    return Promise.reject(error)
  },
)

// 状态
const loading = ref(false)
const saving = ref(false)
const submitting = ref(false)
const uploading = ref(false)
const dbConnected = ref(false)
const showDebugInfo = ref(import.meta.env.DEV)
const errorMessage = ref('')
const keywordInput = ref('')
const currentUser = ref<any>(null)
const researchDomains = ref<any[]>([])
const currentProject = ref<any>(null)
const isEditing = ref(false)
const showConfirmDialog = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const attachmentDescription = ref('')

// 步骤
const currentStep = ref(1)
const steps = [
  { key: 'basic', label: '基本信息' },
  { key: 'detail', label: '项目详情' },
  { key: 'team', label: '研究团队' },
  { key: 'budget', label: '经费预算' },
  { key: 'attachment', label: '附件材料' },
]

// 多选字段
const selectedDomains = ref<string[]>([])
const achievementTransform = ref<string[]>([])
const pocStageRequirement = ref<string[]>([])

// 附件列表
const attachments = ref<any[]>([])

// 表单数据
const formData = reactive({
  title: '',
  tech_maturity: '',
  achievement_transform_other_text: '',
  poc_multi_stage_note: '',
  keywords: '',
  abstract: '',
  detailed_introduction_part1: '',
  detailed_introduction_part2: '',
  detailed_introduction_part3: '',
  implementation_plan: '',
  supplementary_info: '',
  submit_date: '',
})

// 团队成员
const teamMembers = ref([{ name: '', email: '', organization: '', title: '', role: 'other' }])

// 预算项
const budgetItems = ref([{ category: '', item_name: '', description: '', amount: 0 }])

// 选项
const transformOptions = [
  { value: 'tech_transfer', label: '技术转让' },
  { value: 'tech_license', label: '技术许可' },
  { value: 'equity_investment', label: '作价投资' },
  { value: 'joint_dev', label: '联合开发' },
  { value: 'other', label: '其他' },
]

const pocOptions = [
  { value: 'creative_verify', label: '创意性验证' },
  { value: 'feasibility_verify', label: '可行性验证' },
  { value: 'commercial_verify', label: '商业化验证' },
  { value: 'multi_stage_combo', label: '多阶段组合' },
]

// 计算属性
const progressPercentage = computed(() => (currentStep.value / steps.length) * 100)
const totalBudget = computed(() =>
  budgetItems.value.reduce((s, i) => s + (Number(i.amount) || 0), 0),
)
const keywordsArray = computed(() =>
  formData.keywords ? formData.keywords.split(',').filter((k) => k.trim()) : [],
)

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1:
      return formData.title && selectedDomains.value.length > 0
    case 2:
      return formData.abstract
    case 3:
      return teamMembers.value.every((m) => m.name && m.name.trim())
    case 4:
      return totalBudget.value > 0
    case 5:
      return true
    default:
      return true
  }
})

const canSubmit = computed(() => canProceed.value && currentStep.value === steps.length)

// 方法
const getUserRoleText = (role?: string) => {
  const map: Record<string, string> = {
    applicant: '申请人',
    reviewer: '评审专家',
    project_manager: '项目经理',
    admin: '管理员',
  }
  return map[role || ''] || '用户'
}

const toggleDomain = (domainId: string) => {
  const index = selectedDomains.value.indexOf(domainId)
  if (index === -1) {
    selectedDomains.value.push(domainId)
  } else {
    selectedDomains.value.splice(index, 1)
  }
}

const addKeyword = () => {
  const kw = keywordInput.value.trim()
  if (kw) {
    const newKeywords = kw.split(/[\s,，]+/).filter((k) => k)
    const all = [...keywordsArray.value, ...newKeywords]
    formData.keywords = [...new Set(all)].slice(0, 10).join(',')
    keywordInput.value = ''
  }
}

const removeKeyword = (index: number) => {
  const arr = keywordsArray.value
  arr.splice(index, 1)
  formData.keywords = arr.join(',')
}

const addTeamMember = () => {
  teamMembers.value.push({ name: '', email: '', organization: '', title: '', role: 'other' })
}

const removeTeamMember = (index: number) => {
  if (teamMembers.value.length > 1) teamMembers.value.splice(index, 1)
}

const addBudgetItem = () => {
  budgetItems.value.push({ category: '', item_name: '', description: '', amount: 0 })
}

const removeBudgetItem = (index: number) => {
  if (budgetItems.value.length > 1) budgetItems.value.splice(index, 1)
}

const calculateTotal = () => {}

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

// 附件相关方法
const getFileIcon = (mimeType: string) => {
  if (!mimeType) return '📎'
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType === 'application/pdf') return '📄'
  if (mimeType.includes('word')) return '📝'
  if (mimeType.includes('zip')) return '🗜️'
  return '📎'
}

const formatFileSize = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  await uploadFiles(files)
  if (input) input.value = ''
}

const handleDrop = async (event: DragEvent) => {
  const files = Array.from(event.dataTransfer?.files || [])
  await uploadFiles(files)
}

const uploadFiles = async (files: File[]) => {
  for (const file of files) {
    if (file.size > 10 * 1024 * 1024) {
      ElMessage.warning(`文件 ${file.name} 超过10MB限制`)
      continue
    }

    const tempId = Date.now() + Math.random()
    const tempAttachment = {
      id: tempId,
      originalName: file.name,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      uploading: true,
      progress: 0,
      description: attachmentDescription.value,
    }
    attachments.value.push(tempAttachment)
    const index = attachments.value.findIndex((a) => a.id === tempId)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await axios.post(`${API_BASE_URL}/projects/upload-attachment`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && attachments.value[index]) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            attachments.value[index].progress = percentCompleted
          }
        },
      })

      if (response.data.success && response.data.data) {
        attachments.value[index] = {
          ...attachments.value[index],
          ...response.data.data,
          uploading: false,
          progress: 100,
        }
        ElMessage.success(`文件 ${file.name} 上传成功`)
      } else {
        attachments.value.splice(index, 1)
        ElMessage.error(`文件 ${file.name} 上传失败`)
      }
    } catch (error) {
      attachments.value.splice(index, 1)
      console.error('上传失败:', error)
      ElMessage.error(`文件 ${file.name} 上传失败`)
    }
  }
}

const previewAttachment = (file: any) => {
  if (file.file_path) {
    window.open(`http://localhost:3002${file.file_path}`, '_blank')
  }
}

const removeAttachment = (index: number) => {
  attachments.value.splice(index, 1)
}

// 保存草稿
const saveDraft = async () => {
  saving.value = true
  try {
    const payload = {
      title: formData.title,
      research_domains: selectedDomains.value,
      tech_maturity: formData.tech_maturity,
      achievement_transform: achievementTransform.value,
      achievement_transform_other_text: formData.achievement_transform_other_text,
      poc_stage_requirement: pocStageRequirement.value,
      poc_multi_stage_note: formData.poc_multi_stage_note,
      keywords: formData.keywords,
      abstract: formData.abstract,
      detailed_introduction_part1: formData.detailed_introduction_part1,
      detailed_introduction_part2: formData.detailed_introduction_part2,
      detailed_introduction_part3: formData.detailed_introduction_part3,
      implementation_plan: formData.implementation_plan,
      supplementary_info: formData.supplementary_info,
      team_members: teamMembers.value,
      budget_items: budgetItems.value,
      attachments: attachments.value.map((att) => ({
        file_name: att.originalName || att.file_name,
        file_path: att.file_path,
        file_size: att.file_size,
        mime_type: att.mime_type,
        type: att.mime_type?.startsWith('image/') ? 'image' : 'attachment',
        description: att.description || attachmentDescription.value,
      })),
    }

    const response =
      isEditing.value && currentProject.value
        ? await api.put(`/projects/${currentProject.value.id}`, payload)
        : await api.post('/projects', payload)

    if (response.success) {
      if (response.data?.id) currentProject.value = response.data
      isEditing.value = true
      ElMessage.success('草稿保存成功')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleSubmit = () => {
  if (selectedDomains.value.length === 0) {
    ElMessage.warning('请至少选择一个研究领域')
    return
  }
  if (!canSubmit.value) {
    ElMessage.warning('请完成所有必填项后再提交')
    return
  }
  showConfirmDialog.value = true
}

const confirmSubmit = async () => {
  submitting.value = true
  try {
    if (!currentProject.value?.id) {
      await saveDraft()
      if (!currentProject.value?.id) throw new Error('项目保存失败')
    }

    const response = await api.put(`/projects/${currentProject.value.id}`, {
      status: 'submitted',
      submit_date: new Date().toISOString().split('T')[0],
      attachments: attachments.value.map((att) => ({
        file_name: att.originalName || att.file_name,
        file_path: att.file_path,
        file_size: att.file_size,
        mime_type: att.mime_type,
        type: att.mime_type?.startsWith('image/') ? 'image' : 'attachment',
        description: att.description || attachmentDescription.value,
      })),
    })

    if (response.success) {
      ElMessage.success('项目提交成功！')
      setTimeout(() => router.push('/projects'), 1500)
    } else {
      ElMessage.error(response.error || '提交失败')
    }
  } catch (error: any) {
    console.error('提交失败:', error)
    ElMessage.error(error.message || '提交失败')
  } finally {
    submitting.value = false
    showConfirmDialog.value = false
  }
}

const goBack = async () => {
  try {
    await ElMessageBox.confirm('确定要离开吗？未保存的内容将会丢失。', '确认离开', {
      type: 'warning',
    })
    router.back()
  } catch {}
}

const loadCurrentUser = async () => {
  const info = localStorage.getItem('userInfo')
  if (info) currentUser.value = JSON.parse(info)
  else currentUser.value = { name: '用户', role: 'applicant' }
  dbConnected.value = true
}

const loadResearchDomains = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/research-domains`)
    if (response.data.success) {
      researchDomains.value = response.data.data
    } else {
      researchDomains.value = [
        { id: '1', name: '人工智能与大数据' },
        { id: '2', name: '生物医药' },
        { id: '3', name: '新材料' },
        { id: '4', name: '新能源' },
        { id: '5', name: '高端装备制造' },
      ]
    }
  } catch {
    researchDomains.value = [
      { id: '1', name: '人工智能与大数据' },
      { id: '2', name: '生物医药' },
      { id: '3', name: '新材料' },
      { id: '4', name: '新能源' },
      { id: '5', name: '高端装备制造' },
    ]
  }
}

const toggleDebugInfo = () => {
  showDebugInfo.value = !showDebugInfo.value
}

onMounted(async () => {
  formData.submit_date = new Date().toISOString().split('T')[0]
  await loadCurrentUser()
  await loadResearchDomains()
  const id = route.query.id as string
  if (id) {
    isEditing.value = true
  }
})
</script>

<style scoped>
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
  padding: 16px 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
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
  background: #b31b1b;
  color: white;
}

.primary-btn:hover:not(:disabled) {
  background: #8b0000;
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

.db-user-info {
  color: #666;
  font-size: 14px;
}

.db-toggle-btn {
  padding: 4px 12px;
  background: #b31b1b;
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
  border-top: 3px solid #b31b1b;
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
  color: #b31b1b;
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
}

.steps-container {
  display: flex;
  margin-bottom: 32px;
  background: white;
  border-radius: 12px;
  padding: 16px 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.step-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
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
}

.step-item.active .step-number {
  background: #b31b1b;
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
  color: #b31b1b;
  font-weight: 500;
}

.step-content {
  background: white;
  border-radius: 12px;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
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
  border-bottom: 2px solid #b31b1b;
}

.section-subtitle {
  color: #666;
  margin: -16px 0 24px 0;
  font-size: 14px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group.full-width {
  width: 100%;
  grid-column: span 2;
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
  border-color: #b31b1b;
  box-shadow: 0 0 0 2px rgba(179, 27, 27, 0.2);
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

.char-counter {
  text-align: right;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.form-hint {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.required-hint {
  color: #ff4d4f;
  margin-left: 8px;
}

/* 研究领域按钮 */
.domains-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
}

.domain-btn {
  padding: 10px 20px;
  background: #f5f7fa;
  border: 1px solid #e0e0e0;
  border-radius: 30px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.25s ease;
  color: #555;
  font-weight: 500;
}

.domain-btn:hover:not(:disabled) {
  background: #fde8e8;
  border-color: #b31b1b;
  color: #b31b1b;
  transform: translateY(-2px);
}

.domain-btn.active {
  background: #b31b1b;
  border-color: #b31b1b;
  color: white;
}

.domain-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 复选框组 */
.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-weight: normal;
}

.other-input {
  width: 100%;
  margin-top: 8px;
}

/* 关键词标签 */
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
  background: #fde8e8;
  color: #b31b1b;
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

/* 团队成员 */
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
  background: #b31b1b;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.member-card {
  padding: 16px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  margin-bottom: 16px;
}

.member-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.remove-btn {
  padding: 4px 12px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  color: #ff4d4f;
  border-radius: 4px;
  cursor: pointer;
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

.budget-table th,
.budget-table td {
  padding: 12px;
  border: 1px solid #e8e8e8;
  text-align: left;
}

.budget-table th {
  background: #f5f7fa;
}

.budget-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.budget-table input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.total-label {
  font-weight: bold;
  text-align: right;
}

.total-amount {
  font-weight: bold;
  color: #b31b1b;
  font-size: 18px;
}

.table-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.table-btn.primary {
  background: #b31b1b;
  color: white;
}

.table-btn.danger {
  background: #fff2f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
}

/* 附件上传 */
.attachments-section {
  margin-bottom: 24px;
}

.upload-area {
  border: 2px dashed #d9d9d9;
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: #fafafa;
}

.upload-area:hover {
  border-color: #b31b1b;
  background: #fef6f6;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.upload-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload-text span:first-child {
  font-size: 16px;
  color: #333;
}

.upload-hint {
  font-size: 12px;
  color: #999;
}

.attachments-list {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.attachment-item {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 12px 16px;
  border: 1px solid #e8e8e8;
}

.attachment-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.attachment-icon {
  font-size: 24px;
}

.attachment-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.attachment-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.attachment-size {
  font-size: 12px;
  color: #999;
}

.attachment-actions {
  display: flex;
  gap: 8px;
}

.preview-btn,
.attachment-actions .remove-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s;
}

.preview-btn:hover,
.attachment-actions .remove-btn:hover {
  background: #f0f0f0;
}

.upload-progress {
  margin-top: 8px;
  height: 4px;
  background: #e8e8e8;
  border-radius: 2px;
  overflow: hidden;
}

.upload-progress .progress-fill-bar {
  height: 100%;
  background: #b31b1b;
  border-radius: 2px;
  transition: width 0.3s;
}

/* 底部导航 */
.step-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.nav-btn {
  padding: 12px 32px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.nav-btn.primary {
  background: #b31b1b;
  color: white;
}

.nav-btn.secondary {
  background: #f5f7fa;
  color: #666;
  border: 1px solid #d9d9d9;
}

.nav-btn.success {
  background: #52c41a;
  color: white;
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
  background: #b31b1b;
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

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
}

.modal-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.modal-btn.primary {
  background: #b31b1b;
  color: white;
}

.modal-btn.secondary {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #d9d9d9;
}

/* 响应式 */
@media (max-width: 768px) {
  .create-project-container {
    padding: 16px;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .form-group.full-width {
    grid-column: span 1;
  }

  .steps-container {
    flex-wrap: wrap;
    gap: 12px;
  }

  .step-item {
    flex: none;
    width: calc(50% - 12px);
  }

  .step-navigation {
    flex-direction: column;
    gap: 16px;
  }

  .nav-left,
  .nav-right {
    width: 100%;
  }

  .nav-btn {
    width: 100%;
  }

  .nav-center {
    display: none;
  }
}
</style>
