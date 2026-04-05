// src/utils/dataManager.js
export const DataManager = {
  // 数据获取方法（每次都从 localStorage 读取最新数据）
  getData(key, defaultValue = []) {
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : defaultValue
    } catch (error) {
      console.error(`读取 ${key} 数据失败:`, error)
      return defaultValue
    }
  },

  setData(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data))
      return true
    } catch (error) {
      console.error(`保存 ${key} 数据失败:`, error)
      return false
    }
  },

  // 获取各种数据
  get projects() {
    return this.getData('projects')
  },

  get reviewTasks() {
    return this.getData('reviewTasks')
  },

  get reviewHistory() {
    return this.getData('reviewHistory')
  },

  // 初始化测试数据
  initSampleData() {
    // 只有数据为空时才初始化
    if (this.projects.length === 0) {
      const sampleProjects = [
        {
          id: 'PROJ-2024-001',
          title: '人工智能在医疗诊断中的应用研究',
          type: '自然科学基金',
          budget: 500000,
          duration: 24,
          applicant: '张教授',
          organization: '清华大学',
          applyDate: '2024-01-15',
          deadline: '2024-03-15',
          abstract: '本项目研究人工智能在医疗诊断中的应用，旨在提高诊断准确率和效率...',
          keywords: ['人工智能', '医疗诊断', '深度学习'],
          status: 'under_review', // submitted, under_review, reviewed, approved, rejected
          attachments: [],
          createdAt: '2024-01-10T08:00:00Z',
        },
        {
          id: 'PROJ-2024-002',
          title: '新型钙钛矿太阳能电池材料研究',
          type: '重点研发计划',
          budget: 800000,
          duration: 36,
          applicant: '李教授',
          organization: '北京大学',
          applyDate: '2024-01-20',
          deadline: '2024-04-20',
          abstract: '研究新型钙钛矿太阳能电池材料，提高光电转换效率和稳定性...',
          keywords: ['太阳能电池', '钙钛矿', '新能源'],
          status: 'under_review',
          attachments: [],
          createdAt: '2024-01-15T08:00:00Z',
        },
        {
          id: 'PROJ-2024-003',
          title: '量子计算在药物研发中的应用',
          type: '科技重大专项',
          budget: 1200000,
          duration: 48,
          applicant: '王教授',
          organization: '中国科学技术大学',
          applyDate: '2024-02-01',
          deadline: '2024-05-01',
          abstract: '探索量子计算在药物分子模拟和筛选中的应用...',
          keywords: ['量子计算', '药物研发', '分子模拟'],
          status: 'under_review',
          attachments: [],
          createdAt: '2024-01-25T08:00:00Z',
        },
      ]
      this.setData('projects', sampleProjects)
    }

    if (this.reviewTasks.length === 0) {
      const sampleTasks = [
        {
          id: 'TASK-001',
          projectId: 'PROJ-2024-001',
          projectTitle: '人工智能在医疗诊断中的应用研究',
          reviewerId: 'REVIEWER-001',
          reviewerName: '张评审专家',
          assignedAt: '2024-01-16T08:00:00Z',
          deadline: '2024-01-23T08:00:00Z',
          status: 'pending', // pending, in_progress, completed, overdue
          priority: 'high',
        },
        {
          id: 'TASK-002',
          projectId: 'PROJ-2024-002',
          projectTitle: '新型钙钛矿太阳能电池材料研究',
          reviewerId: 'REVIEWER-001',
          reviewerName: '张评审专家',
          assignedAt: '2024-01-17T08:00:00Z',
          deadline: '2024-01-24T08:00:00Z',
          status: 'pending',
          priority: 'medium',
        },
      ]
      this.setData('reviewTasks', sampleTasks)
    }

    if (this.reviewHistory.length === 0) {
      const sampleHistory = [
        {
          id: 'REVIEW-2023-001',
          projectId: 'PROJ-2023-001',
          projectTitle: '区块链技术在金融监管中的应用',
          reviewerId: 'REVIEWER-001',
          reviewerName: '张评审专家',
          scores: { innovation: 22, scientific: 20, feasibility: 18, value: 21, total: 81 },
          conclusion: '通过',
          fundingRecommendation: '全额资助',
          detailedComments: '项目创新性强，研究方案可行，建议资助...',
          submittedAt: '2023-12-15T10:30:00Z',
          status: 'completed',
        },
      ]
      this.setData('reviewHistory', sampleHistory)
    }
  },

  // 获取评审专家的待评审任务
  getPendingTasks(reviewerId) {
    const tasks = this.reviewTasks.filter(
      (task) => task.reviewerId === reviewerId && task.status === 'pending',
    )

    // 关联项目详细信息
    return tasks.map((task) => {
      const project = this.projects.find((p) => p.id === task.projectId)
      return {
        ...task,
        project: project || {},
      }
    })
  },

  // 获取评审专家的已评审历史
  getReviewHistory(reviewerId) {
    return this.reviewHistory.filter((history) => history.reviewerId === reviewerId)
  },

  // 根据ID获取项目详情
  getProjectById(projectId) {
    return this.projects.find((project) => project.id === projectId)
  },

  // 根据ID获取评审任务
  getTaskById(taskId) {
    return this.reviewTasks.find((task) => task.id === taskId)
  },

  // 开始评审（更新任务状态）
  startReview(taskId) {
    const tasks = this.reviewTasks
    const taskIndex = tasks.findIndex((task) => task.id === taskId)

    if (taskIndex !== -1) {
      tasks[taskIndex].status = 'in_progress'
      tasks[taskIndex].startedAt = new Date().toISOString()
      this.setData('reviewTasks', tasks)
      return tasks[taskIndex]
    }
    return null
  },

  // 提交评审
  submitReview(reviewData) {
    console.log('提交评审数据:', reviewData)

    try {
      // 1. 更新项目状态
      const projects = this.projects
      const projectIndex = projects.findIndex((p) => p.id === reviewData.projectId)
      if (projectIndex !== -1) {
        projects[projectIndex].status = 'reviewed'
        projects[projectIndex].lastReviewedAt = new Date().toISOString()
        projects[projectIndex].reviewConclusion = reviewData.conclusion
        this.setData('projects', projects)
      }

      // 2. 更新任务状态
      const tasks = this.reviewTasks
      const taskIndex = tasks.findIndex(
        (t) => t.projectId === reviewData.projectId && t.reviewerId === reviewData.reviewerId,
      )
      if (taskIndex !== -1) {
        tasks[taskIndex].status = 'completed'
        tasks[taskIndex].completedAt = new Date().toISOString()
        this.setData('reviewTasks', tasks)
      }

      // 3. 添加评审记录
      const reviewRecord = {
        id: `REVIEW-${Date.now()}`,
        ...reviewData,
        submittedAt: new Date().toISOString(),
        status: 'completed',
      }

      const history = this.reviewHistory
      history.push(reviewRecord)
      this.setData('reviewHistory', history)

      return {
        success: true,
        data: reviewRecord,
        message: '评审提交成功',
      }
    } catch (error) {
      console.error('提交评审失败:', error)
      return {
        success: false,
        message: error.message,
      }
    }
  },

  // 保存评审草稿
  saveReviewDraft(projectId, reviewerId, draftData) {
    const draftKey = `review_draft_${projectId}_${reviewerId}`
    const draft = {
      ...draftData,
      savedAt: new Date().toISOString(),
      projectId,
      reviewerId,
    }
    localStorage.setItem(draftKey, JSON.stringify(draft))
    return draft
  },

  // 加载评审草稿
  loadReviewDraft(projectId, reviewerId) {
    const draftKey = `review_draft_${projectId}_${reviewerId}`
    const draft = localStorage.getItem(draftKey)
    return draft ? JSON.parse(draft) : null
  },

  // 删除评审草稿
  deleteReviewDraft(projectId, reviewerId) {
    const draftKey = `review_draft_${projectId}_${reviewerId}`
    localStorage.removeItem(draftKey)
  },
}
