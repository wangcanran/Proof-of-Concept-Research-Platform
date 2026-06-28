<!-- 科研成果详情（与服务申请详情同布局） -->
<template>
  <div class="incubation-request-detail">
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-workbench-box" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回</span>
        </button>
        <h1>科研成果详情</h1>
        <div class="header-meta" v-if="achievement">
          <span class="project-no-tag">{{ achievement.project?.project_code || '暂未编号' }}</span>
          <div class="status-badge" :class="getStatusClass(achievement.status)">
            {{ getStatusText(achievement.status) }}
          </div>
        </div>
      </div>
      <div class="header-actions" v-if="isPM && achievement?.status === 'submitted'">
        <button class="action-btn primary" @click="goToReview">审核科研成果</button>
      </div>
    </div>

    <div v-if="loading && !achievement" class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">正在加载科研成果详情...</div>
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
            <h3 class="section-title">审核状态</h3>
            <div class="content-box">
              <span class="status-tag" :class="getStatusClass(achievement.status)">
                {{ getStatusText(achievement.status) }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'achievementInfo'" class="tab-panel">
          <div class="section">
            <h3 class="section-title">成果名称</h3>
            <div class="content-box">{{ achievement.title || '-' }}</div>
          </div>
          <div class="section">
            <h3 class="section-title">成果类型</h3>
            <div class="content-box">{{ getTypeLabel(achievement.type) }}</div>
          </div>
          <div class="section">
            <h3 class="section-title">产出日期</h3>
            <div class="content-box">{{ formatDate(achievement.achievement_date) }}</div>
          </div>
          <div class="section">
            <h3 class="section-title">作者</h3>
            <div class="content-box">{{ authorsText || '未填写' }}</div>
          </div>
          <div class="section">
            <h3 class="section-title">关键词</h3>
            <div class="content-box">{{ achievement.keywords || '未填写' }}</div>
          </div>
          <template v-if="achievement.type === 'paper'">
            <div class="section">
              <h3 class="section-title">期刊/会议名称</h3>
              <div class="content-box">{{ extField('journal_conference_name') }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">DOI号</h3>
              <div class="content-box">{{ extField('doi_number') }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">卷/期</h3>
              <div class="content-box">{{ extField('volume_issue') }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">发表日期</h3>
              <div class="content-box">{{ formatDate(extField('publication_date', true)) }}</div>
            </div>
          </template>
          <template v-if="achievement.type === 'patent'">
            <div class="section">
              <h3 class="section-title">专利号</h3>
              <div class="content-box">{{ extField('patent_number') }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">专利类型</h3>
              <div class="content-box">{{ extField('patent_type') }}</div>
            </div>
            <div class="section">
              <h3 class="section-title">授权机构</h3>
              <div class="content-box">{{ extField('authority') }}</div>
            </div>
          </template>
          <div class="section">
            <h3 class="section-title">成果描述</h3>
            <div class="content-box pre-wrap">{{ achievement.description || '暂无描述' }}</div>
          </div>
          <div class="section">
            <h3 class="section-title">外部链接</h3>
            <div class="content-box">
              <a v-if="extField('external_link', true)" :href="extField('external_link', true)" target="_blank" class="attachment-item">
                {{ extField('external_link', true) }}
              </a>
              <span v-else class="muted-text">未填写</span>
            </div>
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
              <div class="content-box">{{ formatDateTime(achievement.verified_date) || '—' }}</div>
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
import { achievementAPI, type Achievement, type AchievementFile } from '@/api/achievements'
import { getApiBaseUrl } from '@/utils/request'

const route = useRoute()
const router = useRouter()
const API_BASE_URL = getApiBaseUrl()

type ExtAchievement = Achievement & Record<string, unknown>

const loading = ref(false)
const achievement = ref<ExtAchievement | null>(null)
const activeTab = ref('basicInfo')
const isPM = computed(() => localStorage.getItem('role') === 'project_manager')

const tabs = [
  { key: 'basicInfo', label: '基本信息' },
  { key: 'achievementInfo', label: '成果信息' },
  { key: 'reviewInfo', label: '审核信息' },
]

const files = computed<AchievementFile[]>(() => achievement.value?.files || [])

const authorsText = computed(() => {
  const a = achievement.value?.authors
  if (!a) return ''
  if (Array.isArray(a)) return a.join('、')
  return String(a)
})

const creatorName = computed(
  () =>
    achievement.value?.created_by_name ||
    (achievement.value?.creator_info as { name?: string })?.name ||
    '',
)
const creatorEmail = computed(
  () =>
    (achievement.value as ExtAchievement)?.created_by_email ||
    (achievement.value?.creator_info as { email?: string })?.email ||
    '',
)
const creatorPhone = computed(
  () =>
    (achievement.value as ExtAchievement)?.created_by_phone ||
    (achievement.value?.creator_info as { phone?: string })?.phone ||
    '',
)
const verifierName = computed(
  () =>
    achievement.value?.verified_by_name ||
    (achievement.value?.verifier_info as { name?: string })?.name ||
    '',
)

function extField(key: string, raw = false) {
  const val = achievement.value?.[key]
  if (val == null || val === '') return raw ? '' : '未填写'
  return String(val)
}

const getTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    paper: '论文',
    patent: '专利',
    software: '软件著作权',
    report: '研究报告',
    prototype: '原型样品',
    standard: '技术标准',
    award: '获奖成果',
    other: '其他',
  }
  return map[type] || type
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
  if (!dateString || dateString === '未填写') return '-'
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const formatDateTime = (dateString?: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

const getFileUrl = (fileId: string) => {
  const token = localStorage.getItem('token')
  return `${API_BASE_URL}/achievements/files/${fileId}?token=${token}`
}

const loadAchievement = async () => {
  const id = route.params.id as string
  if (!id) return
  loading.value = true
  try {
    const res = await achievementAPI.getAchievement(id)
    if (res.success && res.data) {
      achievement.value = res.data as ExtAchievement
    } else {
      ElMessage.error('加载科研成果详情失败')
    }
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

const goBack = () => router.back()
const goToReview = () => router.push(`/assistant/achievements/${route.params.id}/review`)

onMounted(loadAchievement)
</script>

<style>
@import '@/styles/incubation-detail-shared.css';
</style>
