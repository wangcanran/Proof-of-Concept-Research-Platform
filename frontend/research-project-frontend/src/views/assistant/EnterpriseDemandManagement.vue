<template>
  <div class="demand-management">
    <div class="page-header">
      <div class="header-left">
        <el-button class="back-btn" @click="goDashboard">
          <el-icon><ArrowLeft /></el-icon> 返回工作台
        </el-button>
        <h1 class="page-title">产业资源管理</h1>
        <div class="page-description">发布、转载产业资源，推荐给负责的项目并在资源列表中优先展示</div>
      </div>
      <div class="header-right">
        <el-button type="primary" class="ruc-btn-primary" :icon="Plus" @click="goCreate">
          新建产业资源
        </el-button>
      </div>
    </div>

    <div class="filter-toolbar">
      <div class="filter-left">
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

        <el-select
          v-model="filters.status"
          placeholder="状态筛选"
          clearable
          class="filter-select"
          @change="loadList"
        >
          <el-option label="全部" value="" />
          <el-option label="草稿" value="draft" />
          <el-option label="已发布" value="published" />
          <el-option label="已关闭" value="closed" />
          <el-option label="已下架" value="offline" />
        </el-select>

        <el-button type="primary" class="ruc-btn-primary" :icon="Search" @click="loadList">搜索</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>
    </div>

    <div class="list-view">
      <div class="table-container">
        <el-table v-loading="loading" :data="demandList" stripe style="width: 100%">
          <el-table-column prop="title" label="标题" min-width="200">
            <template #default="{ row }">
              <span class="title-text" @click="goView(row.id)">{{ row.title }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="enterprise_name" label="企业/单位" width="140" show-overflow-tooltip />
          <el-table-column prop="industry" label="行业" width="100" show-overflow-tooltip />
          <el-table-column prop="status" label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="push_count" label="已推荐" width="80" align="center" />
          <el-table-column prop="publisher_name" label="发布人" width="100" align="center" />
          <el-table-column prop="published_at" label="发布时间" width="160" align="center">
            <template #default="{ row }">{{ formatDate(row.published_at) }}</template>
          </el-table-column>
          <el-table-column prop="deadline" label="截止日期" width="110" align="center">
            <template #default="{ row }">{{ row.deadline || '-' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="280" align="center" fixed="right">
            <template #default="{ row }">
              <div class="action-btns">
                <el-button link type="info" size="small" @click="goView(row.id)">查看</el-button>
                <el-button link type="primary" size="small" @click="goEdit(row.id)">编辑</el-button>
                <template v-if="row.status === 'draft'">
                  <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
                  <el-button link type="success" size="small" @click="handlePublish(row)">发布</el-button>
                </template>
                <template v-if="row.status === 'published'">
                  <el-button link type="primary" size="small" @click="goPush(row.id)">推荐项目</el-button>
                  <el-button link type="warning" size="small" @click="handleOffline(row)">下架</el-button>
                  <el-button link type="info" size="small" @click="handleClose(row)">关闭</el-button>
                </template>
                <template v-if="row.status === 'offline'">
                  <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
                  <el-button link type="success" size="small" @click="handlePublish(row)">发布</el-button>
                </template>
                <template v-if="row.status === 'closed'">
                  <el-button link type="success" size="small" @click="handlePublish(row)">重新发布</el-button>
                </template>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

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
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, ArrowLeft } from '@element-plus/icons-vue'
import request from '@/utils/request'

const router = useRouter()
const loading = ref(false)
const demandList = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = ref({ keyword: '', status: '' })

function statusLabel(s: string) {
  const m: Record<string, string> = {
    draft: '草稿',
    published: '已发布',
    closed: '已关闭',
    offline: '已下架',
  }
  return m[s] || s
}

function statusType(s: string) {
  const m: Record<string, string> = {
    draft: 'info',
    published: 'success',
    closed: 'warning',
    offline: 'info',
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
    const res = await request.get('/api/enterprise-demands', {
      params: {
        keyword: filters.value.keyword,
        status: filters.value.status,
        page: page.value,
        pageSize: pageSize.value,
      },
    })
    if (res.success && res.data) {
      demandList.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } catch (e) {
    console.error('加载产业资源列表失败', e)
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.value = { keyword: '', status: '' }
  page.value = 1
  loadList()
}

function goCreate() {
  router.push('/assistant/enterprise-demands/create')
}
function goEdit(id: string) {
  router.push(`/assistant/enterprise-demands/${id}/edit`)
}
function goView(id: string) {
  router.push(`/assistant/enterprise-demands/${id}`)
}
function goPush(id: string) {
  router.push(`/assistant/enterprise-demands/${id}`)
}
function goDashboard() {
  router.push('/assistant/dashboard')
}

async function handlePublish(row: any) {
  try {
    await ElMessageBox.confirm(`确定发布「${row.title}」？`, '确认发布', { type: 'info' })
    const res = await request.put(`/api/enterprise-demands/${row.id}/publish`)
    if (res.success) {
      ElMessage.success('发布成功')
      loadList()
    } else {
      ElMessage.error(res.error || '发布失败')
    }
  } catch {
    /* cancel */
  }
}

async function handleOffline(row: any) {
  try {
    await ElMessageBox.confirm(`确定下架「${row.title}」？`, '确认下架', { type: 'warning' })
    const res = await request.put(`/api/enterprise-demands/${row.id}/offline`)
    if (res.success) {
      ElMessage.success('下架成功')
      loadList()
    } else {
      ElMessage.error(res.error || '下架失败')
    }
  } catch {
    /* cancel */
  }
}

async function handleClose(row: any) {
  try {
    await ElMessageBox.confirm(`确定关闭「${row.title}」？关闭后不再接受新推荐。`, '确认关闭', {
      type: 'warning',
    })
    const res = await request.put(`/api/enterprise-demands/${row.id}/close`)
    if (res.success) {
      ElMessage.success('已关闭')
      loadList()
    } else {
      ElMessage.error(res.error || '操作失败')
    }
  } catch {
    /* cancel */
  }
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.title}」？此操作不可恢复。`, '确认删除', { type: 'error' })
    const res = await request.delete(`/api/enterprise-demands/${row.id}`)
    if (res.success) {
      ElMessage.success('删除成功')
      loadList()
    } else {
      ElMessage.error(res.error || '删除失败')
    }
  } catch {
    /* cancel */
  }
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.demand-management {
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
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.header-left {
  flex: 1;
}

.back-btn {
  margin-bottom: 12px;
  padding: 8px 16px;
  color: #b31b1b;
  border-color: #b31b1b;
}
.back-btn:hover {
  color: #fff;
  background: #b31b1b;
  border-color: #b31b1b;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

.page-description {
  margin: 0;
  color: #7f8c8d;
  font-size: 14px;
}

.filter-toolbar {
  background: white;
  padding: 16px 24px;
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.filter-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.search-input {
  width: 280px;
}

.filter-select {
  width: 140px;
}

.table-container {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.title-text {
  color: #b31b1b;
  cursor: pointer;
  font-weight: 500;
}
.title-text:hover {
  text-decoration: underline;
}

.action-btns {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
}

.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
