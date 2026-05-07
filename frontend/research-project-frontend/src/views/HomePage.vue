<template>
  <div class="home-container">
    <div class="home-landing">
      <!-- 顶栏：校徽 + 标题 + 操作 -->
      <header class="home-header">
        <div class="brand">
          <div class="brand-logo-wrap">
            <img
              :src="logoUrl"
              alt="中国人民大学校徽"
              class="brand-logo"
              @error="handleLogoError"
            />
          </div>
          <div class="brand-text">
            <h1 class="brand-title">中国人民大学</h1>
            <p class="brand-sub">图灵数智 · 概念验证平台</p>
            <p class="brand-en">Proof of Concept Research Platform · RUC</p>
          </div>
        </div>

        <div class="header-actions">
          <template v-if="!isLoggedIn">
            <button type="button" class="btn-ghost" @click="goToRegister">注册</button>
            <button type="button" class="btn-primary" @click="goToLogin">登录</button>
          </template>
          <template v-else>
            <span class="welcome-pill">您好，{{ userName }}</span>
            <button type="button" class="btn-primary" @click="goToDashboard">进入系统</button>
            <button type="button" class="btn-ghost" @click="handleLogout">退出</button>
          </template>
        </div>
      </header>

      <!-- 第一行：左轮播 | 右栏整列为公告 -->
      <div class="home-body">
        <section class="hero-visual" aria-label="平台展示">
          <div class="carousel-container">
            <div class="carousel-wrapper" :style="carouselStyle">
              <div v-for="(image, index) in carouselImages" :key="index" class="carousel-slide">
                <img
                  :src="image.src"
                  :alt="image.alt"
                  class="carousel-image"
                  :fetchpriority="index === 0 ? 'high' : undefined"
                  decoding="async"
                  @error="handleImageError"
                />
                <div class="carousel-caption">
                  <h3>{{ image.caption.title }}</h3>
                  <p>{{ image.caption.description }}</p>
                </div>
              </div>
            </div>

            <div class="carousel-dots">
              <span
                v-for="(_, index) in carouselImages"
                :key="index"
                class="dot"
                :class="{ active: currentIndex === index }"
                @click="goToSlide(index)"
              />
            </div>

            <button type="button" class="carousel-btn prev" aria-label="上一张" @click="prevSlide">
              <el-icon><ArrowLeft /></el-icon>
            </button>
            <button type="button" class="carousel-btn next" aria-label="下一张" @click="nextSlide">
              <el-icon><ArrowRight /></el-icon>
            </button>
          </div>
        </section>

        <aside class="home-notice-aside">
          <div class="side-card notice-card-block">
            <div class="side-card-head">
              <span class="side-card-icon" aria-hidden="true">
                <el-icon :size="20"><Bell /></el-icon>
              </span>
              <div>
                <h2 class="side-card-title">新闻公告</h2>
                <p class="side-card-desc">政策与通知摘要</p>
              </div>
              <el-button link size="small" class="notice-more-btn" @click="goNewsList">
                查看更多 <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>

            <ul v-if="displayNotices.length > 0" class="notice-compact-list">
              <li
                v-for="notice in displayNotices"
                :key="notice.id"
                class="notice-compact-item"
                @click="goNewsDetail(notice.id)"
              >
                <div class="notice-compact-main">
                  <div class="notice-compact-title">{{ notice.title }}</div>
                  <p v-if="notice.summary || notice.abstract" class="notice-compact-abs">{{ notice.summary || notice.abstract }}</p>
                </div>
                <time class="notice-compact-date">{{ formatNoticeDate(notice.published_at) }}</time>
              </li>
            </ul>
            <div v-else class="notice-compact-empty">
              <el-icon class="empty-ico-el" :size="44"><FolderOpened /></el-icon>
              <p>暂无公告</p>
            </div>
          </div>
        </aside>
      </div>

      <!-- 第二行：平台数据整行 -->
      <section class="home-stats-band" aria-label="平台数据">
        <div class="side-card stats-band-card">
          <div class="side-card-head">
            <span class="side-card-icon" aria-hidden="true">
              <el-icon :size="20"><DataAnalysis /></el-icon>
            </span>
            <div>
              <h2 class="side-card-title">平台数据</h2>
              <p class="side-card-desc">科研项目与资源概览</p>
            </div>
          </div>
          <div class="stats-grid-band">
            <div class="stat-pill">
              <span class="stat-pill-icon" aria-hidden="true">
                <el-icon :size="20"><Document /></el-icon>
              </span>
              <div class="stat-pill-body">
                <span class="stat-pill-num">{{ stats.totalProjects }}</span>
                <span class="stat-pill-label">累计项目</span>
              </div>
            </div>
            <div class="stat-pill">
              <span class="stat-pill-icon" aria-hidden="true">
                <el-icon :size="20"><CircleCheck /></el-icon>
              </span>
              <div class="stat-pill-body">
                <span class="stat-pill-num">{{ stats.approvedProjects }}</span>
                <span class="stat-pill-label">已批准</span>
              </div>
            </div>
            <div class="stat-pill">
              <span class="stat-pill-icon" aria-hidden="true">
                <el-icon :size="20"><TrendCharts /></el-icon>
              </span>
              <div class="stat-pill-body">
                <span class="stat-pill-num">{{ stats.incubatingProjects }}</span>
                <span class="stat-pill-label">孵化中</span>
              </div>
            </div>
            <div class="stat-pill">
              <span class="stat-pill-icon" aria-hidden="true">
                <el-icon :size="20"><UserFilled /></el-icon>
              </span>
              <div class="stat-pill-body">
                <span class="stat-pill-num">{{ stats.reviewerCount }}</span>
                <span class="stat-pill-label">评审专家</span>
              </div>
            </div>
            <div class="stat-pill">
              <span class="stat-pill-icon" aria-hidden="true">
                <el-icon :size="20"><Trophy /></el-icon>
              </span>
              <div class="stat-pill-body">
                <span class="stat-pill-num">{{ stats.achievementCount }}</span>
                <span class="stat-pill-label">登记成果</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 合作方展示：partners 配置 name / logo / url，有 url 时整块可点跳转 -->
      <section class="partners-section" aria-labelledby="partners-heading">
        <div class="partners-card">
          <header class="partners-head">
            <span class="partners-head-icon" aria-hidden="true">
              <el-icon :size="20"><OfficeBuilding /></el-icon>
            </span>
            <div>
              <h2 id="partners-heading" class="partners-title">合作单位</h2>
              <p class="partners-desc">支持机构与战略合作伙伴（点击 Logo 访问官网）</p>
            </div>
          </header>
          <ul class="partners-grid">
            <li v-for="p in partners" :key="p.id" class="partner-item">
              <a
                v-if="p.url"
                :href="p.url"
                class="partner-column partner-column--link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div class="partner-cell">
                  <div class="partner-inner">
                    <div class="partner-logo-slot">
                      <img
                        v-if="p.logo && !partnerImgFailed[p.id]"
                        :src="resolvePartnerAsset(p.logo)"
                        :alt="''"
                        class="partner-logo"
                        loading="lazy"
                        @error="partnerImgFailed[p.id] = true"
                      />
                      <div v-else class="partner-placeholder">
                        <el-icon class="partner-ph-icon" :size="28"><Picture /></el-icon>
                      </div>
                    </div>
                  </div>
                </div>
                <span class="partner-caption">{{ p.name }}</span>
              </a>
              <div v-else class="partner-column">
                <div class="partner-cell">
                  <div class="partner-inner">
                    <div class="partner-logo-slot">
                      <img
                        v-if="p.logo && !partnerImgFailed[p.id]"
                        :src="resolvePartnerAsset(p.logo)"
                        :alt="''"
                        class="partner-logo"
                        loading="lazy"
                        @error="partnerImgFailed[p.id] = true"
                      />
                      <div v-else class="partner-placeholder">
                        <el-icon class="partner-ph-icon" :size="28"><Picture /></el-icon>
                      </div>
                    </div>
                  </div>
                </div>
                <span class="partner-caption">{{ p.name }}</span>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <footer class="home-footer">
        <p>© 2026 中国人民大学图灵数智概念验证平台 · 科研项目管理系统</p>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getApiBaseUrl, getApiOrigin } from '@/utils/request'
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import {
  ArrowLeft,
  ArrowRight,
  DataAnalysis,
  Document,
  CircleCheck,
  TrendCharts,
  UserFilled,
  Trophy,
  Bell,
  FolderOpened,
  OfficeBuilding,
  Picture,
} from '@element-plus/icons-vue'

