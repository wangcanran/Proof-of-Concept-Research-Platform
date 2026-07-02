<template>
  <div class="partner-detail-page">
    <IndustryResourceTabs v-if="showTabs" :role="tabRole" active-tab="partners" />

    <div class="back-bar">
      <el-button class="back-btn" @click="goBack">
        <el-icon><ArrowLeft /></el-icon> 返回列表
      </el-button>
      <el-button
        v-if="isApplicant && canApplyAny"
        type="primary"
        class="ruc-btn-primary"
        @click="openApplyDialog"
      >
        申请对接
      </el-button>
    </div>

    <div v-if="loading" class="loading-wrap">加载中...</div>
    <div v-else-if="partner" class="detail-card">
      <div class="detail-header">
        <h1>{{ partner.name }}</h1>
        <div v-if="canEdit" class="header-actions">
          <el-button type="primary" @click="goEdit">编辑</el-button>
        </div>
      </div>

      <div v-if="statusBanners.length" class="status-banners">
        <div v-for="item in statusBanners" :key="item.project_id + item.status" class="status-banner" :class="item.type">
          <el-tag :type="item.tagType" size="small">{{ item.statusLabel }}</el-tag>
          <span>{{ item.text }}</span>
          <el-button link type="primary" @click="goMyConnections">查看我的申请</el-button>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <span class="label">机构分类</span>
          <span class="value">{{ partner.org_category_label || orgCategoryLabel(partner.org_category) }}</span>
        </div>
        <div class="info-item">
          <span class="label">所属领域</span>
          <span class="value">{{ (partner.domain_names || []).join('、') || '—' }}</span>
        </div>
        <div class="info-item">
          <span class="label">联系人</span>
          <span class="value">{{ partner.contact_name }}</span>
        </div>
        <div class="info-item">
          <span class="label">联系电话</span>
          <span class="value">{{ partner.contact_phone }}</span>
        </div>
      </div>

      <div v-if="partner.main_products_services" class="section">
        <h3>主要产品/服务</h3>
        <p>{{ partner.main_products_services }}</p>
      </div>
      <div v-if="partner.description" class="section">
        <h3>机构简介</h3>
        <p class="pre-wrap">{{ partner.description }}</p>
      </div>
    </div>

    <el-dialog v-model="applyVisible" title="申请对接" width="520px">
      <el-form label-position="top">
        <el-form-item label="关联项目" required>
          <el-select
            v-model="applyForm.project_id"
            placeholder="请选择项目"
            filterable
            style="width: 100%"
            :loading="projectsLoading"
          >
            <el-option
              v-for="p in projectApplyOptions"
              :key="p.project_id"
              :label="projectOptionLabel(p)"
              :value="p.project_id"
              :disabled="!p.can_apply"
            />
          </el-select>
          <p v-if="applyForm.project_id && selectedProjectBlockReason" class="field-hint warn">
            {{ selectedProjectBlockReason }}
          </p>
        </el-form-item>
        <el-form-item label="对接意向说明" required>
          <el-input
            v-model="applyForm.intention_note"
            type="textarea"
            :rows="4"
            placeholder="请说明希望与该机构对接的合作方向、预期目标等"
            maxlength="2000"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="applyVisible = false">取消</el-button>
        <el-button type="primary" class="ruc-btn-primary" :loading="applying" @click="submitApply">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import IndustryResourceTabs from '@/components/IndustryResourceTabs.vue'
import {
  industryPartnerAPI,
  industryPartnerConnectionAPI,
  type IndustryPartnerRow,
  type ConnectionRequestRow,
  type ProjectApplyStatusItem,
} from '@/api/industryPartners'
import { orgCategoryLabel } from '@/constants/industryPartnerCategories'
import { connectionStatusLabel, CONNECTION_REQUEST_STATUS_TYPES } from '@/constants/industryPartnerConnections'

const props = withDefaults(
  defineProps<{ mode?: 'assistant' | 'applicant' }>(),
  { mode: 'assistant' },
)

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const partner = ref<IndustryPartnerRow | null>(null)
const myRequests = ref<ConnectionRequestRow[]>([])
const projectApplyOptions = ref<ProjectApplyStatusItem[]>([])
const canApplyAny = ref(false)
const applyVisible = ref(false)
const applying = ref(false)
const projectsLoading = ref(false)
const applyForm = ref({ project_id: '', intention_note: '' })

const userRole = computed(() => (localStorage.getItem('userRole') || '').toLowerCase())
const isApplicant = computed(() => props.mode === 'applicant')
const showTabs = computed(() => props.mode === 'applicant' || props.mode === 'assistant')
const tabRole = computed(() => props.mode)
const canEdit = computed(
  () => props.mode === 'assistant' && ['project_manager', 'admin'].includes(userRole.value),
)

