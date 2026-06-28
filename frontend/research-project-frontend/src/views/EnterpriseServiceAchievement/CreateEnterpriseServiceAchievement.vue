<template>
  <div class="achievement-register-page">
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回工作台</span>
        </button>
        <h1>企业服务成果登记</h1>
        <div class="header-subtitle">
          登记技术合作或资质认定类企业服务成果；提交后由项目经理审核
        </div>
      </div>
    </div>

    <div class="content-wrapper">
      <div class="section-card form-section">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">✏️</span>
            填写企业服务成果
          </h3>
        </div>

        <div class="form-body">
          <el-form
            ref="formRef"
            :model="formData"
            :rules="formRules"
            label-width="140px"
          >
            <div class="form-step">
              <h3>基本信息</h3>
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="成果类型" prop="achievement_type">
                    <el-select
                      v-model="formData.achievement_type"
                      placeholder="请选择成果类型"
                      style="width: 100%"
                      @change="handleTypeChange"
                    >
                      <el-option
                        v-for="t in achievementTypeOptions"
                        :key="t.value"
                        :label="t.label"
                        :value="t.value"
                      />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>
            </div>

            <!-- 技术合作 -->
            <template v-if="formData.achievement_type === 'tech_cooperation'">
              <div class="form-step">
                <h3>关联项目</h3>
                <div v-if="loadingProjects" class="loading-inline">加载项目中...</div>
                <div v-else-if="!projectList.length" class="empty-inline">
                  暂无可关联项目（需已入库或孵化中的项目）
                </div>
                <el-form-item v-else label="关联项目" prop="selectedProjectIds">
                  <el-select
                    v-model="formData.selectedProjectIds"
                    multiple
                    filterable
                    placeholder="请选择关联项目（可多选）"
                    style="width: 100%"
                    @change="syncProjects"
                  >
                    <el-option
                      v-for="p in projectList"
                      :key="p.id"
                      :label="`${p.title} [${p.project_code || p.id.substring(0, 8)}]`"
                      :value="p.id"
                    />
                  </el-select>
                </el-form-item>
                <div v-if="selectedProjects.length" class="project-leaders-box">
                  <div v-for="pr in selectedProjects" :key="pr.project_id" class="leader-row">
                    <span class="leader-project">{{ pr.project_title }}</span>
                    <span class="leader-label">项目负责人：</span>
                    <span class="leader-name">{{ pr.project_leader || '-' }}</span>
                  </div>
                </div>
              </div>

              <div class="form-step">
                <h3>技术合作信息</h3>
                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="服务企业" prop="service_enterprise">
                      <el-input v-model="formData.service_enterprise" placeholder="请输入服务企业名称" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="合同名称" prop="contract_name">
                      <el-input v-model="formData.contract_name" placeholder="请输入合同名称" />
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="开始日期" prop="start_date">
                      <el-date-picker
                        v-model="formData.start_date"
                        type="month"
                        placeholder="选择开始月份"
                        value-format="YYYY-MM-DD"
                        style="width: 100%"
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="完成日期" prop="completion_date">
                      <el-date-picker
                        v-model="formData.completion_date"
                        type="month"
                        placeholder="选择完成月份"
                        value-format="YYYY-MM-DD"
                        style="width: 100%"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="合同金额（元）" prop="contract_amount">
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
                <el-form-item label="合同内容" prop="contract_content">
                  <el-input
                    v-model="formData.contract_content"
                    type="textarea"
                    :rows="4"
                    placeholder="请描述合同主要内容"
                  />
                </el-form-item>

                <div class="toggle-fields-block">
                  <div class="toggle-field-row">
                    <span class="toggle-field-label">是否推动项目实现样品（机）化或小批量试制</span>
                    <div class="toggle-field-control">
                      <el-radio-group v-model="formData.is_sample_production">
                        <el-radio :value="true">是</el-radio>
                        <el-radio :value="false">否</el-radio>
                      </el-radio-group>
                    </div>
                  </div>
                  <div v-if="formData.is_sample_production" class="record-table-wrap">
                    <table class="record-table">
                      <thead>
                        <tr>
                          <th>样品（机）名称</th>
                          <th>样品（机）完成时间</th>
                          <th class="col-action">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(item, idx) in formData.sample_products" :key="'sample-' + idx">
                          <td>
                            <el-form-item
                              :prop="`sample_products.${idx}.name`"
                              :rules="[{ required: true, message: '请输入名称', trigger: 'blur' }]"
                              label-width="0"
                              class="table-cell-field"
                            >
                              <el-input v-model="item.name" placeholder="请输入样品（机）名称" />
                            </el-form-item>
                          </td>
                          <td>
                            <el-form-item
                              :prop="`sample_products.${idx}.completion_date`"
                              :rules="[{ required: true, message: '请选择时间', trigger: 'change' }]"
                              label-width="0"
                              class="table-cell-field"
                            >
                              <el-date-picker
                                v-model="item.completion_date"
                                type="month"
                                placeholder="选择月份"
                                value-format="YYYY-MM-DD"
                                style="width: 100%"
                              />
                            </el-form-item>
                          </td>
                          <td class="col-action">
                            <el-button
                              v-if="formData.sample_products.length > 1"
                              type="danger"
                              link
                              @click="removeSampleProduct(idx)"
                            >
                              删除
                            </el-button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <button type="button" class="record-table-add" @click="addSampleProduct">+ 添加记录</button>
                  </div>

                  <div class="toggle-field-row">
                    <span class="toggle-field-label">是否推动项目形成新产品</span>
                    <div class="toggle-field-control">
                      <el-radio-group v-model="formData.is_new_product" @change="onNewProductToggle">
                        <el-radio :value="true">是</el-radio>
                        <el-radio :value="false">否</el-radio>
                      </el-radio-group>
                    </div>
                  </div>
                  <div v-if="formData.is_new_product" class="record-table-wrap">
                    <table class="record-table">
                      <thead>
                        <tr>
                          <th>新产品名称</th>
                          <th>新产品实现产值/销售提升金额（万元）</th>
                          <th class="col-action">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(item, idx) in formData.new_products" :key="'new-' + idx">
                          <td>
                            <el-form-item
                              :prop="`new_products.${idx}.name`"
                              :rules="[{ required: true, message: '请输入名称', trigger: 'blur' }]"
                              label-width="0"
                              class="table-cell-field"
                            >
                              <el-input v-model="item.name" placeholder="请输入新产品名称" />
                            </el-form-item>
                          </td>
                          <td>
                            <el-form-item
                              :prop="`new_products.${idx}.output_value_amount`"
                              label-width="0"
                              class="table-cell-field"
                            >
                              <el-input-number
                                v-model="item.output_value_amount"
                                :min="0"
                                :precision="2"
                                :controls="false"
                                placeholder="金额（万元）"
                                style="width: 100%"
                              />
                            </el-form-item>
                          </td>
                          <td class="col-action">
                            <el-button type="danger" link @click="removeNewProduct(idx)">删除</el-button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <button type="button" class="record-table-add" @click="addNewProduct">+ 添加记录</button>
                  </div>
                </div>
              </div>
            </template>

            <!-- 资质认定 -->
            <template v-if="formData.achievement_type === 'qualification_certification'">
              <div class="form-step">
                <h3>资质认定信息</h3>
                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="获资质企业" prop="qualified_enterprise">
                      <el-input v-model="formData.qualified_enterprise" placeholder="请输入获资质企业名称" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="资质类型" prop="qualification_type">
                      <el-input v-model="formData.qualification_type" placeholder="如：高新技术企业认定" />
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="认定日期" prop="qualification_date">
                      <el-date-picker
                        v-model="formData.qualification_date"
                        type="month"
                        placeholder="选择认定月份"
                        value-format="YYYY-MM-DD"
                        style="width: 100%"
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="服务机构" prop="service_provider_id">
                      <el-select
                        v-model="formData.service_provider_id"
                        placeholder="请选择服务机构"
                        filterable
                        style="width: 100%"
                      >
                        <el-option
                          v-for="sp in serviceProviders"
                          :key="sp.id"
                          :label="sp.name"
                          :value="sp.id"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-form-item label="服务内容摘要" prop="service_content_brief">
                  <el-input
                    v-model="formData.service_content_brief"
                    type="textarea"
                    :rows="4"
                    placeholder="请简要描述服务内容"
                  />
                </el-form-item>
              </div>
            </template>

            <div v-if="formData.achievement_type" class="form-attachment-block">
              <label class="form-label">附件材料</label>
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
                <span class="upload-hint">支持 PDF、Word、图片等，单文件不超过 50MB，最多 10 个</span>
              </div>
              <div v-if="uploadedFiles.length > 0" class="file-list">
                <div v-for="(file, index) in uploadedFiles" :key="index" class="file-item">
                  <span class="file-icon">📄</span>
                  <span class="file-name">{{ file.name }}</span>
                  <button type="button" class="file-remove" @click="removeUploadedFile(index)">×</button>
                </div>
              </div>
            </div>

            <div v-if="formData.achievement_type" class="form-footer">
              <button type="button" class="btn secondary" @click="resetForm">重置</button>
              <button type="button" class="btn primary" :disabled="submitting" @click="handleSubmit">
                {{ submitting ? '提交中...' : '提交登记' }}
              </button>
            </div>
          </el-form>
        </div>
      </div>

      <EnterpriseServiceAchievementList ref="listRef" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import {
  enterpriseServiceAchievementAPI,
  ENTERPRISE_ACHIEVEMENT_TYPES,
  APPLICANT_ENTERPRISE_ACHIEVEMENT_TYPES,
} from '@/api/enterpriseServiceAchievements'
import EnterpriseServiceAchievementList from './EnterpriseServiceAchievementList.vue'

