<!-- src/views/NewsList.vue -->
<template>
  <div class="news-list-container">
    <div class="news-list-landing">
      <HomeHeader />

      <div class="list-body">
        <div class="list-card">
          <div class="list-card-head">
            <span class="list-card-icon" aria-hidden="true">
              <el-icon :size="20"><Bell /></el-icon>
            </span>
            <div>
              <h2 class="list-card-title">新闻公告</h2>
              <p class="list-card-desc">平台最新动态与通知</p>
            </div>
          </div>

          <div v-if="loading" class="list-loading">
            <el-skeleton :rows="6" animated />
          </div>

          <div v-else-if="newsList.length > 0" class="news-list">
            <div
              v-for="item in newsList"
              :key="item.id"
              class="news-row"
              :class="{ 'is-top': item.is_top === 'yes' }"
              @click="goDetail(item.id)"
            >
              <div class="news-row-main">
                <h3 class="news-row-title">
                  <el-tag
                    v-if="item.is_top === 'yes'"
                    type="danger"
                    size="small"
                    effect="dark"
                    style="margin-right: 8px"
                  >置顶</el-tag>
                  {{ item.title }}
                </h3>
                <p class="news-row-summary">{{ item.summary }}</p>
                <div class="news-row-meta">
                  <span>{{ formatDate(item.published_at) }}</span>
                  <span>浏览量 {{ item.view_count || 0 }}</span>
                </div>
              </div>
              <el-icon class="news-row-arrow"><ArrowRight /></el-icon>
            </div>
          </div>

          <div v-else class="list-empty">
            <el-empty description="暂无新闻公告" />
          </div>

          <div v-if="total > pageSize" class="list-pagination">
            <el-pagination
              v-model:current-page="page"
              v-model:page-size="pageSize"
              :total="total"
              layout="prev, pager, next"
              @current-change="loadList"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { Bell, ArrowRight } from '@element-plus/icons-vue'
import { getApiBaseUrl } from '@/utils/request'
import HomeHeader from '@/components/HomeHeader.vue'

const router = useRouter()
const loading = ref(false)
const newsList = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

function goDetail(id: string) {
  router.push(`/news/${id}`)
}

function formatDate(d: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('zh-CN')
}

async function loadList() {
  loading.value = true
  try {
    const res = await axios.get(`${getApiBaseUrl()}/home/news-list`, {
      params: { page: page.value, pageSize: pageSize.value },
    })
    if (res.data?.success && res.data?.data) {
      newsList.value = res.data.data.list || []
      total.value = res.data.data.total || 0
    }
  } catch (e) {
    console.error('加载新闻列表失败', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.news-list-container {
  position: relative;
  width: 100%;
  min-height: 100vh;
  background-color: #722f37;
}

.news-list-landing {
  /* 与 HomePage .home-landing 同一套字号变量，顶栏与主区域与首页切换时对齐一致 */
  --el-font-size-extra-large: 24px;
  --el-font-size-large: 22px;
  --el-font-size-medium: 20px;
  --el-font-size-base: 18px;
  --el-font-size-small: 15px;
  --el-font-size-extra-small: 14px;
  --el-font-line-height-primary: 29px;

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

.list-body {
  flex: 1;
}

.list-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 12px 40px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.list-card-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0 0 20px 0;
  padding: 0 0 14px 14px;
  border-left: 3px solid #b31b1b;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.list-card-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  margin-top: 1px;
  color: #b31b1b;
}

.list-card-title {
  margin: 0;
  font-family: 'STZhongsong', '华文中宋', 'SimSun', serif;
  font-size: 20px;
  font-weight: 700;
  color: #1f1f1f;
  line-height: 1.3;
  letter-spacing: 0.02em;
}

.list-card-desc {
  margin: 4px 0 0;
  font-size: 14px;
  color: #737373;
  line-height: 1.4;
}

.news-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.news-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: #fafafa;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.2s;
}

.news-row:hover {
  background: #fff;
  border-color: rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.news-row.is-top {
  border-left: 3px solid #b31b1b;
}

.news-row-main {
  flex: 1;
  min-width: 0;
}

.news-row-title {
  margin: 0 0 6px;
  font-family: 'STZhongsong', '华文中宋', 'SimSun', serif;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a2e;
  line-height: 1.4;
}

.news-row-summary {
  margin: 0 0 8px;
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.news-row-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #909399;
}

.news-row-arrow {
  color: #c0c4cc;
  flex-shrink: 0;
  margin-left: 12px;
}

.list-empty,
.list-loading {
  padding: 40px 0;
}

.list-pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
</style>
