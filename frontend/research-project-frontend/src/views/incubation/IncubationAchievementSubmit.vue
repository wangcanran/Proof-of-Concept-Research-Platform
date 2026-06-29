<!-- 活动登记（快速操作入口） -->
<template>
  <div class="achievement-submit-page">
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回工作台</span>
        </button>
        <h1>活动登记</h1>
        <div class="header-subtitle">登记路演、产业交流等推广对接类活动，提交后由项目经理审批</div>
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

        <div v-else-if="eligibleProjects.length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <p>暂无可登记活动的项目</p>
          <p class="empty-subtext">仅「已入库」「孵化中」状态的项目可登记活动</p>
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
              <span class="meta-item">
                <span class="meta-icon">📅</span>
                批准日期: {{ formatDate(project.approval_date) }}
              </span>
              <span class="meta-item">
                <span class="meta-icon">📦</span>
                已登记活动: {{ project.achievement_count || 0 }} 条
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="selectedProject" class="section-card form-section">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">✏️</span>
            填写活动信息
          </h3>
          <span class="selected-project-tag">{{ selectedProject.title }}</span>
        </div>

        <form class="submit-form" @submit.prevent="submitAchievement">
          <div class="form-group">
            <label class="form-label required">活动标题</label>
            <input
              v-model="form.title"
              type="text"
              class="form-input"
              maxlength="200"
              placeholder="请输入活动标题"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label required">活动日期</label>
            <input v-model="form.recordDate" type="date" class="form-input" required />
          </div>

          <div class="form-group">
            <label class="form-label required">活动说明</label>
            <textarea
              v-model="form.description"
              class="form-textarea"
              rows="5"
              placeholder="描述项目参加路演、项目报告、产业交流等活动的情况"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">附件</label>
            <div class="upload-area">
              <input
                ref="fileInputRef"
                type="file"
                multiple
                class="hidden-input"
                @change="onFileChange"
              />
              <button type="button" class="upload-btn" @click="triggerFileSelect">
                <span class="upload-icon">📎</span>
                选择文件
              </button>
              <span class="upload-hint">提交活动照片、路演 PPT、项目报告、宣传材料等，单个不超过 50MB</span>
            </div>
            <div v-if="pendingFiles.length" class="file-list">
              <div v-for="(file, index) in pendingFiles" :key="index" class="file-item">
                <span class="file-icon">📄</span>
                <span class="file-name">{{ file.name }}</span>
                <span class="file-size">{{ formatFileSize(file.size) }}</span>
                <button type="button" class="remove-file-btn" @click="removePendingFile(index)">移除</button>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn secondary" @click="cancelForm">取消</button>
            <button type="submit" class="btn primary" :disabled="submitting">
              {{ submitting ? '提交中...' : '提交审批' }}
            </button>
          </div>
        </form>
      </div>

      <!-- 活动登记记录 -->
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">📜</span>
            活动登记记录
          </h3>
          <div class="header-right">
            <div class="search-box">
              <input
                v-model="searchQuery"
                type="text"
                class="search-input"
                placeholder="搜索项目名称、活动标题"
                @keyup.enter="applySearch"
              />
              <button type="button" class="search-btn" @click="applySearch">搜索</button>
            </div>
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
        </div>
        <div v-if="recordsLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>
        <div v-else-if="filteredRecords.length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <p>暂无活动登记记录</p>
        </div>
        <div v-else class="requests-grid">
          <div v-for="rec in filteredRecords" :key="rec.id" class="request-card">
            <div class="card-header" @click="goToDetail(rec.id)">
              <span class="card-project-title">{{ rec.title }}</span>
              <span class="card-status" :class="getRecordStatusClass(rec.status)">
                {{ statusLabel(rec.status) }}
              </span>
            </div>
            <div class="card-body" @click="goToDetail(rec.id)">
              <div class="card-info">
                <span class="info-label">所属项目</span>
                <span class="info-value">{{ rec.project_title || '-' }}</span>
              </div>
              <div class="card-info">
                <span class="info-label">项目编号</span>
                <span class="info-value">{{ rec.project_code || '-' }}</span>
              </div>
              <div class="card-info">
                <span class="info-label">登记时间</span>
                <span class="info-value">{{ formatDateTime(rec.created_at) }}</span>
              </div>
            </div>
            <div class="card-footer">
              <button class="btn-view-detail" @click.stop="goToDetail(rec.id)">查看详情</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import request from '@/utils/request'

const router = useRouter()
const isProjectManager = computed(
  () => (localStorage.getItem('userRole') || '').toUpperCase() === 'PROJECT_MANAGER',
)

