<template>
  <div class="home-container">
    <!-- 首屏区块 -->
    <div class="hero-section">
    <!-- 左右两栏布局 -->
    <div class="content-wrapper">
      <!-- 左侧：登录/注册入口（宽度1/3） -->
      <div class="left-panel">
        <!-- 校徽放在左侧面板内部顶部 -->
        <div class="top-logo">
          <img
            src="/src/views/picture/university-logo.png"
            alt="人大校徽"
            class="logo"
            @error="handleLogoError"
          />
        </div>

        <!-- 未登录：显示登录/注册 -->
        <div v-if="!isLoggedIn" class="auth-buttons">
          <button class="auth-btn login-btn" @click="goToLogin">
            <span class="btn-icon">🔐</span>
            登录
          </button>
          <button class="auth-btn register-btn" @click="goToRegister">
            <span class="btn-icon">📝</span>
            注册
          </button>
        </div>

        <!-- 已登录：显示欢迎信息和进入系统按钮 -->
        <div v-else class="auth-buttons">
          <div class="welcome-text">欢迎回来，{{ userName }}</div>
          <button class="auth-btn login-btn" @click="goToDashboard">
            <span class="btn-icon">🚀</span>
            进入系统
          </button>
          <button class="auth-btn register-btn" @click="handleLogout">
            <span class="btn-icon">🚪</span>
            退出登录
          </button>
        </div>

        <div class="system-title">
          <h1>概念验证平台</h1>
          <p>Proof of Concept Platform</p>
        </div>
      </div>

      <!-- 右侧：轮播图（宽度2/3） -->
      <div class="right-panel">
        <div class="carousel-container">
          <div class="carousel-wrapper" :style="carouselStyle">
            <div v-for="(image, index) in carouselImages" :key="index" class="carousel-slide">
              <img
                :src="image.src"
                :alt="image.alt"
                class="carousel-image"
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
            ></span>
          </div>

          <button class="carousel-btn prev" @click="prevSlide">❮</button>
          <button class="carousel-btn next" @click="nextSlide">❯</button>
        </div>
      </div>
    </div>

    <!-- 向下滚动提示（在首屏内底部居中） -->
    <div class="scroll-hint" @click="scrollToStats">
      <span>了解更多</span>
      <div class="scroll-arrow">▼</div>
    </div>
    </div><!-- /hero-section -->

    <!-- 平台数据统计区 -->
    <div class="stats-section" ref="statsRef">
      <div class="section-header">
        <h2>平台数据总览</h2>
        <p>实时反映平台科研项目运营情况</p>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📋</div>
          <div class="stat-number">{{ stats.totalProjects }}</div>
          <div class="stat-label">累计项目数</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-number">{{ stats.approvedProjects }}</div>
          <div class="stat-label">已批准项目</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🔬</div>
          <div class="stat-number">{{ stats.incubatingProjects }}</div>
          <div class="stat-label">孵化中项目</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">👨‍🏫</div>
          <div class="stat-number">{{ stats.reviewerCount }}</div>
          <div class="stat-label">评审专家</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏆</div>
          <div class="stat-number">{{ stats.achievementCount }}</div>
          <div class="stat-label">登记成果</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-number">{{ stats.totalBudget }}</div>
          <div class="stat-label">累计批准经费（万元）</div>
        </div>
      </div>
    </div>

    <!-- 公告区 -->
    <div class="notice-section">
      <div class="notice-container">
        <div class="notice-header">
          <h2>平台公告</h2>
          <p>最新政策动态与通知公告</p>
        </div>
        <div class="notice-list" v-if="notices.length > 0">
          <div
            v-for="notice in notices"
            :key="notice.id"
            class="notice-item"
          >
            <div class="notice-tag" :class="notice.category">
              {{ categoryLabel(notice.category) }}
            </div>
            <div class="notice-content">
              <div class="notice-title">{{ notice.title }}</div>
              <div class="notice-abstract">{{ notice.abstract }}</div>
            </div>
            <div class="notice-date">{{ formatNoticeDate(notice.published_at) }}</div>
          </div>
        </div>
        <div class="notice-empty" v-else>
          <div class="empty-icon">📢</div>
          <p>暂无公告</p>
        </div>
      </div>
    </div>

    <!-- 页脚 -->
    <div class="home-footer">
      <p>© 2026 中国人民大学图灵数智概念验证平台 · 科研项目管理系统</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

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
  totalBudget: '0',
})

// 公告数据
const notices = ref<any[]>([])
const statsRef = ref<HTMLElement | null>(null)

