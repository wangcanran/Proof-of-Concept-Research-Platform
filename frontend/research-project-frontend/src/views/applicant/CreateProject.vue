<!-- src/views/applicant/CreateProject.vue -->
<template>
  <div class="create-project-container">
    <!-- 页面标题和导航 -->
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-workbench-box" @click="goBack">
          <el-icon class="back-icon"><ArrowLeft /></el-icon>
          <span class="back-text">返回工作台</span>
        </button>
        <h1>项目申报</h1>
      </div>
      <div class="header-right">
        <div class="draft-info" v-if="isEditing && currentProject">
          正在编辑：{{ currentProject.title }} ({{ currentProject.project_code }})
        </div>
        <div class="header-actions">
          <button class="secondary-btn" @click="() => saveDraft()" :disabled="saving">
            {{ saving ? '保存中...' : '💾 保存草稿' }}
          </button>
          <button class="primary-btn" @click="handleSubmit" :disabled="!canSubmit || submitting">
            {{ submitting ? '提交中...' : '📤 提交申报' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 数据库连接状态显示 -->
    <div v-if="showDebugInfo" class="db-status-bar">
      <div class="db-status-content">
        <span class="db-status-label">📊 数据库状态：</span>
        <span class="db-status-value" :class="{ connected: dbConnected }">
          {{ dbConnected ? '✅ 已连接' : '❌ 未连接' }}
        </span>
        <span class="db-user-info" v-if="currentUser">
          当前用户：{{ currentUser.name }} ({{ getUserRoleText(currentUser.role) }})
        </span>
        <button @click="toggleDebugInfo" class="db-toggle-btn">
          {{ showDebugInfo ? '隐藏' : '显示' }}调试
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">正在加载项目数据...</div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMessage" class="error-alert">
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <span class="error-text">{{ errorMessage }}</span>
        <button @click="errorMessage = ''" class="error-close">×</button>
      </div>
    </div>

    <!-- 申报步骤指示器 -->
    <div class="steps-container">
      <div
        v-for="(step, index) in steps"
        :key="step.key"
        class="step-item"
        :class="{
          active: currentStep === index + 1,
          completed: currentStep > index + 1,
        }"
        @click="jumpToStep(index + 1)"
      >
        <span class="step-number">{{ index + 1 }}</span>
        <span class="step-label">{{ step.label }}</span>
      </div>
    </div>

    <!-- 步骤1：基本信息 -->
    <div v-show="currentStep === 1" class="step-content">
      <div class="section-card">
        <div class="section-title-row">
          <h3 class="section-title">一、项目基本信息</h3>
          <div class="word-import-actions">
            <input
              ref="wordFileInput"
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              class="word-file-input"
              @change="onWordFileChange"
            />
            <button
              type="button"
              class="secondary-btn word-import-btn"
              :disabled="loading || wordImporting"
              @click="triggerWordImport"
            >
              {{ wordImporting ? '正在解析…' : '📄 从 Word 导入' }}
            </button>
            <button type="button" class="link-btn" @click="showWordImportHint">导入说明</button>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>项目标题 <span class="required">*</span></label>
            <input
              type="text"
              v-model="formData.title"
              placeholder="请输入项目标题"
              required
              maxlength="200"
              :disabled="loading"
            />
            <div class="char-counter">{{ formData.title.length }}/200</div>
          </div>
        </div>

        <div class="form-group full-width">
          <label>研究领域 <span class="required">*</span></label>
          <div class="domains-buttons">
            <button
              v-for="domain in researchDomains"
              :key="domain.id"
              type="button"
              class="domain-btn"
              :class="{ active: selectedDomains.includes(domain.id) }"
              @click="toggleDomain(domain.id)"
              :disabled="loading"
            >
              {{ domain.name }}
            </button>
          </div>
          <div class="form-hint">
            <span
              >✅ 已选择 {{ selectedDomains.length }} 个研究领域<span
                v-if="needsDomainOther"
                class="required-hint"
              >
                （已选「其他」须填写具体方向）</span
              ></span
            >
            <span v-if="selectedDomains.length === 0" class="required-hint"
              >（请至少选择一个）</span
            >
          </div>
          <div v-if="needsDomainOther" class="other-input">
            <label
              >请说明具体研究领域 <span class="required">*</span>
              <span class="hint-inline">（请简要写出实际方向，与上方「其他」选项对应）</span></label
            >
            <textarea
              v-model="formData.project_domain_other_text"
              rows="3"
              maxlength="500"
              placeholder="例如：体育科技、交叉学科方向等，请简要说明"
              :disabled="loading"
            />
            <div class="char-counter">{{ formData.project_domain_other_text.length }}/500</div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>技术成熟度</label>
            <select v-model="formData.tech_maturity" :disabled="loading">
              <option value="">请选择技术成熟度</option>
              <option value="rd">研发阶段（理论模型验证完成，未形成样机）</option>
              <option value="pilot">小试阶段（原理样机开发完成，可初步测试）</option>
              <option value="intermediate_trial">中试阶段（小批量样品试制，达标率≥80%）</option>
              <option value="small_batch_prod">小批量生产阶段（量产工艺基础 + 少量订单）</option>
            </select>
          </div>

          <div class="form-group">
            <label>预期成果转化形式</label>
            <div class="checkbox-group">
              <label v-for="opt in transformOptions" :key="opt.value" class="checkbox-label">
                <input type="checkbox" :value="opt.value" v-model="achievementTransform" />
                {{ opt.label }}
              </label>
              <div v-if="achievementTransform.includes('other')" class="other-input">
                <input
                  type="text"
                  v-model="formData.achievement_transform_other_text"
                  placeholder="请注明其他转化形式"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>概念验证阶段需求</label>
            <div class="checkbox-group">
              <label v-for="opt in pocOptions" :key="opt.value" class="checkbox-label">
                <input type="checkbox" :value="opt.value" v-model="pocStageRequirement" />
                {{ opt.label }}
              </label>
              <div v-if="pocStageRequirement.includes('multi_stage_combo')" class="other-input">
                <input
                  type="text"
                  v-model="formData.poc_multi_stage_note"
                  placeholder="请说明多阶段组合情况"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>关键词 <span class="required">*</span></label>
          <div class="tags-input">
            <div class="tags-container">
              <span v-for="(keyword, index) in keywordsArray" :key="index" class="tag">
                {{ keyword }}
                <span class="remove-tag" @click="removeKeyword(index)" :disabled="loading">×</span>
              </span>
            </div>
            <input
              type="text"
              v-model="keywordInput"
              placeholder="输入关键词后按回车"
              @keydown.enter="addKeyword"
              @blur="addKeyword"
              maxlength="20"
              :disabled="loading"
            />
          </div>
          <div class="form-hint">建议添加3-5个关键词，用逗号或空格分隔</div>
        </div>
      </div>

    </div>

    <!-- 步骤2：项目详细介绍 -->
    <div v-show="currentStep === 2" class="step-content">
      <div class="section-card">
        <h3 class="section-title">三、项目详细介绍</h3>

        <div class="form-group">
          <label>项目摘要 <span class="required">*</span></label>
          <textarea
            v-model="formData.abstract"
            placeholder="请简要概括项目的主要内容、目标、方法和意义（500字以内）"
            rows="4"
            required
            maxlength="500"
            :disabled="loading"
          ></textarea>
          <div class="char-counter">{{ formData.abstract.length }}/500</div>
        </div>

        <div class="form-group">
          <label>成果简介（背景、痛点、技术方案、竞争优势、创新点等）</label>
          <textarea
            v-model="formData.detailed_introduction_part1"
            placeholder="请阐述项目的研究背景、解决的核心问题、技术创新性、推广应用价值等"
            rows="8"
            :disabled="loading"
          ></textarea>
        </div>

        <div class="form-group">
          <label>知识产权情况</label>
          <textarea
            v-model="formData.detailed_introduction_part2"
            placeholder="请说明知识产权权属、专利/软著数量、核心知识产权摘要等"
            rows="6"
            :disabled="loading"
          ></textarea>
        </div>

        <div class="form-group">
          <label>已有应用/试点情况</label>
          <textarea
            v-model="formData.detailed_introduction_part3"
            placeholder="请说明已有应用案例、试点情况、获奖情况等（无则填「无」）"
            rows="6"
            :disabled="loading"
          ></textarea>
        </div>

        <div class="form-group">
          <label>实施计划</label>
          <textarea
            v-model="formData.implementation_plan"
            placeholder="请说明项目实施计划、时间安排等"
            rows="6"
            :disabled="loading"
          ></textarea>
        </div>

        <div class="form-group">
          <label>其他补充说明</label>
          <textarea
            v-model="formData.supplementary_info"
            placeholder="其他需要补充说明的内容"
            rows="4"
            :disabled="loading"
          ></textarea>
        </div>
      </div>
    </div>

    <!-- 步骤3：团队与成员 -->
    <div v-show="currentStep === 3" class="step-content">
      <div class="section-card">
        <h3 class="section-title">三、研究团队</h3>
        <p class="section-subtitle">请填写项目团队成员信息，至少需要一个成员且至少有一个项目负责人</p>

        <div class="team-members">
          <div class="team-header">
            <h4>项目组成员</h4>
            <button type="button" class="add-btn" @click="addTeamMember" :disabled="loading">
              + 添加成员
            </button>
          </div>

          <div v-for="(member, index) in teamMembers" :key="index" class="member-card">
            <div class="member-header">
              <span>成员 {{ index + 1 }}</span>
              <button
                type="button"
                class="remove-btn"
                @click="removeTeamMember(index)"
                v-if="teamMembers.length > 1"
                :disabled="loading"
              >
                删除
              </button>
            </div>

            <!-- 第一步：只显示邮箱输入 -->
            <div class="form-row">
              <div class="form-group" style="flex: 2;">
                <label>邮箱 <span class="required">*</span></label>
                <input
                  type="email"
                  v-model="member.email"
                  placeholder="请输入邮箱"
                  required
                  :disabled="loading"
                />
                <div v-if="member.isChecking" class="form-hint">正在查找...</div>
                <div v-else-if="member.email && member.emailConfirmed" class="form-hint" :style="{ color: member.isExistingUser ? '#52c41a' : '#666' }">
                  {{ member.isExistingUser ? '已找到用户，信息已自动填充' : '未找到用户，请填写以下信息' }}
                </div>
              </div>
              <div class="form-group" style="flex: 1; display: flex; align-items: flex-end;">
                <button 
                  type="button" 
                  class="confirm-email-btn"
                  @click="searchUserByEmail(index)"
                  :disabled="loading || !member.email || member.isChecking"
                >
                  {{ member.isChecking ? '搜索中...' : '搜索' }}
                </button>
              </div>
            </div>

            <!-- 第二步：确认邮箱后显示其他字段 -->
            <div v-if="member.emailConfirmed" class="member-details">
              <div class="form-row">
                <div class="form-group">
                  <label>姓名 <span class="required">*</span></label>
                  <input
                    type="text"
                    v-model="member.name"
                    placeholder="请输入姓名"
                    required
                    :disabled="loading"
                  />
                </div>

                <div class="form-group">
                  <label>所属单位</label>
                  <input
                    type="text"
                    v-model="member.organization"
                    placeholder="请输入所在单位"
                    :disabled="loading"
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>职称</label>
                  <input
                    type="text"
                    v-model="member.title"
                    placeholder="请输入职称"
                    :disabled="loading"
                  />
                </div>

                <div class="form-group">
                  <label>联系电话</label>
                  <input
                    type="text"
                    v-model="member.phone"
                    placeholder="请输入联系电话"
                    :disabled="loading"
                  />
                </div>
              </div>

              <div class="form-group">
                <label>项目角色 <span class="required">*</span></label>
                <select v-model="member.role" :disabled="loading">
                  <option value="principal">项目负责人</option>
                  <option value="contact">联系人</option>
                  <option value="other">其他成员</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 步骤4：经费预算 -->
    <div v-show="currentStep === 4" class="step-content">
      <div class="section-card">
        <h3 class="section-title">四、经费预算</h3>
        <p class="section-subtitle">请根据项目实际需求填写经费预算（单位：元）</p>

        <div class="budget-table">
          <table>
            <thead>
              <tr>
                <th>预算科目</th>
                <th>项目名称</th>
                <th>详细说明</th>
                <th>金额（元）</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in budgetItems" :key="index">
                <td>
                  <select v-model="item.category" class="budget-select" :disabled="loading">
                    <option value="">请选择科目</option>
                    <option value="设备费">设备费</option>
                    <option value="材料费">材料费</option>
                    <option value="测试费">测试费</option>
                    <option value="差旅费">差旅费</option>
                    <option value="会议费">会议费</option>
                    <option value="劳务费">劳务费</option>
                    <option value="专家咨询费">专家咨询费</option>
                    <option value="出版费">出版费</option>
                    <option value="管理费">管理费</option>
                    <option value="其他">其他</option>
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    v-model="item.item_name"
                    placeholder="填写预算项目名称（必填）"
                    required
                    :disabled="loading"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    v-model="item.description"
                    placeholder="填写详细说明"
                    :disabled="loading"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    v-model="item.amount"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    @input="calculateTotal"
                    :disabled="loading"
                  />
                </td>
                <td>
                  <button
                    type="button"
                    class="table-btn danger"
                    @click="removeBudgetItem(index)"
                    :disabled="loading"
                  >
                    删除
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="total-label">预算合计</td>
                <td class="total-amount">¥ {{ totalBudget.toFixed(2) }}</td>
                <td>
                  <button
                    type="button"
                    class="table-btn primary"
                    @click="addBudgetItem"
                    :disabled="loading"
                  >
                    + 添加科目
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    <!-- 步骤5：图片展示 -->
    <div v-show="currentStep === 5" class="step-content">
      <div class="section-card">
        <h3 class="section-title">五、图片展示</h3>
        <p class="section-subtitle">请上传项目相关图片，至少上传1张图片，每张图片可添加文字说明</p>

        <!-- 图片上传区域 -->
        <div class="images-section">
          <div
            class="upload-area"
            @dragover.prevent
            @drop.prevent="handleImageDrop"
            @click="triggerImageInput"
          >
            <div class="upload-icon">🖼️</div>
            <div class="upload-text">
              <span>点击或拖拽图片到此区域上传</span>
              <span class="upload-hint">支持 JPG、PNG 格式，单个文件不超过10MB</span>
            </div>
            <input
              type="file"
              ref="imageInput"
              multiple
              accept="image/*"
              style="display: none"
              @change="handleImageSelect"
            />
          </div>

          <!-- 图片列表 -->
          <div v-if="images.length > 0" class="images-list">
            <div
              v-for="(image, index) in images"
              :key="image.id || index"
              class="image-item"
            >
              <div class="image-preview">
                <img 
                  v-if="image.file_path || image.preview" 
                  :src="image.preview || `${getApiOrigin()}${image.file_path}`" 
                  alt="项目图片"
                  @click="previewImage(image)"
                />
                <div v-else class="image-placeholder">上传中...</div>
              </div>
              <div class="image-info">
                <div class="image-name">{{ image.originalName || image.file_name }}</div>
                <div class="image-size">{{ formatFileSize(image.file_size) }}</div>
                <div class="image-description">
                  <input
                    type="text"
                    v-model="image.description"
                    placeholder="请输入图片说明"
                    :disabled="image.uploading || loading"
                  />
                </div>
              </div>
              <div class="image-actions">
                <button
                  type="button"
                  class="remove-btn"
                  @click="removeImage(index)"
                  :disabled="image.uploading"
                >
                  🗑️
                </button>
              </div>
              <div v-if="image.uploading" class="upload-progress">
                <div class="progress-fill-bar" :style="{ width: image.progress + '%' }"></div>
              </div>
            </div>
          </div>
          
          <div v-else class="no-images-hint">
            <p>暂无图片，请至少上传1张项目相关图片</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 步骤6：附件材料 -->
    <div v-show="currentStep === 6" class="step-content">
      <div class="section-card">
        <h3 class="section-title">六、附件材料</h3>
        <p class="section-subtitle">请上传项目相关的附件材料（文档、PDF等），每个附件可添加文字说明</p>

        <!-- 附件上传区域 -->
        <div class="attachments-section">
          <div
            class="upload-area"
            @dragover.prevent
            @drop.prevent="handleDrop"
            @click="triggerFileInput"
          >
            <div class="upload-icon">📎</div>
            <div class="upload-text">
              <span>点击或拖拽文件到此区域上传</span>
              <span class="upload-hint">支持 PDF、DOC、DOCX、ZIP 格式，单个文件不超过10MB</span>
            </div>
            <input
              type="file"
              ref="fileInput"
              multiple
              accept=".pdf,.doc,.docx,.zip"
              style="display: none"
              @change="handleFileSelect"
            />
          </div>

          <!-- 附件列表 -->
          <div v-if="attachments.length > 0" class="attachments-list">
            <div
              v-for="(file, index) in attachments"
              :key="file.id || index"
              class="attachment-item"
            >
              <div class="attachment-info">
                <span class="attachment-icon">{{ getFileIcon(file.mime_type) }}</span>
                <div class="attachment-details">
                  <span class="attachment-name">{{ file.originalName || file.file_name }}</span>
                  <span class="attachment-size">{{ formatFileSize(file.file_size) }}</span>
                </div>
                <div class="attachment-actions">
                  <button
                    type="button"
                    class="remove-btn"
                    @click="removeAttachment(index)"
                    :disabled="uploading"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div class="attachment-description">
                <input
                  type="text"
                  v-model="file.description"
                  placeholder="请输入附件说明"
                  :disabled="file.uploading || loading"
                />
              </div>
              <div v-if="file.uploading" class="upload-progress">
                <div class="progress-fill-bar" :style="{ width: file.progress + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部导航按钮 -->
    <div class="step-navigation">
      <div class="nav-left">
        <button
          v-if="currentStep > 1"
          class="nav-btn secondary"
          @click="prevStep"
          :disabled="loading"
        >
          上一步
        </button>
      </div>

      <div class="nav-center">
        <div class="step-progress">
          <span>步骤 {{ currentStep }}/{{ steps.length }}</span>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
          </div>
        </div>
      </div>

      <div class="nav-right">
        <button
          v-if="currentStep < steps.length"
          class="nav-btn primary"
          @click="nextStep"
          :disabled="loading"
        >
          下一步
        </button>
        <button
          v-else
          class="nav-btn success"
          @click="handleSubmit"
          :disabled="!canSubmit || loading || submitting"
        >
          {{ submitting ? '提交中...' : '✅ 提交申报' }}
        </button>
      </div>
    </div>

    <!-- 提交确认对话框 -->
    <div v-if="showConfirmDialog" class="modal-overlay">
      <div class="modal-content">
        <h3>确认提交</h3>
        <p>提交后项目将进入审核流程，无法再修改。确认要提交吗？</p>

        <div class="modal-actions">
          <button class="modal-btn secondary" @click="showConfirmDialog = false">再检查一下</button>
          <button class="modal-btn primary" @click="confirmSubmit" :disabled="submitting">
            {{ submitting ? '提交中...' : '确认提交' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getApiBaseUrl, getApiOrigin } from '@/utils/request'
import {
  getWordImportTemplateHint,
  parseProjectWordDocx,
  type WordImportPatches,
} from '@/utils/wordProjectImport'
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import axios from 'axios'

const router = useRouter()
const route = useRoute()

// API配置
const API_BASE_URL = getApiBaseUrl()

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear()
      router.push('/login')
    }
    return Promise.reject(error)
  },
)

