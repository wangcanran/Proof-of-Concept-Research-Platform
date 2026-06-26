<template>
  <div class="achievement-register-page">
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回工作台</span>
        </button>
        <h1>{{ pageTitle }}</h1>
        <div v-if="isApplicant && !isEditMode" class="header-subtitle">
          查看已登记成果及审核状态；在下方填写表单提交新成果。仅限已入库或孵化中的项目。
        </div>
        <div v-else-if="isApplicant" class="header-subtitle">
          登记论文、专利、报告等科研产出；提交后由项目经理审核
        </div>
      </div>
    </div>

    <div class="content-wrapper">
      <ApplicantAchievementList
        v-if="isApplicant && !isEditMode"
        ref="achievementListRef"
      />

      <div class="section-card" :class="{ 'form-section': isApplicant && !isEditMode }">
        <div v-if="isApplicant && !isEditMode" class="section-header">
          <h3 class="section-title">
            <span class="section-icon">✏️</span>
            登记新成果
          </h3>
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
            <el-col :span="12">
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
            <el-col :span="12">
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
            <el-col v-if="!isApplicant || isEditMode" :span="12">
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

          <!-- 附件上传 -->
          <el-form-item label="成果附件">
            <el-upload
              ref="uploadRef"
              class="upload-demo"
              action=""
              :multiple="true"
              :limit="10"
              :file-list="fileList"
              :on-change="handleFileChange"
              :on-remove="handleFileRemove"
              :auto-upload="false"
              :disabled="isViewing"
            >
              <template #trigger>
                <el-button type="primary">选择文件</el-button>
              </template>
              <template #tip>
                <div class="el-upload__tip">
                  请上传成果相关附件，支持格式：PDF、DOC、DOCX、JPG、PNG，单个文件不超过20MB
                </div>
              </template>
            </el-upload>
          </el-form-item>

          <!-- 外部链接 -->
          <el-form-item label="外部链接" prop="external_link">
            <el-input v-model="formData.external_link" placeholder="请输入外部链接（如发表地址）" />
          </el-form-item>
        </div>
      </el-form>

      <div class="form-footer">
        <button type="button" class="btn secondary" @click="goBack">取消</button>
        <button type="button" class="btn primary" :disabled="saving" @click="handleSave">
          {{ saving ? '提交中...' : isEditMode ? '更新成果' : isApplicant ? '提交审批' : '创建成果' }}
        </button>
      </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { projectAPI } from '@/api/projects'
import { achievementAPI } from '@/api/achievements'
import ApplicantAchievementList from './ApplicantAchievementList.vue'

const route = useRoute()
const router = useRouter()

// 计算属性
const isEditMode = computed(() => route.name === 'EditAchievement')
const isViewing = computed(() => route.name === 'AchievementDetail')
const isApplicant = computed(
  () => (localStorage.getItem('userRole') || '').toUpperCase() === 'APPLICANT',
)
const pageTitle = computed(() => {
  if (isEditMode.value) return '编辑科研成果'
  if (isApplicant.value) return '科研成果登记'
  return '新增成果'
})
const achievementId = computed(() => route.params.id)

// 响应式数据
const saving = ref(false)
const loading = ref(false)
const formRef = ref()
const uploadRef = ref()
const achievementListRef = ref<InstanceType<typeof ApplicantAchievementList> | null>(null)

// 项目列表
const projectList = ref([])

// 输入处理
const authorsInput = ref('')
const keywordsInput = ref('')
const keywordTags = ref([])
const fileList = ref([])

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
    const res = await projectAPI.getProjectsList({ limit: 200 })
    if (!res.success) {
      throw new Error(res.error || '加载项目失败')
    }
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
    if (!projectList.value.length) {
      ElMessage.warning('暂无已入库或孵化中的项目，无法登记科研成果')
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '加载项目失败'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
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
const handleFileChange = (file) => {
  if (file.size > 20 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过20MB')
    uploadRef.value.handleRemove(file)
    return false
  }
  return true
}

const handleFileRemove = async (file: { id?: string; raw?: File }) => {
  if (file.id) {
    try {
      await achievementAPI.deleteFile(file.id)
      ElMessage.success('附件已删除')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '删除附件失败'
      ElMessage.error(msg)
      return false
    }
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
  try {
    await formRef.value.validate()
  } catch {
    ElMessage.warning('请完善必填项后再提交')
    return
  }

  try {
    saving.value = true
    const fullDescription = buildDescription()
    const submitData = {
      type: formData.type,
      title: formData.title,
      project_id: formData.project_id,
      description: fullDescription,
      keywords: formData.keywords,
      status: isApplicant.value && !isEditMode.value ? 'submitted' : formData.status,
      achievement_date: formData.achievement_date,
      external_link: formData.external_link,
      authors: formData.authors.length > 0 ? JSON.stringify(formData.authors) : undefined,
    }

    let savedId = achievementId.value as string
    if (isEditMode.value) {
      await achievementAPI.updateAchievement(savedId, submitData)
    } else {
      const res = await achievementAPI.createAchievement(submitData as never)
      savedId = res.data?.id || ''
      if (!savedId) throw new Error('创建成果失败')
    }

    const pendingUploads = fileList.value.filter((f: { raw?: File }) => f.raw)
    for (const item of pendingUploads) {
      await achievementAPI.uploadFile(savedId, item.raw as File)
    }

    ElMessage.success(
      isEditMode.value
        ? '成果更新成功'
        : isApplicant.value
          ? '科研成果已提交，等待项目经理审批'
          : '成果创建成功',
    )
    if (isEditMode.value) {
      router.push('/achievements/create')
    } else if (isApplicant.value) {
      resetForm()
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
    formData.title = data.title || ''
    formData.project_id = data.project_id || ''
    formData.description = data.description || data.abstract || data.content || ''
    formData.keywords = ''
    formData.status = data.status || 'draft'
    formData.achievement_date = data.achievement_date || ''
    formData.external_link = ''

    parseDescriptionDetails(formData.description)

    if (data.files?.length) {
      fileList.value = data.files.map((f) => ({
        id: f.id,
        name: f.file_name,
        url: f.file_path,
        status: 'success',
      }))
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
    router.push('/applicant/dashboard')
  }
}

const resetForm = () => {
  formRef.value?.resetFields()
  formData.type = ''
  formData.title = ''
  formData.project_id = ''
  formData.description = ''
  formData.keywords = ''
  formData.achievement_date = ''
  formData.external_link = ''
  formData.authors = []
  authorsInput.value = ''
  keywordsInput.value = ''
  keywordTags.value = []
  fileList.value = []
  Object.assign(paperInfo, { journal: '', doi: '', volume: '', publishDate: '' })
  Object.assign(patentInfo, { number: '', type: '', authority: '' })
  Object.assign(awardInfo, { name: '', level: '', date: '', organization: '' })
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
}

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
