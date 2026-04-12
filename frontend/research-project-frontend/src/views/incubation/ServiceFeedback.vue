<!-- src/views/incubation/ServiceFeedback.vue -->
<template>
  <div class="service-feedback-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回</span>
        </button>
        <h1>服务申请反馈</h1>
        <div class="header-subtitle">就服务申请给予反馈</div>
      </div>
    </div>

    <!-- 主要内容 -->
    <div class="content-wrapper">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>

      <!-- 服务申请信息 -->
      <div v-else-if="request" class="section-card">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">📋</span>
            服务申请信息
          </h3>
        </div>
        
        <div class="request-info">
          <div class="info-row">
            <span class="info-label">项目名称</span>
            <span class="info-value">{{ request.project_title }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">项目编号</span>
            <span class="info-value">{{ request.project_code || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">申请人</span>
            <span class="info-value">{{ request.applicant_name }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">申请时间</span>
            <span class="info-value">{{ formatDateTime(request.application_date) }}</span>
          </div>
          <div class="info-row full-width">
            <span class="info-label">服务需求描述</span>
            <span class="info-value pre-wrap">{{ request.service_requirement }}</span>
          </div>
        </div>

        <!-- 申请附件 -->
        <div v-if="applicationFiles.length > 0" class="attachments-section">
          <h4 class="attachments-title">申请附件</h4>
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

      <!-- 反馈表单 -->
      <div v-if="request" class="section-card form-section">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">✏️</span>
            填写反馈
          </h3>
        </div>

        <form @submit.prevent="submitFeedback" class="feedback-form">
          <div class="form-group">
            <label class="form-label required">反馈结果</label>
            <div class="radio-group">
              <label class="radio-item" :class="{ active: feedbackAction === 'approved' }">
                <input type="radio" v-model="feedbackAction" value="approved" />
                <span class="radio-label">同意提供服务</span>
              </label>
              <label class="radio-item" :class="{ active: feedbackAction === 'rejected' }">
                <input type="radio" v-model="feedbackAction" value="rejected" />
                <span class="radio-label">拒绝服务</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">反馈说明</label>
            <textarea 
              v-model="feedbackComment" 
              class="form-textarea"
              :placeholder="feedbackAction === 'approved' ? '请说明将提供的服务内容...' : '请说明拒绝原因...'"
              rows="5"
            ></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">反馈附件（可选）</label>
            <div class="upload-area">
              <input 
                type="file" 
                id="file-input-feedback"
                @change="handleFileChange"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                style="display: none"
              />
              <label for="file-input-feedback" class="upload-btn">
                <span class="upload-icon">📎</span>
                选择文件
              </label>
              <span class="upload-hint">支持 PDF、Word、Excel、图片</span>
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
            <button type="button" class="btn btn-secondary" @click="goBack">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ submitting ? '提交中...' : '提交反馈' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import axios from 'axios'

const router = useRouter()
const route = useRoute()

// API配置
const API_BASE_URL = 'http://localhost:3002/api'
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
const feedbackAction = ref<'approved' | 'rejected'>('approved')
const feedbackComment = ref('')
const uploadedFiles = ref<File[]>([])

// 文件分类
const applicationFiles = computed(() => {
  return (request.value?.files || []).filter((f: any) => f.attachment_type === 'application')
})

// 加载服务申请详情
const loadRequest = async () => {
  const requestId = route.query.requestId as string
  if (!requestId) {
    ElMessage.error('缺少服务申请ID')
    goBack()
    return
  }

  loading.value = true
  try {
    const res = await api.get(`/incubation/requests/${requestId}`)
    if (res.data.success) {
      request.value = res.data.data
      // 如果不是pending状态，提示已处理
      if (request.value.status !== 'pending') {
        ElMessage.warning('该服务申请已处理')
        goBack()
      }
    } else {
      ElMessage.error(res.data.error || '加载失败')
      goBack()
    }
  } catch (error: any) {
    console.error('加载服务申请详情失败:', error)
    ElMessage.error(error.response?.data?.error || '加载服务申请详情失败')
    goBack()
  } finally {
    loading.value = false
  }
}

// 文件上传
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
    // 提交反馈
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
      router.push('/assistant/incubation-requests')
    }
  } catch (error: any) {
    console.error('提交反馈失败:', error)
    ElMessage.error(error.response?.data?.error || '提交反馈失败')
  } finally {
    submitting.value = false
  }
}

// 返回
const goBack = () => {
  router.back()
}

// 工具函数
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
.service-feedback-page {
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
  flex-direction: column;
  gap: 8px;
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
  width: fit-content;
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
  max-width: 900px;
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

.request-info {
  padding: 24px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-row {
  display: flex;
  gap: 12px;
}

.info-row.full-width {
  grid-column: 1 / -1;
  flex-direction: column;
  gap: 8px;
}

.info-label {
  min-width: 80px;
  color: #666;
  font-size: 14px;
  font-weight: 500;
}

.info-value {
  flex: 1;
  color: #333;
  font-size: 14px;
}

.info-value.pre-wrap {
  white-space: pre-wrap;
  line-height: 1.6;
  background: #fafafa;
  padding: 12px;
  border-radius: 6px;
}

.attachments-section {
  padding: 0 24px 24px;
}

.attachments-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

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
  background: #fafafa;
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

/* 表单样式 */
.form-section {
  border: 2px solid #b31b1b;
}

.feedback-form {
  padding: 24px;
}

.form-group {
  margin-bottom: 24px;
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

.radio-group {
  display: flex;
  gap: 16px;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #f5f5f5;
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.radio-item input {
  display: none;
}

.radio-item.active {
  background: #fff;
  border-color: #b31b1b;
}

.radio-item.active .radio-label {
  color: #b31b1b;
  font-weight: 500;
}

.radio-label {
  font-size: 14px;
  color: #666;
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: #f5f5f5;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
  color: #333;
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
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 6px;
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
  font-size: 18px;
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
  padding: 12px 32px;
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

/* 加载状态 */
.loading-state {
  padding: 64px;
  text-align: center;
  color: #999;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #f0f0f0;
  border-top-color: #b31b1b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
