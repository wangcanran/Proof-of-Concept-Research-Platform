<!-- src/views/incubation/ResultFeedback.vue -->
<template>
  <div class="result-feedback-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回</span>
        </button>
        <h1>成果反馈</h1>
        <div class="header-subtitle">就已获批准的服务申请、经费申请分别提交成果反馈</div>
      </div>
    </div>

    <!-- 主要内容 -->
    <div class="content-wrapper">
      <!-- 待提交成果 -->
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">📝</span>
            待提交成果
          </h3>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <template v-else>
          <div v-if="pendingServiceFeedback.length === 0 && pendingFundsFeedback.length === 0" class="empty-state">
            <div class="empty-icon">✅</div>
            <p>暂无待提交成果的申请</p>
            <p class="empty-subtext">服务申请或经费申请获批后，可在此分别提交成果反馈</p>
          </div>

          <template v-else>
            <h4 v-if="pendingServiceFeedback.length > 0" class="subsection-title">
              <span class="type-badge type-service">服务申请</span>
              待提交成果（{{ pendingServiceFeedback.length }}）
            </h4>
            <div v-if="pendingServiceFeedback.length > 0" class="requests-list">
          <div v-for="request in pendingServiceFeedback" :key="'svc-' + request.id" class="request-item">
            <div class="request-header">
              <div class="request-info">
                <span class="type-badge type-service">服务申请</span>
                <span class="project-code">{{ request.project_code }}</span>
                <h4 class="project-title">{{ request.project_title }}</h4>
              </div>
              <span class="status-badge pending">待提交成果</span>
            </div>
            
            <div class="request-details">
              <div class="detail-row">
                <span class="detail-label">服务需求：</span>
                <span class="detail-value">{{ request.service_requirement }}</span>
              </div>
              <div v-if="formatServiceCategoriesDisplay(request.service_categories)" class="detail-row">
                <span class="detail-label">服务类别：</span>
                <span class="detail-value">{{ formatServiceCategoriesDisplay(request.service_categories) }}</span>
              </div>
              <!-- 申请附件 -->
              <div v-if="getApplicationFiles(request).length > 0" class="detail-row">
                <span class="detail-label">申请附件：</span>
                <div class="attachments-inline">
                  <a 
                    v-for="file in getApplicationFiles(request)" 
                    :key="file.id"
                    class="attachment-link"
                    :href="getFileUrl(file.id)"
                    target="_blank"
                  >
                    <span class="attachment-icon">📎</span>
                    {{ file.file_name }}
                  </a>
                </div>
              </div>
              <div class="detail-row">
                <span class="detail-label">反馈结果：</span>
                <span class="detail-value success">同意提供服务</span>
              </div>
              <div class="detail-row" v-if="request.feedback_comment">
                <span class="detail-label">反馈说明：</span>
                <span class="detail-value">{{ request.feedback_comment }}</span>
              </div>
              <!-- 反馈附件 -->
              <div v-if="getFeedbackFiles(request).length > 0" class="detail-row">
                <span class="detail-label">反馈附件：</span>
                <div class="attachments-inline">
                  <a 
                    v-for="file in getFeedbackFiles(request)" 
                    :key="file.id"
                    class="attachment-link"
                    :href="getFileUrl(file.id)"
                    target="_blank"
                  >
                    <span class="attachment-icon">📎</span>
                    {{ file.file_name }}
                  </a>
                </div>
              </div>
              <div class="detail-row">
                <span class="detail-label">反馈时间：</span>
                <span class="detail-value">{{ formatDateTime(request.feedback_date) }}</span>
              </div>
            </div>

            <div class="feedback-form" v-if="activeFormKey === formKey('incubation', request.id)">
              <div class="form-divider"></div>
              <h5 class="form-title">提交成果反馈 · 服务申请</h5>
              <form @submit.prevent="submitResult('incubation', request.id)">
                <div class="form-group">
                  <label class="form-label required">成果描述</label>
                  <textarea 
                    v-model="resultDescription" 
                    class="form-textarea"
                    placeholder="请详细描述成果内容..."
                    rows="5"
                    required
                  ></textarea>
                </div>

                <div class="form-group">
                  <label class="form-label">附件材料（可选）</label>
                  <div class="upload-area">
                    <input 
                      type="file" 
                      :id="'file-input-' + request.id"
                      @change="handleFileChange" 
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      style="display: none"
                    />
                    <label :for="'file-input-' + request.id" class="upload-btn">
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
                  <button type="button" class="btn btn-secondary" @click="cancelForm">取消</button>
                  <button type="submit" class="btn btn-primary" :disabled="submitting">
                    {{ submitting ? '提交中...' : '提交成果' }}
                  </button>
                </div>
              </form>
            </div>

            <div v-else class="action-area">
              <button class="btn btn-primary" @click="showForm('incubation', request.id)">
                提交成果反馈
              </button>
            </div>
          </div>
            </div>

            <h4 v-if="pendingFundsFeedback.length > 0" class="subsection-title">
              <span class="type-badge type-funds">经费申请</span>
              待提交成果（{{ pendingFundsFeedback.length }}）
            </h4>
            <div v-if="pendingFundsFeedback.length > 0" class="requests-list">
          <div v-for="request in pendingFundsFeedback" :key="'fund-' + request.id" class="request-item request-item-funds">
            <div class="request-header">
              <div class="request-info">
              <span
                class="type-badge type-funds"
                :class="{ 'type-manager': request.submission_type === 'manager_direct' }"
              >
                {{ request.submission_type === 'manager_direct' ? '经费·管理员登记' : '经费申请' }}
              </span>
              <span class="project-code">{{ request.project_code }}</span>
              <h4 class="project-title">{{ request.project_title }}</h4>
            </div>
            <span class="status-badge pending">待提交成果</span>
          </div>
          
          <div class="request-details">
            <div class="detail-row">
              <span class="detail-label">经费说明：</span>
                <span class="detail-value">{{ request.service_requirement }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">申请金额：</span>
                <span class="detail-value">¥ {{ formatAmount(request.total_amount) }}</span>
              </div>
              <div class="detail-row" v-if="request.approved_amount != null">
                <span class="detail-label">批准金额：</span>
                <span class="detail-value">¥ {{ formatAmount(request.approved_amount) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">反馈结果：</span>
                <span class="detail-value success">{{ fundsFeedbackLabel(request.feedback_action) }}</span>
              </div>
              <div class="detail-row" v-if="request.feedback_comment">
                <span class="detail-label">反馈说明：</span>
                <span class="detail-value">{{ request.feedback_comment }}</span>
              </div>
              <div v-if="getFundsApplicationFiles(request).length > 0" class="detail-row">
                <span class="detail-label">申请附件：</span>
                <span class="detail-value">
                  {{ getFundsApplicationFiles(request).map((f: any) => f.file_name).join('、') }}
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">反馈时间：</span>
                <span class="detail-value">{{ formatDateTime(request.feedback_date) }}</span>
              </div>
            </div>

            <div class="feedback-form" v-if="activeFormKey === formKey('funds', request.id)">
              <div class="form-divider"></div>
              <h5 class="form-title">提交成果反馈 · 经费申请</h5>
              <form @submit.prevent="submitResult('funds', request.id)">
                <div class="form-group">
                  <label class="form-label required">成果描述</label>
                  <textarea
                    v-model="resultDescription"
                    class="form-textarea"
                    placeholder="请详细描述经费使用成果..."
                    rows="5"
                    required
                  ></textarea>
                </div>

                <div class="form-group">
                  <label class="form-label">附件材料（可选）</label>
                  <div class="upload-area">
                    <input
                      type="file"
                      :id="'file-input-funds-' + request.id"
                      @change="handleFileChange"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      style="display: none"
                    />
                    <label :for="'file-input-funds-' + request.id" class="upload-btn">
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
                  <button type="button" class="btn btn-secondary" @click="cancelForm">取消</button>
                  <button type="submit" class="btn btn-primary" :disabled="submitting">
                    {{ submitting ? '提交中...' : '提交成果' }}
                  </button>
                </div>
              </form>
            </div>

            <div v-else class="action-area">
              <button class="btn btn-primary" @click="showForm('funds', request.id)">
                提交成果反馈
              </button>
            </div>
          </div>
            </div>
          </template>
        </template>
      </div>

      <!-- 已提交的成果反馈列表 -->
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">📜</span>
            已提交的成果反馈
          </h3>
        </div>

        <div v-if="loadingCompleted" class="loading-state">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <div v-else-if="completedFeedback.length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <p>暂无已提交的成果反馈</p>
        </div>

        <div v-else class="requests-grid">
          <div 
            v-for="item in completedFeedback" 
            :key="item.id" 
            class="request-card"
          >
            <div class="card-header" @click="goToDetail(item)">
              <span
                class="type-badge"
                :class="item.request_type === 'funds' ? 'type-funds' : 'type-service'"
              >
                {{ item.request_type === 'funds' ? '经费申请' : '服务申请' }}
              </span>
              <span class="card-project-title">{{ item.project_title }}</span>
              <span class="card-status completed">已完成</span>
            </div>
            <div class="card-body" @click="goToDetail(item)">
              <div class="card-info">
                <span class="info-label">项目编号</span>
                <span class="info-value">{{ item.project_code || '-' }}</span>
              </div>
              <div class="card-info">
                <span class="info-label">成果描述</span>
                <span class="info-value desc-text">{{ item.result_description?.substring(0, 50) }}{{ item.result_description?.length > 50 ? '...' : '' }}</span>
              </div>
              <div class="card-info">
                <span class="info-label">提交时间</span>
                <span class="info-value">{{ formatDateTime(item.result_date) }}</span>
              </div>
              <div
                v-if="item.request_type === 'funds' && getFundsResultFiles(item).length > 0"
                class="card-info attachments-row"
              >
                <span class="info-label">成果附件</span>
                <span class="info-value">
                  <a
                    v-for="file in getFundsResultFiles(item)"
                    :key="file.id"
                    class="attachment-link-inline"
                    :href="getFundsFileUrl(file.id)"
                    target="_blank"
                    @click.stop
                  >
                    📎 {{ file.file_name }}
                  </a>
                </span>
              </div>
            </div>
            <div class="card-footer">
              <button class="btn-view-detail" @click.stop="goToDetail(item)">查看详情</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getApiBaseUrl } from '@/utils/request'
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import axios from 'axios'
import { formatServiceCategoriesDisplay } from '@/constants/incubationCategories'

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
type RequestType = 'incubation' | 'funds'

const loading = ref(false)
const loadingCompleted = ref(false)
const submitting = ref(false)
const pendingServiceFeedback = ref<any[]>([])
const pendingFundsFeedback = ref<any[]>([])
const completedFeedback = ref<any[]>([])
const activeFormKey = ref<string | null>(null)
const resultDescription = ref('')
const uploadedFiles = ref<File[]>([])

const formKey = (type: RequestType, id: string) => `${type}:${id}`

const formatAmount = (v: number | string | null | undefined) => {
  const n = Number(v) || 0
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const fundsFeedbackLabel = (action: string) =>
  ({
    approved: '全部批准',
    partial_approved: '部分批准',
    rejected: '全部拒绝',
  })[action] || action

// 加载数据
const loadPendingFeedback = async () => {
  loading.value = true
  try {
    const [svcRes, fundsRes] = await Promise.all([
      api.get('/incubation/my-requests', { params: { status: 'feedback_given' } }),
      api.get('/applicant/funds-requests', { params: { status: 'feedback_given' } }),
    ])
    if (svcRes.data.success) {
      pendingServiceFeedback.value = (svcRes.data.data || []).filter(
        (r: any) => r.feedback_action === 'approved',
      )
    }
    if (fundsRes.data.success) {
      pendingFundsFeedback.value = (fundsRes.data.data || []).filter((r: any) =>
        ['approved', 'partial_approved'].includes(r.feedback_action),
      )
    }
  } catch (error) {
    console.error('加载待反馈列表失败:', error)
  } finally {
    loading.value = false
  }
}

const loadCompletedFeedback = async () => {
  loadingCompleted.value = true
  try {
    const [svcRes, fundsRes] = await Promise.all([
      api.get('/incubation/my-requests', { params: { status: 'result_submitted' } }),
      api.get('/applicant/funds-requests', { params: { status: 'result_submitted' } }),
    ])
    const merged: any[] = []
    if (svcRes.data.success) {
      for (const r of svcRes.data.data || []) {
        merged.push({ ...r, request_type: 'incubation' as const })
      }
    }
    if (fundsRes.data.success) {
      for (const r of fundsRes.data.data || []) {
        merged.push({ ...r, request_type: 'funds' as const })
      }
    }
    merged.sort(
      (a, b) =>
        new Date(b.result_date || b.created_at).getTime() -
        new Date(a.result_date || a.created_at).getTime(),
    )
    completedFeedback.value = merged
  } catch (error) {
    console.error('加载已完成列表失败:', error)
  } finally {
    loadingCompleted.value = false
  }
}

const showForm = (type: RequestType, requestId: string) => {
  activeFormKey.value = formKey(type, requestId)
  resultDescription.value = ''
  uploadedFiles.value = []
}

const cancelForm = () => {
  activeFormKey.value = null
  resultDescription.value = ''
  uploadedFiles.value = []
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

// 提交成果
const submitResult = async (type: RequestType, requestId: string) => {
  if (!resultDescription.value.trim()) {
    ElMessage.warning('请填写成果描述')
    return
  }

  submitting.value = true
  try {
    let ok = false
    if (type === 'incubation') {
      const res = await api.put(`/incubation/requests/${requestId}/result`, {
        result_description: resultDescription.value.trim(),
      })
      ok = res.data.success
      if (ok && uploadedFiles.value.length > 0) {
        for (const file of uploadedFiles.value) {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('progress_id', requestId)
          formData.append('attachment_type', 'result')
          await api.post('/incubation/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        }
      }
    } else {
      const res = await api.put(`/applicant/funds-requests/${requestId}/result`, {
        result_description: resultDescription.value.trim(),
      })
      ok = res.data.success
      if (ok && uploadedFiles.value.length > 0) {
        for (const file of uploadedFiles.value) {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('funds_request_id', requestId)
          formData.append('attachment_type', 'result')
          try {
            await api.post('/applicant/funds-requests/upload', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            })
          } catch (uploadErr: any) {
            ElMessage.warning(
              uploadErr.response?.data?.error || `附件「${file.name}」上传失败，成果描述已保存`,
            )
          }
        }
      }
    }

    if (ok) {
      ElMessage.success('成果反馈提交成功')
      activeFormKey.value = null
      resultDescription.value = ''
      uploadedFiles.value = []
      loadPendingFeedback()
      loadCompletedFeedback()
    }
  } catch (error: any) {
    console.error('提交成果反馈失败:', error)
    ElMessage.error(error.response?.data?.error || '提交成果反馈失败')
  } finally {
    submitting.value = false
  }
}

const goBack = () => {
  router.push('/applicant/dashboard')
}

const goToDetail = (item: { id: string; request_type?: string }) => {
  if (item.request_type === 'funds') {
    router.push(`/funds-request/${item.id}?from=result-feedback`)
  } else {
    router.push(`/incubation/request/${item.id}?from=result-feedback`)
  }
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

const getApplicationFiles = (request: any) => {
  return (request.files || []).filter((f: any) => f.attachment_type === 'application')
}

const getFeedbackFiles = (request: any) => {
  return (request.files || []).filter((f: any) => f.attachment_type === 'feedback')
}

const getResultFiles = (request: any) => {
  return (request.files || []).filter((f: any) => f.attachment_type === 'result')
}

const getFundsApplicationFiles = (request: any) =>
  (request.files || []).filter((f: any) => f.attachment_type === 'application')

const getFundsResultFiles = (request: any) =>
  (request.files || []).filter((f: any) => f.attachment_type === 'result')

const getFundsFileUrl = (fileId: string) => {
  if (!fileId) return '#'
  const token = localStorage.getItem('token')
  return `${API_BASE_URL}/funds-requests/files/${fileId}?token=${token}`
}

onMounted(async () => {
  const requestId = route.query.requestId as string
  const type = (route.query.type as string) || 'incubation'
  await loadPendingFeedback()
  loadCompletedFeedback()
  if (requestId) {
    if (type === 'funds') {
      activeFormKey.value = formKey('funds', requestId)
    } else {
      activeFormKey.value = formKey('incubation', requestId)
    }
  }
})
</script>

<style scoped>
.result-feedback-page {
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

.subsection-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 24px 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: #2c3e50;
}

.subsection-title:first-of-type {
  margin-top: 0;
}

.type-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.5;
  flex-shrink: 0;
}

.type-service {
  background: #e8f4ff;
  color: #1890ff;
  border: 1px solid #91d5ff;
}

.type-funds {
  background: #fff7e6;
  color: #d48806;
  border: 1px solid #ffd591;
}

.request-info .type-badge {
  margin-right: 8px;
}

.request-item-funds {
  border-left: 3px solid #faad14;
}

.card-header {
  flex-wrap: wrap;
  gap: 8px;
}

.card-header .type-badge {
  margin-right: 4px;
}

.header-subtitle {
  color: #999;
  font-size: 14px;
}

.content-wrapper {
  padding: 24px;
  max-width: 1000px;
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

/* 请求列表 */
.requests-list,
.feedback-list {
  padding: 16px;
}

.request-item,
.feedback-item {
  padding: 20px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  margin-bottom: 12px;
}

.request-item:last-child,
.feedback-item:last-child {
  margin-bottom: 0;
}

.request-header,
.feedback-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.request-info,
.feedback-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.project-code {
  font-size: 12px;
  color: #b31b1b;
  background: rgba(179, 27, 27, 0.06);
  padding: 2px 8px;
  border-radius: 4px;
  width: fit-content;
}

.project-title {
  margin: 0;
  font-size: 16px;
  color: #333;
  font-weight: 500;
}

.status-badge {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  white-space: nowrap;
}

.status-badge.pending {
  background: #fff7e6;
  color: #fa8c16;
}

.status-badge.completed {
  background: #f6ffed;
  color: #52c41a;
}

/* 详情 */
.request-details,
.feedback-details {
  background: #fafafa;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
}

.detail-row {
  display: flex;
  margin-bottom: 8px;
  font-size: 14px;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-label {
  color: #999;
  min-width: 80px;
}

.detail-value {
  color: #333;
  flex: 1;
}

.detail-value.success {
  color: #52c41a;
  font-weight: 500;
}

/* 表单 */
.feedback-form {
  margin-top: 16px;
}

.form-divider {
  height: 1px;
  background: #f0f0f0;
  margin-bottom: 16px;
}

.form-title {
  margin: 0 0 16px 0;
  font-size: 15px;
  color: #333;
}

.form-group {
  margin-bottom: 16px;
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

.upload-area {
  display: flex;
  align-items: center;
  gap: 12px;
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
  margin-top: 16px;
}

.action-area {
  display: flex;
  justify-content: flex-end;
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

/* 附件 */
.attachments-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #f0f0f0;
}

.attachments-title {
  font-size: 13px;
  color: #999;
  margin-bottom: 8px;
}

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
  background: #f5f5f5;
  border-radius: 4px;
  color: #333;
  text-decoration: none;
  font-size: 13px;
  transition: all 0.3s;
}

.attachment-link:hover {
  background: #e8e8e8;
  color: #b31b1b;
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

/* 内联附件样式 */
.attachments-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.attachment-group {
  margin-bottom: 8px;
}

.attachment-group-label {
  font-size: 12px;
  color: #666;
  margin-right: 8px;
}

/* 卡片网格样式 */
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

.card-info .desc-text {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
</style>
