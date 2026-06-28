<!-- 转化成果详情 -->
<template>
  <div class="incubation-request-detail">
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-workbench-box" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回</span>
        </button>
        <h1>转化成果详情</h1>
        <div class="header-meta" v-if="achievement">
          <span class="project-no-tag">{{ achievement.project?.project_code || '暂未编号' }}</span>
          <div class="status-badge" :class="getStatusClass(achievement.status)">
            {{ getStatusText(achievement.status) }}
          </div>
        </div>
      </div>
      <div class="header-actions" v-if="isPM && achievement?.status === 'submitted'">
        <button class="action-btn primary" @click="goToReview">审核转化成果</button>
      </div>
    </div>

    <div v-if="loading && !achievement" class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">正在加载转化成果详情...</div>
    </div>

    <template v-if="achievement">
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
            <div class="content-box">{{ achievement.project?.title || '未设置' }}</div>
          </div>
          <div class="section">
            <h3 class="section-title">登记人信息</h3>
            <div class="content-box">
              <div class="info-row">
                <span class="row-label">姓名</span>
                <span class="row-value">{{ creatorName || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="row-label">邮箱</span>
                <span class="row-value">{{ creatorEmail || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="row-label">电话</span>
                <span class="row-value">{{ creatorPhone || '-' }}</span>
              </div>
            </div>
          </div>
          <div class="section">
            <h3 class="section-title">项目负责人</h3>
            <div class="content-box">{{ achievement.project_leader || '-' }}</div>
          </div>
          <div class="section">
            <h3 class="section-title">审核状态</h3>
            <div class="content-box">
              <span class="status-tag" :class="getStatusClass(achievement.status)">
                {{ getStatusText(achievement.status) }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'transformInfo'" class="tab-panel">
          <div class="section">
            <h3 class="section-title">转化方式</h3>
            <div class="content-box">{{ getMethodLabel(achievement.transform_method) }}</div>
          </div>
          <div class="section" v-if="achievement.platform_service_content">
            <h3 class="section-title">平台提供服务内容</h3>
            <div class="content-box pre-wrap">{{ achievement.platform_service_content }}</div>
          </div>

          <template v-if="isContractMethod">
            <div class="section">
              <h3 class="section-title">转化时间</h3>
              <div class="content-box">{{ formatDate(achievement.transform_date) }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">承接方公司名称</h3>
              <div class="content-box">{{ achievement.recipient_company || '-' }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">承接方地址</h3>
              <div class="content-box">
                {{ [achievement.recipient_province, achievement.recipient_city, achievement.recipient_district].filter(Boolean).join(' ') || '-' }}
              </div>
            </div>
            <div class="section">
              <h3 class="section-title">合同金额（万元）</h3>
              <div class="content-box">{{ formatAmount(achievement.contract_amount) }}</div>
            </div>
          </template>

          <template v-if="isStartupMethod">
            <div class="section">
              <h3 class="section-title">公司名称</h3>
              <div class="content-box">{{ achievement.company_name || '-' }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">统一社会信用代码</h3>
              <div class="content-box">{{ achievement.company_credit_code || '-' }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">成立时间</h3>
              <div class="content-box">{{ formatDate(achievement.establishment_date) }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">注册地址</h3>
              <div class="content-box">{{ achievement.registered_address || '-' }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">公司简介</h3>
              <div class="content-box pre-wrap">{{ achievement.company_introduction || '未填写' }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">获投融资（万元）</h3>
              <div class="content-box">{{ formatAmount(achievement.invested_amount) }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">实缴金额（万元）</h3>
              <div class="content-box">{{ formatAmount(achievement.paid_in_amount) }}</div>
            </div>
          </template>

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
            <div class="content-box">{{ formatDateTime(achievement.created_at) }}</div>
          </div>
        </div>

        <div v-if="activeTab === 'reviewInfo'" class="tab-panel">
          <template v-if="achievement.status === 'submitted'">
            <div class="empty-section">
              <span class="empty-icon">⏳</span>
              <p>暂未审核</p>
            </div>
          </template>
          <template v-else-if="achievement.status === 'verified' || achievement.status === 'rejected'">
            <div class="section">
              <h3 class="section-title">审核结果</h3>
              <div class="content-box">
                <span class="feedback-tag" :class="achievement.status === 'verified' ? 'verified' : 'rejected'">
                  {{ achievement.status === 'verified' ? '已核实' : '已驳回' }}
                </span>
              </div>
            </div>
            <div class="section">
              <h3 class="section-title">审核意见</h3>
              <div class="content-box pre-wrap">{{ achievement.verification_comment || '—' }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">审核人</h3>
              <div class="content-box">{{ verifierName || '—' }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">审核时间</h3>
              <div class="content-box">{{ achievement.verified_date ? formatDateTime(achievement.verified_date) : '—' }}</div>
            </div>
          </template>
          <template v-else>
            <div class="empty-section">
              <span class="empty-icon">📝</span>
              <p>草稿状态，尚未提交审核</p>
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
import {
  transformationAchievementAPI,
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
  status: string
  transform_method: string
  transform_method_label?: string
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
  verification_comment?: string
  verified_date?: string
  created_at?: string
  created_by_name?: string
  verified_by_name?: string
  project?: { title?: string; project_code?: string }
  creator_info?: { name?: string; email?: string; phone?: string }
  files?: TransformationFile[]
}

const route = useRoute()
const router = useRouter()
const API_BASE_URL = getApiBaseUrl()

const loading = ref(false)
const achievement = ref<TransformationAchievement | null>(null)
const activeTab = ref('basicInfo')
const isPM = computed(() => localStorage.getItem('role') === 'project_manager')

const tabs = [
  { key: 'basicInfo', label: '基本信息' },
  { key: 'transformInfo', label: '转化信息' },
  { key: 'reviewInfo', label: '审核信息' },
]

const files = computed(() => achievement.value?.files || [])
const isContractMethod = computed(() => CONTRACT_METHODS.includes(achievement.value?.transform_method || ''))
const isStartupMethod = computed(() => achievement.value?.transform_method === 'startup_company')

const creatorName = computed(
  () => achievement.value?.created_by_name || achievement.value?.creator_info?.name || '',
)
const creatorEmail = computed(
  () => (achievement.value as TransformationAchievement & { created_by_email?: string })?.created_by_email
    || achievement.value?.creator_info?.email || '',
)
const creatorPhone = computed(
  () => (achievement.value as TransformationAchievement & { created_by_phone?: string })?.created_by_phone
    || achievement.value?.creator_info?.phone || '',
)
const verifierName = computed(() => achievement.value?.verified_by_name || '')

const getMethodLabel = (method?: string) => {
  if (!method) return '-'
  return TRANSFORM_METHODS.find((m) => m.value === method)?.label
    || achievement.value?.transform_method_label
    || method
}

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    draft: 'pending',
    submitted: 'pending',
    verified: 'verified',
    rejected: 'rejected',
  }
  return map[status] || ''
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    draft: '草稿',
    submitted: '待审核',
    verified: '已核实',
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

const formatAmount = (val?: number | string | null) => {
  if (val == null || val === '') return '-'
  return String(val)
}

const getFileUrl = (fileId: string) => {
  const token = localStorage.getItem('token')
  return `${API_BASE_URL}/transformation-achievements/files/${fileId}?token=${token}`
}

const loadAchievement = async () => {
  const id = route.params.id as string
  if (!id) return
  loading.value = true
  try {
    const res = await transformationAchievementAPI.get(id)
    if (res.success && res.data) {
      achievement.value = res.data as TransformationAchievement
    } else {
      ElMessage.error('加载转化成果详情失败')
    }
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

const goBack = () => router.back()
const goToReview = () => router.push(`/assistant/transformation-achievements/${route.params.id}/review`)

onMounted(loadAchievement)
</script>

<style>
@import '@/styles/incubation-detail-shared.css';
</style>
