<template>
  <div class="database-test">
    <h1>数据库连接测试</h1>

    <div class="controls">
      <button @click="testConnection" :disabled="loading">
        {{ loading ? '测试中...' : '测试数据库连接' }}
      </button>
      <button @click="getProjects" :disabled="loading">获取项目列表</button>
      <button @click="createSampleProject" :disabled="loading">创建示例项目</button>
    </div>

    <div v-if="message" class="message" :class="{ error: isError }">
      {{ message }}
    </div>

    <div v-if="projects.length > 0" class="projects-list">
      <h3>项目列表 ({{ projects.length }})</h3>
      <div v-for="project in projects" :key="project.id" class="project-item">
        <h4>{{ project.title }}</h4>
        <p>{{ project.description }}</p>
        <small>状态: {{ project.status }} | 创建时间: {{ formatDate(project.created_at) }}</small>
      </div>
    </div>

    <div v-if="connectionResult" class="connection-result">
      <h3>连接测试结果</h3>
      <pre>{{ JSON.stringify(connectionResult, null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/api/index.js'

const loading = ref(false)
const message = ref('')
const isError = ref(false)
const projects = ref([])
const connectionResult = ref(null)

const testConnection = async () => {
  loading.value = true
  message.value = ''

  try {
    const result = await api.get('/api/db/test')
    connectionResult.value = result
    message.value = '✅ 数据库连接成功！'
    isError.value = false
    console.log('Database connection test:', result)
  } catch (error) {
    message.value = `❌ 数据库连接失败: ${error?.message ?? error}`
    isError.value = true
    console.error('Database connection error:', error)
  } finally {
    loading.value = false
  }
}

const getProjects = async () => {
  loading.value = true

  try {
    const res = await api.get('/api/projects')
    const list = Array.isArray(res?.data) ? res.data : []
    projects.value = list
    message.value = `✅ 成功获取 ${projects.value.length} 个项目`
    isError.value = false
  } catch (error) {
    message.value = `❌ 获取项目失败: ${error?.message ?? error}`
    isError.value = true
  } finally {
    loading.value = false
  }
}

const createSampleProject = async () => {
  loading.value = true

  try {
    const domainsRes = await api.get('/api/research-domains')
    const domains = domainsRes?.data ?? []
    const firstDomainId = domains[0]?.id
    if (!firstDomainId) {
      message.value = '❌ 未获取到研究领域，无法创建示例项目'
      isError.value = true
      return
    }

    await api.post('/api/projects', {
      title: `示例项目 ${new Date().toLocaleTimeString()}`,
      abstract: '这是一个通过前端创建的示例项目',
      research_domains: [firstDomainId],
    })
    message.value = '✅ 项目创建成功！'
    isError.value = false
    await getProjects()
  } catch (error) {
    const msg = error?.response?.data?.message || error?.response?.data?.error || error?.message
    message.value = `❌ 创建项目失败: ${msg ?? error}`
    isError.value = true
  } finally {
    loading.value = false
  }
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}
</script>

<style scoped>
.database-test {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.controls {
  margin: 20px 0;
  display: flex;
  gap: 10px;
}

.controls button {
  padding: 10px 20px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.controls button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.controls button:hover:not(:disabled) {
  background-color: #45a049;
}

.message {
  margin: 20px 0;
  padding: 15px;
  border-radius: 4px;
  background-color: #dff0d8;
  color: #3c763d;
}

.message.error {
  background-color: #f2dede;
  color: #a94442;
}

.projects-list {
  margin-top: 30px;
}

.project-item {
  border: 1px solid #ddd;
  padding: 15px;
  margin: 10px 0;
  border-radius: 4px;
}

.project-item h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.project-item p {
  margin: 0 0 10px 0;
  color: #666;
}

.project-item small {
  color: #999;
}

.connection-result {
  margin-top: 30px;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.connection-result pre {
  background-color: #333;
  color: #fff;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
}
</style>
