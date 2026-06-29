<!-- 申请人 - 经费申请（预算明细与创建项目一致） -->
<template>
  <div class="funds-request-apply-page">
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回工作台</span>
        </button>
        <h1>{{ isFundsManagerMode ? '经费申请登记' : '经费申请' }}</h1>
        <div class="header-subtitle">
          {{
            isFundsManagerMode
              ? '为在研项目直接登记经费（免审核），记录与成果反馈将同步至项目申请人'
              : '为已立项或孵化中的项目提交经费申请，提交后由经费管理员审核'
          }}
        </div>
      </div>
    </div>

    <div class="content-wrapper">
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">📋</span>
            {{ isFundsManagerMode ? '可登记经费的在研项目' : '可申请经费的项目' }}
          </h3>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <div v-else-if="eligibleProjects.length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <p>暂无可申请经费的项目</p>
          <p class="empty-subtext">仅「已立项」「孵化中」状态的项目可提交经费申请</p>
        </div>

        <div v-else class="projects-list">
          <div
            v-for="project in eligibleProjects"
            :key="project.id"
            class="project-item"
            :class="{ selected: selectedProject?.id === project.id }"
            @click="selectProject(project)"
          >
            <div class="project-header">
              <span class="project-code">{{ project.project_code || `PRJ-${project.id.substring(0, 8)}` }}</span>
              <span class="project-status" :class="getStatusClass(project.status)">
                {{ getStatusText(project.status) }}
              </span>
            </div>
            <h4 class="project-title">{{ project.title }}</h4>
            <div class="project-meta">
              <span v-if="isFundsManagerMode && project.applicant_name" class="meta-item">
                <span class="meta-icon">👤</span>
                申请人: {{ project.applicant_name }}
              </span>
              <span class="meta-item">
                <span class="meta-icon">📅</span>
                批准日期: {{ formatDate(project.approval_date) }}
              </span>
              <span class="meta-item">
                <span class="meta-icon">💰</span>
                经费记录: {{ project.funds_request_count || 0 }} 次
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="selectedProject" class="section-card form-section">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">✏️</span>
            {{ isFundsManagerMode ? '登记经费' : '填写经费申请' }}
          </h3>
          <span class="selected-project-tag">{{ selectedProject.title }}</span>
        </div>

        <form class="request-form" @submit.prevent="submitRequest">
          <div class="form-group">
            <label class="form-label required">经费使用说明</label>
            <textarea
              v-model="serviceRequirement"
              class="form-textarea"
              placeholder="请说明本次经费的整体用途、必要性等..."
              rows="5"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label required">经费预算明细</label>
            <BudgetItemsEditor v-model="budgetItems" />
          </div>

          <div class="form-group">
            <label class="form-label">附件材料（可选）</label>
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
              <span class="upload-hint">支持 PDF、Word、Excel、图片，单个不超过 10MB</span>
            </div>
            <div v-if="uploadedFiles.length > 0" class="file-list">
              <div v-for="(file, index) in uploadedFiles" :key="index" class="file-item">
                <span class="file-icon">📄</span>
                <span class="file-name">{{ file.name }}</span>
                <button type="button" class="file-remove" @click="removeFile(index)">×</button>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="cancelForm">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ submitting ? '提交中...' : isFundsManagerMode ? '确认登记' : '提交申请' }}
            </button>
          </div>
        </form>
      </div>

      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">📜</span>
            {{ isFundsManagerMode ? '经费登记与成果记录' : '我的经费申请记录' }}
          </h3>
          <div class="filter-tabs">
            <button
              v-for="tab in statusTabs"
              :key="tab.value"
              class="tab-btn"
              :class="{ active: currentTab === tab.value }"
              @click="switchTab(tab.value)"
            >
              {{ tab.label }}
              <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
            </button>
          </div>
        </div>

        <div v-if="loadingRequests" class="loading-state">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <div v-else-if="filteredRequests.length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <p>暂无经费申请记录</p>
        </div>

        <div v-else class="requests-grid">
          <div v-for="request in filteredRequests" :key="request.id" class="request-card">
            <div class="card-header" @click="goToDetail(request.id)">
              <span class="type-badge" :class="submissionBadgeClass(request)">
                {{ submissionTypeLabel(request) }}
              </span>
              <span class="card-project-title">{{ request.project_title }}</span>
              <span class="card-status" :class="getRequestStatusClass(request.status)">
                {{ getRequestStatusText(request.status) }}
              </span>
            </div>
            <div class="card-body" @click="goToDetail(request.id)">
              <div class="card-info">
                <span class="info-label">项目编号</span>
                <span class="info-value">{{ request.project_code || '-' }}</span>
              </div>
              <div class="card-info">
                <span class="info-label">申请金额</span>
                <span class="info-value">¥ {{ formatAmount(request.total_amount) }}</span>
              </div>
              <div class="card-info">
                <span class="info-label">申请时间</span>
                <span class="info-value">{{ formatDateTime(request.application_date || request.created_at) }}</span>
              </div>
              <div v-if="request.feedback_action" class="card-info">
                <span class="info-label">审核结果</span>
                <span
                  class="info-value"
                  :class="feedbackActionClass(request.feedback_action)"
                >
                  {{ feedbackActionLabel(request.feedback_action) }}
                </span>
              </div>
            </div>
            <div class="card-footer">
              <button class="btn-view-detail" @click.stop="goToDetail(request.id)">查看详情</button>
              <button
                v-if="canSubmitResult(request)"
                class="btn-result-feedback"
                @click.stop="openResultForm(request.id)"
              >
                {{ isFundsManagerMode ? '登记成果反馈' : '提交成果反馈' }}
              </button>
            </div>

            <div v-if="activeResultFormId === request.id" class="inline-result-form" @click.stop>
              <h5 class="inline-result-title">成果反馈</h5>
              <textarea
                v-model="resultDescription"
                class="form-textarea"
                rows="4"
                placeholder="请填写经费使用成果描述..."
              />
              <div class="result-upload-area">
                <input
                  ref="resultFileInput"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  class="hidden-file-input"
                  @change="handleResultFileChange"
                />
                <button type="button" class="btn-upload-link" @click="triggerResultUpload">
                  📎 添加附件（可选）
                </button>
                <div v-if="resultUploadedFiles.length > 0" class="result-file-list">
                  <div
                    v-for="(file, index) in resultUploadedFiles"
                    :key="index"
                    class="result-file-item"
                  >
                    <span>{{ file.name }}</span>
                    <button type="button" class="file-remove" @click="removeResultFile(index)">×</button>
                  </div>
                </div>
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" @click="closeResultForm">取消</button>
                <button
                  type="button"
                  class="btn btn-primary"
                  :disabled="submittingResult"
                  @click="submitResultFeedback(request.id)"
                >
                  {{ submittingResult ? '提交中...' : '提交' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getApiBaseUrl } from '@/utils/request'
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import axios from 'axios'
import BudgetItemsEditor from '@/components/BudgetItemsEditor.vue'
import { type BudgetRow } from '@/constants/budgetCategories'

const router = useRouter()
const route = useRoute()

const isFundsManagerMode = computed(
  () =>
    route.meta.fundsManagerMode === true || route.path.startsWith('/funds-manager/funds-request'),
)

const API_BASE_URL = getApiBaseUrl()
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

const loading = ref(false)
const loadingRequests = ref(false)
const submitting = ref(false)
const eligibleProjects = ref<any[]>([])
const myRequests = ref<any[]>([])
const selectedProject = ref<any>(null)
const serviceRequirement = ref('')
const budgetItems = ref<BudgetRow[]>([])
const uploadedFiles = ref<File[]>([])
const fileInput = ref<HTMLInputElement>()
const currentTab = ref('all')
const activeResultFormId = ref<string | null>(null)
const resultDescription = ref('')
const resultUploadedFiles = ref<File[]>([])
const resultFileInput = ref<HTMLInputElement>()
const submittingResult = ref(false)

const statusTabs = computed(() => {
  const tabs = [
    { value: 'all', label: '全部', count: myRequests.value.length },
    {
      value: 'feedback_given',
      label: '已批准',
      count: myRequests.value.filter((r) => r.status === 'feedback_given').length,
    },
    {
      value: 'result_submitted',
      label: '已完成',
      count: myRequests.value.filter((r) => r.status === 'result_submitted').length,
    },
  ]
  if (!isFundsManagerMode.value) {
    tabs.splice(1, 0, {
      value: 'pending',
      label: '待审核',
      count: myRequests.value.filter((r) => r.status === 'pending').length,
    })
  }
  return tabs
})

const filteredRequests = computed(() => {
  if (currentTab.value === 'all') return myRequests.value
  return myRequests.value.filter((r) => r.status === currentTab.value)
})

function normalizedBudgetItems() {
  return budgetItems.value
    .filter((r) => r.category && String(r.item_name || '').trim())
    .map((r) => ({
      category: r.category,
      item_name: r.item_name.trim(),
      description: r.description || '',
      amount: parseFloat((Number(r.amount) || 0).toFixed(2)),
    }))
}

const loadEligibleProjects = async () => {
  loading.value = true
  try {
    const url = isFundsManagerMode.value
      ? '/funds-manager/funds-request/eligible-projects'
      : '/applicant/funds-requests/eligible-projects'
    const res = await api.get(url)
    if (res.data.success) {
      eligibleProjects.value = res.data.data || []
    }
  } catch {
    ElMessage.error('加载项目列表失败')
  } finally {
    loading.value = false
  }
}

const loadMyRequests = async () => {
  loadingRequests.value = true
  try {
    const url = isFundsManagerMode.value ? '/funds-manager/requests' : '/applicant/funds-requests'
    const res = await api.get(url, isFundsManagerMode.value ? { params: { limit: 200 } } : undefined)
    if (res.data.success) {
      myRequests.value = isFundsManagerMode.value
        ? res.data.data?.requests || []
        : res.data.data || []
    }
  } catch {
    ElMessage.error('加载经费申请记录失败')
  } finally {
    loadingRequests.value = false
  }
}

const selectProject = (project: any) => {
  selectedProject.value = project
  serviceRequirement.value = ''
  budgetItems.value = [{ category: '', item_name: '', description: '', amount: 0 }]
  uploadedFiles.value = []
}

const triggerUpload = () => fileInput.value?.click()

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    uploadedFiles.value.push(...Array.from(target.files))
  }
}

