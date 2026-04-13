<!-- 项目表 Excel 导出：先选项目（列表勾选或弹窗内选择），再选字段；数据范围由后端按登录角色校验 -->
<template>
  <el-dialog
    v-model="visibleInner"
    title="导出项目（Excel）"
    width="620px"
    destroy-on-close
    class="project-export-dialog"
    @open="onOpen"
  >
    <p v-if="scopeDescription" class="scope-desc">{{ scopeDescription }}</p>

    <div v-if="loadingMeta && !metaReady" class="loading-meta">加载导出选项…</div>
    <div v-else-if="!metaReady" class="loading-meta">无法加载导出配置，请稍后重试</div>
    <template v-else>
      <!-- 1. 项目 -->
      <div class="export-section">
        <div class="section-title">1. 选择要导出的项目</div>

        <template v-if="useParentProjectIds">
          <p class="picked-summary">
            已选择 <strong>{{ parentPickCount }}</strong> 个项目（来自当前列表勾选）
          </p>
        </template>
        <template v-else>
          <div v-if="loadingCandidates" class="loading-meta">加载可选项目…</div>
          <template v-else-if="candidateProjects.length > 0">
            <div class="toolbar project-toolbar">
              <el-checkbox
                :model-value="pickerCheckAll"
                :indeterminate="pickerIndeterminate"
                @change="onPickerCheckAll"
              >
                全选
              </el-checkbox>
              <span class="hint">共 {{ candidateProjects.length }} 条，已选 {{ pickerSelectedIds.length }} 条</span>
            </div>
            <el-checkbox-group v-model="pickerSelectedIds" class="project-pick-grid">
              <el-checkbox v-for="p in candidateProjects" :key="p.id" :label="p.id" border>
                <span class="pick-line">
                  <span class="pick-code">{{ p.project_code || '—' }}</span>
                  <span class="pick-title">{{ p.title }}</span>
                </span>
              </el-checkbox>
            </el-checkbox-group>
          </template>
          <p v-else class="empty-candidates">当前没有可导出的项目</p>
        </template>
      </div>

      <!-- 2. 字段 -->
      <div class="export-section">
        <div class="section-title">2. 选择导出字段</div>
        <div class="toolbar">
          <el-checkbox v-model="checkAll" :indeterminate="indeterminate" @change="onCheckAllChange">
            全选字段
          </el-checkbox>
        </div>
        <el-checkbox-group v-model="selectedKeys" class="field-grid">
          <el-checkbox v-for="f in fieldList" :key="f.key" :label="f.key" border>
            {{ f.label }}
          </el-checkbox>
        </el-checkbox-group>
      </div>
    </template>

    <template #footer>
      <el-button @click="visibleInner = false">取消</el-button>
      <el-button
        color="#b31b1b"
        :dark="true"
        :loading="exporting"
        :disabled="exportDisabled"
        @click="doExport"
      >
        导出 Excel
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import request, { getApiOrigin } from '@/utils/request'

