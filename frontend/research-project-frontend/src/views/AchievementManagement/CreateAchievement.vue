<template>
  <div class="achievement-register-page">
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回工作台</span>
        </button>
        <h1>{{ pageTitle }}</h1>
        <div v-if="usesRegistrationFlow" class="header-subtitle">
          {{ isProjectManager ? '为本人负责的项目登记科研成果，登记后自动生效' : '查看已登记成果及审核状态；在下方填写表单提交新成果。仅限已入库或孵化中的项目。' }}
        </div>
        <div v-else-if="isApplicant" class="header-subtitle">
          登记论文、专利、报告等科研产出；提交后由项目经理审核
        </div>
      </div>
    </div>

    <div class="content-wrapper">
      <!-- 选择项目（申请人登记） -->
      <div v-if="usesRegistrationFlow" class="section-card">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">📋</span>
            选择项目
          </h3>
        </div>
        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>
        <div v-else-if="!projectList.length" class="empty-state">
          <div class="empty-icon">📭</div>
          <p>暂无可登记科研成果的项目</p>
          <p class="empty-subtext">需已入库或孵化中的项目</p>
        </div>
        <div v-else class="projects-list">
          <div
            v-for="project in projectList"
            :key="project.id"
            class="project-item"
            :class="{ selected: selectedProject?.id === project.id }"
            @click="selectProject(project)"
          >
            <div class="project-header">
              <span class="project-code">{{ project.project_code || `PRJ-${project.id.substring(0, 8)}` }}</span>
              <span class="project-status" :class="getProjectStatusClass(project.status)">
                {{ getProjectStatusText(project.status) }}
              </span>
            </div>
            <h4 class="project-title">{{ project.title }}</h4>
            <div class="project-meta">
              <span class="meta-item">
                <span class="meta-icon">📅</span>
                批准日期: {{ formatProjectDate(project.approval_date) }}
              </span>
              <span class="meta-item">
                <span class="meta-icon">📝</span>
                已登记成果: {{ project.achievement_count || 0 }} 条
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="!usesRegistrationFlow || isEditMode || selectedProject"
        class="section-card"
        :class="{ 'form-section': usesRegistrationFlow }"
      >
        <div v-if="usesRegistrationFlow" class="section-header">
          <h3 class="section-title">
            <span class="section-icon">✏️</span>
            填写科研成果
          </h3>
          <span v-if="selectedProject" class="selected-tag">{{ selectedProject.title }}</span>
        </div>

        <div class="form-body">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
        :disabled="isViewing"
      >
        <!-- 基本信息 -->
        <div class="form-step">
          <h3>基本信息</h3>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="成果类型" prop="type">
                <el-select v-model="formData.type" placeholder="请选择成果类型" style="width: 100%">
                  <el-option label="论文" value="paper" />
                  <el-option label="专利" value="patent" />
                  <el-option label="软件著作权" value="software" />
                  <el-option label="研究报告" value="report" />
                  <el-option label="原型样品" value="prototype" />
                  <el-option label="技术标准" value="standard" />
                  <el-option label="获奖成果" value="award" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="成果名称" prop="title">
                <el-input
                  v-model="formData.title"
                  placeholder="请输入成果名称"
                  maxlength="500"
                  show-word-limit
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col v-if="!usesRegistrationFlow || isEditMode" :span="12">
              <el-form-item label="所属项目" prop="project_id">
                <el-select
                  v-model="formData.project_id"
                  placeholder="请选择所属项目"
                  filterable
                  style="width: 100%"
                  @change="handleProjectChange"
                >
                  <el-option
                    v-for="project in projectList"
                    :key="project.id"
                    :label="`${project.title} [${project.project_code}]`"
                    :value="project.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="usesRegistrationFlow ? 24 : 12">
              <el-form-item label="产出日期" prop="achievement_date">
                <el-date-picker
                  v-model="formData.achievement_date"
                  type="date"
                  placeholder="选择产出日期"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="作者" prop="authors">
                <el-input
                  v-model="authorsInput"
                  placeholder="请输入作者，多个作者用逗号分隔"
                  @blur="handleAuthorsBlur"
                />
              </el-form-item>
            </el-col>
            <el-col v-if="!usesRegistrationFlow || isEditMode" :span="12">
              <el-form-item label="成果状态" prop="status">
                <el-select
                  v-model="formData.status"
                  placeholder="请选择成果状态"
                  style="width: 100%"
                >
                  <el-option label="草稿" value="draft" />
                  <el-option label="已提交" value="submitted" />
                  <el-option label="已核实" value="verified" />
                  <el-option label="已驳回" value="rejected" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="关键词" prop="keywords">
            <el-input
              v-model="keywordsInput"
              placeholder="请输入关键词，多个关键词用逗号分隔"
              @blur="handleKeywordsBlur"
            />
            <div class="tags-container">
              <el-tag
                v-for="(tag, index) in keywordTags"
                :key="index"
                closable
                size="small"
                @close="removeKeyword(index)"
                style="margin-right: 8px; margin-bottom: 8px"
              >
                {{ tag }}
              </el-tag>
            </div>
          </el-form-item>
        </div>

        <!-- 成果内容 -->
        <div class="form-step">
          <h3>成果内容</h3>

          <!-- 类型特有信息 - 存储在 description 字段中 -->
          <div v-if="formData.type === 'paper'" class="type-fields">
            <h4>论文信息</h4>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-input
                  v-model="paperInfo.journal"
                  placeholder="期刊/会议名称"
                  style="margin-bottom: 10px"
                />
              </el-col>
              <el-col :span="12">
                <el-input v-model="paperInfo.doi" placeholder="DOI号" style="margin-bottom: 10px" />
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-input
                  v-model="paperInfo.volume"
                  placeholder="卷/期"
                  style="margin-bottom: 10px"
                />
              </el-col>
              <el-col :span="12">
                <el-date-picker
                  v-model="paperInfo.publishDate"
                  type="date"
                  placeholder="发表日期"
                  value-format="YYYY-MM-DD"
                  style="width: 100%; margin-bottom: 10px"
                />
              </el-col>
            </el-row>
          </div>

          <div v-else-if="formData.type === 'patent'" class="type-fields">
            <h4>专利信息</h4>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-input
                  v-model="patentInfo.number"
                  placeholder="专利号"
                  style="margin-bottom: 10px"
                />
              </el-col>
              <el-col :span="12">
                <el-select
                  v-model="patentInfo.type"
                  placeholder="专利类型"
                  style="width: 100%; margin-bottom: 10px"
                >
                  <el-option label="发明专利" value="invention" />
                  <el-option label="实用新型" value="utility" />
                  <el-option label="外观设计" value="design" />
                </el-select>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="24">
                <el-input
                  v-model="patentInfo.authority"
                  placeholder="授权机构"
                  style="margin-bottom: 10px"
                />
              </el-col>
            </el-row>
          </div>

          <div v-else-if="formData.type === 'award'" class="type-fields">
            <h4>奖项信息</h4>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-input
                  v-model="awardInfo.name"
                  placeholder="奖项名称"
                  style="margin-bottom: 10px"
                />
              </el-col>
              <el-col :span="12">
                <el-input
                  v-model="awardInfo.level"
                  placeholder="奖项级别"
                  style="margin-bottom: 10px"
                />
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-date-picker
                  v-model="awardInfo.date"
                  type="date"
                  placeholder="颁奖日期"
                  value-format="YYYY-MM-DD"
                  style="width: 100%; margin-bottom: 10px"
                />
              </el-col>
              <el-col :span="12">
                <el-input
                  v-model="awardInfo.organization"
                  placeholder="颁奖机构"
                  style="margin-bottom: 10px"
                />
              </el-col>
            </el-row>
          </div>

          <!-- 成果描述（包含所有详细信息） -->
          <el-form-item label="成果描述" prop="description">
            <el-input
              v-model="formData.description"
              type="textarea"
              :rows="8"
              placeholder="请详细描述成果内容，包括创新点、应用价值等信息"
              maxlength="2000"
              show-word-limit
            />
          </el-form-item>
        </div>

        <!-- 附件材料 -->
        <div class="form-step">
          <h3>附件材料</h3>
          <div class="form-attachment-block">
            <label class="form-label">附件材料（可选）</label>
            <div class="upload-area">
              <input
                ref="fileInputRef"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                style="display: none"
                @change="handleNativeFileChange"
              />
              <button type="button" class="upload-btn" @click="triggerFileUpload">
                <span class="upload-icon">📎</span>
                选择文件
              </button>
              <span class="upload-hint">支持 PDF、Word、图片，单个文件不超过20MB</span>
            </div>
            <div v-if="uploadedFiles.length" class="file-list">
              <div v-for="(file, index) in uploadedFiles" :key="index" class="file-item">
                <span class="file-icon">📄</span>
                <span class="file-name">{{ file.name }}</span>
                <button type="button" class="file-remove" @click="removeUploadedFile(index)">×</button>
              </div>
            </div>
          </div>

          <!-- 外部链接 -->
          <el-form-item label="外部链接" prop="external_link">
            <el-input v-model="formData.external_link" placeholder="请输入外部链接（如发表地址）" />
          </el-form-item>
        </div>
      </el-form>

      <div class="form-footer">
        <button type="button" class="btn secondary" @click="usesRegistrationFlow ? cancelFormSelection() : goBack()">取消</button>
        <button type="button" class="btn primary" :disabled="saving" @click="handleSave">
          {{ saving ? '提交中...' : isEditMode ? '更新成果' : usesRegistrationFlow ? (isProjectManager ? '提交登记' : '提交审批') : '创建成果' }}
        </button>
      </div>
        </div>
      </div>

      <ApplicantAchievementList
        v-if="usesRegistrationFlow"
        ref="achievementListRef"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { achievementAPI } from '@/api/achievements'
