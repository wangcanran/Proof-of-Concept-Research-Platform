<template>
  <div class="connections-page">
    <IndustryResourceTabs
      role="assistant"
      active-tab="connections"
      connections-label="对接申请管理"
    />

    <div class="page-header">
      <el-button class="back-btn" @click="goDashboard">
        <el-icon><ArrowLeft /></el-icon> 返回工作台
      </el-button>
      <h1>对接申请管理</h1>
      <p class="desc">评估项目方发起的产业资源库对接申请</p>
    </div>

    <div class="filter-bar">
      <el-radio-group v-model="statusFilter" @change="loadList">
        <el-radio-button label="">全部</el-radio-button>
        <el-radio-button label="pending">待处理</el-radio-button>
        <el-radio-button label="handled">已处理</el-radio-button>
      </el-radio-group>
      <el-button @click="loadList">刷新</el-button>
    </div>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="partner_name" label="目标机构" min-width="150" />
      <el-table-column prop="project_title" label="关联项目" min-width="150" show-overflow-tooltip />
      <el-table-column prop="applicant_name" label="申请人" width="100" />
      <el-table-column label="状态" width="120" align="center">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ row.status_label || connectionStatusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="申请时间" width="170">
        <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120" align="center" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status === 'pending'" link type="primary" @click="openReview(row)">处理</el-button>
          <el-button v-else link type="info" @click="openReview(row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="reviewVisible" :title="reviewReadonly ? '对接申请详情' : '处理对接申请'" width="620px">
      <div v-if="current" class="review-body">
        <div class="info-block">
          <div class="row"><span class="label">目标机构</span>{{ current.partner_name }}</div>
          <div class="row"><span class="label">关联项目</span>{{ current.project_title }}</div>
          <div class="row"><span class="label">申请人</span>{{ current.applicant_name }}</div>
          <div class="row block"><span class="label">对接意向说明</span><p>{{ current.intention_note }}</p></div>
        </div>

        <template v-if="!reviewReadonly">
          <el-form label-position="top">
            <el-form-item label="处理结果" required>
              <el-radio-group v-model="reviewForm.action">
                <el-radio value="confirmed">确认对接</el-radio>
                <el-radio value="deferred">暂缓对接</el-radio>
                <el-radio value="rejected">不合适</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item v-if="reviewForm.action === 'confirmed'" label="对方对接意向" required>
              <el-input v-model="reviewForm.partner_intention" type="textarea" :rows="3" placeholder="填写资源方对接意向，便于双方建立联系" />
            </el-form-item>
            <el-form-item
              :label="reviewForm.action === 'confirmed' ? '补充说明（选填）' : '处理说明'"
              :required="reviewForm.action !== 'confirmed'"
            >
              <el-input v-model="reviewForm.handle_note" type="textarea" :rows="3" placeholder="暂缓或不合适时请说明原因" />
            </el-form-item>
          </el-form>
        </template>
        <template v-else>
          <div v-if="current.partner_intention" class="row block">
            <span class="label">对方对接意向</span><p>{{ current.partner_intention }}</p>
          </div>
          <div v-if="current.handle_note" class="row block">
            <span class="label">处理说明</span><p>{{ current.handle_note }}</p>
          </div>
          <div class="row"><span class="label">处理人</span>{{ current.handled_by_name || '—' }}</div>
          <div class="row"><span class="label">处理时间</span>{{ formatDate(current.handled_at) }}</div>
        </template>
      </div>
      <template #footer>
        <el-button @click="reviewVisible = false">{{ reviewReadonly ? '关闭' : '取消' }}</el-button>
        <el-button v-if="!reviewReadonly" type="primary" class="ruc-btn-primary" :loading="submitting" @click="submitReview">
          提交
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import IndustryResourceTabs from '@/components/IndustryResourceTabs.vue'
import { industryPartnerConnectionAPI, type ConnectionRequestRow } from '@/api/industryPartners'
import {
  connectionStatusLabel,
  CONNECTION_REQUEST_STATUS_TYPES,
} from '@/constants/industryPartnerConnections'

const router = useRouter()
const loading = ref(false)
const submitting = ref(false)
const list = ref<ConnectionRequestRow[]>([])
const statusFilter = ref('')
const reviewVisible = ref(false)
const current = ref<ConnectionRequestRow | null>(null)
const reviewForm = ref({
  action: 'confirmed' as 'confirmed' | 'deferred' | 'rejected',
  partner_intention: '',
  handle_note: '',
})

const reviewReadonly = computed(() => current.value?.status !== 'pending')

function statusType(status: string) {
  return (CONNECTION_REQUEST_STATUS_TYPES as Record<string, string>)[status] || 'info'
}

function formatDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('zh-CN')
}

async function loadList() {
  loading.value = true
  try {
    const res = await industryPartnerConnectionAPI.listForManager({
      status: statusFilter.value || undefined,
    })
    if (res.success) list.value = res.data || []
  } finally {
    loading.value = false
  }
}

function openReview(row: ConnectionRequestRow) {
  current.value = row
  reviewForm.value = { action: 'confirmed', partner_intention: '', handle_note: '' }
  reviewVisible.value = true
}

async function submitReview() {
  if (!current.value) return
  if (reviewForm.value.action === 'confirmed' && !reviewForm.value.partner_intention.trim()) {
    ElMessage.warning('请填写对方对接意向')
    return
  }
  if (
    (reviewForm.value.action === 'deferred' || reviewForm.value.action === 'rejected') &&
    !reviewForm.value.handle_note.trim()
  ) {
    ElMessage.warning('请填写处理说明')
    return
  }
  submitting.value = true
  try {
    const res = await industryPartnerConnectionAPI.review(current.value.id, {
      action: reviewForm.value.action,
      partner_intention: reviewForm.value.partner_intention.trim() || undefined,
      handle_note: reviewForm.value.handle_note.trim() || undefined,
    })
    if (res.success) {
      ElMessage.success('处理成功')
      reviewVisible.value = false
      loadList()
    } else {
      ElMessage.error(res.error || '处理失败')
    }
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '处理失败')
  } finally {
    submitting.value = false
  }
}

function goDashboard() {
  router.push('/assistant/dashboard')
}

onMounted(loadList)
</script>

<style scoped>
.connections-page { max-width: 1200px; margin: 0 auto; }
.page-header { background: #fff; padding: 20px 24px; border-radius: 12px; margin-bottom: 16px; }
.page-header h1 { margin: 8px 0 4px; font-size: 24px; }
.desc { margin: 0; color: #909399; font-size: 14px; }
.back-btn { color: #b31b1b; border-color: #b31b1b; }
.filter-bar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; background: #fff; padding: 16px; border-radius: 12px; }
.ruc-btn-primary { background: #b31b1b; border-color: #b31b1b; }
.info-block { margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #ebeef5; }
.row { margin-bottom: 10px; display: flex; gap: 12px; }
.row.block { flex-direction: column; gap: 4px; }
.row .label { color: #909399; min-width: 100px; }
.row p { margin: 0; white-space: pre-wrap; line-height: 1.6; }
</style>