const scrollToStats = () => {
  statsRef.value?.scrollIntoView({ behavior: 'smooth' })
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
    const [projectsRes, usersRes, achievementsRes] = await Promise.allSettled([
      axios.get('http://localhost:3002/api/projects'),
      axios.get('http://localhost:3002/api/users'),
      axios.get('http://localhost:3002/api/achievements'),
    ])

    if (projectsRes.status === 'fulfilled' && projectsRes.value.data?.data) {
      const projects = projectsRes.value.data.data
      stats.value.totalProjects = projects.length
      stats.value.approvedProjects = projects.filter((p: any) =>
        ['approved', 'incubating', 'completed'].includes(p.status)
      ).length
      stats.value.incubatingProjects = projects.filter((p: any) => p.status === 'incubating').length
      const total = projects.reduce((sum: number, p: any) => sum + (Number(p.approved_budget) || 0), 0)
      stats.value.totalBudget = (total / 10000).toFixed(0)
    }

    if (usersRes.status === 'fulfilled' && usersRes.value.data?.data) {
      const users = usersRes.value.data.data
      stats.value.reviewerCount = users.filter((u: any) => u.role === 'reviewer').length
    }

    if (achievementsRes.status === 'fulfilled' && achievementsRes.value.data?.data) {
      stats.value.achievementCount = achievementsRes.value.data.data.length
    }
  } catch (e) {
    // 静默失败，保持默认值
  }
}

const loadNotices = async () => {
  try {
    const res = await axios.get('http://localhost:3002/api/notices?status=published&limit=5')
    if (res.data?.data) {
      notices.value = res.data.data
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

const handleImageError = (e: Event) => {
  const img = e.target as HTMLImageElement
  img.src =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"%3E%3Crect width="800" height="500" fill="%23333"/%3E%3Ctext x="400" y="250" text-anchor="middle" dy=".3em" fill="white" font-size="24"%3E概念验证平台%3C/text%3E%3C/svg%3E'
}

onMounted(() => {
  checkLoginStatus()
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

.home-container {
  width: 100%;
  min-height: 100vh;
  overflow-y: auto;
  background: #f5f7fa;
  scroll-behavior: smooth;
}

/* 内容区域 - 首屏占满全屏 */
.content-wrapper {
  display: flex;
  width: 100%;
  height: 100vh;
}

/* 左侧面板 */
.left-panel {
  width: 25%;
  min-width: 220px;
  height: 100%;
  background: #b31b1b;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 24px 20px;
  position: relative;
  gap: 0;
}

/* 校徽：绝对定位在左侧面板内部左上角 */
.top-logo {
  position: absolute;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
}

.logo {
  width: 80px;
  height: 80px;
  object-fit: contain;
}

/* 右侧面板 */
.right-panel {
  flex: 1;
  height: 100%;
  background: #f5f5f5;
  position: relative;
  overflow: hidden;
}

.auth-buttons {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
  width: 100%;
}

.welcome-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  margin-bottom: 4px;
  text-align: center;
}

.auth-btn {
  padding: 10px 24px;
  font-size: 14px;
  font-weight: bold;
  border: 2px solid white;
  border-radius: 40px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 80%;
}

.login-btn {
  background: white;
  color: #b31b1b;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.register-btn {
  background: transparent;
  color: white;
}

.register-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
}

.btn-icon {
  font-size: 16px;
}

.system-title {
  text-align: center;
  color: white;
}

.system-title h1 {
  font-size: 24px;
  margin-bottom: 8px;
  font-weight: bold;
}

.system-title p {
  font-size: 12px;
  opacity: 0.85;
  letter-spacing: 1px;
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

/* 轮播图片 */
.carousel-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}

/* 图片上的文字标题 */
.carousel-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  color: white;
  padding: 40px 30px 25px;
  text-align: center;
  z-index: 5;
}

.carousel-caption h3 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: bold;
}

.carousel-caption p {
  margin: 0;
  font-size: 14px;
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
  width: 20px;
  border-radius: 4px;
  background: white;
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
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  z-index: 10;
}

.carousel-btn:hover {
  background: rgba(0, 0, 0, 0.6);
}

.prev {
  left: 15px;
}

.next {
  right: 15px;
}

/* 响应式 - 平板 */
@media (max-width: 1024px) {
  .logo {
    width: 100px;
    height: 100px;
  }
}

@media (max-width: 768px) {
  .content-wrapper {
    flex-direction: column;
  }

  .left-panel {
    width: 100%;
    height: 40%;
    padding: 20px;
  }

  .right-panel {
    width: 100%;
    height: 60%;
  }

  .top-logo {
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
  }

  .logo {
    width: 60px;
    height: 60px;
  }

  .auth-btn {
    padding: 8px 20px;
    font-size: 14px;
  }

  .system-title h1 {
    font-size: 18px;
  }

  .system-title p {
    font-size: 10px;
  }

  .carousel-caption {
    padding: 20px 15px 15px;
  }

  .carousel-caption h3 {
    font-size: 16px;
  }

  .carousel-caption p {
    font-size: 10px;
  }

  .carousel-btn {
    width: 28px;
    height: 28px;
    font-size: 14px;
  }
}

/* 响应式 - 手机 */
@media (max-width: 480px) {
  .left-panel {
    height: 35%;
  }

  .right-panel {
    height: 65%;
  }

  .logo {
    width: 50px;
    height: 50px;
  }

  .auth-buttons {
    gap: 15px;
    margin-bottom: 20px;
  }

  .auth-btn {
    padding: 6px 16px;
    font-size: 12px;
  }

  .system-title h1 {
    font-size: 16px;
  }

  .carousel-caption {
    padding: 15px 12px 12px;
  }

  .carousel-caption h3 {
    font-size: 14px;
    margin-bottom: 4px;
  }

  .carousel-caption p {
    font-size: 9px;
  }
}

/* ===== 首屏区块 ===== */
.hero-section {
  position: relative;
  width: 100%;
  height: 100vh;
  background: #b31b1b;
  flex-shrink: 0;
}

/* ===== 向下滚动提示 ===== */
.scroll-hint {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
  cursor: pointer;
  z-index: 20;
  transition: color 0.2s;
  /* 首屏内定位需要 home-container relative */
}

.scroll-hint:hover {
  color: white;
}

.scroll-arrow {
  font-size: 16px;
  animation: bounce 1.5s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(6px); }
}

