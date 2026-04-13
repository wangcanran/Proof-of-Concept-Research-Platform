<template>
  <div class="create-achievement">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h2>{{ isEditMode ? '编辑成果' : '新增成果' }}</h2>
        <div class="header-actions">
          <el-button @click="goBack">返回列表</el-button>
          <el-button type="primary" @click="handleSave" :loading="saving"> 保存 </el-button>
        </div>
      </div>
      <el-steps :active="currentStep" finish-status="success" simple>
        <el-step title="基本信息" />
        <el-step title="成果内容" />
        <el-step title="附件材料" />
      </el-steps>
    </div>

    <!-- 表单内容 -->
    <div class="form-container">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
        :disabled="isViewing"
      >
        <!-- 步骤1：基本信息 -->
        <div v-show="currentStep === 0" class="form-step">
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
            <el-col :span="12">
              <el-form-item label="成果状态" prop="status">
                <el-select
                  v-model="formData.status"
                  placeholder="请选择成果状态"
                  style="width: 100%"
                >
                  <el-option label="草稿" value="draft" />
                  <el-option label="已提交" value="submitted" />
                  <el-option label="已验证" value="verified" />
                  <el-option label="已发布" value="published" />
                  <el-option label="已转化" value="transferred" />
                  <el-option label="已应用" value="applied" />
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

        <!-- 步骤2：成果内容 -->
        <div v-show="currentStep === 1" class="form-step">
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

        <!-- 步骤3：附件材料 -->
        <div v-show="currentStep === 2" class="form-step">
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

      <!-- 步骤导航 -->
      <div class="step-navigation">
        <el-button @click="previousStep" :disabled="currentStep === 0"> 上一步 </el-button>
        <el-button v-if="currentStep < 2" type="primary" @click="nextStep"> 下一步 </el-button>
        <el-button v-else type="primary" @click="handleSave" :loading="saving">
          {{ isEditMode ? '更新成果' : '创建成果' }}
        </el-button>
      </div>
    </div>
  </div>
  <el-col :span="12">
    <el-form-item label="所属项目" prop="project_id">
      <el-select
        v-model="formData.project_id"
        placeholder="请选择所属项目"
        filterable
        style="width: 100%"
        @change="handleProjectChange"
        :loading="loading"
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
</template>

<script setup lang="ts">
import { getApiBaseUrl } from '@/utils/request'
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Close } from '@element-plus/icons-vue'
import { projectAPI } from '@/api/projects'

const route = useRoute()
const router = useRouter()

// API基础URL
const API_BASE_URL = getApiBaseUrl()

// 计算属性
const isEditMode = computed(() => route.name === 'EditAchievement')
const isViewing = computed(() => route.name === 'AchievementDetail')
const achievementId = computed(() => route.params.id)

// 响应式数据
const currentStep = ref(0)
const saving = ref(false)
const loading = ref(false)
const formRef = ref()
const uploadRef = ref()

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
// 测试项目API连接
const testProjectAPI = async () => {
  console.log('开始测试项目API...')
  console.log('Token:', localStorage.getItem('token'))
  console.log('API Base URL:', API_BASE_URL)

  try {
    // 测试基本连接
    const healthCheck = await fetch(`${API_BASE_URL}/health`)
    console.log('健康检查:', healthCheck.ok)

    // 测试项目API
    const endpoints = ['/projects']

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        })
        console.log(`${endpoint}:`, {
          status: response.status,
          ok: response.ok,
        })

        if (response.ok) {
          const data = await response.json()
          console.log(`${endpoint} 数据格式:`, {
            type: typeof data,
            isArray: Array.isArray(data),
            keys: Object.keys(data || {}),
            data: data,
          })
        }
      } catch (error) {
        console.log(`${endpoint} 失败:`, error.message)
      }
    }
  } catch (error) {
    console.error('API测试失败:', error)
  }
}

// 在 mounted 中可选调用测试
onMounted(() => {
  console.log('CreateAchievement 组件已加载')

  // 可选：测试API连接
  // testProjectAPI()

  loadProjects()

  if (isEditMode.value || isViewing.value) {
    loadAchievementData()
  }
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
  status: 'draft',
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

// API请求函数
const apiRequest = async (url, options = {}) => {
  const token = localStorage.getItem('token')
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...options.headers,
  }

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
    })

    const data = await response.json()

    if (data.success === false) {
      throw new Error(data.error || '请求失败')
    }

    return data
  } catch (error) {
    console.error('API请求失败:', error)
    throw error
  }
}