const router = useRouter()

// 登录状态
const isLoggedIn = ref(false)
const userName = ref('')

// 统计数据
const stats = ref({
  totalProjects: 0,
  approvedProjects: 0,
  incubatingProjects: 0,
  reviewerCount: 0,
  achievementCount: 0,
})

// 公告数据（首页仅展示部分）
const notices = ref<any[]>([])

/** 人大校徽（与构建工具路径解析一致） */
const logoUrl = new URL('./picture/university-logo.png', import.meta.url).href

const displayNotices = computed(() => notices.value.slice(0, 4))

interface HomePartner {
  id: string
  name: string
  logo?: string
  url?: string
}

const partners = ref<HomePartner[]>([
  {
    id: 'csig',
    name: '中国图形图像学学会',
    logo: new URL('./picture/CSIG-logo.png', import.meta.url).href,
    url: 'https://www.csig.org.cn/',
  },
  {
    id: 'cspruc',
    name: '中国人民大学文化科技园',
    logo: new URL('./picture/cspruc-logo.png', import.meta.url).href,
    url: 'http://www.cspruc.com/',
  },
  {
    id: 'golaxy',
    name: '中科天玑数据科技股份有限公司',
    logo: new URL('./picture/GoLaxy-logo.png', import.meta.url).href,
    url: 'https://www.golaxy.cn/',
  },
  {
    id: 'kingbase',
    name: '中电科金仓(北京)科技股份有限公司',
    logo: new URL('./picture/kingbase-logo.png', import.meta.url).href,
    url: 'https://www.kingbase.com.cn/',
  },
])

