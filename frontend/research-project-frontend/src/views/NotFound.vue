<template>
  <div class="not-found">
    <div class="error-content">
      <div class="error-code">
        <h1>404</h1>
        <h2>页面未找到</h2>
      </div>
      
      <div class="error-message">
        <p>抱歉，您访问的页面不存在或已被移除</p>
        <p>请检查URL地址是否正确，或点击下方按钮返回</p>
      </div>
      
      <div class="error-actions">
        <el-button type="primary" @click="goHome" size="large">
          <el-icon><HomeFilled /></el-icon>
          返回首页
        </el-button>
        <el-button @click="goBack" size="large">
          <el-icon><ArrowLeft /></el-icon>
          返回上一页
        </el-button>
        <el-button type="info" @click="reloadPage" size="large">
          <el-icon><Refresh /></el-icon>
          刷新页面
        </el-button>
      </div>
      
      <div class="error-suggestions">
        <h3>您可能想要访问：</h3>
        <div class="suggestion-links">
          <el-link type="primary" @click="goToDashboard">仪表板</el-link>
          <el-divider direction="vertical" />
          <el-link type="primary" @click="goToProjects">项目管理</el-link>
          <el-divider direction="vertical" />
          <el-link type="primary" @click="goToLogin">重新登录</el-link>
        </div>
      </div>
    </div>
    
    <!-- 背景装饰 -->
    <div class="error-bg">
      <div class="bg-circle circle-1"></div>
      <div class="bg-circle circle-2"></div>
      <div class="bg-circle circle-3"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { HomeFilled, ArrowLeft, Refresh } from '@element-plus/icons-vue'

const router = useRouter()

const goHome = () => {
  router.push('/dashboard')
}

const goBack = () => {
  router.go(-1)
}

const reloadPage = () => {
  location.reload()
}

const goToDashboard = () => {
  router.push('/dashboard')
}

const goToProjects = () => {
  router.push('/projects/my')
}

const goToLogin = () => {
  router.push('/login')
}
</script>

<style scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  position: relative;
  overflow: hidden;
}

.error-content {
  text-align: center;
  z-index: 10;
  padding: 40px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  width: 90%;
}

.error-code h1 {
  font-size: 120px;
  font-weight: 800;
  color: #409eff;
  margin: 0;
  line-height: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.error-code h2 {
  font-size: 32px;
  font-weight: 600;
  color: #303133;
  margin: 20px 0;
}

.error-message {
  margin: 30px 0;
}

.error-message p {
  font-size: 16px;
  color: #606266;
  margin: 10px 0;
  line-height: 1.6;
}

.error-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin: 40px 0;
}

.error-actions .el-button {
  padding: 12px 24px;
  font-size: 16px;
}

.error-actions .el-icon {
  margin-right: 8px;
}

.error-suggestions {
  margin-top: 40px;
  padding-top: 30px;
  border-top: 1px solid #e4e7ed;
}

.error-suggestions h3 {
  font-size: 18px;
  color: #303133;
  margin-bottom: 20px;
}

.suggestion-links {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
}

/* 背景装饰 */
.error-bg {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 1;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
}

.circle-1 {
  width: 300px;
  height: 300px;
  top: -150px;
  right: -150px;
}

.circle-2 {
  width: 200px;
  height: 200px;
  bottom: -100px;
  left: -100px;
}

.circle-3 {
  width: 150px;
  height: 150px;
  bottom: 20%;
  right: 10%;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .error-code h1 {
    font-size: 80px;
  }
  
  .error-code h2 {
    font-size: 24px;
  }
  
  .error-actions {
    flex-direction: column;
    gap: 12px;
  }
  
  .suggestion-links {
    flex-direction: column;
    gap: 15px;
  }
  
  .suggestion-links .el-divider {
    display: none;
  }
}
</style>