<template>
  <div class="assigned-experts-display">
    <div v-if="!experts.length" class="empty-hint">暂未分配专家</div>
    <div v-else class="expert-cards">
      <div v-for="expert in experts" :key="expertKey(expert)" class="expert-card">
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
          <div class="info-row">
            <span class="label">专家类型</span>
            <span class="value type-tags">
              <el-tag
                v-for="t in getProfileTypes(expert)"
                :key="t"
                size="small"
                :class="['expert-type-tag', t]"
              >
                {{ typeLabel(t) }}
              </el-tag>
              <span v-if="!getProfileTypes(expert).length">—</span>
            </span>
          </div>
          <div class="info-row">
            <span class="label">所属部门/单位</span>
            <span class="value">{{ expert.department || '—' }}</span>
          </div>
          <div class="info-row">
            <span class="label">职称/职务</span>
            <span class="value">{{ expert.title || '—' }}</span>
          </div>
          <div class="info-row">
            <span class="label">邮箱</span>
            <span class="value">{{ expert.expert_email || '—' }}</span>
          </div>
          <div class="info-row">
            <span class="label">联系电话</span>
            <span class="value">{{ expert.expert_phone || '—' }}</span>
          </div>
          <div class="info-row">
            <span class="label">研究领域</span>
            <span class="value">{{ formatResearchFields(expert) }}</span>
          </div>
          <div class="info-row">
            <span class="label">专业特长描述</span>
            <span class="value">{{ expert.expertise_description || '—' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getApiBaseUrl } from '@/utils/request'
import axios from 'axios'

export interface AssignedExpertInfo {
  id?: string
  expert_id: string
  expert_type?: 'technical' | 'industry' | 'investment' | 'tech_service'
  expert_name: string
  expert_email?: string
  expert_phone?: string
  department?: string
  title?: string
  profile_types?: string[]
  profileTypes?: string[]
  expert_types?: string[]
  expertTypes?: string[]
  research_fields?: string[]
  research_field?: string
  expertise_description?: string | null
}

const EXPERT_TYPE_LABELS: Record<string, string> = {
  technical: '技术专家',
  industry: '产业专家',
  investment: '投资专家',
  tech_service: '科技服务专家',
}

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

const typeLabel = (type: string) => EXPERT_TYPE_LABELS[type] || type

const expertKey = (expert: AssignedExpertInfo) =>
  expert.id || `${expert.expert_id}-${expert.expert_type || ''}`

const getProfileTypes = (expert: AssignedExpertInfo) => {
  const types =
    expert.profile_types ??
    expert.profileTypes ??
    expert.expert_types ??
    expert.expertTypes ??
    []
  return Array.isArray(types) ? types : []
}

const formatResearchFields = (expert: AssignedExpertInfo) => {
  const fields = expert.research_fields
  if (Array.isArray(fields) && fields.length) return fields.join('、')
  if (expert.research_field) return expert.research_field
  return '—'
}

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
  width: 108px;
  flex-shrink: 0;
  color: #888;
}

.value {
  color: #333;
  word-break: break-all;
  flex: 1;
}

.type-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
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
</style>