// 状态
const loading = ref(false)
const saving = ref(false)
const submitting = ref(false)
const uploading = ref(false)
const dbConnected = ref(false)
const showDebugInfo = ref(import.meta.env.DEV)
const errorMessage = ref('')
const keywordInput = ref('')
const currentUser = ref<any>(null)
const researchDomains = ref<any[]>([])
const currentProject = ref<any>(null)
const isEditing = ref(false)
const showConfirmDialog = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const wordFileInput = ref<HTMLInputElement | null>(null)
const wordImporting = ref(false)
const attachmentDescription = ref('')

// 步骤
const currentStep = ref(1)
const steps = [
  { key: 'basic', label: '基本信息' },
  { key: 'detail', label: '项目详情' },
  { key: 'team', label: '研究团队' },
  { key: 'budget', label: '经费预算' },
  { key: 'images', label: '图片展示' },
  { key: 'attachments', label: '附件材料' },
]

// 多选字段
const selectedDomains = ref<string[]>([])
const achievementTransform = ref<string[]>([])
const pocStageRequirement = ref<string[]>([])

// 图片列表
const images = ref<any[]>([])
// 附件列表
const attachments = ref<any[]>([])

// 表单数据
const formData = reactive({
  title: '',
  tech_maturity: '',
  achievement_transform_other_text: '',
  /** 选「其他」研究领域时填写，对应表字段 project_domain_other_text */
  project_domain_other_text: '',
  poc_multi_stage_note: '',
  keywords: '',
  abstract: '',
  detailed_introduction_part1: '',
  detailed_introduction_part2: '',
  detailed_introduction_part3: '',
  implementation_plan: '',
  supplementary_info: '',
  submit_date: '',
})