const removeFile = (index: number) => {
  uploadedFiles.value.splice(index, 1)
}

const submitRequest = async () => {
  if (!selectedProject.value) {
    ElMessage.warning('请选择项目')
    return
  }
  if (!serviceRequirement.value.trim()) {
    ElMessage.warning('请填写经费使用说明')
    return
  }
  const items = normalizedBudgetItems()
  if (items.length === 0) {
    ElMessage.warning('请至少添加一条有效的经费预算明细（科目、项目名称、金额）')
    return
  }

  submitting.value = true
  try {
    const postUrl = isFundsManagerMode.value
      ? '/funds-manager/funds-requests'
      : '/applicant/funds-requests'
    const uploadUrl = isFundsManagerMode.value
      ? '/funds-manager/funds-requests/upload'
      : '/applicant/funds-requests/upload'

    const res = await api.post(postUrl, {
      project_id: selectedProject.value.id,
      service_requirement: serviceRequirement.value.trim(),
      items,
    })

    if (res.data.success) {
      const requestId = res.data.data?.id
      if (requestId && uploadedFiles.value.length > 0) {
        for (const file of uploadedFiles.value) {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('funds_request_id', requestId)
          formData.append('attachment_type', 'application')
          try {
            await api.post(uploadUrl, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            })
          } catch {
            ElMessage.warning(`附件「${file.name}」上传失败，记录已保存`)
          }
        }
      }
      ElMessage.success(
        isFundsManagerMode.value
          ? '经费已登记并同步至项目申请人'
          : '经费申请已提交，请等待经费管理员审核',
      )
      cancelForm()
      loadEligibleProjects()
      loadMyRequests()
    } else {
      ElMessage.error(res.data.error || '提交失败')
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '提交经费申请失败')
  } finally {
    submitting.value = false
  }
}

