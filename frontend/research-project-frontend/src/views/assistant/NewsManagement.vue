<!-- src/views/assistant/NewsManagement.vue -->
<template>
  <div class="news-management">
    <!-- 页面标题栏 -->
    <div class="page-header">
      <div class="header-left">
        <el-button class="back-btn" @click="goDashboard">
          <el-icon><ArrowLeft /></el-icon> 返回工作台
        </el-button>
        <h1 class="page-title">新闻公告管理</h1>
        <div class="page-description">管理平台新闻公告的创建、发布与轮播设置</div>
      </div>
      <div class="header-right">
        <el-button type="primary" class="ruc-btn-primary" @click="goCreate" :icon="Plus"> 新建新闻公告 </el-button>
      </div>
    </div>

    <!-- 筛选工具栏 -->
    <div class="filter-toolbar">
      <div class="filter-left">
        <el-input
          v-model="filters.keyword"
          placeholder="搜索标题或摘要"
          class="search-input"
          clearable
          @clear="loadList"
          @keyup.enter="loadList"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select
          v-model="filters.status"
          placeholder="状态筛选"
          clearable
          class="filter-select"
          @change="loadList"
        >
          <el-option label="全部" value="" />
          <el-option label="草稿" value="draft" />
          <el-option label="已发布" value="published" />
          <el-option label="已下架" value="offline" />
        </el-select>

        <el-button type="primary" class="ruc-btn-primary" @click="loadList" :icon="Search"> 搜索 </el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>
    </div>

    <!-- 新闻列表 -->
    <div class="list-view">
      <div class="table-container">
        <el-table :data="newsList" v-loading="loading" stripe style="width: 100%">
          <el-table-column prop="title" label="标题" min-width="220">
            <template #default="{ row }">
              <div class="news-title-cell">
                <span class="title-text" @click="goView(row.id)">{{ row.title }}</span>
                <el-tag v-if="row.is_top === 'yes'" type="danger" size="small" style="margin-left: 8px">置顶</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="summary" label="摘要" min-width="180" show-overflow-tooltip />
          <el-table-column prop="status" label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="author_name" label="作者" width="100" align="center" />
          <el-table-column prop="view_count" label="浏览量" width="80" align="center" />
          <el-table-column prop="published_at" label="发布时间" width="160" align="center">
            <template #default="{ row }">{{ formatDate(row.published_at) }}</template>
          </el-table-column>
          <el-table-column label="轮播" width="80" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.is_carousel === 'yes'" type="success" size="small">是</el-tag>
              <el-tag v-else type="info" size="small">否</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="260" align="center" fixed="right">
            <template #default="{ row }">
              <div class="action-btns">
                <el-button link type="info" size="small" @click="goView(row.id)">
                  <el-icon :size="12"><View /></el-icon> 查看
                </el-button>
                <el-button link type="primary" size="small" @click="goEdit(row.id)">编辑</el-button>
                <template v-if="row.status === 'draft'">
                  <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
                  <el-button link type="success" size="small" @click="handlePublish(row)">发布</el-button>
                </template>
                <template v-if="row.status === 'published'">
                  <el-button link type="warning" size="small" @click="handleOffline(row)">下架</el-button>
                  <el-button link type="primary" size="small" @click="openCarouselDialog(row)">轮播设置</el-button>
                </template>
                <template v-if="row.status === 'offline'">
                  <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
                  <el-button link type="success" size="small" @click="handlePublish(row)">发布</el-button>
                </template>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadList"
          @current-change="loadList"
        />
      </div>
    </div>

    <!-- 轮播设置弹窗 -->
    <el-dialog v-model="carouselDialogVisible" title="轮播设置" width="520px" destroy-on-close>
      <div class="carousel-dialog-body">
        <el-form label-width="100px">
          <el-form-item label="标题">
            <el-input :value="currentNews?.title" disabled />
          </el-form-item>
          <el-form-item label="首页轮播">
            <el-switch
              v-model="carouselSwitchEnabled"
              active-text="是"
              inactive-text="否"
              @change="onCarouselSwitchChange"
            />
          </el-form-item>
          <template v-if="carouselSwitchEnabled">
            <el-alert
              type="info"
              :closable="false"
              show-icon
              class="carousel-quality-tip"
              title="首页轮播区域较大（约半屏宽 × 一半视窗高），小图会被拉大显示，容易发糊。"
              description="请选用正文里上传的清晰横图，建议宽度不低于 1920px；若只在正文里拖得很小的配图，像素往往不够，请单独上传一张高清横幅后再选。"
            />
            <el-form-item label="图片选择">
              <div class="carousel-image-select">
                <div
                  v-for="img in currentNewsImages"
                  :key="img.id"
                  class="carousel-img-option"
                  :class="{ selected: selectedImageUrl === img.file_url }"
                  @click="selectedImageUrl = img.file_url"
                >
                  <img :src="getImageFullUrl(img.file_url)" alt="" />
                  <div class="check-overlay"><el-icon :size="24" color="#fff"><CircleCheck /></el-icon></div>
                </div>
                <div v-if="currentNewsImages.length === 0" class="no-images-tip">
                  该新闻暂无图片，请先在编辑器中上传图片
                </div>
              </div>
            </el-form-item>
          </template>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="carouselDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCarousel">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, CircleCheck, ArrowLeft, View } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { getApiOrigin } from '@/utils/request'