// 团队成员
const teamMembers = ref([{ name: '', email: '', organization: '', title: '', phone: '', role: 'other', isExistingUser: false, isChecking: false, emailConfirmed: false }])

// 预算项
const budgetItems = ref([{ category: '', item_name: '', description: '', amount: 0 }])

// 选项
const transformOptions = [
  { value: 'tech_transfer', label: '技术转让' },
  { value: 'tech_license', label: '技术许可' },
  { value: 'equity_investment', label: '作价投资' },
  { value: 'joint_dev', label: '联合开发' },
  { value: 'other', label: '其他' },
]

const pocOptions = [
  { value: 'creative_verify', label: '创意性验证' },
  { value: 'feasibility_verify', label: '可行性验证' },
  { value: 'commercial_verify', label: '商业化验证' },
  { value: 'multi_stage_combo', label: '多阶段组合' },
]

// 计算属性
const progressPercentage = computed(() => (currentStep.value / steps.length) * 100)
const totalBudget = computed(() =>
  budgetItems.value.reduce((s, i) => s + (Number(i.amount) || 0), 0),
)
const keywordsArray = computed(() =>
  formData.keywords ? formData.keywords.split(',').filter((k) => k.trim()) : [],
)

/** 字典中「其他」项 id（code=OTHER 或 name=其他） */
const otherResearchDomainId = computed(() => {
  const list = researchDomains.value
  const found = list.find((d) => d.code === 'OTHER' || d.name === '其他')
  return found?.id ?? ''
})

