<!-- 申请人 - 经费申请详情（只读） -->
<template>
  <div class="funds-request-detail-page">
    <div class="page-header">
      <button type="button" class="back-btn" @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        <span>返回</span>
      </button>
      <h1>经费申请详情</h1>
      <span v-if="detail" class="type-badge type-funds">经费申请</span>
    </div>

    <div v-if="loading" class="loading-box">加载中...</div>
    <template v-else-if="detail">
      <div class="section-card">
        <h3>{{ detail.project_title }}</h3>
        <p class="meta">编号：{{ detail.project_code || '—' }}</p>
        <p class="meta">状态：{{ statusLabel(detail.status) }}</p>
        <p v-if="detail.submission_type === 'manager_direct'" class="meta tag-manager">
          来源：经费管理员直接登记（已批准，免审核）
        </p>
        <p v-else-if="detail.submission_type === 'applicant_request'" class="meta">
          来源：申请人提交申请
        </p>
        <p v-if="detail.feedback_action" class="meta">
          审核结果：{{ feedbackActionLabel(detail.feedback_action) }}
        </p>
        <p v-if="detail.feedback_by_name" class="meta">处理人：{{ detail.feedback_by_name }}</p>
      </div>

      <div class="section-card">
        <h4>经费使用说明</h4>
        <p class="content">{{ detail.service_requirement }}</p>
      </div>

      <div class="section-card">
        <h4>经费明细</h4>
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
            <tr v-for="item in detail.items || []" :key="item.id">
              <td>{{ item.category }}</td>
              <td>{{ item.item_name }}</td>
              <td>{{ item.description || '—' }}</td>
              <td class="num">¥{{ formatAmount(item.amount) }}</td>
              <td class="num">
                {{ item.feedback_amount != null ? '¥' + formatAmount(item.feedback_amount) : '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="detail.result_description || resultFiles.length" class="section-card">
        <h4>成果反馈</h4>
        <p v-if="detail.result_description" class="content">{{ detail.result_description }}</p>
        <p v-if="detail.result_date" class="meta">提交时间：{{ formatDate(detail.result_date) }}</p>
        <div v-if="resultFiles.length > 0" class="attachments-block">
          <p class="meta">成果附件：</p>
          <a
            v-for="file in resultFiles"
            :key="file.id"
            class="attachment-link"
            :href="getFileUrl(file.id)"
            target="_blank"
          >
            📎 {{ file.file_name }}
          </a>
        </div>
      </div>

      <div v-if="applicationFiles.length > 0" class="section-card">
        <h4>申请附件</h4>
        <div class="attachments-block">
          <a
            v-for="file in applicationFiles"
            :key="file.id"
            class="attachment-link"
            :href="getFileUrl(file.id)"
            target="_blank"
          >
            📎 {{ file.file_name }}
          </a>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request, { getApiBaseUrl } from '@/utils/request'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const detail = ref<any>(null)

const applicationFiles = computed(() =>
  (detail.value?.files || []).filter((f: any) => f.attachment_type === 'application'),
)
const resultFiles = computed(() =>
  (detail.value?.files || []).filter((f: any) => f.attachment_type === 'result'),
)

const getFileUrl = (fileId: string) => {
  const token = localStorage.getItem('token')
  return `${getApiBaseUrl()}/funds-requests/files/${fileId}?token=${token}`
}

const formatAmount = (v: number | string | null | undefined) => {
  const n = Number(v) || 0
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatDate = (d: string | null) => (d ? new Date(d).toLocaleString('zh-CN') : '—')

const statusLabel = (s: string) =>
  ({ pending: '待审核', feedback_given: '已反馈', result_submitted: '已提交成果' })[s] || s

const feedbackActionLabel = (a: string) =>
  ({ approved: '全部批准', rejected: '全部拒绝', partial_approved: '部分批准' })[a] || a

const goBack = () => {
  const from = route.query.from as string
  if (from === 'funds-apply') {
    router.push('/funds-request/apply')
  } else {
    router.push('/applicant/dashboard')
  }
}

const loadDetail = async () => {
  const id = route.params.id as string
  if (!id) return
  loading.value = true
  try {
    const res = (await request.get(`/api/applicant/funds-requests/${id}`)) as any
    if (res.success) {
      detail.value = res.data
    } else {
      ElMessage.error(res.error || '加载失败')
    }
  } catch {
    ElMessage.error('加载详情失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadDetail)
</script>

<style scoped>
.funds-request-detail-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  font-size: 22px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}

.type-badge.type-funds {
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
  background: #fff7e6;
  color: #d48806;
  border: 1px solid #ffd591;
}

.section-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.section-card h3,
.section-card h4 {
  margin: 0 0 12px;
  color: #2c3e50;
}

.meta {
  margin: 4px 0;
  color: #666;
  font-size: 14px;
}

.tag-manager {
  color: #d48806;
  font-weight: 500;
}

.content {
  margin: 0;
  line-height: 1.6;
  color: #333;
}

.attachments-block {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachment-link {
  color: #b31b1b;
  font-size: 14px;
  text-decoration: none;
}

.attachment-link:hover {
  text-decoration: underline;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.items-table th,
.items-table td {
  border: 1px solid #eee;
  padding: 8px 10px;
  text-align: left;
}

.items-table th {
  background: #fafafa;
}

.num {
  text-align: right;
  white-space: nowrap;
}

.loading-box {
  text-align: center;
  padding: 48px;
  color: #999;
}
</style>
