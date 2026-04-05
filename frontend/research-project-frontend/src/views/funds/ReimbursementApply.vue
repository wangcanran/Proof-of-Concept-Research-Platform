<!-- src/views/funds/ReimbursementApply.vue -->
<template>
  <div class="apply-expenditure">
    <div class="page-container">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1>报销申请</h1>
        <div class="header-tips">
          <el-alert
            title="填写说明"
            type="info"
            description="请仔细填写报销信息，确保发票、凭证等附件完整准确"
            :closable="false"
          />
        </div>
      </div>

      <!-- 报销表单 -->
      <div class="expenditure-form">
        <el-form
          ref="expenditureFormRef"
          :model="expenditureForm"
          :rules="expenditureRules"
          label-width="120px"
          label-position="top"
          :disabled="loading.submit"
        >
          <!-- 基本信息 -->
          <div class="form-section">
            <h3>基本信息</h3>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="报销单号" prop="expense_no">
                  <el-input
                    v-model="expenditureForm.expense_no"
                    placeholder="系统自动生成"
                    disabled
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="关联项目" prop="project_id" required>
                  <el-select
                    v-model="expenditureForm.project_id"
                    placeholder="请选择项目"
                    style="width: 100%"
                    @change="handleProjectChange"
                    :loading="loading.projects"
                  >
                    <el-option
                      v-for="project in availableProjects"
                      :key="project.id"
                      :label="project.title"
                      :value="project.id"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <!-- 报销详情 -->
          <div class="form-section">
            <h3>报销详情</h3>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="报销事项" prop="item_name" required>
                  <el-input
                    v-model="expenditureForm.item_name"
                    placeholder="请输入报销事项，如：采购实验材料"
                    :maxlength="200"
                    show-word-limit
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="报销类别" prop="category" required>
                  <el-select
                    v-model="expenditureForm.category"
                    placeholder="请选择类别"
                    style="width: 100%"
                    @change="handleCategoryChange"
                  >
                    <el-option
                      v-for="category in expenditureCategories"
                      :key="category.value"
                      :label="category.label"
                      :value="category.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="24">
              <el-col :span="8">
                <el-form-item label="报销金额" prop="amount" required>
                  <el-input-number
                    v-model="expenditureForm.amount"
                    :min="0"
                    :precision="2"
                    placeholder="请输入金额"
                    style="width: 100%"
                    @change="calculateTotalAmount"
                  >
                    <template #prefix>¥</template>
                  </el-input-number>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="支出日期" prop="expense_date" required>
                  <el-date-picker
                    v-model="expenditureForm.expense_date"
                    type="date"
                    placeholder="选择日期"
                    style="width: 100%"
                    value-format="YYYY-MM-DD"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="收款方" prop="payee">
                  <el-input
                    v-model="expenditureForm.payee"
                    placeholder="请输入收款方名称"
                    :maxlength="200"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <div class="budget-info" v-if="projectBudget">
              <el-alert
                :title="`项目预算情况：${projectBudget.project_title}`"
                type="info"
                :closable="false"
                show-icon
              >
                <div class="budget-details">
                  <span
                    >总预算：<strong>¥{{ formatAmount(projectBudget.total_budget) }}</strong></span
                  >
                  <span
                    >已使用：<strong>¥{{ formatAmount(projectBudget.used_amount) }}</strong></span
                  >
                  <span
                    >可用余额：<strong :class="getBalanceClass(projectBudget.available_balance)">
                      ¥{{ formatAmount(projectBudget.available_balance) }}
                    </strong></span
                  >
                  <span
                    >使用率：<strong :class="getUsageClass(projectBudget.usage_rate)">
                      {{ projectBudget.usage_rate }}%
                    </strong></span
                  >
                </div>
              </el-alert>
            </div>

            <el-form-item label="详细说明" prop="description">
              <el-input
                v-model="expenditureForm.description"
                type="textarea"
                :rows="4"
                placeholder="请详细描述报销事由、具体内容等"
                :maxlength="500"
                show-word-limit
              />
            </el-form-item>
          </div>

          <!-- 费用明细 -->
          <div class="form-section">
            <h3>
              费用明细
              <el-button type="text" :icon="Plus" @click="addExpenseDetail" size="small">
                添加明细
              </el-button>
            </h3>

            <div v-if="expenditureForm.expense_details.length === 0" class="empty-details">
              <el-empty description="暂无费用明细" />
            </div>

            <div v-else class="expense-details">
              <div
                v-for="(detail, index) in expenditureForm.expense_details"
                :key="index"
                class="expense-item"
              >
                <el-row :gutter="16">
                  <el-col :span="5">
                    <el-form-item
                      :prop="`expense_details.${index}.item_name`"
                      :rules="detailRules.item_name"
                    >
                      <el-input v-model="detail.item_name" placeholder="费用项目" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="5">
                    <el-form-item
                      :prop="`expense_details.${index}.amount`"
                      :rules="detailRules.amount"
                    >
                      <el-input-number
                        v-model="detail.amount"
                        :min="0"
                        :precision="2"
                        placeholder="金额"
                        style="width: 100%"
                        @change="calculateTotalAmount"
                      >
                        <template #prefix>¥</template>
                      </el-input-number>
                    </el-form-item>
                  </el-col>
                  <el-col :span="5">
                    <el-form-item>
                      <el-input v-model="detail.payee" placeholder="收款方" :maxlength="200" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="7">
                    <el-form-item>
                      <el-input v-model="detail.description" placeholder="说明" :maxlength="200" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="2">
                    <el-button
                      type="danger"
                      :icon="Delete"
                      @click="removeExpenseDetail(index)"
                      plain
                      size="small"
                    />
                  </el-col>
                </el-row>
              </div>

              <div class="expense-summary">
                <span>合计：</span>
                <span class="total-amount">¥{{ formatAmount(totalExpenseAmount) }}</span>
                <span
                  v-if="Math.abs(totalExpenseAmount - expenditureForm.amount) > 0.01"
                  class="amount-warning"
                >
                  （与总金额不一致）
                </span>
              </div>
            </div>
          </div>

          <!-- 附件上传 -->
          <div class="form-section">
            <h3>附件材料</h3>
            <el-alert
              title="上传要求"
              type="warning"
              description="请上传清晰的发票、收据、合同等凭证照片或扫描件（支持 JPG、PNG、PDF、DOC、DOCX、XLS、XLSX 格式）"
              :closable="false"
              style="margin-bottom: 16px"
            />

            <div class="upload-area">
              <el-upload
                v-model:file-list="expenditureForm.supporting_docs"
                class="upload-demo"
                :action="uploadUrl"
                :headers="uploadHeaders"
                :data="uploadData"
                multiple
                :limit="10"
                :on-exceed="handleExceed"
                :before-upload="beforeUpload"
                :on-remove="handleRemove"
                :on-preview="handlePreview"
                :on-success="handleUploadSuccess"
                :on-error="handleUploadError"
                list-type="picture-card"
                :file-list="expenditureForm.supporting_docs"
              >
                <el-icon><Plus /></el-icon>
                <template #tip>
                  <div class="upload-tips">
                    最多可上传10个文件，单个文件不超过20MB。支持图片、PDF、Word、Excel格式
                  </div>
                </template>
              </el-upload>
            </div>
          </div>

          <!-- 审批流程 -->
          <div class="form-section">
            <h3>审批流程</h3>
            <el-steps :active="currentStep" finish-status="success">
              <el-step title="填写申请" />
              <el-step title="提交审核" />
              <el-step title="项目负责人审批" />
              <el-step title="科研助理审核" />
              <el-step title="完成" />
            </el-steps>
          </div>

          <!-- 表单操作 -->
          <div class="form-actions">
            <el-button @click="handleReset" :loading="loading.reset">重置</el-button>
            <el-button @click="handleSaveDraft" :loading="loading.draft" :disabled="!canSaveDraft">
              保存草稿
            </el-button>
            <el-button
              type="primary"
              @click="handleSubmit"
              :loading="loading.submit"
              :disabled="!canSubmit"
            >
              提交审核
            </el-button>
            <el-button @click="handlePreviewForm" :disabled="!canPreview"> 预览 </el-button>
          </div>
        </el-form>
      </div>

      <!-- 预览对话框 -->
      <el-dialog v-model="previewDialogVisible" title="报销申请预览" width="800px" top="5vh">
        <div class="preview-content">
          <!-- 预览内容 -->
          <div class="preview-section">
            <h4>基本信息</h4>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="报销单号">
                {{ expenditureForm.expense_no || '提交后生成' }}
              </el-descriptions-item>
              <el-descriptions-item label="关联项目">
                {{ getProjectName(expenditureForm.project_id) }}
              </el-descriptions-item>
              <el-descriptions-item label="报销事项">
                {{ expenditureForm.item_name }}
              </el-descriptions-item>
              <el-descriptions-item label="报销类别">
                {{ getCategoryLabel(expenditureForm.category) }}
              </el-descriptions-item>
              <el-descriptions-item label="支出日期">
                {{ expenditureForm.expense_date }}
              </el-descriptions-item>
              <el-descriptions-item label="收款方">
                {{ expenditureForm.payee || '未填写' }}
              </el-descriptions-item>
              <el-descriptions-item label="报销金额">
                <span class="preview-amount">¥{{ formatAmount(expenditureForm.amount) }}</span>
              </el-descriptions-item>
            </el-descriptions>
          </div>

          <div class="preview-section">
            <h4>详细说明</h4>
            <div class="preview-text">{{ expenditureForm.description || '无' }}</div>
          </div>

          <div v-if="expenditureForm.expense_details.length > 0" class="preview-section">
            <h4>费用明细</h4>
            <el-table :data="expenditureForm.expense_details" border size="small">
              <el-table-column prop="item_name" label="费用项目" width="150" />
              <el-table-column prop="amount" label="金额" width="120">
                <template #default="{ row }">¥{{ formatAmount(row.amount) }}</template>
              </el-table-column>
              <el-table-column prop="payee" label="收款方" width="150" />
              <el-table-column prop="description" label="说明" />
            </el-table>
            <div class="preview-total">
              合计：<span>¥{{ formatAmount(totalExpenseAmount) }}</span>
            </div>
          </div>

          <div v-if="expenditureForm.supporting_docs.length > 0" class="preview-section">
            <h4>附件材料</h4>
            <div class="preview-attachments">
              <div
                v-for="(file, index) in expenditureForm.supporting_docs"
                :key="index"
                class="preview-file"
              >
                <el-icon><Document /></el-icon>
                <span class="file-name">{{ file.name }}</span>
                <span class="file-size">({{ formatFileSize(file.size) }})</span>
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <span class="dialog-footer">
            <el-button @click="previewDialogVisible = false">关闭</el-button>
            <el-button type="primary" @click="handlePrintPreview">打印预览</el-button>
          </span>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Delete, Document } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()