/** 某合作方 Logo 加载失败时回退到占位 */
const partnerImgFailed = reactive<Record<string, boolean>>({})

const resolvePartnerAsset = (logo: string) => {
  if (!logo) return ''
  if (/^https?:\/\//i.test(logo)) return logo
  return logo.startsWith('/') ? logo : `/${logo.replace(/^\//, '')}`
}

const categoryLabel = (cat: string) => {
  const map: Record<string, string> = {
    notice: '通知',
    news: '新闻',
    result: '成果',
    recruitment: '招募',
    other: '其他',
  }
  return map[cat] || cat
}

const formatNoticeDate = (dateStr: string) => {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('zh-CN')
  } catch {
    return dateStr
  }
}

const loadStats = async () => {
  try {
    const res = await axios.get(`${getApiBaseUrl()}/home/stats`)
    const payload = res.data
    if (payload?.success && payload?.data) {
      const d = payload.data
      stats.value.totalProjects = Number(d.totalProjects) || 0
      stats.value.approvedProjects = Number(d.approvedProjects) || 0
      stats.value.incubatingProjects = Number(d.incubatingProjects) || 0
      stats.value.reviewerCount = Number(d.reviewerCount) || 0
      stats.value.achievementCount = Number(d.achievementCount) || 0
    }
  } catch (e) {
    // 静默失败，保持默认值
  }
}

const loadNotices = async () => {
  try {
    const res = await axios.get(`${getApiBaseUrl()}/home/notices`)
    if (res.data?.data) {
      notices.value = Array.isArray(res.data.data) ? res.data.data : res.data.data.list || []
    }
  } catch (e) {
    // 静默失败
  }
}

const checkLoginStatus = () => {
  const token = localStorage.getItem('token')
  const userInfo = localStorage.getItem('userInfo')
  isLoggedIn.value = !!token
  if (userInfo) {
    try {
      const info = JSON.parse(userInfo)
      userName.value = info.name || info.username || '用户'
    } catch {
      userName.value = localStorage.getItem('userName') || '用户'
    }
  }
}

const goToDashboard = () => {
  const role = localStorage.getItem('userRole')
  const roleRouteMap: Record<string, string> = {
    applicant: '/applicant/dashboard',
    reviewer: '/reviewer/dashboard',
    project_manager: '/assistant/dashboard',
    admin: '/admin/dashboard',
  }
  router.push(roleRouteMap[role || ''] || '/applicant/dashboard')
}

const handleLogout = () => {
  localStorage.clear()
  sessionStorage.clear()
  isLoggedIn.value = false
  userName.value = ''
}

const currentIndex = ref(0)