const props = defineProps<{
  modelValue: boolean
  /** 列表页勾选的项目 id；不传或空数组时在弹窗内勾选（管理员页等） */
  projectIds?: string[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const visibleInner = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const useParentProjectIds = computed(
  () => Array.isArray(props.projectIds) && props.projectIds.length > 0,
)

const parentPickCount = computed(() =>
  Array.isArray(props.projectIds) ? props.projectIds.length : 0,
)

const loadingMeta = ref(false)
const metaReady = ref(false)
const loadingCandidates = ref(false)
const scopeDescription = ref('')
const fieldList = ref<{ key: string; label: string }[]>([])
const selectedKeys = ref<string[]>([])
const checkAll = ref(true)
const indeterminate = ref(false)

const candidateProjects = ref<{ id: string; project_code?: string; title?: string }[]>([])
const pickerSelectedIds = ref<string[]>([])

const exporting = ref(false)

const effectiveProjectIds = computed(() => {
  if (useParentProjectIds.value) return props.projectIds as string[]
  return pickerSelectedIds.value
})

const pickerCheckAll = computed(() => {
  const n = candidateProjects.value.length
  if (n === 0) return false
  return pickerSelectedIds.value.length === n
})

const pickerIndeterminate = computed(() => {
  const n = candidateProjects.value.length
  const s = pickerSelectedIds.value.length
  return n > 0 && s > 0 && s < n
})

const exportDisabled = computed(() => {
  if (loadingMeta.value || !metaReady.value) return true
  if (!useParentProjectIds.value && loadingCandidates.value) return true
  if (effectiveProjectIds.value.length === 0 || selectedKeys.value.length === 0) return true
  return false
})

watch(selectedKeys, (vals) => {
  const n = fieldList.value.length
  if (n === 0) {
    checkAll.value = false
    indeterminate.value = false
    return
  }
  checkAll.value = vals.length === n
  indeterminate.value = vals.length > 0 && vals.length < n
})

function onPickerCheckAll(val: boolean | string | number) {
  const on = val === true
  if (on) {
    pickerSelectedIds.value = candidateProjects.value.map((p) => p.id)
  } else {
    pickerSelectedIds.value = []
  }
}

async function onOpen() {
  loadingMeta.value = true
  metaReady.value = false
  scopeDescription.value = ''
  fieldList.value = []
  selectedKeys.value = []
  candidateProjects.value = []
  pickerSelectedIds.value = []

  try {
    const res = (await request.get('/api/projects/export-meta')) as {
      success?: boolean
      data?: { scopeDescription?: string; fields?: { key: string; label: string }[] }
      error?: string
    }
    if (!res.success || !res.data?.fields?.length) {
      ElMessage.error(res.error || '无法加载导出字段')
      return
    }
    scopeDescription.value = res.data.scopeDescription || ''
    fieldList.value = res.data.fields
    selectedKeys.value = res.data.fields.map((f) => f.key)
    checkAll.value = true
    indeterminate.value = false
    metaReady.value = true
  } catch {
    ElMessage.error('加载导出选项失败')
    return
  } finally {
    loadingMeta.value = false
  }

  if (useParentProjectIds.value) return

  loadingCandidates.value = true
  try {
    const res = (await request.get('/api/projects/export-candidates')) as {
      success?: boolean
      data?: { projects?: { id: string; project_code?: string; title?: string }[] }
      error?: string
    }
    if (!res.success) {
      ElMessage.error(res.error || '加载可选项目失败')
      return
    }
    candidateProjects.value = res.data?.projects || []
  } catch {
    ElMessage.error('加载可选项目失败')
  } finally {
    loadingCandidates.value = false
  }
}

function onCheckAllChange(val: boolean | string | number) {
  const on = val === true
  if (on) {
    selectedKeys.value = fieldList.value.map((f) => f.key)
  } else {
    selectedKeys.value = []
  }
}

async function doExport() {
  const base = getApiOrigin()
  const token = localStorage.getItem('token')
  exporting.value = true
  try {
    const res = await axios.post(
      `${base}/api/projects/export-excel`,
      { fields: selectedKeys.value, projectIds: effectiveProjectIds.value },
      {
        responseType: 'blob',
        timeout: 120000,
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      },
    )
    const blob = res.data
    const ct = res.headers['content-type'] || ''
    if (ct.includes('application/json')) {
      const text = await blob.text()
      try {
        const j = JSON.parse(text)
        ElMessage.error(j.error || '导出失败')
      } catch {
        ElMessage.error('导出失败')
      }
      return
    }
    const dispo = String(res.headers['content-disposition'] || '')
    let name = `项目导出_${new Date().toISOString().slice(0, 10)}.xlsx`
    const m = /filename\*=UTF-8''([^;]+)/i.exec(dispo)
    if (m) {
      try {
        name = decodeURIComponent(m[1])
      } catch {
        /* keep default */
      }
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
    visibleInner.value = false
  } catch (e: unknown) {
    console.error(e)
    ElMessage.error('导出失败，请稍后重试')
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.scope-desc {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}
.loading-meta {
  padding: 16px 0;
  text-align: center;
  color: var(--el-text-color-secondary);
}
.export-section {
  margin-bottom: 18px;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
}
.picked-summary {
  margin: 0 0 8px;
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}
.picked-summary strong {
  color: #b31b1b;
}
.empty-candidates {
  margin: 0;
  font-size: 13px;
  color: #909399;
}
.hint {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}
.project-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.pick-line {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  text-align: left;
  max-width: 100%;
}
.pick-code {
  font-size: 12px;
  color: #909399;
}
.pick-title {
  font-size: 13px;
  color: #303133;
  line-height: 1.35;
  word-break: break-word;
}
.toolbar {
  margin-bottom: 10px;
}
.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
}
.field-grid :deep(.el-checkbox) {
  margin-right: 0;
}
.project-pick-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
  padding-right: 4px;
}
.project-pick-grid :deep(.el-checkbox) {
  margin-right: 0;
  width: 100%;
  height: auto;
  align-items: flex-start;
  padding: 8px 12px;
}
.project-pick-grid :deep(.el-checkbox__label) {
  width: 100%;
  white-space: normal;
  line-height: 1.35;
}
</style>

<style>
.project-export-dialog .el-dialog__header {
  border-bottom: 1px solid rgba(179, 27, 27, 0.12);
  margin-right: 0;
  padding-bottom: 14px;
}
.project-export-dialog .el-dialog__title {
  font-weight: 600;
  color: #b31b1b;
}
.project-export-dialog .el-checkbox__input.is-checked .el-checkbox__inner,
.project-export-dialog .el-checkbox__input.is-indeterminate .el-checkbox__inner {
  background-color: #b31b1b;
  border-color: #b31b1b;
}
.project-export-dialog .el-checkbox__inner:hover {
  border-color: rgba(179, 27, 27, 0.65);
}
.project-export-dialog .el-checkbox__input.is-focus .el-checkbox__inner {
  border-color: #b31b1b;
}
.project-export-dialog .el-checkbox.is-bordered.is-checked {
  border-color: #b31b1b;
}
</style>
