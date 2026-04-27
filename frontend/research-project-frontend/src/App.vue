<template>
  <div id="app">
    <!-- 显示当前路由对应的组件 -->
    <router-view />
  </div>
</template>

<script setup lang="ts">
</script>

<style>
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif;
  font-size: 16px;
  line-height: 1.55;
  color: #303133;
  background-color: #f5f7fa;
}

#app {
  min-height: 100vh;
}
</style>