<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="min(920px, 94vw)"
    destroy-on-close
    align-center
    class="showcase-media-preview-dialog"
  >
    <div v-if="mediaSrc" class="showcase-preview-body">
      <video
        v-if="isVideo"
        :src="mediaSrc"
        controls
        autoplay
        playsinline
        class="showcase-preview-video"
      />
      <img v-else :src="mediaSrc" :alt="dialogTitle" class="showcase-preview-image" />
    </div>
    <el-empty v-else description="无法预览该文件" />
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getShowcaseMediaSrc, isProjectVideoMedia } from '@/utils/projectMedia'

const visible = defineModel<boolean>({ default: false })

const props = defineProps<{
  item: Record<string, unknown> | null
}>()

const mediaSrc = computed(() => {
  if (!props.item) return ''
  return getShowcaseMediaSrc(
    props.item as { file_path?: string; preview?: string | null },
  )
})

const isVideo = computed(
  () => props.item && isProjectVideoMedia(props.item as { type?: string; mime_type?: string }),
)

const dialogTitle = computed(() => {
  const i = props.item
  if (!i) return '预览'
  return String(
    i.file_name || i.originalName || (isVideo.value ? '视频预览' : '图片预览'),
  )
})
</script>

<style scoped>
.showcase-preview-body {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  max-height: 75vh;
  background: #111;
  border-radius: 8px;
  overflow: hidden;
}

.showcase-preview-image {
  max-width: 100%;
  max-height: 75vh;
  object-fit: contain;
}

.showcase-preview-video {
  width: 100%;
  max-height: 75vh;
  outline: none;
}
</style>

<!-- 列表缩略图点击预览（CreateProject / 项目详情等复用） -->
<style>
.showcase-preview-trigger {
  cursor: pointer;
  position: relative;
}

.showcase-preview-trigger .preview-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  padding: 2px 10px;
  font-size: 12px;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 4px;
  pointer-events: none;
  z-index: 1;
}

.showcase-preview-trigger:hover .preview-badge {
  background: rgba(179, 27, 27, 0.88);
}

.showcase-preview-trigger:hover img {
  transform: scale(1.05);
}

.showcase-preview-trigger img,
.showcase-preview-trigger .preview-video {
  display: block;
  min-width: 0;
  min-height: 0;
}

.showcase-preview-trigger img {
  transition: transform 0.3s;
}
</style>
