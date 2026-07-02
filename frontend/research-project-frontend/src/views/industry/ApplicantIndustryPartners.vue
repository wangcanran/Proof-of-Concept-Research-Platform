<template>
  <div class="partner-list-page">
    <IndustryResourceTabs role="applicant" active-tab="partners" />

    <div class="page-header">
      <el-button class="back-btn" @click="goDashboard">
        <el-icon><ArrowLeft /></el-icon> 返回工作台
      </el-button>
      <h1 class="page-title">产业资源库</h1>
      <div class="page-description">浏览产业化合作伙伴档案，用于技术承接、供应链对接等场景</div>
    </div>

    <div class="filter-toolbar">
      <el-input
        v-model="filters.keyword"
        placeholder="搜索机构名称、产品/服务、联系人"
        class="search-input"
        clearable
        @clear="loadList"
        @keyup.enter="loadList"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-select v-model="filters.domain_id" placeholder="所属领域" clearable filterable @change="loadList">
        <el-option v-for="d in researchDomains" :key="d.id" :label="d.name" :value="d.id" />
      </el-select>
      <el-button type="primary" class="ruc-btn-primary" @click="loadList">搜索</el-button>
      <el-button @click="resetFilters">重置</el-button>
    </div>

    <el-table v-loading="loading" :data="partnerList" stripe>
      <el-table-column prop="name" label="机构名称" min-width="180">
        <template #default="{ row }">
          <span class="link-text" @click="goView(row.id)">{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column label="机构分类" width="110" align="center">
        <template #default="{ row }">{{ row.org_category_label || orgCategoryLabel(row.org_category) }}</template>
      </el-table-column>
      <el-table-column label="所属领域" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">{{ (row.domain_names || []).join('、') || '—' }}</template>
      </el-table-column>
      <el-table-column prop="main_products_services" label="主要产品/服务" min-width="160" show-overflow-tooltip />
      <el-table-column prop="contact_name" label="联系人" width="100" align="center" />
      <el-table-column label="操作" width="100" align="center" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="goView(row.id)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-container">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @size-change="loadList"
        @current-change="loadList"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Search } from '@element-plus/icons-vue'
import IndustryResourceTabs from '@/components/IndustryResourceTabs.vue'
import { industryPartnerAPI, type IndustryPartnerRow } from '@/api/industryPartners'
import { getResearchDomains } from '@/api/auth'
import { orgCategoryLabel } from '@/constants/industryPartnerCategories'

const router = useRouter()
const loading = ref(false)
const partnerList = ref<IndustryPartnerRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const researchDomains = ref<{ id: string; name: string }[]>([])
const filters = ref({ keyword: '', domain_id: '' })

async function loadDomains() {
  const res = (await getResearchDomains()) as { success?: boolean; data?: { id: string; name: string }[] }
  researchDomains.value = res.success ? (res.data || []) : []
}

async function loadList() {
  loading.value = true
  try {
    const res = await industryPartnerAPI.list({
      keyword: filters.value.keyword || undefined,
      domain_id: filters.value.domain_id || undefined,
      page: page.value,
      pageSize: pageSize.value,
    })
    if (res.success && res.data) {
      partnerList.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.value = { keyword: '', domain_id: '' }
  page.value = 1
  loadList()
}

function goView(id: string) {
  router.push(`/applicant/industry-resources/partners/${id}`)
}

function goDashboard() {
  router.push('/applicant/dashboard')
}

onMounted(async () => {
  await loadDomains()
  loadList()
})
</script>

<style scoped>
.partner-list-page { max-width: 1200px; margin: 0 auto; }
.page-header { background: #fff; padding: 20px 24px; border-radius: 12px; margin-bottom: 16px; }
.page-title { margin: 8px 0; font-size: 24px; }
.page-description { color: #909399; font-size: 14px; }
.back-btn { color: #b31b1b; border-color: #b31b1b; }
.filter-toolbar { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; background: #fff; padding: 16px; border-radius: 12px; }
.search-input { width: 280px; }
.ruc-btn-primary { background: #b31b1b; border-color: #b31b1b; }
.link-text { color: #b31b1b; cursor: pointer; font-weight: 500; }
.pagination-container { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
