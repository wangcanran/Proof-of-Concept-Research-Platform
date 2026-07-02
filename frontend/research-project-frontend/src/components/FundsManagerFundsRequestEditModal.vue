<template>
  <div v-if="visible" class="modal-overlay" @click.self="close">
    <div class="modal-content modal-wide">
      <div class="modal-header">
        <h3>修改经费登记</h3>
        <button type="button" class="modal-close" @click="close">×</button>
      </div>
      <div v-if="loading" class="modal-loading">加载中...</div>
      <form v-else class="modal-body" @submit.prevent="submit">
        <div class="form-group">
          <label class="form-label">项目</label>
          <div class="form-value">{{ detail?.project_title }}（{{ detail?.project_code || '—' }}）</div>
        </div>
        <div class="form-group">
          <label class="form-label required">经费使用说明</label>
          <textarea
            v-model="serviceRequirement"
            class="form-textarea"
            rows="4"
            placeholder="请说明本次经费的整体用途、必要性等..."
            required
          />
        </div>
        <div class="form-group">
          <label class="form-label required">经费预算明细</label>
          <BudgetItemsEditor v-model="budgetItems" />
        </div>
        <div class="form-group">
          <label class="form-label">登记说明</label>
          <textarea
            v-model="feedbackComment"
            class="form-textarea"
            rows="2"
            placeholder="可选，如：经费管理员直接登记，已批准"
          />
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="close">取消</button>
          <button type="submit" class="btn btn-primary" :disabled="submitting">
            {{ submitting ? '保存中...' : '保存修改' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { getApiBaseUrl } from '@/utils/request'
import BudgetItemsEditor from '@/components/BudgetItemsEditor.vue'
import { type BudgetRow } from '@/constants/budgetCategories'

const props = defineProps<{
  visible: boolean
  requestId: string
}>()

const emit = defineEmits<{
  'update:visible': [boolean]
  saved: []
}>()

const api = axios.create({ baseURL: getApiBaseUrl(), timeout: 30000 })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const loading = ref(false)
const submitting = ref(false)
const detail = ref<any>(null)
const serviceRequirement = ref('')
const feedbackComment = ref('')
const budgetItems = ref<BudgetRow[]>([])

function close() {
  emit('update:visible', false)
}

function normalizedItems() {
  return budgetItems.value
    .filter((r) => r.category && String(r.item_name || '').trim())
    .map((r) => ({
      category: r.category,
      item_name: r.item_name.trim(),
      description: r.description || '',
      amount: parseFloat((Number(r.amount) || 0).toFixed(2)),
    }))
}

async function loadDetail() {
  if (!props.requestId) return
  loading.value = true
  detail.value = null
  try {
    const res = await api.get(`/funds-manager/requests/${props.requestId}`)
    if (!res.data.success) {
      ElMessage.error(res.data.error || '加载失败')
      close()
      return
    }
    const data = res.data.data
    detail.value = data
    serviceRequirement.value = data.service_requirement || ''
    feedbackComment.value = data.feedback_comment || ''
    budgetItems.value = (data.items || []).map((item: any) => ({
      category: item.category || '',
      item_name: item.item_name || '',
      description: item.description || '',
      amount: Number(item.feedback_amount ?? item.amount) || 0,
    }))
    if (!budgetItems.value.length) {
      budgetItems.value = [{ category: '', item_name: '', description: '', amount: 0 }]
    }
  } catch {
    ElMessage.error('加载经费记录失败')
    close()
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!props.requestId) return
  if (!serviceRequirement.value.trim()) {
    ElMessage.warning('请填写经费使用说明')
    return
  }
  const items = normalizedItems()
  if (!items.length) {
    ElMessage.warning('请至少添加一条有效的经费预算明细')
    return
  }
  submitting.value = true
  try {
    const res = await api.put(`/funds-manager/funds-requests/${props.requestId}`, {
      service_requirement: serviceRequirement.value.trim(),
      feedback_comment: feedbackComment.value.trim() || undefined,
      items,
    })
    if (res.data.success) {
      ElMessage.success(res.data.message || '经费登记已更新')
      emit('saved')
      close()
    } else {
      ElMessage.error(res.data.error || '保存失败')
    }
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error || '保存失败'
    ElMessage.error(msg)
  } finally {
    submitting.value = false
  }
}

watch(
  () => [props.visible, props.requestId] as const,
  ([vis, id]) => {
    if (vis && id) loadDetail()
  },
  { immediate: true },
)
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}
.modal-content {
  background: #fff;
  border-radius: 12px;
  width: 100%;
  max-width: 920px;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}
.modal-header h3 { margin: 0; font-size: 18px; color: #2c3e50; }
.modal-close {
  border: none;
  background: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
}
.modal-body { padding: 20px; }
.modal-loading { padding: 40px; text-align: center; color: #909399; }
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
.form-group { margin-bottom: 16px; }
.form-label { display: block; margin-bottom: 8px; font-weight: 600; color: #303133; font-size: 14px; }
.form-label.required::after { content: ' *'; color: #f56c6c; }
.form-value { color: #606266; font-size: 14px; }
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-size: 14px;
  resize: vertical;
  box-sizing: border-box;
}
.btn {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  border: none;
}
.btn-primary { background: #b31b1b; color: #fff; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { background: #f5f5f5; color: #666; border: 1px solid #ddd; }
</style>
