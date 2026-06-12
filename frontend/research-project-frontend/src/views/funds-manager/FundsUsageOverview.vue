<!-- 经费管理员 - 各项目经费使用汇总与明细 -->
<template>
  <div class="funds-usage-page">
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回工作台</span>
        </button>
        <h1>经费使用汇总</h1>
        <div class="header-subtitle">查看各在研项目的经费使用合计与明细</div>
      </div>
    </div>

    <div class="content-wrapper">
      <div class="summary-bar">
        <div class="summary-item">
          <span class="summary-label">在研项目</span>
          <span class="summary-value">{{ summary.project_count }} 个</span>
        </div>
        <div class="summary-item highlight">
          <span class="summary-label">经费使用合计</span>
          <span class="summary-value">¥ {{ formatAmount(summary.total_spent) }}</span>
        </div>
      </div>

      <div class="filter-tabs">
        <button
          v-for="tab in statusTabs"
          :key="tab.value"
          class="tab-btn"
          :class="{ active: statusFilter === tab.value }"
          @click="switchStatus(tab.value)"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="filter-bar">
        <div class="search-box">
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索项目标题、编号、申请人..."
            @keyup.enter="handleSearch"
          />
          <button class="search-btn" @click="handleSearch">🔍</button>
        </div>
        <button class="refresh-btn" :disabled="loading" @click="loadData">
          🔄 {{ loading ? '刷新中...' : '刷新' }}
        </button>
      </div>

      <div class="section-card">
        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <div v-else-if="projects.length === 0" class="empty-state">
          <div class="empty-icon">📊</div>
          <p>暂无符合条件的在研项目</p>
        </div>

        <div v-else class="project-list">
          <div
            v-for="project in projects"
            :key="project.id"
            :id="`project-block-${project.id}`"
            class="project-block"
          >
            <div
              class="project-row"
              role="button"
              tabindex="0"
              @click="toggleExpand(project.id, $event)"
              @keydown.enter.prevent="toggleExpand(project.id, $event)"
              @keydown.space.prevent="toggleExpand(project.id, $event)"
            >
              <div class="project-main">
                <span class="project-code">{{ project.project_code || '—' }}</span>
                <h3 class="project-title">{{ project.title }}</h3>
              </div>
              <div class="project-stats">
                <span class="stat-value spent">¥ {{ formatAmount(project.spent_amount) }}</span>
                <span class="expand-icon">{{ expandedIds.has(project.id) ? '▼' : '▶' }}</span>
              </div>
            </div>

            <div v-show="expandedIds.has(project.id)" class="project-detail">
              <ProjectFundsUsagePanel :project-id="project.id" compact />
            </div>
          </div>
        </div>

        <div v-if="!loading && total > pageSize" class="pagination">
          <button class="page-btn" :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
          <span class="page-info">第 {{ page }} / {{ totalPages }} 页，共 {{ total }} 个项目</span>
          <button class="page-btn" :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import ProjectFundsUsagePanel from '@/components/ProjectFundsUsagePanel.vue'

const router = useRouter()

const loading = ref(false)
const projects = ref<any[]>([])
const summary = ref({ project_count: 0, total_spent: 0 })
const total = ref(0)
const page = ref(1)
const pageSize = 20
const searchKeyword = ref('')
const statusFilter = ref('all')
const expandedIds = ref(new Set<string>())

