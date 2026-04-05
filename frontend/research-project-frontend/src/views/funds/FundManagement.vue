<!-- src/views/funds/FundManagement.vue - 导航框架 -->
<template>
  <div class="fund-management">
    <!-- 顶部导航菜单 -->
    <div class="fund-nav">
      <el-menu :default-active="activeMenu" mode="horizontal" @select="handleMenuSelect">
        <el-menu-item index="/funds/dashboard">
          <el-icon><PieChart /></el-icon>
          <span>经费仪表板</span>
        </el-menu-item>
        <el-menu-item index="/funds/overview">
          <el-icon><DataAnalysis /></el-icon>
          <span>经费概览</span>
        </el-menu-item>
        <el-menu-item index="/funds/budget">
          <el-icon><Money /></el-icon>
          <span>预算管理</span>
        </el-menu-item>
        <el-menu-item index="/funds/expenditures">
          <el-icon><CreditCard /></el-icon>
          <span>支出管理</span>
        </el-menu-item>
        <el-menu-item index="/funds/reimbursements">
          <el-icon><Document /></el-icon>
          <span>报销管理</span>
        </el-menu-item>
      </el-menu>
    </div>

    <!-- 内容区域 -->
    <div class="fund-content">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { PieChart, DataAnalysis, Money, CreditCard, Document } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

const activeMenu = computed(() => route.path)

const handleMenuSelect = (index: string) => {
  router.push(index)
}
</script>

<style scoped>
.fund-management {
  min-height: 100vh;
  background: #f5f7fa;
}

.fund-nav {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.fund-content {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}
</style>