const needsDomainOther = computed(() => {
  const oid = otherResearchDomainId.value
  return !!oid && selectedDomains.value.includes(oid)
})

/** 当前步骤未满足的必填项（与 canProceed 规则一致，用于「下一步」提示） */
const getMissingForStep = (step: number): string[] => {
  const missing: string[] = []
  switch (step) {
    case 1: {
      if (!formData.title?.trim()) missing.push('项目标题')
      if (selectedDomains.value.length === 0) missing.push('研究领域（至少选一项）')
      if (needsDomainOther.value && !formData.project_domain_other_text?.trim()) {
        missing.push('「其他」研究领域具体说明')
      }
      if (!formData.keywords?.trim()) missing.push('关键词（至少一个）')
      break
    }
    case 2: {
      if (!formData.abstract?.trim()) missing.push('项目摘要')
      break
    }
    case 3: {
      // 验证团队成员
      if (teamMembers.value.length === 0) {
        missing.push('至少添加一个团队成员')
      } else {
        const hasPrincipal = teamMembers.value.some(m => m.role === 'principal')
        if (!hasPrincipal) {
          missing.push('至少指定一个项目负责人')
        }
        teamMembers.value.forEach((m, i) => {
          if (!m.email?.trim()) missing.push(`成员 ${i + 1} 的邮箱`)
          else if (!m.emailConfirmed) missing.push(`成员 ${i + 1} 的邮箱需要确认`)
          if (!m.name?.trim()) missing.push(`成员 ${i + 1} 的姓名`)
          if (!m.role) missing.push(`成员 ${i + 1} 的项目角色`)
        })
      }
      break
    }
    case 4: {
      if (totalBudget.value <= 0) missing.push('经费预算（合计金额需大于 0）')
      // 验证每条预算记录都有项目名称
      budgetItems.value.forEach((item, index) => {
        if (!item.item_name || !item.item_name.trim()) {
          missing.push(`预算第 ${index + 1} 行的项目名称`)
        }
      })
      break
    }
    case 5: {
      if (images.value.length === 0) missing.push('至少上传1张项目图片')
      break
    }
    default:
      break
  }
  return missing
}

const canProceed = computed(
  () => getMissingForStep(currentStep.value).length === 0,
)

const canSubmit = computed(() => canProceed.value && currentStep.value === steps.length)

// 方法
const getUserRoleText = (role?: string) => {
  const map: Record<string, string> = {
    applicant: '申请人',
    reviewer: '评审专家',
    project_manager: '项目经理',
    admin: '管理员',
  }
  return map[role || ''] || '用户'
}

const toggleDomain = (domainId: string) => {
  const index = selectedDomains.value.indexOf(domainId)
  if (index === -1) {
    selectedDomains.value.push(domainId)
  } else {
    selectedDomains.value.splice(index, 1)
  }
}

const addKeyword = () => {
  const kw = keywordInput.value.trim()
  if (kw) {
    const newKeywords = kw.split(/[\s,，]+/).filter((k) => k)
    const all = [...keywordsArray.value, ...newKeywords]
    formData.keywords = [...new Set(all)].slice(0, 10).join(',')
    keywordInput.value = ''
  }
}

const removeKeyword = (index: number) => {
  const arr = keywordsArray.value
  arr.splice(index, 1)
  formData.keywords = arr.join(',')
}

const MAX_LEN: Partial<Record<keyof WordImportPatches, number>> = {
  title: 200,
  project_domain_other_text: 500,
  keywords: 500,
  abstract: 500,
}

function applyWordPatches(p: WordImportPatches) {
  const entries = Object.entries(p).filter(
    (e): e is [keyof WordImportPatches, string] =>
      typeof e[1] === 'string' && (e[1] as string).trim() !== '',
  )
  for (const [k, v] of entries) {
    const max = MAX_LEN[k]
    const val = max != null ? v.slice(0, max) : v
    if (k in formData) (formData as Record<string, string>)[k as string] = val
  }
}

const triggerWordImport = () => {
  wordFileInput.value?.click()
}

const showWordImportHint = () => {
  ElMessageBox.alert(getWordImportTemplateHint(), 'Word 导入格式说明', {
    confirmButtonText: '知道了',
    customClass: 'word-import-hint-box',
  })
}

const onWordFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!file.name.toLowerCase().endsWith('.docx')) {
    ElMessage.warning('请上传 .docx 格式（Word 2007 及以上另存为）')
    return
  }
  wordImporting.value = true
  try {
    const buf = await file.arrayBuffer()
    const r = await parseProjectWordDocx(buf, researchDomains.value)
    applyWordPatches(r.patches)

    if (r.selectedDomainIds.length) {
      selectedDomains.value = [...r.selectedDomainIds]
    }
    if (r.achievementTransform.length) {
      achievementTransform.value = [...r.achievementTransform]
    }
    if (r.pocStageRequirement.length) {
      pocStageRequirement.value = [...r.pocStageRequirement]
    }

    if (r.extractedImages?.length) {
      const files = r.extractedImages.map((img, i) => {
        const base = img.fileName?.trim() || `image${i + 1}`
        const name = base.toLowerCase().startsWith('word-import-') ? base : `word-import-${base}`
        return new File([img.data], name, { type: img.mimeType })
      })
      await uploadImages(files)
    }

    const fieldCount = r.filledKeys.filter((k) => k !== 'images').length
    const imgCount = r.extractedImages?.length ?? 0
    if (fieldCount === 0 && imgCount === 0 && r.warnings.length) {
      ElMessage.warning(r.warnings[0] || '未能从文档中识别字段')
    } else {
      const segs: string[] = []
      if (fieldCount > 0) segs.push(`已从 Word 填入 ${fieldCount} 类字段`)
      if (imgCount > 0) segs.push(`已上传 ${imgCount} 张文档内图片`)
      if (segs.length) {
        ElMessage.success(`${segs.join('，')}，请核对后保存或提交`)
      } else {
        ElMessage.success('未识别到新内容，请确认使用标准征集表模板且章节标题完整')
      }
    }
    if (r.warnings.length) {
      ElMessageBox.alert(r.warnings.slice(0, 12).join('\n'), '导入提示', { confirmButtonText: '知道了' })
    }
  } catch (err: unknown) {
    console.error(err)
    ElMessage.error(err instanceof Error ? err.message : '解析 Word 失败')
  } finally {
    wordImporting.value = false
  }
}

