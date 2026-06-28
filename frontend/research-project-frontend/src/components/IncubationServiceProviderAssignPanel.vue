<template>
  <div class="provider-assign-panel">
    <div class="assign-filters-row">
      <el-input
        v-model="keyword"
        placeholder="机构名称、联系人、分类等"
        clearable
        class="assign-search-input"
        @keyup.enter="runSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" :loading="searchLoading" @click="runSearch">搜索</el-button>
    </div>

    <div class="category-filter-row">
      <span class="filter-label">机构分类筛选：</span>
      <el-select
        v-model="selectedCategories"
        placeholder="不选则显示全部分类"
        clearable
        filterable
        multiple
        collapse-tags
        collapse-tags-tooltip
        class="category-select"
        @change="runSearch"
      >
        <el-option v-for="c in PROVIDER_CATEGORIES" :key="c" :label="c" :value="c" />
      </el-select>
      <el-button v-if="selectedCategories.length" link type="primary" @click="clearCategoryFilter">
        清除筛选
      </el-button>
    </div>

    <div class="available-list">
      <div v-if="searchLoading" class="empty-hint">
        <el-empty description="正在搜索..." :image-size="72" />
      </div>
      <div v-else-if="!listShown" class="empty-hint">
        <el-empty description="正在加载服务机构..." :image-size="72" />
      </div>
      <div v-else-if="availableProviders.length === 0" class="empty-hint">
        <el-empty description="没有找到符合条件的服务机构" />
      </div>
      <div v-else class="select-list">
        <div class="list-count">共找到 {{ availableProviders.length }} 家机构</div>
        <div
          v-for="provider in availableProviders"
          :key="provider.id"
          class="select-item"
          :class="{ selected: isProviderSelected(provider.id) }"
          @click="toggleSelection(provider.id)"
        >
          <div class="select-info">
            <div class="name-row">
              <span class="name">{{ provider.name }}</span>
              <span v-if="getCategoryTags(provider.category).length" class="category-tags">
                <el-tag
                  v-for="cat in getCategoryTags(provider.category)"
                  :key="cat"
                  size="small"
                  type="info"
                  class="category-tag"
                >
                  {{ cat }}
                </el-tag>
              </span>
            </div>
            <div class="meta">统一社会信用代码：{{ provider.unified_social_credit_code || '—' }}</div>
            <div class="meta">联系人：{{ provider.contact_name || '—' }}</div>
            <div class="meta">联系电话：{{ provider.contact_phone || '—' }}</div>
            <div class="meta">联系邮箱：{{ provider.contact_email || '—' }}</div>
            <div v-if="provider.description" class="meta desc">
              机构简介：{{ provider.description }}
            </div>
          </div>
          <el-checkbox
            :model-value="isProviderSelected(provider.id)"
            @click.stop="toggleSelection(provider.id)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { getApiBaseUrl } from '@/utils/request'
import axios from 'axios'
import type { AssignedServiceProviderInfo } from '@/components/IncubationAssignedServiceProvidersDisplay.vue'

const PROVIDER_CATEGORIES = [
  '财务',
  '法务',
  '知识产权',
  '工商注册',
  '资质申报',
  '活动策划组织',
  '文印制作',
  '投融资',
  '测试/样机代工',
]

const props = withDefaults(
  defineProps<{
    progressId?: string
    modelValue?: AssignedServiceProviderInfo[]
    manageMode?: boolean
    assignedProviders?: AssignedServiceProviderInfo[]
  }>(),
  {
    progressId: '',
    modelValue: () => [],
    manageMode: false,
    assignedProviders: () => [],
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: AssignedServiceProviderInfo[]]
  changed: []
}>()

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const keyword = ref('')
const selectedCategories = ref<string[]>([])
const searchLoading = ref(false)
const togglingId = ref('')
const listShown = ref(false)
const availableProviders = ref<any[]>([])
const loadedAssigned = ref<AssignedServiceProviderInfo[]>([])

const selectedList = computed({
  get: () => props.modelValue || [],
  set: (val) => emit('update:modelValue', val),
})

const allAssignedIds = computed(() => {
  const fromManage = props.manageMode
    ? (loadedAssigned.value.length ? loadedAssigned.value : props.assignedProviders || [])
    : []
  const fromDraft = props.manageMode ? [] : selectedList.value
  return new Set([...fromManage, ...fromDraft].map((p) => p.service_provider_id))
})

