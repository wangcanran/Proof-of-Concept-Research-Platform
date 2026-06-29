<!-- src/views/assistant/ServiceProviderManagement.vue -->
<template>
  <div class="service-provider-management">
    <div class="page-header">
      <div class="header-left">
        <el-button class="back-btn" @click="goDashboard">
          <el-icon><ArrowLeft /></el-icon> 返回工作台
        </el-button>
        <h1 class="page-title">服务资源库</h1>
        <div class="page-description">管理平台服务机构资源的创建、维护与分类</div>
      </div>
      <div class="header-right">
        <el-button type="primary" class="ruc-btn-primary" @click="goCreate" :icon="Plus">
          新增服务资源
        </el-button>
      </div>
    </div>

    <div class="filter-toolbar">
      <div class="filter-left">
        <el-input
          v-model="filters.keyword"
          placeholder="搜索机构名称、信用代码、联系人等"
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
          v-model="filters.category"
          placeholder="分类筛选"
          clearable
          class="filter-select"
          @change="loadList"
        >
          <el-option label="全部" value="" />
          <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
        </el-select>

        <el-button type="primary" class="ruc-btn-primary" @click="loadList" :icon="Search">搜索</el-button>
        <el-button @click="resetFilters">重置</el-button>
        <el-button v-if="isAdmin" :loading="exporting" :icon="Download" @click="handleExport">导出</el-button>
      </div>
    </div>

    <div class="list-view">
      <div class="table-container">
        <el-table :data="providerList" v-loading="loading" stripe style="width: 100%">
          <el-table-column prop="name" label="机构名称" min-width="180">
            <template #default="{ row }">
              <span class="title-text" @click="goView(row.id)">{{ row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="unified_social_credit_code"
            label="统一社会信用代码"
            min-width="240"
            show-overflow-tooltip
          />
          <el-table-column label="机构分类" min-width="200">
            <template #default="{ row }">
              <div class="category-tags">
                <el-tag
                  v-for="cat in getCategoryTags(row.category)"
                  :key="cat"
                  size="small"
                  type="info"
                  class="category-tag"
                >
                  {{ cat }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="contact_name" label="联系人" width="100" align="center" />
          <el-table-column prop="contact_phone" label="联系电话" width="130" align="center" />
          <el-table-column prop="contact_email" label="联系邮箱" min-width="160" show-overflow-tooltip />
          <el-table-column prop="description" label="机构简介" min-width="180" show-overflow-tooltip />
          <el-table-column prop="updated_at" label="更新时间" width="160" align="center">
            <template #default="{ row }">{{ formatDate(row.updated_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="180" align="center" fixed="right">
            <template #default="{ row }">
              <div class="action-btns">
                <el-button link type="info" size="small" @click="goView(row.id)">
                  <el-icon :size="12"><View /></el-icon> 查看
                </el-button>
                <el-button link type="primary" size="small" @click="goEdit(row.id)">编辑</el-button>
                <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
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
import { Plus, Search, ArrowLeft, View, Download } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { useIsAdmin } from '@/composables/useIsAdmin'
import { adminExportExcel } from '@/utils/exportDownload'
import {
  SERVICE_PROVIDER_CATEGORIES,
  parseCategoryList,
} from '@/constants/serviceProviderCategories'

const router = useRouter()
const { isAdmin } = useIsAdmin()
const exporting = ref(false)
const loading = ref(false)
const providerList = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = ref({ keyword: '', category: '' })
const categories = ref<string[]>([...SERVICE_PROVIDER_CATEGORIES])

function getCategoryTags(category?: string) {
  return parseCategoryList(category)
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
    const res = await request.get('/api/service-providers', {
      params: {
        keyword: filters.value.keyword,
        category: filters.value.category,
        page: page.value,
        pageSize: pageSize.value,
      },
    })
    if (res.success && res.data) {
      providerList.value = res.data.list || []
      total.value = res.data.total || 0
      if (Array.isArray(res.data.categories) && res.data.categories.length) {
        categories.value = res.data.categories
      }
    }
  } catch (e) {
    console.error('加载服务资源列表失败', e)
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.value = { keyword: '', category: '' }
  page.value = 1
  loadList()
}

function goCreate() {
  router.push('/assistant/service-providers/create')
}
function goEdit(id: string) {
  router.push(`/assistant/service-providers/${id}/edit`)
}
function goView(id: string) {
  router.push(`/assistant/service-providers/${id}`)
}
function goDashboard() {
  router.push(isAdmin.value ? '/admin/dashboard' : '/assistant/dashboard')
}

async function handleExport() {
  exporting.value = true
  try {
    await adminExportExcel(
      request,
      '/api/admin/export/service-providers',
      {
        keyword: filters.value.keyword || undefined,
        category: filters.value.category || undefined,
      },
      `服务资源库导出_${new Date().toISOString().slice(0, 10)}.xlsx`,
    )
    ElMessage.success('导出成功')
  } catch (e: any) {
    ElMessage.error(e?.message || '导出失败')
  } finally {
    exporting.value = false
  }
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.name}」？此操作不可恢复。`, '确认删除', { type: 'error' })
    const res = await request.delete(`/api/service-providers/${row.id}`)
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
.service-provider-management {
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

.header-right {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.filter-toolbar {
  background: white;
  padding: 16px 24px;
  border-radius: 12px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.filter-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  flex: 1;
}

.search-input {
  width: 280px;
}

.filter-select {
  width: 160px;
}

.list-view {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
}

.title-text {
  color: #b31b1b;
  cursor: pointer;
  font-weight: 500;
}

.title-text:hover {
  text-decoration: underline;
}

.category-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.action-btns {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px;
}

.pagination-container {
  background: white;
  padding: 20px;
  text-align: right;
  border-top: 1px solid #f0f0f0;
}
</style>
