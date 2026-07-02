<template>
  <div class="partner-assign-panel">
    <div class="panel-title">产业资源库机构（供应链 / 技术交易等）</div>
    <p v-if="projectId" class="panel-hint">已承接的机构不会出现在列表中；若项目方已申请对接并确认，则无需重复分配。</p>
    <div class="assign-filters-row">
      <el-input
        v-model="keyword"
        placeholder="机构名称、产品/服务、联系人"
        clearable
        class="assign-search-input"
        @keyup.enter="runSearch"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-button type="primary" :loading="searchLoading" @click="runSearch">搜索</el-button>
    </div>

    <div class="available-list">
      <div v-if="searchLoading" class="empty-hint"><el-empty description="正在搜索..." :image-size="72" /></div>
      <div v-else-if="!listShown" class="empty-hint"><el-empty description="正在加载..." :image-size="72" /></div>
      <div v-else-if="availablePartners.length === 0" class="empty-hint">
        <el-empty description="没有找到符合条件的机构" />
      </div>
      <div v-else class="select-list">
        <div class="list-count">共找到 {{ availablePartners.length }} 家机构</div>
        <div
          v-for="partner in availablePartners"
          :key="partner.id"
          class="select-item"
          :class="{ selected: isSelected(partner.id) }"
          @click="toggleSelection(partner)"
        >
          <div class="select-info">
            <div class="name-row">
              <span class="name">{{ partner.name }}</span>
              <el-tag size="small" type="info">{{ partner.org_category_label || partner.org_category }}</el-tag>
            </div>
            <div v-if="partner.main_products_services" class="meta">产品/服务：{{ partner.main_products_services }}</div>
            <div class="meta">联系人：{{ partner.contact_name || '—' }} · {{ partner.contact_phone || '—' }}</div>
          </div>
          <el-checkbox :model-value="isSelected(partner.id)" @click.stop="toggleSelection(partner)" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { getApiBaseUrl } from '@/utils/request'
import axios from 'axios'

export interface AssignedIndustryPartnerInfo {
  id?: string
  industry_partner_id: string
  partner_name?: string
  org_category?: string
  org_category_label?: string
  contact_name?: string
  contact_phone?: string
  main_products_services?: string
  description?: string
  source?: string
  source_label?: string
}

interface PartnerOption {
  id: string
  name: string
  org_category?: string
  org_category_label?: string
  main_products_services?: string
  contact_name?: string
  contact_phone?: string
  description?: string
}

const props = withDefaults(
  defineProps<{ modelValue?: AssignedIndustryPartnerInfo[]; projectId?: string }>(),
  { modelValue: () => [], projectId: '' },
)
const emit = defineEmits<{ 'update:modelValue': [AssignedIndustryPartnerInfo[]] }>()

const keyword = ref('')
const searchLoading = ref(false)
const listShown = ref(false)
const availablePartners = ref<PartnerOption[]>([])

const api = axios.create({ baseURL: getApiBaseUrl(), timeout: 30000 })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

function isSelected(id: string) {
  return (props.modelValue || []).some((p) => p.industry_partner_id === id)
}

function toggleSelection(partner: PartnerOption) {
  const current = [...(props.modelValue || [])]
  const idx = current.findIndex((p) => p.industry_partner_id === partner.id)
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push({
      industry_partner_id: partner.id,
      partner_name: partner.name,
      org_category: partner.org_category,
      org_category_label: partner.org_category_label,
      contact_name: partner.contact_name,
      contact_phone: partner.contact_phone,
      main_products_services: partner.main_products_services,
      description: partner.description,
    })
  }
  emit('update:modelValue', current)
}

async function runSearch() {
  searchLoading.value = true
  try {
    const res = await api.get('/incubation/industry-partners', {
      params: {
        keyword: keyword.value.trim() || undefined,
        project_id: props.projectId || undefined,
      },
    })
    if (res.data.success) {
      availablePartners.value = res.data.data || []
    } else {
      availablePartners.value = []
      ElMessage.error(res.data.error || '搜索失败')
    }
    listShown.value = true
  } catch (err: unknown) {
    availablePartners.value = []
    listShown.value = true
    const msg =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
      '搜索产业资源库机构失败'
    ElMessage.error(msg)
  } finally {
    searchLoading.value = false
  }
}

onMounted(runSearch)
watch(keyword, () => {
  if (!keyword.value) runSearch()
})
watch(() => props.projectId, () => {
  runSearch()
})
</script>

<style scoped>
.partner-assign-panel { border: 1px solid #ebeef5; border-radius: 8px; padding: 16px; background: #fafafa; }
.panel-title { font-weight: 600; margin-bottom: 12px; color: #303133; }
.panel-hint { font-size: 13px; color: #909399; margin: 0 0 12px; line-height: 1.5; }
.assign-filters-row { display: flex; gap: 8px; margin-bottom: 12px; }
.assign-search-input { flex: 1; }
.select-list { max-height: 320px; overflow-y: auto; }
.select-item {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 12px; border: 1px solid #e4e7ed; border-radius: 8px; margin-bottom: 8px;
  background: #fff; cursor: pointer;
}
.select-item.selected { border-color: #b31b1b; background: #fef0f0; }
.name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.name { font-weight: 600; color: #303133; }
.meta { font-size: 13px; color: #909399; line-height: 1.5; }
.list-count { font-size: 13px; color: #909399; margin-bottom: 8px; }
</style>