const persistedAssignedIds = computed(() => {
  if (props.manageMode) {
    const list = loadedAssigned.value.length ? loadedAssigned.value : props.assignedProviders || []
    return new Set(list.map((p) => p.service_provider_id))
  }
  return new Set((props.assignedProviders || []).map((p) => p.service_provider_id))
})

const isProviderSelected = (id: string) => {
  if (props.manageMode) return persistedAssignedIds.value.has(id)
  return selectedList.value.some((p) => p.service_provider_id === id)
}

function getCategoryTags(category?: string) {
  if (!category) return []
  return String(category)
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
}

const mapProviderRow = (r: any): AssignedServiceProviderInfo => ({
  id: r.id,
  service_provider_id: r.service_provider_id || r.id,
  provider_name: r.provider_name || r.name,
  name: r.name || r.provider_name,
  category: r.category,
  contact_name: r.contact_name,
  contact_phone: r.contact_phone,
  contact_email: r.contact_email,
  unified_social_credit_code: r.unified_social_credit_code,
  description: r.description,
})

const loadAssigned = async () => {
  if (!props.progressId || !props.manageMode) return
  try {
    const res = await api.get(`/incubation/requests/${props.progressId}/service-providers`)
    if (res.data.success) {
      loadedAssigned.value = (res.data.data || []).map(mapProviderRow)
    }
  } catch {
    /* ignore */
  }
}

const runSearch = async () => {
  searchLoading.value = true
  try {
    const params: Record<string, string> = {}
    const kw = keyword.value.trim()
    if (kw) params.keyword = kw
    if (selectedCategories.value.length) {
      params.category = selectedCategories.value.join(',')
    }
    const res = await api.get('/incubation/service-providers', { params })
    if (res.data.success) {
      availableProviders.value = (res.data.data || []).filter((p: any) => {
        if (props.manageMode) return !persistedAssignedIds.value.has(p.id)
        return !persistedAssignedIds.value.has(p.id)
      })
      listShown.value = true
    }
  } catch (err: any) {
    availableProviders.value = []
    listShown.value = true
    ElMessage.error(err.response?.data?.error || '搜索服务机构失败')
  } finally {
    searchLoading.value = false
  }
}

const clearCategoryFilter = () => {
  selectedCategories.value = []
  runSearch()
}

const toggleSelection = async (id: string) => {
  if (togglingId.value) return
  const provider = availableProviders.value.find((p) => p.id === id)
  if (!provider) return

  if (props.manageMode && props.progressId) {
    if (allAssignedIds.value.has(id)) return
    togglingId.value = id
    try {
      await api.put(`/incubation/requests/${props.progressId}/service-providers`, {
        service_provider_ids: [id],
      })
      await loadAssigned()
      emit('changed')
      await runSearch()
    } catch (err: any) {
      ElMessage.error(err.response?.data?.error || '分配服务机构失败')
    } finally {
      togglingId.value = ''
    }
    return
  }

  const idx = selectedList.value.findIndex((p) => p.service_provider_id === id)
  if (idx >= 0) {
    const next = [...selectedList.value]
    next.splice(idx, 1)
    selectedList.value = next
  } else {
    selectedList.value = [...selectedList.value, mapProviderRow(provider)]
  }
}

watch(
  () => props.progressId,
  async () => {
    listShown.value = false
    if (props.manageMode) await loadAssigned()
    await runSearch()
  },
)

onMounted(async () => {
  if (props.manageMode) await loadAssigned()
  await runSearch()
})
</script>

<style scoped>
.provider-assign-panel {
  border: 1px solid #e8ecf0;
  border-radius: 10px;
  padding: 16px;
  background: #fafbfc;
}

.assign-filters-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.assign-search-input {
  flex: 1;
  min-width: 280px;
}

.category-filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.filter-label {
  font-size: 14px;
  color: #666;
  white-space: nowrap;
}

.category-select {
  flex: 1;
  min-width: 280px;
}

.available-list {
  min-height: 200px;
}

.select-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 320px;
  overflow-y: auto;
}

.list-count {
  font-size: 13px;
  color: #666;
}

.select-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.select-item.selected {
  border-color: #409eff;
  background: #ecf5ff;
}

.select-info {
  flex: 1;
  min-width: 0;
}

.name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.name {
  font-size: 15px;
  font-weight: 600;
}

.category-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.category-tag {
  --el-tag-bg-color: #f4f4f5;
  --el-tag-border-color: #e9e9eb;
  --el-tag-text-color: #909399;
}

.meta {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
  line-height: 1.5;
}

.meta.desc {
  margin-top: 4px;
}
</style>
