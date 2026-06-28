<template>
  <div class="section-card list-section">
    <div class="section-header">
      <h3 class="section-title">
        <span class="section-icon">📜</span>
        转化成果登记记录
      </h3>
      <div class="header-right">
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="搜索项目名称、承接方/公司名称"
            @keyup.enter="handleSearch"
          />
          <button type="button" class="search-btn" @click="handleSearch">搜索</button>
        </div>
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
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else-if="filteredList.length === 0" class="empty-state">
      <div class="empty-icon">📭</div>
      <p>暂无转化成果登记记录</p>
    </div>

    <div v-else class="requests-grid">
      <div v-for="item in filteredList" :key="item.id" class="request-card">
        <div class="card-header" @click="handleViewDetail(item)">
          <span class="card-project-title">{{ getCardTitle(item) }}</span>
          <span class="card-status" :class="getStatusClass(item.status as string)">
            {{ getStatusLabel(item.status as string) }}
          </span>
        </div>
        <div class="card-body" @click="handleViewDetail(item)">
          <div class="card-info">
            <span class="info-label">转化方式</span>
            <span class="info-value">{{ getMethodLabel(item.transform_method as string) }}</span>
          </div>
          <div class="card-info">
            <span class="info-label">所属项目</span>
            <span class="info-value">{{ (item.project as { title?: string })?.title || '-' }}</span>
          </div>
          <div class="card-info">
            <span class="info-label">项目编号</span>
            <span class="info-value">{{ (item.project as { project_code?: string })?.project_code || '-' }}</span>
          </div>
          <div class="card-info">
            <span class="info-label">{{ getCompanyLabel(item.transform_method as string) }}</span>
            <span class="info-value">{{ getCompanyName(item) }}</span>
          </div>
          <div class="card-info">
            <span class="info-label">登记时间</span>
            <span class="info-value">{{ formatDateTime(item.created_at as string) }}</span>
          </div>
        </div>
        <div class="card-footer">
          <button class="btn-view-detail" @click.stop="handleViewDetail(item)">查看详情</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { transformationAchievementAPI, TRANSFORM_METHODS } from '@/api/transformationAchievements'

const router = useRouter()

const searchQuery = ref('')
const loading = ref(false)
const currentTab = ref('all')
const allRecords = ref<Record<string, unknown>[]>([])

const statusTabs = computed(() => [
  { value: 'all', label: '全部', count: allRecords.value.length },
  {
    value: 'submitted',
    label: '待审核',
    count: allRecords.value.filter((r) => r.status === 'submitted').length,
  },
  {
    value: 'verified',
    label: '已核实',
    count: allRecords.value.filter((r) => r.status === 'verified').length,
  },
  {
    value: 'rejected',
    label: '已驳回',
    count: allRecords.value.filter((r) => r.status === 'rejected').length,
  },
])

const filteredList = computed(() => {
  let list = allRecords.value
  if (currentTab.value !== 'all') {
    list = list.filter((r) => r.status === currentTab.value)
  }
  return list
})

const getMethodLabel = (method: string) => {
  return TRANSFORM_METHODS.find((m) => m.value === method)?.label || method
}

const getCardTitle = (item: Record<string, unknown>) => {
  const projectTitle = (item.project as { title?: string })?.title || '-'
  const companyName = getCompanyName(item)
  return `${projectTitle} - ${companyName}`
}

const getCompanyLabel = (method: string) =>
  method === 'startup_company' ? '公司名称' : '承接方公司名称'

const getCompanyName = (item: Record<string, unknown>) => {
  if (item.transform_method === 'startup_company') {
    return (item.company_name as string) || '-'
  }
  return (item.recipient_company as string) || '-'
}

const formatDateTime = (dateString?: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    draft: '草稿',
    submitted: '待审核',
    verified: '已核实',
    rejected: '已驳回',
  }
  return map[status] || status
}

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    draft: 'draft',
    submitted: 'pending',
    verified: 'approved',
    rejected: 'rejected',
  }
  return map[status] || ''
}

const fetchList = async () => {
  loading.value = true
  try {
    const response = await transformationAchievementAPI.list({
      search: searchQuery.value.trim() || undefined,
    })
    if (response.success) {
      allRecords.value = (response.data || []).filter((r: { status?: string }) => r.status !== 'draft')
    } else {
      allRecords.value = []
    }
  } catch {
    allRecords.value = []
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  fetchList()
}

const switchTab = (tab: string) => {
  currentTab.value = tab
}

const handleViewDetail = (row: { id: string }) => {
  router.push(`/transformation-achievements/${row.id}/detail`)
}

defineExpose({ refresh: fetchList })

onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.section-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
  overflow: hidden;
}

.section-header {
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.section-title {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.header-right {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}

.search-box {
  display: flex;
  gap: 8px;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  font-size: 13px;
  width: 180px;
}

.search-input:focus {
  outline: none;
  border-color: #b31b1b;
}

.search-btn {
  padding: 8px 16px;
  background: #b31b1b;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.search-btn:hover {
  background: #8b1515;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 6px 16px;
  border: 1px solid #e8e8e8;
  border-radius: 16px;
  background: white;
  color: #666;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-btn.active {
  background: #b31b1b;
  border-color: #b31b1b;
  color: white;
}

.tab-count {
  background: rgba(255, 255, 255, 0.3);
  padding: 0 6px;
  border-radius: 10px;
  font-size: 12px;
}

.tab-btn:not(.active) .tab-count {
  background: #f0f0f0;
  color: #666;
}

.loading-state {
  padding: 60px 20px;
  text-align: center;
  color: #999;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f0f0f0;
  border-top-color: #b31b1b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.requests-grid {
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.request-card {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s;
  cursor: pointer;
}

.request-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.card-header {
  padding: 16px;
  background: #fafafa;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.card-project-title {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  line-height: 1.4;
  flex: 1;
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

.card-status.approved {
  background: #f6ffed;
  color: #52c41a;
}

.card-status.rejected {
  background: #fff1f0;
  color: #ff4d4f;
}

.card-body {
  padding: 16px;
}

.card-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.card-info:last-child {
  margin-bottom: 0;
}

.card-info .info-label {
  font-size: 13px;
  color: #999;
}

.card-info .info-value {
  font-size: 13px;
  color: #333;
  text-align: right;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-footer {
  padding: 16px;
  display: flex;
  gap: 12px;
}

.btn-view-detail {
  flex: 1;
  padding: 10px 24px;
  background: #f0f9f0;
  border: none;
  border-radius: 6px;
  color: #2e8b57;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-view-detail:hover {
  background: #e0f0e0;
}
</style>
