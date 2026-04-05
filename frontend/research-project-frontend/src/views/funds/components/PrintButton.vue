<!-- src/views/funds/components/PrintButton.vue -->
<template>
  <el-button :icon="Printer" @click="handlePrint" :loading="printing" size="small">
    {{ text }}
  </el-button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Printer } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  title?: string
  contentSelector?: string
  text?: string
  customContent?: () => Promise<string>
}>()

const printing = ref(false)

const handlePrint = async () => {
  printing.value = true
  try {
    let printContent = ''

    if (props.customContent) {
      printContent = await props.customContent()
    } else if (props.contentSelector) {
      const element = document.querySelector(props.contentSelector)
      if (element) {
        printContent = element.outerHTML
      }
    } else {
      // 默认打印整个页面
      printContent = document.body.outerHTML
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      ElMessage.error('无法打开打印窗口，请检查浏览器设置')
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${props.title || '打印页面'}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            padding: 20px;
            background: white;
            color: #2c3e50;
            font-size: 14px;
          }
          .print-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #1890ff;
          }
          .print-header h1 {
            font-size: 24px;
            margin-bottom: 10px;
          }
          .print-header .print-date {
            color: #666;
            font-size: 12px;
            margin-top: 10px;
          }
          .stats-cards {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 24px;
          }
          .stat-card {
            background: #f5f7fa;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
          }
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #1890ff;
            margin-bottom: 4px;
          }
          .stat-label {
            font-size: 12px;
            color: #666;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
          }
          th, td {
            border: 1px solid #e8e8e8;
            padding: 8px 12px;
            text-align: left;
          }
          th {
            background: #f5f7fa;
            font-weight: 500;
          }
          .budget-item, .expenditure-item {
            margin-bottom: 16px;
            padding: 12px;
            border: 1px solid #e8e8e8;
            border-radius: 6px;
          }
          .budget-name, .expenditure-title {
            font-weight: 500;
            margin-bottom: 8px;
          }
          .budget-numbers, .expenditure-meta {
            display: flex;
            gap: 16px;
            font-size: 12px;
            color: #666;
          }
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
        ${getPrintStyles()}
      </head>
      <body>
        <div class="print-header">
          <h1>${props.title || '经费管理报告'}</h1>
          <div class="print-date">打印时间：${new Date().toLocaleString('zh-CN')}</div>
        </div>
        <div class="print-content">
          ${printContent}
        </div>
      </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.print()
    }
  } catch (error) {
    console.error('打印失败:', error)
    ElMessage.error('打印失败')
  } finally {
    printing.value = false
  }
}

const getPrintStyles = () => {
  return `
    @media print {
      .no-print {
        display: none !important;
      }
      .el-button,
      .header-actions,
      .filter-section,
      .batch-actions,
      .pagination-section,
      .back-btn,
      .action-bar {
        display: none !important;
      }
    }
  `
}
</script>