import request from '@/utils/request'
import ApplicantAchievementList from './ApplicantAchievementList.vue'

const route = useRoute()
const router = useRouter()

// 计算属性
const isEditMode = computed(() => route.name === 'EditAchievement')
const isViewing = computed(() => route.name === 'AchievementDetail')
const isApplicant = computed(
  () => (localStorage.getItem('userRole') || '').toUpperCase() === 'APPLICANT',
)
const isProjectManager = computed(
  () => (localStorage.getItem('userRole') || '').toUpperCase() === 'PROJECT_MANAGER',
)
const usesRegistrationFlow = computed(
  () => (isApplicant.value || isProjectManager.value) && !isEditMode.value,
)
const pageTitle = computed(() => {
  if (isEditMode.value) return '编辑科研成果'
  if (usesRegistrationFlow.value) return '科研成果登记'
  return '新增成果'
})
const achievementId = computed(() => route.params.id)

// 响应式数据
const saving = ref(false)
const loading = ref(false)
const formRef = ref()
const fileInputRef = ref<HTMLInputElement>()
const achievementListRef = ref<InstanceType<typeof ApplicantAchievementList> | null>(null)

// 项目列表
const projectList = ref<any[]>([])
const selectedProject = ref<any>(null)

// 输入处理
const authorsInput = ref('')
const keywordsInput = ref('')
const keywordTags = ref([])
const uploadedFiles = ref<File[]>([])
const existingFileIds = ref<string[]>([])

