<!-- src/components/funds/RecentExpendituresList.vue -->
<template>
  <div class="recent-expenditures-list">
    <div v-if="expenditures.length === 0" class="empty-state">
      <el-empty description="暂无支出记录" />
    </div>

    <div v-else class="expenditures-table">
      <div
        v-for="item in expenditures"
        :key="item.id"
        class="expenditure-item"
        @click="viewDetail(item)"
      >
        <div class="item-category">
          <div class="category-badge" :style="{ backgroundColor: item.categoryColor }">
            {{ getCategoryShortName(item.category) }}
          </div>
        </div>

        <div class="item-info">
          <div class="item-title">{{ item.description }}</div>
          <div class="item-meta">
            <span class="meta-item">
              <el-icon><User /></el-icon>
              {{ item.applicant }}
            </span>
            <span class="meta-item">
              <el-icon><Calendar /></el-icon>
              {{ formatDate(item.date) }}
            </span>
          </div>
        </div>

        <div class="item-amount">
          <span class="amount-value">{{ formatCurrency(item.amount) }}</span>
          <div class="item-status">
            <el-tag :type="getStatusType(item.status)" size="small">
              {{ getStatusText(item.status) }}
            </el-tag>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { User, Calendar } from '@element-plus/icons-vue'

interface ExpenditureItem {
  id: number
  category: string
  categoryColor: string
  description: string
  applicant: string
  date: string
  amount: number
  status: string
}

const expenditures = ref<ExpenditureItem[]>([
  {
    id: 1,
    category: 'equipment',
    categoryColor: '#b31b1b',
    description: '服务器设备采购',
    applicant: '张教授',
    date: '2024-03-15',
    amount: 50000,
    status: 'approved',
  },
  {
    id: 2,
    category: 'travel',
    categoryColor: '#fa8c16',
    description: '学术会议差旅费',
    applicant: '李博士',
    date: '2024-03-12',
    amount: 12000,
    status: 'paid',
  },
  {
    id: 3,
    category: 'material',
    categoryColor: '#52c41a',
    description: '实验材料采购',
    applicant: '王研究员',
    date: '2024-03-10',
    amount: 8000,
    status: 'submitted',
  },
  {
    id: 4,
    category: 'labor',
    categoryColor: '#eb2f96',
    description: '研究生劳务费',
    applicant: '赵助理',
    date: '2024-03-08',
    amount: 6000,
    status: 'approved',
  },
])

const getCategoryShortName = (category: string) => {
  const shortMap: Record<string, string> = {
    equipment: '设备',
    material: '材料',
    travel: '差旅',
    labor: '劳务',
    conference: '会议',
    publish: '出版',
  }
  return shortMap[category] || '其他'
}

const formatCurrency = (amount: number) => {
  return `¥${amount.toLocaleString()}`
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const getStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    draft: 'info',
    submitted: 'warning',
    approved: 'success',
    paid: '',
    rejected: 'danger',
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    draft: '草稿',
    submitted: '待审批',
    approved: '已批准',
    paid: '已支付',
    rejected: '已拒绝',
  }
  return textMap[status] || status
}

const viewDetail = (item: ExpenditureItem) => {
  console.log('查看支出详情:', item)
}
</script>

<style scoped>
.recent-expenditures-list {
  width: 100%;
}

.empty-state {
  padding: 40px 0;
}

.expenditures-table {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.expenditure-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  gap: 16px;
}

.expenditure-item:hover {
  background: rgba(179,27,27,0.04);
  transform: translateX(4px);
}

.item-category {
  flex-shrink: 0;
}

.category-badge {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #666;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.item-amount {
  text-align: right;
  min-width: 120px;
}

.amount-value {
  font-size: 16px;
  font-weight: bold;
  color: #2c3e50;
  display: block;
  margin-bottom: 4px;
}

.item-status {
  display: inline-block;
}
</style>
