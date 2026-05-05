<!-- src/views/assistant/NewsEdit.vue -->
<template>
  <div class="news-edit-page">
    <!-- 返回按钮 -->
    <div class="back-bar">
      <el-button class="back-btn" @click="goBack">
        <el-icon><ArrowLeft /></el-icon> 返回列表
      </el-button>
    </div>

    <!-- 页面标题栏 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">{{ isEdit ? '编辑新闻公告' : '创建新闻公告' }}</h1>
      </div>
      <div class="header-right">
        <template v-if="form.status === 'draft'">
          <el-button @click="handleSave('save-draft')">保存草稿</el-button>
          <el-button type="primary" class="ruc-btn-primary" @click="handleSave('publish')">发布</el-button>
        </template>
        <template v-else-if="form.status === 'published'">
          <el-button type="primary" class="ruc-btn-primary" @click="handleSave('save-published')">保存并发布</el-button>
        </template>
        <template v-else-if="form.status === 'offline'">
          <el-button @click="handleSave('save-offline')">保存修改</el-button>
          <el-button type="primary" class="ruc-btn-primary" @click="handleSave('publish')">发布</el-button>
        </template>
      </div>
    </div>

    <div class="edit-body">
      <div class="form-card">
        <el-form :model="form" label-position="top" class="ruc-form">
          <!-- 状态标签 -->
          <el-form-item label="状态">
            <el-tag :type="statusType(form.status)" size="large">{{ statusLabel(form.status) }}</el-tag>
          </el-form-item>

          <el-form-item label="标题" required>
            <el-input v-model="form.title" placeholder="请输入新闻标题" maxlength="200" show-word-limit />
          </el-form-item>

          <el-form-item label="是否置顶">
            <el-switch v-model="isTop" active-value="yes" inactive-value="no" active-text="是" inactive-text="否" />
          </el-form-item>

          <el-form-item label="摘要" required>
            <el-input
              v-model="form.summary"
              type="textarea"
              :rows="3"
              placeholder="请输入新闻摘要（列表页展示用）"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="正文内容" required>
            <div class="editor-wrapper">
              <Toolbar :editor="editorRef" :defaultConfig="toolbarConfig" style="border-bottom: 1px solid #ccc" />
              <Editor
                v-model="form.content"
                :defaultConfig="editorConfig"
                style="height: 420px; overflow-y: hidden"
                @onCreated="handleEditorCreated"
              />
            </div>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor'
import { Boot } from '@wangeditor/editor'
import '@wangeditor/editor/dist/css/style.css'
import request from '@/utils/request'
import { getApiOrigin } from '@/utils/request'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.id)

const form = ref({
  title: '',
  summary: '',
  content: '',
  status: 'draft',
})
const isTop = ref<'yes' | 'no'>('no')
const mediaList = ref<any[]>([])
const saving = ref(false)

// 编辑器
const editorRef = shallowRef<IDomEditor>()

const apiOrigin = getApiOrigin()