const router = useRouter()
const loading = ref(false)
const newsList = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = ref({ keyword: '', status: '' })

// 轮播对话框
const carouselDialogVisible = ref(false)
const currentNews = ref<any>(null)
const currentNewsImages = ref<any[]>([])
const selectedImageUrl = ref('')
const carouselSwitchEnabled = ref(false)
const currentCarouselId = ref('')

function statusLabel(s: string) {
  const m: Record<string, string> = { draft: '草稿', published: '已发布', offline: '已下架' }
  return m[s] || s
}
function statusType(s: string) {
  const m: Record<string, string> = { draft: 'info', published: 'success', offline: 'warning' }
  return m[s] || 'info'
}
function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function getImageFullUrl(url: string) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return getApiOrigin() + url
}

async function loadList() {
  loading.value = true
  try {
    const res = await request.get('/api/news', {
      params: {
        keyword: filters.value.keyword,
        status: filters.value.status,
        page: page.value,
        pageSize: pageSize.value,
      },
    })
    if (res.success && res.data) {
      newsList.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } catch (e) {
    console.error('加载新闻列表失败', e)
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.value = { keyword: '', status: '' }
  page.value = 1
  loadList()
}

function goCreate() {
  router.push('/assistant/news/create')
}
function goEdit(id: string) {
  router.push(`/assistant/news/${id}/edit`)
}
function goView(id: string) {
  router.push(`/assistant/news/${id}`)
}
function goDashboard() {
  router.push('/assistant/dashboard')
}

async function handlePublish(row: any) {
  try {
    await ElMessageBox.confirm(`确定发布「${row.title}」？发布后将显示在门户网站。`, '确认发布', { type: 'info' })
    const res = await request.put(`/api/news/${row.id}/publish`)
    if (res.success) { ElMessage.success('发布成功'); loadList() }
    else { ElMessage.error(res.error || '发布失败') }
  } catch { /* cancel */ }
}

async function handleOffline(row: any) {
  try {
    await ElMessageBox.confirm(`确定下架「${row.title}」？下架后门户网站将不再显示。`, '确认下架', { type: 'warning' })
    const res = await request.put(`/api/news/${row.id}/offline`)
    if (res.success) { ElMessage.success('下架成功'); loadList() }
    else { ElMessage.error(res.error || '下架失败') }
  } catch { /* cancel */ }
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.title}」？此操作不可恢复。`, '确认删除', { type: 'error' })
    const res = await request.delete(`/api/news/${row.id}`)
    if (res.success) { ElMessage.success('删除成功'); loadList() }
    else { ElMessage.error(res.error || '删除失败') }
  } catch { /* cancel */ }
}

async function openCarouselDialog(row: any) {
  currentNews.value = row
  selectedImageUrl.value = ''
  carouselSwitchEnabled.value = false
  currentCarouselId.value = ''

  // 获取新闻详情（含媒体和轮播配置）
  try {
    const res = await request.get(`/api/news/${row.id}`)
    if (res.success && res.data) {
      const images = (res.data.contentImages || []).length > 0
        ? res.data.contentImages
        : (res.data.media || []).filter((m: any) => m.file_type === 'image')
      currentNewsImages.value = images
      if (res.data.carousel) {
        currentCarouselId.value = res.data.carousel.id
        selectedImageUrl.value = res.data.carousel.image_url || ''
        carouselSwitchEnabled.value = true
      }
    }
  } catch (e) {
    console.error('获取新闻详情失败', e)
  }
  carouselDialogVisible.value = true
}

function onCarouselSwitchChange(val: boolean) {
  if (!val) {
    selectedImageUrl.value = ''
  }
}

async function saveCarousel() {
  if (!carouselSwitchEnabled.value) {
    // 关闭轮播：删除 CarouselConfig 记录
    if (currentCarouselId.value) {
      try {
        const res = await request.delete(`/api/carousel/${currentCarouselId.value}`)
        if (res.success) {
          ElMessage.success('已取消轮播')
          carouselDialogVisible.value = false
          loadList()
        } else {
          ElMessage.error(res.error || '取消轮播失败')
        }
      } catch (e) {
        console.error('取消轮播失败', e)
      }
    } else {
      carouselDialogVisible.value = false
    }
    return
  }

  // 开启轮播：必须选择图片
  if (!selectedImageUrl.value) {
    ElMessage.warning('请选择轮播图片')
    return
  }

  try {
    if (currentCarouselId.value) {
      // 更新
      const res = await request.put(`/api/carousel/${currentCarouselId.value}`, {
        image_url: selectedImageUrl.value,
      })
      if (res.success) { ElMessage.success('轮播设置已更新'); carouselDialogVisible.value = false; loadList() }
      else { ElMessage.error(res.error || '更新失败') }
    } else {
      // 新建
      const res = await request.post('/api/carousel', {
        news_id: currentNews.value.id,
        image_url: selectedImageUrl.value,
      })
      if (res.success) { ElMessage.success('轮播项已添加'); carouselDialogVisible.value = false; loadList() }
      else { ElMessage.error(res.error || '添加失败') }
    }
  } catch (e) {
    console.error('保存轮播设置失败', e)
  }
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.news-management {
  min-height: 0;
  max-width: 1300px;
  margin: 0 auto;
  --el-color-primary: #b31b1b;
}

/* 红色主按钮 */
.ruc-btn-primary {
  background: #b31b1b;
  border-color: #b31b1b;
}
.ruc-btn-primary:hover {
  background: #8a1515;
  border-color: #8a1515;
}

/* 页面标题栏 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.header-left {
  flex: 1;
}

.back-btn {
  margin-bottom: 12px;
  padding: 8px 16px;
  color: #b31b1b;
  border-color: #b31b1b;
}
.back-btn:hover {
  color: #fff;
  background: #b31b1b;
  border-color: #b31b1b;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

.page-description {
  margin: 0;
  color: #7f8c8d;
  font-size: 14px;
}

.header-right {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

/* 筛选工具栏 */
.filter-toolbar {
  background: white;
  padding: 16px 24px;
  border-radius: 12px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.filter-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  flex: 1;
}

.search-input {
  width: 260px;
}

.filter-select {
  width: 140px;
}

/* 列表视图 */
.list-view {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
}

.table-container {
  padding: 0;
}

.news-title-cell {
  display: flex;
  align-items: center;
}

.title-text {
  color: #b31b1b;
  cursor: pointer;
  font-weight: 500;
}

.title-text:hover {
  text-decoration: underline;
}

.action-btns {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px;
}

/* 分页 */
.pagination-container {
  background: white;
  padding: 20px;
  text-align: right;
  border-top: 1px solid #f0f0f0;
}

/* 轮播弹窗 */
.carousel-dialog-body {
  max-height: 460px;
  overflow-y: auto;
}

.carousel-quality-tip {
  margin-bottom: 12px;
}

.carousel-image-select {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.carousel-img-option {
  width: 120px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  position: relative;
  transition: border-color 0.2s;
}

.carousel-img-option:hover {
  border-color: #b31b1b;
}

.carousel-img-option.selected {
  border-color: #b31b1b;
}

.carousel-img-option img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.carousel-img-option .check-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.35);
  display: none;
  align-items: center;
  justify-content: center;
}

.carousel-img-option.selected .check-overlay {
  display: flex;
}

.no-images-tip {
  color: #909399;
  font-size: 13px;
  padding: 12px 0;
}
</style>