const cancelForm = () => {
  selectedProject.value = null
  serviceRequirement.value = ''
  budgetItems.value = []
  uploadedFiles.value = []
}

const switchTab = (tab: string) => {
  currentTab.value = tab
}

const goToDetail = (id: string) => {
  if (isFundsManagerMode.value) {
    router.push(`/funds-manager/requests/${id}`)
  } else {
    router.push(`/funds-request/${id}`)
  }
}

const goToResultFeedback = (id: string) => {
  router.push(`/funds-request/${id}`)
}

const openResultForm = (id: string) => {
  activeResultFormId.value = id
  resultDescription.value = ''
  resultUploadedFiles.value = []
}

const closeResultForm = () => {
  activeResultFormId.value = null
  resultDescription.value = ''
  resultUploadedFiles.value = []
}

const triggerResultUpload = () => resultFileInput.value?.click()

const handleResultFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    resultUploadedFiles.value.push(...Array.from(target.files))
  }
  target.value = ''
}

const removeResultFile = (index: number) => {
  resultUploadedFiles.value.splice(index, 1)
}

const uploadResultAttachments = async (requestId: string) => {
  if (resultUploadedFiles.value.length === 0) return
  const uploadUrl = isFundsManagerMode.value
    ? '/funds-manager/funds-requests/upload'
    : '/applicant/funds-requests/upload'
  for (const file of resultUploadedFiles.value) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('funds_request_id', requestId)
    formData.append('attachment_type', 'result')
    try {
      await api.post(uploadUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    } catch {
      ElMessage.warning(`附件「${file.name}」上传失败，成果描述已保存`)
    }
  }
}