// 类型特有信息
const paperInfo = reactive({
  journal: '',
  doi: '',
  volume: '',
  publishDate: '',
})
const patentInfo = reactive({
  number: '',
  type: '',
  authority: '',
})

const awardInfo = reactive({
  name: '',
  level: '',
  date: '',
  organization: '',
})

// 表单数据 - 严格匹配数据库字段
const formData = reactive({
  // 匹配 ProjectAchievement 表的所有字段
  type: '',
  title: '',
  project_id: '',
  description: '',
  keywords: '',
  status: 'submitted',
  achievement_date: '',
  authors: [], // 将存储为 JSON
  attachment_urls: [], // 将存储为 JSON
  external_link: '',
  verified_by: null, // 由后端设置
  verified_date: null, // 由后端设置
  verification_comment: null, // 由后端设置
  created_by: '', // 由后端设置
})

// 表单验证规则
const formRules = {
  type: [{ required: true, message: '请选择成果类型', trigger: 'change' }],
  title: [{ required: true, message: '请输入成果名称', trigger: 'blur' }],
  project_id: [{ required: true, message: '请选择所属项目', trigger: 'change' }],
  achievement_date: [{ required: true, message: '请选择产出日期', trigger: 'change' }],
  description: [{ required: true, message: '请输入成果描述', trigger: 'blur' }],
}

const ACHIEVEMENT_ELIGIBLE_STATUSES = ['approved', 'incubating']

