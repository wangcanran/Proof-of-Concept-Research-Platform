<!-- 转化成果审核反馈 -->
<template>
  <div class="service-feedback-page">
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回</span>
        </button>
        <h1>转化成果审核</h1>
        <div class="header-subtitle">查看转化成果信息并给出审核意见</div>
      </div>
    </div>

    <div class="content-wrapper">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>

      <template v-else-if="achievement">
        <div class="section-card">
          <div class="section-header">
            <h3 class="section-title"><span class="section-icon">📋</span>转化成果信息</h3>
          </div>
          <div class="request-info">
            <div class="info-row"><span class="info-label">成果名称</span><span class="info-value">{{ achievement.title }}</span></div>
            <div class="info-row"><span class="info-label">转化方式</span><span class="info-value">{{ methodLabel(achievement.transform_method) }}</span></div>
            <div class="info-row"><span class="info-label">所属项目</span><span class="info-value">{{ achievement.project?.title || '-' }}</span></div>
            <div class="info-row"><span class="info-label">项目编号</span><span class="info-value">{{ achievement.project?.project_code || '-' }}</span></div>
            <div class="info-row"><span class="info-label">项目负责人</span><span class="info-value">{{ achievement.project_leader || '-' }}</span></div>
            <div class="info-row"><span class="info-label">登记人</span><span class="info-value">{{ creatorName }}</span></div>
            <div v-if="achievement.platform_service_content" class="info-row full-width">
              <span class="info-label">平台提供服务内容</span>
              <span class="info-value pre-wrap">{{ achievement.platform_service_content }}</span>
            </div>
            <template v-if="isContractMethod">
              <div class="info-row"><span class="info-label">转化时间</span><span class="info-value">{{ formatDate(achievement.transform_date) }}</span></div>
              <div class="info-row"><span class="info-label">承接方公司名称</span><span class="info-value">{{ achievement.recipient_company || '-' }}</span></div>
              <div class="info-row full-width">
                <span class="info-label">承接方地址</span>
                <span class="info-value">{{ recipientAddress }}</span>
              </div>
              <div class="info-row"><span class="info-label">合同金额（万元）</span><span class="info-value">{{ formatAmount(achievement.contract_amount) }}</span></div>
            </template>
            <template v-if="isStartupMethod">
              <div class="info-row"><span class="info-label">公司名称</span><span class="info-value">{{ achievement.company_name || '-' }}</span></div>
              <div class="info-row"><span class="info-label">统一社会信用代码</span><span class="info-value">{{ achievement.company_credit_code || '-' }}</span></div>
              <div class="info-row"><span class="info-label">成立时间</span><span class="info-value">{{ formatDate(achievement.establishment_date) }}</span></div>
              <div class="info-row full-width"><span class="info-label">注册地址</span><span class="info-value">{{ achievement.registered_address || '-' }}</span></div>
              <div class="info-row full-width"><span class="info-label">公司简介</span><span class="info-value pre-wrap">{{ achievement.company_introduction || '—' }}</span></div>
              <div class="info-row"><span class="info-label">获投融资（万元）</span><span class="info-value">{{ formatAmount(achievement.invested_amount) }}</span></div>
              <div class="info-row"><span class="info-label">实缴金额（万元）</span><span class="info-value">{{ formatAmount(achievement.paid_in_amount) }}</span></div>
            </template>
            <div class="info-row"><span class="info-label">登记时间</span><span class="info-value">{{ formatDateTime(achievement.created_at) }}</span></div>
          </div>
          <div class="attachments-section">
            <h4 class="attachments-title">附件材料</h4>
            <div v-if="files.length" class="attachments-list">
              <a v-for="file in files" :key="file.id" class="attachment-item" :href="getFileUrl(file.id)" target="_blank">
                <span class="attachment-icon">📎</span>
                <span class="attachment-name">{{ file.file_name }}</span>
              </a>
            </div>
            <span v-else class="muted-text">—</span>
          </div>
        </div>

        <div class="section-card form-section">
          <div class="section-header">
            <h3 class="section-title"><span class="section-icon">✏️</span>填写审核</h3>
          </div>
          <form class="feedback-form" @submit.prevent="submitReview">
            <div class="form-group">
              <label class="form-label required">审核结果</label>
              <div class="radio-group">
                <label class="radio-item" :class="{ active: recommendation === 'verify' }">
                  <input v-model="recommendation" type="radio" value="verify" />
                  <span class="radio-label">核实通过</span>
                </label>
                <label class="radio-item" :class="{ active: recommendation === 'reject' }">
                  <input v-model="recommendation" type="radio" value="reject" />
                  <span class="radio-label">驳回</span>
                </label>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label required">审核意见</label>
              <textarea v-model="comment" class="form-textarea" rows="5" placeholder="请填写审核意见..." required />
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" @click="goBack">取消</button>
              <button type="submit" class="btn btn-primary" :disabled="submitting">{{ submitting ? '提交中...' : '提交审核' }}</button>
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
import {
  transformationAchievementAPI,
  assistantTransformationAPI,
  TRANSFORM_METHODS,
} from '@/api/transformationAchievements'
import { getApiBaseUrl } from '@/utils/request'

