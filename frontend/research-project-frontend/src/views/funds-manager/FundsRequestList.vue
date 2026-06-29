<!-- 经费管理员 - 经费申请审核（样式对齐服务申请处理） -->
<template>
  <div class="funds-requests-page">
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回工作台</span>
        </button>
        <h1>经费申请审核</h1>
        <div class="header-subtitle">审核申请人提交的经费申请（管理员直接登记请使用「经费申请」）</div>
      </div>
    </div>

    <div class="content-wrapper">
      <div class="filter-tabs">
        <button
          v-for="tab in statusTabs"
          :key="tab.value"
          class="tab-btn"
          :class="{ active: currentTab === tab.value }"
          @click="switchTab(tab.value)"
        >
          {{ tab.label }}
          <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
        </button>
      </div>

      <div class="section-card">
        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <div v-else-if="filteredRequests.length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <p>暂无{{ currentTab === 'all' ? '' : statusTabs.find((t) => t.value === currentTab)?.label }}经费申请</p>
        </div>

        <div v-else class="requests-grid">
          <div v-for="request in filteredRequests" :key="request.id" class="request-card">
            <div class="card-header" @click="openViewModal(request)">
              <div class="card-title-row">
                <span class="card-project-code">{{ request.project_code || '-' }}</span>
                <span class="card-status" :class="getStatusClass(request.status)">
                  {{ getStatusText(request.status) }}
                </span>
              </div>
              <h4 class="card-project-title">{{ request.project_title }}</h4>
            </div>
            <div class="card-body" @click="openViewModal(request)">
              <div class="card-info">
                <span class="info-label">申请人</span>
                <span class="info-value">{{ request.applicant_name || '-' }}</span>
              </div>
              <div class="card-info">
                <span class="info-label">申请金额（元）</span>
                <span class="info-value">¥ {{ formatAmountYuan(request.total_amount) }}</span>
              </div>
              <div class="card-info">
                <span class="info-label">申请时间</span>
                <span class="info-value">{{ formatDateTime(request.application_date || request.created_at) }}</span>
              </div>
              <div v-if="request.feedback_action" class="card-info">
                <span class="info-label">审核结果</span>
                <span class="info-value" :class="feedbackResultClass(request.feedback_action)">
                  {{ feedbackActionLabel(request.feedback_action) }}
                </span>
              </div>
            </div>
            <div class="card-footer">
              <button class="btn-view-detail" @click.stop="openViewModal(request)">查看详情</button>
              <button
                v-if="canAudit(request)"
                class="btn-approve"
                @click.stop="openAuditModal(request)"
              >
                审批经费申请
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 审核弹窗 -->
    <div v-if="showAuditModal" class="modal-overlay" @click.self="closeAuditModal">
      <div class="modal-content modal-wide">
        <div class="modal-header">
          <h3>审批经费申请</h3>
          <button class="modal-close" @click="closeAuditModal">×</button>
        </div>
        <div v-if="detailLoading" class="modal-loading">加载中...</div>
        <div v-else-if="selectedRequest" class="modal-body">
          <div class="form-group">
            <label class="form-label">项目名称</label>
            <div class="form-value">{{ selectedRequest.project_title }}</div>
          </div>
          <div class="form-group form-row-2">
            <div>
              <label class="form-label">项目编号</label>
              <div class="form-value">{{ selectedRequest.project_code || '-' }}</div>
            </div>
            <div>
              <label class="form-label">申请人</label>
              <div class="form-value">{{ selectedRequest.applicant_name }}（{{ selectedRequest.applicant_department || '—' }}）</div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">经费使用说明</label>
            <div class="form-value pre-wrap">{{ selectedRequest.service_requirement }}</div>
          </div>

          <div class="form-group">
            <label class="form-label">经费明细（可调整批准金额）</label>
            <div class="budget-table-wrap">
              <table class="budget-table">
                <thead>
                  <tr>
                    <th>科目</th>
                    <th>项目</th>
                    <th class="num">申请金额（元）</th>
                    <th class="num">批准金额（元）</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in selectedRequest.items || []" :key="item.id">
                    <td>{{ item.category }}</td>
                    <td>{{ item.item_name }}</td>
                    <td class="num">¥ {{ formatAmountYuan(item.amount) }}</td>
                    <td class="num">
                      <input
                        v-model.number="item._feedback_amount"
                        type="number"
                        min="0"
                        :max="Number(item.amount) || 0"
                        step="0.01"
                        class="amount-input"
                        placeholder="元"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label required">审核结论</label>
            <div class="action-radio-group">
              <label class="radio-item">
                <input v-model="feedbackForm.feedback_action" type="radio" value="approved" />
                全部批准
              </label>
              <label class="radio-item">
                <input v-model="feedbackForm.feedback_action" type="radio" value="partial_approved" />
                部分批准
              </label>
              <label class="radio-item">
                <input v-model="feedbackForm.feedback_action" type="radio" value="rejected" />
                全部拒绝
              </label>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">反馈说明</label>
            <textarea
              v-model="feedbackForm.feedback_comment"
              class="form-textarea"
              placeholder="请填写审核意见..."
              rows="3"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeAuditModal">取消</button>
          <button class="btn btn-primary" :disabled="submitting || detailLoading" @click="submitFeedback">
            {{ submitting ? '提交中...' : '确认提交' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 查看详情弹窗 -->
    <div v-if="showViewModal" class="modal-overlay" @click.self="closeViewModal">
      <div class="modal-content modal-wide">
        <div class="modal-header">
          <h3>经费申请详情</h3>
          <button class="modal-close" @click="closeViewModal">×</button>
        </div>
        <div v-if="detailLoading" class="modal-loading">加载中...</div>
        <div v-else-if="selectedRequest" class="modal-body">
          <div class="form-group form-row-2">
            <div>
              <label class="form-label">状态</label>
              <div class="form-value">
                <span class="card-status" :class="getStatusClass(selectedRequest.status)">
                  {{ getStatusText(selectedRequest.status) }}
                </span>
              </div>
            </div>
            <div>
              <label class="form-label">来源</label>
              <div class="form-value">
                {{ selectedRequest.submission_type === 'manager_direct' ? '管理员直接登记' : '申请人申请' }}
              </div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">经费使用说明</label>
            <div class="form-value pre-wrap">{{ selectedRequest.service_requirement }}</div>
          </div>
          <div class="form-group">
            <label class="form-label">经费明细</label>
            <div class="budget-table-wrap">
              <table class="budget-table">
                <thead>
                  <tr>
                    <th>科目</th>
                    <th>项目</th>
                    <th>说明</th>
                    <th class="num">申请金额（元）</th>
                    <th class="num">批准金额（元）</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in selectedRequest.items || []" :key="item.id">
                    <td>{{ item.category }}</td>
                    <td>{{ item.item_name }}</td>
                    <td>{{ item.description || '—' }}</td>
                    <td class="num">¥ {{ formatAmountYuan(item.amount) }}</td>
                    <td class="num">
                      {{ item.feedback_amount != null ? '¥ ' + formatAmountYuan(item.feedback_amount) : '—' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <template v-if="selectedRequest.status !== 'pending'">
            <div class="form-group">
              <label class="form-label">审核结果</label>
              <div class="form-value">{{ feedbackActionLabel(selectedRequest.feedback_action) }}</div>
            </div>
            <div class="form-group">
              <label class="form-label">反馈说明</label>
              <div class="form-value pre-wrap">{{ selectedRequest.feedback_comment || '—' }}</div>
            </div>
            <div v-if="selectedRequest.result_description" class="form-group">
              <label class="form-label">成果描述</label>
              <div class="form-value pre-wrap">{{ selectedRequest.result_description }}</div>
            </div>
          </template>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeViewModal">关闭</button>
          <button
            v-if="selectedRequest && canAudit(selectedRequest)"
            class="btn btn-primary"
            @click="switchToAudit"
          >
            去审批
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import request from '@/utils/request'
import {
  formatAmountYuan,
} from '@/constants/budgetCategories'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const detailLoading = ref(false)
const submitting = ref(false)
const requests = ref<any[]>([])
const currentTab = ref('pending')
const showAuditModal = ref(false)
const showViewModal = ref(false)
const selectedRequest = ref<any>(null)
const feedbackForm = ref({
  feedback_action: 'approved',
  feedback_comment: '',
})

const applicantRequests = computed(() =>
  requests.value.filter((r) => r.submission_type !== 'manager_direct'),
)

const statusTabs = computed(() => [
  {
    value: 'pending',
    label: '待处理',
    count: applicantRequests.value.filter((r) => r.status === 'pending').length,
  },
  {
    value: 'feedback_given',
    label: '已反馈',
    count: applicantRequests.value.filter((r) => r.status === 'feedback_given').length,
  },
  {
    value: 'result_submitted',
    label: '已完成',
    count: applicantRequests.value.filter((r) => r.status === 'result_submitted').length,
  },
  { value: 'all', label: '全部', count: applicantRequests.value.length },
])

const filteredRequests = computed(() => {
  const list = applicantRequests.value
  if (currentTab.value === 'all') return list
  return list.filter((r) => r.status === currentTab.value)
})

const formatDateTime = (d: string | null | undefined) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
}

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    pending: 'pending',
    feedback_given: 'feedback',
    result_submitted: 'completed',
  }
  return map[status] || ''
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待处理',
    feedback_given: '已反馈',
    result_submitted: '已完成',
  }
  return map[status] || status
}

