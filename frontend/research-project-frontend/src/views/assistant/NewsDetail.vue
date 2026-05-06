<!-- src/views/assistant/NewsDetail.vue -->
<template>
  <!-- 公共查看模式：首页风格 -->
  <div v-if="isPublic" class="news-detail-public">
    <div class="news-detail-landing">
      <HomeHeader />

      <div class="detail-body">
        <div class="detail-card">
          <div class="detail-back">
            <el-button class="back-btn" @click="goBack">
              <el-icon><ArrowLeft /></el-icon> 返回
            </el-button>
          </div>

          <div v-if="loading" class="detail-loading">
            <el-skeleton :rows="10" animated />
          </div>
          <div v-else-if="news" class="detail-content-wrap">
            <h1 class="detail-title">{{ news.title }}</h1>
            <div class="detail-meta">
              <span v-if="news.author_name">作者：{{ news.author_name }}</span>
              <span v-if="news.published_at">发布时间：{{ formatDate(news.published_at) }}</span>
              <span>浏览量：{{ news.view_count || 0 }}</span>
              <el-tag v-if="news.is_top === 'yes'" type="danger" size="small">置顶</el-tag>
            </div>
            <div v-if="news.summary" class="detail-summary">
              <div class="summary-box">{{ news.summary }}</div>
            </div>
            <!-- 与 WangEditor 外层结构一致并引入其 css，否则正文片段会失去对齐、表格样式等 -->
            <div class="detail-content news-rich-html w-e-text-container">
              <div class="w-e-scroll">
                <div data-slate-editor v-html="news.content"></div>
              </div>
            </div>
          </div>
          <div v-else class="detail-empty">
            <el-empty description="新闻不存在或已被删除" />
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 后台查看模式：简洁白色卡片风格 -->
  <div v-else class="news-detail-page">
    <div class="detail-header">
      <el-button class="back-btn" @click="goBack">
        <el-icon><ArrowLeft /></el-icon> {{ backText }}
      </el-button>
    </div>

    <div v-if="loading" class="detail-loading">
      <el-skeleton :rows="10" animated />
    </div>
    <div v-else-if="news" class="detail-body">
      <h1 class="detail-title">{{ news.title }}</h1>
      <div class="detail-meta">
        <span v-if="news.author_name">作者：{{ news.author_name }}</span>
        <span v-if="news.published_at">发布时间：{{ formatDate(news.published_at) }}</span>
        <span>浏览量：{{ news.view_count || 0 }}</span>
        <el-tag v-if="news.is_top === 'yes'" type="danger" size="small">置顶</el-tag>
      </div>
      <div v-if="news.summary" class="detail-summary">
        <div class="summary-box">{{ news.summary }}</div>
      </div>
      <div class="detail-content news-rich-html w-e-text-container">
        <div class="w-e-scroll">
          <div data-slate-editor v-html="news.content"></div>
        </div>
      </div>
    </div>
    <div v-else class="detail-empty">
      <el-empty description="新闻不存在或已被删除" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import request from '@/utils/request'
import axios from 'axios'
import { getApiBaseUrl } from '@/utils/request'
import HomeHeader from '@/components/HomeHeader.vue'
/** 与编辑页一致，保证序列化 HTML（段落对齐、表格等）在阅读页生效 */
import '@wangeditor/editor/dist/css/style.css'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const news = ref<any>(null)

const isPublic = computed(() => !route.path.startsWith('/assistant'))

const backText = computed(() => (isPublic.value ? '返回' : '返回列表'))

function goBack() {
  if (isPublic.value) {
    router.push('/news-list')
  } else {
    router.push('/assistant/news')
  }
}

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function loadNews() {
  const id = route.params.id as string
  if (!id) return
  loading.value = true
  try {
    let res: any
    if (isPublic.value) {
      const resp = await axios.get(`${getApiBaseUrl()}/home/news/${id}`)
      res = resp.data
    } else {
      res = await request.get(`/api/news/${id}`)
    }
    if (res.success && res.data) {
      news.value = res.data
    } else {
      ElMessage.error(res.error || '加载失败')
    }
  } catch (e) {
    console.error('加载新闻详情失败', e)
    ElMessage.error('加载新闻详情失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadNews()
})
</script>

<style scoped>
/* ========== 公共查看模式（首页风格） ========== */
.news-detail-public {
  position: relative;
  width: 100%;
  min-height: 100vh;
  background-color: #722f37;
}

.news-detail-landing {
  position: relative;
  z-index: 1;
  max-width: 1320px;
  margin: 0 auto;
  min-height: 100vh;
  padding: clamp(16px, 3vw, 28px);
  display: flex;
  flex-direction: column;
  gap: clamp(16px, 2.5vw, 24px);
  box-sizing: border-box;
}

.detail-body {
  flex: 1;
}

.detail-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 12px 40px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.detail-back {
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid #f0f0f0;
}

/* ========== 后台查看模式（简洁风格） ========== */
.news-detail-page {
  max-width: 1300px;
  margin: 0 auto;
  padding: 24px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.news-detail-page .detail-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

/* 返回按钮（与管理界面保持一致） */
.back-btn {
  padding: 8px 16px;
  color: #b31b1b;
  border-color: #b31b1b;
}
.back-btn:hover {
  color: #fff;
  background: #b31b1b;
  border-color: #b31b1b;
}

/* ========== 公共样式 ========== */
.detail-title {
  font-size: 26px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 16px;
  line-height: 1.4;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  color: #909399;
  font-size: 14px;
  margin-bottom: 20px;
}

.detail-summary {
  margin-bottom: 24px;
}

.summary-box {
  padding: 14px 18px;
  background: #f5f7fa;
  border-radius: 6px;
  color: #606266;
  font-size: 15px;
  line-height: 1.6;
  border-left: 3px solid #b31b1b;
}

.detail-content {
  font-size: 16px;
  line-height: 1.8;
  color: #303133;
}

/* 阅读页：编辑器外壳在 Wang CSS 里默认 height:100%，此处改为随正文增高 */
.news-rich-html.w-e-text-container {
  height: auto !important;
}

.news-rich-html :deep(.w-e-scroll) {
  height: auto !important;
  overflow: visible !important;
}

.news-rich-html :deep([data-slate-editor]) {
  min-height: 0 !important;
  border-top: none !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
}

.detail-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  display: block;
  margin: 12px 0;
}

.detail-content :deep(video) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  display: block;
  margin: 12px 0;
}

.detail-content :deep(audio) {
  width: 100%;
  margin: 12px 0;
  display: block;
}

.detail-loading {
  padding: 40px 0;
}

.detail-empty {
  padding: 60px 0;
}
</style>
