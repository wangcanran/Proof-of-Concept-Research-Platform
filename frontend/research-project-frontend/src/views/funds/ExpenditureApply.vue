<!-- src/views/funds/ExpenditureApply.vue -->
<template>
  <div class="expenditure-apply">
    <div class="page-container">
      <!-- 页面标题 -->
      <div class="page-header">
        <div class="header-main">
          <h1>申请预算支出</h1>
          <p class="header-subtitle">申请使用项目预算经费</p>
        </div>
        <el-button @click="$router.back()" plain>
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
      </div>

      <!-- 申请表单 -->
      <div class="apply-form">
        <el-alert
          title="填写说明"
          type="info"
          description="请填写预算支出申请信息，申请通过后将记录预算使用情况"
          :closable="false"
          style="margin-bottom: 24px"
        />

        <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
          <!-- 基本信息 -->
          <div class="form-section">
            <h3>基本信息</h3>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="申请单号" prop="applyCode">
                  <el-input v-model="form.applyCode" placeholder="系统自动生成" disabled />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="关联项目" prop="projectId" required>
                  <el-select
                    v-model="form.projectId"
                    placeholder="请选择项目"
                    style="width: 100%"
                    @change="handleProjectChange"
                  >
                    <el-option
                      v-for="project in projects"
                      :key="project.id"
                      :label="project.title"
                      :value="project.id"
                    />
                  </el-select>
                  <div v-if="selectedProject" class="form-tips">
                    项目总预算：¥{{ formatAmount(selectedProject.budget_total) }}
                    <span v-if="selectedProject.approved_budget">
                      ，批准预算：¥{{ formatAmount(selectedProject.approved_budget) }}
                    </span>
                  </div>
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <!-- 预算详情 -->
          <div class="form-section">
            <h3>预算详情</h3>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="预算科目" prop="category" required>
                  <el-select
                    v-model="form.category"
                    placeholder="请选择预算科目"
                    style="width: 100%"
                    @change="handleCategoryChange"
                  >
                    <el-option
                      v-for="cat in budgetCategories"
                      :key="cat"
                      :label="cat"
                      :value="cat"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="预算项目" prop="budgetId" required>
                  <el-select
                    v-model="form.budgetId"
                    placeholder="请选择预算项目"
                    style="width: 100%"
                    @change="handleBudgetChange"
                  >
                    <el-option
                      v-for="budget in filteredBudgets"
                      :key="budget.id"
                      :label="budget.item_name"
                      :value="budget.id"
                    >
                      <span>{{ budget.item_name }}</span>
                      <span style="float: right; color: #8492a6; font-size: 12px">
                        ¥{{ formatAmount(budget.amount) }}
                      </span>
                    </el-option>
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="预算金额" prop="budgetAmount">
                  <el-input v-model="form.budgetAmount" placeholder="自动显示" disabled />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="申请金额" prop="amount" required>
                  <el-input-number
                    v-model="form.amount"
                    :min="0"
                    :max="maxAmount"
                    :precision="2"
                    placeholder="请输入申请金额"
                    style="width: 100%"
                  >
                    <template #prefix>¥</template>
                  </el-input-number>
                  <div v-if="maxAmount > 0" class="form-tips">
                    可申请额度：¥{{ formatAmount(maxAmount) }}
                  </div>
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="使用说明" prop="description" required>
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="4"
                placeholder="请详细说明经费使用用途、具体计划等"
                :maxlength="500"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="计算方法" prop="calculationMethod">
              <el-input
                v-model="form.calculationMethod"
                placeholder="请说明经费的计算方法，如：3人×5000元/月×12个月"
                :maxlength="200"
              />
            </el-form-item>
          </div>

          <!-- 收款信息 -->
          <div class="form-section">
            <h3>收款信息</h3>
            <el-form-item label="收款方类型" prop="payeeType">
              <el-radio-group v-model="form.payeeType">
                <el-radio label="company">公司/单位</el-radio>
                <el-radio label="personal">个人</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="收款方名称" prop="payeeName">
              <el-input v-model="form.payeeName" placeholder="请输入收款方全称" />
            </el-form-item>

            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="银行账号" prop="bankAccount">
                  <el-input v-model="form.bankAccount" placeholder="请输入银行账号" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="开户银行" prop="bankName">
                  <el-input v-model="form.bankName" placeholder="请输入开户银行" />
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <!-- 审批流程 -->
          <div class="form-section">
            <h3>审批流程</h3>
            <el-steps :active="currentStep" finish-status="success" simple>
              <el-step title="填写申请" />
              <el-step title="项目负责人审批" />
              <el-step title="科研秘书审核" />
              <el-step title="财务处理" />
              <el-step title="完成" />
            </el-steps>
          </div>

          <!-- 表单操作 -->
          <div class="form-actions">
            <el-button @click="handleCancel">取消</el-button>
            <el-button @click="handleSaveDraft" :loading="saving">保存草稿</el-button>
            <el-button type="primary" @click="handleSubmit" :loading="submitting">
              提交申请
            </el-button>
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { getApiBaseUrl } from '@/utils/request'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const router = useRouter()
const formRef = ref()