interface EligibleProject {
  id: string
  project_code?: string
  title: string
  project_leader?: string
}

interface ServiceProvider {
  id: string
  name: string
  category?: string
}

interface SampleProductItem {
  name: string
  completion_date: string
}

interface NewProductItem {
  name: string
  output_value_amount?: number | null
}

interface ProjectRelation {
  project_id: string
  project_leader: string
  project_title: string
}

const router = useRouter()
const formRef = ref<FormInstance>()
const listRef = ref<InstanceType<typeof EnterpriseServiceAchievementList> | null>(null)

const isProjectManager = computed(
  () => (localStorage.getItem('userRole') || '').toUpperCase() === 'PROJECT_MANAGER',
)
const achievementTypeOptions = computed(() =>
  isProjectManager.value ? ENTERPRISE_ACHIEVEMENT_TYPES : APPLICANT_ENTERPRISE_ACHIEVEMENT_TYPES,
)

const loadingProjects = ref(false)
const submitting = ref(false)
const projectList = ref<EligibleProject[]>([])
const serviceProviders = ref<ServiceProvider[]>([])
const uploadedFiles = ref<File[]>([])
const fileInputRef = ref<HTMLInputElement>()

const formData = reactive({
  achievement_type: '' as string,
  selectedProjectIds: [] as string[],
  service_enterprise: '',
  start_date: '',
  completion_date: '',
  contract_name: '',
  contract_amount: null as number | null,
  contract_content: '',
  is_sample_production: false,
  is_new_product: false,
  sample_products: [{ name: '', completion_date: '' }] as SampleProductItem[],
  new_products: [] as NewProductItem[],
  qualified_enterprise: '',
  qualification_type: '',
  qualification_date: '',
  service_provider_id: '',
  service_content_brief: '',
})

