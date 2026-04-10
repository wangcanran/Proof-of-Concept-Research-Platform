<!-- 科研助理 · 支出审核：占位页 -->
<template>
  <div class="assistant-expenditures assistant-ruc-theme">
    <div class="page-header">
      <h1 class="page-title">支出审核</h1>
      <p class="page-desc">
        此页面为预留入口，用于集中审核申请人提交的支出记录。后续可对接列表、筛选与审批操作。
      </p>
      <el-button @click="goDashboard">返回助理工作台</el-button>
    </div>
    <el-card shadow="never" class="placeholder-card">
      <el-empty description="功能开发中" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goDashboard() {
  router.push('/assistant/dashboard')
}
</script>

<style scoped>
.assistant-expenditures {
  max-width: 960px;
  margin: 0 auto;
  padding: 8px 0 24px;
}

.page-title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}

.page-desc {
  margin: 0 0 16px;
  font-size: 14px;
  color: #909399;
  line-height: 1.5;
}

.placeholder-card {
  border-radius: 12px;
}
</style>
