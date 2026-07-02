<template>
  <div class="achievement-register-page">
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回工作台</span>
        </button>
        <h1>转化成果登记</h1>
        <div class="header-subtitle">
          查看已登记转化成果及审核状态；在下方填写表单提交新成果。仅限已入库或孵化中的项目。
        </div>
      </div>
    </div>

    <div class="content-wrapper">
      <div class="section-card">
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
          <p>暂无可登记转化成果的项目</p>
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

      <div v-if="selectedProject" class="section-card form-section">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">✏️</span>
            填写转化成果
          </h3>
          <span class="selected-tag">{{ selectedProject.title }}</span>
        </div>

        <div class="form-body">
          <el-form ref="formRef" :model="formData" :rules="formRules" label-width="140px">
            <div class="form-step">
              <h3>基本信息</h3>
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="转化方式" prop="transform_method">
                    <el-select
                      v-model="formData.transform_method"
                      placeholder="请选择转化方式"
                      style="width: 100%"
                      @change="handleMethodChange"
                    >
                      <el-option
                        v-for="m in TRANSFORM_METHODS"
                        :key="m.value"
                        :label="m.label"
                        :value="m.value"
                      />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="项目负责人">
                    <el-input v-model="formData.project_leader" readonly placeholder="选择项目后自动填充" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-form-item label="平台提供服务内容">
                <el-input
                  v-model="formData.platform_service_content"
                  type="textarea"
                  :rows="3"
                  placeholder="选填，描述平台提供的转化服务"
                  maxlength="2000"
                  show-word-limit
                />
              </el-form-item>
            </div>

            <div v-if="isContractMethod" class="form-step">
              <h3>转化信息</h3>
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="转化时间" prop="transform_date">
                    <el-date-picker
                      v-model="formData.transform_date"
                      type="date"
                      placeholder="选择转化时间"
                      value-format="YYYY-MM-DD"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="合同金额（万元）" prop="contract_amount">
                    <el-input-number
                      v-model="formData.contract_amount"
                      :min="0"
                      :precision="2"
                      :controls="false"
                      placeholder="请输入合同金额"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-form-item label="承接方（产业资源库）" prop="industry_partner_id">
                <el-select
                  v-model="formData.industry_partner_id"
                  filterable
                  placeholder="请从本项目已承接的机构中选择"
                  :loading="partnerLoading"
                  style="width: 100%"
                  @change="onPartnerSelected"
                >
                  <el-option
                    v-for="p in partnerOptions"
                    :key="p.id"
                    :label="p.name"
                    :value="p.id"
                  />
                </el-select>
                <div v-if="!partnerLoading && partnerOptions.length === 0" class="field-hint">
                  暂无已承接机构，请先通过「产业资源库对接申请」或项目经理服务分配建立承接关系。
                </div>
              </el-form-item>
              <el-form-item v-if="formData.recipient_company" label="承接方名称">
                <el-input v-model="formData.recipient_company" readonly />
              </el-form-item>
              <el-row :gutter="20">
                <el-col :span="8">
                  <el-form-item label="承接方省份" prop="recipient_province">
                    <el-input v-model="formData.recipient_province" placeholder="省份" maxlength="50" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="承接方城市" prop="recipient_city">
                    <el-input v-model="formData.recipient_city" placeholder="城市" maxlength="50" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="承接方区县" prop="recipient_district">
                    <el-input v-model="formData.recipient_district" placeholder="区县" maxlength="50" />
                  </el-form-item>
                </el-col>
              </el-row>
            </div>

            <div v-if="isStartupMethod" class="form-step">
              <h3>企业信息</h3>
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="公司名称" prop="company_name">
                    <el-input v-model="formData.company_name" placeholder="请输入公司名称" maxlength="200" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="统一社会信用代码" prop="company_credit_code">
                    <el-input v-model="formData.company_credit_code" placeholder="请输入统一社会信用代码" maxlength="50" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="成立时间" prop="establishment_date">
                    <el-date-picker
                      v-model="formData.establishment_date"
                      type="date"
                      placeholder="选择成立时间"
                      value-format="YYYY-MM-DD"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="注册地址" prop="registered_address">
                    <el-input v-model="formData.registered_address" placeholder="请输入注册地址" maxlength="500" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-form-item label="公司简介" prop="company_introduction">
                <el-input
                  v-model="formData.company_introduction"
                  type="textarea"
                  :rows="4"
                  placeholder="请输入公司简介"
                  maxlength="2000"
                  show-word-limit
                />
              </el-form-item>
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="获投融资（万元）" prop="invested_amount">
                    <el-input-number
                      v-model="formData.invested_amount"
                      :min="0"
                      :precision="2"
                      :controls="false"
                      placeholder="请输入获投融资"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="实缴金额（万元）" prop="paid_in_amount">
                    <el-input-number
                      v-model="formData.paid_in_amount"
                      :min="0"
                      :precision="2"
                      :controls="false"
                      placeholder="请输入实缴金额"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
            </div>

            <div v-if="formData.transform_method" class="form-step">
              <h3>附件材料</h3>
              <el-form-item label="上传附件">
                <div class="form-attachment-block">
                  <div class="upload-area">
                    <input
                      ref="fileInput"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      style="display: none"
                      @change="handleFileChange"
                    />
                    <button type="button" class="upload-btn" @click="triggerUpload">
                      <span class="upload-icon">📎</span>
                      选择文件
                    </button>
                    <span class="upload-hint">支持 PDF、Word、图片等格式，单个文件不超过 20MB</span>
                  </div>
                  <div v-if="uploadedFiles.length > 0" class="file-list">
                    <div v-for="(file, index) in uploadedFiles" :key="index" class="file-item">
                      <span class="file-icon">📄</span>
                      <span class="file-name">{{ file.name }}</span>
                      <button type="button" class="file-remove" @click="removeFile(index)">×</button>
                    </div>
                  </div>
                </div>
              </el-form-item>
            </div>
          </el-form>

          <div class="form-footer">
            <button type="button" class="btn secondary" @click="cancelFormSelection">取消</button>
            <button type="button" class="btn primary" :disabled="saving" @click="handleSubmit">
              {{ saving ? '提交中...' : '提交审批' }}
            </button>
          </div>
        </div>
      </div>

      <TransformationAchievementList ref="listRef" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import request from '@/utils/request'
