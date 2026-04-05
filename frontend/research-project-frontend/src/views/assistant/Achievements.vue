<!-- src/views/assistant/AuditAchievements.vue -->
<template>
  <div class="audit-achievements-page">
    <!-- 页面标题和操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">科研成果审核管理</h1>
        <div class="breadcrumb">
          <span>工作台</span>
          <span class="separator">/</span>
          <span class="current">成果审核</span>
        </div>
      </div>
      <div class="header-right">
        <div class="filter-bar">
          <el-input
            v-model="searchQuery"
            placeholder="搜索成果标题、关键词、项目..."
            class="search-input"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-select
            v-model="filterStatus"
            placeholder="审核状态"
            clearable
            class="status-filter"
            @change="handleFilter"
          >
            <el-option label="全部" value="all" />
            <el-option label="待审核" value="submitted" />
            <el-option label="审核中" value="under_review" />
            <el-option label="已核实" value="verified" />
            <el-option label="已发布" value="published" />
            <el-option label="已转化" value="transferred" />
            <el-option label="已驳回" value="rejected" />
          </el-select>

          <el-select
            v-model="filterType"
            placeholder="成果类型"
            clearable
            class="type-filter"
            @change="handleFilter"
          >
            <el-option label="论文" value="paper" />
            <el-option label="专利" value="patent" />
            <el-option label="软件著作权" value="software" />
            <el-option label="研究报告" value="report" />
            <el-option label="原型样机" value="prototype" />
            <el-option label="技术标准" value="standard" />
            <el-option label="其他" value="other" />
          </el-select>

          <el-select
            v-model="filterYear"
            placeholder="成果年份"
            clearable
            class="year-filter"
            @change="handleFilter"
          >
            <el-option v-for="year in years" :key="year" :label="year + '年'" :value="year" />
          </el-select>

          <el-button type="primary" @click="handleSearch" :loading="loading">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>

          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards" v-if="!loading">
      <el-row :gutter="20">
        <el-col :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
          <div class="stat-card pending">
            <div class="stat-content">
              <div class="stat-number">{{ stats.pending || 0 }}</div>
              <div class="stat-label">待审核</div>
            </div>
            <div class="stat-icon">
              <span class="icon">⏳</span>
            </div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
          <div class="stat-card reviewing">
            <div class="stat-content">
              <div class="stat-number">{{ stats.reviewing || 0 }}</div>
              <div class="stat-label">审核中</div>
            </div>
            <div class="stat-icon">
              <span class="icon">📝</span>
            </div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
          <div class="stat-card verified">
            <div class="stat-content">
              <div class="stat-number">{{ stats.verified || 0 }}</div>
              <div class="stat-label">已核实</div>
            </div>
            <div class="stat-icon">
              <span class="icon">✅</span>
            </div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
          <div class="stat-card published">
            <div class="stat-content">
              <div class="stat-number">{{ stats.published || 0 }}</div>
              <div class="stat-label">已发布</div>
            </div>
            <div class="stat-icon">
              <span class="icon">📢</span>
            </div>
          </div>
        </el-col>
      </el-row>

      <!-- 类型统计 -->
      <el-row :gutter="20" style="margin-top: 20px">
        <el-col :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
          <div class="stat-card paper">
            <div class="stat-content">
              <div class="stat-number">{{ stats.by_type?.paper || 0 }}</div>
              <div class="stat-label">论文成果</div>
            </div>
            <div class="stat-icon">
              <span class="icon">📄</span>
            </div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
          <div class="stat-card patent">
            <div class="stat-content">
              <div class="stat-number">{{ stats.by_type?.patent || 0 }}</div>
              <div class="stat-label">专利成果</div>
            </div>
            <div class="stat-icon">
              <span class="icon">📜</span>
            </div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
          <div class="stat-card software">
            <div class="stat-content">
              <div class="stat-number">{{ stats.by_type?.software || 0 }}</div>
              <div class="stat-label">软件著作权</div>
            </div>
            <div class="stat-icon">
              <span class="icon">💻</span>
            </div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
          <div class="stat-card others">
            <div class="stat-content">
              <div class="stat-number">{{ stats.by_type?.others || 0 }}</div>
              <div class="stat-label">其他成果</div>
            </div>
            <div class="stat-icon">
              <span class="icon">📊</span>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="8" animated />
    </div>

    <!-- 主要表格 -->
    <div v-else class="main-content">
      <el-card class="table-card">
        <template #header>
          <div class="table-header">
            <span class="table-title">科研成果列表</span>
            <div class="table-actions">
              <el-button type="info" size="small" @click="exportToExcel">
                <el-icon><Download /></el-icon>
                导出
              </el-button>
              <el-button
                type="success"
                size="small"
                @click="batchVerify"
                :disabled="selectedIds.length === 0"
              >
                <el-icon><Check /></el-icon>
                批量核实
              </el-button>
              <el-button
                type="warning"
                size="small"
                @click="batchReject"
                :disabled="selectedIds.length === 0"
              >
                <el-icon><Close /></el-icon>
                批量驳回
              </el-button>
              <el-button
                type="primary"
                size="small"
                @click="batchPublish"
                :disabled="selectedIds.length === 0"
              >
                <el-icon><Promotion /></el-icon>
                批量发布
              </el-button>
            </div>
          </div>
        </template>

        <el-table
          v-loading="tableLoading"
          :data="achievementList"
          @selection-change="handleSelectionChange"
          style="width: 100%"
          :header-cell-style="{ background: '#f5f7fa', color: '#333' }"
        >
          <el-table-column type="selection" width="55" align="center" />

          <el-table-column prop="title" label="成果标题" min-width="250">
            <template #default="{ row }">
              <div class="achievement-title-cell">
                <div class="achievement-title">{{ row.title }}</div>
                <div class="achievement-meta">
                  <el-tag :type="getTypeTagType(row.type)" size="small">
                    {{ getTypeText(row.type) }}
                  </el-tag>
                  <span class="achievement-keywords">{{ formatKeywords(row.keywords) }}</span>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="project_info.title" label="关联项目" width="180">
            <template #default="{ row }">
              <div class="project-info-cell">
                <div class="project-title">{{ row.project_info?.title }}</div>
                <div class="project-code">{{ row.project_info?.project_code }}</div>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="authors" label="作者" width="120">
            <template #default="{ row }">
              <div class="authors-cell">
                {{ formatAuthors(row.authors) }}
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="achievement_date" label="成果日期" width="120" sortable>
            <template #default="{ row }">
              {{ formatDate(row.achievement_date) }}
            </template>
          </el-table-column>

          <el-table-column prop="status" label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.status)" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="verified_date" label="核实日期" width="120">
            <template #default="{ row }">
              {{ row.verified_date ? formatDate(row.verified_date) : '--' }}
            </template>
          </el-table-column>

          <el-table-column prop="verifier_info.name" label="审核人" width="100">
            <template #default="{ row }">
              <div class="verifier-cell">{{ row.verifier_info?.name || '--' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button size="small" type="primary" plain @click="viewDetail(row)">
                  <el-icon><View /></el-icon>
                  详情
                </el-button>

                <el-button
                  v-if="row.status === 'submitted' || row.status === 'under_review'"
                  size="small"
                  type="success"
                  plain
                  @click="handleVerify(row)"
                >
                  <el-icon><Check /></el-icon>
                  核实
                </el-button>

                <el-button
                  v-if="row.status === 'submitted' || row.status === 'under_review'"
                  size="small"
                  type="danger"
                  plain
                  @click="handleReject(row)"
                >
                  <el-icon><Close /></el-icon>
                  驳回
                </el-button>

                <el-button
                  v-if="row.status === 'verified'"
                  size="small"
                  type="warning"
                  plain
                  @click="handlePublish(row)"
                >
                  <el-icon><Promotion /></el-icon>
                  发布
                </el-button>

                <el-button
                  v-if="row.status === 'verified' || row.status === 'published'"
                  size="small"
                  type="info"
                  plain
                  @click="handleTransfer(row)"
                >
                  <el-icon><Transfer /></el-icon>
                  转化
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.current"
            v-model:page-size="pagination.size"
            :total="pagination.total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="`科研成果详情 - ${currentDetail?.title || ''}`"
      width="900px"
      @closed="handleDialogClosed"
    >
      <div v-if="currentDetail" class="detail-content">
        <el-tabs v-model="activeTab">
          <!-- 基本信息标签页 -->
          <el-tab-pane label="基本信息" name="basic">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="成果标题">
                {{ currentDetail.title }}
              </el-descriptions-item>
              <el-descriptions-item label="成果类型">
                <el-tag :type="getTypeTagType(currentDetail.type)" size="small">
                  {{ getTypeText(currentDetail.type) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="关联项目">
                {{ currentDetail.project_info?.title }}
                <div class="sub-info">项目编号：{{ currentDetail.project_info?.project_code }}</div>
              </el-descriptions-item>
              <el-descriptions-item label="成果状态">
                <el-tag :type="getStatusTagType(currentDetail.status)" size="small">
                  {{ getStatusText(currentDetail.status) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="成果日期">
                {{ formatDate(currentDetail.achievement_date) }}
              </el-descriptions-item>
              <el-descriptions-item label="创建人">
                {{ currentDetail.creator_info?.name }}
                ({{ currentDetail.creator_info?.department }})
              </el-descriptions-item>
              <el-descriptions-item label="作者列表" :span="2">
                <div class="authors-list">
                  <el-tag
                    v-for="(author, index) in parseAuthors(currentDetail.authors)"
                    :key="index"
                    size="small"
                    style="margin-right: 8px; margin-bottom: 8px"
                  >
                    {{ author }}
                  </el-tag>
                </div>
              </el-descriptions-item>
              <el-descriptions-item label="关键词" :span="2">
                <div class="keywords-list">
                  <el-tag
                    v-for="(keyword, index) in formatKeywordsArray(currentDetail.keywords)"
                    :key="index"
                    type="info"
                    size="small"
                    style="margin-right: 8px; margin-bottom: 8px"
                  >
                    {{ keyword }}
                  </el-tag>
                </div>
              </el-descriptions-item>
              <el-descriptions-item label="成果描述" :span="2">
                <div class="description-content">{{ currentDetail.description || '无' }}</div>
              </el-descriptions-item>
              <el-descriptions-item label="外部链接" :span="2">
                <div class="external-link">
                  <el-link
                    v-if="currentDetail.external_link"
                    :href="currentDetail.external_link"
                    target="_blank"
                    type="primary"
                  >
                    {{ currentDetail.external_link }}
                    <el-icon><Link /></el-icon>
                  </el-link>
                  <span v-else>无</span>
                </div>
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>

          <!-- 附件材料标签页 -->
          <el-tab-pane label="附件材料" name="attachments">
            <div class="attachments-section">
              <h4>成果附件</h4>
              <div v-if="currentDetail.attachment_urls?.length > 0" class="docs-grid">
                <div
                  v-for="(doc, index) in currentDetail.attachment_urls"
                  :key="index"
                  class="doc-card"
                >
                  <div class="doc-preview" @click="previewFile(doc)">
                    <el-icon v-if="isImageFile(doc)" size="40"><Picture /></el-icon>
                    <el-icon v-else-if="isPdfFile(doc)" size="40"><Document /></el-icon>
                    <el-icon v-else size="40"><Files /></el-icon>
                    <div class="doc-name">{{ getFileName(doc) }}</div>
                    <div class="doc-size">{{ formatFileSize(getFileSize(doc)) }}</div>
                  </div>
                  <div class="doc-actions">
                    <el-button type="text" size="small" @click="downloadFile(doc)">
                      <el-icon><Download /></el-icon>
                      下载
                    </el-button>
                    <el-button type="text" size="small" @click="previewFile(doc)">
                      <el-icon><View /></el-icon>
                      预览
                    </el-button>
                  </div>
                </div>
              </div>
              <div v-else class="no-attachments">
                <el-empty description="暂无附件材料" />
              </div>
            </div>
          </el-tab-pane>

          <!-- 审核信息标签页 -->
          <el-tab-pane label="审核信息" name="review">
            <div class="review-info">
              <div v-if="currentDetail.status !== 'draft' && currentDetail.status !== 'submitted'">
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="审核人">
                    {{ currentDetail.verifier_info?.name || '--' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="审核日期">
                    {{
                      currentDetail.verified_date ? formatDate(currentDetail.verified_date) : '--'
                    }}
                  </el-descriptions-item>
                  <el-descriptions-item label="审核意见" :span="2">
                    <div class="review-comment">
                      {{ currentDetail.verification_comment || '无' }}
                    </div>
                  </el-descriptions-item>
                  <el-descriptions-item
                    label="发布日期"
                    v-if="currentDetail.status === 'published'"
                  >
                    {{
                      currentDetail.published_date ? formatDate(currentDetail.published_date) : '--'
                    }}
                  </el-descriptions-item>
                  <el-descriptions-item
                    label="发布链接"
                    v-if="currentDetail.status === 'published' && currentDetail.publish_link"
                  >
                    <el-link :href="currentDetail.publish_link" target="_blank" type="primary">
                      {{ currentDetail.publish_link }}
                    </el-link>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
              <div v-else>
                <el-empty description="尚未审核" />
              </div>
            </div>
          </el-tab-pane>

          <!-- 转化信息标签页 -->
          <el-tab-pane label="转化信息" name="transfer">
            <div class="transfer-info">
              <div
                v-if="currentDetail.transfer_records && currentDetail.transfer_records.length > 0"
              >
                <h4>成果转化记录</h4>
                <div class="transfer-list">
                  <div
                    v-for="transfer in currentDetail.transfer_records"
                    :key="transfer.id"
                    class="transfer-item"
                  >
                    <el-descriptions :column="2" border size="small">
                      <el-descriptions-item label="转化类型">
                        {{ getTransferTypeText(transfer.transfer_type) }}
                      </el-descriptions-item>
                      <el-descriptions-item label="转化状态">
                        <el-tag
                          :type="getTransferStatusTagType(transfer.transfer_status)"
                          size="small"
                        >
                          {{ getTransferStatusText(transfer.transfer_status) }}
                        </el-tag>
                      </el-descriptions-item>
                      <el-descriptions-item label="受让方">
                        {{ transfer.transferee }}
                      </el-descriptions-item>
                      <el-descriptions-item label="转化日期">
                        {{ formatDate(transfer.transfer_date) }}
                      </el-descriptions-item>
                      <el-descriptions-item label="合同金额">
                        ¥{{ formatCurrency(transfer.contract_amount) }}
                      </el-descriptions-item>
                      <el-descriptions-item label="实际金额">
                        ¥{{ formatCurrency(transfer.actual_amount) }}
                      </el-descriptions-item>
                      <el-descriptions-item label="合同编号" :span="2">
                        {{ transfer.contract_no || '--' }}
                      </el-descriptions-item>
                      <el-descriptions-item label="转化描述" :span="2">
                        <div class="transfer-description">{{ transfer.description || '无' }}</div>
                      </el-descriptions-item>
                    </el-descriptions>
                  </div>
                </div>
              </div>
              <div v-else>
                <el-empty description="暂无转化记录" />
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>

        <!-- 审核操作 -->
        <div
          v-if="currentDetail.status === 'submitted' || currentDetail.status === 'under_review'"
          class="review-actions"
        >
          <h4>审核操作</h4>
          <el-form :model="reviewForm" label-width="80px">
            <el-form-item label="审核结果">
              <el-radio-group v-model="reviewForm.recommendation">
                <el-radio label="verify">核实通过</el-radio>
                <el-radio label="reject">驳回修改</el-radio>
                <el-radio label="return">退回补充</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="审核意见">
              <el-input
                v-model="reviewForm.comment"
                type="textarea"
                :rows="4"
                placeholder="请输入审核意见，如发现问题请详细说明"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="submitReview" :loading="reviewLoading">
                提交审核
              </el-button>
              <el-button @click="detailDialogVisible = false">取消</el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 发布操作 -->
        <div v-if="currentDetail.status === 'verified'" class="publish-actions">
          <h4>发布操作</h4>
          <el-form :model="publishForm" label-width="80px">
            <el-form-item label="发布链接">
              <el-input
                v-model="publishForm.publish_link"
                placeholder="请输入成果发布链接（如期刊网址、专利号链接等）"
              />
            </el-form-item>
            <el-form-item label="发布日期">
              <el-date-picker
                v-model="publishForm.publish_date"
                type="date"
                placeholder="选择发布日期"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
            <el-form-item label="备注说明">
              <el-input
                v-model="publishForm.remark"
                type="textarea"
                :rows="3"
                placeholder="可输入发布相关备注"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="warning" @click="submitPublish" :loading="publishLoading">
                确认发布
              </el-button>
              <el-button @click="activeTab = 'basic'">取消</el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 转化操作 -->
        <div
          v-if="currentDetail.status === 'verified' || currentDetail.status === 'published'"
          class="transfer-actions"
        >
          <h4>成果转化</h4>
          <el-button type="info" @click="openTransferDialog">
            <el-icon><Transfer /></el-icon>
            新建转化记录
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 转化对话框 -->
    <el-dialog v-model="transferDialogVisible" title="新建成果转化记录" width="600px">
      <div v-if="currentDetail" class="transfer-dialog-content">
        <el-form
          :model="transferForm"
          label-width="100px"
          :rules="transferRules"
          ref="transferFormRef"
        >
          <el-form-item label="转化类型" prop="transfer_type">
            <el-select v-model="transferForm.transfer_type" placeholder="请选择转化类型">
              <el-option label="专利转让" value="patent_transfer" />
              <el-option label="专利许可" value="license" />
              <el-option label="技术合作" value="cooperation" />
              <el-option label="自主实施" value="self_implementation" />
              <el-option label="其他" value="other" />
            </el-select>
          </el-form-item>

          <el-form-item label="受让方" prop="transferee">
            <el-input v-model="transferForm.transferee" placeholder="请输入受让方/合作方名称" />
          </el-form-item>

          <el-form-item label="转化日期" prop="transfer_date">
            <el-date-picker
              v-model="transferForm.transfer_date"
              type="date"
              placeholder="选择转化日期"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>

          <el-form-item label="合同编号">
            <el-input v-model="transferForm.contract_no" placeholder="请输入合同编号（如有）" />
          </el-form-item>

          <el-form-item label="合同金额">
            <el-input-number
              v-model="transferForm.contract_amount"
              :min="0"
              :step="1000"
              placeholder="合同金额"
              style="width: 100%"
            >
              <template #prefix>¥</template>
            </el-input-number>
          </el-form-item>

          <el-form-item label="实际金额">
            <el-input-number
              v-model="transferForm.actual_amount"
              :min="0"
              :step="1000"
              placeholder="实际到账金额"
              style="width: 100%"
            >
              <template #prefix>¥</template>
            </el-input-number>
          </el-form-item>

          <el-form-item label="转化状态" prop="transfer_status">
            <el-select v-model="transferForm.transfer_status" placeholder="请选择转化状态">
              <el-option label="洽谈中" value="negotiating" />
              <el-option label="已签约" value="contracted" />
              <el-option label="实施中" value="implementing" />
              <el-option label="已完成" value="completed" />
              <el-option label="已终止" value="terminated" />
            </el-select>
          </el-form-item>

          <el-form-item label="转化描述" prop="description">
            <el-input
              v-model="transferForm.description"
              type="textarea"
              :rows="4"
              placeholder="请输入转化相关描述"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="submitTransfer" :loading="transferLoading">
              确认创建
            </el-button>
            <el-button @click="transferDialogVisible = false">取消</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-dialog>

    <!-- 文件预览对话框 -->
    <el-dialog
      v-model="previewDialogVisible"
      :title="`预览文件 - ${previewFileName}`"
      width="80%"
      top="5vh"
    >
      <div class="preview-container">
        <div v-if="isImagePreview" class="image-preview">
          <img :src="previewFileUrl" :alt="previewFileName" class="preview-image" />
        </div>
        <div v-else-if="isPdfPreview" class="pdf-preview">
          <iframe :src="previewFileUrl" class="preview-pdf" title="PDF预览"></iframe>
        </div>
        <div v-else class="unsupported-preview">
          <el-empty description="该文件类型不支持预览，请下载查看" />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  Refresh,
  Download,
  Check,
  Close,
  View,
  Promotion,
  Link,
  Picture,
  Document,
  Files,
} from '@element-plus/icons-vue'
import request from '@/utils/request'

interface ProjectAchievement {
  id: string
  project_id: string
  type: string
  title: string
  description?: string
  keywords?: string
  status: string
  achievement_date: string
  authors: any
  attachment_urls: string[]
  external_link?: string
  verified_by?: string
  verified_date?: string
  verification_comment?: string
  published_date?: string
  publish_link?: string
  project_info?: {
    id: string
    title: string
    project_code: string
    category: string
  }
  creator_info?: {
    id: string
    name: string
    department: string
  }
  verifier_info?: {
    id: string
    name: string
  }
  transfer_records?: AchievementTransfer[]
}

interface AchievementTransfer {
  id: string
  achievement_id: string
  transfer_type: string
  transferee: string
  transfer_date: string
  contract_no?: string
  contract_amount: number
  actual_amount: number
  transfer_status: string
  description?: string
}

// 响应式数据
const loading = ref(true)
const tableLoading = ref(false)
const achievementList = ref<ProjectAchievement[]>([])
const selectedIds = ref<string[]>([])
const searchQuery = ref('')
const filterStatus = ref('all')
const filterType = ref('')
const filterYear = ref('')
const stats = ref({
  pending: 0,
  reviewing: 0,
  verified: 0,
  published: 0,
  rejected: 0,
  by_type: {
    paper: 0,
    patent: 0,
    software: 0,
    others: 0,
  },
})

// 分页
const pagination = ref({
  current: 1,
  size: 10,
  total: 0,
})

// 详情对话框
const detailDialogVisible = ref(false)
const currentDetail = ref<ProjectAchievement | null>(null)
const activeTab = ref('basic')
const reviewForm = ref({
  recommendation: 'verify',
  comment: '',
})
const reviewLoading = ref(false)

// 发布表单
const publishForm = ref({
  publish_link: '',
  publish_date: new Date().toISOString().split('T')[0],
  remark: '',
})
const publishLoading = ref(false)

// 转化对话框
const transferDialogVisible = ref(false)
const transferForm = ref({
  transfer_type: '',
  transferee: '',
  transfer_date: new Date().toISOString().split('T')[0],
  contract_no: '',
  contract_amount: 0,
  actual_amount: 0,
  transfer_status: 'negotiating',
  description: '',
})
const transferFormRef = ref()
const transferLoading = ref(false)
const transferRules = {
  transfer_type: [{ required: true, message: '请选择转化类型', trigger: 'blur' }],
  transferee: [{ required: true, message: '请输入受让方', trigger: 'blur' }],
  transfer_date: [{ required: true, message: '请选择转化日期', trigger: 'blur' }],
  transfer_status: [{ required: true, message: '请选择转化状态', trigger: 'blur' }],
}

// 预览对话框
const previewDialogVisible = ref(false)
const previewFileUrl = ref('')
const previewFileName = ref('')
const isImagePreview = ref(false)
const isPdfPreview = ref(false)

// 计算属性
const years = computed(() => {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let i = currentYear; i >= currentYear - 10; i--) {
    years.push(i)
  }
  return years
})

const selectedAchievements = computed(() => {
  return achievementList.value.filter((item) => selectedIds.value.includes(item.id))
})

// 工具函数
const formatCurrency = (amount: number) => {
  return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

const formatDate = (dateString: string) => {
  if (!dateString) return '--'
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

const getTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    paper: '论文',
    patent: '专利',
    software: '软件著作权',
    report: '研究报告',
    prototype: '原型样机',
    standard: '技术标准',
    other: '其他',
  }
  return typeMap[type] || type
}

const getTypeTagType = (type: string) => {
  const typeMap: Record<string, string> = {
    paper: 'primary',
    patent: 'success',
    software: 'warning',
    report: 'info',
    prototype: '',
    standard: 'success',
    other: 'info',
  }
  return typeMap[type] || 'info'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    submitted: '待审核',
    under_review: '审核中',
    verified: '已核实',
    published: '已发布',
    transferred: '已转化',
    rejected: '已驳回',
  }
  return statusMap[status] || status
}

const getStatusTagType = (status: string) => {
  const typeMap: Record<string, string> = {
    draft: 'info',
    submitted: 'warning',
    under_review: 'primary',
    verified: 'success',
    published: 'warning',
    transferred: '',
    rejected: 'danger',
  }
  return typeMap[status] || 'info'
}

const getTransferTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    patent_transfer: '专利转让',
    license: '专利许可',
    cooperation: '技术合作',
    self_implementation: '自主实施',
    other: '其他',
  }
  return typeMap[type] || type
}

const getTransferStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    negotiating: '洽谈中',
    contracted: '已签约',
    implementing: '实施中',
    completed: '已完成',
    terminated: '已终止',
  }
  return statusMap[status] || status
}

const getTransferStatusTagType = (status: string) => {
  const typeMap: Record<string, string> = {
    negotiating: 'info',
    contracted: 'primary',
    implementing: 'warning',
    completed: 'success',
    terminated: 'danger',
  }
  return typeMap[status] || 'info'
}

const formatAuthors = (authors: any) => {
  if (!authors) return '--'
  try {
    const authorList = typeof authors === 'string' ? JSON.parse(authors) : authors
    if (Array.isArray(authorList) && authorList.length > 0) {
      return authorList.slice(0, 3).join('、') + (authorList.length > 3 ? '等' : '')
    }
    return '--'
  } catch {
    return '--'
  }
}

const parseAuthors = (authors: any) => {
  if (!authors) return []
  try {
    return typeof authors === 'string' ? JSON.parse(authors) : authors
  } catch {
    return []
  }
}

const formatKeywords = (keywords: string) => {
  if (!keywords) return '--'
  const keywordArray = keywords.split(/[,，;；]/).filter((k) => k.trim())
  return keywordArray.slice(0, 3).join('，') + (keywordArray.length > 3 ? '...' : '')
}

const formatKeywordsArray = (keywords: string) => {
  if (!keywords) return []
  return keywords
    .split(/[,，;；]/)
    .filter((k) => k.trim())
    .slice(0, 10)
}

const getFileName = (filePath: string) => {
  return filePath.split('/').pop() || filePath
}

const getFileSize = (filePath: string) => {
  // 这里应该从服务器获取文件大小，暂时返回模拟值
  return 1024 * 1024 // 1MB
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const isImageFile = (filePath: string) => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
  const lowerPath = filePath.toLowerCase()
  return imageExtensions.some((ext) => lowerPath.endsWith(ext))
}

const isPdfFile = (filePath: string) => {
  return filePath.toLowerCase().endsWith('.pdf')
}

// 数据加载
const loadAchievementData = async () => {
  tableLoading.value = true
  try {
    const params = {
      page: pagination.value.current,
      pageSize: pagination.value.size,
      search: searchQuery.value,
      status: filterStatus.value === 'all' ? '' : filterStatus.value,
      type: filterType.value,
      year: filterYear.value,
    }

    console.log('请求参数:', params)

    const response = await request.get('/api/assistant/achievements/list', {
      params: params,
    })

    if (response.success) {
      achievementList.value = response.data.list || []
      pagination.value.total = response.data.total || 0
      stats.value = response.data.stats || stats.value
    } else {
      ElMessage.error(response.error || '加载数据失败')
    }
  } catch (error) {
    console.error('加载科研成果数据失败:', error)
    ElMessage.error('网络错误，加载数据失败')
  } finally {
    tableLoading.value = false
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const response = await request.get('/api/assistant/achievements/stats')
    if (response.success) {
      stats.value = response.data.summary || stats.value
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

// 事件处理
const handleSearch = () => {
  pagination.value.current = 1
  loadAchievementData()
}

const handleFilter = () => {
  pagination.value.current = 1
  loadAchievementData()
}

const handleReset = () => {
  searchQuery.value = ''
  filterStatus.value = 'all'
  filterType.value = ''
  filterYear.value = ''
  pagination.value.current = 1
  loadAchievementData()
}

const handleSelectionChange = (selection: ProjectAchievement[]) => {
  selectedIds.value = selection.map((item) => item.id)
}

const handleSizeChange = (size: number) => {
  pagination.value.size = size
  pagination.value.current = 1
  loadAchievementData()
}

const handleCurrentChange = (page: number) => {
  pagination.value.current = page
  loadAchievementData()
}

const viewDetail = async (row: ProjectAchievement) => {
  try {
    const response = await request.get(`/api/assistant/achievements/${row.id}`)
    if (response.success) {
      currentDetail.value = response.data.achievement
      detailDialogVisible.value = true
      activeTab.value = 'basic'
      reviewForm.value = {
        recommendation: 'verify',
        comment: '',
      }
      publishForm.value = {
        publish_link: currentDetail.value.publish_link || '',
        publish_date: currentDetail.value.published_date || new Date().toISOString().split('T')[0],
        remark: '',
      }
    }
  } catch (error) {
    console.error('获取详情失败:', error)
    ElMessage.error('获取详情失败')
  }
}

const handleVerify = (row: ProjectAchievement) => {
  currentDetail.value = row
  reviewForm.value = {
    recommendation: 'verify',
    comment: '',
  }
  detailDialogVisible.value = true
}

const handleReject = (row: ProjectAchievement) => {
  currentDetail.value = row
  reviewForm.value = {
    recommendation: 'reject',
    comment: '',
  }
  detailDialogVisible.value = true
}

const handlePublish = (row: ProjectAchievement) => {
  currentDetail.value = row
  detailDialogVisible.value = true
  activeTab.value = 'basic'
}

const handleTransfer = (row: ProjectAchievement) => {
  currentDetail.value = row
  openTransferDialog()
}

const handleDialogClosed = () => {
  currentDetail.value = null
  activeTab.value = 'basic'
  reviewForm.value = {
    recommendation: 'verify',
    comment: '',
  }
  publishForm.value = {
    publish_link: '',
    publish_date: new Date().toISOString().split('T')[0],
    remark: '',
  }
}

// 文件操作
const downloadFile = (filePath: string) => {
  const fileName = getFileName(filePath)
  const downloadUrl = `/api/files/download?path=${encodeURIComponent(filePath)}`

  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const previewFile = async (filePath: string) => {
  const fileName = getFileName(filePath)

  if (isImageFile(filePath)) {
    previewFileUrl.value = `/api/files/download?path=${encodeURIComponent(filePath)}`
    previewFileName.value = fileName
    isImagePreview.value = true
    isPdfPreview.value = false
    previewDialogVisible.value = true
  } else if (isPdfFile(filePath)) {
    previewFileUrl.value = `/api/files/download?path=${encodeURIComponent(filePath)}`
    previewFileName.value = fileName
    isImagePreview.value = false
    isPdfPreview.value = true
    previewDialogVisible.value = true
  } else {
    ElMessage.info('该文件类型不支持预览，请下载查看')
    downloadFile(filePath)
  }
}

// 审核操作
const submitReview = async () => {
  if (!currentDetail.value) return

  if (!reviewForm.value.comment.trim()) {
    ElMessage.warning('请填写审核意见')
    return
  }

  reviewLoading.value = true
  try {
    const response = await request.post(
      `/api/assistant/achievements/${currentDetail.value.id}/review`,
      {
        recommendation: reviewForm.value.recommendation,
        comment: reviewForm.value.comment,
      },
    )

    if (response.success) {
      ElMessage.success('审核提交成功')
      detailDialogVisible.value = false
      loadAchievementData()
      loadStats()
    } else {
      ElMessage.error(response.error || '审核提交失败')
    }
  } catch (error) {
    console.error('提交审核失败:', error)
    ElMessage.error('提交审核失败')
  } finally {
    reviewLoading.value = false
  }
}

// 发布操作
const submitPublish = async () => {
  if (!currentDetail.value) return

  if (!publishForm.value.publish_link.trim()) {
    ElMessage.warning('请填写发布链接')
    return
  }

  publishLoading.value = true
  try {
    const response = await request.post(
      `/api/assistant/achievements/${currentDetail.value.id}/publish`,
      {
        publish_link: publishForm.value.publish_link,
        publish_date: publishForm.value.publish_date,
        remark: publishForm.value.remark,
      },
    )

    if (response.success) {
      ElMessage.success('发布成功')
      detailDialogVisible.value = false
      loadAchievementData()
      loadStats()
    } else {
      ElMessage.error(response.error || '发布失败')
    }
  } catch (error) {
    console.error('发布失败:', error)
    ElMessage.error('发布失败')
  } finally {
    publishLoading.value = false
  }
}

// 转化操作
const openTransferDialog = () => {
  transferForm.value = {
    transfer_type: '',
    transferee: '',
    transfer_date: new Date().toISOString().split('T')[0],
    contract_no: '',
    contract_amount: 0,
    actual_amount: 0,
    transfer_status: 'negotiating',
    description: '',
  }
  transferDialogVisible.value = true
}

const submitTransfer = async () => {
  if (!currentDetail.value) return

  if (!transferFormRef.value) return
  const valid = await transferFormRef.value.validate()
  if (!valid) return

  transferLoading.value = true
  try {
    const response = await request.post(
      `/api/assistant/achievements/${currentDetail.value.id}/transfer`,
      transferForm.value,
    )

    if (response.success) {
      ElMessage.success('转化记录创建成功')
      transferDialogVisible.value = false
      // 重新加载详情
      const detailResponse = await request.get(
        `/api/assistant/achievements/${currentDetail.value.id}`,
      )
      if (detailResponse.success) {
        currentDetail.value = detailResponse.data.achievement
        activeTab.value = 'transfer'
      }
    } else {
      ElMessage.error(response.error || '创建转化记录失败')
    }
  } catch (error) {
    console.error('创建转化记录失败:', error)
    ElMessage.error('创建转化记录失败')
  } finally {
    transferLoading.value = false
  }
}

// 批量操作
const batchVerify = async () => {
  if (selectedIds.value.length === 0) return

  try {
    await ElMessageBox.confirm(
      `确定要批量核实选中的 ${selectedIds.value.length} 项科研成果吗？`,
      '批量核实',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    const response = await request.post('/api/assistant/achievements/batch-verify', {
      ids: selectedIds.value,
      comment: '批量核实通过',
    })

    if (response.success) {
      ElMessage.success('批量核实成功')
      selectedIds.value = []
      loadAchievementData()
      loadStats()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量核实失败')
    }
  }
}

const batchReject = async () => {
  if (selectedIds.value.length === 0) return

  try {
    const result = await ElMessageBox.prompt('请输入驳回原因', '批量驳回', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputPlaceholder: '请输入驳回原因',
    })

    const comment = result.value
    if (!comment.trim()) {
      ElMessage.warning('请填写驳回原因')
      return
    }

    const response = await request.post('/api/assistant/achievements/batch-reject', {
      ids: selectedIds.value,
      comment: comment,
    })

    if (response.success) {
      ElMessage.success('批量驳回成功')
      selectedIds.value = []
      loadAchievementData()
      loadStats()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量驳回失败')
    }
  }
}

const batchPublish = async () => {
  if (selectedIds.value.length === 0) return

  try {
    await ElMessageBox.confirm(
      `确定要批量发布选中的 ${selectedIds.value.length} 项已核实成果吗？`,
      '批量发布',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    const response = await request.post('/api/assistant/achievements/batch-publish', {
      ids: selectedIds.value,
    })

    if (response.success) {
      ElMessage.success('批量发布成功')
      selectedIds.value = []
      loadAchievementData()
      loadStats()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量发布失败')
    }
  }
}

// 导出Excel
const exportToExcel = async () => {
  try {
    const params = {
      search: searchQuery.value,
      status: filterStatus.value === 'all' ? '' : filterStatus.value,
      type: filterType.value,
      year: filterYear.value,
    }

    const response = await request.get('/api/assistant/achievements/export', {
      responseType: 'blob',
      params: params,
    })

    const blob = new Blob([response], { type: 'application/vnd.ms-excel' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `科研成果审核记录_${new Date().toISOString().split('T')[0]}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

// 生命周期
onMounted(() => {
  loadAchievementData()
  loadStats()
})
</script>

<style scoped>
/* 复用之前的样式基础，添加科研成果特有样式 */
.audit-achievements-page {
  padding: 20px;
  min-height: 100vh;
  background: #f0f2f5;
}

/* 页面标题样式 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.header-left {
  flex: 1;
  min-width: 300px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 8px;
}

.breadcrumb {
  font-size: 14px;
  color: #86909c;
}

.breadcrumb .separator {
  margin: 0 8px;
}

.breadcrumb .current {
  color: #722ed1;
  font-weight: 500;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.search-input {
  width: 300px;
}

.status-filter,
.type-filter,
.year-filter {
  width: 140px;
}

/* 统计卡片 */
.stats-cards {
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-radius: 12px;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
  height: 100px;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-card.pending {
  background: linear-gradient(135deg, #ffa940 0%, #fa8c16 100%);
}

.stat-card.reviewing {
  background: linear-gradient(135deg, #b31b1b 0%, #8b1515 100%);
}

.stat-card.verified {
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
}

.stat-card.published {
  background: linear-gradient(135deg, #722ed1 0%, #eb2f96 100%);
}

.stat-card.paper {
  background: linear-gradient(135deg, #b31b1b 0%, #8b1515 100%);
}

.stat-card.patent {
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
}

.stat-card.software {
  background: linear-gradient(135deg, #ffa940 0%, #fa8c16 100%);
}

.stat-card.others {
  background: linear-gradient(135deg, #722ed1 0%, #eb2f96 100%);
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
}

.stat-icon .icon {
  font-size: 40px;
  opacity: 0.8;
}

/* 表格卡片 */
.table-card {
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-title {
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
}

.table-actions {
  display: flex;
  gap: 8px;
}

/* 单元格样式 */
.achievement-title-cell {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.achievement-title {
  font-weight: 600;
  color: #1d2129;
  line-height: 1.4;
  font-size: 14px;
}

.achievement-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.achievement-keywords {
  font-size: 12px;
  color: #86909c;
  line-height: 1.4;
}

.project-info-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.project-title {
  font-weight: 500;
  color: #1d2129;
  line-height: 1.4;
  font-size: 13px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-code {
  font-size: 12px;
  color: #86909c;
  font-family: monospace;
}

.authors-cell {
  color: #1d2129;
  line-height: 1.4;
  font-size: 13px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.verifier-cell {
  color: #1d2129;
  line-height: 1.4;
  font-size: 13px;
}

.action-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* 分页样式 */
.pagination-container {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

/* 详情对话框样式 */
.detail-content {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 8px;
}

.sub-info {
  font-size: 12px;
  color: #86909c;
  margin-top: 4px;
}

.authors-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.keywords-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.description-content {
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

.external-link {
  word-break: break-all;
}

/* 附件样式 */
.attachments-section {
  margin-top: 16px;
}

.attachments-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #1d2129;
  font-weight: 600;
}

.docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.doc-card {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s;
  background: white;
}

.doc-card:hover {
  border-color: #b31b1b;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.doc-preview {
  padding: 24px 16px;
  text-align: center;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.doc-preview .el-icon {
  color: #b31b1b;
  margin-bottom: 8px;
}

.doc-name {
  font-size: 12px;
  color: #666;
  word-break: break-all;
  line-height: 1.4;
  margin-bottom: 4px;
}

.doc-size {
  font-size: 11px;
  color: #999;
}

.doc-actions {
  display: flex;
  justify-content: space-around;
  padding: 8px;
  background: white;
}

.no-attachments {
  padding: 40px;
  text-align: center;
}

/* 审核信息样式 */
.review-info {
  margin-top: 16px;
}

.review-comment {
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

/* 转化信息样式 */
.transfer-info {
  margin-top: 16px;
}

.transfer-info h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #1d2129;
  font-weight: 600;
}

.transfer-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.transfer-item {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 16px;
  background: #fafafa;
}

.transfer-description {
  padding: 8px;
  background: white;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
}

/* 审核操作样式 */
.review-actions,
.publish-actions,
.transfer-actions {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}

.review-actions h4,
.publish-actions h4,
.transfer-actions h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #1d2129;
  font-weight: 600;
}

/* 转化对话框样式 */
.transfer-dialog-content {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 8px;
}

/* 预览容器样式 */
.preview-container {
  height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview {
  max-height: 100%;
  overflow: auto;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.pdf-preview {
  width: 100%;
  height: 100%;
}

.preview-pdf {
  width: 100%;
  height: 100%;
  border: none;
}

.unsupported-preview {
  padding: 40px;
  text-align: center;
}

/* 加载状态 */
.loading-container {
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-left {
    margin-bottom: 16px;
  }

  .filter-bar {
    flex-direction: column;
  }

  .search-input,
  .status-filter,
  .type-filter,
  .year-filter {
    width: 100%;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-buttons .el-button {
    width: 100%;
    margin-bottom: 4px;
  }

  .docs-grid {
    grid-template-columns: 1fr;
  }
}
</style>