const feedbackActionLabel = (a: string) =>
  ({
    approved: '全部批准',
    rejected: '全部拒绝',
    partial_approved: '部分批准',
  })[a] || a || '-'

const feedbackResultClass = (a: string) => {
  if (a === 'rejected') return 'danger'
  return 'success'
}

const canAudit = (request: any) =>
  request.status === 'pending' && request.submission_type !== 'manager_direct'

const loadRequests = async () => {
  loading.value = true
  try {
    const res = (await request.get('/api/funds-manager/requests', {
      params: { limit: 500, page: 1 },
    })) as any
    if (res.success) {
      requests.value = res.data?.requests || []
    }
  } catch {
    ElMessage.error('加载经费申请列表失败')
  } finally {
    loading.value = false
  }
}

const loadRequestDetail = async (id: string) => {
  detailLoading.value = true
  selectedRequest.value = null
  try {
    const res = (await request.get(`/api/funds-manager/requests/${id}`)) as any
    if (res.success) {
      const data = res.data
      ;(data.items || []).forEach((item: any) => {
        const yuan =
          item.feedback_amount != null ? Number(item.feedback_amount) : Number(item.amount)
        item._feedback_amount = yuan
      })
      selectedRequest.value = data
    }
  } catch {
    ElMessage.error('加载详情失败')
  } finally {
    detailLoading.value = false
  }
}

