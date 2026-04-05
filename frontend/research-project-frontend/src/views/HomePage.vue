<template>
  <div class="home-container">
    <!-- 左上角校徽 - 5倍大小 -->
    <div class="top-logo">
      <img
        src="/src/views/picture/university-logo.png"
        alt="人大校徽"
        class="logo"
        @error="handleLogoError"
      />
    </div>

    <!-- 左右两栏布局 -->
    <div class="content-wrapper">
      <!-- 左侧：登录/注册入口（宽度1/3） -->
      <div class="left-panel">
        <div class="auth-buttons">
          <button class="auth-btn login-btn" @click="goToLogin">
            <span class="btn-icon">🔐</span>
            登录
          </button>
          <button class="auth-btn register-btn" @click="goToRegister">
            <span class="btn-icon">📝</span>
            注册
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

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

const handleLogoError = (e: Event) => {
  const img = e.target as HTMLImageElement
  img.src =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23B31B1B"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="white" font-size="40"%3E人大%3C/text%3E%3C/svg%3E'
}

const handleImageError = (e: Event) => {
  const img = e.target as HTMLImageElement
  img.src =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"%3E%3Crect width="800" height="500" fill="%23333"/%3E%3Ctext x="400" y="250" text-anchor="middle" dy=".3em" fill="white" font-size="24"%3E概念验证平台%3C/text%3E%3C/svg%3E'
}

onMounted(() => {
  startCarousel()
})

onUnmounted(() => {
  if (carouselInterval) {
    clearInterval(carouselInterval)
  }
})
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.home-container {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #b31b1b;
  position: relative;
}

/* 左上角校徽 - 原80px * 5 = 400px */
.top-logo {
  position: absolute;
  top: 100px;
  left: 100px;
  z-index: 10;
}

.logo {
  width: 200px;
  height: 200px;
  object-fit: contain;
}

/* 内容区域 */
.content-wrapper {
  display: flex;
  width: 100%;
  height: 100%;
}

/* 左侧面板 */
.left-panel {
  width: 33.333%;
  height: 100%;
  background: #b31b1b;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

/* 右侧面板 */
.right-panel {
  width: 66.667%;
  height: 100%;
  background: #f5f5f5;
  position: relative;
  overflow: hidden;
}

.auth-buttons {
  display: flex;
  gap: 24px;
  margin-bottom: 40px;
}

.auth-btn {
  padding: 12px 32px;
  font-size: 16px;
  font-weight: bold;
  border: 2px solid white;
  border-radius: 40px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 8px;
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
  font-size: 18px;
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
    width: 200px;
    height: 200px;
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
    top: 15px;
    left: 20px;
  }

  .logo {
    width: 120px;
    height: 120px;
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
    width: 80px;
    height: 80px;
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
</style>