const statusTabs = [
  { value: 'all', label: '全部' },
  { value: 'approved', label: '已立项' },
  { value: 'incubating', label: '孵化中' },
]

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const formatAmount = (v: number | string | null | undefined) => {
  const n = Number(v) || 0
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const goBack = () => router.push('/funds-manager/dashboard')

const toggleExpand = async (id: string, event?: Event) => {
  event?.preventDefault()
  const wasExpanded = expandedIds.value.has(id)
  const blockEl = document.getElementById(`project-block-${id}`)
  const scrollY = window.scrollY
  const blockTop = blockEl?.getBoundingClientRect().top ?? 0

  const next = new Set(expandedIds.value)
  if (wasExpanded) next.delete(id)
  else next.add(id)
  expandedIds.value = next

  if (wasExpanded) {
    await nextTick()
    if (blockEl) {
      const delta = blockEl.getBoundingClientRect().top - blockTop
      window.scrollTo(0, scrollY + delta)
    }
  }
}

const switchStatus = (value: string) => {
  statusFilter.value = value
  page.value = 1
  expandedIds.value = new Set()
  loadData()
}

const handleSearch = () => {
  page.value = 1
  expandedIds.value = new Set()
  loadData()
}

const changePage = (p: number) => {
  page.value = p
  expandedIds.value = new Set()
  loadData()
}

const loadData = async () => {
  loading.value = true
  try {
    const params: Record<string, string | number> = {
      page: page.value,
      pageSize,
    }
    if (searchKeyword.value.trim()) params.search = searchKeyword.value.trim()
    if (statusFilter.value !== 'all') params.status = statusFilter.value

    const res = (await request.get('/api/funds-manager/projects/funds-usage', { params })) as any
    if (res.success) {
      projects.value = res.data?.projects || []
      total.value = res.data?.total || 0
      summary.value = res.data?.summary || { project_count: 0, total_spent: 0 }
    } else {
      ElMessage.error(res.error || '加载失败')
    }
  } catch (e: any) {
    ElMessage.error(e.response?.data?.error || '加载经费使用汇总失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.funds-usage-page {
  min-height: 100vh;
  background: #f5f6f8;
}

.page-header {
  background: linear-gradient(135deg, #b31b1b 0%, #8b0000 100%);
  color: white;
  padding: 24px 32px;
}

.header-left {
  max-width: 1200px;
  margin: 0 auto;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  margin-bottom: 12px;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.page-header h1 {
  margin: 0 0 6px;
  font-size: 24px;
}

.header-subtitle {
  font-size: 14px;
  opacity: 0.9;
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 32px 48px;
}

.summary-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.summary-item {
  flex: 1;
  min-width: 180px;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.summary-item.highlight {
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

.summary-item.highlight .summary-value {
  color: #b31b1b;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tab-btn {
  padding: 8px 16px;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
}

.tab-btn.active {
  background: #b31b1b;
  border-color: #b31b1b;
  color: white;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}

.search-box {
  flex: 1;
  display: flex;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  overflow: hidden;
  background: white;
}

.search-box input {
  flex: 1;
  border: none;
  padding: 10px 14px;
  font-size: 14px;
  outline: none;
}

.search-btn,
.refresh-btn {
  padding: 10px 16px;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.search-btn {
  border: none;
  border-left: 1px solid #d9d9d9;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.section-card {
  background: white;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  padding: 16px;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 48px 20px;
  color: #999;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #f0f0f0;
  border-top-color: #b31b1b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

.project-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-anchor: none;
}

.project-block {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
  overflow-anchor: none;
}

.project-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.project-row:hover {
  background: #fafafa;
}

.project-main {
  flex: 1;
  min-width: 0;
}

.project-code {
  font-size: 12px;
  color: #b31b1b;
  background: rgba(179, 27, 27, 0.06);
  padding: 2px 8px;
  border-radius: 4px;
}

.project-title {
  margin: 8px 0 6px;
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.project-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.stat-value.spent {
  font-size: 16px;
  font-weight: 600;
  color: #b31b1b;
}

.expand-icon {
  color: #999;
  font-size: 12px;
  margin-left: 8px;
}

.project-detail {
  border-top: 1px solid #f0f0f0;
  padding: 16px;
  background: #fafafa;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.page-btn {
  padding: 8px 16px;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 6px;
  cursor: pointer;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 13px;
  color: #666;
}

@media (max-width: 768px) {
  .content-wrapper {
    padding: 16px;
  }

  .project-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .project-stats {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