// API基础URL
const API_BASE_URL = 'http://localhost:3002/api'

// 加载状态
const loading = reactive({
  projects: false,
  submit: false,
  draft: false,
  reset: false,
})

// 表单引用
const expenditureFormRef = ref()

// 表单数据 - 对应 ExpenditureRecord 表结构
const expenditureForm = reactive({
  project_id: '',
  category: '',
  item_name: '',
  amount: 0,
  expense_date: '',
  payee: '',
  description: '',
  expense_details: [],
  supporting_docs: [],
})

// 表单验证规则
const expenditureRules = {
  project_id: [{ required: true, message: '请选择关联项目', trigger: 'change' }],
  category: [{ required: true, message: '请选择报销类别', trigger: 'change' }],
  item_name: [
    { required: true, message: '请输入报销事项', trigger: 'blur' },
    { min: 2, max: 200, message: '长度在 2 到 200 个字符', trigger: 'blur' },
  ],
  amount: [
    { required: true, message: '请输入报销金额', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '金额必须大于0', trigger: 'blur' },
  ],
  expense_date: [{ required: true, message: '请选择支出日期', trigger: 'change' }],
  payee: [
    { required: false, message: '请输入收款方', trigger: 'blur' },
    { max: 200, message: '最长200个字符', trigger: 'blur' },
  ],
  description: [
    { required: false, message: '请输入详细说明', trigger: 'blur' },
    { max: 500, message: '最长500个字符', trigger: 'blur' },
  ],
}