// API配置
const API_BASE_URL = getApiBaseUrl()
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  },
)

// 表单数据
const form = ref({
  applyCode: `EXP${new Date().getTime().toString().slice(-8)}`,
  projectId: '',
  budgetId: '',
  category: '',
  itemName: '',
  budgetAmount: 0,
  amount: 0,
  description: '',
  calculationMethod: '',
  payeeType: 'company',
  payeeName: '',
  bankAccount: '',
  bankName: '',
})

// 表单验证规则
const rules = {
  projectId: [{ required: true, message: '请选择项目', trigger: 'change' }],
  category: [{ required: true, message: '请选择预算科目', trigger: 'change' }],
  budgetId: [{ required: true, message: '请选择预算项目', trigger: 'change' }],
  amount: [
    { required: true, message: '请输入申请金额', trigger: 'blur' },
    { type: 'number', min: 1, message: '金额必须大于0', trigger: 'blur' },
  ],
  description: [
    { required: true, message: '请输入使用说明', trigger: 'blur' },
    { min: 10, message: '使用说明至少10个字符', trigger: 'blur' },
  ],
  payeeName: [{ required: true, message: '请输入收款方名称', trigger: 'blur' }],
}

// 状态
const saving = ref(false)
const submitting = ref(false)
const currentStep = ref(0)

// 数据
const projects = ref([])
const projectBudgets = ref([])
const selectedBudget = ref(null)

// 预算科目列表
const budgetCategories = [
  '设备费',
  '材料费',
  '测试费',
  '差旅费',
  '会议费',
  '劳务费',
  '专家咨询费',
  '出版费',
  '管理费',
  '其他',
]

// 计算属性
const selectedProject = computed(() => {
  return projects.value.find((p) => p.id === form.value.projectId)
})

const filteredBudgets = computed(() => {
  return projectBudgets.value.filter(
    (b) => b.category === form.value.category && b.project_id === form.value.projectId,
  )
})

const maxAmount = computed(() => {
  if (selectedBudget.value) {
    return selectedBudget.value.amount - (selectedBudget.value.used_amount || 0)
  }
  return 0
})