import {
  transformationAchievementAPI,
  TRANSFORM_METHODS,
} from '@/api/transformationAchievements'
import { industryPartnerConnectionAPI } from '@/api/industryPartners'
import TransformationAchievementList from './TransformationAchievementList.vue'

const CONTRACT_METHODS = ['tech_license', 'tech_transfer', 'equity_investment']

const router = useRouter()
const isProjectManager = computed(
  () => (localStorage.getItem('userRole') || '').toUpperCase() === 'PROJECT_MANAGER',
)

const saving = ref(false)
const loading = ref(false)
const formRef = ref()
const fileInput = ref<HTMLInputElement>()
const listRef = ref<InstanceType<typeof TransformationAchievementList> | null>(null)

const projectList = ref<any[]>([])
const selectedProject = ref<any>(null)
const uploadedFiles = ref<File[]>([])
const partnerLoading = ref(false)
const partnerOptions = ref<{ id: string; name: string }[]>([])

const formData = reactive({
  project_id: '',
  project_leader: '',
  transform_method: '',
  platform_service_content: '',
  transform_date: '',
  industry_partner_id: '',
  recipient_company: '',
  recipient_province: '',
  recipient_city: '',
  recipient_district: '',
  contract_amount: undefined as number | undefined,
  company_name: '',
  company_credit_code: '',
  establishment_date: '',
  registered_address: '',
  company_introduction: '',
  invested_amount: undefined as number | undefined,
  paid_in_amount: undefined as number | undefined,
})

const isContractMethod = computed(() => CONTRACT_METHODS.includes(formData.transform_method))
const isStartupMethod = computed(() => formData.transform_method === 'startup_company')

const formRules = computed(() => {
  const rules: Record<string, unknown[]> = {
    transform_method: [{ required: true, message: '请选择转化方式', trigger: 'change' }],
  }
  if (isContractMethod.value) {
    rules.transform_date = [{ required: true, message: '请选择转化时间', trigger: 'change' }]
    rules.industry_partner_id = [{ required: true, message: '请选择承接方', trigger: 'change' }]
    rules.recipient_province = [{ required: true, message: '请输入承接方省份', trigger: 'blur' }]
    rules.recipient_city = [{ required: true, message: '请输入承接方城市', trigger: 'blur' }]
    rules.recipient_district = [{ required: true, message: '请输入承接方区县', trigger: 'blur' }]
    rules.contract_amount = [{ required: true, message: '请输入合同金额', trigger: 'blur' }]
  }
  if (isStartupMethod.value) {
    rules.company_name = [{ required: true, message: '请输入公司名称', trigger: 'blur' }]
    rules.company_credit_code = [{ required: true, message: '请输入统一社会信用代码', trigger: 'blur' }]
    rules.establishment_date = [{ required: true, message: '请选择成立时间', trigger: 'change' }]
    rules.registered_address = [{ required: true, message: '请输入注册地址', trigger: 'blur' }]
    rules.company_introduction = [{ required: true, message: '请输入公司简介', trigger: 'blur' }]
  }
  return rules
})

const loadProjects = async () => {
  loading.value = true
  try {
    const res = await request.get('/api/transformation-achievements/eligible-projects')
    if (res.success) {
      projectList.value = res.data || []
    } else {
      ElMessage.error(res.error || '加载项目列表失败')
      projectList.value = []
    }
  } catch (error: unknown) {
    ElMessage.error(error instanceof Error ? error.message : '加载项目失败')
  } finally {
    loading.value = false
  }
}

function selectProject(project: any) {
  selectedProject.value = project
  formData.project_id = project.id
  formData.project_leader = project.project_leader || ''
  loadEngagedPartners(project.id)
}

