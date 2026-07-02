<template>
  <div class="partner-edit-page">
    <div class="back-bar">
      <el-button class="back-btn" @click="goBack">
        <el-icon><ArrowLeft /></el-icon> 返回列表
      </el-button>
    </div>

    <div class="page-header">
      <h1 class="page-title">{{ isEdit ? '编辑产业资源库机构' : '新增产业资源库机构' }}</h1>
      <div class="header-right">
        <el-button @click="goBack">取消</el-button>
        <el-button type="primary" class="ruc-btn-primary" :loading="saving" @click="handleSave">保存</el-button>
      </div>
    </div>

    <div class="form-card">
      <el-form :model="form" label-position="top" class="ruc-form">
        <el-form-item label="机构名称" required>
          <el-input v-model="form.name" placeholder="企业/机构全称" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="机构分类" required>
          <el-select v-model="form.org_category" placeholder="请选择" style="width: 100%">
            <el-option v-for="c in orgCategories" :key="c.value" :label="c.label" :value="c.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属领域" required>
          <el-select
            v-model="form.domain_ids"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            placeholder="请至少选择一个领域"
            style="width: 100%"
          >
            <el-option v-for="d in researchDomains" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="主要产品/服务">
          <el-input
            v-model="form.main_products_services"
            type="textarea"
            :rows="3"
            placeholder="选填，机构核心产品或服务"
            maxlength="2000"
            show-word-limit
          />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="联系人" required>
              <el-input v-model="form.contact_name" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" required>
              <el-input v-model="form.contact_phone" maxlength="20" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="机构简介">
          <el-input v-model="form.description" type="textarea" :rows="5" maxlength="5000" show-word-limit />
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { industryPartnerAPI } from '@/api/industryPartners'
import { getResearchDomains } from '@/api/auth'
import { INDUSTRY_PARTNER_ORG_CATEGORIES } from '@/constants/industryPartnerCategories'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.id)
const saving = ref(false)
const orgCategories = INDUSTRY_PARTNER_ORG_CATEGORIES
const researchDomains = ref<{ id: string; name: string }[]>([])

const form = ref({
  name: '',
  org_category: 'enterprise',
  domain_ids: [] as string[],
  main_products_services: '',
  contact_name: '',
  contact_phone: '',
  description: '',
})

async function loadDomains() {
  const res = (await getResearchDomains()) as { success?: boolean; data?: { id: string; name: string }[] }
  researchDomains.value = res.success ? (res.data || []) : []
}

async function loadDetail() {
  if (!isEdit.value) return
  const res = await industryPartnerAPI.get(route.params.id as string)
  if (!res.success || !res.data) {
    ElMessage.error(res.error || '加载失败')
    goBack()
    return
  }
  const d = res.data
  form.value = {
    name: d.name || '',
    org_category: d.org_category || 'enterprise',
    domain_ids: d.domain_ids || d.domains?.map((x: { id: string }) => x.id) || [],
    main_products_services: d.main_products_services || '',
    contact_name: d.contact_name || '',
    contact_phone: d.contact_phone || '',
    description: d.description || '',
  }
}

function goBack() {
  router.push('/assistant/industry-resources/partners')
}

async function handleSave() {
  if (!form.value.name.trim()) return ElMessage.warning('请填写机构名称')
  if (!form.value.contact_name.trim()) return ElMessage.warning('请填写联系人')
  if (!form.value.contact_phone.trim()) return ElMessage.warning('请填写联系电话')
  if (!form.value.domain_ids.length) return ElMessage.warning('请至少选择一个所属领域')

  saving.value = true
  try {
    const payload = {
      name: form.value.name.trim(),
      org_category: form.value.org_category,
      domain_ids: form.value.domain_ids,
      main_products_services: form.value.main_products_services.trim() || null,
      contact_name: form.value.contact_name.trim(),
      contact_phone: form.value.contact_phone.trim(),
      description: form.value.description.trim() || null,
    }
    const res = isEdit.value
      ? await industryPartnerAPI.update(route.params.id as string, payload)
      : await industryPartnerAPI.create(payload)
    if (res.success) {
      ElMessage.success('保存成功')
      goBack()
    } else {
      ElMessage.error(res.error || '保存失败')
    }
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await loadDomains()
  await loadDetail()
})
</script>

<style scoped>
.partner-edit-page { max-width: 900px; margin: 0 auto; padding-bottom: 40px; }
.ruc-btn-primary { background: #b31b1b; border-color: #b31b1b; }
.page-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 20px; background: #fff; padding: 20px 24px; border-radius: 12px;
}
.page-title { margin: 0; font-size: 22px; }
.form-card { background: #fff; padding: 24px; border-radius: 12px; }
.back-btn { color: #b31b1b; border-color: #b31b1b; margin-bottom: 12px; }
</style>
