<template>
  <div class="demand-detail-page">
    <div class="detail-header">
      <el-button class="back-btn" @click="goBack">
        <el-icon><ArrowLeft /></el-icon> 返回列表
      </el-button>
      <div v-if="demand" class="header-actions">
        <el-button v-if="demand.status === 'published'" type="primary" @click="openPushDialog">
          推送给项目
        </el-button>
        <el-button @click="goEdit">编辑</el-button>
      </div>
    </div>

    <div v-if="loading" class="detail-loading">
      <el-skeleton :rows="10" animated />
    </div>
    <div v-else-if="demand" class="detail-body">
      <div class="detail-title-row">
        <h1 class="detail-title">{{ demand.title }}</h1>
        <el-tag :type="statusType(demand.status)" size="large">{{ statusLabel(demand.status) }}</el-tag>
      </div>

      <div class="detail-meta">
        <span v-if="demand.enterprise_name">企业：{{ demand.enterprise_name }}</span>
        <span v-if="demand.industry">行业：{{ demand.industry }}</span>
        <span v-if="demand.publisher_name">发布人：{{ demand.publisher_name }}</span>
        <span v-if="demand.published_at">发布时间：{{ formatDate(demand.published_at) }}</span>
        <span v-if="demand.deadline">截止：{{ demand.deadline }}</span>
        <span>浏览：{{ demand.view_count || 0 }}</span>
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

      <div v-if="demand.status === 'published'" class="push-section">
        <div class="push-section-head">
          <h3>项目推送记录</h3>
          <el-button type="primary" size="small" @click="openPushDialog">推送给项目</el-button>
        </div>
        <el-table v-loading="pushLoading" :data="pushList" stripe empty-text="尚未推送给任何项目">
          <el-table-column prop="project_title" label="项目" min-width="180" show-overflow-tooltip />
          <el-table-column prop="project_code" label="编号" width="120" />
          <el-table-column prop="applicant_name" label="申请人" width="100" />
          <el-table-column prop="status" label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="pushStatusType(row.status)" size="small">{{ pushStatusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="说明" min-width="140" show-overflow-tooltip />
          <el-table-column prop="created_at" label="时间" width="160">
            <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="100" align="center">
            <template #default="{ row }">
              <el-button
                v-if="row.status === 'pushed'"
                link
                type="warning"
                size="small"
                @click="handleWithdraw(row)"
              >
                撤回
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
    <div v-else class="detail-empty">
      <el-empty description="项目合作资源不存在或已被删除" />
    </div>

    <el-dialog v-model="pushDialogVisible" title="推送给负责的项目" width="640px" destroy-on-close>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        class="push-tip"
        title="仅可向已入库或孵化中、且由您负责的项目推送；推送后由项目申请人选择是否承接。"
      />
      <el-form label-width="88px" class="push-form">
        <el-form-item label="选择项目" required>
          <el-select
            v-model="selectedProjectIds"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            :placeholder="myProjects.length ? '请选择项目（可多选）' : '暂无已入库或孵化中的负责项目'"
            style="width: 100%"
            :loading="projectsLoading"
            :disabled="!myProjects.length"
          >
            <el-option
              v-for="p in myProjects"
              :key="p.id"
              :label="`${p.title}（${projectStatusLabel(p.status)} · ${p.applicant_name || '未知申请人'}）`"
              :value="p.id"
              :disabled="isProjectDisabled(p.id)"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="推送说明">
          <el-input
            v-model="pushRemark"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            placeholder="可选，给项目申请人的说明"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pushDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="pushSubmitting" @click="submitPush">确认推送</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import request from '@/utils/request'
import '@wangeditor/editor/dist/css/style.css'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const demand = ref<any>(null)
const pushList = ref<any[]>([])
const pushLoading = ref(false)
const pushDialogVisible = ref(false)
const myProjects = ref<any[]>([])
const projectsLoading = ref(false)
const selectedProjectIds = ref<string[]>([])
const pushRemark = ref('')
const pushSubmitting = ref(false)

const PUSHABLE_PROJECT_STATUSES = ['approved', 'incubating']

function projectStatusLabel(status: string) {
  const m: Record<string, string> = {
    approved: '已入库',
    incubating: '孵化中',
  }
  return m[status] || status
}

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

function pushStatusLabel(s: string) {
  const m: Record<string, string> = {
    pushed: '待承接',
    claimed: '已承接',
    declined: '已拒绝',
    withdrawn: '已撤回',
  }
  return m[s] || s
}

function pushStatusType(s: string) {
  const m: Record<string, string> = {
    pushed: 'warning',
    claimed: 'success',
    declined: 'info',
    withdrawn: 'info',
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
  const row = pushList.value.find((p) => p.project_id === projectId)
  return row?.status === 'claimed' || row?.status === 'pushed'
}

function goBack() {
  router.push('/assistant/enterprise-demands')
}

function goEdit() {
  router.push(`/assistant/enterprise-demands/${route.params.id}/edit`)
}

async function loadDemand() {
  const id = route.params.id as string
  if (!id) return
  loading.value = true
  try {
    const res = await request.get(`/api/enterprise-demands/${id}`)
    if (res.success && res.data) {
      demand.value = res.data
      if (res.data.status === 'published') await loadPushes()
    } else {
      ElMessage.error(res.error || '加载失败')
    }
  } catch {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

async function loadPushes() {
  const id = route.params.id as string
  if (!id) return
  pushLoading.value = true
  try {
    const res = await request.get(`/api/enterprise-demands/${id}/pushes`)
    if (res.success) pushList.value = res.data || []
  } catch (e) {
    console.error('加载推送记录失败', e)
  } finally {
    pushLoading.value = false
  }
}

async function loadMyProjects() {
  projectsLoading.value = true
  try {
    const res = await request.get('/api/assistant/projects/my')
    if (res.success) {
      myProjects.value = (res.data || []).filter((p: { status?: string }) =>
        PUSHABLE_PROJECT_STATUSES.includes(p.status || ''),
      )
    }
  } catch (e) {
    console.error('加载项目列表失败', e)
  } finally {
    projectsLoading.value = false
  }
}

async function openPushDialog() {
  selectedProjectIds.value = []
  pushRemark.value = ''
  pushDialogVisible.value = true
  await loadMyProjects()
  if (!myProjects.value.length) {
    ElMessage.info('当前没有已入库或孵化中的负责项目，无法推送')
  }
}

async function submitPush() {
  if (!selectedProjectIds.value.length) {
    ElMessage.warning('请选择至少一个项目')
    return
  }
  pushSubmitting.value = true
  try {
    const res = await request.post(`/api/enterprise-demands/${route.params.id}/push`, {
      project_ids: selectedProjectIds.value,
      remark: pushRemark.value.trim() || null,
    })
    if (res.success) {
      ElMessage.success(res.message || '推送成功')
      if (res.data?.skipped?.length) {
        ElMessage.warning(`部分项目未推送：${res.data.skipped.map((s: any) => s.reason).join('；')}`)
      }
      pushDialogVisible.value = false
      await loadPushes()
    } else {
      ElMessage.error(res.error || '推送失败')
    }
  } catch {
    ElMessage.error('推送失败')
  } finally {
    pushSubmitting.value = false
  }
}

async function handleWithdraw(row: any) {
  try {
    await ElMessageBox.confirm(`确定撤回对「${row.project_title}」的推送？`, '确认撤回', { type: 'warning' })
    const res = await request.put(
      `/api/enterprise-demands/${route.params.id}/pushes/${row.id}/withdraw`,
    )
    if (res.success) {
      ElMessage.success('已撤回')
      await loadPushes()
    } else {
      ElMessage.error(res.error || '撤回失败')
    }
  } catch {
    /* cancel */
  }
}

onMounted(() => {
  loadDemand()
})
</script>

<style scoped>
.demand-detail-page {
  max-width: 1300px;
  margin: 0 auto;
  padding: 24px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.header-actions {
  display: flex;
  gap: 8px;
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

.detail-title-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.detail-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: #1a1a2e;
  line-height: 1.4;
  flex: 1;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  color: #666;
  font-size: 14px;
  margin-bottom: 20px;
}

.detail-summary .summary-box {
  background: #f9f9f9;
  border-left: 4px solid #b31b1b;
  padding: 12px 16px;
  color: #555;
  margin-bottom: 20px;
  line-height: 1.6;
}

.source-block {
  background: #fafafa;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-size: 14px;
  color: #666;
}
.source-line {
  margin: 4px 0;
}
.source-line a {
  color: #b31b1b;
  word-break: break-all;
}

.detail-content {
  line-height: 1.8;
  color: #333;
  margin-bottom: 24px;
}

.contact-block {
  border-top: 1px solid #f0f0f0;
  padding-top: 16px;
  margin-bottom: 24px;
}
.contact-block h3 {
  margin: 0 0 8px;
  font-size: 16px;
}
.contact-block p {
  margin: 4px 0;
  color: #555;
}

.push-section {
  border-top: 1px solid #f0f0f0;
  padding-top: 20px;
}
.push-section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.push-section-head h3 {
  margin: 0;
  font-size: 18px;
}

.push-tip {
  margin-bottom: 16px;
}
</style>
