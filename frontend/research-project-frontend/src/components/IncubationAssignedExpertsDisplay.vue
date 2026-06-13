<template>
  <div class="assigned-experts-display">
    <div v-if="!experts.length" class="empty-hint">暂未分配专家</div>
    <div v-else class="expert-groups">
      <div v-for="group in groupedExperts" :key="group.type" class="expert-group">
        <div class="group-title">
          {{ typeLabel(group.type) }}
          <span class="group-count">({{ group.experts.length }})</span>
        </div>
        <div class="expert-cards">
          <div v-for="expert in group.experts" :key="expertKey(expert)" class="expert-card">
            <div class="card-header">
              <span class="expert-name">{{ expert.expert_name }}</span>
              <button
                v-if="editable"
                type="button"
                class="btn-remove"
                :disabled="removingKey === expertKey(expert)"
                @click="onRemove(expert)"
              >
                移除
              </button>
            </div>
            <div class="info-rows">
              <div v-if="expert.department" class="info-row">
                <span class="label">单位</span>
                <span class="value">{{ expert.department }}</span>
              </div>
              <div v-if="expert.title" class="info-row">
                <span class="label">职称</span>
                <span class="value">{{ expert.title }}</span>
              </div>
              <div class="info-row">
                <span class="label">邮箱</span>
                <span class="value">{{ expert.expert_email || '—' }}</span>
              </div>
              <div class="info-row">
                <span class="label">电话</span>
                <span class="value">{{ expert.expert_phone || '—' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { getApiBaseUrl } from '@/utils/request'
import axios from 'axios'

export interface AssignedExpertInfo {
  id?: string
  expert_id: string
  expert_type: 'technical' | 'industry' | 'investment'
  expert_name: string
  expert_email?: string
  expert_phone?: string
  department?: string
  title?: string
  profile_types?: string[]
  profileTypes?: string[]
}

const EXPERT_TYPE_LABELS: Record<string, string> = {
  technical: '技术专家',
  industry: '产业专家',
  investment: '投资专家',
}

const TYPE_ORDER = ['technical', 'industry', 'investment', '__unset__']

const props = withDefaults(
  defineProps<{
    experts: AssignedExpertInfo[]
    editable?: boolean
    progressId?: string
  }>(),
  {
    editable: false,
    progressId: '',
  },
)

const emit = defineEmits<{
  remove: [expert: AssignedExpertInfo]
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

const removingKey = ref('')

const typeLabel = (type: string) =>
  type === '__unset__' ? '未设置类型' : EXPERT_TYPE_LABELS[type] || type

const expertKey = (expert: AssignedExpertInfo) =>
  expert.id || `${expert.expert_id}-${expert.expert_type}`

const getProfileTypes = (expert: AssignedExpertInfo) => {
  const types = expert.profile_types ?? expert.profileTypes ?? []
  return Array.isArray(types) ? types : []
}

const getGroupKey = (expert: AssignedExpertInfo) => {
  const profileTypes = getProfileTypes(expert)
  if (!profileTypes.length) return '__unset__'
  if (profileTypes.length === 1) return profileTypes[0]
  if (profileTypes.includes(expert.expert_type)) return expert.expert_type
  return profileTypes[0]
}

const groupedExperts = computed(() => {
  const map = new Map<string, AssignedExpertInfo[]>()
  for (const expert of props.experts) {
    const key = getGroupKey(expert)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(expert)
  }
  const orderedKeys = [
    ...TYPE_ORDER.filter((t) => map.has(t)),
    ...[...map.keys()].filter((k) => !TYPE_ORDER.includes(k)),
  ]
  return orderedKeys.map((type) => ({
    type,
    experts: map.get(type)!,
  }))
})

const onRemove = async (expert: AssignedExpertInfo) => {
  if (props.progressId && expert.id) {
    removingKey.value = expertKey(expert)
    try {
      await api.delete(`/incubation/requests/${props.progressId}/experts/${expert.id}`)
      ElMessage.success('已移除专家')
      emit('changed')
    } catch (err: any) {
      ElMessage.error(err.response?.data?.error || '移除专家失败')
    } finally {
      removingKey.value = ''
    }
    return
  }
  emit('remove', expert)
}
</script>

<style scoped>
.assigned-experts-display {
  width: 100%;
}

.empty-hint {
  padding: 16px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
}

.expert-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.group-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.group-count {
  font-weight: 400;
  color: #9ca3af;
}

.expert-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.expert-card {
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 14px 16px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.expert-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.btn-remove {
  margin-left: auto;
  padding: 2px 10px;
  border: 1px solid #fca5a5;
  border-radius: 4px;
  background: #fff;
  color: #dc2626;
  font-size: 12px;
  cursor: pointer;
}

.btn-remove:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.info-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-row {
  display: flex;
  font-size: 14px;
  line-height: 1.5;
}

.label {
  width: 48px;
  flex-shrink: 0;
  color: #888;
}

.value {
  color: #333;
  word-break: break-all;
}
</style>