const openAuditModal = async (request: any) => {
  showViewModal.value = false
  showAuditModal.value = true
  feedbackForm.value = { feedback_action: 'approved', feedback_comment: '' }
  await loadRequestDetail(request.id)
}

const openViewModal = async (request: any) => {
  showAuditModal.value = false
  showViewModal.value = true
  await loadRequestDetail(request.id)
}

const closeAuditModal = () => {
  showAuditModal.value = false
  selectedRequest.value = null
}

const closeViewModal = () => {
  showViewModal.value = false
  selectedRequest.value = null
}

const switchToAudit = () => {
  if (!selectedRequest.value) return
  const id = selectedRequest.value.id
  closeViewModal()
  openAuditModal({ id })
}

const submitFeedback = async () => {
  if (!selectedRequest.value) return
  submitting.value = true
  try {
    const items = (selectedRequest.value.items || []).map((item: any) => ({
      id: item.id,
      feedback_amount: parseFloat((Number(item._feedback_amount) || 0).toFixed(2)),
      feedback_comment: item.feedback_comment || null,
    }))
    const res = (await request.post(`/api/funds-manager/requests/${selectedRequest.value.id}/feedback`, {
      feedback_action: feedbackForm.value.feedback_action,
      feedback_comment: feedbackForm.value.feedback_comment,
      items,
    })) as any
    if (res.success) {
      ElMessage.success('审核反馈已提交')
      closeAuditModal()
      loadRequests()
    } else {
      ElMessage.error(res.error || '提交失败')
    }
  } catch (e: any) {
    ElMessage.error(e.response?.data?.error || '提交失败')
  } finally {
    submitting.value = false
  }
}

const switchTab = (tab: string) => {
  currentTab.value = tab
}

const goBack = () => {
  router.push('/funds-manager/dashboard')
}

onMounted(() => {
  const userRole = (localStorage.getItem('userRole') || '').toLowerCase()
  if (userRole !== 'funds_manager') {
    ElMessage.warning('无权限访问')
    router.push('/login')
    return
  }
  if (route.query.status && typeof route.query.status === 'string') {
    currentTab.value = route.query.status
  }
  loadRequests().then(() => {
    const openId = route.params.id as string
    if (openId) {
      const found = requests.value.find((r) => r.id === openId)
      if (found && canAudit(found)) openAuditModal(found)
      else if (found) openViewModal(found)
    }
  })
})
</script>