// 费用明细验证规则
const detailRules = {
  item_name: [{ required: true, message: '请输入费用项目', trigger: 'blur' }],
  amount: [
    { required: true, message: '请输入金额', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '金额必须大于0', trigger: 'blur' },
  ],
}

// 状态
const currentStep = ref(0)
const previewDialogVisible = ref(false)

// 数据
const availableProjects = ref([])
const projectBudget = ref(null)

// 报销类别（从数据库表定义中获取）
const expenditureCategories = [
  { value: '设备费', label: '设备费' },
  { value: '材料费', label: '材料费' },
  { value: '测试费', label: '测试费' },
  { value: '差旅费', label: '差旅费' },
  { value: '会议费', label: '会议费' },
  { value: '劳务费', label: '劳务费' },
  { value: '专家咨询费', label: '专家咨询费' },
  { value: '出版费', label: '出版费' },
  { value: '管理费', label: '管理费' },
  { value: '其他', label: '其他' },
]

// 上传配置
const uploadUrl = `${API_BASE_URL}/upload`
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
}))

const uploadData = reactive({
  category: 'expenditure',
  related_table: 'ExpenditureRecord',
})

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

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.success === false) {
      throw new Error(data.error || '请求失败')
    }

    return {
      success: true,
      data: data.data || data,
      message: data.message,
      total: data.total,
    }
  } catch (error) {
    console.error('API请求失败:', error)
    return {
      success: false,
      error: error.message || '请求失败',
    }
  }
}

