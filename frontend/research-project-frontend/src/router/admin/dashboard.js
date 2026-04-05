// routes/admin/dashboard.js
const express = require('express');
const router = express.Router();
const db = require('../../config/database');

// 获取管理员仪表板数据
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 验证用户是否为管理员
    const user = await db.query(
      'SELECT role FROM User WHERE id = ?',
      [userId]
    );
    
    if (user[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '没有管理员权限'
      });
    }
    
    // 获取汇总数据
    const summary = await getSummaryData();
    
    // 获取用户统计
    const userStats = await getUserStats();
    
    // 获取项目统计
    const projectStats = await getProjectStats();
    
    // 获取经费统计
    const financeStats = await getFinanceStats();
    
    // 获取成果统计
    const achievementStats = await getAchievementStats();
    
    // 获取最近项目
    const recentProjects = await getRecentProjects();
    
    // 获取最近用户
    const recentUsers = await getRecentUsers();
    
    // 获取最近日志
    const recentLogs = await getRecentLogs();
    
    // 获取待处理任务
    const pendingTasks = await getPendingTasks();
    
    res.json({
      success: true,
      data: {
        summary,
        user_stats: userStats,
        project_stats: projectStats,
        finance_stats: financeStats,
        achievement_stats: achievementStats,
        recent_projects: recentProjects,
        recent_users: recentUsers,
        recent_logs: recentLogs,
        pending_tasks: pendingTasks,
        unread_count: 0 // 可根据实际情况获取
      }
    });
    
  } catch (error) {
    console.error('获取管理员仪表板数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取数据失败'
    });
  }
});

// 汇总数据
async function getSummaryData() {
  const [users] = await db.query('SELECT COUNT(*) as count FROM User');
  const [projects] = await db.query('SELECT COUNT(*) as count FROM Project');
  const [pending] = await db.query(
    'SELECT COUNT(*) as count FROM Project WHERE status IN ("under_review", "submitted")'
  );
  const [budget] = await db.query(
    'SELECT COALESCE(SUM(budget_total), 0) as total FROM Project WHERE status IN ("approved", "in_progress", "completed")'
  );
  
  return {
    totalUsers: users[0].count,
    totalProjects: projects[0].count,
    pendingReviews: pending[0].count,
    totalBudget: budget[0].total || 0
  };
}

// 用户统计
async function getUserStats() {
  const [roleCounts] = await db.query(
    `SELECT role, COUNT(*) as count 
     FROM User 
     WHERE status = 'active'
     GROUP BY role`
  );
  
  const [growth] = await db.query(
    `SELECT COUNT(*) as count 
     FROM User 
     WHERE status = 'active' 
     AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)`
  );
  
  const [total] = await db.query(
    `SELECT COUNT(*) as count 
     FROM User 
     WHERE status = 'active' 
     AND created_at < DATE_SUB(NOW(), INTERVAL 1 MONTH)`
  );
  
  const stats = {
    applicants: 0,
    reviewers: 0,
    assistants: 0,
    admins: 0
  };
  
  roleCounts.forEach(item => {
    stats[item.role + 's'] = item.count;
  });
  
  const totalPrevious = total[0].count || 1;
  const newUsers = growth[0].count || 0;
  stats.userGrowth = Math.round((newUsers / totalPrevious) * 100);
  
  return stats;
}

// 项目统计
async function getProjectStats() {
  const [statusCounts] = await db.query(
    `SELECT status, COUNT(*) as count 
     FROM Project 
     GROUP BY status`
  );
  
  const [growth] = await db.query(
    `SELECT COUNT(*) as count 
     FROM Project 
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)`
  );
  
  const [total] = await db.query(
    `SELECT COUNT(*) as count 
     FROM Project 
     WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 MONTH)`
  );
  
  const stats = {
    draft: 0,
    submitted: 0,
    under_review: 0,
    approved: 0,
    in_progress: 0,
    completed: 0,
    rejected: 0,
    terminated: 0
  };
  
  statusCounts.forEach(item => {
    stats[item.status] = item.count;
  });
  
  const totalPrevious = total[0].count || 1;
  const newProjects = growth[0].count || 0;
  stats.projectGrowth = Math.round((newProjects / totalPrevious) * 100);
  
  return stats;
}

