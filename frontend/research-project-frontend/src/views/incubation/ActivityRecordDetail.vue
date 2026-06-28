<!-- 活动详情（与服务申请详情同布局） -->
<template>
  <div class="incubation-request-detail">
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-workbench-box" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回</span>
        </button>
        <h1>活动详情</h1>
        <div class="header-meta" v-if="record">
          <span class="project-no-tag">{{ record.project_code || '暂未编号' }}</span>
          <div class="status-badge" :class="getStatusClass(record.status)">
            {{ getStatusText(record.status) }}
          </div>
        </div>
      </div>
      <div class="header-actions" v-if="isPM && record?.status === 'submitted'">
        <button class="action-btn primary" @click="goToReview">审批活动</button>
      </div>
    </div>

    <div v-if="loading && !record" class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">正在加载活动详情...</div>
    </div>

    <template v-if="record">
      <div class="tab-navigation">
        <div class="tab-container">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="tab-btn"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="tab-content">
        <div v-if="activeTab === 'basicInfo'" class="tab-panel">
          <div class="section">
            <h3 class="section-title">项目名称</h3>
            <div class="content-box">{{ record.project_title || '未设置' }}</div>
          </div>
          <div class="section">
            <h3 class="section-title">登记人信息</h3>
            <div class="content-box">
              <div class="info-row">
                <span class="row-label">姓名</span>
                <span class="row-value">{{ record.creator_name || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="row-label">邮箱</span>
                <span class="row-value">{{ record.creator_email || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="row-label">电话</span>
                <span class="row-value">{{ record.creator_phone || '-' }}</span>
              </div>
            </div>
          </div>
          <div class="section">
            <h3 class="section-title">审批状态</h3>
            <div class="content-box">
              <span class="status-tag" :class="getStatusClass(record.status)">
                {{ getStatusText(record.status) }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'activityInfo'" class="tab-panel">
          <div class="section">
            <h3 class="section-title">活动标题</h3>
            <div class="content-box">{{ record.title || '-' }}</div>
          </div>
          <div class="section">
            <h3 class="section-title">活动日期</h3>
            <div class="content-box">{{ formatDate(record.record_date) }}</div>
          </div>
          <div class="section">
            <h3 class="section-title">活动说明</h3>
            <div class="content-box pre-wrap">{{ record.description || '暂无说明' }}</div>
          </div>
          <div class="section">
            <h3 class="section-title">附件材料</h3>
            <div class="content-box">
              <div v-if="files.length" class="attachments-list">
                <a v-for="file in files" :key="file.id" class="attachment-item" :href="getFileUrl(file.id)" target="_blank">
                  <span>📎</span>
                  <span>{{ file.file_name }}</span>
                </a>
              </div>
              <span v-else class="muted-text">暂无附件</span>
            </div>
          </div>
          <div class="section">
            <h3 class="section-title">登记时间</h3>
            <div class="content-box">{{ formatDateTime(record.created_at) }}</div>
          </div>
        </div>

        <div v-if="activeTab === 'reviewInfo'" class="tab-panel">
          <template v-if="record.status === 'submitted'">
            <div class="empty-section">
              <span class="empty-icon">⏳</span>
              <p>暂未审批</p>
            </div>
          </template>
          <template v-else>
            <div class="section">
              <h3 class="section-title">审批结果</h3>
              <div class="content-box">
                <span class="feedback-tag" :class="record.status === 'approved' ? 'approved' : 'rejected'">
                  {{ record.status === 'approved' ? '已确认' : '已驳回' }}
                </span>
              </div>
            </div>
            <div class="section">
              <h3 class="section-title">审批意见</h3>
              <div class="content-box pre-wrap">{{ record.review_comment || '—' }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">审批人</h3>
              <div class="content-box">{{ record.reviewed_by_name || '—' }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">审批时间</h3>
              <div class="content-box">{{ record.reviewed_at ? formatDateTime(record.reviewed_at) : '—' }}</div>
            </div>
          </template>
        </div>
      </div>
    </template>
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

type ActivityRecord = {
  id: string
  title: string
  description?: string
  record_date?: string
  status: string
  project_title?: string
  project_code?: string
  creator_name?: string
  creator_email?: string
  creator_phone?: string
  review_comment?: string
  reviewed_at?: string
  reviewed_by_name?: string
  created_at?: string
  files?: { id: string; file_name: string }[]
}

const loading = ref(false)
const record = ref<ActivityRecord | null>(null)
const activeTab = ref('basicInfo')
const isPM = computed(() => localStorage.getItem('role') === 'project_manager')

const tabs = [
  { key: 'basicInfo', label: '基本信息' },
  { key: 'activityInfo', label: '活动信息' },
  { key: 'reviewInfo', label: '审批信息' },
]

const files = computed(() => record.value?.files || [])

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    submitted: 'pending',
    approved: 'approved',
    rejected: 'rejected',
  }
  return map[status] || ''
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    submitted: '待审批',
    approved: '已确认',
    rejected: '已驳回',
  }
  return map[status] || status
}

const formatDate = (dateString?: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const formatDateTime = (dateString?: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

const getFileUrl = (fileId: string) => {
  const token = localStorage.getItem('token')
  return `${API_BASE_URL}/api/incubation-achievements/files/${fileId}?token=${token}`
}

const loadRecord = async () => {
  const id = route.params.id as string
  if (!id) return
  loading.value = true
  try {
    const res = await request.get(`/api/activity-records/${id}`)
    if (res.success && res.data) {
      record.value = res.data
    } else {
      ElMessage.error('加载活动详情失败')
    }
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

const goBack = () => router.back()
const goToReview = () => router.push(`/assistant/activity-achievements/${route.params.id}/review`)

onMounted(loadRecord)
</script>

<style>
@import '@/styles/incubation-detail-shared.css';
</style>