const carouselImages = ref([
  {
    src: new URL('./picture/carousel-1.jpg', import.meta.url).href,
    alt: '概念验证平台',
    caption: {
      title: '概念验证平台',
      description: '助力科研成果转化',
    },
  },
  {
    src: new URL('./picture/carousel-2.jpg', import.meta.url).href,
    alt: '专家在线评审',
    caption: {
      title: '专家在线评审',
      description: '公平、公正、透明的评审机制',
    },
  },
  {
    src: new URL('./picture/carousel-3.jpg', import.meta.url).href,
    alt: '经费管理',
    caption: {
      title: '经费全程跟踪',
      description: '预算编制、支出申请、审核支付一体化',
    },
  },
  {
    src: new URL('./picture/carousel-4.jpg', import.meta.url).href,
    alt: '成果转化',
    caption: {
      title: '成果转化服务',
      description: '推动科研成果产业化',
    },
  },
])

/** 从后端加载轮播数据，如有则覆盖默认静态图片 */
const loadCarousel = async () => {
  try {
    const res = await axios.get(`${getApiBaseUrl()}/home/carousel`)
    if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
      const origin = getApiOrigin()
      carouselImages.value = res.data.data.map((item: any) => ({
        src: item.image_url?.startsWith('http') ? item.image_url : origin + item.image_url,
        alt: item.title || '',
        caption: {
          title: item.title || '',
          description: item.summary || '',
        },
      }))
    }
  } catch {
    // 静默失败，使用默认静态图片
  }
}

let carouselInterval: ReturnType<typeof setInterval> | null = null

// 修复：确保轮播图切换时完整显示
const carouselStyle = computed(() => ({
  transform: `translateX(-${currentIndex.value * 100}%)`,
  transition: 'transform 0.5s ease-in-out',
}))

const nextSlide = () => {
  // 先移动到下一张
  currentIndex.value = (currentIndex.value + 1) % carouselImages.value.length
}

const prevSlide = () => {
  // 先移动到上一张
  currentIndex.value =
    (currentIndex.value - 1 + carouselImages.value.length) % carouselImages.value.length
}

const goToSlide = (index: number) => {
  currentIndex.value = index
}

const startCarousel = () => {
  if (carouselInterval) clearInterval(carouselInterval)
  carouselInterval = setInterval(nextSlide, 5000)
}

const goToLogin = () => {
  router.push('/login')
}

const goToRegister = () => {
  router.push('/register')
}

const goNewsList = () => {
  router.push('/news-list')
}

const goNewsDetail = (id: string) => {
  router.push(`/news/${id}`)
}

const handleImageError = (e: Event) => {
  const img = e.target as HTMLImageElement
  img.src =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"%3E%3Crect width="800" height="500" fill="%23333"/%3E%3Ctext x="400" y="250" text-anchor="middle" dy=".3em" fill="white" font-size="24"%3E概念验证平台%3C/text%3E%3C/svg%3E'
}

const handleLogoError = (e: Event) => {
  const img = e.target as HTMLImageElement
  img.src =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="48" fill="%23b31b1b"/%3E%3Ctext x="50" y="56" text-anchor="middle" fill="white" font-size="22" font-weight="bold"%3E人大%3C/text%3E%3C/svg%3E'
}

onMounted(() => {
  checkLoginStatus()
  loadCarousel()
  startCarousel()
  loadStats()
  loadNotices()
})

onUnmounted(() => {
  if (carouselInterval) {
    clearInterval(carouselInterval)
  }
})
</script>

<style scoped>
/* 华文中宋字体变量 */
:root {
  --font-zhongsong: 'STZhongsong', '华文中宋', 'SimSun', serif;
}

/* 标题统一使用华文中宋 */
h1, h2, h3, h4 {
  font-family: 'STZhongsong', '华文中宋', 'SimSun', serif;
}