const addTeamMember = () => {
  teamMembers.value.push({ name: '', email: '', organization: '', title: '', phone: '', role: 'other', isExistingUser: false, isChecking: false, emailConfirmed: false })
}

// 根据邮箱搜索用户
const searchUserByEmail = async (index: number) => {
  const member = teamMembers.value[index]
  if (!member.email || !member.email.trim()) {
    ElMessage.warning('请先输入邮箱')
    return
  }
  
  // 简单的邮箱格式验证
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(member.email.trim())) {
    ElMessage.warning('请输入有效的邮箱地址')
    return
  }
  
  // 检查邮箱是否已被其他成员使用
  const duplicateIndex = teamMembers.value.findIndex((m, i) => i !== index && m.email === member.email.trim())
  if (duplicateIndex !== -1) {
    ElMessage.warning('该邮箱已被其他成员使用')
    return
  }
  
  member.isChecking = true
  try {
    const response = await api.get(`/users/by-email?email=${encodeURIComponent(member.email.trim())}`) as any
    console.log('搜索用户响应:', response)
    if (response.success && response.data) {
      member.emailConfirmed = true
      if (response.data.exists && response.data.user) {
        // 用户存在，自动填充信息
        const user = response.data.user
        member.name = user.name || ''
        member.organization = user.department || ''
        member.title = user.title || ''
        member.phone = user.phone || ''
        member.isExistingUser = true
        ElMessage.success('已找到用户，信息已自动填充')
      } else {
        // 用户不存在，清空之前可能填充的信息
        member.name = ''
        member.organization = ''
        member.title = ''
        member.phone = ''
        member.isExistingUser = false
        ElMessage.info('未找到该邮箱对应的用户，请填写以下信息')
      }
    } else {
      ElMessage.error('搜索用户失败：' + (response.error || '未知错误'))
    }
  } catch (error: any) {
    console.error('查找用户失败:', error)
    ElMessage.error('搜索用户失败：' + (error.message || '网络错误'))
    member.isExistingUser = false
  } finally {
    member.isChecking = false
  }
}

// 处理邮箱输入blur事件，查找用户（可选，如果用户不想点击搜索按钮）
const handleEmailBlur = async (index: number) => {
  // blur事件不再自动搜索，避免干扰用户输入
  // 用户需要主动点击搜索按钮
}

const removeTeamMember = (index: number) => {
  if (teamMembers.value.length > 1) teamMembers.value.splice(index, 1)
}

const addBudgetItem = () => {
  budgetItems.value.push({ category: '', item_name: '', description: '', amount: 0 })
}

const removeBudgetItem = (index: number) => {
  if (budgetItems.value.length > 1) budgetItems.value.splice(index, 1)
}

const calculateTotal = () => {}

const nextStep = () => {
  if (currentStep.value >= steps.length) return
  const missing = getMissingForStep(currentStep.value)
  if (missing.length > 0) {
    ElMessage.warning({
      message: `请完善以下必填项后再进入下一步：${missing.join('、')}`,
      duration: 5500,
      showClose: true,
    })
    return
  }
  currentStep.value++
  window.scrollTo(0, 0)
}
const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
    window.scrollTo(0, 0)
  }
}
const jumpToStep = (step: number) => {
  if (step <= currentStep.value) {
    currentStep.value = step
    window.scrollTo(0, 0)
  }
}

// 图片相关方法
const imageInput = ref<HTMLInputElement | null>(null)

const triggerImageInput = () => {
  imageInput.value?.click()
}

const handleImageSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  await uploadImages(files)
  if (input) input.value = ''
}

const handleImageDrop = async (event: DragEvent) => {
  const files = Array.from(event.dataTransfer?.files || [])
  const imageFiles = files.filter(f => f.type.startsWith('image/'))
  await uploadImages(imageFiles)
}

const uploadImages = async (files: File[]) => {
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      ElMessage.warning(`文件 ${file.name} 不是图片格式`)
      continue
    }
    if (file.size > 10 * 1024 * 1024) {
      ElMessage.warning(`图片 ${file.name} 超过10MB限制`)
      continue
    }

    const tempId = Date.now() + Math.random()
    // 创建本地预览URL
    const preview = URL.createObjectURL(file)
    const tempImage = {
      id: tempId,
      originalName: file.name,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      uploading: true,
      progress: 0,
      description: '',
      preview: preview,
    }
    images.value.push(tempImage)
    const index = images.value.findIndex((a) => a.id === tempId)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = (await api.post('/projects/upload-attachment', formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && images.value[index]) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            images.value[index].progress = percentCompleted
          }
        },
      })) as { success?: boolean; data?: Record<string, unknown>; error?: string }

      if (response.success && response.data) {
        // 释放本地预览URL
        URL.revokeObjectURL(images.value[index].preview)
        images.value[index] = {
          ...images.value[index],
          ...response.data,
          uploading: false,
          progress: 100,
          preview: null,
        }
        ElMessage.success(`图片 ${file.name} 上传成功`)
      } else {
        URL.revokeObjectURL(images.value[index].preview)
        images.value.splice(index, 1)
        ElMessage.error(`图片 ${file.name} 上传失败`)
      }
    } catch (error) {
      URL.revokeObjectURL(images.value[index].preview)
      images.value.splice(index, 1)
      console.error('上传失败:', error)
      ElMessage.error(`图片 ${file.name} 上传失败`)
    }
  }
}

const removeImage = (index: number) => {
  const image = images.value[index]
  if (image.preview) {
    URL.revokeObjectURL(image.preview)
  }
  images.value.splice(index, 1)
}

const previewImage = (image: any) => {
  if (image.file_path) {
    window.open(`${getApiOrigin()}${image.file_path}`, '_blank')
  }
}

// 附件相关方法
const getFileIcon = (mimeType: string) => {
  if (!mimeType) return '📎'
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType === 'application/pdf') return '📄'
  if (mimeType.includes('word')) return '📝'
  if (mimeType.includes('zip')) return '🗜️'
  return '📎'
}

const formatFileSize = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  await uploadFiles(files)
  if (input) input.value = ''
}

const handleDrop = async (event: DragEvent) => {
  const files = Array.from(event.dataTransfer?.files || [])
  await uploadFiles(files)
}

const uploadFiles = async (files: File[]) => {
  for (const file of files) {
    if (file.size > 10 * 1024 * 1024) {
      ElMessage.warning(`文件 ${file.name} 超过10MB限制`)
      continue
    }

    const tempId = Date.now() + Math.random()
    const tempAttachment = {
      id: tempId,
      originalName: file.name,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      uploading: true,
      progress: 0,
      description: '',
    }
    attachments.value.push(tempAttachment)
    const index = attachments.value.findIndex((a) => a.id === tempId)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = (await api.post('/projects/upload-attachment', formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && attachments.value[index]) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            attachments.value[index].progress = percentCompleted
          }
        },
      })) as { success?: boolean; data?: Record<string, unknown>; error?: string }

      if (response.success && response.data) {
        attachments.value[index] = {
          ...attachments.value[index],
          ...response.data,
          uploading: false,
          progress: 100,
        }
        ElMessage.success(`文件 ${file.name} 上传成功`)
      } else {
        attachments.value.splice(index, 1)
        ElMessage.error(`文件 ${file.name} 上传失败`)
      }
    } catch (error) {
      attachments.value.splice(index, 1)
      console.error('上传失败:', error)
      ElMessage.error(`文件 ${file.name} 上传失败`)
    }
  }
}

