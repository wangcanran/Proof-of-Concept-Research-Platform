<template>
  <div class="demand-list-page">
    <div class="page-header">
      <div class="header-left">
        <el-button class="back-btn" @click="goDashboard">
          <el-icon><ArrowLeft /></el-icon> 返回工作台
        </el-button>
        <h1 class="page-title">项目合作资源</h1>
        <div class="page-description">浏览平台发布的项目合作资源；项目经理推荐的资源会标注「推荐」并优先展示。</div>
      </div>
    </div>

    <div class="filter-toolbar">
      <el-input
        v-model="filters.keyword"
        placeholder="搜索标题、摘要、企业名称"
        class="search-input"
        clearable
        @clear="loadList"
        @keyup.enter="loadList"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" class="ruc-btn-primary" :icon="Search" @click="loadList">搜索</el-button>
      <el-button @click="resetFilters">重置</el-button>
    </div>

    <div class="list-view">
      <el-table v-loading="loading" :data="demandList" stripe style="width: 100%">
        <el-table-column prop="title" label="标题" min-width="200">
          <template #default="{ row }">
            <div class="title-cell">
              <span class="title-text" @click="goView(row.id)">{{ row.title }}</span>
              <el-tag v-if="row.is_recommended" type="danger" size="small" effect="dark" class="recommend-tag">
                推荐
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="enterprise_name" label="企业/单位" width="140" show-overflow-tooltip />
        <el-table-column prop="industry" label="行业" width="100" show-overflow-tooltip />
        <el-table-column prop="publisher_name" label="发布人" width="100" align="center" />
        <el-table-column prop="published_at" label="发布时间" width="160" align="center">
          <template #default="{ row }">{{ formatDate(row.published_at) }}</template>
        </el-table-column>
        <el-table-column prop="deadline" label="截止日期" width="110" align="center">
          <template #default="{ row }">{{ row.deadline || '-' }}</template>
        </el-table-column>
          <el-table-column label="我的报名" min-width="160">
          <template #default="{ row }">
            <template v-if="row.my_applications?.length">
              <el-tag
                v-for="app in row.my_applications"
                :key="app.push_id"
                :type="appStatusType(app.status, app.is_recommended)"
                size="small"
                class="app-tag"
              >
                {{ app.project_title }} · {{ appStatusLabel(app.status, app.is_recommended) }}
              </el-tag>
            </template>
            <span v-else class="text-muted">未报名</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="goView(row.id)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadList"
          @current-change="loadList"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, ArrowLeft } from '@element-plus/icons-vue'
import request from '@/utils/request'

const router = useRouter()
const loading = ref(false)
const demandList = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = ref({ keyword: '' })

function appStatusLabel(s: string, isRecommended?: boolean) {
  if (isRecommended) return '推荐'
  const m: Record<string, string> = {
    pushed: '推荐',
    applied: '已报名',
    claimed: '已报名',
    declined: '已拒绝',
  }
  return m[s] || s
}

function appStatusType(s: string, isRecommended?: boolean) {
  if (isRecommended) return 'danger'
  const m: Record<string, string> = {
    pushed: 'danger',
    applied: 'success',
    claimed: 'success',
    declined: 'info',
  }
  return m[s] || 'info'
}

function formatDate(d: string) {
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
  loading.value = true
  try {
    const res = await request.get('/api/applicant/enterprise-demands', {
      params: {
        keyword: filters.value.keyword,
        page: page.value,
        pageSize: pageSize.value,
      },
    })
    if (res.success && res.data) {
      demandList.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } catch (e) {
    console.error('加载项目合作资源列表失败', e)
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.value = { keyword: '' }
  page.value = 1
  loadList()
}

function goView(id: string) {
  router.push(`/applicant/enterprise-demands/${id}`)
}

function goDashboard() {
  router.push('/applicant/dashboard')
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.demand-list-page {
  min-height: 0;
  max-width: 1300px;
  margin: 0 auto;
  --el-color-primary: #b31b1b;
}

.ruc-btn-primary {
  background: #b31b1b;
  border-color: #b31b1b;
}
.ruc-btn-primary:hover {
  background: #8a1515;
  border-color: #8a1515;
}

.page-header {
  margin-bottom: 24px;
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.back-btn {
  margin-bottom: 12px;
  padding: 8px 16px;
  color: #b31b1b;
  border-color: #b31b1b;
}

.page-title {
  margin: 0 0 8px;
  font-size: 24px;
  color: #262626;
}

.page-description {
  color: #8c8c8c;
  font-size: 14px;
}

.filter-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.search-input {
  width: 320px;
}

.list-view {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.title-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.recommend-tag {
  flex-shrink: 0;
}

.title-text {
  color: #b31b1b;
  cursor: pointer;
  font-weight: 500;
}
.title-text:hover {
  text-decoration: underline;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.app-tag {
  margin: 2px 4px 2px 0;
}

.text-muted {
  color: #bfbfbf;
  font-size: 13px;
}
</style>