type EligibleProject = {
  id: string
  project_code?: string
  title: string
  status: string
  approval_date?: string
  achievement_count?: number
}

const loading = ref(false)
const submitting = ref(false)
const eligibleProjects = ref<EligibleProject[]>([])
const selectedProject = ref<EligibleProject | null>(null)
const pendingFiles = ref<File[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)
const myRecords = ref<any[]>([])
const recordsLoading = ref(false)
const currentTab = ref('all')
const searchQuery = ref('')
const appliedSearch = ref('')

const STATUS_LABELS: Record<string, string> = {
  submitted: '待审批',
  approved: '已确认',
  rejected: '已驳回',
}

const statusTabs = computed(() => [
  { value: 'all', label: '全部', count: myRecords.value.length },
  {
    value: 'submitted',
    label: '待审批',
    count: myRecords.value.filter((r) => r.status === 'submitted').length,
  },
  {
    value: 'approved',
    label: '已确认',
    count: myRecords.value.filter((r) => r.status === 'approved').length,
  },
  {
    value: 'rejected',
    label: '已驳回',
    count: myRecords.value.filter((r) => r.status === 'rejected').length,
  },
])

const filteredRecords = computed(() => {
  let list = myRecords.value
  if (currentTab.value !== 'all') {
    list = list.filter((r) => r.status === currentTab.value)
  }
  if (appliedSearch.value.trim()) {
    const kw = appliedSearch.value.trim().toLowerCase()
    list = list.filter(
      (r) =>
        (r.title || '').toLowerCase().includes(kw) ||
        (r.project_title || '').toLowerCase().includes(kw),
    )
  }
  return list
})

function switchTab(tab: string) {
  currentTab.value = tab
}

function applySearch() {
  appliedSearch.value = searchQuery.value
}

function getRecordStatusClass(status: string) {
  const map: Record<string, string> = {
    submitted: 'pending',
    approved: 'approved',
    rejected: 'rejected',
  }
  return map[status] || ''
}

function goToDetail(id: string) {
  router.push(`/incubation/activity-record/${id}`)
}

function statusLabel(s: string) {
  return STATUS_LABELS[s] || s
}

async function loadMyRecords() {
  recordsLoading.value = true
  try {
    const res = await request.get('/api/activity-records/my')
    if (res.success) myRecords.value = res.data || []
  } catch {
    myRecords.value = []
  } finally {
    recordsLoading.value = false
  }
}

const form = ref({
  title: '',
  recordDate: '',
  description: '',
})

async function loadEligibleProjects() {
  loading.value = true
  try {
    const res = await request.get('/api/incubation/achievement-eligible-projects')
    if (res.success) {
      eligibleProjects.value = res.data || []
    }
  } catch (e) {
    console.error('加载项目列表失败', e)
    ElMessage.error('加载项目列表失败')
  } finally {
    loading.value = false
  }
}

function selectProject(project: EligibleProject) {
  selectedProject.value = project
  form.value = { title: '', recordDate: '', description: '' }
  pendingFiles.value = []
}

function cancelForm() {
  selectedProject.value = null
  form.value = { title: '', recordDate: '', description: '' }
  pendingFiles.value = []
}

function triggerFileSelect() {
  fileInputRef.value?.click()
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) {
    pendingFiles.value.push(...Array.from(input.files))
    input.value = ''
  }
}

function removePendingFile(index: number) {
  pendingFiles.value.splice(index, 1)
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('zh-CN')
}

function formatDateTime(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleString('zh-CN')
}

function getStatusClass(status: string) {
  const map: Record<string, string> = {
    approved: 'approved',
    incubating: 'incubating',
  }
  return map[status] || ''
}

function getStatusText(status: string) {
  const map: Record<string, string> = {
    approved: '已入库',
    incubating: '孵化中',
  }
  return map[status] || status
}