// 获取项目列表
const fetchProjects = async () => {
  loading.projects = true
  try {
    const response = await apiRequest('/user/projects')

    if (response.success && response.data) {
      availableProjects.value = response.data
    }
  } catch (error) {
    console.error('获取项目列表失败:', error)
    ElMessage.error('获取项目列表失败')
  } finally {
    loading.projects = false
  }
}

// 获取项目预算信息
const fetchProjectBudget = async (projectId) => {
  try {
    const response = await apiRequest(`/projects/${projectId}/budgets`)

    if (response.success && response.data) {
      // 计算预算统计
      const budgets = response.data
      const totalBudget = budgets.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)

      // 需要从另一个API获取已使用金额
      const statsResponse = await apiRequest(`/projects/${projectId}/expenditure-stats`)
      const usedAmount = statsResponse.success ? statsResponse.data.total_used || 0 : 0
      const usageRate = totalBudget > 0 ? Math.round((usedAmount / totalBudget) * 100) : 0

      projectBudget.value = {
        project_title: response.data.project?.title || '',
        total_budget: totalBudget,
        used_amount: usedAmount,
        available_balance: totalBudget - usedAmount,
        usage_rate: usageRate,
      }
    } else {
      projectBudget.value = null
    }
  } catch (error) {
    console.error('获取项目预算失败:', error)
    projectBudget.value = null
  }
}

// 计算属性
const totalExpenseAmount = computed(() => {
  return expenditureForm.expense_details.reduce((sum, detail) => {
    return sum + (parseFloat(detail.amount) || 0)
  }, 0)
})

const canSubmit = computed(() => {
  return (
    expenditureForm.project_id &&
    expenditureForm.item_name &&
    expenditureForm.category &&
    expenditureForm.amount > 0 &&
    expenditureForm.expense_date
  )
})

const canSaveDraft = computed(() => {
  return expenditureForm.project_id && expenditureForm.item_name
})

const canPreview = computed(() => {
  return canSubmit.value
})

