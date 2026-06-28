<!-- 科研成果审核（卡片列表，仿服务申请审批） -->
<template>
  <div class="review-list-page">
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-btn" @click="goDashboard">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回工作台</span>
        </button>
        <h1>科研成果审核</h1>
        <div class="header-subtitle">审核本人负责项目下申请人提交的科研成果</div>
      </div>
    </div>

    <div class="content-wrapper">
      <div class="toolbar">
        <div class="search-box">
          <input v-model="searchQuery" type="text" class="search-input" placeholder="搜索成果标题、项目名称" @keyup.enter="loadList" />
          <button type="button" class="search-btn" @click="loadList">搜索</button>
          <button type="button" class="reset-btn" @click="resetSearch">重置</button>
        </div>
        <div class="filter-tabs">
          <button v-for="tab in statusTabs" :key="tab.value" class="tab-btn" :class="{ active: currentTab === tab.value }" @click="switchTab(tab.value)">
            {{ tab.label }}
            <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
          </button>
        </div>
      </div>

      <div class="section-card">
        <div v-if="loading" class="loading-state"><div class="loading-spinner"></div><p>加载中...</p></div>
        <div v-else-if="filteredList.length === 0" class="empty-state"><div class="empty-icon">📭</div><p>暂无科研成果记录</p></div>
        <div v-else class="requests-grid">
          <div v-for="item in filteredList" :key="item.id" class="request-card">
            <div class="card-header" @click="goDetail(item.id)">
              <span class="card-project-title">{{ item.title }}</span>
              <span class="card-status" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span>
            </div>
            <div class="card-body" @click="goDetail(item.id)">
              <div class="card-info"><span class="info-label">成果类型</span><span class="info-value">{{ typeLabel(item.type) }}</span></div>
              <div class="card-info"><span class="info-label">所属项目</span><span class="info-value">{{ item.project_info?.title || item.project_title || '-' }}</span></div>
              <div class="card-info"><span class="info-label">项目编号</span><span class="info-value">{{ item.project_info?.project_code || item.project_code || '-' }}</span></div>
              <div class="card-info"><span class="info-label">登记时间</span><span class="info-value">{{ formatDateTime(item.created_at) }}</span></div>
            </div>
            <div class="card-footer">
              <button class="btn-view-detail" @click.stop="goDetail(item.id)">查看详情</button>
              <button v-if="item.status === 'submitted'" class="btn-approve text-long" @click.stop="goReview(item.id)">审核科研成果</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import request from '@/utils/request'

const router = useRouter()
const loading = ref(false)
const allList = ref<any[]>([])
const searchQuery = ref('')
const appliedSearch = ref('')
const currentTab = ref('all')

const statusTabs = computed(() => [
  { value: 'all', label: '全部', count: allList.value.length },
  { value: 'submitted', label: '待审核', count: allList.value.filter((i) => i.status === 'submitted').length },
  { value: 'verified', label: '已核实', count: allList.value.filter((i) => i.status === 'verified').length },
  { value: 'rejected', label: '已驳回', count: allList.value.filter((i) => i.status === 'rejected').length },
])

const filteredList = computed(() => {
  let list = allList.value
  if (currentTab.value !== 'all') list = list.filter((i) => i.status === currentTab.value)
  return list
})

function typeLabel(t: string) {
  const m: Record<string, string> = { paper: '论文', patent: '专利', software: '软著', report: '报告', prototype: '样机', standard: '标准', other: '其他', award: '奖项' }
  return m[t] || t
}
function statusLabel(s: string) {
  const m: Record<string, string> = { submitted: '待审核', verified: '已核实', rejected: '已驳回', draft: '草稿' }
  return m[s] || s
}
function statusClass(s: string) {
  const m: Record<string, string> = { submitted: 'pending', verified: 'approved', rejected: 'rejected' }
  return m[s] || ''
}
function formatDateTime(d?: string) {
  return d ? new Date(d).toLocaleString('zh-CN') : '-'
}

async function loadList() {
  appliedSearch.value = searchQuery.value.trim()
  loading.value = true
  try {
    const res = await request.get('/api/assistant/achievements/list', {
      params: { page: 1, pageSize: 200, search: appliedSearch.value || undefined, status: '' },
    })
    if (res.success && res.data) {
      allList.value = res.data.list || res.data || []
    } else {
      allList.value = []
    }
  } catch {
    allList.value = []
  } finally {
    loading.value = false
  }
}

function switchTab(tab: string) {
  currentTab.value = tab
}
function resetSearch() {
  searchQuery.value = ''
  appliedSearch.value = ''
  loadList()
}
function goDashboard() {
  router.push('/assistant/dashboard')
}
function goDetail(id: string) {
  router.push(`/achievements/${id}/detail`)
}
function goReview(id: string) {
  router.push(`/assistant/achievements/${id}/review`)
}

onMounted(loadList)
</script>

<style scoped>
.review-list-page { min-height: 100vh; background: #f5f7fa; }
.page-header { background: white; padding: 20px 24px; border-bottom: 1px solid #e8e8e8; }
.header-left { max-width: 1200px; margin: 0 auto; }
.back-btn { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 12px; padding: 8px 16px; background: #f5f5f5; border: 1px solid #e8e8e8; border-radius: 6px; color: #666; cursor: pointer; font-size: 14px; }
.page-header h1 { margin: 0; font-size: 24px; color: #2c3e50; font-weight: 600; }
.header-subtitle { margin-top: 6px; color: #999; font-size: 14px; }
.content-wrapper { padding: 24px; max-width: 1200px; margin: 0 auto; }
.toolbar { display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.search-box { display: flex; gap: 8px; flex-wrap: wrap; }
.search-input { padding: 8px 12px; border: 1px solid #e8e8e8; border-radius: 6px; width: 240px; font-size: 14px; }
.search-btn, .reset-btn { padding: 8px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; border: none; }
.search-btn { background: #b31b1b; color: white; }
.reset-btn { background: #f5f5f5; color: #666; border: 1px solid #e8e8e8; }
.filter-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.tab-btn { padding: 8px 16px; border: 1px solid #e8e8e8; border-radius: 8px; background: white; color: #666; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
.tab-btn.active { background: #b31b1b; border-color: #b31b1b; color: white; }
.tab-count { background: rgba(255,255,255,0.25); padding: 0 6px; border-radius: 10px; font-size: 12px; }
.tab-btn:not(.active) .tab-count { background: #f0f0f0; color: #666; }
.section-card { background: white; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); overflow: hidden; }
.loading-state, .empty-state { padding: 60px; text-align: center; color: #999; }
.loading-spinner { width: 32px; height: 32px; border: 3px solid #f0f0f0; border-top-color: #b31b1b; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.requests-grid { padding: 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.request-card { border: 1px solid #f0f0f0; border-radius: 8px; overflow: hidden; }
.card-header { padding: 16px; background: #fafafa; display: flex; justify-content: space-between; gap: 12px; cursor: pointer; }
.card-project-title { font-size: 15px; font-weight: 500; color: #333; flex: 1; }
.card-status { font-size: 12px; padding: 2px 8px; border-radius: 10px; white-space: nowrap; }
.card-status.pending { background: #fff7e6; color: #fa8c16; }
.card-status.approved { background: #f6ffed; color: #52c41a; }
.card-status.rejected { background: #fff1f0; color: #ff4d4f; }
.card-body { padding: 16px; cursor: pointer; }
.card-info { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
.card-info .info-label { color: #999; }
.card-footer { padding: 16px; display: flex; gap: 12px; }
</style>

<style>
@import '@/styles/review-list-shared.css';
</style>
