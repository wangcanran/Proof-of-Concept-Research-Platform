<!-- 收据/凭证管理：占位页，保证路由与构建可用，后续可接入真实业务 -->
<template>
  <div class="receipt-management assistant-ruc-theme">
    <div class="page-header">
      <el-button text type="primary" class="back-btn" @click="goBack">
        <el-icon class="back-icon"><ArrowLeft /></el-icon>
        返回工作台
      </el-button>
      <h1 class="page-title">收据与凭证管理</h1>
      <p class="page-desc">
        此页面为预留入口。后续可在此接入票据上传、核对与归档等流程。
      </p>
    </div>
    <el-card shadow="never" class="placeholder-card">
      <el-empty description="功能开发中" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'

const router = useRouter()

function goBack() {
  router.push('/applicant/dashboard')
}
</script>

<style scoped>
.receipt-management {
  padding: 8px 0 24px;
  max-width: 960px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 20px;
}

.back-btn {
  padding-left: 0;
}

.back-icon {
  margin-right: 4px;
}

.page-title {
  margin: 12px 0 8px;
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}

.page-desc {
  margin: 0;
  font-size: 14px;
  color: #909399;
  line-height: 1.5;
}

.placeholder-card {
  border-radius: 12px;
}
</style>
