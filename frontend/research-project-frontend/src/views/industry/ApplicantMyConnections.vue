<template>
  <div class="connections-page">
    <IndustryResourceTabs role="applicant" active-tab="connections" />

    <div class="page-header">
      <el-button class="back-btn" @click="goDashboard">
        <el-icon><ArrowLeft /></el-icon> 返回工作台
      </el-button>
      <h1>我的对接申请</h1>
      <p class="desc">查看产业资源库对接申请的处理进度</p>
    </div>

    <div class="filter-bar">
      <el-select v-model="statusFilter" placeholder="全部状态" clearable @change="loadList">
        <el-option label="待处理" value="pending" />
        <el-option label="已确认对接" value="confirmed" />
        <el-option label="暂缓对接" value="deferred" />
        <el-option label="不合适" value="rejected" />
      </el-select>
      <el-button @click="loadList">刷新</el-button>
    </div>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="partner_name" label="目标机构" min-width="160" />
      <el-table-column prop="project_title" label="关联项目" min-width="160" show-overflow-tooltip />
      <el-table-column label="状态" width="120" align="center">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ row.status_label || connectionStatusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="申请时间" width="170">
        <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100" align="center" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="detailVisible" title="对接申请详情" width="560px">
      <div v-if="current" class="detail-body">
        <div class="detail-row"><span class="label">目标机构</span><span>{{ current.partner_name }}</span></div>
        <div class="detail-row"><span class="label">关联项目</span><span>{{ current.project_title }}</span></div>
        <div class="detail-row"><span class="label">状态</span>
          <el-tag :type="statusType(current.status)" size="small">{{ current.status_label }}</el-tag>
        </div>
        <div class="detail-row block"><span class="label">对接意向说明</span><p>{{ current.intention_note }}</p></div>
        <div v-if="current.partner_intention" class="detail-row block">
          <span class="label">对方对接意向</span><p>{{ current.partner_intention }}</p>
        </div>
        <div v-if="current.handle_note" class="detail-row block">
          <span class="label">处理说明</span><p>{{ current.handle_note }}</p>
        </div>
        <div v-if="current.handled_by_name" class="detail-row">
          <span class="label">处理人</span><span>{{ current.handled_by_name }}</span>
        </div>
        <div v-if="current.handled_at" class="detail-row">
          <span class="label">处理时间</span><span>{{ formatDate(current.handled_at) }}</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import IndustryResourceTabs from '@/components/IndustryResourceTabs.vue'
import { industryPartnerConnectionAPI, type ConnectionRequestRow } from '@/api/industryPartners'
import {
  connectionStatusLabel,
  CONNECTION_REQUEST_STATUS_TYPES,
} from '@/constants/industryPartnerConnections'

const router = useRouter()
const loading = ref(false)
const list = ref<ConnectionRequestRow[]>([])
const statusFilter = ref('')
const detailVisible = ref(false)
const current = ref<ConnectionRequestRow | null>(null)

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
    const res = await industryPartnerConnectionAPI.listMine({
      status: statusFilter.value || undefined,
    })
    if (res.success) list.value = res.data || []
  } finally {
    loading.value = false
  }
}

function openDetail(row: ConnectionRequestRow) {
  current.value = row
  detailVisible.value = true
}

function goDashboard() {
  router.push('/applicant/dashboard')
}

onMounted(loadList)
</script>

<style scoped>
.connections-page { max-width: 1100px; margin: 0 auto; }
.page-header { background: #fff; padding: 20px 24px; border-radius: 12px; margin-bottom: 16px; }
.page-header h1 { margin: 8px 0 4px; font-size: 24px; }
.desc { margin: 0; color: #909399; font-size: 14px; }
.back-btn { color: #b31b1b; border-color: #b31b1b; }
.filter-bar { display: flex; gap: 12px; margin-bottom: 16px; background: #fff; padding: 16px; border-radius: 12px; }
.detail-row { display: flex; gap: 12px; margin-bottom: 12px; align-items: flex-start; }
.detail-row.block { flex-direction: column; gap: 4px; }
.detail-row .label { color: #909399; min-width: 100px; flex-shrink: 0; }
.detail-row p { margin: 0; line-height: 1.6; white-space: pre-wrap; }
</style>
