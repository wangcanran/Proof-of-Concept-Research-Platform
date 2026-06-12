<template>
  <div class="demand-edit-page">
    <div class="back-bar">
      <el-button class="back-btn" @click="goBack">
        <el-icon><ArrowLeft /></el-icon> 返回列表
      </el-button>
    </div>

    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">{{ isEdit ? '编辑企业需求' : '创建企业需求' }}</h1>
      </div>
      <div class="header-right">
        <template v-if="form.status === 'draft'">
          <el-button @click="handleSave('save-draft')">保存草稿</el-button>
          <el-button type="primary" class="ruc-btn-primary" @click="handleSave('publish')">发布</el-button>
        </template>
        <template v-else-if="form.status === 'published'">
          <el-button type="primary" class="ruc-btn-primary" @click="handleSave('save-published')">保存并发布</el-button>
        </template>
        <template v-else-if="form.status === 'offline' || form.status === 'closed'">
          <el-button @click="handleSave('save-current')">保存修改</el-button>
          <el-button type="primary" class="ruc-btn-primary" @click="handleSave('publish')">发布</el-button>
        </template>
      </div>
    </div>

    <div class="edit-body">
      <div class="form-card">
        <el-form :model="form" label-position="top" class="ruc-form">
          <el-form-item label="状态">
            <el-tag :type="statusType(form.status)" size="large">{{ statusLabel(form.status) }}</el-tag>
          </el-form-item>

          <el-form-item label="需求标题" required>
            <el-input v-model="form.title" placeholder="请输入需求标题" maxlength="200" show-word-limit />
          </el-form-item>

          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="企业/单位名称">
                <el-input v-model="form.enterprise_name" placeholder="选填" maxlength="200" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="行业/领域标签">
                <el-input v-model="form.industry" placeholder="选填" maxlength="100" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="摘要" required>
            <el-input
              v-model="form.summary"
              type="textarea"
              :rows="3"
              placeholder="列表页展示的简短摘要"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="需求正文" required>
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

          <el-divider content-position="left">转载来源（选填）</el-divider>
          <el-form-item label="来源链接">
            <el-input v-model="form.source_url" placeholder="https://..." />
          </el-form-item>
          <el-form-item label="转载说明">
            <el-input v-model="form.source_note" type="textarea" :rows="2" maxlength="500" show-word-limit />
          </el-form-item>

          <el-divider content-position="left">联系信息（选填）</el-divider>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="联系人">
                <el-input v-model="form.contact_name" maxlength="100" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="联系电话">
                <el-input v-model="form.contact_phone" maxlength="50" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="联系邮箱">
                <el-input v-model="form.contact_email" maxlength="100" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="需求截止日期">
            <el-date-picker
              v-model="form.deadline"
              type="date"
              placeholder="选填"
              value-format="YYYY-MM-DD"
              style="width: 220px"
            />
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
  enterprise_name: '',
  industry: '',
  source_url: '',
  source_note: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  deadline: '' as string | null,
})

const editorRef = shallowRef<IDomEditor>()
const apiOrigin = getApiOrigin()

