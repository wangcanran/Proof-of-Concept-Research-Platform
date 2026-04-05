<!-- src/views/funds/components/RecentProjectsList.vue -->
<template>
  <div class="recent-projects-list">
    <el-table :data="data" v-loading="loading" style="width: 100%">
      <el-table-column prop="project_code" label="项目编号" width="150">
        <template #default="{ row }">
          <el-link type="primary" @click="viewProject(row.id)">
            {{ row.project_code || '暂未编号' }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="项目名称" min-width="200">
        <template #default="{ row }">
          <el-link type="primary" @click="viewProject(row.id)">
            {{ row.title }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="budget_total" label="预算金额" width="120">
        <template #default="{ row }"> ¥ {{ formatAmount(row.budget_total || 0) }} </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="120">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="viewProject(row.id)">
            查看详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="data.length === 0 && !loading" class="empty-state">
      <el-empty description="暂无项目" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

interface Project {
  id: string
  project_code: string
  title: string
  status: string
  budget_total: number
  created_at: string
}

defineProps<{
  data: Project[]
  loading?: boolean
}>()

const router = useRouter()

// 获取状态类型
const getStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    draft: 'info',
    submitted: 'warning',
    under_review: 'warning',
    revision: 'warning',
    batch_review: 'warning',
    approved: 'success',
    incubating: 'primary',
    completed: 'success',
    rejected: 'danger',
    terminated: 'danger',
  }
  return typeMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    under_review: '评审中',
    revision: '修改中',
    batch_review: '集中评审',
    approved: '已批准',
    incubating: '孵化中',
    completed: '已完成',
    rejected: '已驳回',
    terminated: '已终止',
  }
  return textMap[status] || status
}

// 格式化金额
const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// 格式化日期
const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  } catch {
    return dateString
  }
}

// 查看项目详情
const viewProject = (projectId: string) => {
  router.push(`/projects/detail/${projectId}`)
}
</script>

<style scoped>
.recent-projects-list {
  width: 100%;
}

.empty-state {
  padding: 40px 0;
}
</style>