const selectedProjects = computed<ProjectRelation[]>(() =>
  formData.selectedProjectIds.map((id) => {
    const p = projectList.value.find((x) => x.id === id)
    return {
      project_id: id,
      project_leader: p?.project_leader || '',
      project_title: p?.title || id,
    }
  }),
)

const validateProjects = (_rule: unknown, _value: unknown, callback: (err?: Error) => void) => {
  if (formData.achievement_type === 'tech_cooperation' && !formData.selectedProjectIds.length) {
    callback(new Error('请至少选择一个关联项目'))
  } else {
    callback()
  }
}

const validateSampleProducts = (_rule: unknown, _value: unknown, callback: (err?: Error) => void) => {
  if (formData.achievement_type !== 'tech_cooperation' || !formData.is_sample_production) {
    callback()
    return
  }
  const valid = formData.sample_products.some((s) => s.name?.trim() && s.completion_date)
  if (!valid) callback(new Error('请至少填写一条试制产品信息'))
  else callback()
}

const formRules = computed<FormRules>(() => {
  const base: FormRules = {
    achievement_type: [{ required: true, message: '请选择成果类型', trigger: 'change' }],
  }
  if (formData.achievement_type === 'tech_cooperation') {
    Object.assign(base, {
      selectedProjectIds: [{ validator: validateProjects, trigger: 'change' }],
      service_enterprise: [{ required: true, message: '请输入服务企业', trigger: 'blur' }],
      contract_name: [{ required: true, message: '请输入合同名称', trigger: 'blur' }],
      start_date: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
      completion_date: [{ required: true, message: '请选择完成日期', trigger: 'change' }],
      contract_content: [{ required: true, message: '请填写合同内容', trigger: 'blur' }],
      sample_products: [{ validator: validateSampleProducts, trigger: 'change' }],
    })
  }
  if (formData.achievement_type === 'qualification_certification') {
    Object.assign(base, {
      qualified_enterprise: [{ required: true, message: '请输入获资质企业', trigger: 'blur' }],
      qualification_type: [{ required: true, message: '请输入资质类型', trigger: 'blur' }],
      qualification_date: [{ required: true, message: '请选择认定日期', trigger: 'change' }],
      service_provider_id: [{ required: true, message: '请选择服务机构', trigger: 'change' }],
      service_content_brief: [{ required: true, message: '请填写服务内容摘要', trigger: 'blur' }],
    })
  }
  return base
})

