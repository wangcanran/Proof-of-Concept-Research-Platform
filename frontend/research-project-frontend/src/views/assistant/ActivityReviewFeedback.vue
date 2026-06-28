<!-- 活动审批反馈（仿服务申请反馈页） -->
<template>
  <div class="service-feedback-page">
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回</span>
        </button>
        <h1>活动审批</h1>
        <div class="header-subtitle">查看活动信息并给出审批意见</div>
      </div>
    </div>

    <div class="content-wrapper">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>

      <template v-else-if="record">
        <div class="section-card">
          <div class="section-header">
            <h3 class="section-title"><span class="section-icon">📋</span>活动信息</h3>
          </div>
          <div class="request-info">
            <div class="info-row"><span class="info-label">活动标题</span><span class="info-value">{{ record.title }}</span></div>
            <div class="info-row"><span class="info-label">活动日期</span><span class="info-value">{{ formatDate(record.record_date) }}</span></div>
            <div class="info-row"><span class="info-label">所属项目</span><span class="info-value">{{ record.project_title || '-' }}</span></div>
            <div class="info-row"><span class="info-label">项目编号</span><span class="info-value">{{ record.project_code || '-' }}</span></div>
            <div class="info-row"><span class="info-label">登记人</span><span class="info-value">{{ record.creator_name || '-' }}</span></div>
            <div class="info-row full-width"><span class="info-label">活动说明</span><span class="info-value pre-wrap">{{ record.description || '—' }}</span></div>
            <div class="info-row"><span class="info-label">登记时间</span><span class="info-value">{{ formatDateTime(record.created_at) }}</span></div>
          </div>
          <div class="attachments-section">
            <h4 class="attachments-title">附件材料</h4>
            <div v-if="files.length" class="attachments-list">
              <a v-for="file in files" :key="file.id" class="attachment-item" :href="getFileUrl(file.id)" target="_blank">
                <span>📎</span>
                <span>{{ file.file_name }}</span>
              </a>
            </div>
            <span v-else class="muted-text">—</span>
          </div>
        </div>

        <div class="section-card form-section">
          <div class="section-header">
            <h3 class="section-title"><span class="section-icon">✏️</span>填写审批</h3>
          </div>
          <form class="feedback-form" @submit.prevent="submitReview">
            <div class="form-group">
              <label class="form-label required">审批结果</label>
              <div class="radio-group">
                <label class="radio-item" :class="{ active: action === 'approve' }">
                  <input v-model="action" type="radio" value="approve" />
                  <span class="radio-label">确认通过</span>
                </label>
                <label class="radio-item" :class="{ active: action === 'reject' }">
                  <input v-model="action" type="radio" value="reject" />
                  <span class="radio-label">驳回</span>
                </label>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">审批意见</label>
              <textarea v-model="comment" class="form-textarea" rows="5" placeholder="请填写审批意见（可选）..." />
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" @click="goBack">取消</button>
              <button type="submit" class="btn btn-primary" :disabled="submitting">{{ submitting ? '提交中...' : '提交审批' }}</button>
            </div>
          </form>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import request, { getApiBaseUrl } from '@/utils/request'

const route = useRoute()
const router = useRouter()
const API_BASE_URL = getApiBaseUrl()

const loading = ref(false)
const submitting = ref(false)
const record = ref<any>(null)
const action = ref<'approve' | 'reject'>('approve')
const comment = ref('')

const files = computed(() => record.value?.files || [])

function formatDate(d?: string) {
  return d ? new Date(d).toLocaleDateString('zh-CN') : '-'
}

function formatDateTime(d?: string) {
  return d ? new Date(d).toLocaleString('zh-CN') : '-'
}

function getFileUrl(fileId: string) {
  const token = localStorage.getItem('token')
  return `${API_BASE_URL}/api/incubation-achievements/files/${fileId}?token=${token}`
}

