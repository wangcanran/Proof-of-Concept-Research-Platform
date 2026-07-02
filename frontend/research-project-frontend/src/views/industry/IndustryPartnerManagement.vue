<template>
  <div class="partner-management">
    <IndustryResourceTabs role="assistant" active-tab="partners" connections-label="对接申请管理" />

    <div class="page-header">
      <div class="header-left">
        <el-button class="back-btn" @click="goDashboard">
          <el-icon><ArrowLeft /></el-icon> 返回工作台
        </el-button>
        <h1 class="page-title">产业资源库</h1>
        <div class="page-description">管理产业化合作伙伴档案，供转化成果、服务分配与产业需求关联引用</div>
      </div>
      <div class="header-right">
        <el-button type="primary" class="ruc-btn-primary" @click="goCreate" :icon="Plus">
          新增机构
        </el-button>
      </div>
    </div>

    <div class="filter-toolbar">
      <el-input
        v-model="filters.keyword"
        placeholder="搜索机构名称、产品/服务、联系人等"
        class="search-input"
        clearable
        @clear="loadList"
        @keyup.enter="loadList"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-select
        v-model="filters.org_category"
        placeholder="机构分类"
        clearable
        class="filter-select"
        @change="loadList"
      >
        <el-option label="全部" value="" />
        <el-option v-for="c in orgCategories" :key="c.value" :label="c.label" :value="c.value" />
      </el-select>
      <el-select
        v-model="filters.domain_id"
        placeholder="所属领域"
        clearable
        filterable
        class="filter-select"
        @change="loadList"
      >
        <el-option v-for="d in researchDomains" :key="d.id" :label="d.name" :value="d.id" />
      </el-select>
      <el-button type="primary" class="ruc-btn-primary" @click="loadList" :icon="Search">搜索</el-button>
      <el-button @click="resetFilters">重置</el-button>
      <el-button v-if="isAdmin" :loading="exporting" :icon="Download" @click="handleExport">导出</el-button>
    </div>

    <div class="list-view">
      <el-table :data="partnerList" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="name" label="机构名称" min-width="180">
          <template #default="{ row }">
            <span class="title-text" @click="goView(row.id)">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="机构分类" width="110" align="center">
          <template #default="{ row }">{{ row.org_category_label || orgCategoryLabel(row.org_category) }}</template>
        </el-table-column>
        <el-table-column label="所属领域" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ (row.domain_names || []).join('、') || '—' }}</template>
        </el-table-column>
        <el-table-column prop="main_products_services" label="主要产品/服务" min-width="160" show-overflow-tooltip />
        <el-table-column prop="contact_name" label="联系人" width="100" align="center" />
        <el-table-column prop="contact_phone" label="联系电话" width="130" align="center" />
        <el-table-column prop="updated_at" label="更新时间" width="160" align="center">
          <template #default="{ row }">{{ formatDate(row.updated_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="info" size="small" @click="goView(row.id)">查看</el-button>
            <el-button link type="primary" size="small" @click="goEdit(row.id)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, ArrowLeft, Download } from '@element-plus/icons-vue'
import IndustryResourceTabs from '@/components/IndustryResourceTabs.vue'
import { industryPartnerAPI, type IndustryPartnerRow } from '@/api/industryPartners'
import { getResearchDomains } from '@/api/auth'
import { orgCategoryLabel, INDUSTRY_PARTNER_ORG_CATEGORIES } from '@/constants/industryPartnerCategories'
import { useIsAdmin } from '@/composables/useIsAdmin'
import { adminExportExcel } from '@/utils/exportDownload'
import request from '@/utils/request'

const router = useRouter()
const { isAdmin } = useIsAdmin()
const loading = ref(false)
const exporting = ref(false)
const partnerList = ref<IndustryPartnerRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const orgCategories = INDUSTRY_PARTNER_ORG_CATEGORIES
const researchDomains = ref<{ id: string; name: string }[]>([])
const filters = ref({ keyword: '', org_category: '', domain_id: '' })

function formatDate(d?: string) {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

async function loadDomains() {
  try {
    const res = (await getResearchDomains()) as { success?: boolean; data?: { id: string; name: string }[] }
    researchDomains.value = res.success ? (res.data || []) : []
  } catch {
    researchDomains.value = []
  }
}

async function loadList() {
  loading.value = true
  try {
    const res = await industryPartnerAPI.list({
      keyword: filters.value.keyword || undefined,
      org_category: filters.value.org_category || undefined,
      domain_id: filters.value.domain_id || undefined,
      page: page.value,
      pageSize: pageSize.value,
    })
    if (res.success && res.data) {
      partnerList.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.value = { keyword: '', org_category: '', domain_id: '' }
  page.value = 1
  loadList()
}

function goCreate() {
  router.push('/assistant/industry-resources/partners/create')
}
function goEdit(id: string) {
  router.push(`/assistant/industry-resources/partners/${id}/edit`)
}
function goView(id: string) {
  router.push(`/assistant/industry-resources/partners/${id}`)
}
function goDashboard() {
  router.push(isAdmin.value ? '/admin/dashboard' : '/assistant/dashboard')
}

async function handleExport() {
  exporting.value = true
  try {
    await adminExportExcel(
      request,
      '/api/admin/export/industry-partners',
      {
        keyword: filters.value.keyword || undefined,
        org_category: filters.value.org_category || undefined,
      },
      `产业资源库导出_${new Date().toISOString().slice(0, 10)}.xlsx`,
    )
    ElMessage.success('导出成功')
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '导出失败')
  } finally {
    exporting.value = false
  }
}

async function handleDelete(row: IndustryPartnerRow) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.name}」？`, '确认删除', { type: 'error' })
    const res = await industryPartnerAPI.remove(row.id)
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

onMounted(async () => {
  await loadDomains()
  loadList()
})
</script>

<style scoped>
.partner-management {
  max-width: 1300px;
  margin: 0 auto;
  --el-color-primary: #b31b1b;
}
.ruc-btn-primary { background: #b31b1b; border-color: #b31b1b; }
.page-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 24px; background: white; padding: 24px; border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.page-title { margin: 0 0 8px; font-size: 24px; color: #303133; }
.page-description { color: #909399; font-size: 14px; }
.back-btn { margin-bottom: 12px; color: #b31b1b; border-color: #b31b1b; }
.filter-toolbar {
  display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
  margin-bottom: 16px; background: #fff; padding: 16px; border-radius: 12px;
}
.search-input { width: 280px; }
.filter-select { width: 160px; }
.list-view { background: #fff; padding: 16px; border-radius: 12px; }
.title-text { color: #b31b1b; cursor: pointer; font-weight: 500; }
.pagination-container { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
