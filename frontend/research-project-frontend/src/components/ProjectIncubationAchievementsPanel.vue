<template>
  <div class="incubation-achievements-panel">
    <div v-if="loading" class="panel-loading">
      <el-skeleton :rows="4" animated />
    </div>
    <div v-else-if="records.length === 0" class="empty-state">
      <p>暂无已通过审批的活动成果</p>
    </div>
    <div v-else class="record-list">
      <div v-for="record in records" :key="record.id" class="record-card">
        <div class="record-head">
          <div class="record-title">{{ record.title }}</div>
          <span class="record-date">{{ formatRecordDate(record) }}</span>
        </div>
        <div class="record-meta">
          <span>提交人：{{ record.creator_name || '—' }}</span>
          <span>活动日期：{{ formatRecordDate(record) }}</span>
        </div>
        <p v-if="record.description" class="record-desc">{{ record.description }}</p>
        <div v-if="record.files?.length" class="file-list">
          <div v-for="file in record.files" :key="file.id" class="file-item">
            <span class="file-icon">📎</span>
            <span class="file-link-name" :title="file.file_name">{{ file.file_name }}</span>
            <span class="file-link-size">{{ formatFileSize(file.file_size) }}</span>
            <button
              type="button"
              class="download-btn"
              :disabled="downloadingId === file.id"
              @click="downloadFile(file)"
            >
              {{ downloadingId === file.id ? '下载中...' : '下载' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import request, { getApiBaseUrl } from '@/utils/request'

const props = defineProps<{
  projectId: string
}>()

type AchievementFile = {
  id: string
  file_name: string
  file_size: number
}

type AchievementRecord = {
  id: string
  title: string
  description?: string
  record_date?: string
  created_at?: string
  creator_name?: string
  files?: AchievementFile[]
}

const loading = ref(false)
const downloadingId = ref('')
const records = ref<AchievementRecord[]>([])

function formatRecordDate(record: AchievementRecord) {
  if (record.record_date) {
    return String(record.record_date).slice(0, 10)
  }
  if (record.created_at) {
    return new Date(record.created_at).toLocaleDateString('zh-CN')
  }
  return '—'
}

function formatFileSize(size?: number) {
  if (!size) return '0 B'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

async function downloadFile(file: AchievementFile) {
  if (!file.id) return
  downloadingId.value = file.id
  try {
    const token = localStorage.getItem('token')
    const response = await fetch(
      `${getApiBaseUrl()}/incubation-achievements/files/${file.id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )
    if (!response.ok) {
      let msg = '下载失败'
      try {
        const err = await response.json()
        msg = err.error || msg
      } catch {
        /* ignore */
      }
      throw new Error(msg)
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = file.file_name || '附件'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    ElMessage.success('下载成功')
  } catch (e: any) {
    ElMessage.error(e.message || '下载失败')
  } finally {
    downloadingId.value = ''
  }
}

async function loadRecords() {
  if (!props.projectId) return
  loading.value = true
  try {
    const res = await request.get(`/api/projects/${props.projectId}/incubation-achievements`)
    if (res.success) {
      records.value = res.data || []
    } else {
      records.value = []
    }
  } catch {
    records.value = []
  } finally {
    loading.value = false
  }
}

watch(
  () => props.projectId,
  () => loadRecords(),
  { immediate: true },
)

defineExpose({ loadRecords })
</script>

<style scoped>
.incubation-achievements-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel-loading {
  padding: 8px 0;
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: #6b7280;
  background: #f9fafb;
  border-radius: 8px;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.record-card {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.record-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}

.record-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.record-date {
  flex-shrink: 0;
  font-size: 13px;
  color: #6b7280;
}

.record-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 8px;
}

.record-desc {
  margin: 0 0 10px;
  font-size: 14px;
  color: #374151;
  line-height: 1.6;
  white-space: pre-wrap;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #f3f4f6;
  border-radius: 6px;
  font-size: 13px;
}

.file-link-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #374151;
}

.file-link-size {
  color: #9ca3af;
  font-size: 12px;
  flex-shrink: 0;
}

.download-btn {
  flex-shrink: 0;
  padding: 4px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #fff;
  color: #2563eb;
  font-size: 12px;
  cursor: pointer;
}

.download-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