const CONTRACT_METHODS = ['tech_license', 'tech_transfer', 'equity_investment']

interface TransformationFile {
  id: string
  file_name: string
}

interface TransformationAchievement {
  id: string
  title?: string
  status: string
  transform_method: string
  project_leader?: string
  platform_service_content?: string
  transform_date?: string
  recipient_company?: string
  recipient_province?: string
  recipient_city?: string
  recipient_district?: string
  contract_amount?: number | string
  company_name?: string
  company_credit_code?: string
  establishment_date?: string
  registered_address?: string
  company_introduction?: string
  invested_amount?: number | string
  paid_in_amount?: number | string
  created_at?: string
  project?: { title?: string; project_code?: string }
  created_by_name?: string
  creator_info?: { name?: string }
  files?: TransformationFile[]
}

const route = useRoute()
const router = useRouter()
const API_BASE_URL = getApiBaseUrl()

const loading = ref(false)
const submitting = ref(false)
const achievement = ref<TransformationAchievement | null>(null)
const recommendation = ref<'verify' | 'reject'>('verify')
const comment = ref('')

const files = computed(() => achievement.value?.files || [])
const isContractMethod = computed(() => CONTRACT_METHODS.includes(achievement.value?.transform_method || ''))
const isStartupMethod = computed(() => achievement.value?.transform_method === 'startup_company')
const creatorName = computed(
  () => achievement.value?.created_by_name || achievement.value?.creator_info?.name || '-',
)
const recipientAddress = computed(() => {
  const a = achievement.value
  if (!a) return '-'
  const parts = [a.recipient_province, a.recipient_city, a.recipient_district].filter(Boolean)
  return parts.length ? parts.join(' ') : '-'
})

function methodLabel(method: string) {
  return TRANSFORM_METHODS.find((m) => m.value === method)?.label || method
}

function formatDate(d?: string) {
  return d ? new Date(d).toLocaleDateString('zh-CN') : '-'
}

function formatDateTime(d?: string) {
  return d ? new Date(d).toLocaleString('zh-CN') : '-'
}

function formatAmount(val?: number | string | null) {
  if (val == null || val === '') return '-'
  const num = Number(val)
  if (Number.isNaN(num)) return String(val)
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getFileUrl(fileId: string) {
  const token = localStorage.getItem('token')
  return `${API_BASE_URL}/transformation-achievements/files/${fileId}?token=${token}`
}

async function loadData() {
  const id = route.params.id as string
  loading.value = true
  try {
    const res = await transformationAchievementAPI.get(id)
    if (res.success && res.data) {
      if (res.data.status !== 'submitted') {
        ElMessage.warning('该成果已审核，无法重复操作')
        router.back()
        return
      }
      achievement.value = res.data as TransformationAchievement
    }
  } catch {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

async function submitReview() {
  if (!comment.value.trim()) {
    ElMessage.warning('请填写审核意见')
    return
  }
  submitting.value = true
  try {
    const res = await assistantTransformationAPI.review(route.params.id as string, {
      recommendation: recommendation.value,
      comment: comment.value.trim(),
    })
    if (res.success) {
      ElMessage.success('审核已提交')
      router.push('/assistant/transformation-achievements')
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
.back-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: #f5f5f5; border: 1px solid #e8e8e8; border-radius: 6px; color: #666; cursor: pointer; width: fit-content; }
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
.attachments-title { margin: 0 0 12px; font-size: 14px; color: #666; font-weight: 500; }
.attachments-list { display: flex; flex-wrap: wrap; gap: 12px; }
.attachment-item { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #fafafa; border: 1px solid #e8e8e8; border-radius: 6px; color: #333; text-decoration: none; font-size: 14px; }
.muted-text { color: #999; font-size: 14px; }
.form-section { border: 2px solid #b31b1b; }
.feedback-form { padding: 24px; }
.form-group { margin-bottom: 24px; }
.form-label { display: block; margin-bottom: 8px; font-size: 14px; color: #333; font-weight: 500; }
.form-label.required::after { content: '*'; color: #ff4d4f; margin-left: 4px; }
.radio-group { display: flex; gap: 16px; }
.radio-item { display: flex; align-items: center; gap: 8px; padding: 12px 24px; background: #f5f5f5; border: 2px solid #e8e8e8; border-radius: 8px; cursor: pointer; }
.radio-item input { display: none; }
.radio-item.active { background: #fff; border-color: #b31b1b; }
.radio-item.active .radio-label { color: #b31b1b; font-weight: 500; }
.form-textarea { width: 100%; padding: 12px; border: 1px solid #d9d9d9; border-radius: 6px; font-size: 14px; resize: vertical; box-sizing: border-box; }
.form-actions { display: flex; justify-content: flex-end; gap: 12px; }
.btn { padding: 10px 24px; border-radius: 6px; font-size: 14px; cursor: pointer; border: none; }
.btn-secondary { background: #f5f5f5; color: #666; border: 1px solid #e8e8e8; }
.btn-primary { background: #b31b1b; color: white; }
.loading-state { padding: 60px; text-align: center; color: #999; }
.loading-spinner { width: 32px; height: 32px; border: 3px solid #f0f0f0; border-top-color: #b31b1b; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