const syncProjects = () => {
  formRef.value?.validateField('selectedProjectIds')
}

const triggerFileUpload = () => {
  fileInputRef.value?.click()
}

const handleNativeFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    uploadedFiles.value.push(...Array.from(target.files))
    target.value = ''
  }
}

const removeUploadedFile = (index: number) => {
  uploadedFiles.value.splice(index, 1)
}

const onNewProductToggle = (val: boolean) => {
  if (val && !formData.new_products.length) {
    formData.new_products = [{ name: '', output_value_amount: null }]
  }
}

const handleTypeChange = () => {
  formData.selectedProjectIds = []
  formData.is_sample_production = false
  formData.is_new_product = false
  formData.sample_products = [{ name: '', completion_date: '' }]
  formData.new_products = []
  uploadedFiles.value = []
  if (formData.achievement_type === 'qualification_certification') {
    loadServiceProviders()
  }
  if (formData.achievement_type === 'tech_cooperation') {
    loadProjects()
  }
}

const addSampleProduct = () => {
  formData.sample_products.push({ name: '', completion_date: '' })
}

const removeSampleProduct = (idx: number) => {
  formData.sample_products.splice(idx, 1)
}

const addNewProduct = () => {
  formData.new_products.push({ name: '', output_value_amount: null })
}

const removeNewProduct = (idx: number) => {
  formData.new_products.splice(idx, 1)
}

const loadProjects = async () => {
  loadingProjects.value = true
  try {
    const res = await enterpriseServiceAchievementAPI.getEligibleProjects()
    projectList.value = res.success ? (res.data || []) : []
  } catch {
    projectList.value = []
    ElMessage.error('加载项目列表失败')
  } finally {
    loadingProjects.value = false
  }
}

const loadServiceProviders = async () => {
  try {
    const res = await enterpriseServiceAchievementAPI.getServiceProviders()
    serviceProviders.value = res.success ? (res.data || []) : []
  } catch {
    serviceProviders.value = []
    ElMessage.error('加载服务机构失败')
  }
}

const buildSubmitPayload = () => {
  const payload: Record<string, unknown> = {
    achievement_type: formData.achievement_type,
    status: 'submitted',
  }
  if (formData.achievement_type === 'tech_cooperation') {
    Object.assign(payload, {
      service_enterprise: formData.service_enterprise,
      start_date: formData.start_date,
      completion_date: formData.completion_date,
      contract_name: formData.contract_name,
      contract_amount: formData.contract_amount,
      contract_content: formData.contract_content,
      is_sample_production: formData.is_sample_production,
      is_new_product: formData.is_new_product,
      projects: selectedProjects.value.map((p) => ({
        project_id: p.project_id,
        project_leader: p.project_leader,
      })),
    })
    if (formData.is_sample_production) {
      payload.sample_products = formData.sample_products.filter(
        (s) => s.name?.trim() && s.completion_date,
      )
    }
    if (formData.is_new_product) {
      payload.new_products = formData.new_products.filter((s) => s.name?.trim())
    }
  } else {
    Object.assign(payload, {
      qualified_enterprise: formData.qualified_enterprise,
      qualification_type: formData.qualification_type,
      qualification_date: formData.qualification_date,
      service_provider_id: formData.service_provider_id,
      service_content_brief: formData.service_content_brief,
    })
  }
  return payload
}