/* 按钮统一使用华文中宋 */
button {
  font-family: 'STZhongsong', '华文中宋', 'SimSun', serif;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 首页背景：酒红底；组件内强调色仍为人大红 */
.home-container {
  position: relative;
  width: 100%;
  min-height: 100vh;
  scroll-behavior: smooth;
  background-color: #722f37;
}

/* 单页一体化容器 — 仅首页在全局基础上再大一号（子元素继承以下变量） */
.home-landing {
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

/* 顶栏 */
.home-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 20px 12px 18px;
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 12px 40px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-left: 4px solid #b31b1b;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.brand-logo-wrap {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.05);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.brand-logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.brand-text {
  min-width: 0;
}

.brand-title {
  font-size: clamp(21px, 2.5vw, 28px);
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 2px;
  letter-spacing: 0.02em;
  line-height: 1.25;
}

.brand-sub {
  margin: 0;
  font-size: var(--el-font-size-small);
  color: #b31b1b;
  font-weight: 600;
  line-height: 1.3;
}

.brand-en {
  margin: 2px 0 0;
  font-size: 13px;
  color: #888;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1.3;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  font-family: 'STZhongsong', '华文中宋', 'SimSun', serif;
}

.welcome-pill {
  font-size: var(--el-font-size-small);
  color: #5c3d3d;
  padding: 6px 12px;
  background: #fff5f4;
  border: 1px solid rgba(179, 27, 27, 0.14);
  border-radius: 999px;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-primary,
.btn-ghost {
  font-family: inherit;
  padding: 10px 20px;
  font-size: var(--el-font-size-base);
  font-weight: 600;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border: none;
}

.btn-primary {
  background: #b31b1b;
  color: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.btn-primary:hover {
  transform: translateY(-1px);
  background: #9e1818;
  box-shadow: 0 4px 12px rgba(179, 27, 27, 0.28);
}

.btn-ghost {
  background: #fff;
  color: #b31b1b;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: none;
}

.btn-ghost:hover {
  background: #fff8f8;
  border-color: rgba(179, 27, 27, 0.35);
}

/* 第一行：左轮播 | 右栏整列公告（等高） */
.home-body {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 400px);
  grid-template-rows: 1fr;
  gap: clamp(16px, 2vw, 24px);
  align-items: stretch;
  flex: 1 1 auto;
  min-height: min(52vh, 440px);
  max-height: min(58vh, 540px);
  min-width: 0;
}

.hero-visual {
  border-radius: 0;
  overflow: hidden;
  background: #1a1a1a;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.04);
  min-height: 0;
  height: 100%;
  align-self: stretch;
}

.home-notice-aside {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
  align-self: stretch;
}

/* 第二行：平台数据通栏 */
.home-stats-band {
  width: 100%;
  flex-shrink: 0;
}

.stats-band-card {
  width: 100%;
}

.stats-grid-band {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

@media (max-width: 900px) {
  .stats-grid-band {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
  }

  .stats-grid-band .stat-pill {
    padding: 8px 10px;
    gap: 8px;
  }

  .stats-grid-band .stat-pill-icon {
    width: 32px;
    height: 32px;
  }
}

/* 窄屏仍保持一行：横向滑动查看六项 */
@media (max-width: 640px) {
  .stats-grid-band {
    display: flex;
    flex-wrap: nowrap;
    gap: 8px;
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 6px;
    margin-inline: -4px;
    padding-inline: 4px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
  }

  .stats-grid-band .stat-pill {
    flex: 0 0 auto;
    width: min(132px, 40vw);
    min-width: 108px;
    box-sizing: border-box;
  }
}

.side-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 16px 18px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 8px 32px rgba(0, 0, 0, 0.04);
}

.notice-card-block {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* 区块标题：左色条 + 白底，偏编辑排版风格 */
.side-card-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0 0 14px 0;
  padding: 0 0 12px 14px;
  border-left: 3px solid #b31b1b;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: transparent;
}

.notice-more-btn {
  margin-left: auto;
  align-self: center;
  color: #b31b1b;
}

.side-card-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  margin-top: 1px;
  color: #b31b1b;
}

.side-card-icon :deep(.el-icon) {
  color: #b31b1b;
}

.side-card-title {
  margin: 0;
  font-size: var(--el-font-size-medium);
  font-weight: 700;
  color: #1f1f1f;
  line-height: 1.3;
  letter-spacing: 0.02em;
}

.side-card-desc {
  margin: 4px 0 0;
  font-size: var(--el-font-size-extra-small);
  color: #737373;
  line-height: 1.4;
}

.stat-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    background 0.2s;
}

