<!-- src/views/incubation/ServiceRequest.vue -->
<template>
  <div class="service-request-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回工作台</span>
        </button>
        <h1>服务申请</h1>
        <div class="header-subtitle">就您已被批准的项目发起孵化服务申请</div>
      </div>
    </div>

    <!-- 主要内容 -->
    <div class="content-wrapper">
      <!-- 可申请服务的项目列表 -->
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">📋</span>
            可申请服务的项目
          </h3>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <div v-else-if="eligibleProjects.length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <p>暂无可申请服务的项目</p>
          <p class="empty-subtext">只有状态为「已批准」的项目才能发起服务申请</p>
        </div>

        <div v-else class="projects-list">
          <div 
            v-for="project in eligibleProjects" 
            :key="project.id" 
            class="project-item"
            :class="{ 'selected': selectedProject?.id === project.id }"
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
                <span class="meta-icon">📝</span>
                服务申请次数: {{ project.service_count || 0 }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 服务申请表单 -->
      <div v-if="selectedProject" class="section-card form-section">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">✏️</span>
            填写服务申请
          </h3>
        </div>

        <form @submit.prevent="submitRequest" class="request-form">
          <div class="form-group">
            <label class="form-label required">服务需求描述</label>
            <textarea 
              v-model="serviceRequirement" 
              class="form-textarea"
              placeholder="请详细描述您的服务需求..."
              rows="6"
              required
            ></textarea>
            <div class="form-hint form-hint--services">
              <p class="form-hint-lead">请说明您的具体需求，我们为您精准匹配平台资源。</p>
              <p class="form-hint-sub">可申请但不限于以下服务：</p>
              <ul class="form-hint-list">
                <li>・技术支持：中试放大、工艺优化、技术攻关、场景验证</li>
                <li>・商业赋能：市场调研、商业模式设计、商业计划书、路演辅导</li>
                <li>・知识产权：专利布局、风险排查、技术交易、合同审查</li>
                <li>・资源对接：投融资、政府项目申报、产业链对接、中试基地</li>
                <li>・创业孵化：公司注册、园区入驻、创业导师、财务法务咨询</li>
              </ul>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">附件材料（可选）</label>
            <div class="upload-area">
              <input 
                type="file" 
                ref="fileInput" 
                @change="handleFileChange" 
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                style="display: none"
              />
              <button type="button" class="upload-btn" @click="triggerUpload">
                <span class="upload-icon">📎</span>
                选择文件
              </button>
              <span class="upload-hint">支持 PDF、Word、Excel、图片，单个文件不超过10MB</span>
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
              {{ submitting ? '提交中...' : '提交申请' }}
            </button>
          </div>
        </form>
      </div>

      <!-- 已提交的服务申请列表 -->
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">📜</span>
            我的服务申请记录
          </h3>
          <div class="filter-tabs">
            <button 
              v-for="tab in statusTabs" 
              :key="tab.value"
              class="tab-btn"
              :class="{ 'active': currentTab === tab.value }"
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
          <p>暂无服务申请记录</p>
        </div>

        <div v-else class="requests-grid">
          <div 
            v-for="request in filteredRequests" 
            :key="request.id" 
            class="request-card"
          >
            <div class="card-header" @click="goToDetail(request.id)">
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
                <span class="info-label">申请时间</span>
                <span class="info-value">{{ formatDateTime(request.application_date) }}</span>
              </div>
              <div class="card-info" v-if="request.feedback_action">
                <span class="info-label">反馈结果</span>
                <span class="info-value" :class="request.feedback_action === 'approved' ? 'success' : 'danger'">
                  {{ request.feedback_action === 'approved' ? '已同意' : '已拒绝' }}
                </span>
              </div>
            </div>
            <div class="card-footer">
              <button class="btn-view-detail" @click.stop="goToDetail(request.id)">查看详情</button>
              <!-- 对于feedback_action为approved但还没有提交成果反馈的，显示提交成果反馈按钮 -->
              <button 
                v-if="request.feedback_action === 'approved' && request.status === 'feedback_given'" 
                class="btn-result-feedback" 
                @click.stop="goToResultFeedback(request.id)"
              >提交成果反馈</button>
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
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import axios from 'axios'

const router = useRouter()

// API配置
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

// 响应式数据
const loading = ref(false)
const loadingRequests = ref(false)
const submitting = ref(false)
const eligibleProjects = ref<any[]>([])
const myRequests = ref<any[]>([])
const selectedProject = ref<any>(null)
const serviceRequirement = ref('')
const uploadedFiles = ref<File[]>([])
const fileInput = ref<HTMLInputElement>()
const currentTab = ref('all')

// 状态标签
const statusTabs = computed(() => [
  { value: 'all', label: '全部', count: myRequests.value.length },
  { value: 'pending', label: '待反馈', count: myRequests.value.filter(r => r.status === 'pending').length },
  { value: 'feedback_given', label: '已反馈', count: myRequests.value.filter(r => r.status === 'feedback_given').length },
  { value: 'result_submitted', label: '已完成', count: myRequests.value.filter(r => r.status === 'result_submitted').length },
])

const filteredRequests = computed(() => {
  if (currentTab.value === 'all') return myRequests.value
  return myRequests.value.filter(r => r.status === currentTab.value)
})

// 加载数据
const loadEligibleProjects = async () => {
  loading.value = true
  try {
    const res = await api.get('/incubation/eligible-projects')
    if (res.data.success) {
      eligibleProjects.value = res.data.data
    }
  } catch (error) {
    console.error('加载项目列表失败:', error)
    ElMessage.error('加载项目列表失败')
  } finally {
    loading.value = false
  }
}

const loadMyRequests = async () => {
  loadingRequests.value = true
  try {
    const res = await api.get('/incubation/my-requests')
    if (res.data.success) {
      myRequests.value = res.data.data
    }
  } catch (error) {
    console.error('加载服务申请列表失败:', error)
  } finally {
    loadingRequests.value = false
  }
}

// 选择项目
const selectProject = (project: any) => {
  selectedProject.value = project
  serviceRequirement.value = ''
  uploadedFiles.value = []
}

// 文件上传
const triggerUpload = () => {
  fileInput.value?.click()
}

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    const files = Array.from(target.files)
    uploadedFiles.value.push(...files)
  }
}

