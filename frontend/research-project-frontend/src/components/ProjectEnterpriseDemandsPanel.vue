<template>
  <div class="enterprise-demands-panel">
    <div v-if="loading" class="panel-loading">
      <el-skeleton :rows="4" animated />
    </div>
    <div v-else-if="items.length === 0" class="empty-state">
      <p>暂无与本项目相关的项目合作资源</p>
      <p class="empty-hint">
        可前往「项目合作资源」浏览全部资源；项目经理推荐的资源会在列表中标注「推荐」并优先展示。
      </p>
    </div>
    <div v-else class="demand-list">
      <div v-for="item in items" :key="item.id" class="demand-card">
        <div class="demand-card-head">
          <div class="demand-title-row">
            <div class="demand-title">{{ item.demand_title }}</div>
            <el-tag v-if="isRecommended(item)" type="danger" size="small" effect="dark">推荐</el-tag>
          </div>
          <el-tag v-if="item.status === 'claimed'" type="success" size="small">已报名</el-tag>
        </div>
        <div class="demand-meta">
          <span v-if="item.enterprise_name">企业：{{ item.enterprise_name }}</span>
          <span v-if="item.industry">行业：{{ item.industry }}</span>
          <span v-if="item.pushed_by_name">推荐人：{{ item.pushed_by_name }}</span>
          <span v-else-if="!item.pushed_by_name && item.status === 'claimed'">来源：项目主动报名</span>
          <span v-if="isRecommended(item)">推荐时间：{{ formatDate(item.created_at) }}</span>
          <span v-else>时间：{{ formatDate(item.created_at) }}</span>
          <span v-if="item.deadline">截止：{{ item.deadline }}</span>
        </div>
        <p v-if="item.remark" class="demand-remark">推荐说明：{{ item.remark }}</p>
        <div class="demand-actions">
          <el-button size="small" @click="openDetail(item)">查看详情</el-button>
          <el-button
            v-if="item.status === 'claimed'"
            size="small"
            type="warning"
            :loading="cancelingId === item.id"
            @click="handleCancel(item)"
          >
            取消报名
          </el-button>
          <el-button size="small" type="primary" @click="goResourceList">前往资源列表</el-button>
        </div>
      </div>
    </div>

    <el-dialog v-model="detailVisible" :title="detailItem?.demand_title || '资源详情'" width="760px" destroy-on-close>
      <div v-if="detailItem" class="detail-dialog-body">
        <div v-if="isRecommended(detailItem)" class="detail-recommend-tag">
          <el-tag type="danger" effect="dark">推荐</el-tag>
        </div>
        <div class="detail-dialog-meta">
          <span v-if="detailItem.enterprise_name">企业：{{ detailItem.enterprise_name }}</span>
          <span v-if="detailItem.industry">行业：{{ detailItem.industry }}</span>
          <span v-if="detailItem.deadline">截止：{{ detailItem.deadline }}</span>
        </div>
        <div
          class="detail-content news-rich-html w-e-text-container"
          v-html="detailItem.demand_content"
        />
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button type="primary" @click="goResourceList">前往资源列表</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import '@wangeditor/editor/dist/css/style.css'

const props = defineProps<{ projectId: string }>()
const router = useRouter()

type PushItem = {
  id: string
  demand_id?: string
  status: string
  pushed_by?: string | null
  demand_title?: string
  demand_content?: string
  enterprise_name?: string
  industry?: string
  deadline?: string
  remark?: string
  pushed_by_name?: string
  created_at?: string
}

const loading = ref(false)
const items = ref<PushItem[]>([])
const cancelingId = ref('')
const detailVisible = ref(false)
const detailItem = ref<PushItem | null>(null)

function isRecommended(item: PushItem) {
  return !!(item.pushed_by && item.status === 'pushed')
}

function formatDate(d?: string) {
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
  if (!props.projectId) return
  loading.value = true
  try {
    const res = await request.get(`/api/applicant/projects/${props.projectId}/enterprise-demands`)
    if (res.success) {
      const list = res.data || []
      items.value = list.sort((a: PushItem, b: PushItem) => {
        const ar = isRecommended(a) ? 0 : 1
        const br = isRecommended(b) ? 0 : 1
        if (ar !== br) return ar - br
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      })
    }
  } catch (e) {
    console.error('加载项目合作资源失败', e)
  } finally {
    loading.value = false
  }
}

function openDetail(item: PushItem) {
  detailItem.value = item
  detailVisible.value = true
}

function goResourceList() {
  detailVisible.value = false
  router.push('/applicant/enterprise-demands')
}

async function handleCancel(item: PushItem) {
  if (!item.demand_id) return
  try {
    await ElMessageBox.confirm(`确定取消对此资源的报名？`, '取消报名', { type: 'warning' })
  } catch {
    return
  }
  cancelingId.value = item.id
  try {
    const res = await request.post(`/api/applicant/enterprise-demands/${item.demand_id}/cancel`, {
      push_id: item.id,
      project_id: props.projectId,
    })
    if (res.success) {
      ElMessage.success(res.message || '已取消报名')
      await loadList()
    } else {
      ElMessage.error(res.error || '取消报名失败')
    }
  } catch {
    ElMessage.error('取消报名失败')
  } finally {
    cancelingId.value = ''
  }
}

watch(
  () => props.projectId,
  () => loadList(),
  { immediate: true },
)
</script>

<style scoped>
.enterprise-demands-panel {
  min-height: 120px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #8c8c8c;
}
.empty-hint {
  font-size: 13px;
  margin-top: 8px;
}

.demand-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.demand-card {
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 16px 18px;
  background: #fafafa;
}

.demand-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}

.demand-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.demand-title {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.demand-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  color: #8c8c8c;
  margin-bottom: 8px;
}

.demand-remark {
  margin: 0 0 12px;
  font-size: 13px;
  color: #b31b1b;
}

.demand-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.detail-dialog-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: #8c8c8c;
  font-size: 13px;
  margin-bottom: 12px;
}

.detail-recommend-tag {
  margin-bottom: 12px;
}

.detail-content {
  line-height: 1.8;
  color: #333;
  max-height: 50vh;
  overflow-y: auto;
}
</style>