const statusBanners = computed(() => {
  const seen = new Set<string>()
  const items: {
    project_id: string
    status: string
    statusLabel: string
    tagType: string
    text: string
    type: string
  }[] = []
  for (const p of projectApplyOptions.value) {
    if (p.can_apply || !p.block_status) continue
    const key = `${p.project_id}:${p.block_status}`
    if (seen.has(key)) continue
    seen.add(key)
    const statusLabel = connectionStatusLabel(p.block_status)
    const tagType = (CONNECTION_REQUEST_STATUS_TYPES as Record<string, string>)[p.block_status] || 'info'
    let text = p.block_reason || ''
    if (p.block_status === 'pending') {
      text = `项目「${p.title}」的对接申请待项目经理处理`
    } else if (p.block_status === 'confirmed') {
      text = `项目「${p.title}」已与该机构确认对接`
    } else if (p.block_status === 'rejected') {
      text = `项目「${p.title}」对该机构的对接申请已标记为不合适，无法再次申请`
    }
    items.push({
      project_id: p.project_id,
      status: p.block_status,
      statusLabel,
      tagType,
      text,
      type: p.block_status,
    })
  }
  return items
})

const selectedProjectBlockReason = computed(() => {
  const p = projectApplyOptions.value.find((x) => x.project_id === applyForm.value.project_id)
  return p && !p.can_apply ? p.block_reason : ''
})

function projectOptionLabel(p: ProjectApplyStatusItem) {
  const code = p.project_code || p.project_id.substring(0, 8)
  const suffix = p.can_apply ? '' : `（${connectionStatusLabel(p.block_status || '')}，不可申请）`
  return `${p.title} [${code}]${suffix}`
}

function goBack() {
  const base = props.mode === 'assistant'
    ? '/assistant/industry-resources/partners'
    : '/applicant/industry-resources/partners'
  router.push(base)
}

function goEdit() {
  router.push(`/assistant/industry-resources/partners/${route.params.id}/edit`)
}

function goMyConnections() {
  router.push('/applicant/industry-resources/my-connections')
}

async function loadProjectApplyStatus() {
  if (!isApplicant.value) return
  try {
    const res = await industryPartnerConnectionAPI.getProjectApplyStatus(route.params.id as string)
    if (res.success && res.data) {
      projectApplyOptions.value = res.data.projects || []
      canApplyAny.value = !!res.data.can_apply_any
    }
  } catch {
    projectApplyOptions.value = []
    canApplyAny.value = false
  }
}

async function loadMyRequests() {
  if (!isApplicant.value) return
  try {
    const res = await industryPartnerConnectionAPI.listMine({
      partner_id: route.params.id as string,
    })
    if (res.success) myRequests.value = res.data || []
  } catch {
    myRequests.value = []
  }
}

async function openApplyDialog() {
  applyForm.value = { project_id: '', intention_note: '' }
  applyVisible.value = true
  projectsLoading.value = true
  try {
    await loadProjectApplyStatus()
  } finally {
    projectsLoading.value = false
  }
}

async function submitApply() {
  if (!applyForm.value.project_id) {
    ElMessage.warning('请选择关联项目')
    return
  }
  if (!applyForm.value.intention_note.trim()) {
    ElMessage.warning('请填写对接意向说明')
    return
  }
  applying.value = true
  try {
    const res = await industryPartnerConnectionAPI.apply(route.params.id as string, {
      project_id: applyForm.value.project_id,
      intention_note: applyForm.value.intention_note.trim(),
    })
    if (res.success) {
      ElMessage.success('对接申请已提交')
      applyVisible.value = false
      await loadMyRequests()
      await loadProjectApplyStatus()
    } else {
      ElMessage.error(res.error || '提交失败')
    }
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '提交失败')
  } finally {
    applying.value = false
  }
}

onMounted(async () => {
  try {
    const res = await industryPartnerAPI.get(route.params.id as string)
    if (res.success) partner.value = res.data
    else ElMessage.error(res.error || '加载失败')
    await loadMyRequests()
    await loadProjectApplyStatus()
  } catch {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.partner-detail-page { max-width: 900px; margin: 0 auto; padding-bottom: 40px; }
.back-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.back-btn { color: #b31b1b; border-color: #b31b1b; }
.ruc-btn-primary { background: #b31b1b; border-color: #b31b1b; }
.detail-card { background: #fff; padding: 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.detail-header h1 { margin: 0; font-size: 24px; }
.status-banners { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.status-banner {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 12px 16px; border-radius: 8px; font-size: 14px;
}
.status-banner.pending { background: #fdf6ec; }
.status-banner.confirmed { background: #f0f9eb; }
.status-banner.rejected { background: #fef0f0; }
.field-hint { margin: 6px 0 0; font-size: 13px; }
.field-hint.warn { color: #e6a23c; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
.info-item .label { display: block; color: #909399; font-size: 13px; margin-bottom: 4px; }
.section h3 { margin: 0 0 8px; font-size: 16px; }
.section p { margin: 0; color: #606266; line-height: 1.7; }
.pre-wrap { white-space: pre-wrap; }
.loading-wrap { text-align: center; padding: 40px; color: #909399; }
</style>
