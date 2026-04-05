<template>
  <div class="budget-pie-chart">
    <div v-if="loading" class="chart-loading">
      <el-skeleton :rows="3" animated />
    </div>
    <div v-else-if="!data || data.length === 0" class="chart-empty">
      <el-empty description="暂无预算数据" />
    </div>
    <div v-else ref="chartRef" class="chart-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps<{
  data: any[]
  loading?: boolean
}>()

const chartRef = ref()
let chartInstance: echarts.ECharts | null = null

const initChart = () => {
  if (!chartRef.value) return

  chartInstance = echarts.init(chartRef.value)

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: ¥{c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      formatter: (name: string) => {
        const item = props.data.find((d) => d.name === name)
        return `${name} - ¥${item?.value?.toLocaleString()} (${item?.percentage || 0}%)`
      },
    },
    series: [
      {
        name: '预算分配',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        data: props.data.map((item) => ({
          name: item.name,
          value: item.value,
          used: item.used,
          percentage: item.percentage,
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        label: {
          show: false,
        },
      },
    ],
  }

  chartInstance.setOption(option)
}

watch(
  () => props.data,
  () => {
    nextTick(() => {
      if (chartInstance) {
        initChart()
      }
    })
  },
  { deep: true },
)

onMounted(() => {
  if (!props.loading && props.data && props.data.length > 0) {
    initChart()
  }
})

// 响应式调整
const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

window.addEventListener('resize', handleResize)

onMounted(() => {
  window.addEventListener('resize', handleResize)
})
</script>