// 获取项目列表
const loadProjects = async () => {
  loading.value = true
  try {
    if (usesRegistrationFlow.value) {
      const res = await request.get('/api/achievements/eligible-projects')
      if (res.success) {
        projectList.value = res.data || []
      } else {
        ElMessage.error(res.error || '加载项目列表失败')
        projectList.value = []
      }
      return
    }
    const res = await request.get('/api/projects', { params: { limit: 200 } })
    const raw = res.data
    const projects = Array.isArray(raw) ? raw : raw?.list || raw?.projects || []
    projectList.value = projects
      .filter((p: { status?: string }) =>
        p.status && ACHIEVEMENT_ELIGIBLE_STATUSES.includes(p.status),
      )
      .map((project: Record<string, unknown>) => ({
        id: project.id,
        title: project.title || project.name || '未命名项目',
        project_code: project.project_code || project.code || '无编号',
        status: project.status,
      }))
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '加载项目失败'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

function selectProject(project: any) {
  selectedProject.value = project
  formData.project_id = project.id
}

function getProjectStatusClass(status: string) {
  const map: Record<string, string> = {
    approved: 'approved',
    incubating: 'incubating',
  }
  return map[status] || ''
}

function getProjectStatusText(status: string) {
  const map: Record<string, string> = {
    approved: '已入库',
    incubating: '孵化中',
  }
  return map[status] || status
}

function formatProjectDate(dateString?: string) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('zh-CN')
}

function cancelFormSelection() {
  selectedProject.value = null
  formData.project_id = ''
  resetFormFields()
}

// 关键词处理
const handleKeywordsBlur = () => {
  if (keywordsInput.value) {
    keywordTags.value = keywordsInput.value
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
    formData.keywords = keywordTags.value.join(',')
  }
}

const removeKeyword = (index) => {
  keywordTags.value.splice(index, 1)
  formData.keywords = keywordTags.value.join(',')
  keywordsInput.value = keywordTags.value.join(', ')
}

// 作者处理
const handleAuthorsBlur = () => {
  if (authorsInput.value) {
    formData.authors = authorsInput.value
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length > 0)
  }
}

const handleProjectChange = (projectId) => {
  const project = projectList.value.find((p) => p.id === projectId)
  if (project) {
    console.log('选中项目:', project.title)
  }
}

// 文件处理
const triggerFileUpload = () => {
  fileInputRef.value?.click()
}

const handleNativeFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.files) return
  for (const file of Array.from(target.files)) {
    if (file.size > 20 * 1024 * 1024) {
      ElMessage.warning(`文件 ${file.name} 超过 20MB，已跳过`)
      continue
    }
    uploadedFiles.value.push(file)
  }
  target.value = ''
}

const removeUploadedFile = (index: number) => {
  uploadedFiles.value.splice(index, 1)
}

const handleFileRemove = async (fileId: string) => {
  try {
    await achievementAPI.deleteFile(fileId)
    existingFileIds.value = existingFileIds.value.filter((id) => id !== fileId)
    ElMessage.success('附件已删除')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '删除附件失败'
    ElMessage.error(msg)
  }
}

// 构建完整的描述内容
const buildDescription = () => {
  let description = formData.description

  // 根据类型添加详细信息
  if (formData.type === 'paper') {
    const paperDetails = []
    if (paperInfo.journal) paperDetails.push(`期刊/会议：${paperInfo.journal}`)
    if (paperInfo.doi) paperDetails.push(`DOI：${paperInfo.doi}`)
    if (paperInfo.volume) paperDetails.push(`卷/期：${paperInfo.volume}`)
    if (paperInfo.publishDate) paperDetails.push(`发表日期：${paperInfo.publishDate}`)

    if (paperDetails.length > 0) {
      description += '\n\n论文信息：\n' + paperDetails.join('\n')
    }
  } else if (formData.type === 'patent') {
    const patentDetails = []
    if (patentInfo.number) patentDetails.push(`专利号：${patentInfo.number}`)
    if (patentInfo.type) patentDetails.push(`专利类型：${patentInfo.type}`)
    if (patentInfo.authority) patentDetails.push(`授权机构：${patentInfo.authority}`)

    if (patentDetails.length > 0) {
      description += '\n\n专利信息：\n' + patentDetails.join('\n')
    }
  } else if (formData.type === 'award') {
    const awardDetails = []
    if (awardInfo.name) awardDetails.push(`奖项名称：${awardInfo.name}`)
    if (awardInfo.level) awardDetails.push(`奖项级别：${awardInfo.level}`)
    if (awardInfo.date) awardDetails.push(`颁奖日期：${awardInfo.date}`)
    if (awardInfo.organization) awardDetails.push(`颁奖机构：${awardInfo.organization}`)

    if (awardDetails.length > 0) {
      description += '\n\n奖项信息：\n' + awardDetails.join('\n')
    }
  }

  return description
}

