<template>
  <div class="report-statistics">
    <!-- 页面标题和控制区域 -->
    <div class="page-header">
      <div class="header-left">
        <h1><i class="el-icon-data-analysis"></i> 报表统计中心</h1>
        <p class="page-subtitle">全面分析项目成果、经费支出和转化情况</p>
      </div>
      <div class="header-right">
        <el-button-group>
          <el-button type="primary" @click="handleRefresh" :loading="loading">
            <i class="el-icon-refresh"></i> 刷新数据
          </el-button>
          <el-button @click="exportReport" :loading="exporting">
            <i class="el-icon-download"></i> 导出报表
          </el-button>
          <el-button @click="printReport"> <i class="el-icon-printer"></i> 打印 </el-button>
        </el-button-group>
        <div class="update-time">
          <span>数据更新时间：{{ lastUpdateTime }}</span>
          <el-tag type="info" size="small" v-if="loading">更新中...</el-tag>
        </div>
      </div>
    </div>

    <!-- 快速统计卡片 -->
    <div class="quick-stats">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="card-content">
              <div class="card-icon" style="background-color: #409eff20">
                <i class="el-icon-trophy" style="color: #409eff"></i>
              </div>
              <div class="card-info">
                <div class="card-value">{{ quickStats.totalAchievements }}</div>
                <div class="card-label">成果总数</div>
                <div class="card-trend" :class="getTrendClass(quickStats.achievementGrowth)">
                  <i :class="getTrendIcon(quickStats.achievementGrowth)"></i>
                  {{ Math.abs(quickStats.achievementGrowth) }}%
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="card-content">
              <div class="card-icon" style="background-color: #67c23a20">
                <i class="el-icon-success" style="color: #67c23a"></i>
              </div>
              <div class="card-info">
                <div class="card-value">{{ quickStats.approvalRate }}%</div>
                <div class="card-label">平均通过率</div>
                <div class="card-trend" :class="getTrendClass(quickStats.rateGrowth)">
                  <i :class="getTrendIcon(quickStats.rateGrowth)"></i>
                  {{ Math.abs(quickStats.rateGrowth) }}%
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="card-content">
              <div class="card-icon" style="background-color: #e6a23c20">
                <i class="el-icon-money" style="color: #e6a23c"></i>
              </div>
              <div class="card-info">
                <div class="card-value">¥{{ formatMoney(quickStats.totalBudget) }}</div>
                <div class="card-label">项目总预算</div>
                <div class="card-trend">
                  <i class="el-icon-wallet"></i>
                  已用 {{ quickStats.budgetUsedPercentage }}%
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="card-content">
              <div class="card-icon" style="background-color: #f56c6c20">
                <i class="el-icon-trend-charts" style="color: #f56c6c"></i>
              </div>
              <div class="card-info">
                <div class="card-value">{{ quickStats.activeProjects }}</div>
                <div class="card-label">活跃项目</div>
                <div class="card-trend">
                  <i class="el-icon-s-flag"></i>
                  {{ quickStats.completedProjects }} 个已完成
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 筛选控制面板 -->
    <div class="filter-panel">
      <el-card shadow="never">
        <template #header>
          <div class="filter-header">
            <span><i class="el-icon-set-up"></i> 筛选设置</span>
            <div>
              <el-button type="text" @click="toggleFilterPanel" size="small">
                {{ showAdvancedFilter ? '收起筛选' : '展开筛选' }}
              </el-button>
              <el-button type="text" @click="resetFilters" size="small">重置</el-button>
            </div>
          </div>
        </template>

        <div class="basic-filters">
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="filter-item">
                <label class="filter-label">时间范围</label>
                <el-select v-model="filterParams.timeRange" @change="handleTimeRangeChange">
                  <el-option label="近7天" value="7d" />
                  <el-option label="近30天" value="30d" />
                  <el-option label="近90天" value="90d" />
                  <el-option label="本季度" value="quarter" />
                  <el-option label="本年度" value="year" />
                  <el-option label="自定义" value="custom" />
                </el-select>
              </div>
            </el-col>

            <el-col :span="8" v-if="filterParams.timeRange === 'custom'">
              <div class="filter-item">
                <label class="filter-label">选择日期</label>
                <el-date-picker
                  v-model="customDateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                />
              </div>
            </el-col>

            <el-col :span="8">
              <div class="filter-item">
                <label class="filter-label">所属项目</label>
                <el-select
                  v-model="filterParams.projectIds"
                  multiple
                  collapse-tags
                  placeholder="选择项目"
                  style="width: 100%"
                  @change="loadFilterData"
                >
                  <el-option
                    v-for="project in projectOptions"
                    :key="project.id"
                    :label="project.name"
                    :value="project.id"
                  >
                    <span>{{ project.name }}</span>
                    <span style="float: right; color: #8492a6; font-size: 13px">
                      {{ project.code }}
                    </span>
                  </el-option>
                </el-select>
              </div>
            </el-col>
          </el-row>
        </div>

        <!-- 高级筛选 -->
        <el-collapse-transition>
          <div v-if="showAdvancedFilter" class="advanced-filters">
            <el-divider />
            <el-row :gutter="20">
              <el-col :span="8">
                <div class="filter-item">
                  <label class="filter-label">成果类型</label>
                  <el-select
                    v-model="filterParams.achievementTypes"
                    multiple
                    collapse-tags
                    placeholder="选择类型"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="type in achievementTypeOptions"
                      :key="type.value"
                      :label="type.label"
                      :value="type.value"
                    />
                  </el-select>
                </div>
              </el-col>

              <el-col :span="8">
                <div class="filter-item">
                  <label class="filter-label">成果状态</label>
                  <el-select
                    v-model="filterParams.achievementStatuses"
                    multiple
                    collapse-tags
                    placeholder="选择状态"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="status in achievementStatusOptions"
                      :key="status.value"
                      :label="status.label"
                      :value="status.value"
                    />
                  </el-select>
                </div>
              </el-col>

              <el-col :span="8">
                <div class="filter-item">
                  <label class="filter-label">排序方式</label>
                  <el-select
                    v-model="filterParams.sortBy"
                    placeholder="选择排序"
                    style="width: 100%"
                  >
                    <el-option label="按创建时间" value="created_at" />
                    <el-option label="按成果数量" value="count" />
                    <el-option label="按通过率" value="rate" />
                    <el-option label="按预算金额" value="budget" />
                  </el-select>
                </div>
              </el-col>
            </el-row>
          </div>
        </el-collapse-transition>

        <div class="filter-actions">
          <el-button @click="toggleFilterPanel" plain>
            {{ showAdvancedFilter ? '简化筛选' : '高级筛选' }}
          </el-button>
          <el-button type="primary" @click="loadData" :loading="loading">
            <i class="el-icon-search"></i> 查询数据
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- 主要统计内容 -->
    <div class="main-content">
      <!-- 成果统计 -->
      <div class="section-title">
        <h2><i class="el-icon-trophy"></i> 成果统计分析</h2>
        <div class="section-actions">
          <el-radio-group v-model="chartViewMode" size="small">
            <el-radio-button label="chart">图表</el-radio-button>
            <el-radio-button label="table">表格</el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <div class="achievement-stats">
        <el-row :gutter="20">
          <!-- 成果类型分布 -->
          <el-col :span="12">
            <el-card class="chart-card">
              <template #header>
                <div class="chart-header">
                  <span>成果类型分布</span>
                  <el-select v-model="distributionType" size="small" style="width: 120px">
                    <el-option label="饼图" value="pie" />
                    <el-option label="柱状图" value="bar" />
                  </el-select>
                </div>
              </template>
              <div class="chart-container">
                <div
                  v-if="achievementDistribution.length > 0"
                  id="achievement-distribution-chart"
                  style="height: 300px"
                ></div>
                <el-empty v-else description="暂无数据" :image-size="100" />
              </div>
            </el-card>
          </el-col>

          <!-- 成果状态分布 -->
          <el-col :span="12">
            <el-card class="chart-card">
              <template #header>
                <div class="chart-header">
                  <span>成果状态分布</span>
                  <el-tag type="info">总计: {{ achievementStats.total }}</el-tag>
                </div>
              </template>
              <div class="chart-container">
                <div
                  v-if="achievementStatusData.length > 0"
                  id="achievement-status-chart"
                  style="height: 300px"
                ></div>
                <el-empty v-else description="暂无数据" :image-size="100" />
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 成果趋势 -->
        <el-row :gutter="20" style="margin-top: 20px">
          <el-col :span="24">
            <el-card class="chart-card">
              <template #header>
                <div class="chart-header">
                  <span>成果数量趋势</span>
                  <div class="chart-actions">
                    <el-select v-model="trendPeriod" size="small" style="width: 100px">
                      <el-option label="按日" value="day" />
                      <el-option label="按周" value="week" />
                      <el-option label="按月" value="month" />
                    </el-select>
                    <el-button type="text" @click="showTrendDetail">详情</el-button>
                  </div>
                </div>
              </template>
              <div class="chart-container">
                <div
                  v-if="achievementTrend.length > 0"
                  id="achievement-trend-chart"
                  style="height: 300px"
                ></div>
                <el-empty v-else description="暂无数据" :image-size="100" />
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 项目成果排名 -->
        <el-row :gutter="20" style="margin-top: 20px">
          <el-col :span="24">
            <el-card class="chart-card">
              <template #header>
                <div class="chart-header">
                  <span>项目成果排名</span>
                  <el-select v-model="rankLimit" size="small" style="width: 100px">
                    <el-option label="Top 5" :value="5" />
                    <el-option label="Top 10" :value="10" />
                    <el-option label="Top 20" :value="20" />
                  </el-select>
                </div>
              </template>
              <div class="chart-container">
                <div v-if="projectRanking.length > 0" class="ranking-list">
                  <div
                    v-for="(project, index) in projectRanking"
                    :key="project.id"
                    class="ranking-item"
                  >
                    <div class="ranking-order">
                      <span v-if="index < 3" class="medal" :class="`medal-${index + 1}`">
                        {{ index + 1 }}
                      </span>
                      <span v-else class="order-number">{{ index + 1 }}</span>
                    </div>
                    <div class="ranking-info">
                      <div class="project-name">
                        {{ project.name }}
                        <el-tag v-if="project.project_code" size="mini">{{
                          project.project_code
                        }}</el-tag>
                      </div>
                      <div class="project-stats">
                        <span class="stat-item">
                          <i class="el-icon-trophy"></i> {{ project.count }} 个成果
                        </span>
                        <span class="stat-item">
                          <i class="el-icon-success"></i> {{ project.rate }}% 通过率
                        </span>
                      </div>
                    </div>
                    <div class="ranking-progress">
                      <el-progress
                        :percentage="getRankingPercentage(project.count)"
                        :color="getRankingColor(index)"
                        :show-text="false"
                      />
                    </div>
                  </div>
                </div>
                <el-empty v-else description="暂无数据" :image-size="100" />
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 经费统计分析 -->
      <div class="section-title" style="margin-top: 30px">
        <h2><i class="el-icon-money"></i> 经费统计分析</h2>
      </div>

      <div class="funding-stats">
        <el-row :gutter="20">
          <!-- 经费概览 -->
          <el-col :span="24">
            <el-card class="funding-overview">
              <template #header>
                <div class="chart-header">
                  <span>经费使用情况</span>
                  <el-button type="text" @click="showFundingDetail">查看详情</el-button>
                </div>
              </template>
              <div class="funding-content">
                <div class="funding-summary">
                  <div class="summary-item">
                    <div class="summary-label">总预算</div>
                    <div class="summary-value">¥{{ formatMoney(fundingStats.totalBudget) }}</div>
                  </div>
                  <div class="summary-item">
                    <div class="summary-label">已使用</div>
                    <div class="summary-value text-danger">
                      ¥{{ formatMoney(fundingStats.usedAmount) }}
                    </div>
                  </div>
                  <div class="summary-item">
                    <div class="summary-label">可用余额</div>
                    <div class="summary-value text-success">
                      ¥{{ formatMoney(fundingStats.availableBalance) }}
                    </div>
                  </div>
                  <div class="summary-item">
                    <div class="summary-label">使用率</div>
                    <div class="summary-value">
                      <el-progress
                        :percentage="fundingStats.usedPercentage"
                        :color="getFundingPercentageColor(fundingStats.usedPercentage)"
                        style="width: 200px"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 支出分类统计 -->
        <el-row :gutter="20" style="margin-top: 20px">
          <el-col :span="12">
            <el-card class="chart-card">
              <template #header>
                <div class="chart-header">
                  <span>支出分类统计</span>
                </div>
              </template>
              <div class="chart-container">
                <div
                  v-if="expenditureCategories.length > 0"
                  id="expenditure-category-chart"
                  style="height: 300px"
                ></div>
                <el-empty v-else description="暂无数据" :image-size="100" />
              </div>
            </el-card>
          </el-col>

          <!-- 支出趋势 -->
          <el-col :span="12">
            <el-card class="chart-card">
              <template #header>
                <div class="chart-header">
                  <span>月度支出趋势</span>
                </div>
              </template>
              <div class="chart-container">
                <div
                  v-if="expenditureTrend.length > 0"
                  id="expenditure-trend-chart"
                  style="height: 300px"
                ></div>
                <el-empty v-else description="暂无数据" :image-size="100" />
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </div>

    <!-- 数据表格视图 -->
    <el-dialog v-model="showDataTable" :title="tableTitle" width="90%" top="5vh">
      <div class="data-table-view">
        <el-table
          :data="tableData"
          v-loading="tableLoading"
          border
          stripe
          style="width: 100%; margin-bottom: 20px"
        >
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="name" label="项目名称" min-width="180" />
          <el-table-column prop="code" label="项目编号" width="120" align="center" />
          <el-table-column prop="achievement_count" label="成果数量" width="100" align="center" />
          <el-table-column prop="approved_count" label="已通过" width="100" align="center">
            <template #default="{ row }">
              <el-tag type="success" size="small">{{ row.approved_count }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="approval_rate" label="通过率" width="100" align="center">
            <template #default="{ row }">
              <el-progress
                :percentage="row.approval_rate"
                :color="getProgressColor(row.approval_rate)"
                :show-text="false"
                style="width: 60px; margin: 0 auto"
              />
              <span style="margin-left: 5px">{{ row.approval_rate }}%</span>
            </template>
          </el-table-column>
          <el-table-column prop="budget" label="预算(¥)" width="120" align="right">
            <template #default="{ row }">{{ formatMoney(row.budget) }}</template>
          </el-table-column>
          <el-table-column prop="used_amount" label="已使用(¥)" width="120" align="right">
            <template #default="{ row }">{{ formatMoney(row.used_amount) }}</template>
          </el-table-column>
          <el-table-column prop="usage_rate" label="使用率" width="120" align="center">
            <template #default="{ row }">
              <el-progress
                :percentage="row.usage_rate"
                :color="getFundingPercentageColor(row.usage_rate)"
              />
            </template>
          </el-table-column>
          <el-table-column prop="status" label="项目状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="getProjectStatusType(row.status)" size="small">
                {{ getProjectStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="创建时间" width="120" align="center" />
        </el-table>

        <div class="table-summary">
          <div class="summary-stats">
            共 {{ tableData.length }} 个项目，总预算 ¥{{ formatMoney(tableSummary.totalBudget) }}，
            平均通过率 {{ tableSummary.avgApprovalRate }}%
          </div>
          <el-pagination
            v-model:current-page="tablePage"
            v-model:page-size="tablePageSize"
            :total="tableTotal"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadTableData"
            @current-change="loadTableData"
          />
        </div>
      </div>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailDialogVisible" :title="detailTitle" width="600px">
      <div v-if="currentDetail" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="项目名称">{{ currentDetail.name }}</el-descriptions-item>
          <el-descriptions-item label="项目编号">{{ currentDetail.code }}</el-descriptions-item>
          <el-descriptions-item label="成果总数">{{
            currentDetail.achievement_count
          }}</el-descriptions-item>
          <el-descriptions-item label="已通过">{{
            currentDetail.approved_count
          }}</el-descriptions-item>
          <el-descriptions-item label="通过率"
            >{{ currentDetail.approval_rate }}%</el-descriptions-item
          >
          <el-descriptions-item label="项目状态">
            <el-tag :type="getProjectStatusType(currentDetail.status)" size="small">
              {{ getProjectStatusLabel(currentDetail.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="项目预算">
            ¥{{ formatMoney(currentDetail.budget) }}
          </el-descriptions-item>
          <el-descriptions-item label="已使用金额">
            ¥{{ formatMoney(currentDetail.used_amount) }}
          </el-descriptions-item>
          <el-descriptions-item label="使用率" :span="2">
            <el-progress
              :percentage="currentDetail.usage_rate"
              :color="getFundingPercentageColor(currentDetail.usage_rate)"
              style="width: 200px"
            />
          </el-descriptions-item>
          <el-descriptions-item label="创建时间" :span="2">
            {{ formatDateTime(currentDetail.created_at) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import * as echarts from 'echarts'
import api from '@/api/index'
import { Download, Refresh, Printer, ArrowUp, ArrowDown, Minus } from '@element-plus/icons-vue'

// 响应式数据
const loading = ref(false)
const exporting = ref(false)
const showAdvancedFilter = ref(false)
const showDataTable = ref(false)
const detailDialogVisible = ref(false)
const tableLoading = ref(false)
const chartViewMode = ref('chart')
const distributionType = ref('pie')
const trendPeriod = ref('month')
const rankLimit = ref(10)
const lastUpdateTime = ref('')

// 表格数据
const tableData = ref([])
const tablePage = ref(1)
const tablePageSize = ref(10)
const tableTotal = ref(0)
const tableTitle = ref('')
const currentDetail = ref(null)
const detailTitle = ref('')

// 筛选参数
const filterParams = reactive({
  timeRange: '30d',
  projectIds: [],
  achievementTypes: [],
  achievementStatuses: [],
  sortBy: 'created_at',
})

const customDateRange = ref([])
const projectOptions = ref([])
const achievementTypeOptions = [
  { label: '论文', value: 'paper' },
  { label: '专利', value: 'patent' },
  { label: '软件著作权', value: 'software' },
  { label: '专著', value: 'monograph' },
  { label: '奖项', value: 'award' },
  { label: '报告', value: 'report' },
  { label: '原型', value: 'prototype' },
  { label: '标准', value: 'standard' },
  { label: '其他', value: 'other' },
]

const achievementStatusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '已提交', value: 'submitted' },
  { label: '审核中', value: 'under_review' },
  { label: '已验证', value: 'verified' },
  { label: '已发布', value: 'published' },
  { label: '已驳回', value: 'rejected' },
  { label: '已退回', value: 'returned' },
  { label: '已转化', value: 'transferred' },
]

// 统计数据
const quickStats = reactive({
  totalAchievements: 0,
  achievementGrowth: 0,
  approvalRate: 0,
  rateGrowth: 0,
  totalBudget: 0,
  budgetUsedPercentage: 0,
  activeProjects: 0,
  completedProjects: 0,
})

const achievementStats = reactive({
  total: 0,
  approved: 0,
  pending: 0,
  rejected: 0,
  approvalRate: 0,
})

const achievementDistribution = ref([])
const achievementStatusData = ref([])
const achievementTrend = ref([])
const projectRanking = ref([])

const fundingStats = reactive({
  totalBudget: 0,
  usedAmount: 0,
  availableBalance: 0,
  usedPercentage: 0,
  pendingApplications: 0,
})

const expenditureCategories = ref([])
const expenditureTrend = ref([])

// 图表实例
let achievementDistributionChart = null
let achievementStatusChart = null
let achievementTrendChart = null
let expenditureCategoryChart = null
let expenditureTrendChart = null

// 计算属性
const tableSummary = computed(() => {
  const totalBudget = tableData.value.reduce((sum, item) => sum + (item.budget || 0), 0)
  const totalApprovalRate = tableData.value.reduce(
    (sum, item) => sum + (item.approval_rate || 0),
    0,
  )
  const avgApprovalRate =
    tableData.value.length > 0 ? (totalApprovalRate / tableData.value.length).toFixed(1) : 0

  return {
    totalBudget,
    avgApprovalRate,
  }
})

// 辅助函数
const formatMoney = (amount) => {
  if (!amount) return '0.00'
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

const getTrendClass = (value) => {
  return value > 0 ? 'trend-up' : value < 0 ? 'trend-down' : 'trend-neutral'
}

const getTrendIcon = (value) => {
  return value > 0 ? 'el-icon-top' : value < 0 ? 'el-icon-bottom' : 'el-icon-minus'
}

const getProgressColor = (percentage) => {
  if (percentage >= 80) return '#67c23a'
  if (percentage >= 60) return '#e6a23c'
  return '#f56c6c'
}

const getFundingPercentageColor = (percentage) => {
  if (percentage <= 60) return '#67c23a'
  if (percentage <= 80) return '#e6a23c'
  return '#f56c6c'
}

const getProjectStatusType = (status) => {
  const statusMap = {
    draft: 'info',
    submitted: 'warning',
    under_review: 'warning',
    approved: 'success',
    in_progress: 'primary',
    stage_review: 'warning',
    completed: 'success',
    terminated: 'danger',
  }
  return statusMap[status] || 'info'
}

const getProjectStatusLabel = (status) => {
  const statusMap = {
    draft: '草稿',
    submitted: '已提交',
    under_review: '评审中',
    approved: '已批准',
    in_progress: '进行中',
    stage_review: '阶段评审',
    completed: '已完成',
    terminated: '已终止',
  }
  return statusMap[status] || status
}

const getRankingColor = (index) => {
  const colors = ['#ffd700', '#c0c0c0', '#cd7f32', '#409eff', '#67c23a']
  return colors[index] || '#909399'
}

const getRankingPercentage = (count) => {
  if (projectRanking.value.length === 0) return 0
  const maxCount = Math.max(...projectRanking.value.map((p) => p.count))
  return maxCount > 0 ? Math.round((count / maxCount) * 100) : 0
}

// 事件处理
const toggleFilterPanel = () => {
  showAdvancedFilter.value = !showAdvancedFilter.value
}

const resetFilters = () => {
  filterParams.timeRange = '30d'
  filterParams.projectIds = []
  filterParams.achievementTypes = []
  filterParams.achievementStatuses = []
  filterParams.sortBy = 'created_at'
  customDateRange.value = []

  loadData()
  ElMessage.success('筛选条件已重置')
}

const handleTimeRangeChange = (value) => {
  if (value !== 'custom') {
    loadData()
  }
}

const handleRefresh = () => {
  loadData()
  ElMessage.success('数据已刷新')
}

const loadFilterData = async () => {
  // 加载项目列表
  try {
    const response = await api.get('/api/projects', {
      params: {
        limit: 100,
        page: 1,
      },
    })

    if (response.success && response.data) {
      projectOptions.value = response.data.data.map((project) => ({
        id: project.id,
        name: project.title || '未命名项目',
        code: project.project_code || '',
      }))
    }
  } catch (error) {
    console.error('加载项目列表失败:', error)
  }
}

const loadData = async () => {
  loading.value = true

  try {
    // 获取快速统计
    await loadQuickStats()

    // 获取成果统计
    await loadAchievementStats()

    // 获取经费统计
    await loadFundingStats()

    // 获取支出统计
    await loadExpenditureStats()

    // 渲染图表
    nextTick(() => {
      renderCharts()
    })

    lastUpdateTime.value = new Date().toLocaleString()
    ElMessage.success('数据加载成功')
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('数据加载失败：' + error.message)
  } finally {
    loading.value = false
  }
}

const loadQuickStats = async () => {
  try {
    const [achievementRes, budgetRes, projectRes] = await Promise.all([
      api.get('/api/achievements/stats'),
      api.get('/api/funding/stats'),
      api.get('/api/projects', {
        params: {
          limit: 100,
          status: 'in_progress',
        },
      }),
    ])

    if (achievementRes.success && achievementRes.data) {
      quickStats.totalAchievements = achievementRes.data.total || 0
      quickStats.approvalRate = achievementRes.data.overview?.approvalRate || 0
    }

    if (budgetRes.success && budgetRes.data) {
      const data = budgetRes.data.data
      quickStats.totalBudget = data.total_budget || 0
      quickStats.budgetUsedPercentage = data.used_percentage || 0
    }

    if (projectRes.success && projectRes.data) {
      quickStats.activeProjects = projectRes.data.count || 0
    }
  } catch (error) {
    console.error('加载快速统计失败:', error)
  }
}

const loadAchievementStats = async () => {
  try {
    // 构建查询参数
    const params = {
      start_date: getStartDate(),
      end_date: new Date().toISOString().split('T')[0],
    }

    if (filterParams.projectIds.length > 0) {
      params.project_ids = filterParams.projectIds.join(',')
    }

    // 获取成果统计摘要
    const summaryRes = await api.get('/api/reports/achievements/summary', { params })
    if (summaryRes.success && summaryRes.data?.data?.summary) {
      const summary = summaryRes.data.data.summary
      achievementStats.total = summary.total || 0
      achievementStats.approved = summary.approved || 0
      achievementStats.pending = summary.pending || 0
      achievementStats.rejected = summary.rejected || 0
      achievementStats.approvalRate = summary.approvalRate || 0
    }

    // 获取成果分布
    const distributionRes = await api.get('/api/reports/achievements/distribution', {
      params: { ...params, dimension: 'type' },
    })
    if (distributionRes.success && distributionRes.data?.data) {
      achievementDistribution.value = distributionRes.data.data
    }

    // 获取成果状态分布
    const statusRes = await api.get('/api/reports/achievements/distribution', {
      params: { ...params, dimension: 'status' },
    })
    if (statusRes.success && statusRes.data?.data) {
      achievementStatusData.value = statusRes.data.data
    }

    // 获取成果趋势
    const trendRes = await api.get('/api/reports/achievements/trend', {
      params: {
        period: 30,
        group_by: trendPeriod.value,
      },
    })
    if (trendRes.success && trendRes.data?.data) {
      achievementTrend.value = trendRes.data.data
    }

    // 获取项目排名
    const rankingRes = await api.get('/api/reports/projects/ranking', {
      params: {
        limit: rankLimit.value,
        order_by: 'count',
      },
    })
    if (rankingRes.success && rankingRes.data?.data) {
      projectRanking.value = rankingRes.data.data
    }
  } catch (error) {
    console.error('加载成果统计失败:', error)
  }
}

const loadFundingStats = async () => {
  try {
    const response = await api.get('/api/funding/stats')
    if (response.success && response.data?.data) {
      const data = response.data.data
      fundingStats.totalBudget = data.total_budget || 0
      fundingStats.usedAmount = data.used_amount || 0
      fundingStats.availableBalance = data.available_balance || 0
      fundingStats.usedPercentage = data.used_percentage || 0
      fundingStats.pendingApplications = data.pending_applications || 0
    }
  } catch (error) {
    console.error('加载经费统计失败:', error)
  }
}

const loadExpenditureStats = async () => {
  try {
    const [categoryRes, trendRes] = await Promise.all([
      api.get('/api/expenditures/category-stats'),
      api.get('/api/expenditures/trend', {
        params: { period: 30 },
      }),
    ])

    if (categoryRes.success && categoryRes.data?.data) {
      expenditureCategories.value = categoryRes.data.data
    }

    if (trendRes.success && trendRes.data?.data) {
      expenditureTrend.value = trendRes.data.data
    }
  } catch (error) {
    console.error('加载支出统计失败:', error)
  }
}

const loadTableData = async () => {
  tableLoading.value = true

  try {
    const response = await api.get('/api/reports/achievements/detailed', {
      params: {
        page: tablePage.value,
        limit: tablePageSize.value,
        sort_by: 'total',
        sort_order: 'desc',
      },
    })

    if (response.success && response.data?.data) {
      tableData.value = response.data.data.table_data || []
      tableTotal.value = response.data.data.pagination?.total || 0
    }
  } catch (error) {
    console.error('加载表格数据失败:', error)
    ElMessage.error('加载表格数据失败')
  } finally {
    tableLoading.value = false
  }
}

const getStartDate = () => {
  const now = new Date()
  const startDate = new Date()

  switch (filterParams.timeRange) {
    case '7d':
      startDate.setDate(now.getDate() - 7)
      break
    case '30d':
      startDate.setDate(now.getDate() - 30)
      break
    case '90d':
      startDate.setDate(now.getDate() - 90)
      break
    case 'quarter':
      startDate.setMonth(now.getMonth() - 3)
      break
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1)
      break
    case 'custom':
      if (customDateRange.value && customDateRange.value.length === 2) {
        return customDateRange.value[0]
      }
      break
  }

  return startDate.toISOString().split('T')[0]
}

const renderCharts = () => {
  // 销毁已有图表实例
  const charts = [
    achievementDistributionChart,
    achievementStatusChart,
    achievementTrendChart,
    expenditureCategoryChart,
    expenditureTrendChart,
  ]

  charts.forEach((chart) => {
    if (chart) {
      chart.dispose()
    }
  })

  // 渲染成果类型分布图
  if (achievementDistribution.value.length > 0) {
    const chartDom = document.getElementById('achievement-distribution-chart')
    if (chartDom) {
      achievementDistributionChart = echarts.init(chartDom)

      const option = {
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)',
        },
        legend: {
          type: 'scroll',
          orient: 'vertical',
          right: 10,
          top: 20,
          bottom: 20,
          textStyle: {
            fontSize: 12,
          },
        },
        series: [
          {
            name: '成果类型',
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 10,
              borderColor: '#fff',
              borderWidth: 2,
            },
            label: {
              show: false,
              position: 'center',
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 18,
                fontWeight: 'bold',
              },
            },
            labelLine: {
              show: false,
            },
            data: achievementDistribution.value.map((item) => ({
              name: item.label || item.type,
              value: item.count,
            })),
          },
        ],
      }

      achievementDistributionChart.setOption(option)
    }
  }

  // 渲染成果状态分布图
  if (achievementStatusData.value.length > 0) {
    const chartDom = document.getElementById('achievement-status-chart')
    if (chartDom) {
      achievementStatusChart = echarts.init(chartDom)

      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow',
          },
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          data: achievementStatusData.value.map((item) => item.label || item.type),
          axisLabel: {
            rotate: 45,
          },
        },
        yAxis: {
          type: 'value',
        },
        series: [
          {
            name: '成果数量',
            type: 'bar',
            barWidth: '60%',
            data: achievementStatusData.value.map((item) => ({
              value: item.count,
              itemStyle: {
                color: getStatusColor(item.type),
              },
            })),
          },
        ],
      }

      achievementStatusChart.setOption(option)
    }
  }

  // 渲染成果趋势图
  if (achievementTrend.value.length > 0) {
    const chartDom = document.getElementById('achievement-trend-chart')
    if (chartDom) {
      achievementTrendChart = echarts.init(chartDom)

      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
          },
        },
        legend: {
          data: ['总数', '通过', '待审', '驳回'],
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: achievementTrend.value.map((item) => item.date),
        },
        yAxis: {
          type: 'value',
        },
        series: [
          {
            name: '总数',
            type: 'line',
            smooth: true,
            data: achievementTrend.value.map((item) => item.total),
          },
          {
            name: '通过',
            type: 'line',
            smooth: true,
            data: achievementTrend.value.map((item) => item.approved),
          },
          {
            name: '待审',
            type: 'line',
            smooth: true,
            data: achievementTrend.value.map((item) => item.pending),
          },
          {
            name: '驳回',
            type: 'line',
            smooth: true,
            data: achievementTrend.value.map((item) => item.rejected),
          },
        ],
      }

      achievementTrendChart.setOption(option)
    }
  }

  // 渲染支出分类图
  if (expenditureCategories.value.length > 0) {
    const chartDom = document.getElementById('expenditure-category-chart')
    if (chartDom) {
      expenditureCategoryChart = echarts.init(chartDom)

      const option = {
        tooltip: {
          trigger: 'item',
          formatter: '{b}: ¥{c} ({d}%)',
        },
        legend: {
          type: 'scroll',
          orient: 'vertical',
          right: 10,
          top: 20,
          bottom: 20,
        },
        series: [
          {
            name: '支出分类',
            type: 'pie',
            radius: '55%',
            center: ['40%', '50%'],
            data: expenditureCategories.value.map((item) => ({
              name: item.category,
              value: item.total_amount,
            })),
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
          },
        ],
      }

      expenditureCategoryChart.setOption(option)
    }
  }

  // 渲染支出趋势图
  if (expenditureTrend.value.length > 0) {
    const chartDom = document.getElementById('expenditure-trend-chart')
    if (chartDom) {
      expenditureTrendChart = echarts.init(chartDom)

      const option = {
        tooltip: {
          trigger: 'axis',
          formatter: '{b}<br/>支出: ¥{c}',
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: expenditureTrend.value.map((item) => item.date),
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            formatter: '¥{value}',
          },
        },
        series: [
          {
            name: '支出金额',
            type: 'line',
            smooth: true,
            lineStyle: {
              width: 3,
            },
            areaStyle: {
              opacity: 0.1,
            },
            data: expenditureTrend.value.map((item) => item.amount),
          },
        ],
      }

      expenditureTrendChart.setOption(option)
    }
  }
}

