<template>
  <div class="demand-detail-page">
    <div class="detail-header">
      <el-button class="back-btn" @click="goBack">
        <el-icon><ArrowLeft /></el-icon> 返回列表
      </el-button>
      <el-button v-if="demand" type="primary" class="ruc-btn-primary" @click="openApplyDialog">
        承接资源
      </el-button>
    </div>

    <div v-if="loading" class="detail-loading">
      <el-skeleton :rows="10" animated />
    </div>
    <div v-else-if="demand" class="detail-body">
      <div class="detail-title-row">
        <h1 class="detail-title">{{ demand.title }}</h1>
        <el-tag type="success" size="large">可申请</el-tag>
      </div>

      <div class="detail-meta">
        <span v-if="demand.enterprise_name">企业：{{ demand.enterprise_name }}</span>
        <span v-if="demand.industry">行业：{{ demand.industry }}</span>
        <span v-if="demand.publisher_name">发布人：{{ demand.publisher_name }}</span>
        <span v-if="demand.published_at">发布时间：{{ formatDate(demand.published_at) }}</span>
        <span v-if="demand.deadline">截止：{{ demand.deadline }}</span>
      </div>

      <div v-if="demand.my_applications?.length" class="my-apps-block">
        <h3>我的承接记录</h3>
        <div v-for="app in demand.my_applications" :key="app.push_id" class="my-app-row">
          <span>{{ app.project_title }}（{{ app.project_code || app.project_id }}）</span>
          <el-tag :type="appStatusType(app.status)" size="small">{{ appStatusLabel(app.status) }}</el-tag>
          <span v-if="app.remark" class="app-remark">说明：{{ app.remark }}</span>
        </div>
      </div>

      <div v-if="demand.summary" class="detail-summary">
        <div class="summary-box">{{ demand.summary }}</div>
      </div>

      <div v-if="demand.source_url || demand.source_note" class="source-block">
        <div v-if="demand.source_url" class="source-line">
          来源链接：
          <a :href="demand.source_url" target="_blank" rel="noopener">{{ demand.source_url }}</a>
        </div>
        <div v-if="demand.source_note" class="source-line">转载说明：{{ demand.source_note }}</div>
      </div>

      <div class="detail-content news-rich-html w-e-text-container">
        <div class="w-e-scroll">
          <div data-slate-editor v-html="demand.content"></div>
        </div>
      </div>

      <div
        v-if="demand.contact_name || demand.contact_phone || demand.contact_email"
        class="contact-block"
      >
        <h3>联系信息</h3>
        <p v-if="demand.contact_name">联系人：{{ demand.contact_name }}</p>
        <p v-if="demand.contact_phone">电话：{{ demand.contact_phone }}</p>
        <p v-if="demand.contact_email">邮箱：{{ demand.contact_email }}</p>
      </div>
    </div>
    <div v-else class="detail-empty">
      <el-empty description="项目合作资源不存在或已不可申请" />
    </div>

    <el-dialog v-model="applyDialogVisible" title="承接项目合作资源" width="520px" destroy-on-close>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="仅可选择已入库或孵化中的本人项目；提交后立即承接该项目合作资源。"
        style="margin-bottom: 16px"
      />
      <el-form label-width="100px">
        <el-form-item label="选择项目" required>
          <el-select
            v-model="applyForm.project_id"
            placeholder="请选择项目"
            style="width: 100%"
            :loading="projectsLoading"
            filterable
          >
            <el-option
              v-for="p in eligibleProjects"
              :key="p.id"
              :label="`${p.title}（${p.project_code || p.id}）`"
              :value="p.id"
              :disabled="isProjectDisabled(p.id)"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="承接说明">
          <el-input
            v-model="applyForm.remark"
            type="textarea"
            :rows="3"
            placeholder="可选：简要说明项目与合作资源的匹配情况"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="applyDialogVisible = false">取消</el-button>
        <el-button type="primary" class="ruc-btn-primary" :loading="applying" @click="submitApply">
          确认承接
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import request from '@/utils/request'
import '@wangeditor/editor/dist/css/style.css'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const demand = ref<any>(null)
const applyDialogVisible = ref(false)
const applying = ref(false)
const projectsLoading = ref(false)
const eligibleProjects = ref<any[]>([])
const applyForm = ref({ project_id: '', remark: '' })

