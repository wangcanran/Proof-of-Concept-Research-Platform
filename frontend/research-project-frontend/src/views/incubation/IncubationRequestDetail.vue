<!-- src/views/incubation/IncubationRequestDetail.vue -->
<template>
  <div class="incubation-request-detail">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-workbench-box" @click="goBack">
          <el-icon class="back-icon"><ArrowLeft /></el-icon>
          <span class="back-text">返回</span>
        </button>
        <h1>服务申请详情</h1>
        <div class="header-meta" v-if="request">
          <span class="project-no-tag">{{ request.project_code || '暂未编号' }}</span>
          <div class="status-badge" :class="getStatusClass(request.status)">
            {{ getStatusText(request.status) }}
          </div>
        </div>
      </div>
      <div class="header-actions" v-if="request">
        <!-- 申请人操作 -->
        <template v-if="userRole === 'applicant' && request.status === 'feedback_given' && request.feedback_action === 'approved'">
          <button class="action-btn primary" @click="goToResultFeedback">
            提交成果反馈
          </button>
        </template>
        <!-- 项目经理操作 -->
        <template v-if="userRole === 'project_manager' && request.status === 'pending'">
          <button class="action-btn primary" @click="goToFeedback">
            审批服务申请
          </button>
        </template>
        <template v-if="userRole === 'project_manager' && request.status === 'result_submitted' && request.project_status === 'approved'">
          <button class="action-btn warning" @click="confirmTerminateProject">
            终止项目
          </button>
        </template>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMessage" class="error-alert">
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <span class="error-text">{{ errorMessage }}</span>
        <button @click="errorMessage = ''" class="error-close">×</button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading && !request" class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">正在加载服务申请详情...</div>
    </div>

    <!-- 标签导航 -->
    <div v-if="request" class="tab-navigation">
      <div class="tab-container">
        <button
          v-for="tab in visibleTabs"
          :key="tab.key"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- 标签内容 -->
    <div v-if="request" class="tab-content">
      <!-- 基本信息 -->
      <div v-if="activeTab === 'basicInfo'" class="tab-panel">
        <div class="section">
          <h3 class="section-title">项目名称</h3>
          <div class="content-box">{{ request.project_title || '未设置' }}</div>
        </div>

        <div class="section">
          <h3 class="section-title">申请人信息</h3>
          <div class="content-box">
            <div class="info-row">
              <span class="row-label">姓名</span>
              <span class="row-value">{{ request.applicant_name || '-' }}</span>
            </div>
            <div class="info-row" v-if="request.applicant_email">
              <span class="row-label">邮箱</span>
              <span class="row-value">{{ request.applicant_email }}</span>
            </div>
            <div class="info-row" v-if="request.applicant_phone">
              <span class="row-label">电话</span>
              <span class="row-value">{{ request.applicant_phone }}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <h3 class="section-title">服务申请状态</h3>
          <div class="content-box">
            <span class="status-tag" :class="getStatusClass(request.status)">
              {{ getStatusText(request.status) }}
            </span>
          </div>
        </div>

        <div class="section" v-if="request.feedback_action">
          <h3 class="section-title">反馈结果</h3>
          <div class="content-box">
            <span class="feedback-tag" :class="request.feedback_action">
              {{ request.feedback_action === 'approved' ? '已同意' : '已拒绝' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 服务申请 -->
      <div v-if="activeTab === 'application'" class="tab-panel">
        <div class="section">
          <h3 class="section-title">服务需求描述</h3>
          <div class="content-box pre-wrap">{{ request.service_requirement || '暂无描述' }}</div>
        </div>

        <div class="section" v-if="applicationFiles.length > 0">
          <h3 class="section-title">申请附件</h3>
          <div class="content-box">
            <div class="attachments-list">
              <a 
                v-for="file in applicationFiles" 
                :key="file.id" 
                class="attachment-item"
                :href="getFileUrl(file.id)"
                target="_blank"
              >
                <span class="attachment-icon">📎</span>
                <span class="attachment-name">{{ file.file_name }}</span>
              </a>
            </div>
          </div>
        </div>

        <div class="section">
          <h3 class="section-title">申请时间</h3>
          <div class="content-box">{{ formatDateTime(request.application_date) }}</div>
        </div>
      </div>

      <!-- 服务反馈 -->
      <div v-if="activeTab === 'feedback'" class="tab-panel">
        <template v-if="request.status !== 'pending'">
          <div class="section">
            <h3 class="section-title">反馈结果</h3>
            <div class="content-box">
              <span class="feedback-tag" :class="request.feedback_action">
                {{ request.feedback_action === 'approved' ? '已同意提供服务' : '已拒绝服务' }}
              </span>
            </div>
          </div>

          <div class="section" v-if="request.feedback_comment">
            <h3 class="section-title">反馈说明</h3>
            <div class="content-box pre-wrap">{{ request.feedback_comment }}</div>
          </div>

          <div class="section" v-if="feedbackFiles.length > 0">
            <h3 class="section-title">反馈附件</h3>
            <div class="content-box">
              <div class="attachments-list">
                <a 
                  v-for="file in feedbackFiles" 
                  :key="file.id" 
                  class="attachment-item"
                  :href="getFileUrl(file.id)"
                  target="_blank"
                >
                  <span class="attachment-icon">📎</span>
                  <span class="attachment-name">{{ file.file_name }}</span>
                </a>
              </div>
            </div>
          </div>

          <div class="section" v-if="request.feedback_date">
            <h3 class="section-title">反馈时间</h3>
            <div class="content-box">{{ formatDateTime(request.feedback_date) }}</div>
          </div>
        </template>
        <template v-else>
          <div class="empty-section">
            <span class="empty-icon">⏳</span>
            <p>暂未反馈</p>
          </div>
        </template>
      </div>

      <!-- 成果反馈 -->
      <div v-if="activeTab === 'result'" class="tab-panel">
        <template v-if="request.status === 'result_submitted'">
          <div class="section">
            <h3 class="section-title">成果描述</h3>
            <div class="content-box pre-wrap">{{ request.result_description || '暂无描述' }}</div>
          </div>

          <div class="section" v-if="resultFiles.length > 0">
            <h3 class="section-title">成果附件</h3>
            <div class="content-box">
              <div class="attachments-list">
                <a 
                  v-for="file in resultFiles" 
                  :key="file.id" 
                  class="attachment-item"
                  :href="getFileUrl(file.id)"
                  target="_blank"
                >
                  <span class="attachment-icon">📎</span>
                  <span class="attachment-name">{{ file.file_name }}</span>
                </a>
              </div>
            </div>
          </div>

          <div class="section" v-if="request.result_date">
            <h3 class="section-title">成果提交时间</h3>
            <div class="content-box">{{ formatDateTime(request.result_date) }}</div>
          </div>
        </template>
        <template v-else>
          <div class="empty-section">
            <span class="empty-icon">📝</span>
            <p>{{ request.status === 'pending' ? '服务申请待处理' : '暂未提交成果反馈' }}</p>
          </div>
        </template>
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
            <div class="form-value">{{ request?.project_title }}</div>
          </div>
          <div class="form-group">
            <label class="form-label">服务需求</label>
            <div class="form-value">{{ request?.service_requirement }}</div>
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
                ref="fileInputRef"
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
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import axios from 'axios'

const router = useRouter()
const route = useRoute()

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
const request = ref<any>(null)
const errorMessage = ref('')
const activeTab = ref('basicInfo')
const showModal = ref(false)
const feedbackAction = ref<'approved' | 'rejected'>('approved')
const feedbackComment = ref('')
const uploadedFiles = ref<File[]>([])
const fileInputRef = ref<HTMLInputElement>()

// 用户角色
const userRole = computed(() => {
  const role = localStorage.getItem('role')
  return role || ''
})

// 标签配置
const visibleTabs = computed(() => {
  const tabs = [
    { key: 'basicInfo', label: '基本信息' },
    { key: 'application', label: '服务申请' },
    { key: 'feedback', label: '服务反馈' },
  ]
  if (request.value && request.value.status !== 'pending') {
    tabs.push({ key: 'result', label: '成果反馈' })
  }
  return tabs
})

// 文件分类
const applicationFiles = computed(() => {
  return (request.value?.files || []).filter((f: any) => f.attachment_type === 'application')
})

const feedbackFiles = computed(() => {
  return (request.value?.files || []).filter((f: any) => f.attachment_type === 'feedback')
})

const resultFiles = computed(() => {
  return (request.value?.files || []).filter((f: any) => f.attachment_type === 'result')
})

// 加载详情
const loadRequest = async () => {
  const requestId = route.params.id as string
  if (!requestId) {
    errorMessage.value = '缺少服务申请ID'
    return
  }

  loading.value = true
  try {
    const res = await api.get(`/incubation/requests/${requestId}`)
    if (res.data.success) {
      request.value = res.data.data
    } else {
      errorMessage.value = res.data.error || '加载失败'
    }
  } catch (error: any) {
    console.error('加载服务申请详情失败:', error)
    errorMessage.value = error.response?.data?.error || '加载服务申请详情失败'
  } finally {
    loading.value = false
  }
}

// 反馈弹窗
const openFeedbackModal = (action: 'approved' | 'rejected') => {
  feedbackAction.value = action
  feedbackComment.value = ''
  uploadedFiles.value = []
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  feedbackComment.value = ''
  uploadedFiles.value = []
}

// 文件上传
const triggerUpload = () => {
  fileInputRef.value?.click()
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
  if (!request.value) return

  submitting.value = true
  try {
    const res = await api.put(`/incubation/requests/${request.value.id}/feedback`, {
      feedback_action: feedbackAction.value,
      feedback_comment: feedbackComment.value.trim() || null
    })

    if (res.data.success) {
      // 上传附件
      if (uploadedFiles.value.length > 0) {
        for (const file of uploadedFiles.value) {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('progress_id', request.value.id)
          formData.append('attachment_type', 'feedback')
          
          await api.post('/incubation/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
        }
      }

      ElMessage.success(feedbackAction.value === 'approved' ? '已同意提供服务' : '已拒绝服务申请')
      closeModal()
      loadRequest()
    }
  } catch (error: any) {
    console.error('提交反馈失败:', error)
    ElMessage.error(error.response?.data?.error || '提交反馈失败')
  } finally {
    submitting.value = false
  }
}

// 终止项目
const confirmTerminateProject = async () => {
  if (!request.value) return
  
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

    const res = await api.put(`/incubation/projects/${request.value.project_id}/terminate`)
    if (res.data.success) {
      ElMessage.success('项目已终止')
      loadRequest()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('终止项目失败:', error)
      ElMessage.error(error.response?.data?.error || '终止项目失败')
    }
  }
}

// 跳转到成果反馈
const goToResultFeedback = () => {
  router.push({
    path: '/incubation/result-feedback',
    query: { requestId: request.value?.id }
  })
}

// 跳转到反馈界面（项目经理）
const goToFeedback = () => {
  router.push({
    path: '/incubation/feedback',
    query: { requestId: request.value?.id }
  })
}

// 返回
const goBack = () => {
  // 检查是否从成果反馈页面跳转过来
  const from = route.query.from as string
  if (from === 'result-feedback') {
    router.push('/incubation/result-feedback')
  } else {
    router.back()
  }
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

onMounted(() => {
  loadRequest()
})
</script>

<style scoped>
.incubation-request-detail {
  min-height: 100vh;
  background: #f5f7fa;
}

.page-header {
  background: white;
  padding: 24px 32px;
  border-bottom: 1px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.back-workbench-box {
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
  width: fit-content;
}

.back-workbench-box:hover {
  background: #e8e8e8;
  color: #333;
}

.page-header h1 {
  margin: 0;
  font-size: 22px;
  color: #333;
  font-weight: 600;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}

.project-no-tag {
  color: #666;
  font-size: 14px;
  background: #f5f5f5;
  padding: 4px 12px;
  border-radius: 4px;
}

.status-badge {
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 12px;
}

.status-badge.pending {
  background: #fff7e6;
  color: #fa8c16;
}

.status-badge.feedback {
  background: #e6f7ff;
  color: #1890ff;
}

.status-badge.completed {
  background: #f6ffed;
  color: #52c41a;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  padding: 10px 24px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
}

.action-btn.primary {
  background: #B22222;
  color: white;
}

.action-btn.primary:hover {
  background: #8B0000;
}

.action-btn.success {
  background: #52c41a;
  color: white;
}

.action-btn.success:hover {
  background: #389e0d;
}

.action-btn.danger {
  background: #ff4d4f;
  color: white;
}

.action-btn.danger:hover {
  background: #cf1322;
}

.action-btn.warning {
  background: #fa8c16;
  color: white;
}

.action-btn.warning:hover {
  background: #d46b08;
}

.error-alert {
  margin: 16px 24px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 8px;
  padding: 12px 16px;
}

.error-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.error-icon {
  font-size: 18px;
}

.error-text {
  flex: 1;
  color: #cf1322;
}

.error-close {
  background: none;
  border: none;
  font-size: 18px;
  color: #999;
  cursor: pointer;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #f0f0f0;
  border-top-color: #b31b1b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 16px;
  color: #666;
  font-size: 14px;
}

/* 标签导航 - 模仿图2样式：长条背景里有圆角矩形 */
.tab-navigation {
  background: #f5f5f5;
  padding: 12px 24px;
}

.tab-container {
  display: flex;
  gap: 0;
  background: #e8e8e8;
  border-radius: 8px;
  padding: 4px;
  width: 100%;
  max-width: 800px;
}

.tab-btn {
  flex: 1;
  padding: 12px 32px;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  color: #666;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-btn:hover {
  color: #333;
}

.tab-btn.active {
  color: white;
  background: #b31b1b;
  font-weight: 500;
}

/* 标签内容 */
.tab-content {
  padding: 24px;
}

.tab-panel {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.section {
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.section:last-child {
  border-bottom: none;
}

/* 字段标题 - 深色字体，下面有红色下划线 */
.section-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #333;
  font-weight: 600;
  padding-bottom: 8px;
  border-bottom: 2px solid #b31b1b;
  display: inline-block;
}

/* 内容盒子 - 浅灰色背景 */
.content-box {
  font-size: 15px;
  color: #333;
  line-height: 1.6;
  background: #fafafa;
  padding: 12px 16px;
  border-radius: 6px;
}

.content-box.pre-wrap {
  white-space: pre-wrap;
}

.empty-section {
  padding: 64px;
  text-align: center;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
  opacity: 0.5;
}

/* 信息行 */
.info-row {
  display: flex;
  align-items: flex-start;
  padding: 10px 0;
}

.info-row:not(:last-child) {
  border-bottom: 1px solid #f0f0f0;
}

.row-label {
  min-width: 80px;
  color: #666;
  font-size: 14px;
}

.row-value {
  flex: 1;
  color: #333;
  font-size: 14px;
}

/* 状态标签 */
.status-tag {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
}

.status-tag.pending {
  background: #fff7e6;
  color: #fa8c16;
}

.status-tag.feedback {
  background: #e6f7ff;
  color: #1890ff;
}

.status-tag.completed {
  background: #f6ffed;
  color: #52c41a;
}

/* 反馈标签 */
.feedback-tag {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
}

.feedback-tag.approved {
  background: #f6ffed;
  color: #52c41a;
}

.feedback-tag.rejected {
  background: #fff2f0;
  color: #ff4d4f;
}

/* 附件列表 */
.attachments-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  color: #333;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.3s;
}

.attachment-item:hover {
  border-color: #b31b1b;
  color: #b31b1b;
}

.attachment-icon {
  font-size: 16px;
}

.attachment-name {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.btn {
  padding: 10px 24px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
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
</style>
