<!-- src/views/assistant/ServiceProviderDetail.vue -->
<template>
  <div class="service-provider-detail-page">
    <div class="detail-header">
      <el-button class="back-btn" @click="goBack">
        <el-icon><ArrowLeft /></el-icon> 返回列表
      </el-button>
    </div>

    <div v-if="loading" class="detail-loading">
      <el-skeleton :rows="8" animated />
    </div>
    <div v-else-if="provider" class="detail-body">
      <div class="detail-top">
        <h1 class="detail-title">{{ provider.name }}</h1>
        <el-button type="primary" class="ruc-btn-primary" @click="goEdit">编辑</el-button>
      </div>

      <div class="detail-meta">
        <span>统一社会信用代码：{{ provider.unified_social_credit_code }}</span>
        <span v-if="provider.updated_at">更新时间：{{ formatDate(provider.updated_at) }}</span>
      </div>

      <div class="detail-section">
        <h3 class="section-label">机构分类</h3>
        <div class="category-tags">
          <el-tag
            v-for="cat in categoryList"
            :key="cat"
            size="small"
            type="info"
          >
            {{ cat }}
          </el-tag>
        </div>
      </div>

      <div class="detail-section">
        <h3 class="section-label">联系信息</h3>
        <div class="info-grid">
          <div class="info-item"><span class="label">联系人</span>{{ provider.contact_name || '—' }}</div>
          <div class="info-item"><span class="label">联系电话</span>{{ provider.contact_phone || '—' }}</div>
          <div class="info-item"><span class="label">联系邮箱</span>{{ provider.contact_email || '—' }}</div>
        </div>
      </div>

      <div v-if="provider.description" class="detail-section">
        <h3 class="section-label">机构简介</h3>
        <div class="description-box">{{ provider.description }}</div>
      </div>
    </div>
    <div v-else class="detail-empty">
      <el-empty description="服务资源不存在或已被删除" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { parseCategoryList } from '@/constants/serviceProviderCategories'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const provider = ref<any>(null)

const categoryList = computed(() =>
  provider.value?.category_list?.length
    ? provider.value.category_list
    : parseCategoryList(provider.value?.category),
)

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

async function loadProvider() {
  const id = route.params.id as string
  if (!id) return
  loading.value = true
  try {
    const res = await request.get(`/api/service-providers/${id}`)
    if (res.success && res.data) {
      provider.value = res.data
    } else {
      ElMessage.error(res.error || '加载失败')
    }
  } catch (e) {
    console.error('加载服务资源详情失败', e)
    ElMessage.error('加载服务资源详情失败')
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push('/assistant/service-providers')
}

function goEdit() {
  router.push(`/assistant/service-providers/${route.params.id}/edit`)
}

onMounted(() => {
  loadProvider()
})
</script>

<style scoped>
.service-provider-detail-page {
  max-width: 1300px;
  margin: 0 auto;
}

.back-btn {
  padding: 8px 16px;
  color: #b31b1b;
  border-color: #b31b1b;
}

.back-btn:hover {
  color: #fff;
  background: #b31b1b;
  border-color: #b31b1b;
}

.detail-header {
  margin-bottom: 16px;
}

.detail-body {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.detail-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 12px;
}

.detail-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

.ruc-btn-primary {
  background: #b31b1b;
  border-color: #b31b1b;
}

.ruc-btn-primary:hover {
  background: #8a1515;
  border-color: #8a1515;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  color: #7f8c8d;
  font-size: 14px;
  margin-bottom: 24px;
}

.detail-section {
  margin-bottom: 24px;
}

.section-label {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  padding-bottom: 8px;
  border-bottom: 2px solid #b31b1b;
}

.category-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.info-item {
  font-size: 14px;
  color: #2c3e50;
}

.info-item .label {
  display: block;
  color: #909399;
  font-size: 12px;
  margin-bottom: 4px;
}

.description-box {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  line-height: 1.7;
  color: #2c3e50;
  white-space: pre-wrap;
}

.detail-loading,
.detail-empty {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
</style>