function appStatusLabel(s: string) {
  const m: Record<string, string> = {
    pushed: '待承接（项目经理推送）',
    applied: '已承接',
    claimed: '已承接',
    declined: '已拒绝',
  }
  return m[s] || s
}

function appStatusType(s: string) {
  const m: Record<string, string> = {
    pushed: 'warning',
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

function isProjectDisabled(projectId: string) {
  const app = demand.value?.my_applications?.find((a: any) => a.project_id === projectId)
  if (!app) return false
  return ['pushed', 'applied', 'claimed'].includes(app.status)
}

function goBack() {
  router.push('/applicant/enterprise-demands')
}

async function loadDemand() {
  const id = route.params.id as string
  if (!id) return
  loading.value = true
  try {
    const res = await request.get(`/api/applicant/enterprise-demands/${id}`)
    if (res.success && res.data) {
      demand.value = res.data
    } else {
      demand.value = null
      ElMessage.error(res.error || '加载失败')
    }
  } catch {
    demand.value = null
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

async function loadEligibleProjects() {
  projectsLoading.value = true
  try {
    const res = await request.get('/api/applicant/enterprise-demands/eligible-projects')
    if (res.success) eligibleProjects.value = res.data || []
  } catch (e) {
    console.error('加载项目失败', e)
  } finally {
    projectsLoading.value = false
  }
}

async function openApplyDialog() {
  applyForm.value = { project_id: '', remark: '' }
  applyDialogVisible.value = true
  await loadEligibleProjects()
}

async function submitApply() {
  if (!applyForm.value.project_id) {
    ElMessage.warning('请选择项目')
    return
  }
  applying.value = true
  try {
    const id = route.params.id as string
    const res = await request.post(`/api/applicant/enterprise-demands/${id}/apply`, {
      project_id: applyForm.value.project_id,
      remark: applyForm.value.remark,
    })
    if (res.success) {
      ElMessage.success(res.message || '已成功承接')
      applyDialogVisible.value = false
      await loadDemand()
    } else {
      ElMessage.error(res.error || '申请失败')
    }
  } catch {
    ElMessage.error('申请失败')
  } finally {
    applying.value = false
  }
}

onMounted(() => {
  loadDemand()
})
</script>

<style scoped>
.demand-detail-page {
  max-width: 960px;
  margin: 0 auto;
  --el-color-primary: #b31b1b;
}

.ruc-btn-primary {
  background: #b31b1b;
  border-color: #b31b1b;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.back-btn {
  color: #b31b1b;
  border-color: #b31b1b;
}

.detail-body {
  background: white;
  padding: 28px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.detail-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.detail-title {
  margin: 0;
  font-size: 26px;
  color: #262626;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  color: #8c8c8c;
  font-size: 14px;
  margin-bottom: 20px;
}

.my-apps-block {
  margin-bottom: 20px;
  padding: 14px 16px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.my-apps-block h3 {
  margin: 0 0 10px;
  font-size: 15px;
}

.my-app-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 14px;
}

.app-remark {
  color: #8c8c8c;
  font-size: 13px;
}

.summary-box {
  background: #f9f9f9;
  border-left: 4px solid #b31b1b;
  padding: 12px 16px;
  line-height: 1.7;
  margin-bottom: 20px;
}

.source-block {
  margin-bottom: 16px;
  font-size: 14px;
  color: #595959;
}

.source-line {
  margin-bottom: 6px;
}

.detail-content {
  line-height: 1.8;
  margin-bottom: 24px;
}

.contact-block {
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.contact-block h3 {
  margin: 0 0 10px;
}

.contact-block p {
  margin: 4px 0;
  color: #555;
}

.detail-loading,
.detail-empty {
  background: white;
  padding: 40px;
  border-radius: 12px;
}
</style>
