<!-- src/views/assistant/AuditProjects.vue -->
<template>
  <div class="audit-projects-page">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-main">
        <div class="page-title-section">
          <h1 class="page-title">
            <span class="title-icon">📋</span>
            项目审核
          </h1>
          <div class="page-subtitle">审核新提交的科研项目申请，确保项目质量</div>
        </div>

        <div class="header-stats">
          <div class="stat-card">
            <div class="stat-icon">⏳</div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.pending || 0 }}</div>
              <div class="stat-label">待审核</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.todayApproved || 0 }}</div>
              <div class="stat-label">今日通过</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.total || 0 }}</div>
              <div class="stat-label">总审核</div>
            </div>
          </div>
        </div>
      </div>

      <div class="header-actions">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索项目标题、申请人、编号..."
            class="search-input"
            @keyup.enter="handleSearch"
          />
          <button class="search-btn" @click="handleSearch">搜索</button>
        </div>

        <div class="action-buttons">
          <el-button
            type="primary"
            @click="showBatchAudit = true"
            :disabled="selectedProjects.length === 0"
          >
            <span class="btn-icon">✅</span>
            批量审核
          </el-button>
          <el-button @click="refreshData">
            <span class="btn-icon">🔄</span>
            刷新
          </el-button>
          <el-button @click="toggleFilterPanel">
            <span class="btn-icon">🔍</span>
            {{ showFilterPanel ? '隐藏筛选' : '筛选' }}
          </el-button>
        </div>
      </div>
    </header>

    <!-- 筛选面板 -->
    <div v-if="showFilterPanel" class="filter-panel">
      <div class="filter-content">
        <div class="filter-grid">
          <div class="filter-group">
            <label class="filter-label">项目状态</label>
            <div class="filter-options">
              <el-checkbox-group v-model="filters.statuses">
                <el-checkbox label="submitted">已提交</el-checkbox>
                <el-checkbox label="under_review">审核中</el-checkbox>
                <el-checkbox label="returned">已退回</el-checkbox>
              </el-checkbox-group>
            </div>
          </div>

          <div class="filter-group">
            <label class="filter-label">项目类别</label>
            <div class="filter-options">
              <el-checkbox-group v-model="filters.categories">
                <el-checkbox label="基础研究">基础研究</el-checkbox>
                <el-checkbox label="应用研究">应用研究</el-checkbox>
                <el-checkbox label="技术开发">技术开发</el-checkbox>
                <el-checkbox label="成果转化">成果转化</el-checkbox>
                <el-checkbox label="平台建设">平台建设</el-checkbox>
              </el-checkbox-group>
            </div>
          </div>

          <div class="filter-group">
            <label class="filter-label">提交时间</label>
            <div class="date-filter">
              <el-date-picker
                v-model="filters.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </div>
          </div>

          <div class="filter-group">
            <label class="filter-label">预算范围</label>
            <div class="budget-filter">
              <el-input-number
                v-model="filters.minBudget"
                placeholder="最低预算"
                :min="0"
                :max="10000000"
                :step="10000"
              />
              <span class="range-separator">-</span>
              <el-input-number
                v-model="filters.maxBudget"
                placeholder="最高预算"
                :min="0"
                :max="10000000"
                :step="10000"
              />
            </div>
          </div>
        </div>

        <div class="filter-actions">
          <el-button @click="resetFilters">重置筛选</el-button>
          <el-button type="primary" @click="applyFilters">应用筛选</el-button>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>正在加载项目审核数据...</p>
      </div>

      <!-- 项目列表 -->
      <div v-else class="projects-container">
        <!-- 空状态 -->
        <div v-if="projects.length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <h3>暂无待审核项目</h3>
          <p>当前没有需要审核的项目申请</p>
          <el-button type="primary" @click="refreshData">
            <span class="btn-icon">🔄</span>
            刷新查看
          </el-button>
        </div>

        <!-- 项目表格 -->
        <div v-else class="projects-table-container">
          <div class="table-header">
            <div class="table-title">待审核项目列表</div>
            <div class="table-actions">
              <div class="selected-info" v-if="selectedProjects.length > 0">
                已选择 {{ selectedProjects.length }} 个项目
              </div>
              <el-button size="small" @click="selectAll" v-if="projects.length > 0">
                {{ isAllSelected ? '取消全选' : '全选' }}
              </el-button>
            </div>
          </div>

          <div class="projects-table">
            <div class="table-scroll">
              <table class="projects-list">
                <thead>
                  <tr>
                    <th width="50">
                      <el-checkbox
                        :indeterminate="isIndeterminate"
                        v-model="isAllSelected"
                        @change="handleSelectAll"
                      />
                    </th>
                    <th width="120">项目编号</th>
                    <th>项目标题</th>
                    <th width="120">申请人</th>
                    <th width="100">项目类别</th>
                    <th width="120">预算总额</th>
                    <th width="100">研究周期</th>
                    <th width="120">提交时间</th>
                    <th width="100">状态</th>
                    <th width="180">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="project in projects"
                    :key="project.id"
                    :class="{ selected: selectedProjects.includes(project.id) }"
                  >
                    <td>
                      <el-checkbox
                        :model-value="selectedProjects.includes(project.id)"
                        @change="(val) => toggleSelect(project.id, val)"
                      />
                    </td>
                    <td class="project-code">
                      <span class="code-text">{{ project.project_code }}</span>
                    </td>
                    <td class="project-title">
                      <div class="title-wrapper">
                        <div class="title-main">{{ project.title }}</div>
                        <div class="title-tags">
                          <span class="field-tag">{{ project.research_field }}</span>
                          <span v-if="project.keywords" class="keyword-tag">
                            {{ project.keywords.split(',')[0] }}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td class="applicant-info">
                      <div class="applicant-name">{{ project.applicant_name }}</div>
                      <div class="applicant-department">{{ project.department }}</div>
                    </td>
                    <td class="project-category">
                      <span class="category-badge">{{ project.category }}</span>
                    </td>
                    <td class="project-budget">
                      <span class="budget-amount">¥{{ formatCurrency(project.budget_total) }}</span>
                    </td>
                    <td class="project-duration">
                      <span class="duration-text">{{ project.duration_months }}个月</span>
                    </td>
                    <td class="submit-time">
                      <div class="time-main">
                        {{ formatDate(project.submit_date || project.created_at) }}
                      </div>
                      <div class="time-ago">{{ getTimeAgo(project.created_at) }}</div>
                    </td>
                    <td class="project-status">
                      <span class="status-badge" :class="getStatusClass(project.status)">
                        {{ getStatusText(project.status) }}
                      </span>
                    </td>
                    <td class="project-actions">
                      <div class="action-buttons">
                        <el-button size="small" type="primary" @click="viewProjectDetail(project)">
                          <span class="btn-icon">👁️</span>
                          查看
                        </el-button>
                        <el-button
                          size="small"
                          type="success"
                          @click="startReview(project)"
                          v-if="project.status === 'submitted'"
                        >
                          <span class="btn-icon">📝</span>
                          审核
                        </el-button>
                        <el-button
                          size="small"
                          @click="quickApprove(project)"
                          v-if="project.status === 'under_review'"
                        >
                          <span class="btn-icon">✅</span>
                          通过
                        </el-button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 项目详情弹窗 -->
    <el-dialog
      v-model="showProjectDetail"
      :title="currentProject?.title"
      width="900px"
      :close-on-click-modal="false"
      class="project-detail-dialog"
    >
      <div v-if="currentProject" class="project-detail-content">
        <!-- 项目基本信息 -->
        <div class="detail-section">
          <h3 class="detail-title">
            <span class="detail-icon">📋</span>
            项目基本信息
          </h3>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">项目编号：</span>
              <span class="detail-value">{{ currentProject.project_code }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">项目类别：</span>
              <span class="detail-value">{{ currentProject.category }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">研究领域：</span>
              <span class="detail-value">{{ currentProject.research_field }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">预算总额：</span>
              <span class="detail-value budget"
                >¥{{ formatCurrency(currentProject.budget_total) }}</span
              >
            </div>
            <div class="detail-item">
              <span class="detail-label">研究周期：</span>
              <span class="detail-value">{{ currentProject.duration_months }}个月</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">提交时间：</span>
              <span class="detail-value">{{ formatDateTime(currentProject.created_at) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">项目状态：</span>
              <span class="detail-value status" :class="getStatusClass(currentProject.status)">
                {{ getStatusText(currentProject.status) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 申请人信息 -->
        <div class="detail-section">
          <h3 class="detail-title">
            <span class="detail-icon">👤</span>
            申请人信息
          </h3>
          <div class="applicant-card">
            <div class="applicant-avatar">{{ currentProject.applicant_name?.charAt(0) }}</div>
            <div class="applicant-details">
              <div class="applicant-name">{{ currentProject.applicant_name }}</div>
              <div class="applicant-info">
                <div class="info-item">
                  <span class="info-label">所属部门：</span>
                  <span class="info-value">{{ currentProject.department }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">项目标题：</span>
                  <span class="info-value">{{ currentProject.title || '未设置' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">联系方式：</span>
                  <span class="info-value">{{
                    currentProject.email || currentProject.phone || '未提供'
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 项目摘要 -->
        <div class="detail-section">
          <h3 class="detail-title">
            <span class="detail-icon">📝</span>
            项目摘要
          </h3>
          <div class="detail-content">
            <p class="abstract-text">{{ currentProject.abstract }}</p>
          </div>
        </div>

        <!-- 研究目标 -->
        <div class="detail-section" v-if="currentProject.objectives">
          <h3 class="detail-title">
            <span class="detail-icon">🎯</span>
            研究目标
          </h3>
          <div class="detail-content">
            <pre class="objectives-text">{{ currentProject.objectives }}</pre>
          </div>
        </div>

        <!-- 预算明细 -->
        <div class="detail-section" v-if="budgetItems.length > 0">
          <h3 class="detail-title">
            <span class="detail-icon">💰</span>
            预算明细
          </h3>
          <div class="budget-table">
            <table>
              <thead>
                <tr>
                  <th width="120">预算类别</th>
                  <th>项目名称</th>
                  <th width="150">金额</th>
                  <th width="200">预算依据</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in budgetItems" :key="item.id">
                  <td>{{ item.category }}</td>
                  <td class="item-name">{{ item.item_name }}</td>
                  <td class="item-amount">¥{{ formatCurrency(item.amount) }}</td>
                  <td class="item-justification">{{ item.justification || '-' }}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="2" class="total-label">预算总额</td>
                  <td class="total-amount">¥{{ formatCurrency(currentProject.budget_total) }}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 项目成员 -->
        <div class="detail-section" v-if="projectMembers.length > 0">
          <h3 class="detail-title">
            <span class="detail-icon">👥</span>
            项目成员
          </h3>
          <div class="members-list">
            <div v-for="member in projectMembers" :key="member.id" class="member-item">
              <div class="member-avatar">{{ member.name?.charAt(0) }}</div>
              <div class="member-details">
                <div class="member-name">{{ member.name }}</div>
                <div class="member-info">
                  <span class="member-role">{{ member.role }}</span>
                  <span class="member-workload" v-if="member.workload_percentage">
                    工作量：{{ member.workload_percentage }}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 附件材料 -->
        <div class="detail-section" v-if="attachments.length > 0">
          <h3 class="detail-title">
            <span class="detail-icon">📎</span>
            附件材料
          </h3>
          <div class="attachments-list">
            <div v-for="file in attachments" :key="file.id" class="attachment-item">
              <div class="file-icon">
                <span v-if="file.mime_type?.includes('pdf')">📄</span>
                <span v-else-if="file.mime_type?.includes('word')">📝</span>
                <span v-else-if="file.mime_type?.includes('excel')">📊</span>
                <span v-else>📎</span>
              </div>
              <div class="file-info">
                <div class="file-name">{{ file.original_name }}</div>
                <div class="file-meta">
                  <span class="file-size">{{ formatFileSize(file.file_size) }}</span>
                  <span class="file-date">{{ formatDate(file.created_at) }}</span>
                </div>
              </div>
              <button class="download-btn" @click="downloadFile(file)">下载</button>
            </div>
          </div>
        </div>

        <!-- 审核记录 -->
        <div class="detail-section" v-if="reviewRecords.length > 0">
          <h3 class="detail-title">
            <span class="detail-icon">📋</span>
            审核记录
          </h3>
          <div class="review-records">
            <div v-for="record in reviewRecords" :key="record.id" class="review-record">
              <div class="record-header">
                <div class="reviewer">{{ record.reviewer_name }}</div>
                <div class="review-date">
                  {{ formatDateTime(record.review_date || record.created_at) }}
                </div>
              </div>
              <div class="record-content">
                <div class="review-scores" v-if="record.total_score">
                  <div class="score-item">
                    <span class="score-label">创新性：</span>
                    <span class="score-value">{{ record.innovation_score || 0 }}/10</span>
                  </div>
                  <div class="score-item">
                    <span class="score-label">可行性：</span>
                    <span class="score-value">{{ record.feasibility_score || 0 }}/10</span>
                  </div>
                  <div class="score-item">
                    <span class="score-label">意义价值：</span>
                    <span class="score-value">{{ record.significance_score || 0 }}/10</span>
                  </div>
                  <div class="score-item">
                    <span class="score-label">综合评分：</span>
                    <span class="score-value total">{{ record.total_score }}/10</span>
                  </div>
                </div>
                <div class="review-comment" v-if="record.comments">
                  <div class="comment-title">评审意见：</div>
                  <p class="comment-text">{{ record.comments }}</p>
                </div>
                <div class="review-result">
                  <span class="result-label">评审结论：</span>
                  <span class="result-value" :class="record.recommendation">
                    {{ getRecommendationText(record.recommendation) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showProjectDetail = false">关闭</el-button>
          <el-button
            type="primary"
            @click="startReview(currentProject)"
            v-if="currentProject?.status === 'submitted'"
          >
            开始审核
          </el-button>
          <el-button
            type="success"
            @click="showApproveDialog = true"
            v-if="currentProject?.status === 'under_review'"
          >
            通过审核
          </el-button>
          <el-button
            type="warning"
            @click="showRejectDialog = true"
            v-if="currentProject?.status === 'under_review'"
          >
            拒绝项目
          </el-button>
          <el-button
            type="info"
            @click="showReturnDialog = true"
            v-if="currentProject?.status === 'under_review'"
          >
            退回修改
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 审核表单弹窗 -->
    <el-dialog
      v-model="showReviewForm"
      title="项目审核"
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-if="currentProject" class="review-form">
        <div class="form-section">
          <h4 class="form-title">评分项</h4>
          <div class="score-grid">
            <div class="score-item">
              <label class="score-label">创新性 (1-10分)</label>
              <el-input-number
                v-model="reviewForm.innovation_score"
                :min="1"
                :max="10"
                size="large"
                controls-position="right"
              />
            </div>
            <div class="score-item">
              <label class="score-label">可行性 (1-10分)</label>
              <el-input-number
                v-model="reviewForm.feasibility_score"
                :min="1"
                :max="10"
                size="large"
                controls-position="right"
              />
            </div>
            <div class="score-item">
              <label class="score-label">意义价值 (1-10分)</label>
              <el-input-number
                v-model="reviewForm.significance_score"
                :min="1"
                :max="10"
                size="large"
                controls-position="right"
              />
            </div>
            <div class="score-item">
              <label class="score-label">团队基础 (1-10分)</label>
              <el-input-number
                v-model="reviewForm.team_score"
                :min="1"
                :max="10"
                size="large"
                controls-position="right"
              />
            </div>
            <div class="score-item">
              <label class="score-label">预算合理性 (1-10分)</label>
              <el-input-number
                v-model="reviewForm.budget_score"
                :min="1"
                :max="10"
                size="large"
                controls-position="right"
              />
            </div>
          </div>

          <div class="total-score">
            <span class="total-label">综合评分：</span>
            <span class="total-value">{{ totalScore.toFixed(1) }}/10</span>
          </div>
        </div>

        <div class="form-section">
          <h4 class="form-title">项目优点</h4>
          <el-input
            v-model="reviewForm.strengths"
            type="textarea"
            :rows="3"
            placeholder="请描述项目的优点和亮点..."
            resize="none"
          />
        </div>

        <div class="form-section">
          <h4 class="form-title">项目不足</h4>
          <el-input
            v-model="reviewForm.weaknesses"
            type="textarea"
            :rows="3"
            placeholder="请指出项目需要改进的地方..."
            resize="none"
          />
        </div>

        <div class="form-section">
          <h4 class="form-title">评审意见</h4>
          <el-input
            v-model="reviewForm.comments"
            type="textarea"
            :rows="4"
            placeholder="请填写详细的评审意见..."
            resize="none"
            required
          />
        </div>

        <div class="form-section">
          <h4 class="form-title">修改建议</h4>
          <el-input
            v-model="reviewForm.suggestions"
            type="textarea"
            :rows="3"
            placeholder="请提供具体的修改建议..."
            resize="none"
          />
        </div>

        <div class="form-section">
          <h4 class="form-title">评审结论</h4>
          <el-radio-group v-model="reviewForm.recommendation" class="recommendation-options">
            <el-radio label="approve" size="large">
              <span class="recommendation-text">
                <span class="recommendation-icon">✅</span>
                通过审核
              </span>
            </el-radio>
            <el-radio label="approve_with_revision" size="large">
              <span class="recommendation-text">
                <span class="recommendation-icon">📝</span>
                修改后通过
              </span>
            </el-radio>
            <el-radio label="reject" size="large">
              <span class="recommendation-text">
                <span class="recommendation-icon">❌</span>
                拒绝
              </span>
            </el-radio>
            <el-radio label="resubmit" size="large">
              <span class="recommendation-text">
                <span class="recommendation-icon">🔄</span>
                重新提交
              </span>
            </el-radio>
          </el-radio-group>
        </div>

        <div class="form-section">
          <h4 class="form-title">附加选项</h4>
          <el-checkbox v-model="reviewForm.is_confidential">
            对申请者保密（评审意见不向申请者展示）
          </el-checkbox>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showReviewForm = false">取消</el-button>
          <el-button type="primary" @click="submitReview" :loading="submittingReview">
            提交审核
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 快速审核弹窗 -->
    <el-dialog v-model="showQuickApproveDialog" title="快速审核通过" width="500px">
      <div class="quick-approve-form">
        <el-input
          v-model="quickApproveForm.comment"
          type="textarea"
          :rows="3"
          placeholder="请输入审核意见（可选）..."
          resize="none"
        />
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showQuickApproveDialog = false">取消</el-button>
          <el-button type="success" @click="approveProject(currentProject)"> 确认通过 </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 批量审核弹窗 -->
    <el-dialog v-model="showBatchAudit" title="批量审核项目" width="600px">
      <div class="batch-audit-form">
        <div class="batch-info">
          <p>
            已选择
            <span class="selected-count">{{ selectedProjects.length }}</span> 个项目进行批量审核
          </p>
        </div>

        <div class="form-section">
          <h4 class="form-title">审核结果</h4>
          <el-radio-group v-model="batchForm.result" class="batch-options">
            <el-radio label="approve" size="large">
              <span class="batch-text">
                <span class="batch-icon">✅</span>
                通过
              </span>
            </el-radio>
            <el-radio label="reject" size="large">
              <span class="batch-text">
                <span class="batch-icon">❌</span>
                拒绝
              </span>
            </el-radio>
            <el-radio label="returned" size="large">
              <span class="batch-text">
                <span class="batch-icon">📝</span>
                退回修改
              </span>
            </el-radio>
          </el-radio-group>
        </div>

        <div class="form-section">
          <h4 class="form-title">审核意见</h4>
          <el-input
            v-model="batchForm.comment"
            type="textarea"
            :rows="3"
            placeholder="请输入统一的审核意见..."
            resize="none"
          />
        </div>

        <div class="form-section">
          <h4 class="form-title">审核说明</h4>
          <div class="batch-tips">
            <p>• 批量审核将对所有选中的项目应用相同的审核结果和意见</p>
            <p>• 审核后项目状态将立即更新</p>
            <p>• 申请者将收到审核结果通知</p>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showBatchAudit = false">取消</el-button>
          <el-button type="primary" @click="submitBatchAudit" :loading="submittingBatch">
            确认批量审核
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

// 响应式数据
const loading = ref(false)
const searchKeyword = ref('')
const showFilterPanel = ref(false)
const showProjectDetail = ref(false)
const showReviewForm = ref(false)
const showQuickApproveDialog = ref(false)
const showBatchAudit = ref(false)
const submittingReview = ref(false)
const submittingBatch = ref(false)

// 当前操作的项目
const currentProject = ref<any>(null)
const selectedProjects = ref<string[]>([])

// 统计数据
const stats = ref({
  pending: 0,
  todayApproved: 0,
  total: 0,
})

// 项目数据
const projects = ref<any[]>([])
const budgetItems = ref<any[]>([])
const projectMembers = ref<any[]>([])
const attachments = ref<any[]>([])
const reviewRecords = ref<any[]>([])

// 筛选条件
const filters = ref({
  statuses: ['submitted', 'under_review'],
  categories: [] as string[],
  dateRange: [] as string[],
  minBudget: null as number | null,
  maxBudget: null as number | null,
})

// 审核表单
const reviewForm = ref({
  innovation_score: 7,
  feasibility_score: 7,
  significance_score: 7,
  team_score: 7,
  budget_score: 7,
  strengths: '',
  weaknesses: '',
  comments: '',
  suggestions: '',
  recommendation: 'approve',
  is_confidential: false,
})

// 快速审核表单
const quickApproveForm = ref({
  comment: '',
})

// 批量审核表单
const batchForm = ref({
  result: 'approve',
  comment: '',
})

// 计算属性
const totalScore = computed(() => {
  const scores = [
    reviewForm.value.innovation_score,
    reviewForm.value.feasibility_score,
    reviewForm.value.significance_score,
    reviewForm.value.team_score,
    reviewForm.value.budget_score,
  ]
  const sum = scores.reduce((a, b) => a + b, 0)
  return sum / 5
})

const isAllSelected = computed(() => {
  return projects.value.length > 0 && selectedProjects.value.length === projects.value.length
})

const isIndeterminate = computed(() => {
  return selectedProjects.value.length > 0 && selectedProjects.value.length < projects.value.length
})

// 工具函数
const formatCurrency = (amount: number) => {
  if (!amount) return '0.00'
  return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatDate = (dateString: string | Date) => {
  if (!dateString) return '-'
  try {
    const date = dateString instanceof Date ? dateString : new Date(dateString)
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleDateString('zh-CN')
  } catch {
    return '-'
  }
}

const formatDateTime = (dateString: string | Date) => {
  if (!dateString) return '-'
  try {
    const date = dateString instanceof Date ? dateString : new Date(dateString)
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleString('zh-CN')
  } catch {
    return '-'
  }
}

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getTimeAgo = (dateString: string | Date) => {
  if (!dateString) return ''
  try {
    const date = dateString instanceof Date ? dateString : new Date(dateString)
    if (isNaN(date.getTime())) return ''

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 60) {
      return `${diffMinutes}分钟前`
    } else if (diffHours < 24) {
      return `${diffHours}小时前`
    } else {
      return `${diffDays}天前`
    }
  } catch {
    return ''
  }
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    under_review: '审核中',
    approved: '已批准',
    rejected: '已拒绝',
    returned: '已退回',
    in_progress: '进行中',
    completed: '已完成',
  }
  return statusMap[status] || status
}

const getStatusClass = (status: string) => {
  const classMap: Record<string, string> = {
    draft: 'draft',
    submitted: 'submitted',
    under_review: 'reviewing',
    approved: 'approved',
    rejected: 'rejected',
    returned: 'returned',
    in_progress: 'in-progress',
    completed: 'completed',
  }
  return classMap[status] || status
}

const getRecommendationText = (recommendation: string) => {
  const map: Record<string, string> = {
    approve: '通过审核',
    approve_with_revision: '修改后通过',
    reject: '拒绝',
    resubmit: '重新提交',
  }
  return map[recommendation] || recommendation
}

// 数据加载
const loadProjects = async () => {
  loading.value = true

  try {
    console.log('正在加载待审核项目...')

    const response = await request.get('/api/assistant/projects/review', {
      params: getQueryParams(),
    })

    if (response.success && response.data) {
      projects.value = response.data.projects || []
      stats.value = response.data.stats || { pending: 0, todayApproved: 0, total: 0 }
      console.log(`✅ 加载了 ${projects.value.length} 个待审核项目`)
    } else {
      showMockData()
    }
  } catch (error) {
    console.error('加载待审核项目失败:', error)
    ElMessage.error('加载项目数据失败')
    showMockData()
  } finally {
    loading.value = false
  }
}

const loadProjectDetail = async (projectId: string) => {
  try {
    const response = await request.get(`/api/projects/${projectId}/detail`)

    if (response.success && response.data) {
      currentProject.value = response.data.project
      budgetItems.value = response.data.budget_items || []
      projectMembers.value = response.data.members || []
      attachments.value = response.data.attachments || []
      reviewRecords.value = response.data.reviews || []
    }
  } catch (error) {
    console.error('加载项目详情失败:', error)
    ElMessage.error('加载项目详情失败')
  }
}

const showMockData = () => {
  console.log('使用模拟数据')

  // 模拟项目数据
  projects.value = [
    {
      id: 'proj_001',
      project_code: 'RES-2024-001',
      title: '人工智能在医疗诊断中的应用研究',
      category: '基础研究',
      research_field: '人工智能/医疗健康',
      keywords: '人工智能,医疗诊断,深度学习',
      abstract: '研究人工智能技术在医疗影像诊断中的应用，提高诊断准确率...',
      applicant_name: '张三教授',
      department: '计算机学院',
      title: '教授',
      email: 'zhangsan@university.edu',
      phone: '13800138000',
      budget_total: 500000,
      duration_months: 24,
      status: 'submitted',
      created_at: '2024-01-25T09:30:00',
      submit_date: '2024-01-25',
    },
    {
      id: 'proj_002',
      project_code: 'RES-2024-002',
      title: '新型材料在新能源领域的开发与应用',
      category: '应用研究',
      research_field: '材料科学/新能源',
      applicant_name: '李四博士',
      department: '材料学院',
      budget_total: 800000,
      duration_months: 36,
      status: 'under_review',
      created_at: '2024-01-24T14:20:00',
    },
  ]

  stats.value = {
    pending: projects.value.length,
    todayApproved: 3,
    total: 15,
  }
}

const getQueryParams = () => {
  const params: any = {
    page: 1,
    pageSize: 100,
  }

  if (filters.value.statuses.length > 0) {
    params.status = filters.value.statuses.join(',')
  }

  if (filters.value.categories.length > 0) {
    params.category = filters.value.categories.join(',')
  }

  if (filters.value.dateRange && filters.value.dateRange.length === 2) {
    params.startDate = filters.value.dateRange[0]
    params.endDate = filters.value.dateRange[1]
  }

  if (filters.value.minBudget !== null) {
    params.minBudget = filters.value.minBudget
  }

  if (filters.value.maxBudget !== null) {
    params.maxBudget = filters.value.maxBudget
  }

  if (searchKeyword.value) {
    params.keyword = searchKeyword.value
  }

  return params
}

// 筛选功能
const handleSearch = () => {
  selectedProjects.value = []
  loadProjects()
}

const applyFilters = () => {
  selectedProjects.value = []
  loadProjects()
}

const resetFilters = () => {
  filters.value = {
    statuses: ['submitted', 'under_review'],
    categories: [],
    dateRange: [],
    minBudget: null,
    maxBudget: null,
  }
  searchKeyword.value = ''
  applyFilters()
}

const toggleFilterPanel = () => {
  showFilterPanel.value = !showFilterPanel.value
}

// 选择功能
const toggleSelect = (projectId: string, selected: boolean) => {
  if (selected) {
    if (!selectedProjects.value.includes(projectId)) {
      selectedProjects.value.push(projectId)
    }
  } else {
    const index = selectedProjects.value.indexOf(projectId)
    if (index > -1) {
      selectedProjects.value.splice(index, 1)
    }
  }
}

const handleSelectAll = (selected: boolean) => {
  if (selected) {
    selectedProjects.value = projects.value.map((p) => p.id)
  } else {
    selectedProjects.value = []
  }
}

const selectAll = () => {
  if (isAllSelected.value) {
    selectedProjects.value = []
  } else {
    selectedProjects.value = projects.value.map((p) => p.id)
  }
}

// 项目操作
const viewProjectDetail = async (project: any) => {
  currentProject.value = project
  await loadProjectDetail(project.id)
  showProjectDetail.value = true
}

const startReview = (project: any) => {
  currentProject.value = project

  // 重置审核表单
  reviewForm.value = {
    innovation_score: 7,
    feasibility_score: 7,
    significance_score: 7,
    team_score: 7,
    budget_score: 7,
    strengths: '',
    weaknesses: '',
    comments: '',
    suggestions: '',
    recommendation: 'approve',
    is_confidential: false,
  }

  showReviewForm.value = true
}

const quickApprove = (project: any) => {
  currentProject.value = project
  quickApproveForm.value.comment = ''
  showQuickApproveDialog.value = true
}

const submitReview = async () => {
  if (!reviewForm.value.comments) {
    ElMessage.warning('请填写评审意见')
    return
  }

  submittingReview.value = true

  try {
    const response = await request.post(`/api/projects/${currentProject.value.id}/review`, {
      ...reviewForm.value,
      total_score: totalScore.value,
    })

    if (response.success) {
      ElMessage.success('审核提交成功')
      showReviewForm.value = false

      // 重新加载项目列表
      loadProjects()

      // 如果当前正在查看项目详情，重新加载详情
      if (showProjectDetail.value) {
        await loadProjectDetail(currentProject.value.id)
      }
    } else {
      ElMessage.error(response.error || '审核提交失败')
    }
  } catch (error) {
    console.error('提交审核失败:', error)
    ElMessage.error('提交审核失败')
  } finally {
    submittingReview.value = false
  }
}

const approveProject = async (project: any) => {
  try {
    const response = await request.post(`/api/projects/${project.id}/approve`, {
      comment: quickApproveForm.value.comment,
    })

    if (response.success) {
      ElMessage.success('项目已审核通过')
      showQuickApproveDialog.value = false
      showProjectDetail.value = false
      loadProjects()
    } else {
      ElMessage.error(response.error || '审核失败')
    }
  } catch (error) {
    console.error('审核通过失败:', error)
    ElMessage.error('审核通过失败')
  }
}

const submitBatchAudit = async () => {
  if (selectedProjects.value.length === 0) {
    ElMessage.warning('请选择要审核的项目')
    return
  }

  if (!batchForm.value.result) {
    ElMessage.warning('请选择审核结果')
    return
  }

  submittingBatch.value = true

  try {
    const response = await request.post('/api/assistant/projects/batch-review', {
      projectIds: selectedProjects.value,
      result: batchForm.value.result,
      comment: batchForm.value.comment,
    })

    if (response.success) {
      ElMessage.success(`批量审核完成，成功处理 ${response.data.successCount} 个项目`)
      showBatchAudit.value = false
      selectedProjects.value = []
      loadProjects()
    } else {
      ElMessage.error(response.error || '批量审核失败')
    }
  } catch (error) {
    console.error('批量审核失败:', error)
    ElMessage.error('批量审核失败')
  } finally {
    submittingBatch.value = false
  }
}

const downloadFile = (file: any) => {
  ElMessage.info(`下载文件: ${file.original_name}`)
  // 实际开发中这里应该调用文件下载API
}

const refreshData = () => {
  loadProjects()
}

// 初始化
onMounted(() => {
  loadProjects()
})
</script>

<style scoped>
/* 页面整体样式 */
.audit-projects-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20px;
}

/* 页面头部 */
.page-header {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-title-section {
  flex: 1;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 28px;
  color: #fa8c16;
}

.page-subtitle {
  color: #7f8c8d;
  font-size: 14px;
}

/* 统计卡片 */
.header-stats {
  display: flex;
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: #f8f9fa;
  border-radius: 8px;
  min-width: 140px;
}

.stat-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  background: #fff7e6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fa8c16;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 2px;
}

.stat-label {
  font-size: 13px;
  color: #7f8c8d;
}

/* 头部操作区域 */
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.search-box {
  display: flex;
  align-items: center;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 8px;
  flex: 1;
  max-width: 400px;
}

.search-icon {
  padding: 0 12px;
  font-size: 18px;
  color: #7f8c8d;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 8px;
  font-size: 14px;
  outline: none;
  min-width: 200px;
}

.search-input::placeholder {
  color: #bdc3c7;
}

.search-btn {
  padding: 8px 20px;
  background: #fa8c16;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.3s;
}

.search-btn:hover {
  background: #ffa940;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.btn-icon {
  margin-right: 6px;
}

/* 筛选面板 */
.filter-panel {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.filter-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-label {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
}

.filter-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.date-filter {
  width: 100%;
}

:deep(.el-date-editor) {
  width: 100% !important;
}

.budget-filter {
  display: flex;
  align-items: center;
  gap: 12px;
}

.range-separator {
  color: #7f8c8d;
  padding: 0 8px;
}

:deep(.el-input-number) {
  flex: 1;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

/* 主内容区 */
.main-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* 加载状态 */
.loading-container {
  text-align: center;
  padding: 60px 0;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #fa8c16;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-container p {
  color: #7f8c8d;
  font-size: 14px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80px 40px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 24px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 20px;
  color: #2c3e50;
  margin-bottom: 12px;
}

.empty-state p {
  color: #7f8c8d;
  margin-bottom: 24px;
}

/* 表格容器 */
.projects-table-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.selected-info {
  font-size: 14px;
  color: #fa8c16;
  font-weight: 500;
}

/* 项目表格 */
.projects-table {
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.table-scroll {
  overflow-x: auto;
}

.projects-list {
  width: 100%;
  border-collapse: collapse;
  min-width: 1000px;
}

.projects-list th {
  background: #fafafa;
  padding: 16px;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 1px solid #f0f0f0;
  white-space: nowrap;
}

.projects-list td {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
}

.projects-list tbody tr:hover {
  background: #fafafa;
}

.projects-list tbody tr.selected {
  background: #fff7e6;
}

/* 表格单元格样式 */
.project-code .code-text {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #722ed1;
  background: #f9f0ff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
}

.project-title .title-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.title-main {
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.4;
}

.title-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.field-tag {
  background: #e6f7ff;
  color: #1890ff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.keyword-tag {
  background: #f6ffed;
  color: #52c41a;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.applicant-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.applicant-name {
  font-weight: 500;
  color: #2c3e50;
}

.applicant-department {
  font-size: 12px;
  color: #7f8c8d;
}

.project-category .category-badge {
  background: #f0f0f0;
  color: #666;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.project-budget .budget-amount {
  font-weight: 600;
  color: #fa8c16;
}

.project-duration .duration-text {
  color: #2c3e50;
  font-weight: 500;
}

.submit-time {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.time-main {
  color: #2c3e50;
  font-size: 13px;
}

.time-ago {
  font-size: 12px;
  color: #7f8c8d;
}

/* 状态标签 */
.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  min-width: 60px;
}

.status-badge.draft {
  background: #f5f5f5;
  color: #8c8c8c;
  border: 1px solid #e8e8e8;
}

.status-badge.submitted {
  background: #e6f7ff;
  color: #1890ff;
  border: 1px solid #bae7ff;
}

.status-badge.reviewing {
  background: #fff7e6;
  color: #fa8c16;
  border: 1px solid #ffd591;
}

.status-badge.approved {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.status-badge.rejected {
  background: #fff2f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
}

.status-badge.returned {
  background: #fff0f6;
  color: #eb2f96;
  border: 1px solid #ffadd2;
}

.status-badge.in-progress {
  background: #e6f7ff;
  color: #1890ff;
  border: 1px solid #bae7ff;
}

.status-badge.completed {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

/* 操作按钮 */
.project-actions .action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

:deep(.el-button) {
  display: inline-flex;
  align-items: center;
}

/* 项目详情弹窗 */
.project-detail-dialog :deep(.el-dialog__header) {
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 16px;
}

.project-detail-dialog :deep(.el-dialog__body) {
  max-height: 70vh;
  overflow-y: auto;
  padding: 0 20px;
}

.project-detail-content {
  padding: 20px 0;
}

/* 详情区块 */
.detail-section {
  margin-bottom: 32px;
}

.detail-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 2px solid #f0f0f0;
}

.detail-icon {
  font-size: 18px;
  color: #fa8c16;
}

/* 基本信息网格 */
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 768px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-label {
  font-size: 14px;
  color: #7f8c8d;
  min-width: 80px;
}

.detail-value {
  font-size: 14px;
  font-weight: 500;
  color: #2c3e50;
}

.detail-value.budget {
  color: #fa8c16;
  font-weight: 600;
}

.detail-value.status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

/* 申请人卡片 */
.applicant-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.applicant-avatar {
  width: 48px;
  height: 48px;
  background: #fa8c16;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
  flex-shrink: 0;
}

.applicant-details {
  flex: 1;
}

.applicant-name {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
}

.applicant-info {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

@media (max-width: 768px) {
  .applicant-info {
    grid-template-columns: 1fr;
  }
}

.info-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.info-label {
  font-size: 13px;
  color: #7f8c8d;
}

.info-value {
  font-size: 13px;
  color: #2c3e50;
  font-weight: 500;
}

/* 内容区域 */
.detail-content {
  background: #fafafa;
  padding: 16px;
  border-radius: 8px;
  line-height: 1.6;
}

.abstract-text {
  margin: 0;
  color: #2c3e50;
  font-size: 14px;
  line-height: 1.6;
}

.objectives-text {
  margin: 0;
  color: #2c3e50;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  font-family: inherit;
}

/* 预算表格 */
.budget-table {
  overflow-x: auto;
}

.budget-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.budget-table th {
  background: #fafafa;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 1px solid #f0f0f0;
  white-space: nowrap;
}

.budget-table td {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: top;
}

.item-name {
  font-weight: 500;
  color: #2c3e50;
}

.item-amount {
  font-weight: 600;
  color: #fa8c16;
}

.item-justification {
  color: #7f8c8d;
  font-size: 13px;
}

.total-row {
  background: #f8f9fa;
}

.total-label {
  font-weight: 600;
  color: #2c3e50;
  text-align: right;
  padding-right: 12px !important;
}

.total-amount {
  font-weight: 700;
  color: #fa8c16;
  font-size: 16px;
}

/* 成员列表 */
.members-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
}

.member-avatar {
  width: 36px;
  height: 36px;
  background: #1890ff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  flex-shrink: 0;
}

.member-details {
  flex: 1;
}

.member-name {
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 4px;
}

.member-info {
  display: flex;
  gap: 12px;
  font-size: 12px;
}

.member-role {
  background: #e6f7ff;
  color: #1890ff;
  padding: 2px 6px;
  border-radius: 4px;
}

.member-workload {
  color: #7f8c8d;
}

/* 附件列表 */
.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.file-icon {
  font-size: 20px;
  width: 32px;
  flex-shrink: 0;
}

.file-info {
  flex: 1;
}

.file-name {
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 4px;
  word-break: break-all;
}

.file-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #7f8c8d;
}

.download-btn {
  padding: 6px 12px;
  background: white;
  border: 1px solid #1890ff;
  color: #1890ff;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
  flex-shrink: 0;
}

.download-btn:hover {
  background: #e6f7ff;
}

/* 审核记录 */
.review-records {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.review-record {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #f0f0f0;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.reviewer {
  font-weight: 600;
  color: #2c3e50;
}

.review-date {
  font-size: 12px;
  color: #7f8c8d;
}

.record-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.review-scores {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.score-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.score-label {
  font-size: 13px;
  color: #7f8c8d;
}

.score-value {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
}

.score-value.total {
  color: #fa8c16;
  font-size: 15px;
}

.review-comment {
  background: white;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
}

.comment-title {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
}

.comment-text {
  margin: 0;
  color: #2c3e50;
  font-size: 14px;
  line-height: 1.5;
}

.review-result {
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-label {
  font-weight: 600;
  color: #2c3e50;
}

.result-value {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
}

.result-value.approve {
  background: #f6ffed;
  color: #52c41a;
}

.result-value.approve_with_revision {
  background: #fff7e6;
  color: #fa8c16;
}

.result-value.reject {
  background: #fff2f0;
  color: #ff4d4f;
}

.result-value.resubmit {
  background: #f0f7ff;
  color: #1890ff;
}

/* 审核表单 */
.review-form {
  padding: 20px 0;
}

.form-section {
  margin-bottom: 24px;
}

.form-title {
  font-size: 15px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 12px;
}

/* 评分网格 */
.score-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.score-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.score-label {
  font-size: 14px;
  color: #2c3e50;
}

:deep(.el-input-number) {
  width: 100%;
}

.total-score {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.total-label {
  font-size: 15px;
  font-weight: 600;
  color: #2c3e50;
}

.total-value {
  font-size: 20px;
  font-weight: 700;
  color: #fa8c16;
}

/* 评审结论选项 */
.recommendation-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

:deep(.el-radio) {
  margin-right: 0 !important;
  margin-bottom: 8px;
}

.recommendation-text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.recommendation-icon {
  font-size: 16px;
}

/* 批量审核表单 */
.batch-audit-form {
  padding: 20px 0;
}

.batch-info {
  text-align: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 24px;
}

.batch-info p {
  margin: 0;
  font-size: 15px;
  color: #2c3e50;
}

.selected-count {
  color: #fa8c16;
  font-weight: 700;
}

.batch-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.batch-text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.batch-icon {
  font-size: 16px;
}

.batch-tips {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  border-left: 3px solid #fa8c16;
}

.batch-tips p {
  margin: 6px 0;
  font-size: 13px;
  color: #7f8c8d;
}

.batch-tips p:first-child {
  margin-top: 0;
}

.batch-tips p:last-child {
  margin-bottom: 0;
}

/* 弹窗底部按钮 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .header-main {
    flex-direction: column;
    gap: 20px;
  }

  .header-stats {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 992px) {
  .filter-grid {
    grid-template-columns: 1fr;
  }

  .header-actions {
    flex-direction: column;
    gap: 16px;
  }

  .search-box {
    max-width: 100%;
  }
}

@media (max-width: 768px) {
  .audit-projects-page {
    padding: 12px;
  }

  .page-header,
  .filter-panel,
  .main-content {
    padding: 16px;
  }

  .header-stats {
    flex-direction: column;
    width: 100%;
  }

  .stat-card {
    width: 100%;
  }

  .action-buttons {
    width: 100%;
    flex-direction: column;
  }

  .action-buttons .el-button {
    width: 100%;
  }

  .project-actions .action-buttons {
    flex-direction: column;
  }

  .dialog-footer {
    flex-direction: column;
  }

  .dialog-footer .el-button {
    width: 100%;
    margin-left: 0 !important;
    margin-bottom: 8px;
  }

  .dialog-footer .el-button:last-child {
    margin-bottom: 0;
  }
}

@media (max-width: 576px) {
  .page-title {
    font-size: 20px;
  }

  .page-title-section {
    text-align: center;
  }

  .search-box {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    min-width: auto;
  }

  .search-btn {
    width: 100%;
    margin-top: 8px;
  }

  .score-grid {
    grid-template-columns: 1fr;
  }
}
</style>
