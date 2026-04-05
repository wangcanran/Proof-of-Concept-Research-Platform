<!-- src/components/funds/ExpenditureTrendChart.vue -->
<template>
  <div class="expenditure-trend-chart">
    <div class="chart-header">
      <h3>支出趋势</h3>
      <div class="chart-actions">
        <el-button-group size="small">
          <el-button
            :type="viewType === 'month' ? 'primary' : 'default'"
            @click="viewType = 'month'"
          >
            月度
          </el-button>
          <el-button
            :type="viewType === 'quarter' ? 'primary' : 'default'"
            @click="viewType = 'quarter'"
          >
            季度
          </el-button>
          <el-button :type="viewType === 'year' ? 'primary' : 'default'" @click="viewType = 'year'">
            年度
          </el-button>
        </el-button-group>
      </div>
    </div>

    <div class="chart-container">
      <!-- 模拟折线图 -->
      <div class="mock-line-chart">
        <div class="chart-grid">
          <div v-for="i in 6" :key="i" class="grid-line"></div>
        </div>

        <div class="chart-data">
          <div
            v-for="(point, index) in trendData"
            :key="index"
            class="data-point"
            :style="{
              left: `${(index / (trendData.length - 1)) * 100}%`,
              bottom: `${(point.value / maxValue) * 100}%`,
            }"
            :title="`${point.label}: ${formatCurrency(point.value)}`"
          >
            <div class="point-tooltip">{{ formatCurrency(point.value) }}</div>
          </div>

          <!-- 连接线 -->
          <svg class="line-path" width="100%" height="100%">
            <path
              :d="linePath"
              fill="none"
              stroke="#b31b1b"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </div>

        <div class="chart-labels">
          <div
            v-for="(point, index) in trendData"
            :key="index"
            class="label"
            :style="{ left: `${(index / (trendData.length - 1)) * 100}%` }"
          >
            {{ point.label }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface TrendDataItem {
  label: string
  value: number
}

interface Props {
  data?: TrendDataItem[]
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
})

const viewType = ref('month')

// 模拟数据
const trendData = computed<TrendDataItem[]>(() => {
  if (props.data.length > 0) return props.data

  const labels =
    viewType.value === 'month'
      ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
      : viewType.value === 'quarter'
        ? ['Q1', 'Q2', 'Q3', 'Q4']
        : ['2020', '2021', '2022', '2023', '2024']

  return labels.map((label, index) => ({
    label,
    value: Math.floor(Math.random() * 100000) + 20000,
  }))
})

const maxValue = computed(() => {
  return Math.max(...trendData.value.map((item) => item.value))
})

const linePath = computed(() => {
  const points = trendData.value.map((point, index) => {
    const x = (index / (trendData.value.length - 1)) * 100
    const y = 100 - (point.value / maxValue.value) * 100
    return `${x}% ${y}%`
  })

  return `M ${points.join(' L ')}`
})

const formatCurrency = (amount: number) => {
  return `¥${amount.toLocaleString()}`
}
</script>

<style scoped>
.expenditure-trend-chart {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-header h3 {
  margin: 0;
  font-size: 16px;
  color: #2c3e50;
}

.chart-container {
  flex: 1;
  position: relative;
}

.mock-line-chart {
  width: 100%;
  height: 300px;
  position: relative;
}

.chart-grid {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 40px; /* 留出标签空间 */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.grid-line {
  border-top: 1px solid #f0f0f0;
}

.chart-data {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 40px;
}

.data-point {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #b31b1b;
  border: 2px solid white;
  border-radius: 50%;
  transform: translate(-50%, 50%);
  cursor: pointer;
  transition: all 0.3s;
}

.data-point:hover {
  width: 12px;
  height: 12px;
  z-index: 10;
}

.data-point:hover .point-tooltip {
  display: block;
}

.point-tooltip {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  display: none;
}

.point-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: rgba(0, 0, 0, 0.8);
}

.line-path {
  position: absolute;
  top: 0;
  left: 0;
}

.chart-labels {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  display: flex;
  justify-content: space-between;
}

.label {
  position: absolute;
  transform: translateX(-50%);
  font-size: 12px;
  color: #666;
  text-align: center;
  min-width: 40px;
}
</style>
