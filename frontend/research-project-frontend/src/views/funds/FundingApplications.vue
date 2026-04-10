<!-- 经费申请列表：占位页，保证路由与构建可用 -->
<template>
  <div class="funding-applications">
    <div class="page-header">
      <h1 class="page-title">经费申请</h1>
      <p class="page-desc">
        此页面为预留入口，用于集中查看与管理经费申请记录。后续可对接列表、筛选与审批状态。
      </p>
      <div class="header-actions">
        <el-button type="primary" @click="goCreate">新建申请</el-button>
        <el-button @click="goDashboard">返回经费仪表板</el-button>
      </div>
    </div>
    <el-card shadow="never" class="placeholder-card">
      <el-empty description="功能开发中" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goCreate() {
  router.push('/funds/applications/create')
}

function goDashboard() {
  router.push('/funds/dashboard')
}
</script>

<style scoped>
.funding-applications {
  max-width: 960px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 20px;
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

.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.placeholder-card {
  border-radius: 12px;
}
</style>