async function loadData() {
  loading.value = true
  try {
    const res = await request.get(`/api/activity-records/${route.params.id}`)
    if (res.success && res.data) {
      if (res.data.status !== 'submitted') {
        ElMessage.warning('该活动已审批，无法重复操作')
        router.back()
        return
      }
      record.value = res.data
    }
  } catch {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

async function submitReview() {
  submitting.value = true
  try {
    const res = await request.post(`/api/assistant/incubation-achievements/${route.params.id}/review`, {
      action: action.value,
      comment: comment.value.trim() || null,
    })
    if (res.success) {
      ElMessage.success('审批已提交')
      router.push('/assistant/activity-achievements')
    } else {
      ElMessage.error(res.error || '提交失败')
    }
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '提交失败')
  } finally {
    submitting.value = false
  }
}

function goBack() {
  router.back()
}

onMounted(loadData)
</script>

<style scoped>
.service-feedback-page { min-height: 100vh; background: #f5f7fa; }
.page-header { background: white; padding: 20px 32px; border-bottom: 1px solid #f0f0f0; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.header-left { display: flex; flex-direction: column; gap: 8px; }
.back-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: #f5f5f5; border: 1px solid #e8e8e8; border-radius: 6px; color: #666; cursor: pointer; width: fit-content; border: none; font: inherit; }
.page-header h1 { margin: 0; font-size: 24px; color: #2c3e50; font-weight: 600; }
.header-subtitle { color: #999; font-size: 14px; }
.content-wrapper { padding: 24px; max-width: 900px; margin: 0 auto; }
.section-card { background: white; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); margin-bottom: 24px; overflow: hidden; }
.section-header { padding: 20px 24px; border-bottom: 1px solid #f0f0f0; }
.section-title { margin: 0; font-size: 18px; color: #2c3e50; display: flex; align-items: center; gap: 8px; }
.request-info { padding: 24px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.info-row { display: flex; gap: 12px; }
.info-row.full-width { grid-column: 1 / -1; flex-direction: column; gap: 8px; }
.info-label { min-width: 80px; color: #666; font-size: 14px; font-weight: 500; }
.info-value { flex: 1; color: #333; font-size: 14px; }
.info-value.pre-wrap { white-space: pre-wrap; line-height: 1.6; background: #fafafa; padding: 12px; border-radius: 6px; }
.attachments-section { padding: 0 24px 24px; }
.attachments-list { display: flex; flex-wrap: wrap; gap: 12px; }
.attachment-item { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #fafafa; border: 1px solid #e8e8e8; border-radius: 6px; color: #333; text-decoration: none; font-size: 14px; }
.attachments-title { margin: 0 0 12px; font-size: 14px; color: #666; font-weight: 500; }
.muted-text { color: #999; font-size: 14px; }
.form-section { border: 2px solid #b31b1b; }
.feedback-form { padding: 24px; }
.form-group { margin-bottom: 24px; }
.form-label { display: block; margin-bottom: 8px; font-size: 14px; color: #333; font-weight: 500; }
.form-label.required::after { content: '*'; color: #ff4d4f; margin-left: 4px; }
.radio-group { display: flex; gap: 16px; }
.radio-item { display: flex; align-items: center; padding: 12px 24px; background: #f5f5f5; border: 2px solid #e8e8e8; border-radius: 8px; cursor: pointer; }
.radio-item input { display: none; }
.radio-item.active { background: #fff; border-color: #b31b1b; }
.form-textarea { width: 100%; padding: 12px; border: 1px solid #d9d9d9; border-radius: 6px; font-size: 14px; resize: vertical; box-sizing: border-box; }
.form-actions { display: flex; justify-content: flex-end; gap: 12px; }
.btn { padding: 10px 24px; border-radius: 6px; font-size: 14px; cursor: pointer; border: none; }
.btn-secondary { background: #f5f5f5; color: #666; border: 1px solid #e8e8e8; }
.btn-primary { background: #b31b1b; color: white; }
.loading-state { padding: 60px; text-align: center; color: #999; }
.loading-spinner { width: 32px; height: 32px; border: 3px solid #f0f0f0; border-top-color: #b31b1b; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