// 方法
const formatAmount = (amount) => {
  if (amount === undefined || amount === null) return '0.00'
  return Number(amount).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// 获取项目列表
const fetchProjects = async () => {
  try {
    const response = await api.get('/projects')
    if (response.success && response.data) {
      projects.value = response.data.filter(
        (p) => p.status === 'approved' || p.status === 'incubating',
      )
    }
  } catch (error) {
    console.error('获取项目列表失败:', error)
  }
}

// 获取项目预算
const fetchProjectBudgets = async (projectId) => {
  try {
    const response = await api.get(`/projects/${projectId}/budgets`)
    if (response.success && response.data) {
      projectBudgets.value = response.data.budgets || []
    }
  } catch (error) {
    console.error('获取项目预算失败:', error)
    projectBudgets.value = []
  }
}

// 项目变更
const handleProjectChange = async (projectId) => {
  if (projectId) {
    await fetchProjectBudgets(projectId)
    form.value.category = ''
    form.value.budgetId = ''
    form.value.budgetAmount = 0
    selectedBudget.value = null
  }
}

// 预算科目变更
const handleCategoryChange = () => {
  form.value.budgetId = ''
  form.value.budgetAmount = 0
  selectedBudget.value = null
}

// 预算项目变更
const handleBudgetChange = (budgetId) => {
  selectedBudget.value = projectBudgets.value.find((b) => b.id === budgetId)
  if (selectedBudget.value) {
    form.value.budgetAmount = selectedBudget.value.amount
    form.value.itemName = selectedBudget.value.item_name
    const used = selectedBudget.value.used_amount || 0
    const available = selectedBudget.value.amount - used
    if (form.value.amount > available) {
      form.value.amount = available
    }
  }
}

// 保存草稿
const handleSaveDraft = async () => {
  try {
    saving.value = true

    if (!form.value.projectId || !form.value.category || !form.value.budgetId) {
      ElMessage.warning('请填写基本信息')
      return
    }

    const draftData = {
      ...form.value,
      saveTime: new Date().toISOString(),
      status: 'draft',
    }

    // 保存到本地存储
    const drafts = JSON.parse(localStorage.getItem('expenditureApplies') || '[]')
    drafts.push(draftData)
    localStorage.setItem('expenditureApplies', JSON.stringify(drafts))

    ElMessage.success('草稿保存成功')
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

// 提交申请
const handleSubmit = async () => {
  try {
    submitting.value = true

    // 验证表单
    await formRef.value.validate()

    // 检查预算是否足够
    if (maxAmount.value > 0 && form.value.amount > maxAmount.value) {
      ElMessage.error(`申请金额超过预算可用额度，可用额度为 ¥${formatAmount(maxAmount.value)}`)
      return
    }

    // 提交确认
    await ElMessageBox.confirm('确定要提交预算支出申请吗？提交后将进入审批流程。', '提交确认', {
      confirmButtonText: '确定提交',
      cancelButtonText: '再检查一下',
      type: 'warning',
    })

    // 准备提交数据
    const submitData = {
      project_id: form.value.projectId,
      budget_id: form.value.budgetId,
      category: form.value.category,
      item_name: form.value.itemName,
      amount: form.value.amount,
      description: form.value.description,
      calculation_method: form.value.calculationMethod,
      payee_name: form.value.payeeName,
      payee_type: form.value.payeeType,
      bank_account: form.value.bankAccount,
      bank_name: form.value.bankName,
      status: 'submitted',
    }

    // 调用API提交
    const response = await api.post('/expenditures', submitData)

    if (response.success) {
      ElMessage.success({
        message: `支出申请提交成功！申请单号：${form.value.applyCode}`,
        duration: 5000,
      })
      router.push('/funds/expenditures')
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
      ElMessage.error('提交失败，请重试')
    }
  } finally {
    submitting.value = false
  }
}

// 取消申请
const handleCancel = () => {
  ElMessageBox.confirm('确定要取消申请吗？填写的内容将不会被保存。', '取消确认', {
    confirmButtonText: '确定',
    cancelButtonText: '继续填写',
    type: 'warning',
  })
    .then(() => {
      router.back()
    })
    .catch(() => {
      // 继续填写
    })
}

// 初始化
onMounted(async () => {
  console.log('申请预算支出页面加载完成')
  await fetchProjects()

  // 设置默认申请单号
  form.value.applyCode = `EXP${new Date().getTime().toString().slice(-8)}`
})
</script>

<style scoped>
.expenditure-apply {
  min-height: calc(100vh - 64px);
  background: #f5f7fa;
}

.page-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  padding: 24px;
  background: linear-gradient(135deg, #b31b1b 0%, #36cfc9 100%);
  border-radius: 12px;
  color: white;
}

.header-main h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
}

.header-subtitle {
  margin: 0;
  opacity: 0.9;
  font-size: 14px;
}

.apply-form {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
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
  font-size: 18px;
  font-weight: 600;
}

.form-tips {
  font-size: 12px;
  color: #666;
  margin-top: 8px;
  line-height: 1.5;
}

.form-actions {
  margin-top: 40px;
  text-align: center;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}

.form-actions .el-button {
  min-width: 120px;
  margin: 0 12px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .page-container {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .apply-form {
    padding: 20px;
  }

  .form-actions .el-button {
    margin-bottom: 12px;
    width: 100%;
  }

  .form-actions .el-button:last-child {
    margin-bottom: 0;
  }
}
</style>