// 获取项目列表
const loadProjects = async () => {
  console.log('开始加载项目列表...')
  loading.value = true

  try {
    // 方法1：先尝试获取当前用户的项目
    let response
    try {
      // 直接调用后端API获取项目列表
      const token = localStorage.getItem('token')
      console.log('Token:', token ? '存在' : '不存在')

      // 尝试多个可能的端点
      const endpoints = ['/projects']

      let projects = []

      for (const endpoint of endpoints) {
        try {
          console.log(`尝试端点: ${endpoint}`)
          const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })

          if (res.ok) {
            const data = await res.json()
            console.log(`端点 ${endpoint} 响应:`, data)

            // 解析项目数据
            if (data.success !== false) {
              const projectData = data.data || data

              if (Array.isArray(projectData)) {
                projects = projectData
              } else if (projectData.projects && Array.isArray(projectData.projects)) {
                projects = projectData.projects
              } else if (projectData.list && Array.isArray(projectData.list)) {
                projects = projectData.list
              } else if (projectData.items && Array.isArray(projectData.items)) {
                projects = projectData.items
              }

              if (projects.length > 0) {
                console.log(`从 ${endpoint} 获取到 ${projects.length} 个项目`)
                break
              }
            }
          }
        } catch (endpointError) {
          console.log(`端点 ${endpoint} 失败:`, endpointError.message)
        }
      }

      if (projects.length > 0) {
        // 格式化项目数据
        projectList.value = projects.map((project) => {
          console.log('项目原始数据:', project)

          return {
            id: project.id,
            title: project.title || project.name || '未命名项目',
            project_code:
              project.project_code ||
              project.code ||
              project.projectCode ||
              project.project_code ||
              '无编号',
            status: project.status || 'unknown',
            applicant_name: project.applicant_name || project.applicant || '未知',
            start_date: project.start_date || project.startDate,
            end_date: project.end_date || project.endDate,
            created_at: project.created_at || project.createdAt,
          }
        })

        console.log('格式化后的项目列表:', projectList.value)
        ElMessage.success(`成功加载 ${projectList.value.length} 个项目`)
      } else {
        console.warn('所有端点都返回空项目列表')
        // 显示友好的提示
        ElMessageBox.confirm(
          '没有找到可用的项目。可能原因：\n' +
            '1. 您还没有创建任何项目\n' +
            '2. 您的项目尚未批准\n' +
            '3. 需要刷新页面或重新登录\n\n' +
            '您可以选择：',
          '提示',
          {
            confirmButtonText: '创建新项目',
            cancelButtonText: '稍后再说',
            type: 'warning',
          },
        )
          .then(() => {
            router.push('/projects/create')
          })
          .catch(() => {
            // 用户取消
          })
      }
    } catch (error) {
      console.error('获取项目列表失败:', error)
      throw error
    }
  } catch (error) {
    console.error('加载项目失败:', error)

    // 更详细的错误处理
    if (error.message.includes('401')) {
      ElMessage.error('认证已过期，请重新登录')
      router.push('/login')
    } else if (error.message.includes('403')) {
      ElMessage.error('权限不足，无法访问项目列表')
    } else if (error.message.includes('Network Error')) {
      ElMessage.error('网络连接失败，请检查服务器是否运行')
    } else {
      ElMessage.error('加载项目失败: ' + error.message)
    }

    // 显示一个帮助信息
    console.log('调试信息：')
    console.log('1. 检查后端服务器是否运行')
    console.log('2. 检查API端点是否正确')
    console.log('3. 检查用户权限')
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

const handleFileRemove = (file) => {
  const index = formData.attachment_urls.indexOf(file.name)
  if (index > -1) {
    formData.attachment_urls.splice(index, 1)
  }
}

// 步骤导航
const nextStep = async () => {
  if (currentStep.value === 0) {
    try {
      await formRef.value.validateField(['type', 'title', 'project_id', 'achievement_date'])
      currentStep.value++
    } catch (error) {
      ElMessage.warning('请先完成基本信息填写')
    }
  } else if (currentStep.value === 1) {
    try {
      await formRef.value.validateField(['description'])
      currentStep.value++
    } catch (error) {
      ElMessage.warning('请先填写成果描述')
    }
  }
}

const previousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
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
    const valid = await formRef.value.validate()
    if (!valid) return

    saving.value = true

    // 构建完整的描述
    const fullDescription = buildDescription()

    // 准备提交数据
    const submitData = {
      type: formData.type,
      title: formData.title,
      project_id: formData.project_id,
      description: fullDescription,
      keywords: formData.keywords,
      status: formData.status,
      achievement_date: formData.achievement_date,
      external_link: formData.external_link,
      // 处理 JSON 字段
      authors: formData.authors.length > 0 ? JSON.stringify(formData.authors) : null,
      attachment_urls:
        fileList.value.length > 0
          ? JSON.stringify(
              fileList.value.map((file) => ({
                name: file.name,
                url: file.url || file.raw?.name || file.name,
              })),
            )
          : null,
    }

    console.log('提交数据:', submitData)

    let response
    if (isEditMode.value) {
      // 更新现有成果
      response = await apiRequest(`/achievements/${achievementId.value}`, {
        method: 'PUT',
        body: JSON.stringify(submitData),
      })
    } else {
      // 创建新成果
      response = await apiRequest('/achievements', {
        method: 'POST',
        body: JSON.stringify(submitData),
      })
    }

    if (response.success) {
      const message = isEditMode.value ? '成果更新成功' : '成果创建成功'
      ElMessage.success(message)

      // 返回列表页面
      router.push('/achievements')
    } else {
      ElMessage.error(response.error || '保存失败')
    }
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败: ' + error.message)
  } finally {
    saving.value = false
  }
}

