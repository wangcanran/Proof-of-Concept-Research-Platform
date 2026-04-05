<!-- src/components/funds/StatCard.vue -->
<template>
  <el-card class="stat-card" :class="status" shadow="hover">
    <div v-if="loading" class="stat-loading">
      <el-skeleton :rows="2" animated />
    </div>
    <div v-else class="stat-content">
      <div class="stat-icon">{{ icon }}</div>
      <div class="stat-text">
        <div class="stat-title">{{ title }}</div>
        <div class="stat-value">{{ value }}</div>
        <div v-if="percentage !== undefined" class="stat-percentage">{{ percentage }}%</div>
        <div v-if="trend" class="stat-trend">{{ trend }}</div>
        <div v-if="count !== undefined" class="stat-count">{{ count }} 项</div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
interface Props {
  title: string
  value: string
  icon: string
  status?: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'
  percentage?: number
  trend?: string
  count?: number
}

const props = withDefaults(defineProps<Props>(), {
  status: 'info',
  percentage: undefined,
  trend: undefined,
  count: undefined,
})
</script>

<style scoped>
.stat-card {
  height: 100%;
}

.stat-card-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.stat-icon.success {
  background: linear-gradient(135deg, #b7eb8f 0%, #52c41a 100%);
  color: white;
}

.stat-icon.warning {
  background: linear-gradient(135deg, #ffe58f 0%, #fa8c16 100%);
  color: white;
}

.stat-icon.danger {
  background: linear-gradient(135deg, #ffccc7 0%, #ff4d4f 100%);
  color: white;
}

.stat-icon.info {
  background: linear-gradient(135deg, rgba(179,27,27,0.3) 0%, #b31b1b 100%);
  color: white;
}

.stat-info {
  flex: 1;
}

.stat-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 8px;
}

.stat-percentage {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.percentage-value {
  font-size: 14px;
  font-weight: 500;
  color: #b31b1b;
}

.percentage-label {
  font-size: 12px;
  color: #999;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}

.trend-icon {
  font-size: 12px;
}

.trend-value {
  font-size: 12px;
  font-weight: 500;
}

.trend-value.positive {
  color: #52c41a;
}

.trend-value.negative {
  color: #ff4d4f;
}

.stat-count {
  margin-top: 4px;
}

.count-badge {
  display: inline-block;
  padding: 2px 8px;
  background: #f5f5f5;
  border-radius: 10px;
  font-size: 12px;
  color: #666;
}
</style>