const removeAttachment = (index: number) => {
  attachments.value.splice(index, 1)
}

// 保存草稿（提交前静默保存用 { silent: true }，避免重复提示）
// 新建项目时后端要求至少：标题 + 一个研究领域，否则会 400
const saveDraft = async (options?: { silent?: boolean }): Promise<boolean> => {
  const silent = options?.silent === true
  const isNewProject = !currentProject.value?.id

  if (isNewProject) {
    if (!formData.title?.trim()) {
      ElMessage.warning(
        silent ? '提交失败：请先填写项目标题' : '保存草稿前请先填写项目标题',
      )
      return false
    }
    if (selectedDomains.value.length === 0) {
      ElMessage.warning(
        silent
          ? '提交失败：请至少选择一个研究领域'
          : '请至少选择一个研究领域后再保存草稿',
      )
      return false
    }
    if (needsDomainOther.value && !formData.project_domain_other_text.trim()) {
      ElMessage.warning(
        silent
          ? '提交失败：已选择「其他」时请填写具体研究领域说明'
          : '已选择「其他」研究领域时，请填写具体方向说明后再保存',
      )
      return false
    }
  }

  saving.value = true
  try {
    const payload = {
      title: formData.title,
      research_domains: selectedDomains.value,
      project_domain_other_text: formData.project_domain_other_text.trim() || null,
      tech_maturity: formData.tech_maturity,
      achievement_transform: achievementTransform.value,
      achievement_transform_other_text: formData.achievement_transform_other_text,
      poc_stage_requirement: pocStageRequirement.value,
      poc_multi_stage_note: formData.poc_multi_stage_note,
      keywords: formData.keywords,
      abstract: formData.abstract,
      detailed_introduction_part1: formData.detailed_introduction_part1,
      detailed_introduction_part2: formData.detailed_introduction_part2,
      detailed_introduction_part3: formData.detailed_introduction_part3,
      implementation_plan: formData.implementation_plan,
      supplementary_info: formData.supplementary_info,
      team_members: teamMembers.value.map(m => ({
        name: m.name,
        email: m.email,
        organization: m.organization,
        title: m.title,
        phone: m.phone,
        role: m.role,
      })),
      budget_items: budgetItems.value,
      images: images.value.map((img) => ({
        file_name: img.originalName || img.file_name,
        file_path: img.file_path,
        file_size: img.file_size,
        mime_type: img.mime_type,
        type: 'image',
        description: img.description || '',
      })),
      attachments: attachments.value.map((att) => ({
        file_name: att.originalName || att.file_name,
        file_path: att.file_path,
        file_size: att.file_size,
        mime_type: att.mime_type,
        type: 'attachment',
        description: att.description || '',
      })),
    }

    console.log('📤 发送的payload:', JSON.stringify(payload, null, 2))
    console.log('📤 achievement_transform 类型:', typeof payload.achievement_transform, '值:', payload.achievement_transform)
    console.log('📤 poc_stage_requirement 类型:', typeof payload.poc_stage_requirement, '值:', payload.poc_stage_requirement)
    
    const response = currentProject.value?.id
      ? await api.put(`/projects/${currentProject.value.id}`, payload)
      : await api.post('/projects', payload)

    if (response.success) {
      if (response.data?.id) currentProject.value = response.data
      isEditing.value = true
      if (!silent) ElMessage.success('草稿保存成功')
      return true
    }
    if (!silent && (response as any)?.error)
      ElMessage.error((response as any).error)
    return false
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { data?: { error?: string } } }
    const msg =
      err.response?.data?.error || err.message || '保存失败'
    ElMessage.error(msg)
    return false
  } finally {
    saving.value = false
  }
}

const handleSubmit = () => {
  if (selectedDomains.value.length === 0) {
    ElMessage.warning('请至少选择一个研究领域')
    return
  }
  if (
    needsDomainOther.value &&
    !formData.project_domain_other_text.trim()
  ) {
    ElMessage.warning('已选择「其他」研究领域时，请在下方填写具体方向说明')
    return
  }
  if (!canSubmit.value) {
    ElMessage.warning('请完成所有必填项后再提交')
    return
  }
  showConfirmDialog.value = true
}

const confirmSubmit = async () => {
  submitting.value = true
  try {
    const saved = await saveDraft({ silent: true })
    if (!saved || !currentProject.value?.id) {
      return
    }

    const response = await api.put(`/projects/${currentProject.value.id}`, {
      status: 'submitted',
      submit_date: new Date().toISOString().split('T')[0],
      attachments: attachments.value.map((att) => ({
        file_name: att.originalName || att.file_name,
        file_path: att.file_path,
        file_size: att.file_size,
        mime_type: att.mime_type,
        type: att.mime_type?.startsWith('image/') ? 'image' : 'attachment',
        description: att.description || attachmentDescription.value,
      })),
    })

    if (response.success) {
      ElMessage.success('项目提交成功！')
      setTimeout(() => router.push('/projects'), 1500)
    } else {
      ElMessage.error(response.error || '提交失败')
    }
  } catch (error: any) {
    console.error('提交失败:', error)
    ElMessage.error(error.message || '提交失败')
  } finally {
    submitting.value = false
    showConfirmDialog.value = false
  }
}

const goBack = async () => {
  try {
    await ElMessageBox.confirm('确定要离开吗？未保存的内容将会丢失。', '确认离开', {
      type: 'warning',
    })
    router.push('/applicant/dashboard')
  } catch {}
}

const loadCurrentUser = async () => {
  const info = localStorage.getItem('userInfo')
  if (info) currentUser.value = JSON.parse(info)
  else currentUser.value = { name: '用户', role: 'applicant' }
  dbConnected.value = true
}

// 固定的研究领域列表
const FIXED_RESEARCH_DOMAINS = [
  { id: 'ai-ml', name: '人工智能与机器学习', code: 'AI_ML' },
  { id: 'bigdata-gov', name: '大数据与数据治理', code: 'BIGDATA_GOV' },
  { id: 'ic-design', name: '集成电路设计与应用', code: 'IC_DESIGN' },
  { id: 'digital-twin', name: '数字孪生与元宇宙', code: 'DIGITAL_TWIN' },
  { id: 'industrial-sw', name: '工业软件与智能制造', code: 'INDUSTRIAL_SW' },
  { id: 'cyber-security', name: '网络安全与数据安全', code: 'CYBER_SECURITY' },
  { id: 'other', name: '其他', code: 'OTHER' },
]

const loadResearchDomains = async () => {
  // 使用固定的研究领域列表，不再从后端获取
  researchDomains.value = FIXED_RESEARCH_DOMAINS
}

const toggleDebugInfo = () => {
  showDebugInfo.value = !showDebugInfo.value
}

