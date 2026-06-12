<template>
  <div class="enterprise-demands-panel">
    <div v-if="loading" class="panel-loading">
      <el-skeleton :rows="4" animated />
    </div>
    <div v-else-if="items.length === 0" class="empty-state">
      <p>暂无项目经理推送的企业需求</p>
      <p class="empty-hint">项目经理将合适的企业需求推送给本项目后，可在此查看并选择是否承接。</p>
    </div>
    <div v-else class="demand-list">
      <div v-for="item in items" :key="item.id" class="demand-card">
        <div class="demand-card-head">
          <div class="demand-title">{{ item.demand_title }}</div>
          <el-tag :type="pushStatusType(item.status)" size="small">{{ pushStatusLabel(item.status) }}</el-tag>
        </div>
        <div class="demand-meta">
          <span v-if="item.enterprise_name">企业：{{ item.enterprise_name }}</span>
          <span v-if="item.industry">行业：{{ item.industry }}</span>
          <span v-if="item.pushed_by_name">推送人：{{ item.pushed_by_name }}</span>
          <span>推送时间：{{ formatDate(item.created_at) }}</span>
          <span v-if="item.deadline">截止：{{ item.deadline }}</span>
        </div>
        <p v-if="item.demand_summary" class="demand-summary">{{ item.demand_summary }}</p>
        <p v-if="item.remark" class="demand-remark">推送说明：{{ item.remark }}</p>
        <div class="demand-actions">
          <el-button size="small" @click="openDetail(item)">查看详情</el-button>
          <template v-if="item.status === 'pushed'">
            <el-button type="primary" size="small" :loading="actingId === item.id" @click="handleClaim(item)">
              确认承接
            </el-button>
            <el-button size="small" :loading="actingId === item.id" @click="handleDecline(item)">
              不承接
            </el-button>
          </template>
        </div>
      </div>
    </div>

    <el-dialog v-model="detailVisible" :title="detailItem?.demand_title || '需求详情'" width="760px" destroy-on-close>
      <div v-if="detailItem" class="detail-dialog-body">
        <div class="detail-dialog-meta">
          <span v-if="detailItem.enterprise_name">企业：{{ detailItem.enterprise_name }}</span>
          <span v-if="detailItem.industry">行业：{{ detailItem.industry }}</span>
          <span v-if="detailItem.deadline">截止：{{ detailItem.deadline }}</span>
        </div>
        <div v-if="detailItem.demand_summary" class="detail-summary-box">{{ detailItem.demand_summary }}</div>
        <div
          class="detail-content news-rich-html w-e-text-container"
          v-html="detailItem.demand_content"
        />
        <div
          v-if="detailItem.contact_name || detailItem.contact_phone || detailItem.contact_email"
          class="detail-contact"
        >
          <h4>联系信息</h4>
          <p v-if="detailItem.contact_name">联系人：{{ detailItem.contact_name }}</p>
          <p v-if="detailItem.contact_phone">电话：{{ detailItem.contact_phone }}</p>
          <p v-if="detailItem.contact_email">邮箱：{{ detailItem.contact_email }}</p>
        </div>
      </div>
      <template v-if="detailItem?.status === 'pushed'" #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button @click="handleDecline(detailItem)">不承接</el-button>
        <el-button type="primary" :loading="actingId === detailItem.id" @click="handleClaim(detailItem)">
          确认承接
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import '@wangeditor/editor/dist/css/style.css'

const props = defineProps<{ projectId: string }>()

type PushItem = {
  id: string
  status: string
  demand_title?: string
  demand_summary?: string
  demand_content?: string
  enterprise_name?: string
  industry?: string
  deadline?: string
  remark?: string
  pushed_by_name?: string
  created_at?: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
}

const loading = ref(false)
const items = ref<PushItem[]>([])
const actingId = ref('')
const detailVisible = ref(false)
const detailItem = ref<PushItem | null>(null)

function pushStatusLabel(s: string) {
  const m: Record<string, string> = {
    pushed: '待承接',
    claimed: '已承接',
    declined: '已拒绝',
    withdrawn: '已撤回',
  }
  return m[s] || s
}

function pushStatusType(s: string) {
  const m: Record<string, string> = {
    pushed: 'warning',
    claimed: 'success',
    declined: 'info',
    withdrawn: 'info',
  }
  return m[s] || 'info'
}

function formatDate(d?: string) {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function loadList() {
  if (!props.projectId) return
  loading.value = true
  try {
    const res = await request.get(`/api/applicant/projects/${props.projectId}/enterprise-demands`)
    if (res.success) {
      items.value = res.data || []
    }
  } catch (e) {
    console.error('加载企业需求失败', e)
  } finally {
    loading.value = false
  }
}

function openDetail(item: PushItem) {
  detailItem.value = item
  detailVisible.value = true
}

async function handleClaim(item: PushItem) {
  try {
    await ElMessageBox.confirm(`确定承接「${item.demand_title}」？`, '确认承接', { type: 'info' })
    actingId.value = item.id
    const res = await request.put(
      `/api/applicant/projects/${props.projectId}/enterprise-demands/${item.id}/claim`,
    )
    if (res.success) {
      ElMessage.success('已确认承接')
      detailVisible.value = false
      await loadList()
    } else {
      ElMessage.error(res.error || '操作失败')
    }
  } catch {
    /* cancel */
  } finally {
    actingId.value = ''
  }
}

async function handleDecline(item: PushItem) {
  try {
    await ElMessageBox.confirm(`确定不承接「${item.demand_title}」？`, '确认', { type: 'warning' })
    actingId.value = item.id
    const res = await request.put(
      `/api/applicant/projects/${props.projectId}/enterprise-demands/${item.id}/decline`,
    )
    if (res.success) {
      ElMessage.success('已标记为不承接')
      detailVisible.value = false
      await loadList()
    } else {
      ElMessage.error(res.error || '操作失败')
    }
  } catch {
    /* cancel */
  } finally {
    actingId.value = ''
  }
}

watch(
  () => props.projectId,
  () => loadList(),
  { immediate: true },
)
</script>

<style scoped>
.enterprise-demands-panel {
  min-height: 120px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #8c8c8c;
}
.empty-hint {
  font-size: 13px;
  margin-top: 8px;
}

.demand-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.demand-card {
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 16px 18px;
  background: #fafafa;
}

.demand-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}

.demand-title {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.demand-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  color: #8c8c8c;
  margin-bottom: 8px;
}

.demand-summary {
  margin: 0 0 8px;
  color: #595959;
  line-height: 1.6;
}

.demand-remark {
  margin: 0 0 12px;
  font-size: 13px;
  color: #b31b1b;
}

.demand-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.detail-dialog-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: #8c8c8c;
  font-size: 13px;
  margin-bottom: 12px;
}

.detail-summary-box {
  background: #f9f9f9;
  border-left: 4px solid #b31b1b;
  padding: 10px 14px;
  margin-bottom: 16px;
  line-height: 1.6;
}

.detail-content {
  line-height: 1.8;
  color: #333;
  max-height: 50vh;
  overflow-y: auto;
}

.detail-contact {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}
.detail-contact h4 {
  margin: 0 0 8px;
}
.detail-contact p {
  margin: 4px 0;
  color: #555;
}
</style>