// 经费统计
async function getFinanceStats() {
  const [budget] = await db.query(
    `SELECT COALESCE(SUM(budget_total), 0) as total 
     FROM Project 
     WHERE status IN ("approved", "in_progress", "completed")`
  );
  
  const [allocated] = await db.query(
    `SELECT COALESCE(SUM(apply_amount), 0) as total 
     FROM FundingApplication 
     WHERE status = "approved"`
  );
  
  const [expended] = await db.query(
    `SELECT COALESCE(SUM(amount), 0) as total 
     FROM ExpenditureRecord 
     WHERE status = "approved"`
  );
  
  const [growth] = await db.query(
    `SELECT COALESCE(SUM(apply_amount), 0) as total 
     FROM FundingApplication 
     WHERE status = "approved" 
     AND apply_date >= DATE_SUB(NOW(), INTERVAL 1 MONTH)`
  );
  
  const [totalMonth] = await db.query(
    `SELECT COALESCE(SUM(apply_amount), 0) as total 
     FROM FundingApplication 
     WHERE status = "approved" 
     AND apply_date < DATE_SUB(NOW(), INTERVAL 1 MONTH)`
  );
  
  const totalBudget = budget[0].total || 0;
  const totalAllocated = allocated[0].total || 0;
  const totalExpended = expended[0].total || 0;
  
  const totalPrevious = totalMonth[0].total || 1;
  const newFunding = growth[0].total || 0;
  const growthRate = Math.round((newFunding / totalPrevious) * 100);
  
  return {
    totalBudget,
    allocated: totalAllocated,
    expended: totalExpended,
    remaining: totalBudget - totalAllocated,
    fundGrowth: growthRate
  };
}

// 成果统计
async function getAchievementStats() {
  const [typeCounts] = await db.query(
    `SELECT type, COUNT(*) as count 
     FROM ProjectAchievement 
     GROUP BY type`
  );
  
  const [transfers] = await db.query(
    `SELECT COUNT(*) as count 
     FROM AchievementTransfer`
  );
  
  const [growth] = await db.query(
    `SELECT COUNT(*) as count 
     FROM ProjectAchievement 
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)`
  );
  
  const [total] = await db.query(
    `SELECT COUNT(*) as count 
     FROM ProjectAchievement 
     WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 MONTH)`
  );
  
  const stats = {
    papers: 0,
    patents: 0,
    software: 0,
    reports: 0,
    prototypes: 0,
    other: 0,
    transfers: transfers[0].count || 0
  };
  
  typeCounts.forEach(item => {
    const key = item.type === 'paper' ? 'papers' :
                item.type === 'patent' ? 'patents' :
                item.type === 'software' ? 'software' :
                item.type === 'report' ? 'reports' :
                item.type === 'prototype' ? 'prototypes' : 'other';
    stats[key] = item.count;
  });
  
  const totalPrevious = total[0].count || 1;
  const newAchievements = growth[0].count || 0;
  stats.achievementGrowth = Math.round((newAchievements / totalPrevious) * 100);
  
  return stats;
}

// 最近项目
async function getRecentProjects() {
  const [projects] = await db.query(
    `SELECT p.*, u.name as applicant_name 
     FROM Project p 
     LEFT JOIN User u ON p.applicant_id = u.id 
     ORDER BY p.created_at DESC 
     LIMIT 10`
  );
  
  return projects.map(project => ({
    id: project.id,
    project_code: project.project_code,
    title: project.title,
    applicant_name: project.applicant_name || '未知',
    category: project.category,
    status: project.status,
    created_at: project.created_at
  }));
}

// 最近用户
async function getRecentUsers() {
  const [users] = await db.query(
    `SELECT id, username, name, email, role, department, title, status, created_at 
     FROM User 
     ORDER BY created_at DESC 
     LIMIT 10`
  );
  
  return users;
}

// 最近日志
async function getRecentLogs() {
  const [logs] = await db.query(
    `SELECT a.*, u.name as user_name 
     FROM AuditLog a 
     LEFT JOIN User u ON a.user_id = u.id 
     ORDER BY a.created_at DESC 
     LIMIT 10`
  );
  
  return logs;
}

// 待处理任务
async function getPendingTasks() {
  const [pendingProjects] = await db.query(
    `SELECT COUNT(*) as count 
     FROM Project 
     WHERE status IN ('under_review', 'submitted')`
  );
  
  const [pendingFunding] = await db.query(
    `SELECT COUNT(*) as count 
     FROM FundingApplication 
     WHERE status = 'submitted'`
  );
  
  const [pendingExpenditures] = await db.query(
    `SELECT COUNT(*) as count 
     FROM ExpenditureRecord 
     WHERE status = 'submitted'`
  );
  
  const [pendingAchievements] = await db.query(
    `SELECT COUNT(*) as count 
     FROM ProjectAchievement 
     WHERE status = 'submitted'`
  );
  
  return {
    projects: pendingProjects[0].count || 0,
    funding: pendingFunding[0].count || 0,
    expenditures: pendingExpenditures[0].count || 0,
    achievements: pendingAchievements[0].count || 0
  };
}

module.exports = router;