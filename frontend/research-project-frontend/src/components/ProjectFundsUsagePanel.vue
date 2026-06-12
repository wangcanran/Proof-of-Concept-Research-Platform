<!-- 项目详情 - 经费使用情况（使用明细） -->
<template>
  <div class="project-funds-usage">
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>加载经费使用情况...</p>
    </div>
    <template v-else-if="usage">
      <div v-if="!compact" class="summary-cards">
        <div class="summary-card spent">
          <span class="summary-label">已使用</span>
          <span class="summary-value">¥ {{ formatAmount(usage.spent_amount) }}</span>
        </div>
      </div>

      <div class="section">
        <h3 v-if="!compact">使用明细</h3>
        <div v-if="detailLines.length === 0" class="empty-state">
          <p>暂无使用明细</p>
        </div>
        <table v-else class="items-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>科目</th>
              <th>项目</th>
              <th>说明</th>
              <th class="num">金额</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in detailLines" :key="line.id">
              <td>{{ formatDate(line.date) }}</td>
              <td>{{ line.category }}</td>
              <td>{{ line.item_name }}</td>
              <td>{{ line.description || '—' }}</td>
              <td class="num">¥ {{ formatAmount(line.amount) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" class="text-right"><strong>合计</strong></td>
              <td class="num"><strong>¥ {{ formatAmount(usage.spent_amount) }}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </template>
    <div v-else-if="error" class="empty-state error">
      <p>{{ error }}</p>
      <button type="button" class="retry-btn" @click="load">重试</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import request from '@/utils/request'

const props = defineProps<{
  projectId: string
  /** 嵌入汇总页时仅展示明细表格，不重复显示已使用卡片 */
  compact?: boolean
}>()

const loading = ref(false)
const error = ref('')
const usage = ref<any>(null)

const detailLines = computed(() => {
  if (!usage.value?.requests?.length) return []
  const lines: Array<{
    id: string
    date: string
    category: string
    item_name: string
    description: string
    amount: number
  }> = []
  for (const req of usage.value.requests) {
    if (!['approved', 'partial_approved'].includes(req.feedback_action)) continue
    const date = req.application_date || req.created_at
    for (const item of req.items || []) {
      if (item.feedback_amount == null) continue
      lines.push({
        id: item.id,
        date,
        category: item.category,
        item_name: item.item_name,
        description: item.description,
        amount: item.feedback_amount,
      })
    }
  }
  return lines
})

const formatAmount = (v: number | string | null | undefined) => {
  const n = Number(v) || 0
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatDate = (d: string | null | undefined) => {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('zh-CN')
}

const load = async () => {
  if (!props.projectId) return
  loading.value = true
  error.value = ''
  try {
    const res = (await request.get(`/api/projects/${props.projectId}/funds-usage`)) as any
    if (res.success) {
      usage.value = res.data
    } else {
      error.value = res.error || '加载失败'
      usage.value = null
    }
  } catch (e: any) {
    error.value = e.response?.data?.error || '加载经费使用情况失败'
    usage.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => props.projectId,
  (id) => {
    if (id) load()
  },
)

onMounted(() => {
  if (props.projectId) load()
})
</script>

<style scoped>
.project-funds-usage {
  min-height: 80px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.summary-card {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.summary-card.spent {
  border-color: #ffe7ba;
  background: #fff7e6;
}

.summary-label {
  font-size: 13px;
  color: #8c8c8c;
}

.summary-value {
  font-size: 22px;
  font-weight: 600;
  color: #262626;
}

.section h3 {
  margin: 0 0 12px;
  font-size: 15px;
  color: #333;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.items-table th,
.items-table td {
  padding: 10px 12px;
  border: 1px solid #f0f0f0;
  text-align: left;
}

.items-table th {
  background: #fafafa;
  color: #666;
  font-weight: 600;
}

.items-table .num {
  text-align: right;
  white-space: nowrap;
}

.items-table tfoot td {
  background: #fafafa;
}

.text-right {
  text-align: right;
}

.loading-state,
.empty-state {
  padding: 32px;
  text-align: center;
  color: #999;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #f0f0f0;
  border-top-color: #b31b1b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.retry-btn {
  margin-top: 12px;
  padding: 8px 16px;
  border: 1px solid #b31b1b;
  color: #b31b1b;
  background: white;
  border-radius: 6px;
  cursor: pointer;
}
</style>
