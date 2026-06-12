<template>
  <div class="expert-assign-panel">
    <div class="panel-header">
      <h4 class="panel-title">添加专家</h4>
      <p class="panel-hint">选择专家类型，输入关键词搜索后可添加多名专家</p>
    </div>

    <div class="type-tabs">
      <button
        v-for="t in EXPERT_TYPES"
        :key="t.value"
        type="button"
        class="type-tab"
        :class="{ active: activeType === t.value }"
        @click="activeType = t.value"
      >
        {{ t.label }}
      </button>
    </div>

    <div class="search-row">
      <input
        v-model="keyword"
        type="text"
        class="search-input"
        :placeholder="`搜索${currentTypeLabel}：姓名、单位、关键词...`"
        @keydown.enter.prevent="searchExperts"
      />
      <button type="button" class="btn-search" :disabled="searchLoading" @click="searchExperts">
        {{ searchLoading ? '搜索中...' : '搜索' }}
      </button>
    </div>

    <div v-if="searchLoading" class="list-hint">正在搜索专家...</div>
    <div v-else-if="hasSearched && availableExperts.length === 0" class="list-hint">
      未找到匹配的{{ currentTypeLabel }}
    </div>
    <div v-else-if="!hasSearched" class="list-hint">请选择专家类型并输入关键词后搜索</div>
    <div v-else class="available-list">
      <div
        v-for="expert in availableExperts"
        :key="expert.id"
        class="expert-row"
        :class="{ disabled: isSelected(expert.id) || expert.already_assigned }"
      >
        <div class="expert-info">
          <div class="expert-name">{{ expert.name }}</div>
          <div class="expert-meta">
            <span v-if="expert.department">{{ expert.department }}</span>
            <span v-if="expert.title">{{ expert.title }}</span>
          </div>
          <div class="expert-contact">
            <span v-if="expert.email">邮箱：{{ expert.email }}</span>
            <span v-if="expert.phone">电话：{{ expert.phone }}</span>
          </div>
        </div>
        <button
          type="button"
          class="btn-add"
          :disabled="isSelected(expert.id) || expert.already_assigned"
          @click="addExpert(expert)"
        >
          {{ expert.already_assigned ? '已分配' : isSelected(expert.id) ? '已选' : '添加' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getApiBaseUrl } from '@/utils/request'
import axios from 'axios'
import type { AssignedExpertInfo } from '@/components/IncubationAssignedExpertsDisplay.vue'

export type ExpertAssignment = AssignedExpertInfo

const EXPERT_TYPES = [
  { value: 'technical' as const, label: '技术专家' },
  { value: 'industry' as const, label: '产业专家' },
  { value: 'investment' as const, label: '投资专家' },
]

const props = withDefaults(
  defineProps<{
    progressId: string
    modelValue?: ExpertAssignment[]
    manageMode?: boolean
    assignedExperts?: ExpertAssignment[]
  }>(),
  {
    modelValue: () => [],
    manageMode: false,
    assignedExperts: () => [],
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: ExpertAssignment[]]
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

const activeType = ref<'technical' | 'industry' | 'investment'>('technical')
const keyword = ref('')
const searchLoading = ref(false)
const hasSearched = ref(false)
const availableExperts = ref<any[]>([])
const loadedAssigned = ref<ExpertAssignment[]>([])

const currentTypeLabel = computed(
  () => EXPERT_TYPES.find((t) => t.value === activeType.value)?.label || '',
)

const selectedList = computed({
  get: () => props.modelValue || [],
  set: (val) => emit('update:modelValue', val),
})

const allAssignedFlat = computed(() => {
  if (props.manageMode) {
    return loadedAssigned.value.length ? loadedAssigned.value : props.assignedExperts || []
  }
  return selectedList.value
})

const isSelected = (expertId: string) =>
  allAssignedFlat.value.some((e) => e.expert_id === expertId)

const mapExpertRow = (r: any): ExpertAssignment => ({
  id: r.id,
  expert_id: r.expert_id,
  expert_type: r.expert_type,
  expert_name: r.expert_name,
  expert_email: r.expert_email,
  expert_phone: r.expert_phone,
  department: r.department,
  title: r.title,
})

const loadAssigned = async () => {
  if (!props.progressId || !props.manageMode) return
  try {
    const res = await api.get(`/incubation/requests/${props.progressId}/experts`)
    if (res.data.success) {
      loadedAssigned.value = (res.data.data || []).map(mapExpertRow)
    }
  } catch {
    /* ignore */
  }
}

const searchExperts = async () => {
  if (!props.progressId) return
  const kw = keyword.value.trim()
  if (!kw) {
    ElMessage.warning('请输入关键词后再搜索')
    hasSearched.value = false
    availableExperts.value = []
    return
  }
  searchLoading.value = true
  hasSearched.value = true
  try {
    const res = await api.get(
      `/incubation/requests/${props.progressId}/available-experts`,
      { params: { expert_type: activeType.value, keyword: kw } },
    )
    if (res.data.success) {
      availableExperts.value = res.data.data || []
    }
  } catch (err: any) {
    availableExperts.value = []
    ElMessage.error(err.response?.data?.error || '搜索专家失败')
  } finally {
    searchLoading.value = false
  }
}

const addExpert = async (expert: any) => {
  if (isSelected(expert.id) || expert.already_assigned) return
  const next: ExpertAssignment = {
    expert_id: expert.id,
    expert_type: activeType.value,
    expert_name: expert.name,
    expert_email: expert.email,
    expert_phone: expert.phone,
    department: expert.department,
    title: expert.title,
  }
  if (props.manageMode) {
    try {
      await api.put(`/incubation/requests/${props.progressId}/experts`, {
        assignments: [{ expert_id: next.expert_id, expert_type: next.expert_type }],
      })
      await loadAssigned()
      await searchExperts()
      emit('changed')
      ElMessage.success(`已添加${next.expert_name}`)
    } catch (err: any) {
      ElMessage.error(err.response?.data?.error || '添加专家失败')
    }
    return
  }
  selectedList.value = [...selectedList.value, next]
  ElMessage.success(`已添加${next.expert_name}`)
}

defineExpose({ loadAssigned })

watch(activeType, () => {
  keyword.value = ''
  availableExperts.value = []
  hasSearched.value = false
})

watch(
  () => props.progressId,
  () => {
    if (props.manageMode) loadAssigned()
  },
)

onMounted(() => {
  if (props.manageMode) loadAssigned()
})
</script>

<style scoped>
.expert-assign-panel {
  border: 1px solid #e8ecf0;
  border-radius: 10px;
  padding: 16px;
  background: #fafbfc;
}

.panel-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
}

.panel-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: #6b7280;
}

.type-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.type-tab {
  padding: 6px 14px;
  border: 1px solid #d1d5db;
  border-radius: 20px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
  color: #374151;
}

.type-tab.active {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.search-row {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
}

.btn-search {
  flex-shrink: 0;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.btn-search:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.list-hint {
  padding: 12px 0;
  font-size: 13px;
  color: #9ca3af;
  text-align: center;
}

.available-list {
  max-height: 260px;
  overflow-y: auto;
  margin: 8px 0 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.expert-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #f3f4f6;
  gap: 12px;
}

.expert-row:last-child {
  border-bottom: none;
}

.expert-row.disabled {
  opacity: 0.6;
}

.expert-name {
  font-weight: 500;
  color: #111827;
}

.expert-meta,
.expert-contact {
  font-size: 12px;
  color: #6b7280;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 2px;
}

.btn-add {
  flex-shrink: 0;
  padding: 4px 12px;
  border: 1px solid #2563eb;
  border-radius: 6px;
  background: #fff;
  color: #2563eb;
  font-size: 13px;
  cursor: pointer;
  margin-top: 2px;
}

.btn-add:disabled {
  border-color: #d1d5db;
  color: #9ca3af;
  cursor: not-allowed;
}
</style>