async function uploadFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  if (isEdit.value) formData.append('demand_id', route.params.id as string)
  const token = localStorage.getItem('token')
  try {
    const resp = await fetch(`${apiOrigin}/api/enterprise-demands/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    const json = await resp.json()
    if (json.errno === 0 && json.data) {
      return { url: json.data.url, type: json.data.type, name: json.data.name }
    }
    ElMessage.error(json.error || '上传失败')
    return null
  } catch {
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
  placeholder: '请输入企业需求正文（支持图文、音视频）...',
  MENU_CONF: {
    uploadImage: {
      customUpload: async (file: File, insertFn: (url: string, alt?: string, href?: string) => void) => {
        const result = await uploadFile(file)
        if (result) insertFn(result.url, result.name, '')
      },
    },
    uploadVideo: {
      customUpload: async (file: File, insertFn: (url: string, poster?: string) => void) => {
        const result = await uploadFile(file)
        if (result) insertFn(result.url, '')
      },
    },
  },
}

class UploadAudioMenu {
  constructor(private editor: IDomEditor) {}
  get title() {
    return '上传音频'
  }
  get iconSvg() {
    return '<svg viewBox="0 0 1024 1024" width="16" height="16"><path d="M512 64L304 272H96v480h208l208 208V64z m280 322c-19.9 0-36 16.1-36 36v180c0 95.9 78.1 174 174 174s174-78.1 174-174V422c0-19.9-16.1-36-36-36s-36 16.1-36 36v180c0 56.4-45.6 102-102 102s-102-45.6-102-102V422c0-19.9-16.1-36-36-36z" fill="currentColor"/></svg>'
  }
  get tag() {
    return 'button' as const
  }
  getValue() {
    return ''
  }
  isDisabled() {
    return false
  }
  isActive() {
    return false
  }
  exec(editor: IDomEditor) {
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
      const result = await uploadFile(file)
      if (result) {
        editor.insertNode({ type: 'audio', src: result.url, children: [{ text: '' }] })
      }
      document.body.removeChild(input)
    })
    input.click()
  }
}

function handleEditorCreated(editor: IDomEditor) {
  editorRef.value = editor
  try {
    Boot.registerRenderElem({
      type: 'audio',
      renderElem(elem: any) {
        const src = elem.src || ''
        return {
          sel: 'div',
          data: {
            attrs: { 'data-w-e-type': 'audio', 'data-w-e-is-void': '', 'data-src': src },
            style: { padding: '10px', background: '#f5f7fa', borderRadius: '6px', border: '1px solid #e4e7ed' },
          },
          children: [
            {
              sel: 'audio',
              data: { attrs: { controls: 'controls', src }, style: { width: '100%', display: 'block' } },
              children: undefined,
              text: undefined,
              elm: undefined,
              key: undefined,
            },
          ],
          text: undefined,
          elm: undefined,
          key: undefined,
        }
      },
    })
    Boot.registerElemToHtml({
      type: 'audio',
      elemToHtml(elem: any) {
        const src = elem.src || ''
        return `<div data-w-e-type="audio" data-w-e-is-void data-src="${src}"><audio controls src="${src}" style="width:100%"></audio></div>`
      },
    })
    Boot.registerParseElemHtml({
      selector: '[data-w-e-type="audio"]',
      parseElemHtml(domElem: Element) {
        const src = domElem.getAttribute('data-src') || ''
        return { type: 'audio', src, children: [{ text: '' }] }
      },
    })
    Boot.registerMenu({ key: 'uploadAudio', factory: () => new UploadAudioMenu(editor) })
  } catch {
    /* already registered */
  }
}

function statusLabel(s: string) {
  const m: Record<string, string> = {
    draft: '草稿',
    published: '已发布',
    closed: '已关闭',
    offline: '已下架',
  }
  return m[s] || s
}

function statusType(s: string) {
  const m: Record<string, string> = {
    draft: 'info',
    published: 'success',
    closed: 'warning',
    offline: 'info',
  }
  return m[s] || 'info'
}

async function loadDemand() {
  const id = route.params.id as string
  if (!id) return
  try {
    const res = await request.get(`/api/enterprise-demands/${id}`)
    if (res.success && res.data) {
      const d = res.data
      form.value = {
        title: d.title || '',
        summary: d.summary || '',
        content: d.content || '',
        status: d.status || 'draft',
        enterprise_name: d.enterprise_name || '',
        industry: d.industry || '',
        source_url: d.source_url || '',
        source_note: d.source_note || '',
        contact_name: d.contact_name || '',
        contact_phone: d.contact_phone || '',
        contact_email: d.contact_email || '',
        deadline: d.deadline || null,
      }
    }
  } catch {
    ElMessage.error('加载失败')
  }
}

function buildPayload(targetStatus: string) {
  return {
    title: form.value.title,
    summary: form.value.summary,
    content: form.value.content,
    status: targetStatus,
    enterprise_name: form.value.enterprise_name || null,
    industry: form.value.industry || null,
    source_url: form.value.source_url || null,
    source_note: form.value.source_note || null,
    contact_name: form.value.contact_name || null,
    contact_phone: form.value.contact_phone || null,
    contact_email: form.value.contact_email || null,
    deadline: form.value.deadline || null,
  }
}

async function handleSave(action: string) {
  if (!form.value.title.trim()) {
    ElMessage.warning('请输入标题')
    return
  }
  if (!form.value.content.trim()) {
    ElMessage.warning('请输入正文')
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
  } else if (action === 'save-current') {
    targetStatus = form.value.status
    successMsg = '保存成功'
  }

  try {
    const payload = buildPayload(targetStatus)
    if (isEdit.value) {
      const res = await request.put(`/api/enterprise-demands/${route.params.id}`, payload)
      if (res.success) {
        ElMessage.success(successMsg)
        router.push('/assistant/enterprise-demands')
      } else {
        ElMessage.error(res.error || '保存失败')
      }
    } else {
      const res = await request.post('/api/enterprise-demands', payload)
      if (res.success) {
        ElMessage.success(successMsg)
        router.push('/assistant/enterprise-demands')
      } else {
        ElMessage.error(res.error || '创建失败')
      }
    }
  } catch {
    ElMessage.error('保存失败')
  }
}

function goBack() {
  router.push('/assistant/enterprise-demands')
}

onMounted(() => {
  if (isEdit.value) loadDemand()
})

onBeforeUnmount(() => {
  editorRef.value?.destroy()
})
</script>

<style scoped>
.demand-edit-page {
  padding: 0;
  max-width: 1300px;
  margin: 0 auto;
}

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

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: #fff;
  border-radius: 10px;
  padding: 18px 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
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

.ruc-btn-primary {
  background: #b31b1b;
  border-color: #b31b1b;
}
.ruc-btn-primary:hover {
  background: #8a1515;
  border-color: #8a1515;
}

.form-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.ruc-form :deep(.el-form-item__label) {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  padding-bottom: 8px;
  border-bottom: 2px solid #b31b1b;
  display: block;
  width: 100%;
  margin-bottom: 12px;
}

.editor-wrapper {
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
  z-index: 100;
}
</style>