const removeFile = (index: number) => {
  uploadedFiles.value.splice(index, 1)
}

// 提交申请
const submitRequest = async () => {
  if (!selectedProject.value) {
    ElMessage.warning('请选择要申请服务的项目')
    return
  }
  if (!serviceRequirement.value.trim()) {
    ElMessage.warning('请填写服务需求描述')
    return
  }

  submitting.value = true
  try {
    // 先创建服务申请
    const res = await api.post('/incubation/service-request', {
      project_id: selectedProject.value.id,
      service_requirement: serviceRequirement.value.trim()
    })

    if (res.data.success) {
      const progressId = res.data.data.id

      // 如果有附件，上传附件
      if (uploadedFiles.value.length > 0) {
        for (const file of uploadedFiles.value) {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('progress_id', progressId)
          formData.append('attachment_type', 'application')
          
          await api.post('/incubation/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
        }
      }

      ElMessage.success('服务申请提交成功')
      selectedProject.value = null
      serviceRequirement.value = ''
      uploadedFiles.value = []
      
      // 刷新列表
      loadEligibleProjects()
      loadMyRequests()
    }
  } catch (error: any) {
    console.error('提交服务申请失败:', error)
    ElMessage.error(error.response?.data?.error || '提交服务申请失败')
  } finally {
    submitting.value = false
  }
}

const cancelForm = () => {
  selectedProject.value = null
  serviceRequirement.value = ''
  uploadedFiles.value = []
}

const switchTab = (tab: string) => {
  currentTab.value = tab
}

const goToDetail = (requestId: string) => {
  router.push(`/incubation/request/${requestId}`)
}

const goToResultFeedback = (requestId: string) => {
  router.push(`/incubation/result-feedback?requestId=${requestId}`)
}

const goBack = () => {
  router.push('/applicant/dashboard')
}

// 工具函数
const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    approved: 'approved',
    incubating: 'incubating',
    completed: 'completed'
  }
  return map[status] || ''
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    approved: '已批准',
    incubating: '孵化中',
    completed: '已完成'
  }
  return map[status] || status
}

const getRequestStatusClass = (status: string) => {
  const map: Record<string, string> = {
    pending: 'pending',
    feedback_given: 'feedback',
    result_submitted: 'completed'
  }
  return map[status] || ''
}

const getRequestStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待反馈',
    feedback_given: '已反馈',
    result_submitted: '已完成'
  }
  return map[status] || status
}