/** 编辑草稿：路由可能是 /projects/edit/:id（params）或 /projects/create?id=（query） */
const resolveRouteProjectId = (): string | undefined => {
  const p = route.params.id
  const fromParam = Array.isArray(p) ? p[0] : p
  if (fromParam != null && String(fromParam).trim() !== '') return String(fromParam)
  const q = route.query.id
  const fromQuery = Array.isArray(q) ? q[0] : q
  if (fromQuery != null && String(fromQuery).trim() !== '') return String(fromQuery)
  return undefined
}

const loadProjectForEdit = async (projectId: string) => {
  loading.value = true
  try {
    const res = await api.get(`/projects/${projectId}`)
    if (!res?.success || !res.data) {
      ElMessage.error((res as any)?.error || '加载项目失败')
      return
    }
    const d = res.data
    isEditing.value = true
    currentProject.value = { id: d.id, project_code: d.project_code, title: d.title }
    formData.title = d.title || ''
    formData.tech_maturity = d.tech_maturity || ''
    formData.achievement_transform_other_text = d.achievement_transform_other_text || ''
    formData.poc_multi_stage_note = d.poc_multi_stage_note || ''
    formData.project_domain_other_text = d.project_domain_other_text || ''
    formData.keywords = d.keywords || ''
    formData.abstract = d.abstract || ''
    formData.detailed_introduction_part1 = d.detailed_introduction_part1 || ''
    formData.detailed_introduction_part2 = d.detailed_introduction_part2 || ''
    formData.detailed_introduction_part3 = d.detailed_introduction_part3 || ''
    formData.implementation_plan = d.implementation_plan || ''
    formData.supplementary_info = d.supplementary_info || ''
    const at = d.achievement_transform
    console.log('📥 加载项目 - achievement_transform:', at, '类型:', typeof at)
    achievementTransform.value = Array.isArray(at)
      ? at
      : String(at || '')
          .split(',')
          .filter(Boolean)
    console.log('📥 加载项目 - 处理后的 achievementTransform:', achievementTransform.value)
    const pocs = d.poc_stage_requirement
    pocStageRequirement.value = Array.isArray(pocs)
      ? pocs
      : String(pocs || '')
          .split(',')
          .filter(Boolean)
    selectedDomains.value = (d.research_domains || []).map((x: string | { id: string }) =>
      typeof x === 'string' ? x : x.id,
    )
    if (d.team_members?.length) {
      teamMembers.value = d.team_members.map((m: Record<string, unknown>) => ({
        name: (m.name as string) || '',
        email: (m.email as string) || '',
        organization: (m.organization as string) || '',
        title: (m.title as string) || '',
        phone: (m.phone as string) || '',
        role: (m.role as string) || 'other',
        isExistingUser: !!(m.user_id),
        isChecking: false,
        emailConfirmed: !!(m.email),
      }))
    }
    if (d.budget_items?.length) {
      budgetItems.value = d.budget_items.map((b: Record<string, unknown>) => ({
        category: (b.category as string) || '',
        item_name: (b.item_name as string) || '',
        description: (b.description as string) || '',
        amount: Number(b.amount) || 0,
      }))
    }
    // 加载图片和附件
    images.value = []
    attachments.value = []
    if (d.attachments?.length) {
      d.attachments.forEach((a: Record<string, unknown>) => {
        const item = {
          id: a.id,
          file_name: a.file_name,
          originalName: a.file_name,
          file_path: a.file_path,
          file_size: a.file_size,
          mime_type: a.mime_type,
          description: a.description || '',
          uploading: false,
          progress: 100,
        }
        if (a.type === 'image' || (a.mime_type as string)?.startsWith('image/')) {
          images.value.push(item)
        } else {
          attachments.value.push(item)
        }
      })
    }
  } catch (e: unknown) {
    const err = e as { message?: string }
    ElMessage.error(err?.message || '加载项目失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  formData.submit_date = new Date().toISOString().split('T')[0]
  await loadCurrentUser()
  await loadResearchDomains()
  const id = resolveRouteProjectId()
  if (id) {
    await loadProjectForEdit(id)
  }
})

watch(
  () => resolveRouteProjectId(),
  async (id, prev) => {
    if (!id || id === prev) return
    await loadResearchDomains()
    await loadProjectForEdit(id)
  },
)
</script>

<style scoped>
.create-project-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.header-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
}

