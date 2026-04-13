<!-- src/views/assistant/IncubationRequests.vue -->
<template>
  <div class="incubation-requests-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回工作台</span>
        </button>
        <h1>服务申请处理</h1>
        <div class="header-subtitle">处理申请人提交的孵化服务申请</div>
      </div>
    </div>

    <!-- 主要内容 -->
    <div class="content-wrapper">
      <!-- 筛选标签 -->
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

      <!-- 服务申请列表 -->
      <div class="section-card">
        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <div v-else-if="filteredRequests.length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <p>暂无{{ currentTab === 'all' ? '' : statusTabs.find(t => t.value === currentTab)?.label }}服务申请</p>
        </div>

        <div v-else class="requests-grid">
          <div 
            v-for="request in filteredRequests" 
            :key="request.id" 
            class="request-card"
          >
            <div class="card-header" @click="goToDetail(request.id)">
              <div class="card-title-row">
                <span class="card-project-code">{{ request.project_code || '-' }}</span>
                <span class="card-status" :class="getStatusClass(request.status)">
                  {{ getStatusText(request.status) }}
                </span>
              </div>
              <h4 class="card-project-title">{{ request.project_title }}</h4>
            </div>
            <div class="card-body" @click="goToDetail(request.id)">
              <div class="card-info">
                <span class="info-label">申请人</span>
                <span class="info-value">{{ request.applicant_name }}</span>
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
              <!-- 对于status为pending的，显示审批服务申请按钮 -->
              <button 
                v-if="request.status === 'pending'" 
                class="btn-approve" 
                @click.stop="goToFeedback(request.id)"
              >审批服务申请</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 反馈弹窗 -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ feedbackAction === 'approved' ? '同意提供服务' : '拒绝服务' }}</h3>
          <button class="modal-close" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">项目名称</label>
            <div class="form-value">{{ selectedRequest?.project_title }}</div>
          </div>
          <div class="form-group">
            <label class="form-label">服务需求</label>
            <div class="form-value">{{ selectedRequest?.service_requirement }}</div>
          </div>
          <div class="form-group">
            <label class="form-label required">反馈说明</label>
            <textarea 
              v-model="feedbackComment" 
              class="form-textarea"
              :placeholder="feedbackAction === 'approved' ? '请说明将提供的服务内容...' : '请说明拒绝原因...'"
              rows="4"
            ></textarea>
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
            </div>
            <div v-if="uploadedFiles.length > 0" class="file-list">
              <div v-for="(file, index) in uploadedFiles" :key="index" class="file-item">
                <span class="file-icon">📄</span>
                <span class="file-name">{{ file.name }}</span>
                <button type="button" class="file-remove" @click="removeFile(index)">×</button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">取消</button>
          <button 
            class="btn" 
            :class="feedbackAction === 'approved' ? 'btn-success' : 'btn-danger'"
            @click="submitFeedback"
            :disabled="submitting"
          >
            {{ submitting ? '提交中...' : '确认提交' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getApiBaseUrl } from '@/utils/request'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
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
const submitting = ref(false)
const requests = ref<any[]>([])
const currentTab = ref('pending')
const showModal = ref(false)
const selectedRequest = ref<any>(null)
const feedbackAction = ref<'approved' | 'rejected'>('approved')
const feedbackComment = ref('')
const uploadedFiles = ref<File[]>([])
const fileInput = ref<HTMLInputElement>()

// 状态标签
const statusTabs = computed(() => [
  { value: 'pending', label: '待处理', count: requests.value.filter(r => r.status === 'pending').length },
  { value: 'feedback_given', label: '已反馈', count: requests.value.filter(r => r.status === 'feedback_given').length },
  { value: 'result_submitted', label: '已完成', count: requests.value.filter(r => r.status === 'result_submitted').length },
  { value: 'all', label: '全部', count: requests.value.length },
])

const filteredRequests = computed(() => {
  if (currentTab.value === 'all') return requests.value
  return requests.value.filter(r => r.status === currentTab.value)
})

// 加载数据
const loadRequests = async () => {
  loading.value = true
  try {
    const res = await api.get('/incubation/pending-requests', {
      params: { status: 'all' }
    })
    if (res.data.success) {
      requests.value = res.data.data || []
    }
  } catch (error) {
    console.error('加载服务申请列表失败:', error)
    ElMessage.error('加载服务申请列表失败')
  } finally {
    loading.value = false
  }
}

const switchTab = (tab: string) => {
  currentTab.value = tab
}

// 反馈弹窗
const openFeedbackModal = (request: any, action: 'approved' | 'rejected') => {
  selectedRequest.value = request
  feedbackAction.value = action
  feedbackComment.value = ''
  uploadedFiles.value = []
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedRequest.value = null
  feedbackComment.value = ''
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

// 提交反馈
const submitFeedback = async () => {
  if (!selectedRequest.value) return

  submitting.value = true
  try {
    // 提交反馈
    const res = await api.put(`/incubation/requests/${selectedRequest.value.id}/feedback`, {
      feedback_action: feedbackAction.value,
      feedback_comment: feedbackComment.value.trim() || null
    })

    if (res.data.success) {
      // 如果有附件，上传附件
      if (uploadedFiles.value.length > 0) {
        for (const file of uploadedFiles.value) {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('progress_id', selectedRequest.value.id)
          formData.append('attachment_type', 'feedback')
          
          await api.post('/incubation/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
        }
      }

      ElMessage.success(feedbackAction.value === 'approved' ? '已同意提供服务' : '已拒绝服务申请')
      closeModal()
      loadRequests()
    }
  } catch (error: any) {
    console.error('提交反馈失败:', error)
    ElMessage.error(error.response?.data?.error || '提交反馈失败')
  } finally {
    submitting.value = false
  }
}

// 终止项目
const confirmTerminateProject = async (request: any) => {
  try {
    await ElMessageBox.confirm(
      '确定要终止该项目吗？终止后申请人将无法再提交服务申请。',
      '确认终止项目',
      {
        confirmButtonText: '确定终止',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    const res = await api.put(`/incubation/projects/${request.project_id}/terminate`)
    if (res.data.success) {
      ElMessage.success('项目已终止')
      loadRequests()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('终止项目失败:', error)
      ElMessage.error(error.response?.data?.error || '终止项目失败')
    }
  }
}

const goBack = () => {
  router.push('/assistant/dashboard')
}

const goToDetail = (requestId: string) => {
  router.push(`/incubation/request/${requestId}`)
}

const goToFeedback = (requestId: string) => {
  router.push(`/incubation/feedback?requestId=${requestId}`)
}

// 工具函数
const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    pending: 'pending',
    feedback_given: 'feedback',
    result_submitted: 'completed'
  }
  return map[status] || ''
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待处理',
    feedback_given: '已反馈',
    result_submitted: '已完成'
  }
  return map[status] || status
}

const formatDateTime = (dateString: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

const getFileUrl = (fileId: string) => {
  if (!fileId) return '#'
  const token = localStorage.getItem('token')
  return `${API_BASE_URL}/incubation/files/${fileId}?token=${token}`
}

const getApplicationFiles = (request: any) => {
  return (request.files || []).filter((f: any) => f.attachment_type === 'application')
}

const getFeedbackFiles = (request: any) => {
  return (request.files || []).filter((f: any) => f.attachment_type === 'feedback')
}

const getResultFiles = (request: any) => {
  return (request.files || []).filter((f: any) => f.attachment_type === 'result')
}

onMounted(() => {
  loadRequests()
})
</script>

<style scoped>
.incubation-requests-page {
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

/* 筛选标签 */
.filter-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.tab-btn {
  padding: 10px 20px;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-size: 14px;
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
  margin-left: 6px;
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  font-size: 12px;
}

.tab-btn:not(.active) .tab-count {
  background: #f5f5f5;
}

/* 卡片 */
.section-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

/* 请求列表 */
.requests-list {
  padding: 16px;
}

.request-item {
  padding: 24px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  margin-bottom: 16px;
  transition: all 0.3s;
}

.request-item:hover {
  border-color: #b31b1b;
  box-shadow: 0 4px 12px rgba(179, 27, 27, 0.08);
}

.request-item:last-child {
  margin-bottom: 0;
}

.request-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.request-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-code {
  font-size: 12px;
  color: #b31b1b;
  background: rgba(179, 27, 27, 0.06);
  padding: 2px 8px;
  border-radius: 4px;
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

.project-title {
  margin: 0;
  font-size: 18px;
  color: #333;
  font-weight: 500;
}

.request-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  font-size: 13px;
  color: #999;
}

/* 详情部分 */
.request-details {
  background: #fafafa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}

.detail-section {
  margin-bottom: 16px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-label {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #999;
  font-weight: 500;
}

.section-content {
  margin: 0;
  font-size: 14px;
  color: #333;
  line-height: 1.6;
}

/* 附件列表 */
.attachments-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.attachment-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  color: #333;
  text-decoration: none;
  font-size: 13px;
  transition: all 0.3s;
}

.attachment-link:hover {
  border-color: #b31b1b;
  color: #b31b1b;
}

/* 联系信息 */
.contact-info {
  background: white;
  border-radius: 6px;
  padding: 12px;
}

.contact-grid {
  display: flex;
  gap: 24px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
}

/* 反馈结果 */
.feedback-section {
  background: white;
  border-radius: 6px;
  padding: 12px;
}

.feedback-result {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
}

.feedback-result.approved {
  color: #52c41a;
}

.feedback-result.rejected {
  color: #ff4d4f;
}

.feedback-icon {
  font-size: 18px;
}

/* 成果部分 */
.result-section {
  background: #f6ffed;
  border-radius: 6px;
  padding: 12px;
  border-left: 3px solid #52c41a;
}

/* 操作按钮 */
.request-actions {
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
  border: none;
}

.btn-primary {
  background: #b31b1b;
  color: white;
}

.btn-primary:hover {
  background: #8b0000;
}

.btn-success {
  background: #52c41a;
  color: white;
}

.btn-success:hover {
  background: #389e0d;
}

.btn-danger {
  background: #ff4d4f;
  color: white;
}

.btn-danger:hover {
  background: #cf1322;
}

.btn-warning {
  background: #fa8c16;
  color: white;
}

.btn-warning:hover {
  background: #d46b08;
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

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
}

.modal-close:hover {
  color: #333;
}

.modal-body {
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

.form-value {
  font-size: 14px;
  color: #666;
  padding: 8px 0;
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

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
}

/* 空状态和加载状态 */
.loading-state,
.empty-state {
  padding: 64px;
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
  margin: 0;
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
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-project-code {
  font-size: 12px;
  color: #b31b1b;
  background: rgba(179, 27, 27, 0.06);
  padding: 2px 8px;
  border-radius: 4px;
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

.card-project-title {
  margin: 0;
  font-size: 15px;
  color: #333;
  font-weight: 500;
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

.btn-approve {
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

.btn-approve:hover {
  background: #8B0000;
}
</style>