// 方法
const formatAmount = (amount) => {
  if (amount === undefined || amount === null) return '0.00'
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const getProjectName = (projectId) => {
  const project = availableProjects.value.find((p) => p.id === projectId)
  return project ? project.title : '未选择'
}

const getCategoryLabel = (categoryValue) => {
  const category = expenditureCategories.find((c) => c.value === categoryValue)
  return category ? category.label : '未选择'
}

const getBalanceClass = (balance) => {
  return balance < 10000 ? 'warning-balance' : 'normal-balance'
}

const getUsageClass = (usageRate) => {
  if (usageRate >= 90) return 'danger-usage'
  if (usageRate >= 70) return 'warning-usage'
  return 'normal-usage'
}

const handleProjectChange = (projectId) => {
  if (projectId) {
    fetchProjectBudget(projectId)
  } else {
    projectBudget.value = null
  }
}

const handleCategoryChange = (category) => {
  console.log('类别变更:', category)
}

const calculateTotalAmount = () => {
  // 如果明细有数据，自动计算总金额
  if (expenditureForm.expense_details.length > 0) {
    expenditureForm.amount = totalExpenseAmount.value
  }
}

const addExpenseDetail = () => {
  expenditureForm.expense_details.push({
    item_name: '',
    amount: 0,
    payee: '',
    description: '',
  })
}

const removeExpenseDetail = (index) => {
  expenditureForm.expense_details.splice(index, 1)
  calculateTotalAmount()
}

const handleExceed = (files) => {
  ElMessage.warning(`最多只能上传 10 个文件，当前选择了 ${files.length} 个文件`)
}

const beforeUpload = (file) => {
  const isLt20M = file.size / 1024 / 1024 < 20
  const acceptTypes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/gif',
    'image/bmp',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]

  if (!acceptTypes.includes(file.type)) {
    ElMessage.error('只能上传图片、PDF、Word、Excel格式的文件!')
    return false
  }

  if (!isLt20M) {
    ElMessage.error('文件大小不能超过 20MB!')
    return false
  }

  return true
}

const handleRemove = (file, fileList) => {
  console.log('移除文件:', file, fileList)
}

const handlePreview = (file) => {
  console.log('预览文件:', file)
  if (file.url) {
    window.open(file.url, '_blank')
  } else {
    ElMessage.info('文件预览功能需要上传后才能使用')
  }
}

const handleUploadSuccess = (response, file, fileList) => {
  if (response.success) {
    file.url = response.data.url || response.data.file_path
    ElMessage.success('文件上传成功')
  } else {
    ElMessage.error(response.error || '文件上传失败')
  }
}

const handleUploadError = (error, file, fileList) => {
  console.error('上传失败:', error)
  ElMessage.error('文件上传失败')
}

