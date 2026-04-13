<!-- 邀请码管理：写入 Invitation 表，管理员可看全部；项目经理仅本人发出的 -->
<template>
  <div class="invitation-page assistant-ruc-theme">
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-btn" @click="goBack">← 返回工作台</button>
        <h1 class="page-title">邀请码管理</h1>
        <p class="page-desc">
          生成邀请码并交给对方，对方注册「评审专家」或「项目经理」时需填写此码。数据来自系统表
          <code>Invitation</code>。下表过期时间、创建时间均为<strong>北京时间</strong>（东八区）。
        </p>
      </div>
    </div>

    <el-card class="gen-card" shadow="never">
      <template #header>
        <span class="card-title">生成新邀请码</span>
      </template>
      <el-form :inline="true" @submit.prevent="createInvite">
        <el-form-item label="邀请对象角色">
          <el-select v-model="form.target_role" placeholder="请选择" style="width: 200px">
            <el-option label="评审专家" value="reviewer" />
            <el-option label="项目经理" value="project_manager" />
          </el-select>
        </el-form-item>
        <el-form-item label="有效天数">
          <el-input-number v-model="form.expiresInDays" :min="1" :max="maxDays" />
          <span class="hint-inline">{{ isAdmin ? '管理员最长 365 天' : '项目经理最长 90 天' }}</span>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="creating" @click="createInvite">生成邀请码</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card" shadow="never">
      <template #header>
        <span class="card-title">{{ isAdmin ? '全部邀请记录' : '我发出的邀请' }}</span>
        <el-button text type="primary" :loading="loading" @click="loadList">刷新</el-button>
      </template>
      <el-table v-loading="loading" :data="list" stripe style="width: 100%">
        <el-table-column v-if="isAdmin" prop="inviter_name" label="邀请人" min-width="120">
          <template #default="{ row }">
            {{ row.inviter_name || '—' }}
            <span v-if="row.inviter_username" class="sub">（{{ row.inviter_username }}）</span>
          </template>
        </el-table-column>
        <el-table-column label="目标角色" width="120">
          <template #default="{ row }">
            {{ roleLabel(row.target_role) }}
          </template>
        </el-table-column>
        <el-table-column prop="invitation_code" label="邀请码" min-width="160">
          <template #default="{ row }">
            <code class="code-cell">{{ row.invitation_code }}</code>
            <el-button link type="primary" size="small" @click="copyCode(row.invitation_code)">
              复制
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="过期时间（北京时间）" min-width="190">
          <template #default="{ row }">{{ formatBeijingTime(row.expires_at) }}</template>
        </el-table-column>
        <el-table-column label="创建时间（北京时间）" min-width="190">
          <template #default="{ row }">{{ formatBeijingTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending'"
              link
              type="danger"
              size="small"
              @click="revoke(row)"
            >
              作废
            </el-button>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()

const loading = ref(false)
const creating = ref(false)
const list = ref<any[]>([])
const form = ref({
  target_role: 'reviewer' as 'reviewer' | 'project_manager',
  expiresInDays: 30,
})

const userInfo = computed(() => {
  try {
    const raw = localStorage.getItem('userInfo')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
})

const isAdmin = computed(() => userInfo.value?.role === 'admin')

const maxDays = computed(() => (isAdmin.value ? 365 : 90))

/** 列表时间统一按北京时间展示（库内可为 UTC 字符串或本地时间，均换算到 Asia/Shanghai） */
function formatBeijingTime(v: unknown): string {
  if (v == null || v === '') return '—'
  const s = typeof v === 'string' ? v.trim() : String(v)
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(d)
    const m: Record<string, string> = {}
    for (const p of parts) {
      if (p.type !== 'literal') m[p.type] = p.value
    }
    return `${m.year}-${m.month}-${m.day} ${m.hour}:${m.minute}:${m.second}`
  } catch {
    return s
  }
}

function goBack() {
  if (isAdmin.value) {
    router.push('/admin/dashboard')
  } else {
    router.push('/assistant/dashboard')
  }
}

function roleLabel(r: string) {
  const m: Record<string, string> = {
    reviewer: '评审专家',
    project_manager: '项目经理',
    admin: '系统管理员',
  }
  return m[r] || r
}

function statusLabel(s: string) {
  const m: Record<string, string> = {
    pending: '待使用',
    accepted: '已使用',
    expired: '已过期',
    cancelled: '已作废',
  }
  return m[s] || s
}

function statusType(s: string) {
  const m: Record<string, string> = {
    pending: 'warning',
    accepted: 'success',
    expired: 'info',
    cancelled: 'danger',
  }
  return m[s] || 'info'
}

async function loadList() {
  loading.value = true
  try {
    const res = (await request.get('/api/invitations')) as { success?: boolean; data?: any[] }
    if (res.success) {
      list.value = res.data || []
    } else {
      ElMessage.error('加载失败')
    }
  } catch (e: any) {
    const d = e?.response?.data?.detail || e?.response?.data?.message
    ElMessage.error(d ? `加载邀请列表失败：${d}` : '加载邀请列表失败')
  } finally {
    loading.value = false
  }
}

async function createInvite() {
  creating.value = true
  try {
    const res = (await request.post('/api/invitations', {
      target_role: form.value.target_role,
      expiresInDays: form.value.expiresInDays,
    })) as { success?: boolean; message?: string; data?: { invitation_code?: string } }
    if (res.success) {
      ElMessage.success(res.message || '已生成')
      if (res.data?.invitation_code) {
        await copyCode(res.data.invitation_code)
      }
      await loadList()
    } else {
      ElMessage.error((res as any).error || '生成失败')
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || '生成失败')
  } finally {
    creating.value = false
  }
}

async function copyCode(code: string) {
  try {
    await navigator.clipboard.writeText(code)
    ElMessage.success('已复制邀请码')
  } catch {
    ElMessage.info(code)
  }
}

async function revoke(row: { id: string; invitation_code: string }) {
  try {
    await ElMessageBox.confirm(`确定作废邀请码「${row.invitation_code}」？`, '作废确认', {
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    const res = (await request.post('/api/invitations/revoke', { id: row.id })) as { success?: boolean }
    if (res.success) {
      ElMessage.success('已作废')
      await loadList()
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || '作废失败')
  }
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.invitation-page {
  min-height: 100vh;
  padding: 24px;
  background: #f5f7fa;
}

.page-header {
  margin-bottom: 20px;
}

.back-btn {
  display: inline-block;
  margin-bottom: 12px;
  padding: 8px 14px;
  border: 1px solid rgba(179, 27, 27, 0.35);
  border-radius: 8px;
  background: #fff;
  color: #b31b1b;
  cursor: pointer;
  font-size: 14px;
}

.page-title {
  margin: 0 0 8px;
  font-size: 22px;
  color: #303133;
}

.page-desc {
  margin: 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

.page-desc code {
  font-size: 13px;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
}

.gen-card,
.table-card {
  margin-bottom: 20px;
  border-radius: 12px;
}

.card-title {
  font-weight: 600;
  color: #303133;
}

.hint-inline {
  margin-left: 8px;
  font-size: 12px;
  color: #909399;
}

.code-cell {
  margin-right: 8px;
  font-size: 13px;
  background: #f5f7fa;
  padding: 2px 8px;
  border-radius: 4px;
}

.sub {
  color: #909399;
  font-size: 12px;
}

.muted {
  color: #c0c4cc;
}
</style>
