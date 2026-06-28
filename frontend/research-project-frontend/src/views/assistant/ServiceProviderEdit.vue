<!-- src/views/assistant/ServiceProviderEdit.vue -->
<template>
  <div class="service-provider-edit-page">
    <div class="back-bar">
      <el-button class="back-btn" @click="goBack">
        <el-icon><ArrowLeft /></el-icon> 返回列表
      </el-button>
    </div>

    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">{{ isEdit ? '编辑服务资源' : '新增服务资源' }}</h1>
      </div>
      <div class="header-right">
        <el-button @click="goBack">取消</el-button>
        <el-button type="primary" class="ruc-btn-primary" :loading="saving" @click="handleSave">
          保存
        </el-button>
      </div>
    </div>

    <div class="edit-body">
      <div class="form-card">
        <el-form :model="form" label-position="top" class="ruc-form">
          <el-form-item label="机构名称" required>
            <el-input v-model="form.name" placeholder="请输入机构名称" maxlength="200" show-word-limit />
          </el-form-item>

          <el-form-item label="统一社会信用代码" required>
            <el-input
              v-model="form.unified_social_credit_code"
              placeholder="请输入统一社会信用代码"
              maxlength="50"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="机构分类" required>
            <el-select
              v-model="form.categories"
              multiple
              collapse-tags
              collapse-tags-tooltip
              placeholder="请至少选择一个机构分类"
              style="width: 100%"
            >
              <el-option v-for="c in SERVICE_PROVIDER_CATEGORIES" :key="c" :label="c" :value="c" />
            </el-select>
          </el-form-item>

          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="联系人" required>
                <el-input v-model="form.contact_name" placeholder="请输入联系人姓名" maxlength="100" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="联系电话" required>
                <el-input v-model="form.contact_phone" placeholder="请输入联系电话" maxlength="20" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="联系邮箱">
            <el-input v-model="form.contact_email" placeholder="选填" maxlength="100" />
          </el-form-item>

          <el-form-item label="机构简介">
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="6"
              placeholder="请输入机构简介（选填）"
              maxlength="5000"
              show-word-limit
            />
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import request from '@/utils/request'
import {
  SERVICE_PROVIDER_CATEGORIES,
  parseCategoryList,
} from '@/constants/serviceProviderCategories'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.id)
const saving = ref(false)

const form = ref({
  name: '',
  unified_social_credit_code: '',
  categories: [] as string[],
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  description: '',
})

async function loadProvider() {
  const id = route.params.id as string
  if (!id) return
  try {
    const res = await request.get(`/api/service-providers/${id}`)
    if (res.success && res.data) {
      const data = res.data
      form.value = {
        name: data.name || '',
        unified_social_credit_code: data.unified_social_credit_code || '',
        categories: data.category_list?.length
          ? data.category_list
          : parseCategoryList(data.category),
        contact_name: data.contact_name || '',
        contact_phone: data.contact_phone || '',
        contact_email: data.contact_email || '',
        description: data.description || '',
      }
    } else {
      ElMessage.error(res.error || '加载失败')
    }
  } catch (e) {
    console.error('加载服务资源失败', e)
    ElMessage.error('加载服务资源失败')
  }
}

async function handleSave() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入机构名称')
    return
  }
  if (!form.value.unified_social_credit_code.trim()) {
    ElMessage.warning('请输入统一社会信用代码')
    return
  }
  if (!form.value.categories.length) {
    ElMessage.warning('请至少选择一个机构分类')
    return
  }
  if (!form.value.contact_name.trim()) {
    ElMessage.warning('请输入联系人')
    return
  }
  if (!form.value.contact_phone.trim()) {
    ElMessage.warning('请输入联系电话')
    return
  }

  const payload = {
    name: form.value.name.trim(),
    unified_social_credit_code: form.value.unified_social_credit_code.trim(),
    category: form.value.categories,
    contact_name: form.value.contact_name.trim(),
    contact_phone: form.value.contact_phone.trim(),
    contact_email: form.value.contact_email.trim() || null,
    description: form.value.description.trim() || null,
  }

  saving.value = true
  try {
    let res
    if (isEdit.value) {
      res = await request.put(`/api/service-providers/${route.params.id}`, payload)
    } else {
      res = await request.post('/api/service-providers', payload)
    }
    if (res.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      router.push('/assistant/service-providers')
    } else {
      ElMessage.error(res.error || '保存失败')
    }
  } catch (e) {
    console.error('保存服务资源失败', e)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.push('/assistant/service-providers')
}

onMounted(() => {
  if (isEdit.value) {
    loadProvider()
  }
})
</script>

<style scoped>
.service-provider-edit-page {
  padding: 0;
  max-width: 1300px;
  margin: 0 auto;
}

.back-bar {
  margin-bottom: 16px;
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

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: #fff;
  border-radius: 10px;
  padding: 18px 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

.header-right {
  display: flex;
  gap: 8px;
}

.ruc-btn-primary {
  background: #b31b1b;
  border-color: #b31b1b;
}

.ruc-btn-primary:hover {
  background: #8a1515;
  border-color: #8a1515;
}

.edit-body {
  display: flex;
  align-items: flex-start;
}

.form-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  width: 100%;
}

.ruc-form :deep(.el-form-item__label) {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  padding-bottom: 8px;
  border-bottom: 2px solid #b31b1b;
  display: block;
  width: 100%;
  margin-bottom: 12px;
  line-height: 1.6;
}
</style>