/* ===== 数据统计区 ===== */
.stats-section {
  background: white;
  padding: 64px 80px;
}

.section-header {
  text-align: center;
  margin-bottom: 48px;
}

.section-header h2 {
  font-size: 28px;
  color: #2c3e50;
  margin-bottom: 8px;
  font-weight: 700;
}

.section-header p {
  color: #888;
  font-size: 14px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.stat-card {
  background: #f9fafb;
  border: 1px solid #eef0f3;
  border-radius: 16px;
  padding: 32px 20px;
  text-align: center;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(179, 27, 27, 0.1);
  border-color: #b31b1b;
}

.stat-icon {
  font-size: 36px;
  margin-bottom: 12px;
}

.stat-number {
  font-size: 36px;
  font-weight: 800;
  color: #b31b1b;
  line-height: 1;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 13px;
  color: #888;
}

/* ===== 公告区 ===== */
.notice-section {
  background: #f5f7fa;
  padding: 64px 80px;
}

.notice-container {
  max-width: 900px;
  margin: 0 auto;
}

.notice-header {
  text-align: center;
  margin-bottom: 40px;
}

.notice-header h2 {
  font-size: 28px;
  color: #2c3e50;
  margin-bottom: 8px;
  font-weight: 700;
}

.notice-header p {
  color: #888;
  font-size: 14px;
}

.notice-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.notice-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  background: white;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transition: all 0.2s;
}

.notice-item:hover {
  box-shadow: 0 4px 16px rgba(179, 27, 27, 0.12);
  transform: translateX(4px);
}

.notice-tag {
  flex-shrink: 0;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  margin-top: 2px;
}

.notice-tag.notice { background: rgba(179, 27, 27, 0.06); color: #b31b1b; }
.notice-tag.news    { background: #f6ffed; color: #52c41a; }
.notice-tag.result  { background: #fff7e6; color: #fa8c16; }
.notice-tag.recruitment { background: #fff0f6; color: #eb2f96; }
.notice-tag.other   { background: #f5f5f5; color: #888; }

.notice-content {
  flex: 1;
}

.notice-title {
  font-size: 15px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.notice-abstract {
  font-size: 13px;
  color: #888;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notice-date {
  flex-shrink: 0;
  font-size: 12px;
  color: #bbb;
  margin-top: 2px;
}

.notice-empty {
  text-align: center;
  padding: 48px;
  color: #bbb;
}

.notice-empty .empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

/* ===== 页脚 ===== */
.home-footer {
  background: #2c3e50;
  color: rgba(255,255,255,0.5);
  text-align: center;
  padding: 24px;
  font-size: 13px;
}

@media (max-width: 768px) {
  .stats-section,
  .notice-section {
    padding: 40px 20px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .notice-item {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
