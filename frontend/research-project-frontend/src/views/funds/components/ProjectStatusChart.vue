<!-- src/views/funds/components/ProjectStatusChart.vue -->
<template>
  <div class="project-status-chart">
    <div v-if="loading" class="chart-loading">
      <el-skeleton :rows="3" animated />
    </div>
    <div v-else-if="!data || data.length === 0" class="chart-empty">
      <el-empty description="暂无项目数据" />
    </div>
    <div v-else class="chart-container">
      <div ref="chartRef" class="chart"></div>
      <div class="chart-legend">
        <div v-for="item in data" :key="item.status" class="legend-item">
          <span
            class="legend-color"
            :style="{ backgroundColor: getStatusColor(item.status) }"
          ></span>
          <span class="legend-label">{{ item.name }}</span>
          <span class="legend-value">{{ item.value }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as echarts from 'echarts'

interface Props {
  data: Array<{
    name: string
    value: number
    status: string
  }>
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  loading: false,
})

const chartRef = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null

// 获取状态颜色
const getStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    draft: '#8c8c8c',
    submitted: '#b31b1b',
    under_review: '#fa8c16',
    revision: '#fa8c16',
    batch_review: '#fa8c16',
    approved: '#52c41a',
    incubating: '#2f54eb',
    completed: '#52c41a',
    rejected: '#ff4d4f',
    terminated: '#ff4d4f',
  }
  return colorMap[status] || '#b31b1b'
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

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return

  if (chartInstance) {
    chartInstance.dispose()
  }

  chartInstance = echarts.init(chartRef.value)

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        return `${params.name}<br/>数量: ${params.value}<br/>占比: ${params.percent}%`
      },
    },
    legend: {
      show: false,
    },
    series: [
      {
        name: '项目状态',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}: {d}%',
          position: 'outside',
        },
        emphasis: {
          scale: true,
          label: {
            show: true,
            fontWeight: 'bold',
          },
        },
        data: props.data.map((item) => ({
          name: item.name,
          value: item.value,
          itemStyle: {
            color: getStatusColor(item.status),
          },
        })),
      },
    ],
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: 'center',
        style: {
          text: `${props.data.reduce((sum, item) => sum + item.value, 0)}`,
          fill: '#2c3e50',
          fontSize: 24,
          fontWeight: 'bold',
        },
        invisible: props.data.length === 0,
      },
      {
        type: 'text',
        left: 'center',
        top: 'center',
        style: {
          text: '项目总数',
          fill: '#7f8c8d',
          fontSize: 12,
          y: 30,
        },
        invisible: props.data.length === 0,
      },
    ],
  }

  chartInstance.setOption(option)

  // 响应窗口大小变化
  window.addEventListener('resize', handleResize)
}

// 更新图表数据
const updateChart = () => {
  if (!chartInstance) return

  const option = {
    series: [
      {
        data: props.data.map((item) => ({
          name: item.name,
          value: item.value,
          itemStyle: {
            color: getStatusColor(item.status),
          },
        })),
      },
    ],
    graphic: [
      {
        style: {
          text: `${props.data.reduce((sum, item) => sum + item.value, 0)}`,
        },
      },
    ],
  }

  chartInstance.setOption(option)
}

// 响应窗口大小变化
const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

// 监听数据变化
watch(
  () => props.data,
  () => {
    if (chartInstance) {
      updateChart()
    } else {
      initChart()
    }
  },
  { deep: true },
)

// 监听loading状态
watch(
  () => props.loading,
  (newVal) => {
    if (!newVal && chartInstance) {
      updateChart()
    }
  },
)

// 组件挂载
onMounted(() => {
  if (!props.loading && props.data.length > 0) {
    initChart()
  }
})

// 组件卸载
onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.project-status-chart {
  width: 100%;
  height: 100%;
  min-height: 300px;
}

.chart-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart {
  flex: 1;
  width: 100%;
  min-height: 250px;
}

.chart-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
  padding: 12px;
  border-top: 1px solid #f0f0f0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-label {
  color: #2c3e50;
}

.legend-value {
  color: #7f8c8d;
  font-weight: 500;
}

.chart-loading {
  padding: 20px;
}

.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
}
</style>