const submitResultFeedback = async (requestId: string) => {
  if (!resultDescription.value.trim()) {
    ElMessage.warning('请填写成果描述')
    return
  }
  submittingResult.value = true
  try {
    const url = isFundsManagerMode.value
      ? `/funds-manager/requests/${requestId}/result`
      : `/applicant/funds-requests/${requestId}/result`
    const method = isFundsManagerMode.value ? 'post' : 'put'
    const res = await api[method](url, { result_description: resultDescription.value.trim() })
    if (res.data.success) {
      await uploadResultAttachments(requestId)
      ElMessage.success('成果反馈已提交，已同步至项目申请人')
      closeResultForm()
      loadMyRequests()
    } else {
      ElMessage.error(res.data.error || '提交失败')
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '提交成果反馈失败')
  } finally {
    submittingResult.value = false
  }
}

const submissionTypeLabel = (request: any) => {
  if (request.submission_type === 'manager_direct') return '管理员登记'
  if (isFundsManagerMode.value && request.status === 'pending') return '待审核'
  return '申请人申请'
}

const submissionBadgeClass = (request: any) => {
  if (request.submission_type === 'manager_direct') return 'badge-manager'
  if (request.status === 'pending') return 'badge-pending'
  return 'badge-applicant'
}

const goBack = () => {
  router.push(isFundsManagerMode.value ? '/funds-manager/dashboard' : '/applicant/dashboard')
}

const canSubmitResult = (request: any) =>
  request.status === 'feedback_given' &&
  ['approved', 'partial_approved'].includes(request.feedback_action)

const formatAmount = (v: number | string | null | undefined) => {
  const n = Number(v) || 0
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const getStatusClass = (status: string) =>
  ({ approved: 'approved', incubating: 'incubating' })[status] || ''

const getStatusText = (status: string) =>
  ({ approved: '已立项', incubating: '孵化中', completed: '已完成' })[status] || status

const getRequestStatusClass = (status: string) =>
  ({ pending: 'pending', feedback_given: 'feedback', result_submitted: 'completed' })[status] || ''

const getRequestStatusText = (status: string) =>
  ({
    pending: '待审核',
    feedback_given: '已反馈',
    result_submitted: '已完成',
  })[status] || status

const feedbackActionLabel = (a: string) =>
  ({
    approved: '全部批准',
    partial_approved: '部分批准',
    rejected: '全部拒绝',
  })[a] || a

const feedbackActionClass = (a: string) =>
  a === 'rejected' ? 'danger' : 'success'

const formatDate = (dateString?: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const formatDateTime = (dateString?: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

onMounted(() => {
  loadEligibleProjects()
  loadMyRequests()
})
</script>

<style scoped>
.funds-request-apply-page {
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
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  color: #666;
  cursor: pointer;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
  font-weight: 600;
}

.header-subtitle {
  width: 100%;
  margin: 4px 0 0;
  font-size: 14px;
  color: #7f8c8d;
}

.content-wrapper {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
}

.section-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
}

.selected-project-tag {
  font-size: 13px;
  color: #b31b1b;
  background: #fff5f5;
  padding: 4px 12px;
  border-radius: 20px;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 48px 20px;
  color: #999;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top-color: #b31b1b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-subtext {
  font-size: 13px;
  color: #bbb;
}

.projects-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.project-item {
  border: 2px solid #e8e8e8;
  border-radius: 10px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.project-item:hover {
  border-color: #ffd591;
}

.project-item.selected {
  border-color: #faad14;
  background: #fffbe6;
}

.project-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.project-code {
  font-size: 12px;
  color: #999;
}

.project-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
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
  margin: 0 0 12px;
  font-size: 16px;
  color: #2c3e50;
}

.project-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: #666;
}

.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #2c3e50;
}