const handleSubmit = async () => {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    ElMessage.warning('请完善必填项后再提交')
    return
  }

  if (formData.is_sample_production) {
    const valid = formData.sample_products.some((s) => s.name?.trim() && s.completion_date)
    if (!valid) {
      ElMessage.warning('请至少填写一条试制产品信息')
      return
    }
  }

  submitting.value = true
  try {
    const res = await enterpriseServiceAchievementAPI.create(buildSubmitPayload())
    const savedId = res.data?.id as string
    if (!savedId) throw new Error('创建失败')

    for (const file of uploadedFiles.value) {
      await enterpriseServiceAchievementAPI.uploadFile(savedId, file)
    }

    ElMessage.success(isProjectManager.value ? '企业服务成果已登记' : '企业服务成果已提交，等待项目经理审核')
    resetForm()
    listRef.value?.refresh()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '提交失败')
  } finally {
    submitting.value = false
  }
}

const resetForm = () => {
  formData.achievement_type = ''
  formData.service_enterprise = ''
  formData.start_date = ''
  formData.completion_date = ''
  formData.contract_name = ''
  formData.contract_amount = null
  formData.contract_content = ''
  formData.is_sample_production = false
  formData.is_new_product = false
  formData.sample_products = [{ name: '', completion_date: '' }]
  formData.new_products = []
  formData.qualified_enterprise = ''
  formData.qualification_type = ''
  formData.qualification_date = ''
  formData.service_provider_id = ''
  formData.service_content_brief = ''
  formData.selectedProjectIds = []
  uploadedFiles.value = []
  formRef.value?.resetFields()
}

const goBack = () => {
  router.push(isProjectManager.value ? '/assistant/dashboard' : '/applicant/dashboard')
}

onMounted(() => {
  if (!isProjectManager.value) {
    formData.achievement_type = 'tech_cooperation'
  }
  loadProjects()
  loadServiceProviders()
})
</script>

<style scoped>
@import '@/styles/form-upload-shared.css';
@import '@/styles/record-table-shared.css';

.achievement-register-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.page-header {
  background: white;
  padding: 20px 32px;
  border-bottom: 1px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.header-left {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  color: #666;
  cursor: pointer;
  width: fit-content;
  font-size: 14px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
  font-weight: 600;
}

.header-subtitle {
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

.section-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.section-card.form-section {
  border: 2px solid #b31b1b;
}

.section-header {
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
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
  border-bottom: 2px solid rgba(179, 27, 27, 0.12);
  font-size: 16px;
  font-weight: 600;
}

.dynamic-row {
  margin-bottom: 8px;
}

.inline-fields {
  margin-left: 140px;
  padding: 8px 12px;
  background: rgba(179, 27, 27, 0.04);
  border-radius: 8px;
  border: 1px solid rgba(179, 27, 27, 0.12);
}

.full-row-field :deep(.el-form-item__label) {
  line-height: 1.4;
  white-space: normal;
  height: auto;
}

.project-leaders-box {
  margin-top: 12px;
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.leader-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
}

.leader-project {
  font-weight: 500;
  color: #333;
  flex: 1;
}

.leader-label {
  color: #999;
}

.leader-name {
  color: #b31b1b;
}

.loading-inline,
.empty-inline {
  padding: 16px;
  color: #999;
  font-size: 14px;
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
  background: #b31b1b;
  color: white;
}

.btn.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.achievement-register-page :deep(.table-cell-field) {
  margin-bottom: 0;
}

.achievement-register-page :deep(.table-cell-field .el-form-item__content) {
  margin-left: 0 !important;
}

.achievement-register-page :deep(.el-form-item.table-cell-field) {
  margin-bottom: 0;
}

.achievement-register-page :deep(.el-button--primary) {
  --el-button-bg-color: #b31b1b;
  --el-button-border-color: #b31b1b;
  --el-button-hover-bg-color: #8b1515;
  --el-button-hover-border-color: #8b1515;
}
</style>
