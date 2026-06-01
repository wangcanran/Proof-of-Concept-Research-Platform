<!-- 项目详情 - 经费使用情况 -->
<template>
  <div class="project-funds-usage">
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>加载经费使用情况...</p>
    </div>
    <template v-else-if="usage">
      <div class="summary-cards">
        <div class="summary-card">
          <span class="summary-label">总预算</span>
          <span class="summary-value">¥ {{ formatAmount(usage.total_budget) }}</span>
        </div>
        <div class="summary-card spent">
          <span class="summary-label">已花费</span>
          <span class="summary-value">¥ {{ formatAmount(usage.spent_amount) }}</span>
          <span class="summary-hint">已批准经费申请金额合计</span>
        </div>
        <div class="summary-card remain">
          <span class="summary-label">剩余预算</span>
          <span class="summary-value" :class="{ warning: remainingAmount < 0 }">
            ¥ {{ formatAmount(remainingAmount) }}
          </span>
        </div>
        <div class="summary-card rate" v-if="usage.total_budget > 0">
          <span class="summary-label">执行率</span>
          <span class="summary-value">{{ usageRate }}%</span>
          <div class="rate-bar">
            <div class="rate-fill" :style="{ width: Math.min(usageRate, 100) + '%' }"></div>
          </div>
        </div>
      </div>

      <div class="section">
        <h3>经费申请记录</h3>
        <div v-if="!usage.requests?.length" class="empty-state">
          <p>暂无经费申请记录</p>
        </div>
        <div v-else class="request-list">
          <div
            v-for="(req, index) in usage.requests"
            :key="req.id"
            class="request-block"
          >
            <div class="request-header" @click="toggleExpand(req.id)">
              <div class="request-header-left">
                <span class="request-index">第 {{ usage.requests.length - index }} 次</span>
                <span class="request-date">{{ formatDateTime(req.application_date || req.created_at) }}</span>
                <span class="status-tag" :class="getStatusClass(req.status)">{{ getStatusText(req.status) }}</span>
                <span v-if="req.feedback_action" class="feedback-tag" :class="req.feedback_action">
                  {{ feedbackActionLabel(req.feedback_action) }}
                </span>
              </div>
              <div class="request-header-right">
                <span>申请 ¥{{ formatAmount(req.requested_amount) }}</span>
                <span v-if="req.approved_amount > 0 || req.feedback_action" class="approved">
                  批准 ¥{{ formatAmount(req.approved_amount) }}
                </span>
                <span class="expand-icon">{{ expandedIds.has(req.id) ? '▼' : '▶' }}</span>
              </div>
            </div>
            <div v-show="expandedIds.has(req.id)" class="request-body">
              <div class="meta-row">
                <span>申请人：{{ req.applicant_name || '—' }}</span>
                <span v-if="req.submission_type === 'manager_direct'">来源：管理员直接登记</span>
              </div>
              <div class="desc-block">
                <strong>经费使用说明</strong>
                <p>{{ req.service_requirement || '—' }}</p>
              </div>
              <div v-if="req.feedback_comment" class="desc-block feedback">
                <strong>审核意见</strong>
                <p>{{ req.feedback_comment }}</p>
              </div>
              <table class="items-table">
                <thead>
                  <tr>
                    <th>科目</th>
                    <th>项目</th>
                    <th>说明</th>
                    <th class="num">申请金额</th>
                    <th class="num">批准金额</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in req.items" :key="item.id">
                    <td>{{ item.category }}</td>
                    <td>{{ item.item_name }}</td>
                    <td>{{ item.description || '—' }}</td>
                    <td class="num">¥ {{ formatAmount(item.amount) }}</td>
                    <td class="num">
                      {{ item.feedback_amount != null ? '¥ ' + formatAmount(item.feedback_amount) : '—' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
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
import { calcProjectFundsRemaining } from '@/utils/projectFunds'

const props = defineProps<{
  projectId: string
}>()

const loading = ref(false)
const error = ref('')
const usage = ref<any>(null)
const expandedIds = ref(new Set<string>())

const remainingAmount = computed(() => {
  if (!usage.value) return 0
  return calcProjectFundsRemaining(usage.value.total_budget, usage.value.spent_amount)
})

const usageRate = computed(() => {
  if (!usage.value?.total_budget) return 0
  const rate = (usage.value.spent_amount / usage.value.total_budget) * 100
  return Math.round(rate * 10) / 10
})

const formatAmount = (v: number | string | null | undefined) => {
  const n = Number(v) || 0
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatDateTime = (d: string | null | undefined) => {
  if (!d) return '—'
  return new Date(d).toLocaleString('zh-CN')
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待审核',
    feedback_given: '已反馈',
    result_submitted: '已完成',
  }
  return map[status] || status
}

const getStatusClass = (status: string) => status

const feedbackActionLabel = (a: string) =>
  ({
    approved: '全部批准',
    rejected: '全部拒绝',
    partial_approved: '部分批准',
  })[a] || a

const toggleExpand = (id: string) => {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

const load = async () => {
  if (!props.projectId) return
  loading.value = true
  error.value = ''
  try {
    const res = (await request.get(`/api/projects/${props.projectId}/funds-usage`)) as any
    if (res.success) {
      usage.value = res.data
      expandedIds.value = new Set(
        (res.data.requests || []).slice(0, 1).map((r: any) => r.id),
      )
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
  min-height: 120px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
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

.summary-card.remain {
  border-color: #d9f7be;
  background: #f6ffed;
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

.summary-value.warning {
  color: #ff4d4f;
}

.summary-hint {
  font-size: 12px;
  color: #bfbfbf;
}

.rate-bar {
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
  margin-top: 4px;
}

.rate-fill {
  height: 100%;
  background: #b31b1b;
  border-radius: 3px;
  transition: width 0.3s;
}

.section h3 {
  margin: 0 0 16px;
  font-size: 16px;
  color: #333;
}

.request-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.request-block {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
}

.request-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: #fafafa;
  cursor: pointer;
  flex-wrap: wrap;
  gap: 8px;
}

.request-header:hover {
  background: #f5f5f5;
}

.request-header-left,
.request-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.request-index {
  font-weight: 600;
  color: #b31b1b;
}

.request-date {
  font-size: 13px;
  color: #666;
}

.status-tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  background: #fff7e6;
  color: #fa8c16;
}

.status-tag.feedback_given {
  background: #e6f7ff;
  color: #1890ff;
}

.status-tag.result_submitted {
  background: #f6ffed;
  color: #52c41a;
}

.feedback-tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
}

.feedback-tag.approved,
.feedback-tag.partial_approved {
  background: #f6ffed;
  color: #52c41a;
}

.feedback-tag.rejected {
  background: #fff1f0;
  color: #ff4d4f;
}

.request-header-right {
  font-size: 13px;
  color: #666;
}

.request-header-right .approved {
  color: #52c41a;
  font-weight: 500;
}

.expand-icon {
  color: #999;
  font-size: 12px;
}

.request-body {
  padding: 16px;
  border-top: 1px solid #f0f0f0;
}

.meta-row {
  display: flex;
  gap: 24px;
  font-size: 13px;
  color: #666;
  margin-bottom: 12px;
}

.desc-block {
  margin-bottom: 12px;
  font-size: 14px;
}

.desc-block strong {
  display: block;
  margin-bottom: 6px;
  color: #333;
}

.desc-block p {
  margin: 0;
  color: #666;
  line-height: 1.6;
  white-space: pre-wrap;
}

.desc-block.feedback p {
  color: #1890ff;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  margin-top: 8px;
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

.loading-state,
.empty-state {
  padding: 48px;
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