async function uploadFiles(recordId: string) {
  for (const file of pendingFiles.value) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('record_id', recordId)
    await request.post('/api/incubation-achievements/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }
}

async function submitAchievement() {
  if (!selectedProject.value) {
    ElMessage.warning('请先选择项目')
    return
  }
  const title = form.value.title.trim()
  if (!title) {
    ElMessage.warning('请填写活动标题')
    return
  }
  if (!form.value.recordDate) {
    ElMessage.warning('请选择活动日期')
    return
  }
  if (!form.value.description.trim()) {
    ElMessage.warning('请填写活动说明')
    return
  }

  submitting.value = true
  try {
    const res = await request.post(
      `/api/projects/${selectedProject.value.id}/incubation-achievements`,
      {
        title,
        description: form.value.description.trim(),
        record_date: form.value.recordDate,
      },
    )
    if (!res.success) {
      ElMessage.error(res.error || '提交失败')
      return
    }
    const recordId = res.data?.id
    if (recordId && pendingFiles.value.length) {
      try {
        await uploadFiles(recordId)
      } catch (uploadErr: any) {
        ElMessage.warning(
          uploadErr.response?.data?.error || '活动已保存，但部分附件上传失败',
        )
      }
    }
    ElMessage.success(isProjectManager.value ? '活动已登记' : '活动已提交，等待项目经理审批')
    cancelForm()
    await loadEligibleProjects()
    await loadMyRecords()
  } catch (e: any) {
    ElMessage.error(e.response?.data?.error || '提交失败')
  } finally {
    submitting.value = false
  }
}

function goBack() {
  router.push(isProjectManager.value ? '/assistant/dashboard' : '/applicant/dashboard')
}

onMounted(() => {
  loadEligibleProjects()
  loadMyRecords()
})
</script>

<style scoped>
.achievement-submit-page {
  min-height: 100vh;
  background: #f5f7fa;
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
}

.selected-project-tag {
  font-size: 13px;
  color: #b31b1b;
  background: rgba(179, 27, 27, 0.06);
  padding: 4px 10px;
  border-radius: 4px;
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loading-state,
.empty-state {
  padding: 48px 24px;
  text-align: center;
  color: #999;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  margin: 0 auto 12px;
  border: 3px solid #f0f0f0;
  border-top-color: #b31b1b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-subtext {
  font-size: 13px;
  color: #bbb;
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
}

.project-item:hover,
.project-item.selected {
  border-color: #b31b1b;
  box-shadow: 0 4px 12px rgba(179, 27, 27, 0.1);
}

.project-item.selected {
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
  border-radius: 4px;
}

.project-status.approved {
  color: #389e0d;
  background: #f6ffed;
}

.project-status.incubating {
  color: #096dd9;
  background: #e6f7ff;
}

.project-title {
  margin: 0 0 12px;
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

.project-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: #999;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.form-section {
  border: 2px solid #b31b1b;
}

.submit-form {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.form-label.required::after {
  content: '*';
  color: #ff4d4f;
  margin-left: 4px;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-textarea {
  resize: vertical;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #b31b1b;
}

.upload-area {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.hidden-input {
  display: none;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f5f5f5;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
}

.upload-btn:hover {
  border-color: #b31b1b;
  color: #b31b1b;
}

.upload-hint {
  font-size: 12px;
  color: #999;
}

.file-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 4px;
}

.file-name {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 12px;
  color: #999;
}

.remove-file-btn {
  padding: 2px 8px;
  border: none;
  background: transparent;
  color: #ff4d4f;
  cursor: pointer;
  font-size: 12px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 8px;
}

.header-right {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}

.search-box {
  display: flex;
  gap: 8px;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  font-size: 13px;
  width: 180px;
}

.search-input:focus {
  outline: none;
  border-color: #b31b1b;
}

.search-btn {
  padding: 8px 16px;
  background: #b31b1b;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 6px 16px;
  border: 1px solid #e8e8e8;
  border-radius: 16px;
  background: white;
  color: #666;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-btn.active {
  background: #b31b1b;
  border-color: #b31b1b;
  color: white;
}

.tab-count {
  background: rgba(255, 255, 255, 0.3);
  padding: 0 6px;
  border-radius: 10px;
  font-size: 12px;
}

.tab-btn:not(.active) .tab-count {
  background: #f0f0f0;
  color: #666;
}

.requests-grid {
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.request-card {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s;
  cursor: pointer;
}

.request-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.card-header {
  padding: 16px;
  background: #fafafa;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.card-project-title {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  line-height: 1.4;
  flex: 1;
}

.card-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
}

.card-status.pending {
  background: #fff7e6;
  color: #fa8c16;
}

.card-status.approved {
  background: #f6ffed;
  color: #52c41a;
}

.card-status.rejected {
  background: #fff1f0;
  color: #ff4d4f;
}

.card-body {
  padding: 16px;
}

.card-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.card-info .info-label {
  font-size: 13px;
  color: #999;
}

.card-info .info-value {
  font-size: 13px;
  color: #333;
  text-align: right;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-footer {
  padding: 16px;
}

.btn-view-detail {
  width: 100%;
  padding: 10px 24px;
  background: #f0f9f0;
  border: none;
  border-radius: 6px;
  color: #2e8b57;
  font-size: 14px;
  cursor: pointer;
}

.btn-view-detail:hover {
  background: #e0f0e0;
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
}

.btn.primary {
  background: #b31b1b;
  color: white;
}

.btn.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