.form-label.required::after {
  content: ' *';
  color: #b31b1b;
}

.form-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  box-sizing: border-box;
}

.upload-area {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.upload-btn {
  padding: 8px 16px;
  border: 1px dashed #b31b1b;
  background: #fffbfb;
  color: #b31b1b;
  border-radius: 6px;
  cursor: pointer;
}

.upload-hint {
  font-size: 12px;
  color: #999;
}

.file-list {
  margin-top: 12px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f9f9f9;
  border-radius: 6px;
  margin-bottom: 6px;
}

.file-remove {
  margin-left: auto;
  border: none;
  background: none;
  color: #999;
  cursor: pointer;
  font-size: 18px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: #b31b1b;
  color: white;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 6px 14px;
  border: 1px solid #e8e8e8;
  border-radius: 20px;
  background: white;
  cursor: pointer;
  font-size: 13px;
}

.tab-btn.active {
  background: #b31b1b;
  color: white;
  border-color: #b31b1b;
}

.tab-count {
  margin-left: 4px;
  opacity: 0.85;
}

.requests-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.request-card {
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  overflow: hidden;
  border-left: 3px solid #faad14;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  background: #fafafa;
  cursor: pointer;
  flex-wrap: wrap;
}

.type-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}

.type-badge.badge-manager {
  background: #fff7e6;
  color: #d48806;
  border: 1px solid #ffd591;
}

.type-badge.badge-applicant {
  background: #e8f4ff;
  color: #1890ff;
  border: 1px solid #91d5ff;
}

.type-badge.badge-pending {
  background: #fff7e6;
  color: #fa8c16;
  border: 1px solid #ffd591;
}

.inline-result-form {
  padding: 16px;
  border-top: 1px dashed #e8e8e8;
  background: #fafafa;
}

.inline-result-title {
  margin: 0 0 10px;
  font-size: 14px;
  color: #2c3e50;
}

.hidden-file-input {
  display: none;
}

.result-upload-area {
  margin: 10px 0 12px;
}

.btn-upload-link {
  background: none;
  border: none;
  color: #b31b1b;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
}

.result-file-list {
  margin-top: 8px;
}

.result-file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: white;
  border: 1px solid #eee;
  border-radius: 4px;
  font-size: 13px;
  margin-bottom: 6px;
}

.result-file-item .file-remove {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 16px;
}

.result-file-item .file-remove:hover {
  color: #ff4d4f;
}

.card-project-title {
  flex: 1;
  font-weight: 600;
  color: #2c3e50;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
}

.card-status.pending {
  background: #fff7e6;
  color: #fa8c16;
}

.card-status.feedback {
  background: #e6f7ff;
  color: #1890ff;
}

.card-status.completed {
  background: #f6ffed;
  color: #52c41a;
}

.card-body {
  padding: 14px 16px;
  cursor: pointer;
}

.card-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}

.info-label {
  color: #999;
}

.info-value.success {
  color: #52c41a;
}

.info-value.danger {
  color: #f5222d;
}

.card-footer {
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  gap: 8px;
}

.btn-view-detail,
.btn-result-feedback {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid #e8e8e8;
  background: white;
}

.btn-result-feedback {
  background: #b31b1b;
  color: white;
  border-color: #b31b1b;
}
</style>
