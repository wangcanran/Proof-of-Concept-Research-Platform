<template>
  <div class="assigned-providers-display">
    <div v-if="!providers.length" class="empty-hint">暂未分配服务机构</div>
    <div v-else class="provider-cards">
      <div v-for="provider in providers" :key="providerKey(provider)" class="provider-card">
        <div class="card-header">
          <div class="name-with-tags">
            <span class="provider-name">{{ provider.provider_name || provider.name }}</span>
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
          <button
            v-if="editable"
            type="button"
            class="btn-remove"
            :disabled="removingKey === providerKey(provider)"
            @click="onRemove(provider)"
          >
            移除
          </button>
        </div>
        <div class="info-rows">
          <div class="info-row">
            <span class="label">统一社会信用代码</span>
            <span class="value">{{ provider.unified_social_credit_code || '—' }}</span>
          </div>
          <div class="info-row">
            <span class="label">联系人</span>
            <span class="value">{{ provider.contact_name || '—' }}</span>
          </div>
          <div class="info-row">
            <span class="label">联系电话</span>
            <span class="value">{{ provider.contact_phone || '—' }}</span>
          </div>
          <div class="info-row">
            <span class="label">联系邮箱</span>
            <span class="value">{{ provider.contact_email || '—' }}</span>
          </div>
          <div class="info-row">
            <span class="label">机构简介</span>
            <span class="value">{{ provider.description || '—' }}</span>
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

export interface AssignedServiceProviderInfo {
  id?: string
  service_provider_id: string
  provider_name?: string
  name?: string
  category?: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  unified_social_credit_code?: string
  description?: string
}

const props = withDefaults(
  defineProps<{
    providers: AssignedServiceProviderInfo[]
    editable?: boolean
    progressId?: string
  }>(),
  {
    editable: false,
    progressId: '',
  },
)

const emit = defineEmits<{
  remove: [provider: AssignedServiceProviderInfo]
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

function getCategoryTags(category?: string) {
  if (!category) return []
  return String(category)
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
}

const providerKey = (p: AssignedServiceProviderInfo) =>
  p.id || p.service_provider_id

const onRemove = async (provider: AssignedServiceProviderInfo) => {
  if (props.progressId && provider.id) {
    removingKey.value = providerKey(provider)
    try {
      await api.delete(
        `/incubation/requests/${props.progressId}/service-providers/${provider.id}`,
      )
      ElMessage.success('已移除服务机构')
      emit('changed')
    } catch (err: any) {
      ElMessage.error(err.response?.data?.error || '移除服务机构失败')
    } finally {
      removingKey.value = ''
    }
    return
  }
  emit('remove', provider)
}
</script>

<style scoped>
.assigned-providers-display {
  width: 100%;
}

.empty-hint {
  padding: 16px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
}

.provider-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.provider-card {
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 14px 16px;
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}

.name-with-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.provider-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
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
  width: 120px;
  flex-shrink: 0;
  color: #888;
}

.value {
  color: #333;
  word-break: break-all;
  flex: 1;
}
</style>