.stat-pill:hover {
  background: #fff;
  border-color: rgba(179, 27, 27, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.stat-pill-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(179, 27, 27, 0.06);
  color: #b31b1b;
}

.stat-pill-icon :deep(.el-icon) {
  color: #b31b1b;
}

.stat-pill-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-pill-num {
  font-size: var(--el-font-size-large);
  font-weight: 700;
  color: #b31b1b;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.stat-pill-label {
  font-size: var(--el-font-size-extra-small);
  color: #737373;
  margin-top: 2px;
}

.notice-compact-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.notice-compact-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 6px 10px;
  align-items: start;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.04);
  transition:
    background 0.2s,
    border-color 0.2s,
    box-shadow 0.2s;
  cursor: pointer;
}

.notice-compact-item:hover {
  background: #fff;
  border-color: rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.notice-compact-main {
  min-width: 0;
}

.notice-compact-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
}

.notice-compact-tag.notice {
  background: rgba(179, 27, 27, 0.1);
  color: #b31b1b;
}
.notice-compact-tag.news {
  background: #f6ffed;
  color: #389e0d;
}
.notice-compact-tag.result {
  background: #fff7e6;
  color: #d46b08;
}
.notice-compact-tag.recruitment {
  background: #fff0f6;
  color: #c41d7f;
}
.notice-compact-tag.other {
  background: #f5f5f5;
  color: #666;
}

.notice-compact-title {
  font-size: var(--el-font-size-small);
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.35;
}

.notice-compact-abs {
  margin: 4px 0 0;
  font-size: 12px;
  color: #888;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notice-compact-date {
  font-size: 11px;
  color: #bbb;
  white-space: nowrap;
  padding-top: 2px;
}

.notice-compact-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px 12px;
  color: #bbb;
  font-size: var(--el-font-size-small);
  min-height: 0;
}

.empty-ico-el {
  display: block;
  margin: 0 auto 10px;
  color: #d0d0d0;
}

/* 轮播图容器 */
.carousel-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.carousel-wrapper {
  display: flex;
  width: 100%;
  height: 100%;
  transition: transform 0.5s ease-in-out;
}

.carousel-slide {
  min-width: 100%;
  width: 100%;
  height: 100%;
  position: relative;
  flex-shrink: 0;
  flex-grow: 0;
}

/* 轮播图片：contain 避免 cover 对小图过度放大导致满屏马赛克；依赖 hero-visual 深色底衬 letterbox */
.carousel-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  display: block;
  box-sizing: border-box;
  border: 4px solid #fff;
  border-radius: 0;
}

/* 图片上的文字标题 */
.carousel-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.55);
  color: white;
  padding: 40px 30px 25px;
  text-align: center;
  z-index: 5;
}

.carousel-caption h3 {
  margin: 0 0 8px 0;
  font-size: var(--el-font-size-extra-large);
  font-weight: bold;
}

.carousel-caption p {
  margin: 0;
  font-size: var(--el-font-size-base);
  opacity: 0.9;
}

/* 轮播指示点 */
.carousel-dots {
  position: absolute;
  bottom: 15px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  z-index: 10;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.3s;
}

.dot.active {
  width: 22px;
  border-radius: 4px;
  background: #fff;
  box-shadow: 0 0 0 2px rgba(179, 27, 27, 0.45);
}

/* 轮播控制按钮 */
.carousel-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.35);
  color: white;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  font-size: var(--el-font-size-medium);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  z-index: 10;
}

.carousel-btn:hover {
  background: rgba(0, 0, 0, 0.6);
}

.carousel-btn :deep(.el-icon) {
  color: #fff;
}

.prev {
  left: 15px;
}

.next {
  right: 15px;
}

/* ===== 合作单位 ===== */
.partners-section {
  width: 100%;
  flex-shrink: 0;
}

.partners-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 18px 20px 20px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 8px 32px rgba(0, 0, 0, 0.04);
}

.partners-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0 0 16px 0;
  padding: 0 0 12px 14px;
  border-left: 3px solid #b31b1b;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: transparent;
}

.partners-head-icon {
  flex-shrink: 0;
  display: flex;
  color: #b31b1b;
  margin-top: 1px;
}

.partners-head-icon :deep(.el-icon) {
  color: #b31b1b;
}

.partners-title {
  margin: 0;
  font-size: var(--el-font-size-medium);
  font-weight: 700;
  color: #1f1f1f;
  line-height: 1.3;
  letter-spacing: 0.02em;
}

.partners-desc {
  margin: 4px 0 0;
  font-size: var(--el-font-size-extra-small);
  color: #737373;
  line-height: 1.4;
}

.partners-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  /* 四家合作单位：整行四等分均匀分布 */
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  align-items: stretch;
}

