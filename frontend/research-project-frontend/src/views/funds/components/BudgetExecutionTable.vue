<!-- src/views/funds/components/BudgetExecutionTable.vue -->
<template>
  <div class="budget-execution-table">
    <el-table :data="data" v-loading="loading" style="width: 100%">
      <el-table-column prop="title" label="项目名称" min-width="200">
        <template #default="{ row }">
          <el-link type="primary" @click="viewProject(row.id)">
            {{ row.title }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column prop="project_code" label="项目编号" width="150" />
      <el-table-column prop="status_text" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ row.status_text }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="budget" label="预算总额" width="120">
        <template #default="{ row }"> ¥ {{ formatAmount(row.budget) }} </template>
      </el-table-column>
      <el-table-column prop="approved_budget" label="批准预算" width="120">
        <template #default="{ row }">
          ¥ {{ formatAmount(row.approved_budget || row.budget) }}
        </template>
      </el-table-column>
      <el-table-column prop="used" label="已使用" width="120">
        <template #default="{ row }">
          <span :style="{ color: getUsedColor(row.percentage) }">
            ¥ {{ formatAmount(row.used) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="balance" label="余额" width="120">
        <template #default="{ row }">
          <span :style="{ color: getBalanceColor(row.balance) }">
            ¥ {{ formatAmount(row.balance) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="percentage" label="执行率" width="150">
        <template #default="{ row }">
          <el-progress
            :percentage="row.percentage"
            :status="getProgressStatus(row.percentage)"
            :stroke-width="8"
          />
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
      <el-empty description="暂无预算执行数据" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

interface BudgetExecutionItem {
  id: string
  title: string
  project_code: string
  status: string
  status_text: string
  budget: number
  approved_budget: number
  used: number
  balance: number
  percentage: number
  start_date?: string
  end_date?: string
}

defineProps<{
  data: BudgetExecutionItem[]
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

// 获取已使用金额颜色
const getUsedColor = (percentage: number) => {
  if (percentage >= 90) return '#ff4d4f'
  if (percentage >= 70) return '#fa8c16'
  return '#52c41a'
}

// 获取余额颜色
const getBalanceColor = (balance: number) => {
  if (balance <= 0) return '#ff4d4f'
  return '#1890ff'
}

// 获取进度状态
const getProgressStatus = (percentage: number) => {
  if (percentage >= 90) return 'exception'
  if (percentage >= 70) return 'warning'
  return 'success'
}

// 格式化金额
const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// 查看项目详情
const viewProject = (projectId: string) => {
  router.push(`/projects/detail/${projectId}`)
}
</script>

<style scoped>
.budget-execution-table {
  width: 100%;
}

.empty-state {
  padding: 40px 0;
  text-align: center;
}
</style>