.back-workbench-box {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 10px 18px;
  border: 1px solid rgba(179, 27, 27, 0.35);
  border-radius: 8px;
  background: linear-gradient(180deg, #fffbfb 0%, #fff5f5 100%);
  color: #b31b1b;
  font-size: 15px;
  font-weight: 500;
  font-family: 'STZhongsong', '华文中宋', 'SimSun', serif;
  cursor: pointer;
  transition:
    background 0.2s,
    border-color 0.2s,
    box-shadow 0.2s;
}

.back-workbench-box:hover {
  background: #fff0f0;
  border-color: #b31b1b;
  box-shadow: 0 2px 8px rgba(179, 27, 27, 0.12);
}

.back-workbench-box:active {
  background: #ffe8e8;
}

.back-workbench-box .back-icon {
  font-size: 18px;
}

.header-left h1 {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.draft-info {
  color: #fa8c16;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.primary-btn,
.secondary-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.primary-btn {
  background: #b31b1b;
  color: white;
}

.primary-btn:hover:not(:disabled) {
  background: #8b0000;
}

.primary-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.secondary-btn {
  background: #f5f7fa;
  color: #666;
  border: 1px solid #d9d9d9;
}

.secondary-btn:hover {
  background: #e8e8e8;
}

.db-status-bar {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 8px;
  padding: 12px 20px;
  margin-bottom: 20px;
}

.db-status-content {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.db-status-label {
  font-weight: bold;
  color: #52c41a;
}

.db-status-value {
  font-weight: bold;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 14px;
}

.db-status-value.connected {
  background: #d9f7be;
  color: #389e0d;
}

.db-user-info {
  color: #666;
  font-size: 14px;
}

.db-toggle-btn {
  padding: 4px 12px;
  background: #b31b1b;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  margin-left: auto;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #b31b1b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-text {
  margin-top: 20px;
  color: #b31b1b;
  font-weight: bold;
}

.error-alert {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 8px;
  padding: 12px 20px;
  margin-bottom: 20px;
}

.error-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.error-icon {
  font-size: 20px;
}

.error-text {
  flex: 1;
  color: #ff4d4f;
}

.error-close {
  background: none;
  border: none;
  font-size: 20px;
  color: #999;
  cursor: pointer;
}

.steps-container {
  display: flex;
  margin-bottom: 32px;
  background: white;
  border-radius: 12px;
  padding: 16px 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.step-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f5f5f5;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.step-item.active .step-number {
  background: #b31b1b;
  color: white;
}

.step-item.completed .step-number {
  background: #52c41a;
  color: white;
}

.step-label {
  font-size: 14px;
  color: #666;
}

.step-item.active .step-label {
  color: #b31b1b;
  font-weight: 500;
}

.step-content {
  background: white;
  border-radius: 12px;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.section-card {
  margin-bottom: 32px;
}

.section-card:last-child {
  margin-bottom: 0;
}

.section-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  padding-bottom: 12px;
  border-bottom: 2px solid #b31b1b;
}

.section-title-row .section-title {
  margin: 0;
  padding-bottom: 0;
  border-bottom: none;
  flex: 1;
  min-width: 200px;
}

.word-import-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.word-file-input {
  display: none;
}

.word-import-btn {
  white-space: nowrap;
}

.link-btn {
  background: none;
  border: none;
  color: #b31b1b;
  cursor: pointer;
  font-size: 14px;
  text-decoration: underline;
  padding: 4px 0;
}

.link-btn:hover {
  color: #8a1515;
}

.section-title {
  font-size: 18px;
  color: #2c3e50;
  margin: 0 0 24px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #b31b1b;
}

.section-subtitle {
  color: #666;
  margin: -16px 0 24px 0;
  font-size: 14px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group.full-width {
  width: 100%;
  grid-column: span 2;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #34495e;
}

.required {
  color: #ff4d4f;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.3s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #b31b1b;
  box-shadow: 0 0 0 2px rgba(179, 27, 27, 0.2);
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.form-group input[disabled] {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

.char-counter {
  text-align: right;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.form-hint {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.required-hint {
  color: #ff4d4f;
  margin-left: 8px;
}

/* 研究领域按钮 */
.domains-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
}

.domain-btn {
  padding: 10px 20px;
  background: #f5f7fa;
  border: 1px solid #e0e0e0;
  border-radius: 30px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.25s ease;
  color: #555;
  font-weight: 500;
}

.domain-btn:hover:not(:disabled) {
  background: #fde8e8;
  border-color: #b31b1b;
  color: #b31b1b;
  transform: translateY(-2px);
}

.domain-btn.active {
  background: #b31b1b;
  border-color: #b31b1b;
  color: white;
}

.domain-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 复选框组 */
.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-weight: normal;
}

.other-input {
  width: 100%;
  margin-top: 12px;
}

.other-input label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #34495e;
}

.hint-inline {
  font-weight: normal;
  font-size: 12px;
  color: #909399;
  margin-left: 6px;
}

/* 关键词标签 */
.tags-input {
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 8px;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.tag {
  background: #fde8e8;
  color: #b31b1b;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.remove-tag {
  cursor: pointer;
  font-size: 16px;
}

.tags-input input {
  border: none;
  padding: 8px;
  width: 100%;
}

.tags-input input:focus {
  outline: none;
  box-shadow: none;
}

/* 团队成员 */
.team-members {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 20px;
}

.team-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.team-header h4 {
  margin: 0;
  font-size: 16px;
}

.add-btn {
  padding: 6px 16px;
  background: #b31b1b;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.member-card {
  padding: 16px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  margin-bottom: 16px;
}

.member-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.remove-btn {
  padding: 4px 12px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  color: #ff4d4f;
  border-radius: 4px;
  cursor: pointer;
}

.confirm-email-btn {
  padding: 10px 20px;
  background: #b31b1b;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
  height: fit-content;
  margin-bottom: 8px;
}

.confirm-email-btn:hover:not(:disabled) {
  background: #8b0000;
}

.confirm-email-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.member-details {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #e0e0e0;
}

/* 预算表格 */
.budget-table {
  overflow-x: auto;
  margin-bottom: 24px;
}

.budget-table table {
  width: 100%;
  border-collapse: collapse;
}

.budget-table th,
.budget-table td {
  padding: 12px;
  border: 1px solid #e8e8e8;
  text-align: left;
}

.budget-table th {
  background: #f5f7fa;
}

.budget-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.budget-table input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.total-label {
  font-weight: bold;
  text-align: right;
}

.total-amount {
  font-weight: bold;
  color: #b31b1b;
  font-size: 18px;
}

.table-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.table-btn.primary {
  background: #b31b1b;
  color: white;
}

.table-btn.danger {
  background: #fff2f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
}

/* 图片展示 */
.images-section {
  margin-bottom: 24px;
}

.images-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.image-item {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.image-preview {
  width: 100%;
  height: 180px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.image-preview img:hover {
  transform: scale(1.05);
}

.image-placeholder {
  color: #999;
  font-size: 14px;
}

.image-info {
  padding: 12px;
}

.image-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-size {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
}

.image-description input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}

.image-description input:focus {
  outline: none;
  border-color: #b31b1b;
}

.image-actions {
  position: absolute;
  top: 8px;
  right: 8px;
}

.image-actions .remove-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.no-images-hint {
  text-align: center;
  padding: 40px;
  color: #999;
  background: #f9f9f9;
  border-radius: 8px;
  margin-top: 20px;
}

/* 附件上传 */
.attachments-section {
  margin-bottom: 24px;
}

.attachment-description {
  padding: 8px 16px;
  background: #f9f9f9;
}

.attachment-description input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}

.attachment-description input:focus {
  outline: none;
  border-color: #b31b1b;
}

.upload-area {
  border: 2px dashed #d9d9d9;
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: #fafafa;
}

.upload-area:hover {
  border-color: #b31b1b;
  background: #fef6f6;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.upload-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload-text span:first-child {
  font-size: 16px;
  color: #333;
}

.upload-hint {
  font-size: 12px;
  color: #999;
}

.attachments-list {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.attachment-item {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 12px 16px;
  border: 1px solid #e8e8e8;
}

.attachment-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.attachment-icon {
  font-size: 24px;
}

.attachment-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.attachment-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.attachment-size {
  font-size: 12px;
  color: #999;
}

.attachment-actions {
  display: flex;
  gap: 8px;
}

.preview-btn,
.attachment-actions .remove-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s;
}

.preview-btn:hover,
.attachment-actions .remove-btn:hover {
  background: #f0f0f0;
}

.upload-progress {
  margin-top: 8px;
  height: 4px;
  background: #e8e8e8;
  border-radius: 2px;
  overflow: hidden;
}

.upload-progress .progress-fill-bar {
  height: 100%;
  background: #b31b1b;
  border-radius: 2px;
  transition: width 0.3s;
}

/* 底部导航 */
.step-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.nav-btn {
  padding: 12px 32px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.nav-btn.primary {
  background: #b31b1b;
  color: white;
}

.nav-btn.secondary {
  background: #f5f7fa;
  color: #666;
  border: 1px solid #d9d9d9;
}

.nav-btn.success {
  background: #52c41a;
  color: white;
}

.step-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.step-progress span {
  font-size: 14px;
  color: #666;
}

.progress-bar {
  width: 200px;
  height: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #b31b1b;
  transition: width 0.3s;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 32px;
  max-width: 500px;
  width: 90%;
  text-align: center;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
}

.modal-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.modal-btn.primary {
  background: #b31b1b;
  color: white;
}

.modal-btn.secondary {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #d9d9d9;
}

/* 响应式 */
@media (max-width: 768px) {
  .create-project-container {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .header-right {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }

  .header-actions {
    flex-wrap: wrap;
    justify-content: center;
  }

  .back-workbench-box {
    width: 100%;
    justify-content: center;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .form-group.full-width {
    grid-column: span 1;
  }

  .steps-container {
    flex-wrap: wrap;
    gap: 12px;
  }

  .step-item {
    flex: none;
    width: calc(50% - 12px);
  }

  .step-navigation {
    flex-direction: column;
    gap: 16px;
  }

  .nav-left,
  .nav-right {
    width: 100%;
  }

  .nav-btn {
    width: 100%;
  }

  .nav-center {
    display: none;
  }
}
</style>