const handleReset = async () => {
  try {
    await ElMessageBox.confirm('确定要重置表单吗？所有填写的内容将被清空。', '重置确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    loading.reset = true

    // 重置表单
    Object.assign(expenditureForm, {
      project_id: '',
      category: '',
      item_name: '',
      amount: 0,
      expense_date: '',
      payee: '',
      description: '',
      expense_details: [],
      supporting_docs: [],
    })

    projectBudget.value = null

    if (expenditureFormRef.value) {
      expenditureFormRef.value.clearValidate()
    }

    ElMessage.success('表单已重置')
  } catch (error) {
    // 用户取消操作
  } finally {
    loading.reset = false
  }
}

const handleSaveDraft = async () => {
  try {
    loading.draft = true

    // 验证必要字段
    if (!expenditureForm.project_id || !expenditureForm.item_name) {
      ElMessage.warning('请至少填写关联项目和报销事项')
      return
    }

    // 准备数据
    const draftData = {
      ...expenditureForm,
      status: 'draft',
      created_by: localStorage.getItem('userId'),
      supporting_docs: JSON.stringify(
        expenditureForm.supporting_docs.map((file) => ({
          name: file.name,
          url: file.url || '',
          size: file.size,
        })),
      ),
      expense_details: JSON.stringify(expenditureForm.expense_details),
    }

    // 保存草稿到本地存储（实际项目中应该调用API）
    const drafts = JSON.parse(localStorage.getItem('expenditureDrafts') || '[]')
    drafts.push({
      ...draftData,
      saveTime: new Date().toISOString(),
      id: `draft_${Date.now()}`,
    })
    localStorage.setItem('expenditureDrafts', JSON.stringify(drafts))

    ElMessage.success('草稿保存成功')
  } catch (error) {
    console.error('保存草稿失败:', error)
    ElMessage.error('保存草稿失败')
  } finally {
    loading.draft = false
  }
}

const handleSubmit = async () => {
  try {
    // 验证表单
    await expenditureFormRef.value.validate()

    // 检查金额是否超过预算
    if (projectBudget.value && expenditureForm.amount > projectBudget.value.available_balance) {
      ElMessage.error(
        `报销金额超过可用预算，可用预算为 ¥${formatAmount(projectBudget.value.available_balance)}`,
      )
      return
    }

    // 检查明细合计是否匹配总金额
    const detailsSum = totalExpenseAmount.value
    if (
      expenditureForm.expense_details.length > 0 &&
      Math.abs(detailsSum - expenditureForm.amount) > 0.01
    ) {
      ElMessage.error('费用明细合计与总金额不一致')
      return
    }

    // 提交确认
    await ElMessageBox.confirm('确定要提交报销申请吗？提交后将进入审批流程。', '提交确认', {
      confirmButtonText: '确定提交',
      cancelButtonText: '再检查一下',
      type: 'warning',
    })

    loading.submit = true

    // 准备提交数据
    const submitData = {
      project_id: expenditureForm.project_id,
      category: expenditureForm.category,
      item_name: expenditureForm.item_name,
      amount: expenditureForm.amount,
      expense_date: expenditureForm.expense_date,
      payee: expenditureForm.payee,
      description: expenditureForm.description,
      supporting_docs: JSON.stringify(
        expenditureForm.supporting_docs.map((file) => ({
          name: file.name,
          url: file.url || '',
          size: file.size,
        })),
      ),
      expense_details: JSON.stringify(expenditureForm.expense_details),
      status: 'draft', // 初始状态为草稿，用户可以提交审核
    }

    // 调用API创建支出记录
    const response = await apiRequest('/expenditures', {
      method: 'POST',
      body: JSON.stringify(submitData),
    })

    if (response.success) {
      ElMessage.success({
        message: `报销申请创建成功！${response.data.expense_no ? '单号：' + response.data.expense_no : ''}`,
        duration: 5000,
      })

      // 如果需要直接提交审核
      await ElMessageBox.confirm('是否立即提交审核？', '提交审核', {
        confirmButtonText: '提交审核',
        cancelButtonText: '稍后提交',
        type: 'info',
      })
        .then(async () => {
          // 提交审核
          const submitResponse = await apiRequest(`/expenditures/${response.data.id}/submit`, {
            method: 'POST',
          })

          if (submitResponse.success) {
            ElMessage.success('申请已提交审核')
            // 跳转到支出管理页面
            router.push('/funds/expenditures')
          }
        })
        .catch(() => {
          // 用户选择稍后提交
          ElMessage.info('申请已保存为草稿，请在支出管理页面提交审核')
          router.push('/funds/expenditures')
        })
    } else {
      ElMessage.error(response.error || '提交失败')
    }
  } catch (error) {
    if (error === 'cancel') {
      ElMessage.info('您可以继续修改申请内容')
    } else if (error && error.fields) {
      ElMessage.warning('请填写完整的表单信息')
    } else {
      console.error('提交失败:', error)
      ElMessage.error('提交失败，请稍后重试')
    }
  } finally {
    loading.submit = false
  }
}

const handlePreviewForm = () => {
  if (!canPreview.value) {
    ElMessage.warning('请先填写基本信息')
    return
  }

  previewDialogVisible.value = true
}

const handlePrintPreview = () => {
  ElMessage.info('打印功能开发中')
  // 实际项目中可以调用 window.print() 或使用打印插件
}

const formatFileSize = (size) => {
  if (!size) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  let unitIndex = 0
  let fileSize = size

  while (fileSize >= 1024 && unitIndex < units.length - 1) {
    fileSize /= 1024
    unitIndex++
  }

  return `${fileSize.toFixed(2)} ${units[unitIndex]}`
}

// 初始化
onMounted(() => {
  // 获取项目列表
  fetchProjects()

  // 设置默认支出日期为今天
  const today = new Date()
  expenditureForm.expense_date = today.toISOString().split('T')[0]

  // 生成报销单号
  const timestamp = today.getTime()
  const random = Math.random().toString(36).substr(2, 6).toUpperCase()
  expenditureForm.expense_no = `EXP-${today.toISOString().slice(0, 10).replace(/-/g, '')}-${random}`
})
</script>

<style scoped>
.apply-expenditure {
  min-height: calc(100vh - 64px);
  background: #f5f7fa;
}

.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0 0 16px 0;
  color: #2c3e50;
}