<style scoped>
.funds-requests-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.page-header {
  background: white;
  padding: 20px 32px;
  border-bottom: 1px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  color: #666;
  cursor: pointer;
  transition: all 0.3s;
}

.back-btn:hover {
  background: #e8e8e8;
  color: #333;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
  font-weight: 600;
}

.header-subtitle {
  width: 100%;
  margin: 4px 0 0;
  color: #999;
  font-size: 14px;
}

.content-wrapper {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.filter-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 10px 20px;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-btn:hover {
  border-color: #b31b1b;
  color: #b31b1b;
}

.tab-btn.active {
  background: #b31b1b;
  color: white;
  border-color: #b31b1b;
}

.tab-count {
  display: inline-block;
  margin-left: 6px;
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  font-size: 12px;
}

.tab-btn:not(.active) .tab-count {
  background: #f5f5f5;
}

.section-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.requests-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  padding: 16px;
}

.request-card {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  transition: all 0.3s;
  overflow: hidden;
}

.request-card:hover {
  border-color: #b31b1b;
  box-shadow: 0 4px 12px rgba(179, 27, 27, 0.1);
  transform: translateY(-2px);
}

.card-header {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-project-code {
  font-size: 12px;
  color: #b31b1b;
  background: rgba(179, 27, 27, 0.06);
  padding: 2px 8px;
  border-radius: 4px;
}

.card-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
}

.card-status.pending {
  background: #fff7e6;
  color: #fa8c16;
}

.card-status.feedback {
  background: #e6f7ff;
  color: #1890ff;
}

.card-status.completed {
  background: #f6ffed;
  color: #52c41a;
}

.card-project-title {
  margin: 0;
  font-size: 16px;
  color: #333;
  font-weight: 500;
  line-height: 1.4;
}

.card-body {
  padding: 12px 16px;
  cursor: pointer;
}

.card-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}

.card-info:last-child {
  margin-bottom: 0;
}

.info-label {
  color: #999;
}

.info-value {
  color: #333;
  text-align: right;
  max-width: 60%;
}

.info-value.success {
  color: #52c41a;
}

.info-value.danger {
  color: #ff4d4f;
}

.card-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
}

.btn-view-detail,
.btn-approve {
  flex: 1;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid #e8e8e8;
  background: white;
  color: #666;
  transition: all 0.2s;
}

.btn-view-detail:hover {
  border-color: #b31b1b;
  color: #b31b1b;
}

.btn-approve {
  background: #b31b1b;
  color: white;
  border-color: #b31b1b;
}

.btn-approve:hover {
  background: #8b0000;
}

.loading-state,
.empty-state {
  padding: 64px;
  text-align: center;
  color: #999;
}

.loading-spinner {
  width: 40px;
  height: 40px;
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

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 520px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-content.modal-wide {
  max-width: 720px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.modal-loading {
  padding: 48px;
  text-align: center;
  color: #999;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.form-group {
  margin-bottom: 18px;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.form-label.required::after {
  content: '*';
  color: #ff4d4f;
  margin-left: 4px;
}

.form-value {
  font-size: 14px;
  color: #666;
}

.form-value.pre-wrap {
  white-space: pre-wrap;
  line-height: 1.6;
}

.form-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  resize: vertical;
  box-sizing: border-box;
}

.form-textarea:focus {
  outline: none;
  border-color: #b31b1b;
}

.action-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
}

.budget-table-wrap {
  overflow-x: auto;
  border: 1px solid #eee;
  border-radius: 8px;
}

.budget-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.budget-table th,
.budget-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
  text-align: left;
}

.budget-table th {
  background: #fafafa;
  color: #666;
  font-weight: 600;
}

.budget-table .num {
  text-align: right;
  white-space: nowrap;
}

.amount-input {
  width: 100px;
  padding: 6px 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  text-align: right;
}

.btn {
  padding: 10px 24px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: #b31b1b;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #8b0000;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #666;
  border: 1px solid #d9d9d9;
}

.btn-secondary:hover {
  border-color: #b31b1b;
  color: #b31b1b;
}
</style>