.partner-item {
  margin: 0;
  min-width: 0;
}

/* 整列：上为 Logo 框，下为名单独一行（不在虚线框内） */
.partner-column {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  height: 100%;
  min-width: 0;
}

.partner-column--link {
  cursor: pointer;
  text-decoration: none;
  color: inherit;
}

.partner-column--link:hover .partner-cell {
  border-color: rgba(179, 27, 27, 0.35);
  border-style: solid;
  background: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.partner-cell {
  display: block;
  border-radius: 10px;
  border: 1px dashed rgba(0, 0, 0, 0.1);
  background: #fafafa;
  transition:
    border-color 0.2s,
    background 0.2s,
    box-shadow 0.2s;
}

/* Logo 区域：宽度随栅格列变化，高度按比例跟著变，图片在剩余矩形内尽量放大且不变形 */
.partner-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 5 / 3;
  padding: clamp(8px, 1.8vw, 12px);
  box-sizing: border-box;
}

.partner-logo-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.partner-logo {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  vertical-align: middle;
}

.partner-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 4px;
}

.partner-ph-icon {
  color: rgba(179, 27, 27, 0.22);
}

.partner-caption {
  display: block;
  width: 100%;
  text-align: center;
  font-size: var(--el-font-size-extra-small);
  color: #454545;
  line-height: 1.35;
  padding: 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 页脚：深色底 + 顶侧人大红线，克制不抢眼 */
.home-footer {
  flex-shrink: 0;
  margin-top: auto;
  padding: 12px 16px;
  text-align: center;
  font-size: var(--el-font-size-extra-small);
  background: #2c2c2c;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-top: 3px solid #b31b1b;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.home-footer p {
  margin: 0;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.72);
  letter-spacing: 0.03em;
}

/* 中宽屏：右栏变窄 */
@media (max-width: 1180px) {
  .home-body {
    grid-template-columns: minmax(0, 1fr) minmax(260px, 320px);
  }
}

/* 平板：上下堆叠（取消单行等高限制，避免两栏合一列时行高计算异常） */
@media (max-width: 1024px) {
  .home-body {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
    max-height: none;
    min-height: 0;
  }

  .hero-visual {
    height: auto;
    max-height: 46vh;
    min-height: 260px;
  }

  .home-notice-aside {
    height: auto;
  }

  .notice-compact-list {
    max-height: min(42vh, 380px);
  }
}

@media (max-width: 768px) {
  .home-header {
    padding: 9px 12px 9px 11px;
    border-radius: 12px;
  }

  .brand-logo-wrap {
    width: 48px;
    height: 48px;
  }

  .brand-title {
    font-size: 21px;
  }

  .brand-sub {
    font-size: var(--el-font-size-small);
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .btn-primary,
  .btn-ghost {
    padding: 8px 16px;
    font-size: var(--el-font-size-small);
  }

  .carousel-caption {
    padding: 18px 14px 14px;
  }

  .carousel-caption h3 {
    font-size: var(--el-font-size-medium);
  }

  .carousel-caption p {
    font-size: var(--el-font-size-extra-small);
  }

  .carousel-btn {
    width: 30px;
    height: 30px;
    font-size: var(--el-font-size-small);
  }

  .side-card {
    padding: 14px 14px;
  }

  .side-card-head {
    margin: 0 0 12px 0;
    padding: 0 0 10px 12px;
  }

  .stat-pill-num {
    font-size: var(--el-font-size-medium);
  }

  .partners-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .home-landing {
    padding: 12px;
    gap: 12px;
  }

  .brand {
    flex-wrap: wrap;
  }

  .hero-visual {
    min-height: 200px;
    max-height: 38vh;
    border-radius: 0;
  }

  .notice-compact-item {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .notice-compact-date {
    justify-self: start;
  }

  .carousel-caption h3 {
    font-size: var(--el-font-size-base);
  }

  .carousel-caption p {
    font-size: var(--el-font-size-extra-small);
  }

  .partners-card {
    padding: 16px 14px;
  }

  .partners-head {
    margin: 0 0 14px 0;
    padding: 0 0 10px 12px;
  }

  .partners-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .partner-inner {
    padding: 10px 8px;
    aspect-ratio: 5 / 3;
  }

  .partner-column {
    gap: 8px;
  }
}
</style>