.expenditure-form {
  background: white;
  border-radius: 8px;
  padding: 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.form-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f0f0f0;
}

.form-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.form-section h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.budget-info {
  margin: 16px 0;
}

.budget-details {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.budget-details span {
  font-size: 14px;
  color: #666;
}

.budget-details strong {
  color: #b31b1b;
}

.warning-balance {
  color: #fa8c16 !important;
}

.danger-usage {
  color: #ff4d4f !important;
}

.warning-usage {
  color: #fa8c16 !important;
}

.normal-usage {
  color: #52c41a !important;
}

.empty-details {
  padding: 40px 0;
}

.expense-details {
  margin-top: 16px;
}

.expense-item {
  padding: 16px;
  background: #fafafa;
  border-radius: 4px;
  margin-bottom: 12px;
  border: 1px solid #e8e8e8;
}

.expense-item:last-child {
  margin-bottom: 0;
}

.expense-summary {
  margin-top: 16px;
  padding: 12px 16px;
  background: rgba(179,27,27,0.06);
  border-radius: 4px;
  text-align: right;
  font-size: 16px;
  font-weight: 500;
}

.total-amount {
  color: #b31b1b;
  font-size: 18px;
  margin-left: 8px;
}

.amount-warning {
  color: #ff4d4f;
  font-size: 14px;
  margin-left: 12px;
}

.upload-area {
  margin-top: 16px;
}

.upload-tips {
  font-size: 12px;
  color: #7f8c8d;
  margin-top: 8px;
}

.form-actions {
  margin-top: 40px;
  text-align: center;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}

.form-actions .el-button {
  min-width: 120px;
  margin: 0 8px;
}

/* 预览样式 */
.preview-content {
  max-height: 70vh;
  overflow-y: auto;
}

.preview-section {
  margin-bottom: 24px;
}

.preview-section h4 {
  margin: 0 0 12px 0;
  color: #2c3e50;
  font-weight: 500;
}

.preview-text {
  padding: 16px;
  background: #fafafa;
  border-radius: 4px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.preview-total {
  margin-top: 16px;
  text-align: right;
  font-size: 16px;
  font-weight: 500;
}

.preview-total span {
  color: #b31b1b;
  font-size: 18px;
  margin-left: 8px;
}

.preview-attachments {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-file {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 14px;
}

.preview-file .el-icon {
  margin-right: 8px;
  color: #b31b1b;
}

.file-name {
  flex: 1;
  color: #2c3e50;
}

.file-size {
  color: #7f8c8d;
  font-size: 12px;
}

.preview-amount {
  font-weight: bold;
  color: #ff4d4f;
  font-size: 16px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .page-container {
    padding: 16px;
  }

  .expenditure-form {
    padding: 20px;
  }

  .form-actions .el-button {
    margin-bottom: 12px;
    width: 100%;
  }

  .form-actions .el-button:last-child {
    margin-bottom: 0;
  }

  .budget-details {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
