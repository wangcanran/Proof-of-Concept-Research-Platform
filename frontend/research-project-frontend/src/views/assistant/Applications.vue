<!-- src/views/assistant/Applications.vue -->
<template>
  <div class="applications-page assistant-ruc-theme">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="page-back-row">
        <el-button text type="primary" class="back-to-workbench" @click="goToWorkbench">
          <el-icon class="back-icon"><ArrowLeft /></el-icon>
          返回工作台
        </el-button>
      </div>
      <div class="header-main">
        <div class="page-title-section">
          <h1 class="page-title">
            <span class="title-icon">📝</span>
            申请管理
          </h1>
          <div class="page-subtitle">
            项目经理在此<strong>领取</strong>待受理申请、<strong>分配评审专家</strong>；专家提交意见后，由您<strong>确认立项</strong>。
          </div>
          <p class="page-hint">
            角标<strong>待受理</strong>表示尚未指定项目经理、可点<strong>领取</strong>；若已显示负责人（如李华），数据库状态可能仍为「已提交」，角标会显示为<strong>已领取·待分配</strong>，此时不再出现领取按钮，由负责人去<strong>分配专家</strong>。
          </p>
        </div>

        <div class="header-stats">
          <div class="stat-card">
            <div class="stat-icon">⏳</div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.pending || 0 }}</div>
              <div class="stat-label">待处理</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.approved || 0 }}</div>
              <div class="stat-label">已批准</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.total || 0 }}</div>
              <div class="stat-label">总申请</div>
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
            placeholder="搜索项目编号、标题、申请人..."
            class="search-input"
            @keyup.enter="handleSearch"
          />
          <button class="search-btn" @click="handleSearch">搜索</button>
        </div>

        <div class="action-buttons">
          <el-button @click="refreshData">
            <span class="btn-icon">🔄</span>
            刷新
          </el-button>
          <el-button @click="exportData" :disabled="applications.length === 0">
            <span class="btn-icon">📤</span>
            导出
          </el-button>
          <el-button type="primary" @click="showFilterPanel = !showFilterPanel">
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
            <label class="filter-label">申请状态</label>
            <div class="filter-options">
              <el-checkbox-group v-model="filters.statuses">
                <el-checkbox label="submitted">待受理（已提交）</el-checkbox>
                <el-checkbox label="under_review">专家评审中</el-checkbox>
                <el-checkbox label="approved">已批准</el-checkbox>
                <el-checkbox label="rejected">已拒绝</el-checkbox>
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
                <el-checkbox label="其他">其他</el-checkbox>
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
                :controls="false"
              />
              <span class="range-separator">-</span>
              <el-input-number
                v-model="filters.maxBudget"
                placeholder="最高预算"
                :min="0"
                :max="10000000"
                :step="10000"
                :controls="false"
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
        <p>正在加载申请数据...</p>
      </div>

      <!-- 空状态 -->
      <div v-else-if="filteredApplications.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>暂无申请记录</h3>
        <p>当前没有符合条件的申请记录</p>
        <div class="empty-actions">
          <el-button @click="resetFilters">重置筛选</el-button>
          <el-button type="primary" @click="refreshData">
            <span class="btn-icon">🔄</span>
            刷新
          </el-button>
        </div>
      </div>

      <!-- 申请列表 -->
      <div v-else class="applications-container">
        <div class="applications-header">
          <div class="applications-title">
            <h3>申请列表</h3>
            <span class="applications-count">{{ filteredApplications.length }} 条记录</span>
          </div>
          <div class="applications-actions applications-header-right">
            <el-radio-group
              v-if="showManagerScope"
              v-model="listScope"
              size="small"
              class="scope-radios"
              @change="onListScopeChange"
            >
              <el-radio-button value="all">全部</el-radio-button>
              <el-radio-button value="mine">我负责的</el-radio-button>
              <el-radio-button value="unassigned">待领取</el-radio-button>
            </el-radio-group>
            <el-button size="small" @click="sortBy('created_at')"> 按提交时间 </el-button>
            <el-button size="small" @click="sortBy('budget_total')"> 按预算金额 </el-button>
          </div>
        </div>

        <!-- 申请卡片列表 -->
        <div class="applications-grid">
          <div
            v-for="application in filteredApplications"
            :key="application.id"
            class="application-card"
            :class="getStatusClass(application.status)"
            @click="viewApplicationDetail(application)"
          >
            <!-- 卡片头部 -->
            <div class="card-header">
              <div class="application-code">
                <span class="code-icon">🏷️</span>
                <span class="code-text">{{ application.project_code }}</span>
              </div>
              <div class="application-status">
                <el-tooltip
                  :content="pmStatusHintForCard(application)"
                  placement="top"
                >
                  <span class="status-badge" :class="statusBadgeClass(application)">
                    {{ pmStatusLabelForCard(application) }}
                  </span>
                </el-tooltip>
              </div>
            </div>

            <!-- 卡片主体 -->
            <div class="card-body">
              <h4 class="application-title">{{ application.title }}</h4>

              <div class="application-summary">
                <p class="abstract">{{ truncateText(application.abstract, 120) }}</p>
              </div>

              <div class="application-meta">
                <div class="meta-item">
                  <span class="meta-icon">👤</span>
                  <span class="meta-label">申请人：</span>
                  <span class="meta-value">{{ application.applicant_name }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-icon">🏢</span>
                  <span class="meta-label">部门：</span>
                  <span class="meta-value">{{ application.department || '未设置' }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-icon">💰</span>
                  <span class="meta-label">预算：</span>
                  <span class="meta-value budget"
                    >¥{{ formatCurrency(application.budget_total) }}</span
                  >
                </div>
                <div class="meta-item">
                  <span class="meta-icon">⏱️</span>
                  <span class="meta-label">周期：</span>
                  <span class="meta-value">{{ application.duration_months }}个月</span>
                </div>
                <div v-if="application.manager_name" class="meta-item">
                  <span class="meta-icon">📌</span>
                  <span class="meta-label">项目经理：</span>
                  <span class="meta-value">{{ application.manager_name }}</span>
                </div>
                <div
                  v-else-if="application.status === 'submitted'"
                  class="meta-item"
                >
                  <span class="meta-icon">📌</span>
                  <span class="meta-label">项目经理：</span>
                  <span class="meta-value text-muted">待领取</span>
                </div>
              </div>

              <div class="application-tags">
                <span class="category-tag">{{ application.category }}</span>
                <span class="field-tag">{{ application.research_field }}</span>
                <span v-if="application.keywords" class="keyword-tag">
                  {{ application.keywords.split(',')[0] }}
                </span>
              </div>
            </div>

            <!-- 卡片底部 -->
            <div class="card-footer">
              <div class="application-time">
                <span class="time-icon">📅</span>
                <span class="time-text">{{
                  formatDate(application.submit_date || application.created_at)
                }}</span>
                <span class="time-ago">{{ getTimeAgo(application.created_at) }}</span>
              </div>

              <div class="application-actions">
                <el-button size="small" @click.stop="viewApplicationDetail(application)">
                  <span class="btn-icon">👁️</span>
                  查看
                </el-button>
                <el-button
                  v-if="canClaimApplication(application)"
                  size="small"
                  type="warning"
                  @click.stop="claimApplication(application)"
                >
                  <span class="btn-icon">✋</span>
                  {{ userRole === 'admin' ? '指派负责人' : '领取' }}
                </el-button>
                <el-button
                  v-if="canAssignExperts(application)"
                  size="small"
                  type="primary"
                  @click.stop="goAssignExperts(application)"
                >
                  <span class="btn-icon">📝</span>
                  分配专家
                </el-button>
                <el-button
                  v-if="application.status === 'under_review' && canOperateAsManager(application)"
                  size="small"
                  type="success"
                  @click.stop="quickApprove(application)"
                >
                  <span class="btn-icon">✅</span>
                  确认通过
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="pagination.total > pagination.pageSize" class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.currentPage"
            v-model:page-size="pagination.pageSize"
            :total="pagination.total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </main>

    <!-- 申请详情弹窗 -->
    <el-dialog
      v-model="showDetailDialog"
      :title="currentApplication?.title"
      width="900px"
      :close-on-click-modal="false"
      class="application-detail-dialog"
    >
      <div v-if="currentApplication" class="application-detail-content">
        <!-- 申请状态栏 -->
        <div class="detail-status-bar">
          <div class="status-info">
            <span class="status-label">申请状态：</span>
            <span class="status-value" :class="statusBadgeClass(currentApplication)">
              {{ pmStatusLabelForCard(currentApplication) }}
            </span>
          </div>
          <div class="status-actions">
            <el-button
              v-if="canClaimApplication(currentApplication)"
              type="warning"
              @click="claimApplication(currentApplication)"
            >
              <span class="btn-icon">✋</span>
              {{ userRole === 'admin' ? '指派项目经理' : '领取（我负责）' }}
            </el-button>
            <el-button
              v-if="canAssignExperts(currentApplication)"
              type="primary"
              @click="goAssignExperts(currentApplication)"
            >
              <span class="btn-icon">📝</span>
              分配评审专家
            </el-button>
            <el-button
              v-if="currentApplication.status === 'under_review' && canOperateAsManager(currentApplication)"
              type="success"
              @click="quickApprove(currentApplication)"
            >
              <span class="btn-icon">✅</span>
              确认立项通过
            </el-button>
            <el-button
              v-if="currentApplication.status === 'under_review' && canOperateAsManager(currentApplication)"
              type="warning"
              @click="showReturnDialog = true"
            >
              <span class="btn-icon">↩️</span>
              退回修改
            </el-button>
            <el-button
              v-if="currentApplication.status === 'under_review' && canOperateAsManager(currentApplication)"
              type="danger"
              @click="showRejectDialog = true"
            >
              <span class="btn-icon">❌</span>
              拒绝申请
            </el-button>
          </div>
        </div>

        <!-- 基本信息 -->
        <div class="detail-section">
          <h4 class="section-title">
            <span class="section-icon">📋</span>
            基本信息
          </h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">项目编号：</span>
              <span class="info-value code">{{ currentApplication.project_code }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">项目类别：</span>
              <span class="info-value">{{ currentApplication.category }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">研究领域：</span>
              <span class="info-value">{{ currentApplication.research_field }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">预算总额：</span>
              <span class="info-value budget"
                >¥{{ formatCurrency(currentApplication.budget_total) }}</span
              >
            </div>
            <div class="info-item">
              <span class="info-label">研究周期：</span>
              <span class="info-value">{{ currentApplication.duration_months }}个月</span>
            </div>
            <div class="info-item">
              <span class="info-label">提交时间：</span>
              <span class="info-value">{{ formatDateTime(currentApplication.created_at) }}</span>
            </div>
            <div v-if="currentApplication.approval_date" class="info-item">
              <span class="info-label">批准时间：</span>
              <span class="info-value">{{ formatDate(currentApplication.approval_date) }}</span>
            </div>
          </div>
        </div>

        <!-- 申请人信息 -->
        <div class="detail-section">
          <h4 class="section-title">
            <span class="section-icon">👤</span>
            申请人信息
          </h4>
          <div class="applicant-info-card">
            <div class="applicant-avatar">{{ currentApplication.applicant_name?.charAt(0) }}</div>
            <div class="applicant-details">
              <div class="applicant-name">{{ currentApplication.applicant_name }}</div>
              <div class="applicant-meta">
                <div class="meta-item">
                  <span class="meta-icon">🏢</span>
                  <span class="meta-text">{{ currentApplication.department || '未设置部门' }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-icon">👨‍🏫</span>
                  <span class="meta-text">{{
                    currentApplication.applicant_title || '未设置职称'
                  }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-icon">📧</span>
                  <span class="meta-text">{{
                    currentApplication.applicant_email || '未提供邮箱'
                  }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-icon">📱</span>
                  <span class="meta-text">{{
                    currentApplication.applicant_phone || '未提供电话'
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 项目摘要 -->
        <div class="detail-section">
          <h4 class="section-title">
            <span class="section-icon">📝</span>
            项目摘要
          </h4>
          <div class="abstract-content">
            <p>{{ currentApplication.abstract }}</p>
          </div>
        </div>

        <!-- 研究目标 -->
        <div v-if="currentApplication.objectives" class="detail-section">
          <h4 class="section-title">
            <span class="section-icon">🎯</span>
            研究目标
          </h4>
          <div class="objectives-content">
            <pre>{{ currentApplication.objectives }}</pre>
          </div>
        </div>

        <!-- 预算明细 -->
        <div v-if="budgetItems.length > 0" class="detail-section">
          <h4 class="section-title">
            <span class="section-icon">💰</span>
            预算明细
          </h4>
          <div class="budget-table-container">
            <table class="budget-table">
              <thead>
                <tr>
                  <th width="100">类别</th>
                  <th>项目名称</th>
                  <th width="120">金额</th>
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
                  <td class="total-amount">
                    ¥{{ formatCurrency(currentApplication.budget_total) }}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 项目成员 -->
        <div v-if="projectMembers.length > 0" class="detail-section">
          <h4 class="section-title">
            <span class="section-icon">👥</span>
            项目成员
          </h4>
          <div class="members-list">
            <div v-for="member in projectMembers" :key="member.id" class="member-item">
              <div class="member-avatar">{{ member.name?.charAt(0) }}</div>
              <div class="member-details">
                <div class="member-name">{{ member.name }}</div>
                <div class="member-info">
                  <span class="member-role">{{ getMemberRoleText(member.role) }}</span>
                  <span v-if="member.workload_percentage" class="member-workload">
                    工作量：{{ member.workload_percentage }}%
                  </span>
                </div>
                <div v-if="member.responsibility" class="member-responsibility">
                  职责：{{ member.responsibility }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 附件材料 -->
        <div v-if="attachments.length > 0" class="detail-section">
          <h4 class="section-title">
            <span class="section-icon">📎</span>
            附件材料
          </h4>
          <div class="attachments-list">
            <div v-for="file in attachments" :key="file.id" class="attachment-item">
              <div class="file-icon">
                <span v-if="file.type?.includes('pdf')">📄</span>
                <span v-else-if="file.type?.includes('word')">📝</span>
                <span v-else-if="file.type?.includes('excel')">📊</span>
                <span v-else>📎</span>
              </div>
              <div class="file-info">
                <div class="file-name">{{ file.name }}</div>
                <div class="file-meta">
                  <span class="file-size">{{ formatFileSize(file.size) }}</span>
                  <span class="file-date">{{ formatDate(file.created_at) }}</span>
                  <span class="file-downloads">下载 {{ file.download_count || 0 }} 次</span>
                </div>
              </div>
              <button class="download-btn" @click="downloadFile(file)">
                <span class="btn-icon">⬇️</span>
                下载
              </button>
            </div>
          </div>
        </div>

        <!-- 审核记录 -->
        <div v-if="reviewRecords.length > 0" class="detail-section">
          <h4 class="section-title">
            <span class="section-icon">📋</span>
            审核记录
          </h4>
          <div class="review-records">
            <div v-for="record in reviewRecords" :key="record.id" class="review-record">
              <div class="record-header">
                <div class="reviewer-info">
                  <div class="reviewer-name">{{ record.reviewer_name }}</div>
                  <div class="reviewer-department">{{ record.reviewer_department }}</div>
                </div>
                <div class="review-time">
                  <div class="review-date">{{ formatDate(record.review_date) }}</div>
                  <div class="review-type">{{ getReviewTypeText(record.review_type) }}</div>
                </div>
              </div>

              <div v-if="record.total_score" class="record-scores">
                <div class="score-item">
                  <span class="score-label">创新性：</span>
                  <el-rate
                    v-model="record.innovation_score"
                    disabled
                    :max="10"
                    show-score
                    score-template="{value}"
                  />
                </div>
                <div class="score-item">
                  <span class="score-label">可行性：</span>
                  <el-rate
                    v-model="record.feasibility_score"
                    disabled
                    :max="10"
                    show-score
                    score-template="{value}"
                  />
                </div>
                <div class="score-item">
                  <span class="score-label">意义价值：</span>
                  <el-rate
                    v-model="record.significance_score"
                    disabled
                    :max="10"
                    show-score
                    score-template="{value}"
                  />
                </div>
                <div class="score-item">
                  <span class="score-label">综合评分：</span>
                  <span class="total-score">{{ record.total_score }}/10</span>
                </div>
              </div>

              <div class="record-content">
                <div v-if="record.comments" class="review-comment">
                  <div class="comment-title">评审意见：</div>
                  <p class="comment-text">{{ record.comments }}</p>
                </div>
                <div v-if="record.suggestions" class="review-suggestions">
                  <div class="suggestions-title">修改建议：</div>
                  <p class="suggestions-text">{{ record.suggestions }}</p>
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
          <el-button @click="showDetailDialog = false">关闭</el-button>
          <el-button type="primary" @click="copyApplicationInfo" v-if="currentApplication">
            复制信息
          </el-button>
          <el-button @click="printApplication" v-if="currentApplication"> 打印 </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 快速审核通过弹窗 -->
    <el-dialog
      v-model="showQuickApproveDialog"
      title="快速审核通过"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="quick-approve-form">
        <el-form :model="quickApproveForm" label-width="80px">
          <el-form-item label="审核意见">
            <el-input
              v-model="quickApproveForm.comment"
              type="textarea"
              :rows="3"
              placeholder="请输入审核意见（可选）..."
              resize="none"
            />
          </el-form-item>
          <el-form-item label="批准日期">
            <el-date-picker
              v-model="quickApproveForm.approvalDate"
              type="date"
              placeholder="选择批准日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showQuickApproveDialog = false">取消</el-button>
          <el-button type="success" @click="approveApplication(currentApplication)">
            确认通过
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 退回修改弹窗 -->
    <el-dialog
      v-model="showReturnDialog"
      title="退回修改"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="return-form">
        <el-form :model="returnForm" label-width="80px">
          <el-form-item label="修改建议" required>
            <el-input
              v-model="returnForm.suggestions"
              type="textarea"
              :rows="4"
              placeholder="请详细说明需要修改的内容和建议..."
              resize="none"
            />
          </el-form-item>
          <el-form-item label="备注">
            <el-input
              v-model="returnForm.comment"
              type="textarea"
              :rows="2"
              placeholder="可添加其他备注信息..."
              resize="none"
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showReturnDialog = false">取消</el-button>
          <el-button type="warning" @click="returnApplication(currentApplication)">
            确认退回
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 拒绝申请弹窗 -->
    <el-dialog
      v-model="showRejectDialog"
      title="拒绝申请"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="reject-form">
        <el-form :model="rejectForm" label-width="80px">
          <el-form-item label="拒绝原因" required>
            <el-input
              v-model="rejectForm.reason"
              type="textarea"
              :rows="4"
              placeholder="请详细说明拒绝的原因..."
              resize="none"
            />
          </el-form-item>
          <el-form-item label="备注">
            <el-input
              v-model="rejectForm.comment"
              type="textarea"
              :rows="2"
              placeholder="可添加其他备注信息..."
              resize="none"
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showRejectDialog = false">取消</el-button>
          <el-button type="danger" @click="rejectApplication(currentApplication)">
            确认拒绝
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()

const goToWorkbench = () => {
  router.push('/assistant/dashboard')
}
const authStore = useAuthStore()
const currentUserId = computed(() => authStore.user?.id)
/** 兼容登录页曾只写 userInfo 未写 `user` 导致 role 为空：依次读 Pinia → localStorage.user → userRole */
const userRole = computed(() => {
  const fromStore = authStore.user?.role
  if (fromStore) return String(fromStore).toLowerCase().trim()
  try {
    const raw = localStorage.getItem('user')
    if (raw) {
      const j = JSON.parse(raw)
      if (j?.role) return String(j.role).toLowerCase().trim()
    }
  } catch {
    /* ignore */
  }
  const lr = localStorage.getItem('userRole')
  return lr ? String(lr).toLowerCase().trim() : ''
})
/** 与后端一致：项目经理 / 旧版科研助理 assistant 视为工作台同一角色 */
const isProjectManagerLike = computed(() =>
  ['project_manager', 'assistant'].includes(userRole.value),
)
const showManagerScope = computed(
  () => isProjectManagerLike.value || userRole.value === 'admin',
)

// 响应式数据
const loading = ref(false)
const searchKeyword = ref('')
const showFilterPanel = ref(false)
const showDetailDialog = ref(false)
const showQuickApproveDialog = ref(false)
const showReturnDialog = ref(false)
const showRejectDialog = ref(false)

// 当前操作的申请（项目）
const currentApplication = ref<any>(null)

// 统计数据
const stats = ref({
  pending: 0,
  approved: 0,
  total: 0,
})

// 申请数据（实际上是项目数据）
const applications = ref<any[]>([])
const budgetItems = ref<any[]>([])
const projectMembers = ref<any[]>([])
const attachments = ref<any[]>([])
const reviewRecords = ref<any[]>([])

// 筛选条件
const filters = ref({
  statuses: ['submitted', 'under_review'], // 默认：待受理 + 专家评审中
  categories: [] as string[],
  dateRange: [] as string[],
  minBudget: null as number | null,
  maxBudget: null as number | null,
})

// 分页数据
const pagination = ref({
  currentPage: 1,
  pageSize: 20,
  total: 0,
})

// 排序
const sortField = ref('created_at')
const sortOrder = ref('desc')

/** 列表范围：全部 / 我负责的（项目经理） / 待领取 */
const listScope = ref<'all' | 'mine' | 'unassigned'>('all')

/**
 * 与列表范围联动默认状态筛选：
 * - 全部：默认只看待办（待受理 + 评审中），便于领取与跟进
 * - 我负责的：不限制状态，否则已批准/孵化中等项目会被筛掉，与工作台「我负责的项目」不一致
 * - 待领取：仅已提交
 */
function applyDefaultStatusesForScope(scope: 'all' | 'mine' | 'unassigned') {
  if (scope === 'mine') {
    filters.value.statuses = []
  } else if (scope === 'unassigned') {
    filters.value.statuses = ['submitted']
  } else {
    filters.value.statuses = ['submitted', 'under_review']
  }
}

const onListScopeChange = () => {
  pagination.value.currentPage = 1
  applyDefaultStatusesForScope(listScope.value)
  loadApplications()
}

function isManagerOf(app: any) {
  return (
    app.manager_id &&
    currentUserId.value &&
    String(app.manager_id) === String(currentUserId.value)
  )
}

const canClaimApplication = (app: any) => {
  if (!app || app.status !== 'submitted' || app.manager_id) return false
  if (isProjectManagerLike.value) return true
  /** 管理员不「自己领取」，而是指派某位项目经理为负责人（与 claim 接口 managerId 一致） */
  if (userRole.value === 'admin') return true
  return false
}

const canAssignExperts = (app: any) => {
  if (!app || !['submitted', 'under_review'].includes(app.status)) return false
  if (userRole.value === 'admin') return true
  if (isProjectManagerLike.value) return isManagerOf(app)
  return false
}

const canOperateAsManager = (app: any) => {
  if (!app) return false
  if (userRole.value === 'admin') return true
  return isManagerOf(app)
}

// 表单数据
const quickApproveForm = ref({
  comment: '',
  approvalDate: new Date().toISOString().split('T')[0],
})

const returnForm = ref({
  suggestions: '',
  comment: '',
})

const rejectForm = ref({
  reason: '',
  comment: '',
})

// 计算属性
const filteredApplications = computed(() => {
  let filtered = [...applications.value]

  // 按状态筛选
  if (filters.value.statuses.length > 0) {
    filtered = filtered.filter((app) => filters.value.statuses.includes(app.status))
  }

  // 按类别筛选
  if (filters.value.categories.length > 0) {
    filtered = filtered.filter((app) => filters.value.categories.includes(app.category))
  }

  // 按时间范围筛选
  if (filters.value.dateRange && filters.value.dateRange.length === 2) {
    const [startDate, endDate] = filters.value.dateRange
    filtered = filtered.filter((app) => {
      const appDate = app.submit_date
        ? new Date(app.submit_date).toISOString().split('T')[0]
        : new Date(app.created_at).toISOString().split('T')[0]
      return appDate >= startDate && appDate <= endDate
    })
  }

  // 按预算范围筛选
  if (filters.value.minBudget !== null) {
    filtered = filtered.filter((app) => app.budget_total >= filters.value.minBudget!)
  }

  if (filters.value.maxBudget !== null) {
    filtered = filtered.filter((app) => app.budget_total <= filters.value.maxBudget!)
  }

  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(
      (app) =>
        app.title.toLowerCase().includes(keyword) ||
        app.project_code.toLowerCase().includes(keyword) ||
        app.applicant_name.toLowerCase().includes(keyword) ||
        app.research_field.toLowerCase().includes(keyword) ||
        (app.keywords && app.keywords.toLowerCase().includes(keyword)),
    )
  }

  // 排序
  filtered.sort((a, b) => {
    let aValue = a[sortField.value]
    let bValue = b[sortField.value]

    if (sortField.value === 'created_at' || sortField.value === 'submit_date') {
      aValue = new Date(aValue || a.created_at).getTime()
      bValue = new Date(bValue || b.created_at).getTime()
    }

    if (sortOrder.value === 'desc') {
      return bValue - aValue
    } else {
      return aValue - bValue
    }
  })

  // 分页
  const start = (pagination.value.currentPage - 1) * pagination.value.pageSize
  const end = start + pagination.value.pageSize
  return filtered.slice(start, end)
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

const truncateText = (text: string, maxLength: number) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/** 项目经理视角：与数据库枚举对应，避免「已提交/审核中」语义混淆 */
const pmStatusLabel = (status: string) => {
  const m: Record<string, string> = {
    draft: '草稿',
    submitted: '待受理',
    under_review: '专家评审中',
    revision: '修改补充中',
    batch_review: '集中评审中',
    approved: '已立项',
    incubating: '孵化中',
    rejected: '已拒绝',
    completed: '已完成',
    terminated: '已终止',
    returned: '已退回',
    in_progress: '进行中',
  }
  return m[status] || status
}

/**
 * 卡片角标：数据库 status 仍为 submitted 时，若已指定项目经理，则与「尚待任何人领取」区分
 */
const pmStatusLabelForCard = (app: any) => {
  if (!app) return ''
  if (app.status === 'submitted' && app.manager_id) {
    return '已领取·待分配'
  }
  return pmStatusLabel(app.status)
}

const pmStatusHint = (status: string) => {
  const h: Record<string, string> = {
    submitted:
      '对应数据库 submitted：申请人已提交，尚未进入专家评议，需项目经理领取并分配专家。',
    under_review:
      '对应数据库 under_review：已分配评审专家，正在评议中。',
    approved: '对应数据库 approved：已通过立项。',
    rejected: '对应数据库 rejected：申请未通过。',
  }
  return h[status] || `当前状态值：${status}`
}

const pmStatusHintForCard = (app: any) => {
  if (!app) return ''
  if (app.status === 'submitted' && app.manager_id) {
    return '数据库状态仍为「已提交」，但已有项目经理负责人，无需再领取；请负责人点击「分配专家」。'
  }
  return pmStatusHint(app.status)
}

const statusBadgeClass = (app: any) => {
  if (!app) return ''
  if (app.status === 'submitted' && app.manager_id) {
    return 'submitted has-manager'
  }
  return app.status
}

const getStatusText = (status: string) => pmStatusLabel(status)

const getStatusClass = (status: string) => {
  return `status-${status}`
}

const getMemberRoleText = (role: string) => {
  const roleMap: Record<string, string> = {
    principal: '负责人',
    co_researcher: '合作研究者',
    research_assistant: '研究助理',
    student: '学生',
    other: '其他',
  }
  return roleMap[role] || role
}

const getReviewTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    initial: '初始评审',
    mid_term: '中期评审',
    final: '结题评审',
    special: '专项评审',
  }
  return typeMap[type] || type
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
const loadApplications = async () => {
  loading.value = true

  try {
    console.log('正在加载项目申请数据...')

    const response = await request.get('/api/assistant/applications', {
      params: getQueryParams(),
    })

    if (response.success && response.data) {
      applications.value = response.data.applications || []
      const p = response.data.pagination
      pagination.value.total =
        (p && typeof p.total === 'number' ? p.total : null) ??
        response.data.total ??
        applications.value.length
      stats.value = response.data.stats || { pending: 0, approved: 0, total: 0 }

      console.log(`✅ 加载了 ${applications.value.length} 条申请记录`)
    } else {
      showMockData()
    }
  } catch (error) {
    console.error('加载申请数据失败:', error)
    ElMessage.error('加载申请数据失败')
    showMockData()
  } finally {
    loading.value = false
  }
}

const loadApplicationDetail = async (applicationId: string) => {
  try {
    const response: any = await request.get(`/api/assistant/applications/${applicationId}/detail`)

    if (response.success && response.data) {
      const data = response.data
      currentApplication.value = data.application
      budgetItems.value = data.budget_items || []
      projectMembers.value = data.members || []
      attachments.value = data.attachments || []
      reviewRecords.value = data.reviews || []
    }
  } catch (error) {
    //console.error('加载申请详情失败:', error)
    //ElMessage.error('加载申请详情失败')
  }
}

const showMockData = () => {
  console.log('使用模拟数据')

  // 模拟项目申请数据
  applications.value = [
    {
      id: 'proj_001',
      project_code: 'RES-2024-001',
      title: '人工智能在医疗诊断中的应用研究',
      category: '基础研究',
      research_field: '人工智能/医疗健康',
      keywords: '人工智能,医疗诊断,深度学习',
      abstract: '研究人工智能技术在医疗影像诊断中的应用，提高诊断准确率...',
      objectives: '1. 开发医疗影像识别算法\n2. 构建诊断辅助系统\n3. 验证系统临床效果',
      applicant_name: '张三教授',
      department: '计算机学院',
      applicant_title: '教授',
      applicant_email: 'zhangsan@university.edu',
      applicant_phone: '13800138000',
      budget_total: 500000,
      duration_months: 24,
      status: 'submitted',
      submit_date: '2024-01-25',
      created_at: '2024-01-25T09:30:00',
      approval_date: null,
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
      submit_date: '2024-01-24',
      created_at: '2024-01-24T14:20:00',
    },
  ]

  stats.value = {
    pending: applications.value.filter(
      (a) => a.status === 'submitted' || a.status === 'under_review',
    ).length,
    approved: 5,
    total: applications.value.length + 5,
  }

  pagination.value.total = applications.value.length
}

const getQueryParams = () => {
  const params: any = {
    page: pagination.value.currentPage,
    pageSize: pagination.value.pageSize,
    sortBy: sortField.value,
    sortOrder: sortOrder.value,
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

  if (listScope.value !== 'all') {
    params.scope = listScope.value
  }

  return params
}

// 筛选功能
const handleSearch = () => {
  pagination.value.currentPage = 1
  loadApplications()
}

const applyFilters = () => {
  pagination.value.currentPage = 1
  loadApplications()
}

const resetFilters = () => {
  filters.value = {
    statuses:
      listScope.value === 'mine'
        ? []
        : listScope.value === 'unassigned'
          ? ['submitted']
          : ['submitted', 'under_review'],
    categories: [],
    dateRange: [],
    minBudget: null,
    maxBudget: null,
  }
  searchKeyword.value = ''
  applyFilters()
}

const sortBy = (field: string) => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortField.value = field
    sortOrder.value = 'desc'
  }
  loadApplications()
}

// 分页功能
const handleSizeChange = (size: number) => {
  pagination.value.pageSize = size
  loadApplications()
}

const handleCurrentChange = (page: number) => {
  pagination.value.currentPage = page
  loadApplications()
}

// 申请操作
const viewApplicationDetail = async (application: any) => {
  currentApplication.value = application
  await loadApplicationDetail(application.id)
  showDetailDialog.value = true
}

const goAssignExperts = (application: any) => {
  router.push(`/assistant/reviewer-assignment/project/${application.id}`)
}

const claimApplication = async (application: any) => {
  try {
    const body: Record<string, string> = { projectId: application.id }
    if (userRole.value === 'admin') {
      const { value } = await ElMessageBox.prompt(
        '请输入要负责该项目的「项目经理用户 ID」（用户管理或数据库 User 表中可查看，例如 usr-pm1）',
        '指派项目经理负责人',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputPlaceholder: '项目经理用户 ID',
        },
      )
      const managerId = (value || '').trim()
      if (!managerId) {
        ElMessage.warning('未填写项目经理 ID')
        return
      }
      body.managerId = managerId
    }
    const response: any = await request.post('/api/assistant/projects/claim', body)
    if (response.success) {
      ElMessage.success(response.message || '操作成功')
      await loadApplications()
      if (showDetailDialog.value && currentApplication.value?.id === application.id) {
        await loadApplicationDetail(application.id)
      }
    } else {
      ElMessage.error(response.error || '操作失败')
    }
  } catch (error: any) {
    if (error === 'cancel' || error?.action === 'cancel') return
    console.error('领取/指派失败:', error)
    ElMessage.error('操作失败')
  }
}

const quickApprove = (application: any) => {
  currentApplication.value = application
  quickApproveForm.value = {
    comment: '',
    approvalDate: new Date().toISOString().split('T')[0],
  }
  showQuickApproveDialog.value = true
}

const approveApplication = async (application: any) => {
  try {
    const response = await request.post(
      `/api/projects/${application.id}/approve`,
      quickApproveForm.value,
    )

    if (response.success) {
      ElMessage.success('项目已审核通过')
      showQuickApproveDialog.value = false
      showDetailDialog.value = false
      loadApplications()
    } else {
      ElMessage.error(response.error || '审核失败')
    }
  } catch (error) {
    console.error('审核通过失败:', error)
    ElMessage.error('审核通过失败')
  }
}

const returnApplication = async (application: any) => {
  try {
    const response = await request.post(`/api/projects/${application.id}/return`, returnForm.value)

    if (response.success) {
      ElMessage.success('项目已退回修改')
      showReturnDialog.value = false
      showDetailDialog.value = false
      loadApplications()
    } else {
      ElMessage.error(response.error || '退回失败')
    }
  } catch (error) {
    console.error('退回项目失败:', error)
    ElMessage.error('退回项目失败')
  }
}

const rejectApplication = async (application: any) => {
  try {
    const response = await request.post(`/api/projects/${application.id}/reject`, rejectForm.value)

    if (response.success) {
      ElMessage.success('项目已拒绝')
      showRejectDialog.value = false
      showDetailDialog.value = false
      loadApplications()
    } else {
      ElMessage.error(response.error || '拒绝失败')
    }
  } catch (error) {
    console.error('拒绝项目失败:', error)
    ElMessage.error('拒绝项目失败')
  }
}

const downloadFile = async (file: any) => {
  try {
    ElMessage.info(`开始下载: ${file.name}`)
    // 实际开发中这里应该调用文件下载API
    // const response = await request.get(`/api/files/${file.id}/download`, { responseType: 'blob' })
    // ... 文件下载处理逻辑
  } catch (error) {
    console.error('下载文件失败:', error)
    ElMessage.error('下载文件失败')
  }
}

const copyApplicationInfo = () => {
  if (!currentApplication.value) return

  const info = [
    `项目编号: ${currentApplication.value.project_code}`,
    `项目标题: ${currentApplication.value.title}`,
    `申请人: ${currentApplication.value.applicant_name}`,
    `部门: ${currentApplication.value.department}`,
    `预算: ¥${formatCurrency(currentApplication.value.budget_total)}`,
    `状态: ${pmStatusLabelForCard(currentApplication.value)}`,
    `提交时间: ${formatDateTime(currentApplication.value.created_at)}`,
  ].join('\n')

  navigator.clipboard
    .writeText(info)
    .then(() => ElMessage.success('申请信息已复制到剪贴板'))
    .catch(() => ElMessage.error('复制失败'))
}

const printApplication = () => {
  ElMessage.info('打印功能开发中...')
}

const exportData = () => {
  ElMessage.info('导出功能开发中...')
}

const refreshData = () => {
  loadApplications()
}

// 初始化（支持从工作台「我负责的项目」带 ?scope=mine 进入）
onMounted(() => {
  const s = String(route.query.scope || '').toLowerCase()
  if (s === 'mine' || s === 'unassigned') {
    listScope.value = s as 'mine' | 'unassigned'
  }
  applyDefaultStatusesForScope(listScope.value)
  loadApplications()
})

// 同页切换查询参数时同步范围与默认筛选（避免仍沿用「仅待受理+评审中」导致列表为空）
watch(
  () => route.query.scope,
  () => {
    const s = String(route.query.scope || '').toLowerCase()
    if (s === 'mine' || s === 'unassigned') {
      listScope.value = s as 'mine' | 'unassigned'
    } else {
      listScope.value = 'all'
    }
    applyDefaultStatusesForScope(listScope.value)
    pagination.value.currentPage = 1
    loadApplications()
  },
)
</script>

<style scoped>
/* 页面整体样式 */
.applications-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20px;
}

/* 页面头部 - 复用之前的样式基础上微调 */
.page-header {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.page-back-row {
  margin-bottom: 16px;
}

.back-to-workbench {
  padding-left: 0;
  font-weight: 500;
}

.back-to-workbench .back-icon {
  margin-right: 4px;
  vertical-align: middle;
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
  color: #b31b1b;
}

.page-subtitle {
  color: #7f8c8d;
  font-size: 14px;
  line-height: 1.5;
}

.page-subtitle strong {
  color: #b31b1b;
  font-weight: 600;
}

.page-hint {
  margin: 10px 0 0;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.55;
  color: #606266;
  background: #fafafa;
  border-left: 3px solid #b31b1b;
  border-radius: 4px;
  max-width: 920px;
}

.page-hint strong {
  color: #303133;
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
  color: #b31b1b;
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
  background: #b31b1b;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.3s;
}

.search-btn:hover {
  background: #c44747;
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
  border-top: 3px solid #b31b1b;
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

.empty-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

/* 申请列表头部 */
.applications-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.applications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.applications-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.applications-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.applications-count {
  font-size: 14px;
  color: #7f8c8d;
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 4px;
}

.applications-actions {
  display: flex;
  gap: 8px;
}

.applications-actions.applications-header-right {
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
}

.applications-actions .scope-radios {
  margin-right: 4px;
}

.meta-value.text-muted {
  color: #909399;
  font-size: 13px;
}

/* 申请卡片网格 */
.applications-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 16px;
}

@media (max-width: 768px) {
  .applications-grid {
    grid-template-columns: 1fr;
  }
}

/* 申请卡片 */
.application-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid #f0f0f0;
  border-left: 4px solid #b31b1b;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.application-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
  border-color: #b31b1b;
}

/* 状态颜色 */
.application-card.status-submitted {
  border-left-color: #b31b1b;
}

.application-card.status-under_review {
  border-left-color: #b31b1b;
}

.application-card.status-approved {
  border-left-color: #b31b1b;
}

.application-card.status-rejected {
  border-left-color: #ff4d4f;
}

.application-card.status-returned {
  border-left-color: #b31b1b;
}

/* 卡片头部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.application-code {
  display: flex;
  align-items: center;
  gap: 8px;
}

.code-icon {
  font-size: 16px;
  opacity: 0.7;
}

.code-text {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #b31b1b;
  font-size: 14px;
}

.application-status .status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  min-width: 60px;
  text-align: center;
}

.status-badge.submitted {
  background: rgba(179,27,27,0.06);
  color: #b31b1b;
  border: 1px solid #bae7ff;
}

.status-badge.submitted.has-manager {
  background: #fff7e6;
  color: #d48806;
  border: 1px solid #ffd591;
}

.status-badge.under_review {
  background: #fff7e6;
  color: #b31b1b;
  border: 1px solid #ffd591;
}

.status-badge.approved {
  background: #f6ffed;
  color: #b31b1b;
  border: 1px solid #b7eb8f;
}

.status-badge.rejected {
  background: #fff2f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
}

.status-badge.returned {
  background: #f9f0ff;
  color: #b31b1b;
  border: 1px solid #d3adf7;
}

/* 卡片主体 */
.card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.application-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.application-summary {
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.application-summary .abstract {
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.application-meta {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
}

.meta-icon {
  opacity: 0.7;
  font-size: 12px;
}

.meta-label {
  color: #7f8c8d;
}

.meta-value {
  font-weight: 500;
  color: #2c3e50;
}

.meta-value.budget {
  color: #b31b1b;
  font-weight: 600;
}

.application-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.category-tag {
  background: rgba(179,27,27,0.06);
  color: #b31b1b;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.field-tag {
  background: #f6ffed;
  color: #b31b1b;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.keyword-tag {
  background: #fff7e6;
  color: #b31b1b;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

/* 卡片底部 */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.application-time {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #7f8c8d;
}

.time-icon {
  font-size: 14px;
}

.time-text {
  font-weight: 500;
}

.time-ago {
  font-size: 12px;
}

.application-actions {
  display: flex;
  gap: 8px;
}

/* 分页 */
.pagination-container {
  display: flex;
  justify-content: center;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}

/* 申请详情弹窗 */
.application-detail-dialog :deep(.el-dialog__header) {
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 16px;
}

.application-detail-dialog :deep(.el-dialog__body) {
  max-height: 70vh;
  overflow-y: auto;
  padding: 0 20px;
}

.application-detail-content {
  padding: 20px 0;
}

/* 状态栏 */
.detail-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 24px;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-label {
  font-size: 14px;
  color: #666;
}

.status-value {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  min-width: 80px;
  text-align: center;
}

.status-value.submitted {
  background: rgba(179,27,27,0.06);
  color: #b31b1b;
}

.status-value.submitted.has-manager {
  background: #fff7e6;
  color: #d48806;
}

.status-value.under_review {
  background: #fff7e6;
  color: #b31b1b;
}

.status-value.approved {
  background: #f6ffed;
  color: #b31b1b;
}

.status-value.rejected {
  background: #fff2f0;
  color: #ff4d4f;
}

.status-value.returned {
  background: #f9f0ff;
  color: #b31b1b;
}

.status-actions {
  display: flex;
  gap: 8px;
}

/* 详情区块 */
.detail-section {
  margin-bottom: 32px;
}

.section-title {
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

.section-icon {
  font-size: 18px;
  color: #b31b1b;
}

/* 基本信息网格 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-label {
  font-size: 14px;
  color: #7f8c8d;
  min-width: 80px;
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: #2c3e50;
}

.info-value.code {
  font-family: 'Courier New', monospace;
  color: #b31b1b;
  font-weight: 600;
}

.info-value.budget {
  color: #b31b1b;
  font-weight: 600;
}

/* 申请人卡片 */
.applicant-info-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.applicant-avatar {
  width: 60px;
  height: 60px;
  background: #b31b1b;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  flex-shrink: 0;
}

.applicant-details {
  flex: 1;
}

.applicant-name {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 12px;
}

.applicant-meta {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.meta-icon {
  font-size: 14px;
  opacity: 0.7;
}

.meta-text {
  font-weight: 500;
}

/* 内容区域 */
.abstract-content,
.objectives-content {
  background: #fafafa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.abstract-content p {
  margin: 0;
  line-height: 1.6;
  color: #2c3e50;
}

.objectives-content pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
  line-height: 1.6;
  color: #2c3e50;
}

/* 预算表格 */
.budget-table-container {
  overflow-x: auto;
}

.budget-table {
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
  color: #b31b1b;
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
  color: #b31b1b;
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
  gap: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.member-avatar {
  width: 40px;
  height: 40px;
  background: #b31b1b;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  flex-shrink: 0;
}

.member-details {
  flex: 1;
}

.member-name {
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 6px;
}

.member-info {
  display: flex;
  gap: 12px;
  font-size: 12px;
  margin-bottom: 4px;
}

.member-role {
  background: rgba(179,27,27,0.06);
  color: #b31b1b;
  padding: 2px 8px;
  border-radius: 4px;
}

.member-workload {
  color: #7f8c8d;
}

.member-responsibility {
  font-size: 12px;
  color: #666;
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
  gap: 16px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.file-icon {
  font-size: 24px;
  width: 40px;
  flex-shrink: 0;
  text-align: center;
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
  gap: 16px;
  font-size: 12px;
  color: #7f8c8d;
}

.download-btn {
  padding: 8px 16px;
  background: white;
  border: 1px solid #b31b1b;
  color: #b31b1b;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.download-btn:hover {
  background: rgba(179,27,27,0.06);
}

/* 审核记录 */
.review-records {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.review-record {
  background: white;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.reviewer-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reviewer-name {
  font-weight: 600;
  color: #2c3e50;
}

.reviewer-department {
  font-size: 13px;
  color: #7f8c8d;
}

.review-time {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.review-date {
  font-weight: 500;
  color: #2c3e50;
}

.review-type {
  font-size: 13px;
  color: #7f8c8d;
}

.record-scores {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 6px;
}

.score-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.score-label {
  font-size: 14px;
  color: #666;
  min-width: 60px;
}

.total-score {
  font-size: 16px;
  font-weight: 700;
  color: #b31b1b;
}

.record-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.review-comment,
.review-suggestions {
  background: white;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
}

.comment-title,
.suggestions-title {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
}

.comment-text,
.suggestions-text {
  margin: 0;
  color: #2c3e50;
  font-size: 14px;
  line-height: 1.5;
}

.review-result {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fafafa;
  border-radius: 6px;
}

.result-label {
  font-weight: 600;
  color: #2c3e50;
}

.result-value {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.result-value.approve {
  background: #f6ffed;
  color: #b31b1b;
}

.result-value.approve_with_revision {
  background: #fff7e6;
  color: #b31b1b;
}

.result-value.reject {
  background: #fff2f0;
  color: #ff4d4f;
}

.result-value.resubmit {
  background: #fff5f5;
  color: #b31b1b;
}

/* 弹窗表单样式 */
.quick-approve-form,
.return-form,
.reject-form {
  padding: 20px 0;
}

/* 弹窗底部按钮 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .applications-page {
    padding: 12px;
  }

  .page-header,
  .filter-panel,
  .main-content {
    padding: 16px;
  }

  .header-main {
    flex-direction: column;
    gap: 20px;
  }

  .header-stats {
    width: 100%;
    justify-content: space-between;
  }

  .stat-card {
    width: 100%;
  }

  .header-actions {
    flex-direction: column;
    gap: 16px;
  }

  .search-box {
    max-width: 100%;
  }

  .action-buttons {
    width: 100%;
    justify-content: flex-end;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }

  .detail-status-bar {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .status-actions {
    flex-wrap: wrap;
  }

  .applicant-meta {
    grid-template-columns: 1fr;
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

  .application-meta {
    grid-template-columns: 1fr;
  }

  .card-footer {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .application-actions {
    justify-content: flex-end;
  }
}
</style>