// 保存处理
const handleSave = async () => {
  if (usesRegistrationFlow.value && !selectedProject.value) {
    ElMessage.warning('请先选择项目')
    return
  }
  try {
    await formRef.value.validate()
  } catch {
    ElMessage.warning('请完善必填项后再提交')
    return
  }

    handleAuthorsBlur()
    handleKeywordsBlur()

    let description = formData.description
    if (formData.type === 'award') {
      const awardParts: string[] = []
      if (awardInfo.name) awardParts.push(`奖项名称：${awardInfo.name}`)
      if (awardInfo.level) awardParts.push(`奖项级别：${awardInfo.level}`)
      if (awardInfo.date) awardParts.push(`颁奖日期：${awardInfo.date}`)
      if (awardInfo.organization) awardParts.push(`颁奖机构：${awardInfo.organization}`)
      if (awardParts.length) {
        description = description
          ? `${description}\n\n${awardParts.join('\n')}`
          : awardParts.join('\n')
      }
    }

    try {
      saving.value = true
      const submitData = {
        type: formData.type,
        title: formData.title,
        project_id: formData.project_id,
        description,
      keywords: formData.keywords,
      status: usesRegistrationFlow.value ? 'submitted' : formData.status,
      achievement_date: formData.achievement_date,
      external_link: formData.external_link || undefined,
      authors: authorsInput.value || undefined,
      journal_conference_name: paperInfo.journal || undefined,
      doi_number: paperInfo.doi || undefined,
      volume_issue: paperInfo.volume || undefined,
      publication_date: paperInfo.publishDate || undefined,
      patent_number: patentInfo.number || undefined,
      patent_type: patentInfo.type || undefined,
      authority: patentInfo.authority || undefined,
    }

    let savedId = achievementId.value as string
    if (isEditMode.value) {
      await achievementAPI.updateAchievement(savedId, submitData)
    } else {
      const res = await achievementAPI.createAchievement(submitData as never)
      savedId = res.data?.id || ''
      if (!savedId) throw new Error('创建成果失败')
    }

    for (const file of uploadedFiles.value) {
      await achievementAPI.uploadFile(savedId, file)
    }
    uploadedFiles.value = []

    ElMessage.success(
      isEditMode.value
        ? '成果更新成功'
        : usesRegistrationFlow.value
          ? isProjectManager.value
            ? '科研成果已登记'
            : '科研成果已提交，等待项目经理审批'
          : '成果创建成功',
    )
    if (isEditMode.value) {
      router.push('/achievements/create')
    } else if (usesRegistrationFlow.value) {
      cancelFormSelection()
      achievementListRef.value?.refresh()
    } else {
      router.push('/applicant/dashboard')
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '保存失败'
    ElMessage.error(msg)
  } finally {
    saving.value = false
  }
}

// 加载现有数据（编辑模式）
const loadAchievementData = async () => {
  if (!achievementId.value) return

  loading.value = true
  try {
    const response = await achievementAPI.getAchievement(achievementId.value as string)
    const data = response.data
    if (!data) throw new Error('成果不存在')

    formData.type = data.type || ''
    formData.title = data.title || data.name || ''
    formData.project_id = data.project_id || ''
    formData.description = data.description || ''
    formData.keywords = data.keywords || ''
    formData.status = data.status || 'draft'
    formData.achievement_date = data.achievement_date || data.output_date || ''
    formData.external_link = data.external_link || ''
    authorsInput.value = Array.isArray(data.authors)
      ? data.authors.join(', ')
      : (data.authors || '')
    keywordsInput.value = data.keywords || ''
    if (data.keywords) {
      keywordTags.value = String(data.keywords).split(/[,，;；]/).map((k) => k.trim()).filter(Boolean)
    }
    paperInfo.journal = data.journal_conference_name || ''
    paperInfo.doi = data.doi_number || ''
    paperInfo.volume = data.volume_issue || ''
    paperInfo.publishDate = data.publication_date || ''
    patentInfo.number = data.patent_number || ''
    patentInfo.type = data.patent_type || ''
    patentInfo.authority = data.authority || ''

    if (data.files?.length) {
      existingFileIds.value = data.files.map((f) => f.id)
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '加载成果数据失败'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

// 解析描述中的详细信息
const parseDescriptionDetails = (description) => {
  if (!description) return

  // 简单的解析逻辑，实际可能需要更复杂的解析
  const lines = description.split('\n')
  const type = formData.type

  lines.forEach((line) => {
    if (type === 'paper') {
      if (line.includes('期刊/会议：')) {
        paperInfo.journal = line.replace('期刊/会议：', '').trim()
      } else if (line.includes('DOI：')) {
        paperInfo.doi = line.replace('DOI：', '').trim()
      } else if (line.includes('卷/期：')) {
        paperInfo.volume = line.replace('卷/期：', '').trim()
      } else if (line.includes('发表日期：')) {
        paperInfo.publishDate = line.replace('发表日期：', '').trim()
      }
    } else if (type === 'patent') {
      if (line.includes('专利号：')) {
        patentInfo.number = line.replace('专利号：', '').trim()
      } else if (line.includes('专利类型：')) {
        patentInfo.type = line.replace('专利类型：', '').trim()
      } else if (line.includes('授权机构：')) {
        patentInfo.authority = line.replace('授权机构：', '').trim()
      }
    } else if (type === 'award') {
      if (line.includes('奖项名称：')) {
        awardInfo.name = line.replace('奖项名称：', '').trim()
      } else if (line.includes('奖项级别：')) {
        awardInfo.level = line.replace('奖项级别：', '').trim()
      } else if (line.includes('颁奖日期：')) {
        awardInfo.date = line.replace('颁奖日期：', '').trim()
      } else if (line.includes('颁奖机构：')) {
        awardInfo.organization = line.replace('颁奖机构：', '').trim()
      }
    }
  })
}

// 返回
const goBack = () => {
  if (isEditMode.value && isApplicant.value) {
    router.push('/achievements/create')
  } else {
    router.push(isProjectManager.value ? '/assistant/dashboard' : '/applicant/dashboard')
  }
}

const resetFormFields = () => {
  formRef.value?.resetFields()
  formData.type = ''
  formData.title = ''
  formData.project_id = selectedProject.value?.id || ''
  formData.description = ''
  formData.keywords = ''
  formData.achievement_date = ''
  formData.external_link = ''
  formData.authors = []
  authorsInput.value = ''
  keywordsInput.value = ''
  keywordTags.value = []
  uploadedFiles.value = []
  existingFileIds.value = []
  Object.assign(paperInfo, { journal: '', doi: '', volume: '', publishDate: '' })
  Object.assign(patentInfo, { number: '', type: '', authority: '' })
  Object.assign(awardInfo, { name: '', level: '', date: '', organization: '' })
}

const resetForm = () => {
  resetFormFields()
}

onMounted(async () => {
  await loadProjects()
  if (isEditMode.value) {
    loadAchievementData()
  }
  const qProjectId = route.query.project_id
  if (typeof qProjectId === 'string' && qProjectId) {
    if (projectList.value.some((p) => p.id === qProjectId)) {
      formData.project_id = qProjectId
    } else {
      ElMessage.warning('当前项目未入库或不在孵化中，无法登记科研成果')
    }
  }
})
</script>

<style scoped>
@import '@/styles/form-upload-shared.css';
.achievement-register-page {
  min-height: 100vh;
  background: #f5f7fa;
  --ruc-primary: #b31b1b;
  --ruc-primary-hover: #8b1515;
  --ruc-primary-light: rgba(179, 27, 27, 0.06);
}

.page-header {
  background: white;
  padding: 20px 24px;
  border-bottom: 1px solid #e8e8e8;
}

.header-left {
  max-width: 1200px;
  margin: 0 auto;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  padding: 8px 16px;
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  color: #666;
  cursor: pointer;
  font-size: 14px;
}

.back-btn:hover {
  background: #e8e8e8;
  color: #333;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
  font-weight: 600;
}

.header-subtitle {
  margin-top: 6px;
  color: #999;
  font-size: 14px;
}

.content-wrapper {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.projects-list {
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.project-item {
  padding: 16px;
  border: 2px solid #f0f0f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  background: #fff;
}

.project-item:hover {
  border-color: #b31b1b;
  box-shadow: 0 4px 12px rgba(179, 27, 27, 0.1);
}

.project-item.selected {
  border-color: #b31b1b;
  background: rgba(179, 27, 27, 0.02);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.project-code {
  font-size: 12px;
  color: #b31b1b;
  background: rgba(179, 27, 27, 0.06);
  padding: 2px 8px;
  border-radius: 4px;
}

.project-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
}

.project-status.approved {
  background: #f6ffed;
  color: #52c41a;
}

.project-status.incubating {
  background: #e6f7ff;
  color: #1890ff;
}

.project-title {
  margin: 0 0 12px 0;
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

.project-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #999;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.loading-state {
  padding: 60px 20px;
  text-align: center;
  color: #999;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f0f0f0;
  border-top-color: #b31b1b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-subtext {
  font-size: 13px;
  color: #bbb;
  margin-top: 8px;
}

.selected-tag { font-size: 13px; color: #666; }

.section-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
  overflow: hidden;
}

.section-card.form-section {
  border: 2px solid var(--ruc-primary);
}

.section-header {
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.section-title {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.form-body {
  padding: 24px;
}

.form-step {
  min-height: auto;
  margin-bottom: 32px;
}

.form-step h3 {
  color: #2c3e50;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--ruc-primary-light);
  font-size: 16px;
  font-weight: 600;
}

.form-step h4 {
  color: var(--ruc-primary);
  margin: 15px 0;
  font-size: 14px;
  font-weight: 600;
}

.tags-container {
  margin-top: 10px;
}

.type-fields {
  background: var(--ruc-primary-light);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid rgba(179, 27, 27, 0.12);
}

.form-footer {
  margin-top: 8px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 10px 24px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  border: none;
}

.btn.secondary {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #e8e8e8;
}

.btn.secondary:hover {
  background: #e8e8e8;
}

.btn.primary {
  background: var(--ruc-primary);
  color: white;
}

.btn.primary:hover:not(:disabled) {
  background: var(--ruc-primary-hover);
}

.btn.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.upload-demo {
  width: 100%;
}

.el-upload__tip {
  margin-top: 8px;
  color: #909399;
  font-size: 12px;
}

/* Element Plus 主题色统一为人大红 */
.achievement-register-page :deep(.el-button--primary) {
  --el-button-bg-color: #b31b1b;
  --el-button-border-color: #b31b1b;
  --el-button-hover-bg-color: #8b1515;
  --el-button-hover-border-color: #8b1515;
  --el-button-active-bg-color: #8b1515;
  --el-button-active-border-color: #8b1515;
}

.achievement-register-page :deep(.el-button--primary.is-link) {
  --el-button-text-color: #b31b1b;
  --el-button-hover-text-color: #8b1515;
  background: transparent;
  border-color: transparent;
}

.achievement-register-page :deep(.el-input__wrapper:focus-within),
.achievement-register-page :deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px #b31b1b inset;
}

.achievement-register-page :deep(.el-select .el-input.is-focus .el-input__wrapper) {
  box-shadow: 0 0 0 1px #b31b1b inset;
}

.achievement-register-page :deep(.el-tag) {
  --el-tag-text-color: #b31b1b;
  --el-tag-bg-color: rgba(179, 27, 27, 0.06);
  --el-tag-border-color: rgba(179, 27, 27, 0.2);
}

.achievement-register-page :deep(.el-pagination.is-background .el-pager li.is-active) {
  background-color: #b31b1b;
}

@media (max-width: 768px) {
  .content-wrapper {
    padding: 16px;
  }

  .form-body {
    padding: 16px;
  }

  .form-footer {
    flex-direction: column-reverse;
  }

  .btn {
    width: 100%;
  }

  .el-row {
    margin: 0 !important;
  }

  .el-col {
    margin-bottom: 15px;
  }
}
</style>
