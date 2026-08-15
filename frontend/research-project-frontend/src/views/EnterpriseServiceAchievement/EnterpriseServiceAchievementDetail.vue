<!-- 企业服务成果详情 -->
<template>
  <div class="incubation-request-detail">
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-workbench-box" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回</span>
        </button>
        <h1>企业服务成果详情</h1>
        <div v-if="achievement" class="detail-header-meta-row">
          <span class="project-codes-box">{{ projectCodesDisplay }}</span>
          <div class="status-badge" :class="getStatusClass(achievement.status)">
            {{ getStatusText(achievement.status) }}
          </div>
        </div>
      </div>
      <div class="header-actions" v-if="isPM && achievement?.status === 'submitted'">
        <button class="action-btn primary" @click="goToReview">审核成果</button>
      </div>
    </div>

    <div v-if="loading && !achievement" class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">正在加载详情...</div>
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
        <!-- 基本信息 -->
        <div v-if="activeTab === 'basicInfo'" class="tab-panel">
          <div v-if="achievement.achievement_type === 'tech_cooperation'" class="section">
            <h3 class="section-title">关联项目</h3>
            <div class="content-box">
              <template v-if="achievement.projects?.length">
                <div v-for="pr in achievement.projects" :key="pr.id || pr.project_id" class="info-row">
                  <span class="row-value">{{ pr.project_title || pr.title || '-' }}</span>
                  <span class="row-label muted">负责人：{{ pr.project_leader || '-' }}</span>
                </div>
              </template>
              <span v-else class="muted-text">未关联项目</span>
            </div>
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
            <h3 class="section-title">审核状态</h3>
            <div class="content-box">
              <span class="status-tag" :class="getStatusClass(achievement.status)">
                {{ getStatusText(achievement.status) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 成果信息 -->
        <div v-if="activeTab === 'achievementInfo'" class="tab-panel">
          <div class="section">
            <h3 class="section-title">成果类型</h3>
            <div class="content-box">{{ getTypeLabel(achievement.achievement_type) }}</div>
          </div>
          <template v-if="achievement.achievement_type === 'tech_cooperation'">
            <div class="section">
              <h3 class="section-title">服务企业</h3>
              <div class="content-box">{{ achievement.service_enterprise || '-' }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">合同名称</h3>
              <div class="content-box">{{ achievement.contract_name || '-' }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">合同金额（万元）</h3>
              <div class="content-box">{{ formatAmount(achievement.contract_amount) }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">开始日期</h3>
              <div class="content-box">{{ formatDate(achievement.start_date) }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">完成日期</h3>
              <div class="content-box">{{ formatDate(achievement.completion_date) }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">合同内容</h3>
              <div class="content-box pre-wrap">{{ achievement.contract_content || '暂无' }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">是否推动项目实现样品（机）化或小批量试制</h3>
              <div class="content-box">{{ achievement.is_sample_production ? '是' : '否' }}</div>
              <div v-if="achievement.is_sample_production" class="record-table-wrap detail-table-wrap">
                <table v-if="sampleProducts.length" class="record-table">
                  <thead>
                    <tr>
                      <th>样品（机）名称</th>
                      <th>样品（机）完成时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(sp, i) in sampleProducts" :key="i">
                      <td>{{ sp.name || '—' }}</td>
                      <td>{{ formatDate(sp.completion_date) }}</td>
                    </tr>
                  </tbody>
                </table>
                <span v-else class="muted-text">—</span>
              </div>
            </div>
            <div class="section">
              <h3 class="section-title">是否推动项目形成新产品</h3>
              <div class="content-box">{{ achievement.is_new_product ? '是' : '否' }}</div>
              <div v-if="achievement.is_new_product" class="record-table-wrap detail-table-wrap">
                <table v-if="newProducts.length" class="record-table">
                  <thead>
                    <tr>
                      <th>新产品名称</th>
                      <th>新产品实现产值/销售提升金额（万元）</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(np, i) in newProducts" :key="i">
                      <td>{{ np.name || '—' }}</td>
                      <td>{{ formatAmount(np.output_value_amount) }}</td>
                    </tr>
                  </tbody>
                </table>
                <span v-else class="muted-text">—</span>
              </div>
            </div>
          </template>

          <template v-if="achievement.achievement_type === 'qualification_certification'">
            <div class="section">
              <h3 class="section-title">获资质企业</h3>
              <div class="content-box">{{ achievement.qualified_enterprise || '-' }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">资质类型</h3>
              <div class="content-box">{{ achievement.qualification_type || '-' }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">认定日期</h3>
              <div class="content-box">{{ formatDate(achievement.qualification_date) }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">服务机构</h3>
              <div class="content-box">{{ achievement.service_provider_name || '-' }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">服务内容摘要</h3>
              <div class="content-box pre-wrap">{{ achievement.service_content_brief || '暂无' }}</div>
            </div>
          </template>

          <div class="section">
            <h3 class="section-title">附件材料</h3>
            <div class="content-box">
              <div v-if="files.length" class="attachments-list">
                <a
                  v-for="file in files"
                  :key="file.id"
                  class="attachment-item"
                  :href="getFileUrl(file.id)"
                  target="_blank"
                >
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

        <!-- 审核信息 -->
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
  enterpriseServiceAchievementAPI,
  ENTERPRISE_ACHIEVEMENT_TYPES,
} from '@/api/enterpriseServiceAchievements'
import { getApiBaseUrl } from '@/utils/request'

interface EnterpriseFile {
  id: string
  file_name: string
}

interface SampleProduct {
  name: string
  completion_date?: string
  output_value_amount?: number | null
  type?: string
}

interface ProjectLink {
  id?: string
  project_id?: string
  project_title?: string
  title?: string
  project_leader?: string
  project_code?: string
}

interface EnterpriseAchievement {
  id: string
  achievement_type: string
  status: string
  service_enterprise?: string
  contract_name?: string
  contract_amount?: number | null
  start_date?: string
  completion_date?: string
  contract_content?: string
  is_sample_production?: boolean
  is_new_product?: boolean
  qualified_enterprise?: string
  qualification_type?: string
  qualification_date?: string
  service_provider_name?: string
  service_content_brief?: string
  created_at?: string
  verified_date?: string
  verification_comment?: string
  created_by_name?: string
  created_by_email?: string
  created_by_phone?: string
  verified_by_name?: string
  creator_info?: { name?: string; email?: string; phone?: string }
  verifier_info?: { name?: string }
  files?: EnterpriseFile[]
  projects?: ProjectLink[]
  sample_products?: SampleProduct[]
  new_products?: SampleProduct[]
  samples?: SampleProduct[]
}

const route = useRoute()
const router = useRouter()
const API_BASE_URL = getApiBaseUrl()

const loading = ref(false)
const achievement = ref<EnterpriseAchievement | null>(null)
const activeTab = ref('basicInfo')
const isPM = computed(() => localStorage.getItem('role') === 'project_manager')

const tabs = [
  { key: 'basicInfo', label: '基本信息' },
  { key: 'achievementInfo', label: '成果信息' },
  { key: 'reviewInfo', label: '审核信息' },
]

const files = computed(() => achievement.value?.files || [])
const sampleProducts = computed(
  () =>
    achievement.value?.sample_products ||
    achievement.value?.samples?.filter((s) => s.type === 'sample') ||
    [],
)
const newProducts = computed(
  () =>
    achievement.value?.new_products ||
    achievement.value?.samples?.filter((s) => s.type === 'new_product') ||
    [],
)

const creatorName = computed(
  () => achievement.value?.created_by_name || achievement.value?.creator_info?.name || '',
)
const creatorEmail = computed(
  () => achievement.value?.created_by_email || achievement.value?.creator_info?.email || '',
)
const creatorPhone = computed(
  () => achievement.value?.created_by_phone || achievement.value?.creator_info?.phone || '',
)
const verifierName = computed(
  () => achievement.value?.verified_by_name || achievement.value?.verifier_info?.name || '',
)

const projectCodesDisplay = computed(() => {
  const projects = achievement.value?.projects || []
  if (!projects.length) return '—'
  const codes = projects.map((p) => p.project_code).filter(Boolean)
  return codes.length ? codes.join('、') : '—'
})

const getTypeLabel = (type: string) => {
  const found = ENTERPRISE_ACHIEVEMENT_TYPES.find((t) => t.value === type)
  return found?.label || type
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
  return new Date(dateString).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
}

const formatDateTime = (dateString?: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

const formatAmount = (val?: number | null) => {
  if (val == null) return '-'
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

const getFileUrl = (fileId: string) => {
  const token = localStorage.getItem('token')
  return `${API_BASE_URL}/enterprise-service-achievements/files/${fileId}?token=${token}`
}

const loadDetail = async () => {
  const id = route.params.id as string
  if (!id) return
  loading.value = true
  try {
    const res = await enterpriseServiceAchievementAPI.get(id)
    if (res.success && res.data) {
      achievement.value = res.data as EnterpriseAchievement
    } else {
      ElMessage.error('加载详情失败')
    }
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

const goBack = () => router.back()
const goToReview = () =>
  router.push(`/assistant/enterprise-service-achievements/${route.params.id}/review`)

onMounted(loadDetail)
</script>

<style>
@import '@/styles/incubation-detail-shared.css';
@import '@/styles/record-table-shared.css';

.detail-table-wrap {
  padding-left: 0;
  margin-top: 12px;
}

.detail-table-wrap .record-table {
  max-width: 100%;
}
</style>

<style scoped>
.info-row.stacked {
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px dashed #eee;
}

.info-row.stacked:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.row-label.muted {
  font-size: 13px;
  color: #999;
}

.project-codes-box {
  color: #666;
  font-size: 14px;
  background: #f5f5f5;
  padding: 4px 12px;
  border-radius: 4px;
  margin-top: 4px;
  width: fit-content;
}

.inline-detail-block {
  margin-top: 12px;
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}
</style>