async function loadEngagedPartners(projectId: string) {
  formData.industry_partner_id = ''
  formData.recipient_company = ''
  partnerOptions.value = []
  if (!projectId) return
  partnerLoading.value = true
  try {
    const res = await industryPartnerConnectionAPI.getProjectEngaged(projectId)
    if (res.success && res.data) {
      partnerOptions.value = (res.data || []).map((p: { industry_partner_id: string; partner_name?: string }) => ({
        id: p.industry_partner_id,
        name: p.partner_name || p.industry_partner_id,
      }))
    }
  } catch {
    ElMessage.error('加载已承接机构失败')
  } finally {
    partnerLoading.value = false
  }
}

function handleMethodChange() {
  formData.transform_date = ''
  if (!isContractMethod.value) {
    formData.industry_partner_id = ''
    formData.recipient_company = ''
  }
  formData.recipient_province = ''
  formData.recipient_city = ''
  formData.recipient_district = ''
  formData.contract_amount = undefined
  formData.company_name = ''
  formData.company_credit_code = ''
  formData.establishment_date = ''
  formData.registered_address = ''
  formData.company_introduction = ''
  formData.invested_amount = undefined
  formData.paid_in_amount = undefined
  formRef.value?.clearValidate()
}

function onPartnerSelected(partnerId: string) {
  const found = partnerOptions.value.find((p) => p.id === partnerId)
  formData.recipient_company = found?.name || ''
}

function getProjectStatusClass(status: string) {
  const map: Record<string, string> = { approved: 'approved', incubating: 'incubating' }
  return map[status] || ''
}

function getProjectStatusText(status: string) {
  const map: Record<string, string> = { approved: '已入库', incubating: '孵化中' }
  return map[status] || status
}

function formatProjectDate(dateString?: string) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('zh-CN')
}

function cancelFormSelection() {
  selectedProject.value = null
  formData.project_id = ''
  formData.project_leader = ''
  partnerOptions.value = []
  formData.transform_method = ''
  formData.platform_service_content = ''
  handleMethodChange()
  uploadedFiles.value = []
  formRef.value?.resetFields()
}

function triggerUpload() {
  fileInput.value?.click()
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files) return
  for (const file of Array.from(target.files)) {
    if (file.size > 20 * 1024 * 1024) {
      ElMessage.error(`文件「${file.name}」超过 20MB，已跳过`)
      continue
    }
    uploadedFiles.value.push(file)
  }
  target.value = ''
}

function removeFile(index: number) {
  uploadedFiles.value.splice(index, 1)
}

async function handleSubmit() {
  if (!selectedProject.value) {
    ElMessage.warning('请先选择项目')
    return
  }
  try {
    await formRef.value.validate()
  } catch {
    ElMessage.warning('请完善必填项后再提交')
    return
  }

  saving.value = true
  try {
    const payload: Record<string, unknown> = {
      project_id: formData.project_id,
      project_leader: formData.project_leader,
      transform_method: formData.transform_method,
      platform_service_content: formData.platform_service_content || undefined,
      status: 'submitted',
    }

    if (isContractMethod.value) {
      payload.transform_date = formData.transform_date
      payload.industry_partner_id = formData.industry_partner_id
      payload.recipient_company = formData.recipient_company
      payload.recipient_province = formData.recipient_province
      payload.recipient_city = formData.recipient_city
      payload.recipient_district = formData.recipient_district
      payload.contract_amount = formData.contract_amount
    } else if (isStartupMethod.value) {
      payload.company_name = formData.company_name
      payload.company_credit_code = formData.company_credit_code
      payload.establishment_date = formData.establishment_date
      payload.registered_address = formData.registered_address
      payload.company_introduction = formData.company_introduction
      payload.invested_amount = formData.invested_amount ?? null
      payload.paid_in_amount = formData.paid_in_amount ?? null
    }

    const res = await transformationAchievementAPI.create(payload)
    const savedId = res.data?.id
    if (!savedId) throw new Error('创建转化成果失败')

    for (const file of uploadedFiles.value) {
      await transformationAchievementAPI.uploadFile(savedId, file)
    }

    ElMessage.success(isProjectManager.value ? '转化成果已登记' : '转化成果已提交，等待项目经理审批')
    cancelFormSelection()
    listRef.value?.refresh()
  } catch (error: unknown) {
    ElMessage.error(error instanceof Error ? error.message : '提交失败')
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.push(isProjectManager.value ? '/assistant/dashboard' : '/applicant/dashboard')
}

onMounted(() => {
  loadProjects()
})
</script>

<style>
@import '@/styles/form-upload-shared.css';
</style>

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

.loading-state,
.empty-state {
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

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-subtext {
  font-size: 13px;
  color: #bbb;
  margin-top: 8px;
}

.selected-tag {
  font-size: 13px;
  color: #666;
}

.section-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
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

.field-hint {
  margin-top: 8px;
  font-size: 13px;
  color: #909399;
  line-height: 1.5;
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

.btn.primary {
  background: var(--ruc-primary);
  color: white;
}

.btn.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.achievement-register-page :deep(.el-button--primary) {
  --el-button-bg-color: #b31b1b;
  --el-button-border-color: #b31b1b;
  --el-button-hover-bg-color: #8b1515;
  --el-button-hover-border-color: #8b1515;
}
</style>