const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const formatDateTime = (dateString: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

onMounted(() => {
  loadEligibleProjects()
  loadMyRequests()
})
</script>

<style scoped>
.service-request-page {
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
  transition: all 0.3s;
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
}

.section-title {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  font-size: 20px;
}

/* 项目列表样式 */
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

.project-status.completed {
  background: #f5f5f5;
  color: #8c8c8c;
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

/* 表单样式 */
.form-section {
  border: 2px solid #b31b1b;
}

.request-form {
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

.form-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  resize: vertical;
  transition: border-color 0.3s;
}

.form-textarea:focus {
  outline: none;
  border-color: #b31b1b;
}

.form-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
}

.form-hint--services {
  line-height: 1.55;
}

.form-hint--services .form-hint-lead,
.form-hint--services .form-hint-sub {
  margin: 0 0 6px;
  color: #666;
}

.form-hint--services .form-hint-sub {
  margin-top: 10px;
  font-weight: 500;
}

.form-hint-list {
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
  color: #888;
}

.form-hint-list li {
  margin-bottom: 4px;
}

.upload-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

.upload-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f5f5f5;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
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

.file-icon {
  font-size: 16px;
}

.file-name {
  flex: 1;
  font-size: 13px;
  color: #333;
}

.file-remove {
  background: none;
  border: none;
  color: #999;
  font-size: 16px;
  cursor: pointer;
}

.file-remove:hover {
  color: #ff4d4f;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.btn {
  padding: 10px 24px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: #b31b1b;
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background: #8b0000;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #666;
  border: 1px solid #d9d9d9;
}

.btn-secondary:hover {
  border-color: #b31b1b;
  color: #b31b1b;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

/* 筛选标签 */
.filter-tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  padding: 6px 12px;
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
  border-radius: 16px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-btn:hover {
  border-color: #b31b1b;
  color: #b31b1b;
}

.tab-btn.active {
  background: #b31b1b;
  color: white;
  border-color: #b31b1b;
}

.tab-count {
  display: inline-block;
  margin-left: 4px;
  padding: 0 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  font-size: 11px;
}

/* 服务申请列表 */
.requests-list {
  padding: 16px;
}

.request-item {
  padding: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  margin-bottom: 12px;
  transition: all 0.3s;
}

.request-item:hover {
  border-color: #b31b1b;
}

.request-item:last-child {
  margin-bottom: 0;
}

.request-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.request-project {
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.request-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
}

.request-status.pending {
  background: #fff7e6;
  color: #fa8c16;
}

.request-status.feedback {
  background: #e6f7ff;
  color: #1890ff;
}

.request-status.completed {
  background: #f6ffed;
  color: #52c41a;
}

.request-content {
  margin-bottom: 12px;
}

.request-field {
  margin-bottom: 8px;
  font-size: 13px;
}

.field-label {
  color: #999;
}

.field-value {
  color: #333;
}

.field-value.success {
  color: #52c41a;
}

.field-value.danger {
  color: #ff4d4f;
}

.request-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #999;
  padding-top: 8px;
  border-top: 1px dashed #f0f0f0;
}

.request-actions {
  padding-top: 12px;
  display: flex;
  justify-content: flex-end;
}

/* 空状态和加载状态 */
.loading-state,
.empty-state {
  padding: 48px;
  text-align: center;
  color: #999;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f0f0f0;
  border-top-color: #b31b1b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0 0 4px 0;
}

.empty-subtext {
  font-size: 12px;
  color: #bbb;
}

/* 附件显示 */
.attachments-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.attachment-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  color: #333;
  text-decoration: none;
  font-size: 12px;
  transition: all 0.3s;
}

.attachment-link:hover {
  border-color: #b31b1b;
  color: #b31b1b;
  background: #fff;
}

.attachment-icon {
  font-size: 12px;
}

/* 服务申请卡片网格 */
.requests-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  padding: 16px;
}

.request-card {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  overflow: hidden;
}

.request-card:hover {
  border-color: #b31b1b;
  box-shadow: 0 4px 12px rgba(179, 27, 27, 0.1);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.card-project-title {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  color: #333;
  line-height: 1.4;
  margin-right: 12px;
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

.card-status.feedback {
  background: #e6f7ff;
  color: #1890ff;
}

.card-status.completed {
  background: #f6ffed;
  color: #52c41a;
}

.card-body {
  padding: 16px;
}

.card-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.card-info:last-child {
  margin-bottom: 0;
}

.card-info .info-label {
  font-size: 13px;
  color: #999;
}

.card-info .info-value {
  font-size: 13px;
  color: #333;
}

.card-info .info-value.success {
  color: #52c41a;
}

.card-info .info-value.danger {
  color: #ff4d4f;
}

.card-footer {
  padding: 16px;
  display: flex;
  gap: 12px;
}

.btn-view-detail {
  flex: 1;
  padding: 10px 24px;
  background: #F0F9F0;
  border: none;
  border-radius: 6px;
  color: #2E8B57;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-view-detail:hover {
  background: #E0F0E0;
}

.btn-result-feedback {
  flex: 1;
  padding: 10px 24px;
  background: #B22222;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-result-feedback:hover {
  background: #8B0000;
}
</style>