/** 通用上传函数：将文件 POST 到 /api/news/upload，返回服务器响应 */
async function uploadFile(file: File): Promise<{ url: string; type: string; name: string } | null> {
  const formData = new FormData()
  formData.append('file', file)
  const token = localStorage.getItem('token')
  try {
    const resp = await fetch(`${apiOrigin}/api/news/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    const json = await resp.json()
    if (json.errno === 0 && json.data) {
      return { url: json.data.url, type: json.data.type, name: json.data.name }
    }
    console.error('上传失败:', json)
    ElMessage.error(json.error || '上传失败')
    return null
  } catch (e) {
    console.error('上传异常:', e)
    ElMessage.error('上传异常')
    return null
  }
}

const toolbarConfig: Partial<IToolbarConfig> = {
  excludeKeys: ['insertLink', 'insertImage', 'insertVideo', 'group-image', 'group-video'],
  insertKeys: {
    index: 27,
    keys: ['uploadImage', 'uploadAudio', 'uploadVideo'],
  },
}

const editorConfig: Partial<IEditorConfig> = {
  placeholder: '请输入新闻正文内容...',
  MENU_CONF: {
    // ---- 图片上传 ----
    uploadImage: {
      // 使用 customUpload 完全控制上传流程，避免 WangEditor 内置格式校验
      customUpload: async (file: File, insertFn: (url: string, alt?: string, href?: string) => void) => {
        const result = await uploadFile(file)
        if (result) {
          const fullUrl = result.url.startsWith('http') ? result.url : apiOrigin + result.url
          insertFn(fullUrl, result.name, '')
        }
      },
    },
    // ---- 视频上传 ----
    uploadVideo: {
      customUpload: async (file: File, insertFn: (url: string, poster?: string) => void) => {
        const result = await uploadFile(file)
        if (result) {
          const fullUrl = result.url.startsWith('http') ? result.url : apiOrigin + result.url
          insertFn(fullUrl, '')
        }
      },
    },
  },
}

/** 注册自定义「上传音频」菜单 */
class UploadAudioMenu {
  constructor(private editor: IDomEditor) {}

  get title() { return '上传音频' }
  get iconSvg() { return '<svg viewBox="0 0 1024 1024" width="16" height="16"><path d="M512 64L304 272H96v480h208l208 208V64z m280 322c-19.9 0-36 16.1-36 36v180c0 95.9 78.1 174 174 174s174-78.1 174-174V422c0-19.9-16.1-36-36-36s-36 16.1-36 36v180c0 56.4-45.6 102-102 102s-102-45.6-102-102V422c0-19.9-16.1-36-36-36z" fill="currentColor"/></svg>' }
  get tag() { return 'button' as const }

  getValue() { return '' }
  isDisabled() { return false }
  isActive() { return false }

  exec(editor: IDomEditor) {
    // 动态创建文件选择器，避免依赖 Vue ref 生命周期
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'audio/*'
    input.style.display = 'none'
    document.body.appendChild(input)

    input.addEventListener('change', async () => {
      const file = input.files?.[0]
      if (!file) {
        document.body.removeChild(input)
        return
      }
      if (!file.type.startsWith('audio/')) {
        ElMessage.warning('请选择音频文件')
        document.body.removeChild(input)
        return
      }
      const result = await uploadFile(file)
      if (result) {
        const fullUrl = result.url.startsWith('http') ? result.url : apiOrigin + result.url
        editor.insertNode({
          type: 'audio',
          src: fullUrl,
          children: [{ text: '' }]
        })
      }
      document.body.removeChild(input)
    })

    input.click()
  }
}

function handleEditorCreated(editor: IDomEditor) {
  editorRef.value = editor

  // 注册音频自定义元素（只注册一次）
  try {
    Boot.registerRenderElem({
      type: 'audio',
      renderElem(elem: any) {
        const src = elem.src || ''
        return {
          sel: 'div',
          data: {
            attrs: {
              'data-w-e-type': 'audio',
              'data-w-e-is-void': '',
              'data-src': src,
            },
            style: {
              padding: '10px',
              background: '#f5f7fa',
              borderRadius: '6px',
              border: '1px solid #e4e7ed',
            }
          },
          children: [
            {
              sel: 'audio',
              data: {
                attrs: { controls: 'controls', src },
                style: { width: '100%', display: 'block' }
              },
              children: undefined,
              text: undefined,
              elm: undefined,
              key: undefined
            }
          ],
          text: undefined,
          elm: undefined,
          key: undefined
        }
      }
    })

    Boot.registerElemToHtml({
      type: 'audio',
      elemToHtml(elem: any) {
        const src = elem.src || ''
        return `<div data-w-e-type="audio" data-w-e-is-void data-src="${src}"><audio controls src="${src}" style="width:100%"></audio></div>`
      }
    })

    Boot.registerParseElemHtml({
      selector: '[data-w-e-type="audio"]',
      parseElemHtml(domElem: Element) {
        const src = domElem.getAttribute('data-src') || ''
        return {
          type: 'audio',
          src,
          children: [{ text: '' }]
        }
      }
    })

    Boot.registerMenu({
      key: 'uploadAudio',
      factory() {
        return new UploadAudioMenu(editor)
      },
    })
  } catch {
    // 已注册则忽略
  }
}

function statusLabel(s: string) {
  const m: Record<string, string> = { draft: '草稿', published: '已发布', offline: '已下架' }
  return m[s] || s
}
function statusType(s: string) {
  const m: Record<string, string> = { draft: 'info', published: 'success', offline: 'warning' }
  return m[s] || 'info'
}
function getFullUrl(url: string) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return apiOrigin + url
}

async function loadNews() {
  const id = route.params.id as string
  if (!id) return
  try {
    const res = await request.get(`/api/news/${id}`)
    if (res.success && res.data) {
      form.value.title = res.data.title || ''
      form.value.summary = res.data.summary || ''
      form.value.content = res.data.content || ''
      form.value.status = res.data.status || 'draft'
      isTop.value = res.data.is_top || 'no'
      mediaList.value = res.data.media || []
    }
  } catch (e) {
    console.error('加载新闻失败', e)
    ElMessage.error('加载新闻失败')
  }
}

async function handleSave(action: string) {
  if (!form.value.title.trim()) {
    ElMessage.warning('请输入标题')
    return
  }
  if (!form.value.content.trim()) {
    ElMessage.warning('请输入正文内容')
    return
  }
  if (!form.value.summary.trim()) {
    ElMessage.warning('请输入摘要')
    return
  }

  let targetStatus = form.value.status
  let successMsg = '保存成功'
  if (action === 'save-draft') {
    targetStatus = 'draft'
    successMsg = '保存草稿成功'
  } else if (action === 'publish') {
    targetStatus = 'published'
    successMsg = '发布成功'
  } else if (action === 'save-published') {
    targetStatus = 'published'
    successMsg = '保存并发布成功'
  } else if (action === 'save-offline') {
    targetStatus = 'offline'
    successMsg = '保存修改成功'
  }

  saving.value = true
  try {
    const payload = {
      title: form.value.title,
      summary: form.value.summary,
      content: form.value.content,
      is_top: isTop.value,
      status: targetStatus,
    }

    if (isEdit.value) {
      const id = route.params.id as string
      const res = await request.put(`/api/news/${id}`, payload)
      if (res.success) {
        ElMessage.success(successMsg)
        router.push('/assistant/news')
      } else {
        ElMessage.error(res.error || '保存失败')
      }
    } else {
      const res = await request.post('/api/news', payload)
      if (res.success) {
        ElMessage.success(successMsg)
        router.push('/assistant/news')
      } else {
        ElMessage.error(res.error || '创建失败')
      }
    }
  } catch (e) {
    console.error('保存失败', e)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.push('/assistant/news')
}

onMounted(() => {
  if (isEdit.value) {
    loadNews()
  }
})

onBeforeUnmount(() => {
  const editor = editorRef.value
  if (editor) {
    editor.destroy()
  }
})
</script>

<style scoped>
.news-edit-page {
  padding: 0;
  max-width: 1300px;
  margin: 0 auto;
}

/* 返回按钮 */
.back-bar {
  margin-bottom: 16px;
}
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

/* 页面标题栏 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: #fff;
  border-radius: 10px;
  padding: 18px 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}
.header-right {
  display: flex;
  gap: 8px;
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

.edit-body {
  display: flex;
  align-items: flex-start;
}

.form-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  width: 100%;
}

/* 模仿图片2表单项风格：label 带酒红色下划线 */
.ruc-form :deep(.el-form-item__label) {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  padding-bottom: 8px;
  border-bottom: 2px solid #b31b1b;
  display: block;
  width: 100%;
  margin-bottom: 12px;
  line-height: 1.6;
}

/* 编辑器 */
.editor-wrapper {
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
  z-index: 100;
}

@media (max-width: 992px) {
  .edit-body {
    flex-direction: column;
  }
}
</style>
