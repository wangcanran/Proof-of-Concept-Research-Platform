<template>
  <div class="expert-assign-panel">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="expert-type-tip"
      title="专家类型筛选仅用于缩小列表（仅显示已在个人中心设置该类型的专家）；不筛选时显示全部。分配时按专家个人已设置的类型归类，而非手动指定。"
    />

    <div class="assign-filters-row">
      <el-input
        v-model="keyword"
        placeholder="姓名、部门、邮箱、专业关键词等"
        clearable
        class="assign-search-input"
        @keyup.enter="runExpertSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" :loading="searchLoading" @click="runExpertSearch">搜索</el-button>
    </div>

    <div class="type-filter-row">
      <span class="filter-label">专家类型筛选：</span>
      <el-select
        v-model="selectedTypeFilters"
        placeholder="不选则显示全部专家（含未设置类型）"
        clearable
        filterable
        multiple
        collapse-tags
        collapse-tags-tooltip
        class="assign-type-select"
        @change="runExpertSearch"
      >
        <el-option v-for="t in EXPERT_TYPES" :key="t.value" :label="t.label" :value="t.value" />
      </el-select>
      <el-button v-if="selectedTypeFilters.length" link type="primary" @click="clearTypeFilter">
        清除筛选
      </el-button>
    </div>

    <div class="available-experts-list">
      <div v-if="searchLoading" class="empty-experts">
        <el-empty description="正在搜索..." :image-size="72" />
      </div>
      <div v-else-if="!listShown" class="empty-experts">
        <el-empty description="正在加载专家列表..." :image-size="72" />
      </div>
      <div v-else-if="availableExperts.length === 0" class="empty-experts">
        <el-empty description="没有找到符合条件的可用专家" />
      </div>
      <div v-else class="expert-select-list">
        <div class="experts-count">共找到 {{ availableExperts.length }} 位专家</div>
        <div
          v-for="expert in availableExperts"
          :key="expert.id"
          class="expert-select-item"
          :class="{ selected: selectedExpertIds.includes(expert.id) }"
          @click="toggleExpertSelection(expert.id)"
        >
          <div class="expert-select-avatar">
            <el-avatar
              :size="48"
              :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${expert.name}`"
            />
          </div>
          <div class="expert-select-info">
            <div class="expert-select-name-row">
              <span class="expert-select-name">{{ expert.name }}</span>
              <span class="expert-type-tags">
                <el-tag
                  v-for="t in getExpertTypes(expert)"
                  :key="t"
                  size="small"
                  :class="['expert-type-tag', t]"
                >
                  {{ expertTypeLabel(t) }}
                </el-tag>
                <el-tag v-if="!getExpertTypes(expert).length" size="small" type="info">
                  未设置类型
                </el-tag>
              </span>
            </div>
            <div class="expert-select-department">{{ expert.department || '未填写' }}</div>
            <div v-if="expert.title" class="expert-select-title">{{ expert.title }}</div>
            <div v-if="expert.email" class="expert-select-email">{{ expert.email }}</div>
            <div v-if="expert.keywords" class="expert-select-keywords">关键词：{{ expert.keywords }}</div>
          </div>
          <div class="expert-select-check">
            <el-checkbox
              :model-value="selectedExpertIds.includes(expert.id)"
              @click.stop="toggleExpertSelection(expert.id)"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="panel-footer">
      <el-button
        type="primary"
        :disabled="selectedExpertIds.length === 0"
        :loading="assignLoading"
        @click="confirmAssign"
      >
        确认分配 {{ selectedExpertIds.length }} 位专家
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { getApiBaseUrl } from '@/utils/request'
import axios from 'axios'
import type { AssignedExpertInfo } from '@/components/IncubationAssignedExpertsDisplay.vue'

export type ExpertAssignment = AssignedExpertInfo

const EXPERT_TYPES = [
  { value: 'technical' as const, label: '技术专家' },
  { value: 'industry' as const, label: '产业专家' },
  { value: 'investment' as const, label: '投资专家' },
]

const EXPERT_TYPE_LABELS: Record<string, string> = {
  technical: '技术专家',
  industry: '产业专家',
  investment: '投资专家',
}

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

function getExpertTypes(expert: { expert_types?: string[]; expertTypes?: string[] }) {
  const types = expert?.expert_types ?? expert?.expertTypes ?? []
  return Array.isArray(types) ? types : []
}

function expertTypeLabel(type: string) {
  return EXPERT_TYPE_LABELS[type] || type
}

const TYPE_ORDER = ['technical', 'industry', 'investment'] as const

function resolveAssignmentType(
  expert: { expert_types?: string[]; expertTypes?: string[] },
  filters: string[],
): ExpertAssignment['expert_type'] {
  const types = getExpertTypes(expert)
  if (filters.length === 1 && types.includes(filters[0])) {
    return filters[0] as ExpertAssignment['expert_type']
  }
  if (types.length >= 1) {
    const ordered = TYPE_ORDER.find((t) => types.includes(t))
    return (ordered || types[0]) as ExpertAssignment['expert_type']
  }
  return 'technical'
}

const keyword = ref('')
const selectedTypeFilters = ref<string[]>([])
const searchLoading = ref(false)
const assignLoading = ref(false)
const listShown = ref(false)
const availableExperts = ref<any[]>([])
const selectedExpertIds = ref<string[]>([])
const loadedAssigned = ref<ExpertAssignment[]>([])

const selectedList = computed({
  get: () => props.modelValue || [],
  set: (val) => emit('update:modelValue', val),
})

const allAssignedIds = computed(() => {
  const fromManage = props.manageMode
    ? (loadedAssigned.value.length ? loadedAssigned.value : props.assignedExperts || [])
    : []
  const fromDraft = props.manageMode ? [] : selectedList.value
  return new Set([...fromManage, ...fromDraft].map((e) => e.expert_id))
})

const mapExpertRow = (r: any): ExpertAssignment => ({
  id: r.id,
  expert_id: r.expert_id,
  expert_type: r.expert_type,
  expert_name: r.expert_name,
  expert_email: r.expert_email,
  expert_phone: r.expert_phone,
  department: r.department,
  title: r.title,
  profile_types: r.profile_types ?? r.profileTypes ?? [],
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

const runExpertSearch = async () => {
  if (!props.progressId) return
  searchLoading.value = true
  try {
    const params: Record<string, string> = {}
    const kw = keyword.value.trim()
    if (kw) params.keyword = kw
    if (selectedTypeFilters.value.length) {
      params.type_filters = selectedTypeFilters.value.join(',')
    }
    const res = await api.get(`/incubation/requests/${props.progressId}/available-experts`, {
      params,
    })
    if (res.data.success) {
      availableExperts.value = (res.data.data || []).filter(
        (e: any) => !allAssignedIds.value.has(e.id),
      )
      listShown.value = true
    }
  } catch (err: any) {
    availableExperts.value = []
    listShown.value = true
    ElMessage.error(err.response?.data?.error || '搜索专家失败')
  } finally {
    searchLoading.value = false
  }
}

const clearTypeFilter = () => {
  selectedTypeFilters.value = []
  runExpertSearch()
}

const toggleExpertSelection = (expertId: string) => {
  const index = selectedExpertIds.value.indexOf(expertId)
  if (index > -1) {
    selectedExpertIds.value.splice(index, 1)
  } else {
    selectedExpertIds.value.push(expertId)
  }
}

const buildAssignment = (expert: any): ExpertAssignment => ({
  expert_id: expert.id,
  expert_type: resolveAssignmentType(expert, selectedTypeFilters.value),
  expert_name: expert.name,
  expert_email: expert.email,
  expert_phone: expert.phone,
  department: expert.department,
  title: expert.title,
  profile_types: getExpertTypes(expert),
})

const confirmAssign = async () => {
  if (selectedExpertIds.value.length === 0) {
    ElMessage.warning('请选择至少一位专家')
    return
  }

  const picked = availableExperts.value.filter((e) => selectedExpertIds.value.includes(e.id))
  if (!picked.length) {
    ElMessage.warning('所选专家无效或已分配')
    return
  }

  assignLoading.value = true
  try {
    if (props.manageMode) {
      await api.put(`/incubation/requests/${props.progressId}/experts`, {
        assignments: picked.map((e) => ({
          expert_id: e.id,
          expert_type: resolveAssignmentType(e, selectedTypeFilters.value),
        })),
      })
      await loadAssigned()
      emit('changed')
      ElMessage.success(`成功分配 ${picked.length} 位专家`)
    } else {
      const next = [...selectedList.value]
      for (const expert of picked) {
        if (!next.some((e) => e.expert_id === expert.id)) {
          next.push(buildAssignment(expert))
        }
      }
      selectedList.value = next
      ElMessage.success(`已选择 ${picked.length} 位专家`)
    }
    selectedExpertIds.value = []
    await runExpertSearch()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '分配专家失败')
  } finally {
    assignLoading.value = false
  }
}

defineExpose({ loadAssigned })

watch(
  () => props.progressId,
  async () => {
    selectedExpertIds.value = []
    listShown.value = false
    if (props.manageMode) await loadAssigned()
    await runExpertSearch()
  },
)

onMounted(async () => {
  if (props.manageMode) await loadAssigned()
  await runExpertSearch()
})
</script>

<style scoped>
.expert-assign-panel {
  border: 1px solid #e8ecf0;
  border-radius: 10px;
  padding: 16px;
  background: #fafbfc;
}

.expert-type-tip {
  margin-bottom: 12px;
}

.assign-filters-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.assign-search-input {
  flex: 1;
  min-width: 280px;
}

.type-filter-row {
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

.assign-type-select {
  flex: 1;
  min-width: 280px;
}

.available-experts-list {
  min-height: 240px;
  margin-bottom: 12px;
}

.empty-experts {
  padding: 32px 16px;
}

.expert-select-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 360px;
  overflow-y: auto;
}

.experts-count {
  font-size: 13px;
  color: #666;
  padding: 0 4px;
}

.expert-select-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
}

.expert-select-item:hover {
  border-color: #409eff;
  background: #f5f9ff;
}

.expert-select-item.selected {
  border-color: #409eff;
  background: #ecf5ff;
}

.expert-select-info {
  flex: 1;
  min-width: 0;
}

.expert-select-name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.expert-select-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.expert-type-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.expert-type-tag.technical {
  --el-tag-bg-color: #ecf5ff;
  --el-tag-border-color: #b3d8ff;
  --el-tag-text-color: #409eff;
}

.expert-type-tag.investment {
  --el-tag-bg-color: #fdf6ec;
  --el-tag-border-color: #f5dab1;
  --el-tag-text-color: #e6a23c;
}

.expert-type-tag.industry {
  --el-tag-bg-color: #f0f9eb;
  --el-tag-border-color: #c2e7b0;
  --el-tag-text-color: #67c23a;
}

.expert-select-department,
.expert-select-title,
.expert-select-email,
.expert-select-keywords {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}

.panel-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
  border-top: 1px solid #eee;
}
</style>