const getStatusColor = (status) => {
  const colorMap = {
    draft: '#909399',
    submitted: '#e6a23c',
    under_review: '#e6a23c',
    verified: '#67c23a',
    published: '#67c23a',
    rejected: '#f56c6c',
    returned: '#e6a23c',
    transferred: '#409eff',
  }
  return colorMap[status] || '#909399'
}

const showTrendDetail = () => {
  tableTitle.value = '成果趋势详情'
  showDataTable.value = true
  loadTableData()
}

const showFundingDetail = () => {
  tableTitle.value = '经费使用详情'
  showDataTable.value = true
  loadTableData()
}

const exportReport = async () => {
  exporting.value = true

  try {
    const response = await api.get('/api/reports/export', {
      params: {
        report_type: 'achievements',
        start_date: getStartDate(),
        end_date: new Date().toISOString().split('T')[0],
      },
      responseType: 'blob',
    })

    const blob = new Blob([response], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `report_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('报表导出成功')
  } catch (error) {
    console.error('导出报表失败:', error)
    ElMessage.error('导出报表失败')
  } finally {
    exporting.value = false
  }
}

const printReport = () => {
  window.print()
}

const showProjectDetail = (project) => {
  currentDetail.value = project
  detailTitle.value = `${project.name} - 项目详情`
  detailDialogVisible.value = true
}

// 生命周期
onMounted(() => {
  loadFilterData()
  loadData()

  // 监听窗口大小变化，重新渲染图表
  window.addEventListener('resize', renderCharts)
})

// 监听筛选参数变化
watch([() => filterParams.timeRange, () => filterParams.sortBy, trendPeriod, rankLimit], () => {
  loadData()
})

watch(chartViewMode, () => {
  if (chartViewMode.value === 'table') {
    tableTitle.value = '详细数据'
    showDataTable.value = true
    loadTableData()
  }
})

watch(distributionType, () => {
  renderCharts()
})
</script>

<style scoped>
.report-statistics {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
}

.header-left h1 {
  margin: 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.page-subtitle {
  margin: 8px 0 0;
  color: #909399;
  font-size: 14px;
}

.header-right {
  text-align: right;
}

.update-time {
  margin-top: 10px;
  font-size: 12px;
  color: #909399;
}

.quick-stats {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.card-content {
  display: flex;
  align-items: center;
}

.card-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
}

.card-icon i {
  font-size: 28px;
}

.card-info {
  flex: 1;
}

.card-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  line-height: 1.2;
}

.card-label {
  font-size: 14px;
  color: #909399;
  margin: 4px 0;
}

.card-trend {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.trend-up {
  color: #67c23a;
}

.trend-down {
  color: #f56c6c;
}

.trend-neutral {
  color: #909399;
}

.filter-panel {
  margin-bottom: 20px;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-item {
  margin-bottom: 15px;
}

.filter-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.filter-actions {
  text-align: right;
  padding-top: 15px;
  border-top: 1px solid #ebeef5;
  margin-top: 15px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #409eff;
}

.section-title h2 {
  margin: 0;
  color: #303133;
  font-size: 18px;
}

.chart-card {
  margin-bottom: 20px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  min-height: 300px;
  padding: 10px 0;
}

.ranking-list {
  padding: 10px;
}

.ranking-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 10px;
  background: #fafafa;
  border-radius: 8px;
  transition: all 0.3s;
}

.ranking-item:hover {
  background: #f0f9ff;
  transform: translateY(-2px);
}

.ranking-order {
  width: 40px;
  text-align: center;
}

.medal {
  display: inline-block;
  width: 30px;
  height: 30px;
  line-height: 30px;
  border-radius: 50%;
  font-weight: bold;
  color: white;
  text-align: center;
}

.medal-1 {
  background: #ffd700;
}

.medal-2 {
  background: #c0c0c0;
}

.medal-3 {
  background: #cd7f32;
}

.order-number {
  font-size: 18px;
  font-weight: bold;
  color: #909399;
}

.ranking-info {
  flex: 1;
  margin: 0 15px;
}

.project-name {
  font-weight: 500;
  color: #303133;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.project-stats {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #909399;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ranking-progress {
  width: 150px;
}

.funding-overview {
  margin-bottom: 20px;
}

.funding-content {
  padding: 20px;
}

.funding-summary {
  display: flex;
  justify-content: space-around;
  text-align: center;
}

.summary-item {
  flex: 1;
  padding: 0 20px;
}

.summary-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.summary-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.text-danger {
  color: #f56c6c;
}

.text-success {
  color: #67c23a;
}

.data-table-view {
  padding: 10px;
}

.table-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
}

.summary-stats {
  font-size: 14px;
  color: #606266;
}

.detail-content {
  line-height: 1.6;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .funding-summary {
    flex-wrap: wrap;
  }

  .summary-item {
    flex: 0 0 50%;
    margin-bottom: 20px;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 15px;
  }

  .header-right {
    text-align: left;
    width: 100%;
  }

  .quick-stats .el-col {
    margin-bottom: 15px;
  }

  .basic-filters .el-col,
  .advanced-filters .el-col {
    margin-bottom: 15px;
  }

  .funding-summary {
    flex-direction: column;
  }

  .summary-item {
    margin-bottom: 15px;
    text-align: left;
  }

  .table-summary {
    flex-direction: column;
    gap: 15px;
  }
}
</style>

<style>
/* 打印样式 */
@media print {
  .page-header .el-button-group,
  .filter-panel,
  .section-actions,
  .el-dialog {
    display: none !important;
  }

  .report-statistics {
    padding: 0;
    background: white;
  }

  .stat-card,
  .chart-card {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
</style>