// 加载现有数据（编辑模式）
const loadAchievementData = async () => {
  if (!achievementId.value) return

  loading.value = true
  try {
    const response = await apiRequest(`/achievements/${achievementId.value}`)
    if (response.data) {
      const data = response.data

      // 填充表单数据
      Object.keys(formData).forEach((key) => {
        if (data[key] !== undefined && data[key] !== null) {
          formData[key] = data[key]
        }
      })

      // 处理作者数据
      if (data.authors) {
        try {
          formData.authors = JSON.parse(data.authors)
          authorsInput.value = formData.authors.join(', ')
        } catch (e) {
          console.warn('解析作者失败:', e)
          formData.authors = []
          authorsInput.value = data.authors || ''
        }
      }

      // 处理关键词
      if (data.keywords) {
        keywordTags.value = data.keywords
          .split(',')
          .map((k) => k.trim())
          .filter((k) => k)
        keywordsInput.value = keywordTags.value.join(', ')
      }

      // 处理附件
      if (data.attachment_urls) {
        try {
          const attachments = JSON.parse(data.attachment_urls)
          fileList.value = attachments.map((att, index) => ({
            name: att.name || `附件${index + 1}`,
            url: att.url || att,
          }))
        } catch (e) {
          console.warn('解析附件失败:', e)
        }
      }

      // 解析描述中的详细信息
      parseDescriptionDetails(data.description)

      ElMessage.success('数据加载成功')
    }
  } catch (error) {
    console.error('加载成果数据失败:', error)
    ElMessage.error('加载成果数据失败')
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

// 返回列表
const goBack = () => {
  router.push('/achievements')
}

// 监听成果类型变化
watch(
  () => formData.type,
  (newType) => {
    // 清空类型特有信息
    if (newType !== 'paper') {
      Object.keys(paperInfo).forEach((key) => {
        paperInfo[key] = ''
      })
    }
    if (newType !== 'patent') {
      Object.keys(patentInfo).forEach((key) => {
        patentInfo[key] = ''
      })
    }
    if (newType !== 'award') {
      Object.keys(awardInfo).forEach((key) => {
        awardInfo[key] = ''
      })
    }
  },
)

// 初始化
onMounted(() => {
  loadProjects()

  if (isEditMode.value || isViewing.value) {
    loadAchievementData()
  }
})
const showProjectDetails = () => {
  console.log('当前项目列表详情:', projectList.value)
  ElMessageBox.alert(
    `已加载 ${projectList.value.length} 个项目\n` +
      `第一个项目: ${projectList.value[0]?.title}\n` +
      `项目ID: ${projectList.value[0]?.id}`,
    '项目详情',
    {
      confirmButtonText: '确定',
      callback: () => {},
    },
  )
}
</script>

<style scoped>
.debug-info {
  margin-top: 5px;
  font-size: 12px;
  color: #909399;
  background: #f5f7fa;
  padding: 5px;
  border-radius: 3px;
  border-left: 3px solid #409eff;
}
.create-achievement {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.page-header {
  background: white;
  padding: 20px;
  border-radius: 4px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-content h2 {
  margin: 0;
  color: #303133;
}

.form-container {
  background: white;
  padding: 30px;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.form-step {
  min-height: 400px;
}

.form-step h3 {
  color: #409eff;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
}

.form-step h4 {
  color: #67c23a;
  margin: 15px 0;
  font-size: 14px;
}

.tags-container {
  margin-top: 10px;
}

.type-fields {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
  border: 1px solid #ebeef5;
}

.step-navigation {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
  text-align: center;
}

.el-steps {
  margin-bottom: 20px;
}

.upload-demo {
  width: 100%;
}

.el-upload__tip {
  margin-top: 8px;
  color: #909399;
  font-size: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .create-achievement {
    padding: 10px;
  }

  .form-container {
    padding: 20px 15px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .header-actions {
    width: 100%;
    display: flex;
    justify-content: flex-end;
  }

  .el-row {
    margin: 0 !important;
  }

  .el-col {
    margin-bottom: 15px;
  }
}
</style>
