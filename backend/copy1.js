// research_api.js - 完整版（包含成果管理API）
const http = require('http');
const url = require('url');
const mysql = require('mysql2/promise');
const { randomUUID } = require('crypto');

// MySQL配置
const DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'f2971404639',
  database: 'research_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
};

// 创建连接池
const pool = mysql.createPool(DB_CONFIG);
function getTaskTypeLabel(type) {
  switch(type) {
    case 1: return '审批任务'
    case 2: return '审核任务'
    case 3: return '提交任务'
    default: return '未知类型'
  }
}
// 将时间转为相对时间显示
function formatRelativeTime(timestamp) {
  const now = new Date()
  const time = new Date(timestamp)
  const diff = now - time // 毫秒差

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}天前`
  if (hours > 0) return `${hours}小时前`
  if (minutes > 0) return `${minutes}分钟前`
  return `${seconds}秒前`
}
function getNotificationIcon(type) {
  switch(type) {
    case 1: return '📌'
    case 2: return '⚠️'
    case 3: return '✅'
    default: return '🔔'
  }
}

// 辅助函数：处理日期格式，转换为 YYYY-MM-DD
function formatDateForMySQL(dateString) {
  if (!dateString) {
    return new Date().toISOString().split('T')[0];
  }
  
  try {
    // 如果已经是 YYYY-MM-DD 格式，直接返回
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // 尝试解析日期
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    
    // 格式化为 YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
    
  } catch (error) {
    console.error('日期格式转换失败，使用今天:', error);
    return new Date().toISOString().split('T')[0];
  }
}
// 辅助函数：解析请求体
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}
// 在 parseRequestBody 后添加角色转换函数
function normalizeRole(role) {
  const roleMap = {
    'user': 'applicant',
    'admin': 'admin',
    'assistant': 'assistant',
    'reviewer': 'reviewer'
  };
  return roleMap[role] || role || 'applicant';
}
// 辅助函数：验证token
async function verifyToken(token) {
  if (!token || !token.startsWith('Bearer ')) {
    console.log('❌ Token格式错误或缺失');
    return null;
  }
  
  try {
    const tokenData = Buffer.from(token.replace('Bearer ', ''), 'base64').toString();
    console.log('🔍 Token解码:', tokenData);
    
    const [userId, username, timestamp] = tokenData.split(':');
    console.log('🔍 解析用户:', { userId, username, timestamp });
    
    // 使用正确的表名 User（注意反引号）
    const [users] = await pool.query(
      'SELECT id, username, email, role, name, department, status FROM `User` WHERE id = ? AND username = ?',
      [userId, username]
    );
    
    console.log('🔍 数据库查询结果:', users.length > 0 ? '找到用户' : '未找到用户');
    
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('❌ Token验证失败:', error);
    return null;
  }
}

// 辅助函数：检查权限
function checkPermission(userRole, requiredRoles) {
  if (!userRole) return false;
  
  const userRoleUpper = userRole.toUpperCase();
  
  if (!requiredRoles) return true;
  
  if (Array.isArray(requiredRoles)) {
    return requiredRoles.some(role => {
      if (!role) return false;
      return userRoleUpper === role.toUpperCase();
    });
  }
  
  return userRoleUpper === requiredRoles.toUpperCase();
}

// 统一响应函数
function sendResponse(res, statusCode, data) {
  const responseData = JSON.stringify(data, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(responseData, 'utf8')
  });
  res.end(responseData);
}

// 创建HTTP服务器
const server = http.createServer(async (req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // ==================== CORS配置 ====================
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://localhost:8080'
  ];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // 解析URL和查询参数
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;
  
  // 统一错误处理
  try {
    // ==================== 公共API ====================
    
    // API首页
    if (pathname === '/' && req.method === 'GET') {
      sendResponse(res, 200, {
        success: true,
        message: '研究项目管理系统API',
        version: '1.0.0',
        database: 'research_system',
        endpoints: {
          public: [
            { path: '/api/auth/login', method: 'POST', description: '用户登录' },
            { path: '/api/auth/register', method: 'POST', description: '用户注册' },
            { path: '/api/db/test', method: 'GET', description: '数据库测试' }
          ],
          protected: [
            { path: '/api/projects', method: 'GET', description: '获取项目列表' },
            { path: '/api/users', method: 'GET', description: '获取用户列表' },
            { path: '/api/dashboard/*', method: 'GET', description: '仪表板数据' },
            { path: '/api/achievements', method: 'GET', description: '获取成果列表' },
            { path: '/api/achievements/{id}', method: 'GET', description: '获取成果详情' },
            { path: '/api/admin/users', method: 'GET', description: '获取用户列表（管理员）' },
            { path: '/api/admin/users', method: 'POST', description: '创建用户（管理员）' },
            { path: '/api/admin/users/{id}', method: 'GET', description: '获取用户详情（管理员）' },
            { path: '/api/admin/users/{id}', method: 'PUT', description: '更新用户信息（管理员）' },
            { path: '/api/admin/users/{id}', method: 'DELETE', description: '删除用户（管理员）' },
            { path: '/api/admin/users/stats', method: 'GET', description: '获取用户统计（管理员）' },
            { path: '/api/admin/users/{id}/status', method: 'PUT', description: '更新用户状态（管理员）' },
            { path: '/api/admin/users/{id}/reset-password', method: 'POST', description: '重置用户密码（管理员）' },
            { path: '/api/admin/users/{id}/projects', method: 'GET', description: '获取用户项目列表（管理员）' },
            { path: '/api/admin/users/{id}/reviews', method: 'GET', description: '获取用户评审记录（管理员）' },
            { path: '/api/admin/users/{id}/logs', method: 'GET', description: '获取用户操作日志（管理员）' }
          ]
        }
      });
      return;
    }
    
    // ==================== 数据库测试API ====================
    
    if (pathname === '/api/db/test' && req.method === 'GET') {
      try {
        const connection = await pool.getConnection();
        const [result] = await connection.query('SELECT 1 + 1 AS result, NOW() AS timestamp, VERSION() as version');
        connection.release();
        
        sendResponse(res, 200, {
          success: true,
          message: '数据库连接成功',
          data: result[0]
        });
      } catch (error) {
        sendResponse(res, 500, {
          success: false,
          error: '数据库连接失败',
          message: error.message
        });
      }
      return;
    }
    
    // ==================== 用户认证API ====================
    
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const body = await parseRequestBody(req);
      
      if (!body.username || !body.password) {
        sendResponse(res, 400, {
          success: false,
          error: '用户名和密码不能为空'
        });
        return;
      }
      
      try {
        // 查询用户 - 使用正确的表名 User
        const [users] = await pool.query(
          'SELECT * FROM `User` WHERE username = ? OR email = ?',
          [body.username, body.username]
        );
        
        if (users.length === 0) {
          sendResponse(res, 401, {
            success: false,
            error: '用户名或密码错误'
          });
          return;
        }
        
        const user = users[0];
        
        // 密码验证 - 注意：您的表字段是 password
        if (body.password !== user.password) {
          sendResponse(res, 401, {
            success: false,
            error: '用户名或密码错误'
          });
          return;
        }
        
        // 生成token
        const token = Buffer.from(`${user.id}:${user.username}:${Date.now()}`).toString('base64');
        
        // 移除密码字段
        const { password, ...userWithoutPassword } = user;
        
        // 更新最后登录时间
        await pool.query('UPDATE `User` SET last_login = NOW() WHERE id = ?', [user.id]);
        
        console.log('✅ 用户登录成功:', { 
          username: user.username, 
          role: user.role,
          userId: user.id 
        });
        
        sendResponse(res, 200, {
          success: true,
          message: '登录成功',
          token: token,
          user: userWithoutPassword
        });
      } catch (error) {
        console.error('登录错误:', error);
        sendResponse(res, 500, {
          success: false,
          error: '登录失败',
          message: error.message
        });
      }
      return;
    }
    // ==================== 仪表板API ====================

    // 申请人仪表板数据
    if (pathname === '/api/dashboard/applicant' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      try {
        console.log('📊 获取申请人仪表板数据，用户ID:', user.id);
        
        // 1. 获取项目统计
        const [projectStats] = await pool.query(`
          SELECT 
            COUNT(*) as total_projects,
            SUM(CASE WHEN status IN ('draft', 'submitted', 'under_review') THEN 1 ELSE 0 END) as pending_reviews,
            SUM(CASE WHEN status IN ('approved', 'in_progress') THEN 1 ELSE 0 END) as ongoing_projects
          FROM \`Project\`
          WHERE applicant_id = ?
        `, [user.id]);
        
        // 2. 获取待办事项（从多个来源）
        const pendingTasks = [];
        
        // 2.1 待处理的项目
        const [projectTasks] = await pool.query(`
          SELECT 
            id,
            CONCAT('处理项目: ', title) as title,
            'project' as type,
            DATE_FORMAT(created_at, '%Y-%m-%d') as deadline
          FROM \`Project\`
          WHERE applicant_id = ? 
            AND status IN ('draft', 'under_review')
          ORDER BY created_at DESC
          LIMIT 5
        `, [user.id]);
        
        // 2.2 待处理的支出申请
        const [expenditureTasks] = await pool.query(`
          SELECT 
            er.id,
            CONCAT('审批支出申请: ', er.item_name) as title,
            'expenditure_review' as type,
            DATE_FORMAT(er.created_at, '%Y-%m-%d') as deadline
          FROM \`ExpenditureRecord\` er
          INNER JOIN \`Project\` p ON er.project_id = p.id
          WHERE p.applicant_id = ?
            AND er.status = 'submitted'
          ORDER BY er.created_at DESC
          LIMIT 5
        `, [user.id]);
        
        // 2.3 待处理的成果审核
        const [achievementTasks] = await pool.query(`
          SELECT 
            pa.id,
            CONCAT('审核成果: ', pa.title) as title,
            'achievement_review' as type,
            DATE_FORMAT(pa.created_at, '%Y-%m-%d') as deadline
          FROM \`ProjectAchievement\` pa
          INNER JOIN \`Project\` p ON pa.project_id = p.id
          WHERE p.applicant_id = ?
            AND pa.status = 'under_review'
          ORDER BY pa.created_at DESC
          LIMIT 5
        `, [user.id]);
        
        // 合并所有待办事项
        pendingTasks.push(
          ...projectTasks.map(task => ({ ...task, id: `proj_${task.id}`, priority: 'medium' })),
          ...expenditureTasks.map(task => ({ ...task, id: `exp_${task.id}`, priority: 'high' })),
          ...achievementTasks.map(task => ({ ...task, id: `ach_${task.id}`, priority: 'medium' }))
        );
        
        // 3. 获取最新通知（使用你的Notification表结构）
        const [notifications] = await pool.query(`
          SELECT 
            id,
            type,
            title,
            content as description,
            priority,
            DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as created_time,
            is_read
          FROM \`Notification\`
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT 10
        `, [user.id]);
        
        // 4. 获取我的项目进度
        const [myProjects] = await pool.query(`
          SELECT 
            p.id,
            p.title,
            p.status,
            p.current_stage,
            CASE 
              WHEN p.current_stage = 1 THEN 33
              WHEN p.current_stage = 2 THEN 66
              WHEN p.current_stage = 3 THEN 100
              ELSE 0
            END as progress,
            p.end_date as deadline,
            u.name as manager_name
          FROM \`Project\` p
          LEFT JOIN \`User\` u ON p.applicant_id = u.id
          WHERE p.applicant_id = ?
            AND p.status NOT IN ('draft', 'rejected')
          ORDER BY p.created_at DESC
          LIMIT 5
        `, [user.id]);
        
        // 5. 获取项目统计卡片数据
        const [statsCards] = await pool.query(`
          SELECT 
            COUNT(CASE WHEN status IN ('submitted', 'under_review') THEN 1 END) as submitted_projects,
            COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_projects,
            COUNT(CASE WHEN status = 'under_review' THEN 1 END) as reviewing_projects,
            COALESCE(SUM(budget_total), 0) as total_funds
          FROM \`Project\`
          WHERE applicant_id = ?
        `, [user.id]);
        
        // 6. 获取趋势数据（简化版，实际应该比较前后周期）
        const trends = {
          submission_trend: 12.5,
          approval_trend: 8.3,
          review_trend: -2.1,
          fund_trend: 15.7
        };
        
        // 7. 获取未读通知数量
        const [unreadCountResult] = await pool.query(`
          SELECT COUNT(*) as count
          FROM \`Notification\`
          WHERE user_id = ? AND is_read = FALSE
        `, [user.id]);
        
        const unreadCount = unreadCountResult[0]?.count || 0;
        
        // 构建响应数据
        const responseData = {
          success: true,
          data: {
            stats: {
              total_projects: projectStats[0]?.total_projects || 0,
              pending_reviews: projectStats[0]?.pending_reviews || 0,
              ongoing_projects: projectStats[0]?.ongoing_projects || 0,
              submitted_projects: statsCards[0]?.submitted_projects || 0,
              approved_projects: statsCards[0]?.approved_projects || 0,
              reviewing_projects: statsCards[0]?.reviewing_projects || 0,
              total_funds: statsCards[0]?.total_funds || 0,
              ...trends
            },
            pending_tasks: pendingTasks.map((task, index) => ({
              id: index + 1,
              title: task.title,
              type: getTaskTypeLabel(task.type),
              deadline: task.deadline,
              priority: task.priority,
              raw_id: task.id,
              raw_type: task.type
            })),
            notifications: notifications.map((notif, index) => ({
              id: index + 1,
              title: notif.title,
              description: notif.description,
              icon: getNotificationIcon(notif.type),
              time: formatRelativeTime(notif.created_time),
              read: notif.is_read === 1,
              raw_id: notif.id,
              raw_type: notif.type
            })),
            my_projects: myProjects.map((project, index) => ({
              id: index + 1,
              title: project.title,
              status: project.status,
              progress: project.progress || 0,
              deadline: project.deadline || '未设置',
              manager: project.manager_name || user.name,
              raw_id: project.id
            })),
            unread_count: unreadCount
          }
        };
        
        console.log('✅ 申请人仪表板数据获取成功');
        
        sendResponse(res, 200, responseData);
        
      } catch (error) {
        console.error('获取申请人仪表板数据失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取仪表板数据失败',
          message: error.message
        });
      }
      return;
    }

    // 评审专家仪表板数据
    if (pathname === '/api/dashboard/reviewer' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 检查是否是评审专家
      const isReviewer = user.role === 'reviewer' || user.role === 'admin';
      if (!isReviewer) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限访问评审专家仪表板'
        });
        return;
      }
      
      try {
        console.log('📊 获取评审专家仪表板数据，用户ID:', user.id);
        
        // 1. 获取待评审项目数量（分配给该评审专家的）
        const [reviewStats] = await pool.query(`
          SELECT COUNT(*) as pending_reviews
          FROM \`ProjectReview\` pr
          INNER JOIN \`Project\` p ON pr.project_id = p.id
          WHERE pr.reviewer_id = ? 
            AND pr.status = 'draft'
            AND p.status = 'under_review'
        `, [user.id]);
        
        // 2. 获取待办事项
        const pendingTasks = [];
        
        // 待评审项目
        const [reviewTasks] = await pool.query(`
          SELECT 
            pr.id as review_id,
            p.id as project_id,
            p.title,
            'project_review' as type,
            DATE_FORMAT(p.submit_date, '%Y-%m-%d') as deadline,
            u.name as applicant_name
          FROM \`ProjectReview\` pr
          INNER JOIN \`Project\` p ON pr.project_id = p.id
          LEFT JOIN \`User\` u ON p.applicant_id = u.id
          WHERE pr.reviewer_id = ? 
            AND pr.status = 'draft'
            AND p.status = 'under_review'
          ORDER BY p.submit_date ASC
          LIMIT 5
        `, [user.id]);
        
        pendingTasks.push(...reviewTasks.map(task => ({ 
          ...task, 
          id: `rev_${task.review_id}`,
          project_id: task.project_id,
          priority: 'high',
          title: `评审项目: ${task.title}`
        })));
        
        // 3. 获取最新通知
        const [notifications] = await pool.query(`
          SELECT 
            id,
            type,
            title,
            content as description,
            priority,
            DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as created_time,
            is_read
          FROM \`Notification\`
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT 10
        `, [user.id]);
        
        // 4. 获取未读通知数量
        const [unreadCountResult] = await pool.query(`
          SELECT COUNT(*) as count
          FROM \`Notification\`
          WHERE user_id = ? AND is_read = FALSE
        `, [user.id]);
        
        const unreadCount = unreadCountResult[0]?.count || 0;
        
        // 构建响应数据
        const responseData = {
          success: true,
          data: {
            stats: {
              total_projects: 0, // 评审专家看不到总数
              pending_reviews: reviewStats[0]?.pending_reviews || 0,
              ongoing_projects: 0
            },
            pending_tasks: pendingTasks.map((task, index) => ({
              id: index + 1,
              title: task.title,
              type: '项目评审',
              deadline: task.deadline,
              priority: task.priority,
              raw_id: task.id,
              raw_type: task.type,
              project_id: task.project_id
            })),
            notifications: notifications.map((notif, index) => ({
              id: index + 1,
              title: notif.title,
              description: notif.description,
              icon: getNotificationIcon(notif.type),
              time: formatRelativeTime(notif.created_time),
              read: notif.is_read === 1,
              raw_id: notif.id,
              raw_type: notif.type
            })),
            unread_count: unreadCount
          }
        };
        
        console.log('✅ 评审专家仪表板数据获取成功');
        
        sendResponse(res, 200, responseData);
        
      } catch (error) {
        console.error('获取评审专家仪表板数据失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取仪表板数据失败',
          message: error.message
        });
      }
      return;
    }

    // 管理员仪表板数据
    if (pathname === '/api/dashboard/admin' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 检查是否是管理员
      const isAdmin = user.role === 'admin' || user.role === 'assistant';
      if (!isAdmin) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限访问管理员仪表板'
        });
        return;
      }
      
      try {
        console.log('📊 获取管理员仪表板数据，用户ID:', user.id);
        
        // 1. 获取系统统计
        const [systemStats] = await pool.query(`
          SELECT 
            COUNT(*) as total_projects,
            COUNT(CASE WHEN status = 'under_review' THEN 1 END) as pending_reviews,
            COUNT(CASE WHEN status IN ('approved', 'in_progress') THEN 1 END) as ongoing_projects,
            COUNT(DISTINCT applicant_id) as active_users,
            COUNT(DISTINCT id) as total_users
          FROM \`Project\`
          CROSS JOIN (SELECT COUNT(*) as total_users FROM \`User\`) as user_stats
        `);
        
        // 2. 获取待办事项
        const pendingTasks = [];
        
        // 待审核项目
        const [projectTasks] = await pool.query(`
          SELECT 
            p.id,
            p.title,
            'project_audit' as type,
            DATE_FORMAT(p.submit_date, '%Y-%m-%d') as deadline,
            u.name as applicant_name
          FROM \`Project\` p
          LEFT JOIN \`User\` u ON p.applicant_id = u.id
          WHERE p.status = 'under_review'
          ORDER BY p.submit_date ASC
          LIMIT 5
        `);
        
        // 待处理支出
        const [expenditureTasks] = await pool.query(`
          SELECT 
            er.id,
            CONCAT('审核支出: ', er.item_name) as title,
            'expenditure_audit' as type,
            DATE_FORMAT(er.created_at, '%Y-%m-%d') as deadline,
            p.title as project_title
          FROM \`ExpenditureRecord\` er
          LEFT JOIN \`Project\` p ON er.project_id = p.id
          WHERE er.status = 'submitted'
          ORDER BY er.created_at ASC
          LIMIT 5
        `);
        
        // 待审核成果
        const [achievementTasks] = await pool.query(`
          SELECT 
            pa.id,
            CONCAT('审核成果: ', pa.title) as title,
            'achievement_audit' as type,
            DATE_FORMAT(pa.created_at, '%Y-%m-%d') as deadline,
            p.title as project_title
          FROM \`ProjectAchievement\` pa
          LEFT JOIN \`Project\` p ON pa.project_id = p.id
          WHERE pa.status = 'under_review'
          ORDER BY pa.created_at ASC
          LIMIT 5
        `);
        
        pendingTasks.push(
          ...projectTasks.map(task => ({ 
            ...task, 
            id: `audit_proj_${task.id}`, 
            priority: 'high',
            title: `审核项目: ${task.title}`
          })),
          ...expenditureTasks.map(task => ({ 
            ...task, 
            id: `audit_exp_${task.id}`, 
            priority: 'medium'
          })),
          ...achievementTasks.map(task => ({ 
            ...task, 
            id: `audit_ach_${task.id}`, 
            priority: 'medium'
          }))
        );
        
        // 3. 获取最新通知
        const [notifications] = await pool.query(`
          SELECT 
            id,
            type,
            title,
            content as description,
            priority,
            DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as created_time,
            is_read
          FROM \`Notification\`
          ORDER BY created_at DESC
          LIMIT 10
        `);
        
        // 4. 获取项目统计
        const [projectOverview] = await pool.query(`
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
            COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted,
            COUNT(CASE WHEN status = 'under_review' THEN 1 END) as under_review,
            COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
            COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
            COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
          FROM \`Project\`
        `);
        
        // 5. 获取未读通知数量
        const [unreadCountResult] = await pool.query(`
          SELECT COUNT(*) as count
          FROM \`Notification\`
          WHERE user_id = ? AND is_read = FALSE
        `, [user.id]);
        
        const unreadCount = unreadCountResult[0]?.count || 0;
        
        // 构建响应数据
        const responseData = {
          success: true,
          data: {
            stats: {
              total_projects: systemStats[0]?.total_projects || 0,
              pending_reviews: systemStats[0]?.pending_reviews || 0,
              ongoing_projects: systemStats[0]?.ongoing_projects || 0,
              active_users: systemStats[0]?.active_users || 0,
              total_users: systemStats[0]?.total_users || 0,
              ...projectOverview[0]
            },
            pending_tasks: pendingTasks.map((task, index) => ({
              id: index + 1,
              title: task.title,
              type: getTaskTypeLabel(task.type),
              deadline: task.deadline,
              priority: task.priority,
              raw_id: task.id,
              raw_type: task.type
            })),
            notifications: notifications.map((notif, index) => ({
              id: index + 1,
              title: notif.title,
              description: notif.description,
              icon: getNotificationIcon(notif.type),
              time: formatRelativeTime(notif.created_time),
              read: notif.is_read === 1,
              raw_id: notif.id,
              raw_type: notif.type
            })),
            unread_count: unreadCount
          }
        };
        
        console.log('✅ 管理员仪表板数据获取成功');
        
        sendResponse(res, 200, responseData);
        
      } catch (error) {
        console.error('获取管理员仪表板数据失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取仪表板数据失败',
          message: error.message
        });
      }
      return;
    }
    // ==================== 系统管理员API ====================

// 获取管理员仪表板概览数据
if (pathname === '/api/admin/dashboard/overview' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('获取管理员仪表板概览，管理员ID:', user.id);
    
    // 获取总用户数
    const [totalUsersResult] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM \`User\`
    `);
    
    // 获取总项目数
    const [totalProjectsResult] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM \`Project\`
    `);
    
    // 获取今日登录数
    const today = new Date().toISOString().split('T')[0];
    const [todayLoginsResult] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM \`AuditLog\`
      WHERE action = 'login' AND DATE(created_at) = ?
    `, [today]);
    
    // 获取待审批用户数
    const [pendingUsersResult] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM \`User\`
      WHERE status = 'pending'
    `);
    
    // 获取活跃会话数（简化的实现）
    const [activeSessionsResult] = await pool.query(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM \`AuditLog\`
      WHERE action = 'login' AND created_at > DATE_SUB(NOW(), INTERVAL 30 MINUTE)
    `);
    
    // 检查系统健康状态
    let systemHealth = 'normal';
    
    // 检查数据库连接
    try {
      const [dbTest] = await pool.query('SELECT 1 as test');
      if (!dbTest || dbTest.length === 0) {
        systemHealth = 'error';
      }
    } catch (dbError) {
      systemHealth = 'critical';
      console.error('数据库连接检查失败:', dbError);
    }
    
    const overview = {
      totalUsers: totalUsersResult[0]?.count || 0,
      totalProjects: totalProjectsResult[0]?.count || 0,
      todayLogins: todayLoginsResult[0]?.count || 0,
      systemHealth: systemHealth,
      pendingUsers: pendingUsersResult[0]?.count || 0,
      activeSessions: activeSessionsResult[0]?.count || 0,
    };
    
    sendResponse(res, 200, {
      success: true,
      data: overview
    });
    
  } catch (error) {
    console.error('获取管理员仪表板概览失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取仪表板概览失败'
    });
  }
  return;
}

// 获取待审批用户列表
if (pathname === '/api/admin/users/pending' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const query = url.parse(req.url, true).query;
    const limit = parseInt(query.limit) || 5;
    
    console.log('获取待审批用户列表，管理员ID:', user.id, '限制:', limit);
    
    const [pendingUsers] = await pool.query(`
      SELECT 
        id,
        username,
        name,
        email,
        role,
        department,
        title,
        status,
        created_at
      FROM \`User\`
      WHERE status = 'pending'
      ORDER BY created_at DESC
      LIMIT ?
    `, [limit]);
    
    sendResponse(res, 200, {
      success: true,
      data: pendingUsers
    });
    
  } catch (error) {
    console.error('获取待审批用户失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取待审批用户失败'
    });
  }
  return;
}

// 批准用户
if (pathname.startsWith('/api/admin/users/') && pathname.endsWith('/approve') && req.method === 'POST') {
  const match = pathname.match(/\/api\/admin\/users\/(.+)\/approve/);
  if (!match) return;
  
  const userId = match[1];
  const token = req.headers.authorization;
  const admin = await verifyToken(token);
  
  if (!admin || admin.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('批准用户，用户ID:', userId, '管理员ID:', admin.id);
    
    // 更新用户状态
    await pool.query(
      'UPDATE `User` SET status = "active", updated_at = NOW() WHERE id = ?',
      [userId]
    );
    
    // 获取用户信息以创建通知
    const [users] = await pool.query(
      'SELECT email, name FROM `User` WHERE id = ?',
      [userId]
    );
    
    if (users.length > 0) {
      const user = users[0];
      
      // 创建通知
      await pool.query(
        `INSERT INTO \`Notification\` (id, user_id, type, title, content, created_at)
         VALUES (?, ?, 'system', '账号激活通知', ?, NOW())`,
        [uuidv4(), userId, `尊敬的用户 ${user.name}，您的账号已通过审核，现在可以正常登录系统。`]
      );
    }
    
    // 记录操作日志
    await pool.query(
      `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, new_values, created_at)
       VALUES (?, 'user_approve', 'User', ?, ?, NOW())`,
      [admin.id, userId, JSON.stringify({ status: 'active' })]
    );
    
    sendResponse(res, 200, {
      success: true,
      message: '用户批准成功'
    });
    
  } catch (error) {
    console.error('批准用户失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '批准用户失败'
    });
  }
  return;
}

// 拒绝用户
if (pathname.startsWith('/api/admin/users/') && pathname.endsWith('/reject') && req.method === 'POST') {
  const match = pathname.match(/\/api\/admin\/users\/(.+)\/reject/);
  if (!match) return;
  
  const userId = match[1];
  const token = req.headers.authorization;
  const admin = await verifyToken(token);
  
  if (!admin || admin.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('拒绝用户，用户ID:', userId, '管理员ID:', admin.id);
    
    const body = await getBody(req);
    const { reason } = body;
    
    // 更新用户状态
    await pool.query(
      'UPDATE `User` SET status = "inactive", updated_at = NOW() WHERE id = ?',
      [userId]
    );
    
    // 获取用户信息以创建通知
    const [users] = await pool.query(
      'SELECT email, name FROM `User` WHERE id = ?',
      [userId]
    );
    
    if (users.length > 0) {
      const user = users[0];
      
      // 创建通知
      await pool.query(
        `INSERT INTO \`Notification\` (id, user_id, type, title, content, created_at)
         VALUES (?, ?, 'system', '账号审核结果', ?, NOW())`,
        [uuidv4(), userId, `尊敬的用户 ${user.name}，您的账号审核未通过。${reason ? '原因：' + reason : ''}`]
      );
    }
    
    // 记录操作日志
    await pool.query(
      `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, new_values, created_at)
       VALUES (?, 'user_reject', 'User', ?, ?, NOW())`,
      [admin.id, userId, JSON.stringify({ status: 'inactive', reason })]
    );
    
    sendResponse(res, 200, {
      success: true,
      message: '用户已拒绝'
    });
    
  } catch (error) {
    console.error('拒绝用户失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '拒绝用户失败'
    });
  }
  return;
}

// 获取用户增长统计数据
if (pathname === '/api/admin/statistics/user-growth' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const query = url.parse(req.url, true).query;
    const period = query.period || 'week';
    
    console.log('获取用户增长统计，管理员ID:', user.id, '周期:', period);
    
    let dateFormat, days;
    
    switch (period) {
      case 'week':
        dateFormat = '%Y-%m-%d';
        days = 7;
        break;
      case 'month':
        dateFormat = '%Y-%m-%d';
        days = 30;
        break;
      case 'year':
        dateFormat = '%Y-%m';
        days = 365;
        break;
      default:
        dateFormat = '%Y-%m-%d';
        days = 7;
    }
    
    const [growthData] = await pool.query(`
      SELECT 
        DATE_FORMAT(created_at, ?) as date,
        COUNT(*) as count
      FROM \`User\`
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE_FORMAT(created_at, ?)
      ORDER BY date
    `, [dateFormat, days, dateFormat]);
    
    // 计算最大值用于百分比
    const maxCount = growthData.reduce((max, item) => Math.max(max, item.count || 0), 0);
    
    const formattedData = growthData.map(item => ({
      date: item.date,
      count: item.count || 0,
      percentage: maxCount > 0 ? Math.round((item.count / maxCount) * 100) : 0
    }));
    
    sendResponse(res, 200, {
      success: true,
      data: formattedData
    });
    
  } catch (error) {
    console.error('获取用户增长统计失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取用户增长统计失败'
    });
  }
  return;
}

// 获取用户角色分布统计
if (pathname === '/api/admin/statistics/role-distribution' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('获取用户角色分布统计，管理员ID:', user.id);
    
    const [distribution] = await pool.query(`
      SELECT 
        role,
        COUNT(*) as count
      FROM \`User\`
      GROUP BY role
      ORDER BY count DESC
    `);
    
    sendResponse(res, 200, {
      success: true,
      data: distribution
    });
    
  } catch (error) {
    console.error('获取用户角色分布统计失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取用户角色分布统计失败'
    });
  }
  return;
}

// 获取最近系统日志
if (pathname === '/api/admin/logs/recent' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const query = url.parse(req.url, true).query;
    const limit = parseInt(query.limit) || 5;
    
    console.log('获取最近系统日志，管理员ID:', user.id, '限制:', limit);
    
    const [logs] = await pool.query(`
      SELECT 
        id,
        action,
        table_name,
        record_id,
        user_agent,
        ip_address,
        created_at,
        user_id
      FROM \`AuditLog\`
      ORDER BY created_at DESC
      LIMIT ?
    `, [limit]);
    
    // 获取用户信息
    const logWithUsers = await Promise.all(logs.map(async (log) => {
      if (log.user_id) {
        const [users] = await pool.query(
          'SELECT name FROM `User` WHERE id = ?',
          [log.user_id]
        );
        log.user = users[0]?.name || '未知用户';
      } else {
        log.user = '系统';
      }
      
      // 确定日志级别
      let level = 'info';
      let message = '';
      
      switch (log.action) {
        case 'login':
          level = 'info';
          message = `${log.user} 登录系统`;
          break;
        case 'logout':
          level = 'info';
          message = `${log.user} 退出系统`;
          break;
        case 'create':
          level = 'info';
          message = `${log.user} 创建了 ${getTableName(log.table_name)}`;
          break;
        case 'update':
          level = 'info';
          message = `${log.user} 更新了 ${getTableName(log.table_name)}`;
          break;
        case 'delete':
          level = 'warning';
          message = `${log.user} 删除了 ${getTableName(log.table_name)}`;
          break;
        case 'user_approve':
          level = 'info';
          message = `${log.user} 批准了用户注册`;
          break;
        case 'user_reject':
          level = 'warning';
          message = `${log.user} 拒绝了用户注册`;
          break;
        default:
          level = 'info';
          message = `${log.user} 执行了 ${log.action} 操作`;
      }
      
      return {
        ...log,
        level,
        message
      };
    }));
    
    sendResponse(res, 200, {
      success: true,
      data: logWithUsers
    });
    
  } catch (error) {
    console.error('获取系统日志失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取系统日志失败'
    });
  }
  return;
}

// 获取系统状态
if (pathname === '/api/admin/system/status' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('获取系统状态，管理员ID:', user.id);
    
    // 模拟系统状态数据（实际项目中应该从系统监控工具获取）
    const status = {
      cpuUsage: Math.floor(Math.random() * 30 + 40) + '%',
      memoryUsage: Math.floor(Math.random() * 40 + 40) + '%',
      diskUsage: Math.floor(Math.random() * 20 + 30) + '%',
      dbConnections: Math.floor(Math.random() * 20 + 15),
      dbStatus: '正常',
      uptime: '15天 8小时 23分钟',
      // 从数据库获取实际的连接数
      actualDbConnections: await getActualDbConnections()
    };
    
    sendResponse(res, 200, {
      success: true,
      data: status
    });
    
  } catch (error) {
    console.error('获取系统状态失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取系统状态失败'
    });
  }
  return;
}

// 清理系统缓存
if (pathname === '/api/admin/system/clear-cache' && req.method === 'POST') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('清理系统缓存，管理员ID:', user.id);
    
    // 记录操作日志
    await pool.query(
      `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, created_at)
       VALUES (?, 'clear_cache', 'System', NULL, NOW())`,
      [user.id]
    );
    
    sendResponse(res, 200, {
      success: true,
      message: '系统缓存清理成功'
    });
    
  } catch (error) {
    console.error('清理系统缓存失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '清理系统缓存失败'
    });
  }
  return;
}

// 重启系统（模拟）
if (pathname === '/api/admin/system/restart' && req.method === 'POST') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('重启系统，管理员ID:', user.id);
    
    // 记录操作日志
    await pool.query(
      `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, created_at)
       VALUES (?, 'system_restart', 'System', NULL, NOW())`,
      [user.id]
    );
    
    sendResponse(res, 200, {
      success: true,
      message: '系统重启指令已发送，将在1分钟后重启'
    });
    
  } catch (error) {
    console.error('重启系统失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '重启系统失败'
    });
  }
  return;
}

// 辅助函数：获取实际数据库连接数
async function getActualDbConnections() {
  try {
    const [result] = await pool.query('SHOW STATUS LIKE "Threads_connected"');
    return result[0]?.Value || 0;
  } catch {
    return 0;
  }
}

// 辅助函数：获取表名文本
function getTableName(table) {
  const map = {
    'User': '用户',
    'Project': '项目',
    'FundingApplication': '经费申请',
    'ExpenditureRecord': '经费支出',
    'ProjectAchievement': '项目成果',
    'Notification': '通知',
    'AuditTask': '审核任务',
    'System': '系统'
  };
  return map[table] || table;
}
// ==================== 管理员用户管理API ====================

// 获取用户列表（管理员专用）
if (pathname === '/api/admin/users' && req.method === 'GET') {
  const token = req.headers.authorization;
  const admin = await verifyToken(token);
  
  if (!admin || admin.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const query = url.parse(req.url, true).query;
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    
    console.log('管理员获取用户列表，管理员ID:', admin.id);
    
    // 构建查询条件
    let whereClauses = ['1=1'];
    let queryParams = [];
    let orderBy = 'u.created_at DESC';
    
    // 关键词搜索
    if (query.keyword) {
      whereClauses.push('(u.username LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR u.department LIKE ?)');
      const keyword = `%${query.keyword}%`;
      queryParams.push(keyword, keyword, keyword, keyword);
    }
    
    // 角色筛选
    if (query.role) {
      const roles = query.role.split(',');
      const placeholders = roles.map(() => '?').join(',');
      whereClauses.push(`u.role IN (${placeholders})`);
      queryParams.push(...roles);
    }
    
    // 状态筛选
    if (query.status) {
      const statuses = query.status.split(',');
      const placeholders = statuses.map(() => '?').join(',');
      whereClauses.push(`u.status IN (${placeholders})`);
      queryParams.push(...statuses);
    }
    
    // 部门筛选
    if (query.department) {
      whereClauses.push('u.department LIKE ?');
      queryParams.push(`%${query.department}%`);
    }
    
    // 注册时间筛选
    if (query.registerStartDate && query.registerEndDate) {
      whereClauses.push('DATE(u.created_at) BETWEEN ? AND ?');
      queryParams.push(query.registerStartDate, query.registerEndDate);
    }
    
    // 最后登录筛选
    if (query.lastLoginStartDate && query.lastLoginEndDate) {
      whereClauses.push('(u.last_login IS NULL OR DATE(u.last_login) BETWEEN ? AND ?)');
      queryParams.push(query.lastLoginStartDate, query.lastLoginEndDate);
    }
    
    // 职称筛选
    if (query.title) {
      whereClauses.push('u.title LIKE ?');
      queryParams.push(`%${query.title}%`);
    }
    
    // 研究领域筛选
    if (query.research_field) {
      whereClauses.push('u.research_field LIKE ?');
      queryParams.push(`%${query.research_field}%`);
    }
    
    // 用户ID精确查找
    if (query.user_id) {
      whereClauses.push('u.id = ?');
      queryParams.push(query.user_id);
    }
    
    // 排序方式
    if (query.sortBy) {
      switch (query.sortBy) {
        case 'created_at_desc':
          orderBy = 'u.created_at DESC';
          break;
        case 'created_at_asc':
          orderBy = 'u.created_at ASC';
          break;
        case 'last_login_desc':
          orderBy = 'u.last_login DESC NULLS LAST';
          break;
        case 'last_login_asc':
          orderBy = 'u.last_login ASC';
          break;
        case 'name_asc':
          orderBy = 'u.name ASC';
          break;
        case 'name_desc':
          orderBy = 'u.name DESC';
          break;
      }
    }
    
    const whereClause = whereClauses.join(' AND ');
    
    // 获取用户总数
    const [totalResult] = await pool.query(`
      SELECT COUNT(*) as total 
      FROM \`User\` u
      WHERE ${whereClause}
    `, queryParams);
    
    const total = totalResult[0]?.total || 0;
    
    // 获取用户数据
    const [users] = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.name,
        u.email,
        u.role,
        u.department,
        u.title,
        u.research_field,
        u.phone,
        u.status,
        u.last_login,
        u.created_at,
        u.updated_at,
        (SELECT COUNT(*) FROM \`Project\` p WHERE p.applicant_id = u.id) as project_count,
        (SELECT COUNT(*) FROM \`ProjectAchievement\` pa WHERE pa.created_by = u.id) as achievement_count
      FROM \`User\` u
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `, [...queryParams, pageSize, offset]);
    
    // 获取统计数据
    const [statsResult] = await pool.query(`
      SELECT 
        COUNT(*) as totalCount,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeCount,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactiveCount,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingCount
      FROM \`User\`
      WHERE ${whereClause}
    `, queryParams);
    
    const stats = {
      totalCount: statsResult[0]?.totalCount || 0,
      activeCount: statsResult[0]?.activeCount || 0,
      inactiveCount: statsResult[0]?.inactiveCount || 0,
      pendingCount: statsResult[0]?.pendingCount || 0,
    };
    
    sendResponse(res, 200, {
      success: true,
      data: {
        users,
        pagination: {
          current: page,
          pageSize,
          total
        },
        stats
      }
    });
    
  } catch (error) {
    console.error('管理员获取用户列表失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取用户列表失败'
    });
  }
  return;
}

// 管理员创建用户
if (pathname === '/api/admin/users' && req.method === 'POST') {
  const token = req.headers.authorization;
  const admin = await verifyToken(token);
  
  if (!admin || admin.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    
    console.log('管理员创建用户，管理员ID:', admin.id, '用户名:', body.username);
    
    // 验证必填字段
    if (!body.username || !body.password || !body.name || !body.email || !body.role) {
      sendResponse(res, 400, { 
        success: false, 
        error: '请填写完整信息' 
      });
      return;
    }
    
    // 检查用户名是否已存在
    const [existingUsers] = await pool.query(
      'SELECT id FROM `User` WHERE username = ? OR email = ?',
      [body.username, body.email]
    );
    
    if (existingUsers.length > 0) {
      sendResponse(res, 400, { 
        success: false, 
        error: '用户名或邮箱已存在' 
      });
      return;
    }
    
    // 密码加密
    const hashedPassword = await bcrypt.hash(body.password, 10);
    
    // 创建用户
    const newUserId = uuidv4();
    const now = new Date();
    
    await pool.query(
      `INSERT INTO \`User\` (
        id, username, password, name, email, role, department, title,
        research_field, phone, bio, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newUserId,
        body.username,
        hashedPassword,
        body.name,
        body.email,
        body.role,
        body.department || '',
        body.title || '',
        body.research_field || '',
        body.phone || '',
        body.bio || '',
        body.status || 'active',
        now,
        now
      ]
    );
    
    // 记录操作日志
    await pool.query(
      `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, new_values, created_at)
       VALUES (?, 'admin_create_user', 'User', ?, ?, NOW())`,
      [admin.id, newUserId, JSON.stringify({
        username: body.username,
        name: body.name,
        email: body.email,
        role: body.role,
        status: body.status || 'active'
      })]
    );
    
    // 创建通知（如果需要）
    if (body.status === 'active') {
      await pool.query(
        `INSERT INTO \`Notification\` (id, user_id, type, title, content, created_at)
         VALUES (?, ?, 'system', '账户激活通知', ?, NOW())`,
        [uuidv4(), newUserId, `您的账户已由管理员创建，初始密码为系统生成，请及时修改。`]
      );
    }
    
    sendResponse(res, 201, {
      success: true,
      message: '用户创建成功',
      data: { userId: newUserId }
    });
    
  } catch (error) {
    console.error('管理员创建用户失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '创建用户失败'
    });
  }
  return;
}

// 管理员更新用户信息
if (pathname.startsWith('/api/admin/users/') && req.method === 'PUT') {
  const match = pathname.match(/\/api\/admin\/users\/(.+)/);
  if (!match) return;
  
  const userId = match[1];
  const token = req.headers.authorization;
  const admin = await verifyToken(token);
  
  if (!admin || admin.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    
    console.log('管理员更新用户信息，用户ID:', userId, '管理员ID:', admin.id);
    
    // 获取原用户信息
    const [users] = await pool.query(
      'SELECT * FROM `User` WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      sendResponse(res, 404, { success: false, error: '用户不存在' });
      return;
    }
    
    const oldUser = users[0];
    
    // 检查是否尝试修改自己的角色或状态为管理员
    if (userId === admin.id) {
      if (body.role && body.role !== 'admin') {
        sendResponse(res, 400, { 
          success: false, 
          error: '不能修改自己的管理员角色' 
        });
        return;
      }
      if (body.status && body.status !== 'active') {
        sendResponse(res, 400, { 
          success: false, 
          error: '不能停用自己的账户' 
        });
        return;
      }
    }
    
    // 构建更新数据
    const updates = {};
    const updateFields = [
      'name', 'email', 'role', 'department', 'title', 
      'research_field', 'phone', 'bio', 'status'
    ];
    
    updateFields.forEach(field => {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    });
    
    // 如果是更新角色，需要检查权限链
    if (body.role && body.role !== oldUser.role) {
      if (oldUser.role === 'admin' && userId !== admin.id) {
        sendResponse(res, 403, { 
          success: false, 
          error: '不能修改其他管理员的角色' 
        });
        return;
      }
    }
    
    // 更新用户信息
    await pool.query(
      'UPDATE `User` SET ?, updated_at = NOW() WHERE id = ?',
      [updates, userId]
    );
    
    // 记录操作日志
    await pool.query(
      `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, old_values, new_values, created_at)
       VALUES (?, 'admin_update_user', 'User', ?, ?, ?, NOW())`,
      [admin.id, userId, JSON.stringify(oldUser), JSON.stringify(updates)]
    );
    
    // 如果状态改变，创建通知
    if (body.status && body.status !== oldUser.status) {
      let message = '';
      if (body.status === 'active') {
        message = '您的账户已被管理员激活，现在可以正常登录系统。';
      } else if (body.status === 'inactive') {
        message = '您的账户已被管理员停用，如有疑问请联系系统管理员。';
      }
      
      if (message) {
        await pool.query(
          `INSERT INTO \`Notification\` (id, user_id, type, title, content, created_at)
           VALUES (?, ?, 'system', '账户状态变更', ?, NOW())`,
          [uuidv4(), userId, message]
        );
      }
    }
    
    sendResponse(res, 200, {
      success: true,
      message: '用户信息更新成功'
    });
    
  } catch (error) {
    console.error('管理员更新用户信息失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '更新用户信息失败'
    });
  }
  return;
}

// 管理员重置用户密码
if (pathname.startsWith('/api/admin/users/') && pathname.includes('/reset-password') && req.method === 'PUT') {
  const match = pathname.match(/\/api\/admin\/users\/(.+)\/reset-password/);
  if (!match) return;
  
  const userId = match[1];
  const token = req.headers.authorization;
  const admin = await verifyToken(token);
  
  if (!admin || admin.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    
    if (!body.newPassword) {
      sendResponse(res, 400, { success: false, error: '请提供新密码' });
      return;
    }
    
    console.log('管理员重置用户密码，用户ID:', userId, '管理员ID:', admin.id);
    
    // 检查用户是否存在
    const [users] = await pool.query(
      'SELECT id, role, email, name FROM `User` WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      sendResponse(res, 404, { success: false, error: '用户不存在' });
      return;
    }
    
    const user = users[0];
    
    // 检查是否尝试重置自己或管理员密码
    if (userId === admin.id) {
      sendResponse(res, 400, { 
        success: false, 
        error: '不能重置自己的密码' 
      });
      return;
    }
    
    // 密码加密
    const hashedPassword = await bcrypt.hash(body.newPassword, 10);
    
    // 更新密码
    await pool.query(
      'UPDATE `User` SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, userId]
    );
    
    // 记录操作日志
    await pool.query(
      `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, created_at)
       VALUES (?, 'admin_reset_password', 'User', ?, NOW())`,
      [admin.id, userId]
    );
    
    // 发送通知邮件（如果需要）
    if (body.notifyUser !== false) {
      // 这里可以集成邮件发送服务
      console.log(`密码重置通知：用户 ${user.name} (${user.email}) 的密码已被管理员重置`);
      
      // 创建系统通知
      await pool.query(
        `INSERT INTO \`Notification\` (id, user_id, type, title, content, created_at)
         VALUES (?, ?, 'security', '密码重置通知', ?, NOW())`,
        [uuidv4(), userId, `您的密码已被管理员重置，新密码已通过邮件发送给您。`]
      );
    }
    
    sendResponse(res, 200, {
      success: true,
      message: '密码重置成功'
    });
    
  } catch (error) {
    console.error('管理员重置密码失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '重置密码失败'
    });
  }
  return;
}

// 管理员更新用户状态
if (pathname.startsWith('/api/admin/users/') && pathname.includes('/status') && req.method === 'PUT') {
  const match = pathname.match(/\/api\/admin\/users\/(.+)\/status/);
  if (!match) return;
  
  const userId = match[1];
  const token = req.headers.authorization;
  const admin = await verifyToken(token);
  
  if (!admin || admin.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    
    if (!body.status) {
      sendResponse(res, 400, { success: false, error: '请提供状态值' });
      return;
    }
    
    console.log('管理员更新用户状态，用户ID:', userId, '新状态:', body.status, '管理员ID:', admin.id);
    
    // 获取原用户信息
    const [users] = await pool.query(
      'SELECT status, role, name FROM `User` WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      sendResponse(res, 404, { success: false, error: '用户不存在' });
      return;
    }
    
    const oldStatus = users[0].status;
    const userRole = users[0].role;
    const userName = users[0].name;
    
    // 检查权限
    if (userId === admin.id) {
      sendResponse(res, 403, { 
        success: false, 
        error: '不能修改自己的状态' 
      });
      return;
    }
    
    if (userRole === 'admin') {
      sendResponse(res, 403, { 
        success: false, 
        error: '不能修改管理员的状态' 
      });
      return;
    }
    
    // 更新状态
    await pool.query(
      'UPDATE `User` SET status = ?, updated_at = NOW() WHERE id = ?',
      [body.status, userId]
    );
    
    // 记录操作日志
    await pool.query(
      `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, old_values, new_values, created_at)
       VALUES (?, 'admin_update_user_status', 'User', ?, ?, ?, NOW())`,
      [admin.id, userId, JSON.stringify({ status: oldStatus }), JSON.stringify({ status: body.status })]
    );
    
    // 创建状态变更通知
    let message = '';
    if (body.status === 'active' && oldStatus !== 'active') {
      message = `您的账户已被管理员激活，现在可以正常登录系统。`;
    } else if (body.status === 'inactive' && oldStatus === 'active') {
      message = `您的账户已被管理员停用，如有疑问请联系系统管理员。`;
    }
    
    if (message) {
      await pool.query(
        `INSERT INTO \`Notification\` (id, user_id, type, title, content, created_at)
         VALUES (?, ?, 'system', '账户状态变更', ?, NOW())`,
        [uuidv4(), userId, message]
      );
    }
    
    sendResponse(res, 200, {
      success: true,
      message: `用户状态已更新为${getStatusText(body.status)}`
    });
    
  } catch (error) {
    console.error('管理员更新用户状态失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '更新用户状态失败'
    });
  }
  return;
}

// 管理员删除用户
if (pathname.startsWith('/api/admin/users/') && req.method === 'DELETE') {
  const match = pathname.match(/\/api\/admin\/users\/(.+)/);
  if (!match) return;
  
  const userId = match[1];
  const token = req.headers.authorization;
  const admin = await verifyToken(token);
  
  if (!admin || admin.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('管理员删除用户，用户ID:', userId, '管理员ID:', admin.id);
    
    // 获取用户信息
    const [users] = await pool.query(
      'SELECT role, name FROM `User` WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      sendResponse(res, 404, { success: false, error: '用户不存在' });
      return;
    }
    
    const user = users[0];
    
    // 检查权限
    if (userId === admin.id) {
      sendResponse(res, 403, { 
        success: false, 
        error: '不能删除自己' 
      });
      return;
    }
    
    if (user.role === 'admin') {
      sendResponse(res, 403, { 
        success: false, 
        error: '不能删除管理员' 
      });
      return;
    }
    
    // 检查用户是否有未完成的数据
    const [projects] = await pool.query(
      'SELECT COUNT(*) as count FROM `Project` WHERE applicant_id = ? AND status IN ("in_progress", "stage_review")',
      [userId]
    );
    
    if (projects[0]?.count > 0) {
      sendResponse(res, 400, { 
        success: false, 
        error: '用户有进行中的项目，请先处理相关数据' 
      });
      return;
    }
    
    // 记录删除前的用户信息（用于审计）
    const userData = await getUserDataForAudit(userId);
    
    // 删除用户
    await pool.query('DELETE FROM `User` WHERE id = ?', [userId]);
    
    // 记录操作日志
    await pool.query(
      `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, old_values, created_at)
       VALUES (?, 'admin_delete_user', 'User', ?, ?, NOW())`,
      [admin.id, userId, JSON.stringify(userData)]
    );
    
    sendResponse(res, 200, {
      success: true,
      message: '用户删除成功'
    });
    
  } catch (error) {
    console.error('管理员删除用户失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '删除用户失败'
    });
  }
  return;
}

// 批量更新用户状态
if (pathname === '/api/admin/users/batch-status' && req.method === 'POST') {
  const token = req.headers.authorization;
  const admin = await verifyToken(token);
  
  if (!admin || admin.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    
    if (!body.userIds || !Array.isArray(body.userIds) || body.userIds.length === 0) {
      sendResponse(res, 400, { success: false, error: '请选择用户' });
      return;
    }
    
    if (!body.status) {
      sendResponse(res, 400, { success: false, error: '请提供状态值' });
      return;
    }
    
    console.log('批量更新用户状态，管理员ID:', admin.id, '用户数:', body.userIds.length, '新状态:', body.status);
    
    // 检查是否包含管理员或自己
    const [checkUsers] = await pool.query(
      `SELECT id, role FROM \`User\` WHERE id IN (?)`,
      [body.userIds]
    );
    
    const invalidUsers = checkUsers.filter(user => 
      user.id === admin.id || user.role === 'admin'
    );
    
    if (invalidUsers.length > 0) {
      sendResponse(res, 403, { 
        success: false, 
        error: '不能修改自己或其他管理员的状态' 
      });
      return;
    }
    
    // 批量更新状态
    const placeholders = body.userIds.map(() => '?').join(',');
    await pool.query(
      `UPDATE \`User\` SET status = ?, updated_at = NOW() WHERE id IN (${placeholders})`,
      [body.status, ...body.userIds]
    );
    
    // 记录操作日志
    await Promise.all(body.userIds.map(async (userId) => {
      await pool.query(
        `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, new_values, created_at)
         VALUES (?, 'batch_update_user_status', 'User', ?, ?, NOW())`,
        [admin.id, userId, JSON.stringify({ status: body.status })]
      );
    }));
    
    sendResponse(res, 200, {
      success: true,
      message: `已成功更新 ${body.userIds.length} 个用户的状态`
    });
    
  } catch (error) {
    console.error('批量更新用户状态失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '批量操作失败'
    });
  }
  return;
}

// 批量重置密码
if (pathname === '/api/admin/users/batch-reset-password' && req.method === 'POST') {
  const token = req.headers.authorization;
  const admin = await verifyToken(token);
  
  if (!admin || admin.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    
    if (!body.userIds || !Array.isArray(body.userIds) || body.userIds.length === 0) {
      sendResponse(res, 400, { success: false, error: '请选择用户' });
      return;
    }
    
    if (!body.newPassword) {
      sendResponse(res, 400, { success: false, error: '请提供新密码' });
      return;
    }
    
    console.log('批量重置密码，管理员ID:', admin.id, '用户数:', body.userIds.length);
    
    // 检查是否包含自己
    if (body.userIds.includes(admin.id)) {
      sendResponse(res, 403, { 
        success: false, 
        error: '不能重置自己的密码' 
      });
      return;
    }
    
    // 密码加密
    const hashedPassword = await bcrypt.hash(body.newPassword, 10);
    
    // 批量更新密码
    const placeholders = body.userIds.map(() => '?').join(',');
    await pool.query(
      `UPDATE \`User\` SET password = ?, updated_at = NOW() WHERE id IN (${placeholders})`,
      [hashedPassword, ...body.userIds]
    );
    
    // 记录操作日志
    await Promise.all(body.userIds.map(async (userId) => {
      await pool.query(
        `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, created_at)
         VALUES (?, 'batch_reset_password', 'User', ?, NOW())`,
        [admin.id, userId]
      );
    }));
    
    // 发送通知（如果需要）
    if (body.notifyUser !== false) {
      console.log(`批量密码重置通知：为 ${body.userIds.length} 个用户重置了密码`);
    }
    
    sendResponse(res, 200, {
      success: true,
      message: `已成功为 ${body.userIds.length} 个用户重置密码`
    });
    
  } catch (error) {
    console.error('批量重置密码失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '批量操作失败'
    });
  }
  return;
}

// 批量删除用户
if (pathname === '/api/admin/users/batch-delete' && req.method === 'POST') {
  const token = req.headers.authorization;
  const admin = await verifyToken(token);
  
  if (!admin || admin.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    
    if (!body.userIds || !Array.isArray(body.userIds) || body.userIds.length === 0) {
      sendResponse(res, 400, { success: false, error: '请选择用户' });
      return;
    }
    
    console.log('批量删除用户，管理员ID:', admin.id, '用户数:', body.userIds.length);
    
    // 检查是否包含自己或管理员
    const [checkUsers] = await pool.query(
      `SELECT id, role FROM \`User\` WHERE id IN (?)`,
      [body.userIds]
    );
    
    const invalidUsers = checkUsers.filter(user => 
      user.id === admin.id || user.role === 'admin'
    );
    
    if (invalidUsers.length > 0) {
      sendResponse(res, 403, { 
        success: false, 
        error: '不能删除自己或其他管理员' 
      });
      return;
    }
    
    // 检查是否有进行中的项目
    const [activeProjects] = await pool.query(
      `SELECT COUNT(DISTINCT p.applicant_id) as count 
       FROM \`Project\` p 
       WHERE p.applicant_id IN (?) AND p.status IN ("in_progress", "stage_review")`,
      [body.userIds]
    );
    
    if (activeProjects[0]?.count > 0) {
      sendResponse(res, 400, { 
        success: false, 
        error: '部分用户有进行中的项目，请先处理相关数据' 
      });
      return;
    }
    
    // 批量删除用户
    const placeholders = body.userIds.map(() => '?').join(',');
    
    if (body.keepData) {
      // 只删除用户，保留相关数据
      await pool.query(
        `DELETE FROM \`User\` WHERE id IN (${placeholders})`,
        body.userIds
      );
    } else {
      // 删除用户及其相关数据（需要处理外键约束）
      // 这里简化为只删除用户，实际项目中可能需要级联删除或转移数据
      await pool.query(
        `DELETE FROM \`User\` WHERE id IN (${placeholders})`,
        body.userIds
      );
    }
    
    // 记录操作日志
    await Promise.all(body.userIds.map(async (userId) => {
      await pool.query(
        `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, created_at)
         VALUES (?, 'batch_delete_user', 'User', ?, NOW())`,
        [admin.id, userId]
      );
    }));
    
    sendResponse(res, 200, {
      success: true,
      message: `已成功删除 ${body.userIds.length} 个用户`
    });
    
  } catch (error) {
    console.error('批量删除用户失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '批量删除失败'
    });
  }
  return;
}

// 导出用户数据
if (pathname === '/api/admin/users/export' && req.method === 'GET') {
  const token = req.headers.authorization;
  const admin = await verifyToken(token);
  
  if (!admin || admin.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const query = url.parse(req.url, true).query;
    
    console.log('导出用户数据，管理员ID:', admin.id);
    
    // 构建查询条件（与获取用户列表类似）
    let whereClauses = ['1=1'];
    let queryParams = [];
    
    if (query.keyword) {
      whereClauses.push('(username LIKE ? OR name LIKE ? OR email LIKE ? OR department LIKE ?)');
      const keyword = `%${query.keyword}%`;
      queryParams.push(keyword, keyword, keyword, keyword);
    }
    
    if (query.role) {
      const roles = query.role.split(',');
      const placeholders = roles.map(() => '?').join(',');
      whereClauses.push(`role IN (${placeholders})`);
      queryParams.push(...roles);
    }
    
    if (query.status) {
      const statuses = query.status.split(',');
      const placeholders = statuses.map(() => '?').join(',');
      whereClauses.push(`status IN (${placeholders})`);
      queryParams.push(...statuses);
    }
    
    if (query.department) {
      whereClauses.push('department LIKE ?');
      queryParams.push(`%${query.department}%`);
    }
    
    const whereClause = whereClauses.join(' AND ');
    
    // 获取用户数据
    const [users] = await pool.query(`
      SELECT 
        username as 用户名,
        name as 姓名,
        email as 邮箱,
        CASE role
          WHEN 'applicant' THEN '申请人'
          WHEN 'reviewer' THEN '评审专家'
          WHEN 'assistant' THEN '科研助理'
          WHEN 'admin' THEN '管理员'
          ELSE role
        END as 角色,
        COALESCE(department, '') as 部门,
        COALESCE(title, '') as 职称,
        CASE status
          WHEN 'active' THEN '活跃'
          WHEN 'inactive' THEN '非活跃'
          WHEN 'pending' THEN '待激活'
          ELSE status
        END as 状态,
        DATE(created_at) as 注册日期,
        DATE(last_login) as 最后登录日期
      FROM \`User\`
      WHERE ${whereClause}
      ORDER BY created_at DESC
    `, queryParams);
    
    // 生成CSV内容
    if (users.length === 0) {
      sendResponse(res, 400, { success: false, error: '没有数据可导出' });
      return;
    }
    
    const headers = Object.keys(users[0])
    const rows = users.map(user => Object.values(user))
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    // 设置响应头
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=users_${new Date().getTime()}.csv`)
    
    res.statusCode = 200
    res.end(csvContent)
    
  } catch (error) {
    console.error('导出用户数据失败:', error)
    sendResponse(res, 500, {
      success: false,
      error: '导出失败'
    })
  }
  return
}

// 获取部门列表
if (pathname === '/api/admin/departments' && req.method === 'GET') {
  const token = req.headers.authorization;
  const admin = await verifyToken(token);
  
  if (!admin || admin.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('获取部门列表，管理员ID:', admin.id);
    
    const [departments] = await pool.query(`
      SELECT DISTINCT department 
      FROM \`User\`
      WHERE department IS NOT NULL AND department != ''
      ORDER BY department
    `);
    
    const departmentList = departments.map(dept => dept.department);
    
    sendResponse(res, 200, {
      success: true,
      data: departmentList
    });
    
  } catch (error) {
    console.error('获取部门列表失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取部门列表失败'
    });
  }
  return;
}

// 搜索部门
if (pathname === '/api/admin/departments/search' && req.method === 'GET') {
  const token = req.headers.authorization;
  const admin = await verifyToken(token);
  
  if (!admin || admin.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const query = url.parse(req.url, true).query;
    const keyword = query.keyword || '';
    
    console.log('搜索部门，管理员ID:', admin.id, '关键词:', keyword);
    
    const [departments] = await pool.query(`
      SELECT DISTINCT department 
      FROM \`User\`
      WHERE department LIKE ? AND department IS NOT NULL AND department != ''
      ORDER BY department
      LIMIT 20
    `, [`%${keyword}%`]);
    
    const departmentList = departments.map(dept => dept.department);
    
    sendResponse(res, 200, {
      success: true,
      data: departmentList
    });
    
  } catch (error) {
    console.error('搜索部门失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '搜索部门失败'
    });
  }
  return;
}

// 辅助函数：获取用户数据用于审计
async function getUserDataForAudit(userId) {
  const [user] = await pool.query(
    'SELECT * FROM `User` WHERE id = ?',
    [userId]
  );
  
  if (user.length === 0) return null;
  
  const userData = user[0];
  
  // 获取用户相关的统计数据
  const [stats] = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM \`Project\` WHERE applicant_id = ?) as project_count,
      (SELECT COUNT(*) FROM \`ProjectAchievement\` WHERE created_by = ?) as achievement_count,
      (SELECT COUNT(*) FROM \`FundingApplication\` WHERE applicant_id = ?) as funding_count
  `, [userId, userId, userId]);
  
  return {
    ...userData,
    stats: stats[0] || {}
  };
}

// 辅助函数：获取状态文本
function getStatusText(status) {
  const map = {
    'active': '活跃',
    'inactive': '非活跃',
    'pending': '待激活'
  };
  return map[status] || status;
}
// ==================== 管理员角色权限管理API ====================

// 获取所有权限列表
if (pathname === '/api/admin/roles/permissions' && req.method === 'GET') {
  const token = req.headers.authorization;
  const admin = await verifyToken(token);
  
  if (!admin || admin.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const query = url.parse(req.url, true).query;
    const role = query.role;
    const category = query.category;
    const enabled = query.enabled;
    
    console.log('管理员获取权限列表，管理员ID:', admin.id);
    
    let whereClauses = ['1=1'];
    let queryParams = [];
    
    if (role) {
      whereClauses.push('role = ?');
      queryParams.push(role);
    }
    
    if (category) {
      whereClauses.push('category = ?');
      queryParams.push(category);
    }
    
    if (enabled !== undefined) {
      whereClauses.push('enabled = ?');
      queryParams.push(enabled === 'true');
    }
    
    const whereClause = whereClauses.join(' AND ');
    
    const [permissions] = await pool.query(`
      SELECT 
        id,
        role,
        permission_code,
        permission_name,
        description,
        category,
        enabled,
        created_at,
        updated_at
      FROM \`RolePermission\`
      WHERE ${whereClause}
      ORDER BY category, permission_code
    `, queryParams);
    
    sendResponse(res, 200, {
      success: true,
      data: permissions
    });
    
  } catch (error) {
    console.error('获取权限列表失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取权限列表失败'
    });
  }
  return;
}

// 获取角色统计数据
if (pathname === '/api/admin/roles/stats' && req.method === 'GET') {
  const token = req.headers.authorization;
  const admin = await verifyToken(token);
  
  if (!admin || admin.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('管理员获取角色统计，管理员ID:', admin.id);
    
    // 获取各角色用户数
    const [userStats] = await pool.query(`
      SELECT 
        role,
        COUNT(*) as user_count,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_users,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_users
      FROM \`User\`
      GROUP BY role
    `);
    
    // 获取各角色权限数
    const [permissionStats] = await pool.query(`
      SELECT 
        role,
        COUNT(*) as permission_count,
        SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) as enabled_permissions
      FROM \`RolePermission\`
      GROUP BY role
    `);
    
    // 组合统计数据
    const stats = {};
    const allRoles = ['applicant', 'reviewer', 'assistant', 'admin'];
    
    allRoles.forEach(role => {
      const userStat = userStats.find(s => s.role === role) || { user_count: 0, active_users: 0, pending_users: 0 };
      const permStat = permissionStats.find(s => s.role === role) || { permission_count: 0, enabled_permissions: 0 };
      
      stats[role] = {
        userCount: userStat.user_count,
        activeUsers: userStat.active_users,
        pendingUsers: userStat.pending_users,
        permissionCount: permStat.permission_count,
        enabledPermissions: permStat.enabled_permissions
      };
    });
    
    // 获取总统计
    const [totalUsers] = await pool.query('SELECT COUNT(*) as count FROM `User`');
    const [totalPermissions] = await pool.query('SELECT COUNT(*) as count FROM `RolePermission`');
    const [enabledPermissions] = await pool.query('SELECT COUNT(*) as count FROM `RolePermission` WHERE enabled = 1');
    
    sendResponse(res, 200, {
      success: true,
      data: {
        roleStats: stats,
        totals: {
          users: totalUsers[0]?.count || 0,
          permissions: totalPermissions[0]?.count || 0,
          enabledPermissions: enabledPermissions[0]?.count || 0
        }
      }
    });
    
  } catch (error) {
    console.error('获取角色统计失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取角色统计失败'
    });
  }
  return;
}

// 更新角色权限配置
if (pathname === '/api/admin/roles/permissions' && req.method === 'PUT') {
  const token = req.headers.authorization;
  const admin = await verifyToken(token);
  
  if (!admin || admin.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    
    if (!body.role || !Array.isArray(body.permissionIds)) {
      sendResponse(res, 400, { success: false, error: '参数错误' });
      return;
    }
    
    console.log('更新角色权限配置，管理员ID:', admin.id, '角色:', body.role, '权限数量:', body.permissionIds.length);
    
    // 开始事务
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // 先禁用该角色的所有权限
      await connection.query(
        'UPDATE `RolePermission` SET enabled = 0 WHERE role = ?',
        [body.role]
      );
      
      // 启用选中的权限
      if (body.permissionIds.length > 0) {
        const placeholders = body.permissionIds.map(() => '?').join(',');
        await connection.query(
          `UPDATE \`RolePermission\` SET enabled = 1 WHERE id IN (${placeholders}) AND role = ?`,
          [...body.permissionIds, body.role]
        );
      }
      
      // 记录操作日志
      await connection.query(
        `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, new_values, created_at)
         VALUES (?, 'update_role_permissions', 'RolePermission', ?, ?, NOW())`,
        [admin.id, body.role, JSON.stringify({
          enabledPermissions: body.permissionIds.length,
          totalPermissions: body.permissionIds.length
        })]
      );
      
      await connection.commit();
      
      sendResponse(res, 200, {
        success: true,
        message: '权限配置更新成功'
      });
      
    } catch (transactionError) {
      await connection.rollback();
      throw transactionError;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('更新权限配置失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '更新权限配置失败'
    });
  }
  return;
}

// 更新单个权限状态
if (pathname.startsWith('/api/admin/roles/permissions/') && pathname.includes('/status') && req.method === 'PUT') {
  const match = pathname.match(/\/api\/admin\/roles\/permissions\/(.+)\/status/);
  if (!match) return;
  
  const permissionId = match[1];
  const token = req.headers.authorization;
  const admin = await verifyToken(token);
  
  if (!admin || admin.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    
    if (body.enabled === undefined) {
      sendResponse(res, 400, { success: false, error: '缺少状态参数' });
      return;
    }
    
    console.log('更新权限状态，管理员ID:', admin.id, '权限ID:', permissionId, '状态:', body.enabled);
    
    // 获取权限信息
    const [permissions] = await pool.query(
      'SELECT * FROM `RolePermission` WHERE id = ?',
      [permissionId]
    );
    
    if (permissions.length === 0) {
      sendResponse(res, 404, { success: false, error: '权限不存在' });
      return;
    }
    
    const permission = permissions[0];
    
    // 更新权限状态
    await pool.query(
      'UPDATE `RolePermission` SET enabled = ?, updated_at = NOW() WHERE id = ?',
      [body.enabled, permissionId]
    );
    
    // 记录操作日志
    await pool.query(
      `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, old_values, new_values, created_at)
       VALUES (?, 'update_permission_status', 'RolePermission', ?, ?, ?, NOW())`,
      [admin.id, permissionId, 
        JSON.stringify({ enabled: permission.enabled }), 
        JSON.stringify({ enabled: body.enabled })]
    );
    
    sendResponse(res, 200, {
      success: true,
      message: `权限已${body.enabled ? '启用' : '禁用'}`
    });
    
  } catch (error) {
    console.error('更新权限状态失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '更新权限状态失败'
    });
  }
  return;
}

// 更新权限信息
if (pathname.startsWith('/api/admin/roles/permissions/') && req.method === 'PUT') {
  const match = pathname.match(/\/api\/admin\/roles\/permissions\/(.+)/);
  if (!match) return;
  
  const permissionId = match[1];
  const token = req.headers.authorization;
  const admin = await verifyToken(token);
  
  if (!admin || admin.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    
    console.log('更新权限信息，管理员ID:', admin.id, '权限ID:', permissionId);
    
    // 验证权限代码是否重复（同一角色内）
    if (body.permission_code) {
      const [existing] = await pool.query(
        'SELECT id FROM `RolePermission` WHERE permission_code = ? AND role = ? AND id != ?',
        [body.permission_code, body.role, permissionId]
      );
      
      if (existing.length > 0) {
        sendResponse(res, 400, { 
          success: false, 
          error: '该角色下已存在相同的权限代码' 
        });
        return;
      }
    }
    
    // 获取原权限信息
    const [permissions] = await pool.query(
      'SELECT * FROM `RolePermission` WHERE id = ?',
      [permissionId]
    );
    
    if (permissions.length === 0) {
      sendResponse(res, 404, { success: false, error: '权限不存在' });
      return;
    }
    
    const oldPermission = permissions[0];
    
    // 构建更新数据
    const updates = {};
    const updateFields = ['permission_code', 'permission_name', 'description', 'category', 'enabled'];
    
    updateFields.forEach(field => {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    });
    
    // 更新权限
    await pool.query(
      'UPDATE `RolePermission` SET ?, updated_at = NOW() WHERE id = ?',
      [updates, permissionId]
    );
    
    // 记录操作日志
    await pool.query(
      `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, old_values, new_values, created_at)
       VALUES (?, 'update_permission', 'RolePermission', ?, ?, ?, NOW())`,
      [admin.id, permissionId, 
        JSON.stringify(oldPermission), 
        JSON.stringify(updates)]
    );
    
    sendResponse(res, 200, {
      success: true,
      message: '权限更新成功'
    });
    
  } catch (error) {
    console.error('更新权限失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '更新权限失败'
    });
  }
  return;
}

// 创建新权限
if (pathname === '/api/admin/roles/permissions' && req.method === 'POST') {
  const token = req.headers.authorization;
  const admin = await verifyToken(token);
  
  if (!admin || admin.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    
    console.log('创建新权限，管理员ID:', admin.id);
    
    // 验证必填字段
    if (!body.role || !body.permission_code || !body.permission_name || !body.description || !body.category) {
      sendResponse(res, 400, { 
        success: false, 
        error: '请填写完整信息' 
      });
      return;
    }
    
    // 验证权限代码是否重复（同一角色内）
    const [existing] = await pool.query(
      'SELECT id FROM `RolePermission` WHERE permission_code = ? AND role = ?',
      [body.permission_code, body.role]
    );
    
    if (existing.length > 0) {
      sendResponse(res, 400, { 
        success: false, 
        error: '该角色下已存在相同的权限代码' 
      });
      return;
    }
    
    // 创建权限
    const newPermissionId = uuidv4();
    const now = new Date();
    
    await pool.query(
      `INSERT INTO \`RolePermission\` (
        id, role, permission_code, permission_name, description, 
        category, enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newPermissionId,
        body.role,
        body.permission_code,
        body.permission_name,
        body.description,
        body.category,
        body.enabled !== false,
        now,
        now
      ]
    );
    
    // 记录操作日志
    await pool.query(
      `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, new_values, created_at)
       VALUES (?, 'create_permission', 'RolePermission', ?, ?, NOW())`,
      [admin.id, newPermissionId, JSON.stringify({
        role: body.role,
        permission_code: body.permission_code,
        permission_name: body.permission_name,
        category: body.category,
        enabled: body.enabled !== false
      })]
    );
    
    sendResponse(res, 201, {
      success: true,
      message: '权限创建成功',
      data: { permissionId: newPermissionId }
    });
    
  } catch (error) {
    console.error('创建权限失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '创建权限失败'
    });
  }
  return;
}

// 删除权限
if (pathname.startsWith('/api/admin/roles/permissions/') && req.method === 'DELETE') {
  const match = pathname.match(/\/api\/admin\/roles\/permissions\/(.+)/);
  if (!match) return;
  
  const permissionId = match[1];
  const token = req.headers.authorization;
  const admin = await verifyToken(token);
  
  if (!admin || admin.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('删除权限，管理员ID:', admin.id, '权限ID:', permissionId);
    
    // 获取权限信息
    const [permissions] = await pool.query(
      'SELECT * FROM `RolePermission` WHERE id = ?',
      [permissionId]
    );
    
    if (permissions.length === 0) {
      sendResponse(res, 404, { success: false, error: '权限不存在' });
      return;
    }
    
    const permission = permissions[0];
    
    // 检查是否正在使用中（启用状态）
    if (permission.enabled) {
      sendResponse(res, 400, { 
        success: false, 
        error: '不能删除启用中的权限，请先禁用该权限' 
      });
      return;
    }
    
    // 删除权限
    await pool.query('DELETE FROM `RolePermission` WHERE id = ?', [permissionId]);
    
    // 记录操作日志
    await pool.query(
      `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, old_values, created_at)
       VALUES (?, 'delete_permission', 'RolePermission', ?, ?, NOW())`,
      [admin.id, permissionId, JSON.stringify(permission)]
    );
    
    sendResponse(res, 200, {
      success: true,
      message: '权限删除成功'
    });
    
  } catch (error) {
    console.error('删除权限失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '删除权限失败'
    });
  }
  return;
}

// 批量启用权限
if (pathname === '/api/admin/roles/permissions/batch-enable' && req.method === 'POST') {
  const token = req.headers.authorization;
  const admin = await verifyToken(token);
  
  if (!admin || admin.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    
    if (!body.permissionIds || !Array.isArray(body.permissionIds) || body.permissionIds.length === 0) {
      sendResponse(res, 400, { success: false, error: '请选择权限' });
      return;
    }
    
    console.log('批量启用权限，管理员ID:', admin.id, '权限数量:', body.permissionIds.length);
    
    // 批量启用权限
    const placeholders = body.permissionIds.map(() => '?').join(',');
    const [result] = await pool.query(
      `UPDATE \`RolePermission\` SET enabled = 1, updated_at = NOW() WHERE id IN (${placeholders})`,
      body.permissionIds
    );
    
    // 记录操作日志
    await Promise.all(body.permissionIds.map(async (permissionId) => {
      await pool.query(
        `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, new_values, created_at)
         VALUES (?, 'batch_enable_permission', 'RolePermission', ?, ?, NOW())`,
        [admin.id, permissionId, JSON.stringify({ enabled: 1 })]
      );
    }));
    
    sendResponse(res, 200, {
      success: true,
      message: `已成功启用 ${result.affectedRows} 个权限`
    });
    
  } catch (error) {
    console.error('批量启用权限失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '批量操作失败'
    });
  }
  return;
}

// 批量禁用权限
if (pathname === '/api/admin/roles/permissions/batch-disable' && req.method === 'POST') {
  const token = req.headers.authorization;
  const admin = await verifyToken(token);
  
  if (!admin || admin.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    
    if (!body.permissionIds || !Array.isArray(body.permissionIds) || body.permissionIds.length === 0) {
      sendResponse(res, 400, { success: false, error: '请选择权限' });
      return;
    }
    
    console.log('批量禁用权限，管理员ID:', admin.id, '权限数量:', body.permissionIds.length);
    
    // 批量禁用权限
    const placeholders = body.permissionIds.map(() => '?').join(',');
    const [result] = await pool.query(
      `UPDATE \`RolePermission\` SET enabled = 0, updated_at = NOW() WHERE id IN (${placeholders})`,
      body.permissionIds
    );
    
    // 记录操作日志
    await Promise.all(body.permissionIds.map(async (permissionId) => {
      await pool.query(
        `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, new_values, created_at)
         VALUES (?, 'batch_disable_permission', 'RolePermission', ?, ?, NOW())`,
        [admin.id, permissionId, JSON.stringify({ enabled: 0 })]
      );
    }));
    
    sendResponse(res, 200, {
      success: true,
      message: `已成功禁用 ${result.affectedRows} 个权限`
    });
    
  } catch (error) {
    console.error('批量禁用权限失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '批量操作失败'
    });
  }
  return;
}

// 批量删除权限
if (pathname === '/api/admin/roles/permissions/batch-delete' && req.method === 'POST') {
  const token = req.headers.authorization;
  const admin = await verifyToken(token);
  
  if (!admin || admin.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    
    if (!body.permissionIds || !Array.isArray(body.permissionIds) || body.permissionIds.length === 0) {
      sendResponse(res, 400, { success: false, error: '请选择权限' });
      return;
    }
    
    console.log('批量删除权限，管理员ID:', admin.id, '权限数量:', body.permissionIds.length);
    
    // 检查是否有启用中的权限
    const [enabledPermissions] = await pool.query(
      `SELECT COUNT(*) as count FROM \`RolePermission\` WHERE id IN (?) AND enabled = 1`,
      [body.permissionIds]
    );
    
    if (enabledPermissions[0]?.count > 0) {
      sendResponse(res, 400, { 
        success: false, 
        error: '不能删除启用中的权限，请先禁用这些权限' 
      });
      return;
    }
    
    // 批量删除权限
    const placeholders = body.permissionIds.map(() => '?').join(',');
    const [result] = await pool.query(
      `DELETE FROM \`RolePermission\` WHERE id IN (${placeholders})`,
      body.permissionIds
    );
    
    // 记录操作日志
    await Promise.all(body.permissionIds.map(async (permissionId) => {
      await pool.query(
        `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, created_at)
         VALUES (?, 'batch_delete_permission', 'RolePermission', ?, NOW())`,
        [admin.id, permissionId]
      );
    }));
    
    sendResponse(res, 200, {
      success: true,
      message: `已成功删除 ${result.affectedRows} 个权限`
    });
    
  } catch (error) {
    console.error('批量删除权限失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '批量删除失败'
    });
  }
  return;
}

// 导出权限配置
if (pathname === '/api/admin/roles/export' && req.method === 'GET') {
  const token = req.headers.authorization;
  const admin = await verifyToken(token);
  
  if (!admin || admin.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const query = url.parse(req.url, true).query;
    const role = query.role;
    const category = query.category;
    
    console.log('导出权限配置，管理员ID:', admin.id);
    
    let whereClauses = ['1=1'];
    let queryParams = [];
    
    if (role) {
      whereClauses.push('role = ?');
      queryParams.push(role);
    }
    
    if (category) {
      whereClauses.push('category = ?');
      queryParams.push(category);
    }
    
    const whereClause = whereClauses.join(' AND ');
    
    // 获取权限数据
    const [permissions] = await pool.query(`
      SELECT 
        role,
        permission_code,
        permission_name,
        description,
        category,
        enabled,
        created_at,
        updated_at
      FROM \`RolePermission\`
      WHERE ${whereClause}
      ORDER BY role, category, permission_code
    `, queryParams);
    
    // 按角色分组
    const groupedPermissions = {};
    permissions.forEach(permission => {
      const role = permission.role;
      if (!groupedPermissions[role]) {
        groupedPermissions[role] = [];
      }
      groupedPermissions[role].push(permission);
    });
    
    // 生成导出数据
    const exportData = {
      exportTime: new Date().toISOString(),
      exportedBy: admin.id,
      permissions: groupedPermissions,
      summary: {
        totalPermissions: permissions.length,
        enabledPermissions: permissions.filter(p => p.enabled).length,
        roles: Object.keys(groupedPermissions),
        categories: [...new Set(permissions.map(p => p.category))]
      }
    };
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=permissions_${new Date().getTime()}.json`);
    
    res.statusCode = 200;
    res.end(JSON.stringify(exportData, null, 2));
    
  } catch (error) {
    console.error('导出权限配置失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '导出失败'
    });
  }
  return;
}

// 获取权限操作日志
if (pathname === '/api/admin/roles/logs' && req.method === 'GET') {
  const token = req.headers.authorization;
  const admin = await verifyToken(token);
  
  if (!admin || admin.role !== 'admin') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const query = url.parse(req.url, true).query;
    const limit = parseInt(query.limit) || 50;
    const role = query.role;
    
    console.log('获取权限操作日志，管理员ID:', admin.id);
    
    let whereClauses = ['table_name = "RolePermission"'];
    let queryParams = [];
    
    if (role) {
      // 获取该角色的权限ID列表
      const [permissionIds] = await pool.query(
        'SELECT id FROM `RolePermission` WHERE role = ?',
        [role]
      );
      
      if (permissionIds.length > 0) {
        const ids = permissionIds.map(p => p.id);
        const placeholders = ids.map(() => '?').join(',');
        whereClauses.push(`record_id IN (${placeholders})`);
        queryParams.push(...ids);
      }
    }
    
    const whereClause = whereClauses.join(' AND ');
    
    const [logs] = await pool.query(`
      SELECT 
        al.id,
        al.action,
        al.table_name,
        al.record_id,
        al.old_values,
        al.new_values,
        al.user_id,
        al.created_at,
        u.name as user_name
      FROM \`AuditLog\` al
      LEFT JOIN \`User\` u ON al.user_id = u.id
      WHERE ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ?
    `, [...queryParams, limit]);
    
    // 格式化日志数据
    const formattedLogs = logs.map(log => {
      let message = '';
      const userName = log.user_name || '系统';
      
      switch (log.action) {
        case 'create_permission':
          message = `${userName} 创建了新权限`;
          break;
        case 'update_permission':
          message = `${userName} 修改了权限信息`;
          break;
        case 'delete_permission':
          message = `${userName} 删除了权限`;
          break;
        case 'update_permission_status':
          try {
            const newValues = JSON.parse(log.new_values || '{}');
            message = `${userName} ${newValues.enabled ? '启用' : '禁用'}了权限`;
          } catch {
            message = `${userName} 修改了权限状态`;
          }
          break;
        case 'update_role_permissions':
          message = `${userName} 更新了角色权限配置`;
          break;
        case 'batch_enable_permission':
          message = `${userName} 批量启用了权限`;
          break;
        case 'batch_disable_permission':
          message = `${userName} 批量禁用了权限`;
          break;
        case 'batch_delete_permission':
          message = `${userName} 批量删除了权限`;
          break;
        default:
          message = `${userName} 执行了 ${log.action} 操作`;
      }
      
      return {
        ...log,
        user: userName,
        message: message
      };
    });
    
    sendResponse(res, 200, {
      success: true,
      data: formattedLogs
    });
    
  } catch (error) {
    console.error('获取权限日志失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取日志失败'
    });
  }
  return;
}

    // 科研助理仪表板数据
    // ==================== 科研助理仪表板API ====================

    // 科研助理专用仪表板
    if (pathname === '/api/dashboard/assistant/detailed' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 检查是否是科研助理
      const isAssistant = user.role === 'assistant' || user.role === 'admin';
      if (!isAssistant) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限访问科研助理仪表板'
        });
        return;
      }
      
      try {
        console.log('📊 获取科研助理详细仪表板数据，用户ID:', user.id);
        
        // 1. 数据概览卡片数据
        const overview = {
          pendingApplications: 0,
          activeUsers: 0,
          activeProjects: 0,
          unreadMessages: 0,
          applicationChange: 0,
          userChange: 0,
          completedProjects: 0,
          pendingReplies: 0
        };
        
        // 获取待处理申请数量
        const [pendingApps] = await pool.query(`
          SELECT COUNT(*) as count 
          FROM \`Project\` 
          WHERE status = 'under_review'
        `);
        overview.pendingApplications = pendingApps[0]?.count || 0;
        
        // 获取活跃用户数量（最近7天有活动的用户）
        const [activeUsers] = await pool.query(`
          SELECT COUNT(*) as count 
          FROM \`User\` 
          WHERE status = 'active' 
          AND (last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY) OR last_login IS NULL)
        `);
        overview.activeUsers = activeUsers[0]?.count || 0;
        
        // 获取本周新增用户数量
        const [newUsers] = await pool.query(`
          SELECT COUNT(*) as count 
          FROM \`User\` 
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `);
        overview.userChange = newUsers[0]?.count || 0;
        
        // 获取进行中项目数量
        const [activeProjects] = await pool.query(`
          SELECT COUNT(*) as count 
          FROM \`Project\` 
          WHERE status IN ('in_progress', 'stage_review')
        `);
        overview.activeProjects = activeProjects[0]?.count || 0;
        
        // 获取已完成项目数量
        const [completedProjects] = await pool.query(`
          SELECT COUNT(*) as count 
          FROM \`Project\` 
          WHERE status = 'completed'
        `);
        overview.completedProjects = completedProjects[0]?.count || 0;
        
        // 获取未读消息数量（使用Notification表）
        const [unreadMessages] = await pool.query(`
          SELECT COUNT(*) as count 
          FROM \`Notification\` 
          WHERE user_id = ? AND is_read = FALSE
        `, [user.id]);
        overview.unreadMessages = unreadMessages[0]?.count || 0;
        
        // 2. 获取待处理申请列表
        const [applications] = await pool.query(`
          SELECT 
            p.id,
            p.title,
            p.status,
            p.created_at,
            u.name as applicant_name
          FROM \`Project\` p
          LEFT JOIN \`User\` u ON p.applicant_id = u.id
          WHERE p.status IN ('under_review', 'submitted')
          ORDER BY p.created_at DESC
          LIMIT 10
        `);
        
        // 格式化申请数据
        const pendingApplications = applications.map(app => ({
          id: app.id,
          title: app.title,
          applicant_name: app.applicant_name,
          status: app.status,
          created_at: app.created_at ? app.created_at.toISOString() : null
        }));
        
        // 3. 获取项目统计
        const [projectStatsResult] = await pool.query(`
          SELECT 
            SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
            SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
            SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as under_review,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
          FROM \`Project\`
        `);
        
        const stats = projectStatsResult[0] || {};
        const totalProjects = Object.values(stats).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
        
        // 计算百分比
        const projectStats = [
          { 
            status: 'pending', 
            label: '待审核', 
            count: stats.under_review || 0, 
            percentage: totalProjects > 0 ? Math.round((stats.under_review / totalProjects) * 100) : 0, 
            color: '#ffa940' 
          },
          { 
            status: 'in_progress', 
            label: '进行中', 
            count: stats.in_progress || 0, 
            percentage: totalProjects > 0 ? Math.round((stats.in_progress / totalProjects) * 100) : 0, 
            color: '#1890ff' 
          },
          { 
            status: 'completed', 
            label: '已完成', 
            count: stats.completed || 0, 
            percentage: totalProjects > 0 ? Math.round((stats.completed / totalProjects) * 100) : 0, 
            color: '#52c41a' 
          },
          { 
            status: 'rejected', 
            label: '已拒绝', 
            count: stats.rejected || 0, 
            percentage: totalProjects > 0 ? Math.round((stats.rejected / totalProjects) * 100) : 0, 
            color: '#ff4d4f' 
          }
        ];
        
        // 4. 获取最近活动
        const [activities] = await pool.query(`
          SELECT 
            id,
            type,
            description,
            created_at
          FROM \`AuditLog\`
          ORDER BY created_at DESC
          LIMIT 10
        `);
        
        // 格式化活动数据
        const recentActivities = activities.map((activity, index) => {
          // 根据活动类型设置图标和颜色
          let icon = '📝', color = '#e6f7ff';
          
          if (activity.type?.includes('review')) {
            icon = '⭐';
            color = '#fff7e6';
          } else if (activity.type?.includes('project')) {
            icon = '📋';
            color = '#f6ffed';
          } else if (activity.type?.includes('user')) {
            icon = '👤';
            color = '#f0f7ff';
          }
          
          return {
            id: index + 1,
            icon,
            color,
            description: activity.description || '系统活动',
            time: getTimeAgo(activity.created_at)
          };
        });
        
        // 5. 获取系统通知（使用Notification表）
        const [notifications] = await pool.query(`
          SELECT 
            id,
            type,
            title,
            content as message,
            is_read,
            created_at
          FROM \`Notification\`
          WHERE user_id = ? OR user_id IS NULL
          ORDER BY created_at DESC
          LIMIT 5
        `, [user.id]);
        
        // 格式化通知数据
        const systemNotifications = notifications.map(notif => {
          let icon = '📢';
          if (notif.type === 'warning') icon = '⚠️';
          if (notif.type === 'success') icon = '✅';
          if (notif.type === 'info') icon = 'ℹ️';
          
          return {
            id: notif.id,
            icon,
            title: notif.title,
            message: notif.message,
            time: getTimeAgo(notif.created_at),
            read: notif.is_read === 1
          };
        });
        
        // 6. 获取未处理支出申请
        const [pendingExpenditures] = await pool.query(`
          SELECT COUNT(*) as count 
          FROM \`ExpenditureRecord\` 
          WHERE status = 'submitted'
        `);
        
        // 7. 获取未审核成果
        const [pendingAchievements] = await pool.query(`
          SELECT COUNT(*) as count 
          FROM \`ProjectAchievement\` 
          WHERE status = 'under_review'
        `);
        
        // 构建响应数据
        const responseData = {
          success: true,
          data: {
            user_info: {
              id: user.id,
              username: user.username || user.name,
              role: user.role,
              email: user.email || ''
            },
            overview: {
              ...overview,
              pending_expenditures: pendingExpenditures[0]?.count || 0,
              pending_achievements: pendingAchievements[0]?.count || 0
            },
            pending_applications: pendingApplications,
            project_stats: projectStats,
            recent_activities: recentActivities.length > 0 ? recentActivities : [
              {
                id: 1,
                icon: '📝',
                color: '#e6f7ff',
                description: '您审核了"机器学习研究项目"的申请',
                time: '2小时前'
              },
              {
                id: 2,
                icon: '👤',
                color: '#f6ffed',
                description: '新用户"张三"注册了账号',
                time: '5小时前'
              },
              {
                id: 3,
                icon: '✅',
                color: '#fff7e6',
                description: '项目"数据分析平台"已完成',
                time: '1天前'
              }
            ],
            notifications: systemNotifications.length > 0 ? systemNotifications : [
              {
                id: 1,
                icon: '📢',
                title: '系统维护通知',
                message: '本周末系统将进行维护，请提前保存工作',
                time: '今天 09:00',
                read: false
              },
              {
                id: 2,
                icon: '🎉',
                title: '新功能上线',
                message: '项目协作功能已上线，欢迎体验',
                time: '昨天 14:30',
                read: true
              }
            ]
          }
        };
        
        console.log('✅ 科研助理仪表板数据获取成功');
        
        sendResponse(res, 200, responseData);
        
      } catch (error) {
        console.error('获取科研助理仪表板数据失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取仪表板数据失败',
          message: error.message
        });
      }
      return;
    }

// 获取科研助理仪表板概览数据
if (pathname === '/api/assistant/dashboard/overview' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'assistant') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('获取科研助理仪表板概览，助理ID:', user.id);
    
    // 获取待处理申请数量
    const [pendingAppsResult] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM \`Project\` 
      WHERE status = 'submitted'
    `);
    
    // 获取进行中项目数量
    const [activeProjectsResult] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM \`Project\` 
      WHERE status IN ('in_progress', 'stage_review')
    `);
    
    // 获取待审核支出数量
    const [pendingExpendituresResult] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM \`ExpenditureRecord\` 
      WHERE status = 'submitted'
    `);
    
    // 获取待审核成果数量
    const [pendingAchievementsResult] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM \`ProjectAchievement\` 
      WHERE status = 'submitted'
    `);
    
    // 获取未读消息数量（从通知表）
    const [unreadMessagesResult] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM \`Notification\` 
      WHERE is_read = false
    `);
    
    // 获取活跃用户数量
    const [activeUsersResult] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM \`User\` 
      WHERE status = 'active'
    `);
    
    const overview = {
      pendingApplications: pendingAppsResult[0]?.count || 0,
      activeProjects: activeProjectsResult[0]?.count || 0,
      pending_expenditures: pendingExpendituresResult[0]?.count || 0,
      pending_achievements: pendingAchievementsResult[0]?.count || 0,
      unreadMessages: unreadMessagesResult[0]?.count || 0,
      activeUsers: activeUsersResult[0]?.count || 0,
    };
    
    sendResponse(res, 200, {
      success: true,
      data: overview
    });
    
  } catch (error) {
    console.error('获取仪表板概览失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取仪表板概览失败'
    });
  }
  return;
}

// 获取待处理申请（用于Dashboard）
if (pathname === '/api/assistant/applications/pending' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'assistant') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const query = url.parse(req.url, true).query;
    const limit = parseInt(query.limit) || 5;
    
    console.log('获取待处理申请，助理ID:', user.id, '限制:', limit);
    
    const [applications] = await pool.query(`
      SELECT 
        p.id,
        p.project_code,
        p.title,
        p.status,
        p.created_at,
        u.name as applicant_name,
        u.id as applicant_id
      FROM \`Project\` p
      JOIN \`User\` u ON p.applicant_id = u.id
      WHERE p.status IN ('submitted', 'under_review')
      ORDER BY p.created_at DESC
      LIMIT ?
    `, [limit]);
    
    sendResponse(res, 200, {
      success: true,
      data: applications
    });
    
  } catch (error) {
    console.error('获取待处理申请失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取待处理申请失败'
    });
  }
  return;
}

// 获取项目状态统计
if (pathname === '/api/assistant/stats/projects' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'assistant') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('获取项目状态统计，助理ID:', user.id);
    
    const [stats] = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM \`Project\`
      GROUP BY status
      ORDER BY 
        CASE status
          WHEN 'draft' THEN 1
          WHEN 'submitted' THEN 2
          WHEN 'under_review' THEN 3
          WHEN 'approved' THEN 4
          WHEN 'in_progress' THEN 5
          WHEN 'stage_review' THEN 6
          WHEN 'completed' THEN 7
          WHEN 'rejected' THEN 8
          WHEN 'terminated' THEN 9
          ELSE 10
        END
    `);
    
    const total = stats.reduce((sum, item) => sum + (item.count || 0), 0);
    
    const statusLabels = {
      draft: '草稿',
      submitted: '已提交',
      under_review: '审核中',
      approved: '已批准',
      in_progress: '进行中',
      stage_review: '阶段评审',
      completed: '已完成',
      rejected: '已拒绝',
      terminated: '已终止'
    };
    
    const statusColors = {
      draft: '#f5f5f5',
      submitted: '#e6f7ff',
      under_review: '#fff7e6',
      approved: '#f6ffed',
      in_progress: '#1890ff',
      stage_review: '#fa8c16',
      completed: '#52c41a',
      rejected: '#ffccc7',
      terminated: '#ff4d4f'
    };
    
    const formattedStats = stats.map(stat => ({
      status: stat.status,
      label: statusLabels[stat.status] || stat.status,
      count: stat.count || 0,
      percentage: total > 0 ? Math.round((stat.count / total) * 100) : 0,
      color: statusColors[stat.status] || '#cccccc'
    }));
    
    sendResponse(res, 200, {
      success: true,
      data: formattedStats
    });
    
  } catch (error) {
    console.error('获取项目状态统计失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取项目状态统计失败'
    });
  }
  return;
}

// 获取最近活动
if (pathname === '/api/assistant/activities/recent' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'assistant') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const query = url.parse(req.url, true).query;
    const limit = parseInt(query.limit) || 5;
    
    console.log('获取最近活动，助理ID:', user.id, '限制:', limit);
    
    const [activities] = await pool.query(`
      SELECT 
        al.id,
        al.action,
        al.table_name,
        al.record_id,
        al.created_at,
        u.name as user_name
      FROM \`AuditLog\` al
      LEFT JOIN \`User\` u ON al.user_id = u.id
      WHERE al.table_name IS NOT NULL
      ORDER BY al.created_at DESC
      LIMIT ?
    `, [limit]);
    
    const activityIcons = {
      login: '🔐',
      logout: '🚪',
      create: '➕',
      update: '✏️',
      delete: '🗑️',
      submit: '📤',
      review: '👀',
      approve: '✅',
      reject: '❌',
      project_submit: '📋',
      project_review: '⭐',
      funding_apply: '💰',
      expenditure_submit: '💸',
      achievement_submit: '🏆'
    };
    
    const activityColors = {
      login: '#52c41a',
      logout: '#8c8c8c',
      create: '#1890ff',
      update: '#fa8c16',
      delete: '#ff4d4f',
      submit: '#722ed1',
      review: '#13c2c2',
      approve: '#52c41a',
      reject: '#ff4d4f',
      project_submit: '#1890ff',
      project_review: '#fa8c16',
      funding_apply: '#52c41a',
      expenditure_submit: '#722ed1',
      achievement_submit: '#fa8c16'
    };
    
    const tableTexts = {
      User: '用户',
      Project: '项目',
      FundingApplication: '经费申请',
      ExpenditureRecord: '经费支出',
      ProjectAchievement: '项目成果',
      Notification: '通知',
      AuditTask: '审核任务'
    };
    
    const actionTexts = {
      login: '登录系统',
      logout: '退出系统',
      create: '创建',
      update: '更新',
      delete: '删除',
      submit: '提交',
      review: '审核',
      approve: '批准',
      reject: '拒绝',
      project_submit: '提交项目申请',
      project_review: '审核项目',
      funding_apply: '申请经费',
      expenditure_submit: '提交经费支出',
      achievement_submit: '提交项目成果'
    };
    
    const formattedActivities = activities.map(activity => {
      let description = '';
      if (activity.user_name) {
        description = `${activity.user_name} ${actionTexts[activity.action] || '执行了操作'}${tableTexts[activity.table_name] ? ` ${tableTexts[activity.table_name]}` : ''}`;
      } else {
        description = `系统 ${actionTexts[activity.action] || '执行了操作'}${tableTexts[activity.table_name] ? ` ${tableTexts[activity.table_name]}` : ''}`;
      }
      
      return {
        id: activity.id,
        type: activity.action,
        icon: activityIcons[activity.action] || '📝',
        color: activityColors[activity.action] || '#cccccc',
        description: description,
        created_at: activity.created_at
      };
    });
    
    sendResponse(res, 200, {
      success: true,
      data: formattedActivities
    });
    
  } catch (error) {
    console.error('获取最近活动失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取最近活动失败'
    });
  }
  return;
}

// 获取最近用户
if (pathname === '/api/assistant/users/recent' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'assistant') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const query = url.parse(req.url, true).query;
    const limit = parseInt(query.limit) || 5;
    
    console.log('获取最近用户，助理ID:', user.id, '限制:', limit);
    
    const [users] = await pool.query(`
      SELECT 
        id,
        username,
        name,
        role,
        department,
        status,
        created_at
      FROM \`User\`
      ORDER BY created_at DESC
      LIMIT ?
    `, [limit]);
    
    sendResponse(res, 200, {
      success: true,
      data: users
    });
    
  } catch (error) {
    console.error('获取最近用户失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取最近用户失败'
    });
  }
  return;
}

// 获取待处理任务统计
if (pathname === '/api/assistant/tasks/pending' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'assistant') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('获取待处理任务统计，助理ID:', user.id);
    
    // 待审核项目数量
    const [projectsResult] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM \`Project\` 
      WHERE status IN ('submitted', 'under_review')
    `);
    
    // 待审核经费申请数量
    const [fundingResult] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM \`FundingApplication\` 
      WHERE status IN ('submitted', 'under_review')
    `);
    
    // 待审核支出数量
    const [expendituresResult] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM \`ExpenditureRecord\` 
      WHERE status IN ('submitted', 'under_review')
    `);
    
    // 待审核成果数量
    const [achievementsResult] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM \`ProjectAchievement\` 
      WHERE status IN ('submitted', 'under_review')
    `);
    
    // 待处理审核任务数量
    const [tasksResult] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM \`AuditTask\` 
      WHERE status IN ('pending', 'processing')
    `);
    
    const tasks = {
      projects: projectsResult[0]?.count || 0,
      funding: fundingResult[0]?.count || 0,
      expenditures: expendituresResult[0]?.count || 0,
      achievements: achievementsResult[0]?.count || 0,
      total: (projectsResult[0]?.count || 0) + 
             (fundingResult[0]?.count || 0) + 
             (expendituresResult[0]?.count || 0) + 
             (achievementsResult[0]?.count || 0)
    };
    
    sendResponse(res, 200, {
      success: true,
      data: tasks
    });
    
  } catch (error) {
    console.error('获取待处理任务统计失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取待处理任务统计失败'
    });
  }
  return;
}

// 测试数据库连接
if (pathname === '/api/db/test' && req.method === 'GET') {
  try {
    const [result] = await pool.query('SELECT 1 as test');
    sendResponse(res, 200, {
      success: true,
      message: '数据库连接正常',
      data: result
    });
  } catch (error) {
    console.error('数据库连接测试失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '数据库连接失败'
    });
  }
  return;
}
// ==================== 科研助理任务相关API ====================

// 获取审核任务列表
if (pathname === '/api/assistant/tasks' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const query = url.parse(req.url, true).query;
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    
    console.log('获取审核任务列表，用户:', user.id);
    
    // 构建基础查询条件
    let whereClauses = ['1=1'];
    let queryParams = [];
    
    // 按任务类型筛选
    if (query.taskTypes) {
      const taskTypes = query.taskTypes.split(',');
      const placeholders = taskTypes.map(() => '?').join(',');
      whereClauses.push(`task_type IN (${placeholders})`);
      queryParams.push(...taskTypes);
    }
    
    // 按状态筛选
    if (query.statuses) {
      const statuses = query.statuses.split(',');
      const placeholders = statuses.map(() => '?').join(',');
      whereClauses.push(`status IN (${placeholders})`);
      queryParams.push(...statuses);
    }
    
    // 按优先级筛选
    if (query.priorities) {
      const priorities = query.priorities.split(',');
      const placeholders = priorities.map(() => '?').join(',');
      whereClauses.push(`priority IN (${placeholders})`);
      queryParams.push(...priorities);
    }
    
    // 按时间范围筛选
    if (query.startDate && query.endDate) {
      whereClauses.push('created_at BETWEEN ? AND ?');
      queryParams.push(query.startDate, `${query.endDate} 23:59:59`);
    }
    
    // 关键词搜索
    if (query.keyword) {
      whereClauses.push('(title LIKE ? OR description LIKE ? OR project_code LIKE ?)');
      const keyword = `%${query.keyword}%`;
      queryParams.push(keyword, keyword, keyword);
    }
    
    const whereClause = whereClauses.join(' AND ');
    
    // 获取任务总数
    const [totalResult] = await pool.query(`
      SELECT COUNT(*) as total 
      FROM \`AuditTask\`
      WHERE ${whereClause}
    `, queryParams);
    
    const total = totalResult[0]?.total || 0;
    
    // 获取任务数据
    const [tasks] = await pool.query(`
      SELECT 
        at.*,
        u.name as applicant_name,
        u.email as applicant_email,
        u.department as applicant_department,
        p.project_code,
        p.title as project_title
      FROM \`AuditTask\` at
      LEFT JOIN \`User\` u ON at.applicant_id = u.id
      LEFT JOIN \`Project\` p ON at.project_id = p.id
      WHERE ${whereClause}
      ORDER BY 
        CASE priority 
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END,
        created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, pageSize, offset]);
    
    // 获取统计数据
    const [statsResult] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('pending', 'processing') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM \`AuditTask\`
      WHERE ${whereClause}
    `, queryParams);
    
    const stats = {
      total: statsResult[0]?.total || 0,
      pending: statsResult[0]?.pending || 0,
      completed: statsResult[0]?.completed || 0
    };
    
    // 格式化任务数据
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      task_type: task.task_type,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      applicant_name: task.applicant_name,
      applicant_email: task.applicant_email,
      applicant_department: task.applicant_department,
      project_code: task.project_code,
      project_title: task.project_title,
      created_at: task.created_at,
      deadline: task.deadline,
      processed_at: task.processed_at,
      processed_by: task.processed_by,
      review_result: task.review_result,
      review_comment: task.review_comment,
      attachments: task.attachments ? JSON.parse(task.attachments) : []
    }));
    
    sendResponse(res, 200, {
      success: true,
      data: {
        tasks: formattedTasks,
        pagination: {
          current: page,
          pageSize,
          total
        },
        stats
      }
    });
    
  } catch (error) {
    console.error('获取审核任务列表失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取任务列表失败'
    });
  }
  return;
}

// 获取单个任务详情
if (pathname.startsWith('/api/assistant/tasks/') && req.method === 'GET') {
  const match = pathname.match(/\/api\/assistant\/tasks\/(.+)/);
  if (!match) return;
  
  const taskId = match[1];
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('获取任务详情，任务ID:', taskId);
    
    const [tasks] = await pool.query(`
      SELECT 
        at.*,
        u.name as applicant_name,
        u.email as applicant_email,
        u.department as applicant_department,
        u.phone as applicant_phone,
        p.project_code,
        p.title as project_title,
        p.status as project_status
      FROM \`AuditTask\` at
      LEFT JOIN \`User\` u ON at.applicant_id = u.id
      LEFT JOIN \`Project\` p ON at.project_id = p.id
      WHERE at.id = ?
    `, [taskId]);
    
    if (tasks.length === 0) {
      sendResponse(res, 404, { success: false, error: '任务不存在' });
      return;
    }
    
    const task = tasks[0];
    
    // 获取相关文件
    const [files] = await pool.query(`
      SELECT 
        id,
        original_name as name,
        file_size as size,
        created_at as date
      FROM \`FileStorage\`
      WHERE related_table = 'AuditTask' AND related_id = ?
      ORDER BY created_at DESC
    `, [taskId]);
    
    // 获取处理人信息
    let processedByName = '';
    if (task.processed_by) {
      const [processor] = await pool.query(
        'SELECT name FROM `User` WHERE id = ?',
        [task.processed_by]
      );
      processedByName = processor[0]?.name || '';
    }
    
    // 获取审核历史
    const [history] = await pool.query(`
      SELECT 
        action,
        old_values,
        new_values,
        created_at
      FROM \`AuditLog\`
      WHERE table_name = 'AuditTask' AND record_id = ?
      ORDER BY created_at DESC
    `, [taskId]);
    
    const taskDetail = {
      id: task.id,
      task_type: task.task_type,
      title: task.title,
      description: task.description,
      detailed_description: task.detailed_description,
      priority: task.priority,
      status: task.status,
      applicant_name: task.applicant_name,
      applicant_email: task.applicant_email,
      applicant_department: task.applicant_department,
      applicant_phone: task.applicant_phone,
      project_code: task.project_code,
      project_title: task.project_title,
      project_status: task.project_status,
      created_at: task.created_at,
      deadline: task.deadline,
      processed_at: task.processed_at,
      processed_by_name: processedByName,
      review_result: task.review_result,
      review_comment: task.review_comment,
      attachments: files,
      audit_history: history,
      comments: task.comments ? JSON.parse(task.comments) : []
    };
    
    sendResponse(res, 200, {
      success: true,
      data: taskDetail
    });
    
  } catch (error) {
    console.error('获取任务详情失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取任务详情失败'
    });
  }
  return;
}

// 更新任务状态
if (pathname.startsWith('/api/assistant/tasks/') && req.method === 'PUT') {
  const match = pathname.match(/\/api\/assistant\/tasks\/(.+)/);
  if (!match) return;
  
  const taskId = match[1];
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    const { action, status, comment, result } = body;
    
    console.log('更新任务状态，任务ID:', taskId, '操作:', action);
    
    // 获取当前任务
    const [tasks] = await pool.query(
      'SELECT * FROM `AuditTask` WHERE id = ?',
      [taskId]
    );
    
    if (tasks.length === 0) {
      sendResponse(res, 404, { success: false, error: '任务不存在' });
      return;
    }
    
    const task = tasks[0];
    let updates = {};
    let message = '';
    
    switch (action) {
      case 'start':
        updates = {
          status: 'processing',
          processed_by: user.id,
          updated_at: new Date()
        };
        message = '任务已开始处理';
        break;
        
      case 'complete':
        if (!result) {
          sendResponse(res, 400, { 
            success: false, 
            error: '请提供审核结果' 
          });
          return;
        }
        
        updates = {
          status: 'completed',
          review_result: result,
          review_comment: comment,
          processed_at: new Date(),
          updated_at: new Date()
        };
        message = '任务已完成';
        break;
        
      case 'cancel':
        updates = {
          status: 'cancelled',
          review_comment: comment,
          updated_at: new Date()
        };
        message = '任务已取消';
        break;
        
      default:
        if (status) {
          updates = { status, updated_at: new Date() };
          message = '任务状态已更新';
        } else {
          sendResponse(res, 400, { 
            success: false, 
            error: '无效的操作' 
          });
          return;
        }
    }
    
    // 更新任务
    await pool.query(
      'UPDATE `AuditTask` SET ? WHERE id = ?',
      [updates, taskId]
    );
    
    // 记录操作日志
    await pool.query(
      `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, new_values, created_at)
       VALUES (?, ?, 'AuditTask', ?, ?, NOW())`,
      [user.id, action, taskId, JSON.stringify(updates)]
    );
    
    // 如果是项目相关的任务，更新对应表的审核状态
    if (action === 'complete' && task.related_table && task.related_id) {
      await updateRelatedRecord(task, result, comment, user.id);
    }
    
    sendResponse(res, 200, {
      success: true,
      message,
      data: { taskId, ...updates }
    });
    
  } catch (error) {
    console.error('更新任务状态失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '更新任务状态失败'
    });
  }
  return;
}

// 辅助函数：更新相关记录的审核状态
async function updateRelatedRecord(task, result, comment, userId) {
  const statusMap = {
    'approved': 'approved',
    'rejected': 'rejected',
    'returned': 'returned'
  };
  
  const newStatus = statusMap[result] || result;
  
  switch (task.task_type) {
    case 'project_review':
      await pool.query(
        'UPDATE `Project` SET status = ?, updated_at = NOW() WHERE id = ?',
        [newStatus, task.related_id]
      );
      
      // 创建通知
      await createNotification(
        task.applicant_id,
        '项目审核结果',
        `您的项目"${task.project_title}"审核结果为：${result === 'approved' ? '通过' : '不通过'}`,
        'project',
        task.related_id
      );
      break;
      
    case 'funding_review':
      await pool.query(
        'UPDATE `FundingApplication` SET status = ?, reviewer_id = ?, review_date = NOW(), review_comment = ? WHERE id = ?',
        [newStatus, userId, comment, task.related_id]
      );
      break;
      
    case 'expenditure_review':
      await pool.query(
        'UPDATE `ExpenditureRecord` SET status = ?, reviewer_id = ?, review_date = NOW(), review_comment = ? WHERE id = ?',
        [newStatus, userId, comment, task.related_id]
      );
      break;
      
    case 'achievement_review':
      await pool.query(
        'UPDATE `ProjectAchievement` SET status = ?, verified_by = ?, verified_date = NOW(), verification_comment = ? WHERE id = ?',
        [newStatus, userId, comment, task.related_id]
      );
      break;
  }
}
// ==================== 科研助理项目审核相关API ====================

// 获取待审核项目列表
if (pathname === '/api/assistant/projects/review' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const query = url.parse(req.url, true).query;
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    
    console.log('获取待审核项目列表，用户:', user.id);
    
    // 构建基础查询条件
    let whereClauses = ['1=1'];
    let queryParams = [];
    
    // 默认只显示待审核项目
    if (!query.status) {
      whereClauses.push('p.status IN (?, ?)');
      queryParams.push('submitted', 'under_review');
    } else {
      const statuses = query.status.split(',');
      const placeholders = statuses.map(() => '?').join(',');
      whereClauses.push(`p.status IN (${placeholders})`);
      queryParams.push(...statuses);
    }
    
    // 按项目类别筛选
    if (query.category) {
      const categories = query.category.split(',');
      const placeholders = categories.map(() => '?').join(',');
      whereClauses.push(`p.category IN (${placeholders})`);
      queryParams.push(...categories);
    }
    
    // 按时间范围筛选
    if (query.startDate && query.endDate) {
      whereClauses.push('p.submit_date BETWEEN ? AND ?');
      queryParams.push(query.startDate, query.endDate);
    }
    
    // 按预算范围筛选
    if (query.minBudget) {
      whereClauses.push('p.budget_total >= ?');
      queryParams.push(query.minBudget);
    }
    
    if (query.maxBudget) {
      whereClauses.push('p.budget_total <= ?');
      queryParams.push(query.maxBudget);
    }
    
    // 关键词搜索
    if (query.keyword) {
      whereClauses.push('(p.title LIKE ? OR p.project_code LIKE ? OR u.name LIKE ?)');
      const keyword = `%${query.keyword}%`;
      queryParams.push(keyword, keyword, keyword);
    }
    
    const whereClause = whereClauses.join(' AND ');
    
    // 获取项目总数
    const [totalResult] = await pool.query(`
      SELECT COUNT(*) as total 
      FROM \`Project\` p
      LEFT JOIN \`User\` u ON p.applicant_id = u.id
      WHERE ${whereClause}
    `, queryParams);
    
    const total = totalResult[0]?.total || 0;
    
    // 获取项目数据
    const [projects] = await pool.query(`
      SELECT 
        p.*,
        u.name as applicant_name,
        u.email,
        u.phone,
        u.department,
        u.title
      FROM \`Project\` p
      LEFT JOIN \`User\` u ON p.applicant_id = u.id
      WHERE ${whereClause}
      ORDER BY 
        CASE p.status 
          WHEN 'under_review' THEN 1
          WHEN 'submitted' THEN 2
          ELSE 3
        END,
        p.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, pageSize, offset]);
    
    // 获取统计数据
    const today = new Date().toISOString().split('T')[0];
    
    const [statsResult] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN p.status IN ('submitted', 'under_review') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN p.status = 'approved' AND DATE(p.approval_date) = ? THEN 1 ELSE 0 END) as today_approved
      FROM \`Project\` p
      WHERE ${whereClause}
    `, [today, ...queryParams]);
    
    const stats = {
      total: statsResult[0]?.total || 0,
      pending: statsResult[0]?.pending || 0,
      todayApproved: statsResult[0]?.today_approved || 0
    };
    
    sendResponse(res, 200, {
      success: true,
      data: {
        projects: projects.map(p => ({
          ...p,
          created_at: p.created_at ? p.created_at.toISOString() : null,
          submit_date: p.submit_date ? p.submit_date.toISOString().split('T')[0] : null
        })),
        pagination: {
          current: page,
          pageSize,
          total
        },
        stats
      }
    });
    
  } catch (error) {
    console.error('获取待审核项目失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取项目列表失败'
    });
  }
  return;
}

// 获取项目详情（包括预算、成员、附件等）
if (pathname.startsWith('/api/projects/') && pathname.includes('/detail') && req.method === 'GET') {
  const match = pathname.match(/\/api\/projects\/(.+)\/detail/);
  if (!match) return;
  
  const projectId = match[1];
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user) {
    sendResponse(res, 401, { success: false, error: '认证失败' });
    return;
  }
  
  try {
    console.log('获取项目详情，项目ID:', projectId);
    
    // 获取项目基本信息
    const [projects] = await pool.query(`
      SELECT 
        p.*,
        u.name as applicant_name,
        u.email,
        u.phone,
        u.department,
        u.title
      FROM \`Project\` p
      LEFT JOIN \`User\` u ON p.applicant_id = u.id
      WHERE p.id = ?
    `, [projectId]);
    
    if (projects.length === 0) {
      sendResponse(res, 404, { success: false, error: '项目不存在' });
      return;
    }
    
    const project = projects[0];
    
    // 获取预算明细
    const [budgetItems] = await pool.query(`
      SELECT * FROM \`ProjectBudget\`
      WHERE project_id = ?
      ORDER BY sequence ASC
    `, [projectId]);
    
    // 获取项目成员
    const [members] = await pool.query(`
      SELECT 
        pm.*,
        u.name
      FROM \`ProjectMember\` pm
      LEFT JOIN \`User\` u ON pm.user_id = u.id
      WHERE pm.project_id = ?
      ORDER BY 
        CASE pm.role
          WHEN 'principal' THEN 1
          WHEN 'co_researcher' THEN 2
          WHEN 'research_assistant' THEN 3
          ELSE 4
        END
    `, [projectId]);
    
    // 获取附件文件
    const [attachments] = await pool.query(`
      SELECT * FROM \`FileStorage\`
      WHERE related_table = 'Project' AND related_id = ?
      ORDER BY created_at DESC
    `, [projectId]);
    
    // 获取评审记录
    const [reviews] = await pool.query(`
      SELECT 
        pr.*,
        u.name as reviewer_name
      FROM \`ProjectReview\` pr
      LEFT JOIN \`User\` u ON pr.reviewer_id = u.id
      WHERE pr.project_id = ?
      ORDER BY pr.review_date DESC
    `, [projectId]);
    
    const projectDetail = {
      project: {
        ...project,
        created_at: project.created_at ? project.created_at.toISOString() : null,
        submit_date: project.submit_date ? project.submit_date.toISOString().split('T')[0] : null,
        approval_date: project.approval_date ? project.approval_date.toISOString().split('T')[0] : null
      },
      budget_items: budgetItems.map(item => ({
        ...item,
        amount: parseFloat(item.amount)
      })),
      members: members.map(member => ({
        ...member,
        workload_percentage: member.workload_percentage ? parseFloat(member.workload_percentage) : null
      })),
      attachments: attachments.map(file => ({
        ...file,
        file_size: parseInt(file.file_size),
        created_at: file.created_at ? file.created_at.toISOString() : null
      })),
      reviews: reviews.map(review => ({
        ...review,
        innovation_score: review.innovation_score ? parseInt(review.innovation_score) : null,
        feasibility_score: review.feasibility_score ? parseInt(review.feasibility_score) : null,
        significance_score: review.significance_score ? parseInt(review.significance_score) : null,
        team_score: review.team_score ? parseInt(review.team_score) : null,
        budget_score: review.budget_score ? parseInt(review.budget_score) : null,
        total_score: review.total_score ? parseFloat(review.total_score) : null,
        review_date: review.review_date ? review.review_date.toISOString().split('T')[0] : null,
        created_at: review.created_at ? review.created_at.toISOString() : null
      }))
    };
    
    sendResponse(res, 200, {
      success: true,
      data: projectDetail
    });
    
  } catch (error) {
    console.error('获取项目详情失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取项目详情失败'
    });
  }
  return;
}

// 提交项目评审
if (pathname.startsWith('/api/projects/') && pathname.includes('/review') && req.method === 'POST') {
  const match = pathname.match(/\/api\/projects\/(.+)\/review/);
  if (!match) return;
  
  const projectId = match[1];
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    const {
      innovation_score,
      feasibility_score,
      significance_score,
      team_score,
      budget_score,
      strengths,
      weaknesses,
      comments,
      suggestions,
      recommendation,
      is_confidential,
      total_score
    } = body;
    
    console.log('提交项目评审，项目ID:', projectId, '评审人:', user.id);
    
    // 检查项目是否存在
    const [projects] = await pool.query(
      'SELECT * FROM `Project` WHERE id = ?',
      [projectId]
    );
    
    if (projects.length === 0) {
      sendResponse(res, 404, { success: false, error: '项目不存在' });
      return;
    }
    
    const project = projects[0];
    
    // 检查是否已经评审过
    const [existingReviews] = await pool.query(`
      SELECT * FROM \`ProjectReview\`
      WHERE project_id = ? AND reviewer_id = ? AND review_type = 'initial'
    `, [projectId, user.id]);
    
    if (existingReviews.length > 0) {
      sendResponse(res, 400, { 
        success: false, 
        error: '您已经评审过此项目' 
      });
      return;
    }
    
    // 插入评审记录
    const reviewId = generateUUID();
    await pool.query(`
      INSERT INTO \`ProjectReview\` (
        id, project_id, reviewer_id, review_type,
        innovation_score, feasibility_score, significance_score,
        team_score, budget_score, strengths, weaknesses,
        recommendation, comments, suggestions, is_confidential,
        status, review_date, submitted_at
      ) VALUES (?, ?, ?, 'initial', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', CURDATE(), NOW())
    `, [
      reviewId, projectId, user.id,
      innovation_score, feasibility_score, significance_score,
      team_score, budget_score, strengths, weaknesses,
      recommendation, comments, suggestions, is_confidential ? 1 : 0
    ]);
    
    // 根据评审结论更新项目状态
    let newStatus = project.status;
    if (recommendation === 'approve' || recommendation === 'approve_with_revision') {
      newStatus = 'under_review';
    } else if (recommendation === 'reject') {
      newStatus = 'rejected';
    }
    
    await pool.query(
      'UPDATE `Project` SET status = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, projectId]
    );
    
    // 如果是科研助理评审且结论为通过，可以直接批准
    if (user.role === 'assistant' && recommendation === 'approve') {
      await pool.query(
        'UPDATE `Project` SET status = "approved", approval_date = CURDATE() WHERE id = ?',
        [projectId]
      );
      
      // 创建通知
      await createNotification(
        project.applicant_id,
        '项目审核通过',
        `您的项目"${project.title}"已通过审核并获得批准`,
        'project',
        projectId
      );
    } else {
      // 创建通知
      const recommendationText = {
        approve: '通过',
        approve_with_revision: '修改后通过',
        reject: '拒绝',
        resubmit: '需要重新提交'
      };
      
      await createNotification(
        project.applicant_id,
        '项目收到评审意见',
        `您的项目"${project.title}"收到了新的评审意见，结果为：${recommendationText[recommendation] || recommendation}`,
        'review',
        projectId
      );
    }
    
    // 记录操作日志
    await pool.query(
      `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, new_values, created_at)
       VALUES (?, 'project_review', 'ProjectReview', ?, ?, NOW())`,
      [user.id, reviewId, JSON.stringify(body)]
    );
    
    sendResponse(res, 200, {
      success: true,
      message: '评审提交成功',
      data: { reviewId }
    });
    
  } catch (error) {
    console.error('提交项目评审失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '提交评审失败'
    });
  }
  return;
}

// 快速审核通过项目
if (pathname.startsWith('/api/projects/') && pathname.includes('/approve') && req.method === 'POST') {
  const match = pathname.match(/\/api\/projects\/(.+)\/approve/);
  if (!match) return;
  
  const projectId = match[1];
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    const { comment } = body;
    
    console.log('快速审核通过项目，项目ID:', projectId, '操作人:', user.id);
    
    // 检查项目状态
    const [projects] = await pool.query(
      'SELECT * FROM `Project` WHERE id = ? AND status IN ("submitted", "under_review")',
      [projectId]
    );
    
    if (projects.length === 0) {
      sendResponse(res, 400, { 
        success: false, 
        error: '项目不存在或不能审核' 
      });
      return;
    }
    
    const project = projects[0];
    
    // 更新项目状态
    await pool.query(
      'UPDATE `Project` SET status = "approved", approval_date = CURDATE(), updated_at = NOW() WHERE id = ?',
      [projectId]
    );
    
    // 插入简化的评审记录
    const reviewId = generateUUID();
    await pool.query(`
      INSERT INTO \`ProjectReview\` (
        id, project_id, reviewer_id, review_type,
        recommendation, comments, status, review_date, submitted_at
      ) VALUES (?, ?, ?, 'initial', 'approve', ?, 'submitted', CURDATE(), NOW())
    `, [reviewId, projectId, user.id, comment || '快速审核通过']);
    
    // 创建通知
    await createNotification(
      project.applicant_id,
      '项目审核通过',
      `您的项目"${project.title}"已通过审核并获得批准`,
      'project',
      projectId
    );
    
    // 记录操作日志
    await pool.query(
      `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, new_values, created_at)
       VALUES (?, 'project_approve', 'Project', ?, ?, NOW())`,
      [user.id, projectId, JSON.stringify({ status: 'approved', comment })]
    );
    
    sendResponse(res, 200, {
      success: true,
      message: '项目已审核通过'
    });
    
  } catch (error) {
    console.error('快速审核项目失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '审核项目失败'
    });
  }
  return;
}

// 批量审核项目
if (pathname === '/api/assistant/projects/batch-review' && req.method === 'POST') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    const { projectIds, result, comment } = body;
    
    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      sendResponse(res, 400, { success: false, error: '请选择要审核的项目' });
      return;
    }
    
    if (!result) {
      sendResponse(res, 400, { success: false, error: '请选择审核结果' });
      return;
    }
    
    console.log('批量审核项目，数量:', projectIds.length, '结果:', result, '操作人:', user.id);
    
    // 状态映射
    const statusMap = {
      approve: 'approved',
      reject: 'rejected',
      returned: 'returned'
    };
    
    const newStatus = statusMap[result] || result;
    const resultText = {
      approve: '通过',
      reject: '拒绝',
      returned: '退回修改'
    };
    
    // 获取项目信息
    const [projects] = await pool.query(`
      SELECT * FROM \`Project\` 
      WHERE id IN (?) AND status IN ('submitted', 'under_review')
    `, [projectIds]);
    
    if (projects.length === 0) {
      sendResponse(res, 400, { success: false, error: '没有可审核的项目' });
      return;
    }
    
    let successCount = 0;
    const failedProjects = [];
    
    // 逐个处理项目
    for (const project of projects) {
      try {
        // 更新项目状态
        await pool.query(
          'UPDATE `Project` SET status = ?, updated_at = NOW() WHERE id = ?',
          [newStatus, project.id]
        );
        
        // 如果是批准，设置批准日期
        if (result === 'approve') {
          await pool.query(
            'UPDATE `Project` SET approval_date = CURDATE() WHERE id = ?',
            [project.id]
          );
        }
        
        // 插入评审记录
        const reviewId = generateUUID();
        await pool.query(`
          INSERT INTO \`ProjectReview\` (
            id, project_id, reviewer_id, review_type,
            recommendation, comments, status, review_date, submitted_at
          ) VALUES (?, ?, ?, 'initial', ?, ?, 'submitted', CURDATE(), NOW())
        `, [reviewId, project.id, user.id, result, comment || `批量审核：${resultText[result]}`]);
        
        // 创建通知
        await createNotification(
          project.applicant_id,
          '项目审核结果',
          `您的项目"${project.title}"审核结果为：${resultText[result]}`,
          'project',
          project.id
        );
        
        successCount++;
        
      } catch (error) {
        console.error(`批量审核项目 ${project.id} 失败:`, error);
        failedProjects.push({
          project_id: project.id,
          project_title: project.title,
          error: error.message
        });
      }
    }
    
    // 记录操作日志
    await pool.query(
      `INSERT INTO \`AuditLog\` (user_id, action, table_name, new_values, created_at)
       VALUES (?, 'batch_project_review', 'Project', ?, NOW())`,
      [user.id, JSON.stringify({
        projectIds,
        result,
        comment,
        successCount,
        failedCount: failedProjects.length
      })]
    );
    
    sendResponse(res, 200, {
      success: true,
      message: `批量审核完成，成功处理 ${successCount} 个项目`,
      data: {
        successCount,
        failedProjects,
        failedCount: failedProjects.length
      }
    });
    
  } catch (error) {
    console.error('批量审核项目失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '批量审核失败'
    });
  }
  return;
}

// 拒绝项目
if (pathname.startsWith('/api/projects/') && pathname.includes('/reject') && req.method === 'POST') {
  const match = pathname.match(/\/api\/projects\/(.+)\/reject/);
  if (!match) return;
  
  const projectId = match[1];
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    const { reason, comment } = body;
    
    console.log('拒绝项目，项目ID:', projectId, '操作人:', user.id);
    
    // 更新项目状态
    await pool.query(
      'UPDATE `Project` SET status = "rejected", updated_at = NOW() WHERE id = ?',
      [projectId]
    );
    
    // 插入评审记录
    const reviewId = generateUUID();
    await pool.query(`
      INSERT INTO \`ProjectReview\` (
        id, project_id, reviewer_id, review_type,
        recommendation, comments, status, review_date, submitted_at
      ) VALUES (?, ?, ?, 'initial', 'reject', ?, 'submitted', CURDATE(), NOW())
    `, [reviewId, projectId, user.id, comment || reason || '项目被拒绝']);
    
    // 获取项目信息用于通知
    const [projects] = await pool.query(
      'SELECT * FROM `Project` WHERE id = ?',
      [projectId]
    );
    
    if (projects.length > 0) {
      const project = projects[0];
      // 创建通知
      await createNotification(
        project.applicant_id,
        '项目审核结果',
        `您的项目"${project.title}"审核结果为：拒绝`,
        'project',
        projectId
      );
    }
    
    sendResponse(res, 200, {
      success: true,
      message: '项目已拒绝'
    });
    
  } catch (error) {
    console.error('拒绝项目失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '拒绝项目失败'
    });
  }
  return;
}

// 退回项目修改
if (pathname.startsWith('/api/projects/') && pathname.includes('/return') && req.method === 'POST') {
  const match = pathname.match(/\/api\/projects\/(.+)\/return/);
  if (!match) return;
  
  const projectId = match[1];
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    const { suggestions, comment } = body;
    
    console.log('退回项目修改，项目ID:', projectId, '操作人:', user.id);
    
    // 更新项目状态
    await pool.query(
      'UPDATE `Project` SET status = "returned", updated_at = NOW() WHERE id = ?',
      [projectId]
    );
    
    // 插入评审记录
    const reviewId = generateUUID();
    await pool.query(`
      INSERT INTO \`ProjectReview\` (
        id, project_id, reviewer_id, review_type,
        recommendation, suggestions, comments, status, review_date, submitted_at
      ) VALUES (?, ?, ?, 'initial', 'approve_with_revision', ?, ?, 'submitted', CURDATE(), NOW())
    `, [reviewId, projectId, user.id, suggestions, comment || '请按照建议修改后重新提交']);
    
    // 获取项目信息用于通知
    const [projects] = await pool.query(
      'SELECT * FROM `Project` WHERE id = ?',
      [projectId]
    );
    
    if (projects.length > 0) {
      const project = projects[0];
      // 创建通知
      await createNotification(
        project.applicant_id,
        '项目需要修改',
        `您的项目"${project.title}"需要修改后才能继续审核`,
        'project',
        projectId
      );
    }
    
    sendResponse(res, 200, {
      success: true,
      message: '项目已退回修改'
    });
    
  } catch (error) {
    console.error('退回项目失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '退回项目失败'
    });
  }
  return;
}
// ==================== 科研助理申请管理相关API ====================

// 获取申请列表（科研助理查看）
if (pathname === '/api/assistant/applications' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const query = url.parse(req.url, true).query;
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    const sortBy = query.sortBy || 'created_at';
    const sortOrder = query.sortOrder || 'desc';
    
    console.log('科研助理获取申请列表，用户ID:', user.id);
    
    // 构建基础查询条件
    let whereClauses = [];
    let queryParams = [];
    
    // 按申请状态筛选
    if (query.status) {
      const statuses = query.status.split(',');
      const placeholders = statuses.map(() => '?').join(',');
      whereClauses.push(`p.status IN (${placeholders})`);
      queryParams.push(...statuses);
    } else {
      // 默认显示所有状态（除了草稿）
      whereClauses.push('p.status != "draft"');
    }
    
    // 按项目类别筛选
    if (query.category) {
      const categories = query.category.split(',');
      const placeholders = categories.map(() => '?').join(',');
      whereClauses.push(`p.category IN (${placeholders})`);
      queryParams.push(...categories);
    }
    
    // 按提交时间筛选
    if (query.startDate && query.endDate) {
      whereClauses.push('(p.submit_date BETWEEN ? AND ? OR p.created_at BETWEEN ? AND ?)');
      queryParams.push(query.startDate, query.endDate, query.startDate, query.endDate);
    }
    
    // 按预算范围筛选
    if (query.minBudget) {
      whereClauses.push('p.budget_total >= ?');
      queryParams.push(parseFloat(query.minBudget));
    }
    
    if (query.maxBudget) {
      whereClauses.push('p.budget_total <= ?');
      queryParams.push(parseFloat(query.maxBudget));
    }
    
    // 关键词搜索
    if (query.keyword) {
      whereClauses.push('(p.title LIKE ? OR p.project_code LIKE ? OR u.name LIKE ? OR p.research_field LIKE ? OR p.keywords LIKE ?)');
      const keyword = `%${query.keyword}%`;
      queryParams.push(keyword, keyword, keyword, keyword, keyword);
    }
    
    const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    
    // 获取申请总数
    const [totalResult] = await pool.query(`
      SELECT COUNT(*) as total 
      FROM \`Project\` p
      LEFT JOIN \`User\` u ON p.applicant_id = u.id
      ${whereClause}
    `, queryParams);
    
    const total = totalResult[0]?.total || 0;
    
    // 排序字段映射
    const orderByMap = {
      'created_at': 'p.created_at',
      'budget_total': 'p.budget_total',
      'submit_date': 'p.submit_date',
      'approval_date': 'p.approval_date'
    };
    
    const orderByField = orderByMap[sortBy] || 'p.created_at';
    const orderByClause = `ORDER BY ${orderByField} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
    
    // 获取申请数据
    const [applications] = await pool.query(`
      SELECT 
        p.id,
        p.project_code,
        p.title,
        p.category,
        p.research_field,
        p.keywords,
        p.abstract,
        p.objectives,
        p.budget_total,
        p.duration_months,
        p.status,
        p.current_stage,
        p.submit_date,
        p.approval_date,
        p.completion_date,
        p.created_at,

        u.name as applicant_name,
        u.department,
        u.title as applicant_title,
        u.email as applicant_email,
        u.phone as applicant_phone
      FROM \`Project\` p
      LEFT JOIN \`User\` u ON p.applicant_id = u.id
      ${whereClause}
      ${orderByClause}
      LIMIT ? OFFSET ?
    `, [...queryParams, pageSize, offset]);
    
    // 获取统计数据
    const [statsResult] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN p.status IN ('submitted', 'under_review') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN p.status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN p.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN p.status = 'returned' THEN 1 ELSE 0 END) as returned
      FROM \`Project\` p
      ${whereClause}
    `, queryParams);
    
    const stats = {
      total: statsResult[0]?.total || 0,
      pending: statsResult[0]?.pending || 0,
      approved: statsResult[0]?.approved || 0,
      rejected: statsResult[0]?.rejected || 0,
      returned: statsResult[0]?.returned || 0
    };
    
    sendResponse(res, 200, {
      success: true,
      data: {
        applications: applications.map(app => ({
          id: app.id,
          project_code: app.project_code,
          title: app.title,
          category: app.category,
          research_field: app.research_field,
          keywords: app.keywords,
          abstract: app.abstract,
          objectives: app.objectives,
          budget_total: parseFloat(app.budget_total),
          duration_months: app.duration_months,
          status: app.status,
          current_stage: app.current_stage,
          submit_date: app.submit_date ? app.submit_date.toISOString().split('T')[0] : null,
          approval_date: app.approval_date ? app.approval_date.toISOString().split('T')[0] : null,
          completion_date: app.completion_date ? app.completion_date.toISOString().split('T')[0] : null,
          created_at: app.created_at ? app.created_at.toISOString() : null,
          updated_at: app.updated_at ? app.updated_at.toISOString() : null,
          applicant_name: app.applicant_name,
          department: app.department,
          applicant_title: app.applicant_title,
          applicant_email: app.applicant_email,
          applicant_phone: app.applicant_phone
        })),
        pagination: {
          current: page,
          pageSize,
          total
        },
        stats
      }
    });
    
  } catch (error) {
    console.error('获取申请列表失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取申请列表失败',
      message: error.message
    });
  }
  return;
}

// 获取申请详情
if (pathname.startsWith('/api/assistant/applications/') && pathname.includes('/detail') && req.method === 'GET') {
  const match = pathname.match(/\/api\/assistant\/applications\/(.+)\/detail/);
  if (!match) return;
  
  const applicationId = match[1];
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('获取申请详情，申请ID:', applicationId);
    
    // 获取申请基本信息（项目信息）
    const [applications] = await pool.query(`
      SELECT 
        p.*,
        u.name as applicant_name,
        u.department,
        u.title as applicant_title,
        u.email as applicant_email,
        u.phone as applicant_phone
      FROM \`Project\` p
      LEFT JOIN \`User\` u ON p.applicant_id = u.id
      WHERE p.id = ?
    `, [applicationId]);
    
    if (applications.length === 0) {
      sendResponse(res, 404, { success: false, error: '申请不存在' });
      return;
    }
    
    const application = applications[0];
    
    // 获取预算明细
    const [budgetItems] = await pool.query(`
      SELECT 
        id,
        category,
        item_name,
        description,
        amount,
        justification,
        sequence
      FROM \`ProjectBudget\`
      WHERE project_id = ?
      ORDER BY sequence ASC
    `, [applicationId]);
    
    // 获取项目成员
    const [members] = await pool.query(`
      SELECT 
        pm.id,
        pm.role,
        pm.responsibility,
        pm.workload_percentage,
        pm.join_date,
        u.name,
        u.department,
        u.title
      FROM \`ProjectMember\` pm
      LEFT JOIN \`User\` u ON pm.user_id = u.id
      WHERE pm.project_id = ?
      ORDER BY 
        CASE pm.role
          WHEN 'principal' THEN 1
          WHEN 'co_researcher' THEN 2
          WHEN 'research_assistant' THEN 3
          ELSE 4
        END
    `, [applicationId]);
    
    // 获取附件文件
    const [attachments] = await pool.query(`
      SELECT 
        id,
        original_name as name,
        stored_name,
        file_path as path,
        file_size as size,
        mime_type as type,
        category,
        download_count,
        created_at
      FROM \`FileStorage\`
      WHERE related_table = 'Project' AND related_id = ?
      ORDER BY created_at DESC
    `, [applicationId]);
    
    // 获取评审记录
    const [reviews] = await pool.query(`
      SELECT 
        pr.*,
        u.name as reviewer_name,
        u.department as reviewer_department
      FROM \`ProjectReview\` pr
      LEFT JOIN \`User\` u ON pr.reviewer_id = u.id
      WHERE pr.project_id = ?
      ORDER BY pr.review_date DESC, pr.created_at DESC
    `, [applicationId]);
    
    // 获取审核任务记录
    const [tasks] = await pool.query(`
      SELECT 
        id,
        task_type,
        title,
        description,
        priority,
        status,
        processed_at,
        review_result,
        review_comment,
        created_at
      FROM \`AuditTask\`
      WHERE related_table = 'Project' AND related_id = ?
      ORDER BY created_at DESC
    `, [applicationId]);
    
    sendResponse(res, 200, {
      success: true,
      data: {
        application: {
          id: application.id,
          project_code: application.project_code,
          title: application.title,
          category: application.category,
          research_field: application.research_field,
          keywords: application.keywords,
          abstract: application.abstract,
          background: application.background,
          objectives: application.objectives,
          methodology: application.methodology,
          expected_outcomes: application.expected_outcomes,
          budget_total: parseFloat(application.budget_total),
          duration_months: application.duration_months,
          status: application.status,
          current_stage: application.current_stage,
          submit_date: application.submit_date ? application.submit_date.toISOString().split('T')[0] : null,
          start_date: application.start_date ? application.start_date.toISOString().split('T')[0] : null,
          end_date: application.end_date ? application.end_date.toISOString().split('T')[0] : null,
          approval_date: application.approval_date ? application.approval_date.toISOString().split('T')[0] : null,
          completion_date: application.completion_date ? application.completion_date.toISOString().split('T')[0] : null,
          remarks: application.remarks,
          created_at: application.created_at ? application.created_at.toISOString() : null,
          updated_at: application.updated_at ? application.updated_at.toISOString() : null,
          applicant_name: application.applicant_name,
          department: application.department,
          applicant_title: application.applicant_title,
          applicant_email: application.applicant_email,
          applicant_phone: application.applicant_phone
        },
        budget_items: budgetItems.map(item => ({
          id: item.id,
          category: item.category,
          item_name: item.item_name,
          description: item.description,
          amount: parseFloat(item.amount),
          justification: item.justification,
          sequence: item.sequence
        })),
        members: members.map(member => ({
          id: member.id,
          role: member.role,
          responsibility: member.responsibility,
          workload_percentage: member.workload_percentage ? parseFloat(member.workload_percentage) : null,
          join_date: member.join_date ? member.join_date.toISOString().split('T')[0] : null,
          name: member.name,
          department: member.department,
          title: member.title
        })),
        attachments: attachments.map(file => ({
          id: file.id,
          name: file.name,
          stored_name: file.stored_name,
          path: file.path,
          size: parseInt(file.size),
          type: file.type,
          category: file.category,
          download_count: file.download_count,
          created_at: file.created_at ? file.created_at.toISOString() : null
        })),
        reviews: reviews.map(review => ({
          id: review.id,
          reviewer_name: review.reviewer_name,
          reviewer_department: review.reviewer_department,
          review_type: review.review_type,
          review_date: review.review_date ? review.review_date.toISOString().split('T')[0] : null,
          innovation_score: review.innovation_score,
          feasibility_score: review.feasibility_score,
          significance_score: review.significance_score,
          team_score: review.team_score,
          budget_score: review.budget_score,
          total_score: review.total_score ? parseFloat(review.total_score) : null,
          strengths: review.strengths,
          weaknesses: review.weaknesses,
          recommendation: review.recommendation,
          comments: review.comments,
          suggestions: review.suggestions,
          is_confidential: review.is_confidential === 1,
          status: review.status,
          submitted_at: review.submitted_at ? review.submitted_at.toISOString() : null,
          created_at: review.created_at ? review.created_at.toISOString() : null
        })),
        tasks: tasks.map(task => ({
          id: task.id,
          task_type: task.task_type,
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          processed_at: task.processed_at ? task.processed_at.toISOString() : null,
          review_result: task.review_result,
          review_comment: task.review_comment,
          created_at: task.created_at ? task.created_at.toISOString() : null
        }))
      }
    });
    
  } catch (error) {
    console.error('获取申请详情失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取申请详情失败',
      message: error.message
    });
  }
  return;
}

// 快速审核通过申请
if (pathname.startsWith('/api/assistant/applications/') && pathname.includes('/approve') && req.method === 'POST') {
  const match = pathname.match(/\/api\/assistant\/applications\/(.+)\/approve/);
  if (!match) return;
  
  const applicationId = match[1];
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    const { comment, approvalDate } = body;
    
    console.log('快速审核通过申请，申请ID:', applicationId, '操作人:', user.id);
    
    // 检查申请状态
    const [applications] = await pool.query(
      'SELECT * FROM `Project` WHERE id = ? AND status IN ("submitted", "under_review")',
      [applicationId]
    );
    
    if (applications.length === 0) {
      sendResponse(res, 400, { 
        success: false, 
        error: '申请不存在或不能审核' 
      });
      return;
    }
    
    const application = applications[0];
    const finalApprovalDate = approvalDate || new Date().toISOString().split('T')[0];
    
    // 更新申请状态
    await pool.query(
      'UPDATE `Project` SET status = "approved", approval_date = ?, updated_at = NOW() WHERE id = ?',
      [finalApprovalDate, applicationId]
    );
    
    // 插入简化的评审记录
    const reviewId = generateUUID();
    await pool.query(`
      INSERT INTO \`ProjectReview\` (
        id, project_id, reviewer_id, review_type,
        recommendation, comments, status, review_date, submitted_at
      ) VALUES (?, ?, ?, 'initial', 'approve', ?, 'submitted', CURDATE(), NOW())
    `, [reviewId, applicationId, user.id, comment || '科研助理快速审核通过']);
    
    // 创建审核任务记录
    const taskId = generateUUID();
    await pool.query(`
      INSERT INTO \`AuditTask\` (
        id, task_type, title, description,
        applicant_id, project_id, related_table, related_id,
        priority, status, processed_by, processed_at,
        review_result, review_comment, created_at
      ) VALUES (?, 'project_review', ?, ?, ?, ?, 'Project', ?, 'medium', 'completed', ?, NOW(), 'approved', ?, NOW())
    `, [
      taskId,
      `申请快速审核：${application.title}`,
      `科研助理快速审核通过申请"${application.title}"`,
      application.applicant_id,
      applicationId,
      user.id,
      comment || '快速审核通过'
    ]);
    
    // 创建通知
    const notificationId = generateUUID();
    await pool.query(`
      INSERT INTO \`Notification\` (
        id, user_id, type, title, content,
        related_id, related_type, priority,
        is_read, expires_at, created_at
      ) VALUES (?, ?, 'project', ?, ?, ?, 'Project', 'high', FALSE, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())
    `, [
      notificationId,
      application.applicant_id,
      '申请审核通过',
      `您的申请"${application.title}"已通过快速审核并获得批准`,
      applicationId
    ]);
    
    // 记录操作日志
    await pool.query(`
      INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, new_values, created_at)
      VALUES (?, 'application_approve', 'Project', ?, ?, NOW())
    `, [user.id, applicationId, JSON.stringify({ 
      status: 'approved', 
      comment: comment || '快速审核通过',
      approval_date: finalApprovalDate,
      reviewer_id: user.id
    })]);
    
    sendResponse(res, 200, {
      success: true,
      message: '申请已审核通过',
      data: { 
        applicationId, 
        status: 'approved',
        approvalDate: finalApprovalDate,
        reviewId,
        taskId
      }
    });
    
  } catch (error) {
    console.error('快速审核申请失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '审核申请失败',
      message: error.message
    });
  }
  return;
}

// 退回申请修改
if (pathname.startsWith('/api/assistant/applications/') && pathname.includes('/return') && req.method === 'POST') {
  const match = pathname.match(/\/api\/assistant\/applications\/(.+)\/return/);
  if (!match) return;
  
  const applicationId = match[1];
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    const { suggestions, comment } = body;
    
    if (!suggestions) {
      sendResponse(res, 400, { success: false, error: '修改建议不能为空' });
      return;
    }
    
    console.log('退回申请修改，申请ID:', applicationId, '操作人:', user.id);
    
    // 检查申请状态
    const [applications] = await pool.query(
      'SELECT * FROM `Project` WHERE id = ? AND status IN ("submitted", "under_review")',
      [applicationId]
    );
    
    if (applications.length === 0) {
      sendResponse(res, 400, { 
        success: false, 
        error: '申请不存在或不能审核' 
      });
      return;
    }
    
    const application = applications[0];
    
    // 更新申请状态
    await pool.query(
      'UPDATE `Project` SET status = "returned", updated_at = NOW() WHERE id = ?',
      [applicationId]
    );
    
    // 插入评审记录
    const reviewId = generateUUID();
    await pool.query(`
      INSERT INTO \`ProjectReview\` (
        id, project_id, reviewer_id, review_type,
        recommendation, suggestions, comments, status, review_date, submitted_at
      ) VALUES (?, ?, ?, 'initial', 'approve_with_revision', ?, ?, 'submitted', CURDATE(), NOW())
    `, [reviewId, applicationId, user.id, suggestions, comment || '请按照建议修改后重新提交']);
    
    // 创建审核任务记录
    const taskId = generateUUID();
    await pool.query(`
      INSERT INTO \`AuditTask\` (
        id, task_type, title, description,
        applicant_id, project_id, related_table, related_id,
        priority, status, processed_by, processed_at,
        review_result, review_comment, created_at
      ) VALUES (?, 'project_review', ?, ?, ?, ?, 'Project', ?, 'medium', 'completed', ?, NOW(), 'returned', ?, NOW())
    `, [
      taskId,
      `申请退回修改：${application.title}`,
      `科研助理退回申请"${application.title}"要求修改`,
      application.applicant_id,
      applicationId,
      user.id,
      comment || '退回修改'
    ]);
    
    // 创建通知
    const notificationId = generateUUID();
    await pool.query(`
      INSERT INTO \`Notification\` (
        id, user_id, type, title, content,
        related_id, related_type, priority,
        is_read, expires_at, created_at
      ) VALUES (?, ?, 'project', ?, ?, ?, 'Project', 'high', FALSE, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())
    `, [
      notificationId,
      application.applicant_id,
      '申请需要修改',
      `您的申请"${application.title}"需要修改后才能继续审核`,
      applicationId
    ]);
    
    // 记录操作日志
    await pool.query(`
      INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, new_values, created_at)
      VALUES (?, 'application_return', 'Project', ?, ?, NOW())
    `, [user.id, applicationId, JSON.stringify({ 
      status: 'returned', 
      suggestions,
      comment: comment || '',
      reviewer_id: user.id
    })]);
    
    sendResponse(res, 200, {
      success: true,
      message: '申请已退回修改',
      data: { 
        applicationId, 
        status: 'returned',
        reviewId,
        taskId
      }
    });
    
  } catch (error) {
    console.error('退回申请失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '退回申请失败',
      message: error.message
    });
  }
  return;
}

// 拒绝申请
if (pathname.startsWith('/api/assistant/applications/') && pathname.includes('/reject') && req.method === 'POST') {
  const match = pathname.match(/\/api\/assistant\/applications\/(.+)\/reject/);
  if (!match) return;
  
  const applicationId = match[1];
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    const { reason, comment } = body;
    
    if (!reason) {
      sendResponse(res, 400, { success: false, error: '拒绝原因不能为空' });
      return;
    }
    
    console.log('拒绝申请，申请ID:', applicationId, '操作人:', user.id);
    
    // 检查申请状态
    const [applications] = await pool.query(
      'SELECT * FROM `Project` WHERE id = ? AND status IN ("submitted", "under_review")',
      [applicationId]
    );
    
    if (applications.length === 0) {
      sendResponse(res, 400, { 
        success: false, 
        error: '申请不存在或不能审核' 
      });
      return;
    }
    
    const application = applications[0];
    
    // 更新申请状态
    await pool.query(
      'UPDATE `Project` SET status = "rejected", updated_at = NOW() WHERE id = ?',
      [applicationId]
    );
    
    // 插入评审记录
    const reviewId = generateUUID();
    await pool.query(`
      INSERT INTO \`ProjectReview\` (
        id, project_id, reviewer_id, review_type,
        recommendation, comments, status, review_date, submitted_at
      ) VALUES (?, ?, ?, 'initial', 'reject', ?, 'submitted', CURDATE(), NOW())
    `, [reviewId, applicationId, user.id, comment || reason]);
    
    // 创建审核任务记录
    const taskId = generateUUID();
    await pool.query(`
      INSERT INTO \`AuditTask\` (
        id, task_type, title, description,
        applicant_id, project_id, related_table, related_id,
        priority, status, processed_by, processed_at,
        review_result, review_comment, created_at
      ) VALUES (?, 'project_review', ?, ?, ?, ?, 'Project', ?, 'medium', 'completed', ?, NOW(), 'rejected', ?, NOW())
    `, [
      taskId,
      `申请拒绝：${application.title}`,
      `科研助理拒绝申请"${application.title}"`,
      application.applicant_id,
      applicationId,
      user.id,
      comment || reason
    ]);
    
    // 创建通知
    const notificationId = generateUUID();
    await pool.query(`
      INSERT INTO \`Notification\` (
        id, user_id, type, title, content,
        related_id, related_type, priority,
        is_read, expires_at, created_at
      ) VALUES (?, ?, 'project', ?, ?, ?, 'Project', 'high', FALSE, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())
    `, [
      notificationId,
      application.applicant_id,
      '申请审核拒绝',
      `您的申请"${application.title}"审核结果为：拒绝`,
      applicationId
    ]);
    
    // 记录操作日志
    await pool.query(`
      INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, new_values, created_at)
      VALUES (?, 'application_reject', 'Project', ?, ?, NOW())
    `, [user.id, applicationId, JSON.stringify({ 
      status: 'rejected', 
      reason,
      comment: comment || '',
      reviewer_id: user.id
    })]);
    
    sendResponse(res, 200, {
      success: true,
      message: '申请已拒绝',
      data: { 
        applicationId, 
        status: 'rejected',
        reviewId,
        taskId
      }
    });
    
  } catch (error) {
    console.error('拒绝申请失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '拒绝申请失败',
      message: error.message
    });
  }
  return;
}

// 批量处理申请
if (pathname === '/api/assistant/applications/batch-process' && req.method === 'POST') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    const { applicationIds, action, data } = body;
    
    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      sendResponse(res, 400, { success: false, error: '请选择要处理的申请' });
      return;
    }
    
    if (!action) {
      sendResponse(res, 400, { success: false, error: '请选择处理方式' });
      return;
    }
    
    console.log('批量处理申请，数量:', applicationIds.length, '操作:', action, '操作人:', user.id);
    
    // 获取申请信息
    const placeholders = applicationIds.map(() => '?').join(',');
    const [applications] = await pool.query(`
      SELECT * FROM \`Project\` 
      WHERE id IN (${placeholders}) AND status IN ('submitted', 'under_review')
    `, applicationIds);
    
    if (applications.length === 0) {
      sendResponse(res, 400, { success: false, error: '没有可处理的申请' });
      return;
    }
    
    let successCount = 0;
    const failedApplications = [];
    
    // 状态映射
    const statusMap = {
      approve: 'approved',
      reject: 'rejected',
      return: 'returned'
    };
    
    const newStatus = statusMap[action] || action;
    const actionText = {
      approve: '通过',
      reject: '拒绝',
      return: '退回修改'
    };
    
    // 逐个处理申请
    for (const application of applications) {
      try {
        // 更新申请状态
        let approvalDate = null;
        if (action === 'approve') {
          approvalDate = data?.approvalDate || new Date().toISOString().split('T')[0];
          await pool.query(
            'UPDATE `Project` SET status = ?, approval_date = ?, updated_at = NOW() WHERE id = ?',
            [newStatus, approvalDate, application.id]
          );
        } else {
          await pool.query(
            'UPDATE `Project` SET status = ?, updated_at = NOW() WHERE id = ?',
            [newStatus, application.id]
          );
        }
        
        // 插入评审记录
        const reviewId = generateUUID();
        const comments = data?.comment || `批量处理：${actionText[action]}`;
        
        await pool.query(`
          INSERT INTO \`ProjectReview\` (
            id, project_id, reviewer_id, review_type,
            recommendation, comments, status, review_date, submitted_at
          ) VALUES (?, ?, ?, 'initial', ?, ?, 'submitted', CURDATE(), NOW())
        `, [reviewId, application.id, user.id, action, comments]);
        
        // 创建审核任务记录
        const taskId = generateUUID();
        await pool.query(`
          INSERT INTO \`AuditTask\` (
            id, task_type, title, description,
            applicant_id, project_id, related_table, related_id,
            priority, status, processed_by, processed_at,
            review_result, review_comment, created_at
          ) VALUES (?, 'project_review', ?, ?, ?, ?, 'Project', ?, 'medium', 'completed', ?, NOW(), ?, ?, NOW())
        `, [
          taskId,
          `批量申请处理：${application.title}`,
          `科研助理批量处理申请"${application.title}"`,
          application.applicant_id,
          application.id,
          user.id,
          action,
          comments
        ]);
        
        // 创建通知
        const notificationId = generateUUID();
        const notificationTitle = action === 'approve' 
          ? '申请审核通过' 
          : action === 'reject' 
            ? '申请审核拒绝' 
            : '申请需要修改';
        
        const notificationContent = action === 'approve'
          ? `您的申请"${application.title}"已通过批量审核并获得批准`
          : action === 'reject'
            ? `您的申请"${application.title}"批量审核结果为：拒绝`
            : `您的申请"${application.title}"需要修改后才能继续审核`;
        
        await pool.query(`
          INSERT INTO \`Notification\` (
            id, user_id, type, title, content,
            related_id, related_type, priority,
            is_read, expires_at, created_at
          ) VALUES (?, ?, 'project', ?, ?, ?, 'Project', 'high', FALSE, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())
        `, [
          notificationId,
          application.applicant_id,
          notificationTitle,
          notificationContent,
          application.id
        ]);
        
        successCount++;
        
      } catch (error) {
        console.error(`批量处理申请 ${application.id} 失败:`, error);
        failedApplications.push({
          application_id: application.id,
          title: application.title,
          error: error.message
        });
      }
    }
    
    // 记录操作日志
    await pool.query(`
      INSERT INTO \`AuditLog\` (user_id, action, table_name, new_values, created_at)
      VALUES (?, 'batch_application_process', 'Project', ?, NOW())
    `, [user.id, JSON.stringify({
      applicationIds,
      action,
      data,
      successCount,
      failedCount: failedApplications.length,
      totalCount: applications.length
    })]);
    
    sendResponse(res, 200, {
      success: true,
      message: `批量处理完成，成功处理 ${successCount} 个申请`,
      data: {
        successCount,
        failedApplications,
        failedCount: failedApplications.length,
        totalCount: applications.length
      }
    });
    
  } catch (error) {
    console.error('批量处理申请失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '批量处理失败',
      message: error.message
    });
  }
  return;
}

// 获取申请统计数据
if (pathname === '/api/assistant/applications/stats' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('获取申请统计数据，用户ID:', user.id);
    
    // 获取各种状态的申请数量
    const [statsResult] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('submitted', 'under_review') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returned,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM \`Project\`
    `);
    
    // 获取按类别的统计
    const [categoryStats] = await pool.query(`
      SELECT 
        category,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'approved' THEN budget_total ELSE 0 END) as approved_budget,
        AVG(CASE WHEN status = 'approved' THEN budget_total ELSE NULL END) as avg_budget
      FROM \`Project\`
      GROUP BY category
      ORDER BY count DESC
    `);
    
    // 获取按月份的统计
    const [monthlyStats] = await pool.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM \`Project\`
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month DESC
    `);
    
    // 获取申请人统计
    const [applicantStats] = await pool.query(`
      SELECT 
        u.name as applicant_name,
        COUNT(p.id) as total_applications,
        SUM(CASE WHEN p.status = 'approved' THEN 1 ELSE 0 END) as approved_applications,
        SUM(CASE WHEN p.status = 'approved' THEN p.budget_total ELSE 0 END) as total_budget
      FROM \`Project\` p
      LEFT JOIN \`User\` u ON p.applicant_id = u.id
      GROUP BY p.applicant_id, u.name
      ORDER BY total_applications DESC
      LIMIT 10
    `);
    
    const stats = {
      summary: statsResult[0] || {},
      by_category: categoryStats.map(stat => ({
        category: stat.category,
        count: stat.count || 0,
        approved_budget: parseFloat(stat.approved_budget || 0),
        avg_budget: parseFloat(stat.avg_budget || 0)
      })),
      by_month: monthlyStats.map(stat => ({
        month: stat.month,
        total: stat.total || 0,
        approved: stat.approved || 0,
        rejected: stat.rejected || 0
      })),
      by_applicant: applicantStats.map(stat => ({
        applicant_name: stat.applicant_name,
        total_applications: stat.total_applications || 0,
        approved_applications: stat.approved_applications || 0,
        total_budget: parseFloat(stat.total_budget || 0)
      }))
    };
    
    sendResponse(res, 200, {
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('获取申请统计数据失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取统计数据失败',
      message: error.message
    });
  }
  return;
}
// ==================== 科研助理经费审核相关API ====================

// 获取经费审核列表
if (pathname === '/api/assistant/funding/list' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const query = url.parse(req.url, true).query;
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    
    console.log('科研助理获取经费审核列表，用户ID:', user.id);
    
    // 构建基础查询条件
    let whereClauses = [];
    let queryParams = [];
    
    // 按申请状态筛选
    if (query.status && query.status !== 'all') {
      const statuses = query.status.split(',');
      const placeholders = statuses.map(() => '?').join(',');
      whereClauses.push(`fa.status IN (${placeholders})`);
      queryParams.push(...statuses);
    }
    
    // 按申请时间筛选
    if (query.dateRange) {
      let dateCondition = '';
      const now = new Date();
      
      switch (query.dateRange) {
        case 'today':
          dateCondition = 'DATE(fa.apply_date) = CURDATE()';
          break;
        case 'week':
          dateCondition = 'fa.apply_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
          break;
        case 'month':
          dateCondition = 'fa.apply_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
          break;
        default:
          // 处理自定义日期范围
          if (query.startDate && query.endDate) {
            whereClauses.push('fa.apply_date BETWEEN ? AND ?');
            queryParams.push(query.startDate, query.endDate);
          }
      }
      
      if (dateCondition) {
        whereClauses.push(dateCondition);
      }
    }
    
    // 关键词搜索
    if (query.search) {
      whereClauses.push('(fa.application_no LIKE ? OR p.title LIKE ? OR p.project_code LIKE ? OR u.name LIKE ?)');
      const keyword = `%${query.search}%`;
      queryParams.push(keyword, keyword, keyword, keyword);
    }
    
    const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    
    // 获取申请总数
    const [totalResult] = await pool.query(`
      SELECT COUNT(*) as total 
      FROM \`FundingApplication\` fa
      LEFT JOIN \`Project\` p ON fa.project_id = p.id
      LEFT JOIN \`User\` u ON p.applicant_id = u.id
      ${whereClause}
    `, queryParams);
    
    const total = totalResult[0]?.total || 0;
    
    // 获取申请数据
    const [applications] = await pool.query(`
      SELECT 
        fa.id,
        fa.application_no,
        fa.project_id,
        fa.apply_amount,
        fa.purpose,
        fa.supporting_docs,
        fa.status,
        fa.apply_date,
        fa.reviewer_id,
        fa.review_date,
        fa.review_comment,
        fa.payment_date,
        fa.payment_voucher,
        
        p.title as project_title,
        p.project_code,
        p.category as project_category,
        
        u.id as applicant_id,
        u.name as applicant_name,
        u.department as applicant_department,
        
        ur.name as reviewer_name
      FROM \`FundingApplication\` fa
      LEFT JOIN \`Project\` p ON fa.project_id = p.id
      LEFT JOIN \`User\` u ON p.applicant_id = u.id
      LEFT JOIN \`User\` ur ON fa.reviewer_id = ur.id
      ${whereClause}
      ORDER BY fa.apply_date DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, pageSize, offset]);
    
    // 格式化数据
    const formattedApplications = applications.map(app => ({
      id: app.id,
      application_no: app.application_no,
      project_id: app.project_id,
      apply_amount: parseFloat(app.apply_amount) || 0,
      purpose: app.purpose,
      supporting_docs: app.supporting_docs ? JSON.parse(app.supporting_docs) : [],
      status: app.status,
      apply_date: app.apply_date ? app.apply_date.toISOString().split('T')[0] : null,
      reviewer_id: app.reviewer_id,
      review_date: app.review_date ? app.review_date.toISOString().split('T')[0] : null,
      review_comment: app.review_comment,
      payment_date: app.payment_date ? app.payment_date.toISOString().split('T')[0] : null,
      payment_voucher: app.payment_voucher,
      project_info: {
        id: app.project_id,
        title: app.project_title,
        project_code: app.project_code,
        category: app.project_category
      },
      applicant_info: {
        id: app.applicant_id,
        name: app.applicant_name,
        department: app.applicant_department
      },
      reviewer_info: app.reviewer_name ? {
        id: app.reviewer_id,
        name: app.reviewer_name
      } : null
    }));
    
    // 获取统计数据
    const [statsResult] = await pool.query(`
      SELECT 
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as reviewing,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid
      FROM \`FundingApplication\`
    `);
    
    const stats = {
      pending: statsResult[0]?.pending || 0,
      reviewing: statsResult[0]?.reviewing || 0,
      approved: statsResult[0]?.approved || 0,
      rejected: statsResult[0]?.rejected || 0,
      paid: statsResult[0]?.paid || 0
    };
    
    sendResponse(res, 200, {
      success: true,
      data: {
        list: formattedApplications,
        pagination: {
          current: page,
          pageSize,
          total
        },
        stats
      }
    });
    
  } catch (error) {
    console.error('获取经费审核列表失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取经费审核列表失败',
      message: error.message
    });
  }
  return;
}

// 获取经费申请详情
if (pathname.startsWith('/api/assistant/funding/') && !pathname.includes('/review') && !pathname.includes('/payment') && req.method === 'GET') {
  const match = pathname.match(/\/api\/assistant\/funding\/(.+)/);
  if (!match) return;
  
  const fundingId = match[1];
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('获取经费申请详情，申请ID:', fundingId);
    
    // 获取经费申请基本信息
    const [fundingApplications] = await pool.query(`
      SELECT 
        fa.*,
        p.title as project_title,
        p.project_code,
        p.category as project_category,
        p.status as project_status,
        p.budget_total as project_budget_total,
        
        u.id as applicant_id,
        u.name as applicant_name,
        u.department,
        u.email as applicant_email,
        u.phone as applicant_phone,
        
        ur.name as reviewer_name,
        ur.email as reviewer_email
      FROM \`FundingApplication\` fa
      LEFT JOIN \`Project\` p ON fa.project_id = p.id
      LEFT JOIN \`User\` u ON p.applicant_id = u.id
      LEFT JOIN \`User\` ur ON fa.reviewer_id = ur.id
      WHERE fa.id = ?
    `, [fundingId]);
    
    if (fundingApplications.length === 0) {
      sendResponse(res, 404, { success: false, error: '经费申请不存在' });
      return;
    }
    
    const funding = fundingApplications[0];
    
    // 获取项目预算明细（用于参考）
    const [budgetItems] = await pool.query(`
      SELECT 
        category,
        item_name,
        description,
        amount,
        justification
      FROM \`ProjectBudget\`
      WHERE project_id = ?
      ORDER BY sequence ASC
    `, [funding.project_id]);
    
    // 获取项目支出记录
    const [expenditures] = await pool.query(`
      SELECT 
        expense_no,
        category,
        item_name,
        amount,
        expense_date,
        payee,
        description,
        status,
        review_comment
      FROM \`ExpenditureRecord\`
      WHERE project_id = ? AND funding_app_id = ?
      ORDER BY expense_date DESC
    `, [funding.project_id, fundingId]);
    
    // 获取审核任务记录
    const [tasks] = await pool.query(`
      SELECT 
        id,
        task_type,
        title,
        description,
        priority,
        status,
        processed_at,
        review_result,
        review_comment,
        created_at
      FROM \`AuditTask\`
      WHERE related_table = 'FundingApplication' AND related_id = ?
      ORDER BY created_at DESC
    `, [fundingId]);
    
    sendResponse(res, 200, {
      success: true,
      data: {
        funding: {
          id: funding.id,
          application_no: funding.application_no,
          project_id: funding.project_id,
          apply_amount: parseFloat(funding.apply_amount),
          purpose: funding.purpose,
          supporting_docs: funding.supporting_docs ? JSON.parse(funding.supporting_docs) : [],
          status: funding.status,
          apply_date: funding.apply_date ? funding.apply_date.toISOString().split('T')[0] : null,
          reviewer_id: funding.reviewer_id,
          review_date: funding.review_date ? funding.review_date.toISOString().split('T')[0] : null,
          review_comment: funding.review_comment,
          payment_date: funding.payment_date ? funding.payment_date.toISOString().split('T')[0] : null,
          payment_voucher: funding.payment_voucher,
          created_at: funding.created_at ? funding.created_at.toISOString() : null,
          
          project_info: {
            id: funding.project_id,
            title: funding.project_title,
            project_code: funding.project_code,
            category: funding.project_category,
            status: funding.project_status,
            budget_total: parseFloat(funding.project_budget_total)
          },
          
          applicant_info: {
            id: funding.applicant_id,
            name: funding.applicant_name,
            department: funding.department,
            email: funding.applicant_email,
            phone: funding.applicant_phone
          },
          
          reviewer_info: funding.reviewer_name ? {
            id: funding.reviewer_id,
            name: funding.reviewer_name,
            email: funding.reviewer_email
          } : null
        },
        budget_items: budgetItems.map(item => ({
          category: item.category,
          item_name: item.item_name,
          description: item.description,
          amount: parseFloat(item.amount),
          justification: item.justification
        })),
        expenditures: expenditures.map(exp => ({
          expense_no: exp.expense_no,
          category: exp.category,
          item_name: exp.item_name,
          amount: parseFloat(exp.amount),
          expense_date: exp.expense_date ? exp.expense_date.toISOString().split('T')[0] : null,
          payee: exp.payee,
          description: exp.description,
          status: exp.status,
          review_comment: exp.review_comment
        })),
        tasks: tasks.map(task => ({
          id: task.id,
          task_type: task.task_type,
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          processed_at: task.processed_at ? task.processed_at.toISOString() : null,
          review_result: task.review_result,
          review_comment: task.review_comment,
          created_at: task.created_at ? task.created_at.toISOString() : null
        }))
      }
    });
    
  } catch (error) {
    console.error('获取经费申请详情失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取经费申请详情失败',
      message: error.message
    });
  }
  return;
}

// 审核经费申请
if (pathname.startsWith('/api/assistant/funding/') && pathname.includes('/review') && req.method === 'POST') {
  const match = pathname.match(/\/api\/assistant\/funding\/(.+)\/review/);
  if (!match) return;
  
  const fundingId = match[1];
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    const { recommendation, comment } = body;
    
    if (!recommendation) {
      sendResponse(res, 400, { success: false, error: '请选择审核结果' });
      return;
    }
    
    if (!comment) {
      sendResponse(res, 400, { success: false, error: '请填写审核意见' });
      return;
    }
    
    console.log('审核经费申请，申请ID:', fundingId, '操作人:', user.id, '审核结果:', recommendation);
    
    // 检查经费申请状态
    const [fundingApplications] = await pool.query(
      'SELECT * FROM `FundingApplication` WHERE id = ? AND status IN ("submitted", "under_review")',
      [fundingId]
    );
    
    if (fundingApplications.length === 0) {
      sendResponse(res, 400, { 
        success: false, 
        error: '经费申请不存在或不能审核' 
      });
      return;
    }
    
    const funding = fundingApplications[0];
    
    // 确定新状态
    let newStatus = '';
    if (recommendation === 'approve' || recommendation === 'approve_with_revision') {
      newStatus = 'approved';
    } else if (recommendation === 'reject') {
      newStatus = 'rejected';
    } else {
      sendResponse(res, 400, { success: false, error: '无效的审核结果' });
      return;
    }
    
    // 更新经费申请状态
    await pool.query(
      'UPDATE `FundingApplication` SET status = ?, reviewer_id = ?, review_date = CURDATE(), review_comment = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, user.id, comment, fundingId]
    );
    
    // 获取项目信息用于创建通知
    const [projectInfo] = await pool.query(`
      SELECT p.applicant_id, p.title 
      FROM \`Project\` p
      WHERE p.id = ?
    `, [funding.project_id]);
    
    if (projectInfo.length > 0) {
      const applicantId = projectInfo[0].applicant_id;
      const projectTitle = projectInfo[0].title;
      
      // 创建审核任务记录
      const taskId = generateUUID();
      await pool.query(`
        INSERT INTO \`AuditTask\` (
          id, task_type, title, description,
          applicant_id, project_id, related_table, related_id,
          priority, status, processed_by, processed_at,
          review_result, review_comment, created_at
        ) VALUES (?, 'funding_review', ?, ?, ?, ?, 'FundingApplication', ?, 'medium', 'completed', ?, NOW(), ?, ?, NOW())
      `, [
        taskId,
        `经费申请审核：${funding.application_no}`,
        `科研助理审核经费申请"${funding.application_no}"，项目：${projectTitle}`,
        applicantId,
        funding.project_id,
        fundingId,
        user.id,
        newStatus,
        comment
      ]);
      
      // 创建通知
      const notificationId = generateUUID();
      const notificationTitle = newStatus === 'approved' 
        ? '经费申请审核通过' 
        : '经费申请审核拒绝';
      
      const notificationContent = newStatus === 'approved'
        ? `您的经费申请 ${funding.application_no}（项目：${projectTitle}）已通过审核`
        : `您的经费申请 ${funding.application_no}（项目：${projectTitle}）审核结果为：拒绝`;
      
      await pool.query(`
        INSERT INTO \`Notification\` (
          id, user_id, type, title, content,
          related_id, related_type, priority,
          is_read, expires_at, created_at
        ) VALUES (?, ?, 'funding', ?, ?, ?, 'FundingApplication', 'high', FALSE, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())
      `, [
        notificationId,
        applicantId,
        notificationTitle,
        notificationContent,
        fundingId
      ]);
    }
    
    // 记录操作日志
    await pool.query(`
      INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, new_values, created_at)
      VALUES (?, 'funding_review', 'FundingApplication', ?, ?, NOW())
    `, [user.id, fundingId, JSON.stringify({ 
      status: newStatus, 
      recommendation,
      comment,
      reviewer_id: user.id
    })]);
    
    sendResponse(res, 200, {
      success: true,
      message: `经费申请已${newStatus === 'approved' ? '批准' : '拒绝'}`,
      data: { 
        fundingId, 
        status: newStatus,
        taskId: taskId || null
      }
    });
    
  } catch (error) {
    console.error('审核经费申请失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '审核经费申请失败',
      message: error.message
    });
  }
  return;
}

// 标记经费已拨款
if (pathname.startsWith('/api/assistant/funding/') && pathname.includes('/payment') && req.method === 'POST') {
  const match = pathname.match(/\/api\/assistant\/funding\/(.+)\/payment/);
  if (!match) return;
  
  const fundingId = match[1];
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    const { payment_date, payment_voucher } = body;
    
    if (!payment_date) {
      sendResponse(res, 400, { success: false, error: '请选择拨款日期' });
      return;
    }
    
    console.log('标记经费已拨款，申请ID:', fundingId, '操作人:', user.id);
    
    // 检查经费申请状态
    const [fundingApplications] = await pool.query(
      'SELECT * FROM `FundingApplication` WHERE id = ? AND status = "approved"',
      [fundingId]
    );
    
    if (fundingApplications.length === 0) {
      sendResponse(res, 400, { 
        success: false, 
        error: '经费申请不存在或未批准，不能标记拨款' 
      });
      return;
    }
    
    const funding = fundingApplications[0];
    
    // 更新经费申请状态
    await pool.query(
      'UPDATE `FundingApplication` SET status = "paid", payment_date = ?, payment_voucher = ?, updated_at = NOW() WHERE id = ?',
      [payment_date, payment_voucher || '', fundingId]
    );
    
    // 获取项目信息
    const [projectInfo] = await pool.query(`
      SELECT p.applicant_id, p.title 
      FROM \`Project\` p
      WHERE p.id = ?
    `, [funding.project_id]);
    
    if (projectInfo.length > 0) {
      const applicantId = projectInfo[0].applicant_id;
      const projectTitle = projectInfo[0].title;
      
      // 创建审核任务记录
      const taskId = generateUUID();
      await pool.query(`
        INSERT INTO \`AuditTask\` (
          id, task_type, title, description,
          applicant_id, project_id, related_table, related_id,
          priority, status, processed_by, processed_at,
          review_result, review_comment, created_at
        ) VALUES (?, 'funding_review', ?, ?, ?, ?, 'FundingApplication', ?, 'medium', 'completed', ?, NOW(), 'paid', ?, NOW())
      `, [
        taskId,
        `经费拨款完成：${funding.application_no}`,
        `科研助理标记经费申请"${funding.application_no}"（项目：${projectTitle}）已拨款`,
        applicantId,
        funding.project_id,
        fundingId,
        user.id,
        `拨款日期：${payment_date}，凭证：${payment_voucher || '无'}`
      ]);
      
      // 创建通知
      const notificationId = generateUUID();
      await pool.query(`
        INSERT INTO \`Notification\` (
          id, user_id, type, title, content,
          related_id, related_type, priority,
          is_read, expires_at, created_at
        ) VALUES (?, ?, 'funding', ?, ?, ?, 'FundingApplication', 'high', FALSE, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())
      `, [
        notificationId,
        applicantId,
        '经费已拨款',
        `您的经费申请 ${funding.application_no}（项目：${projectTitle}，金额：¥${funding.apply_amount}）已完成拨款`,
        fundingId
      ]);
    }
    
    // 记录操作日志
    await pool.query(`
      INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, new_values, created_at)
      VALUES (?, 'funding_payment', 'FundingApplication', ?, ?, NOW())
    `, [user.id, fundingId, JSON.stringify({ 
      status: 'paid', 
      payment_date,
      payment_voucher: payment_voucher || '',
      processed_by: user.id
    })]);
    
    sendResponse(res, 200, {
      success: true,
      message: '经费申请已标记为已拨款',
      data: { 
        fundingId, 
        status: 'paid',
        payment_date,
        taskId: taskId || null
      }
    });
    
  } catch (error) {
    console.error('标记经费拨款失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '标记经费拨款失败',
      message: error.message
    });
  }
  return;
}

// 批量批准经费申请
if (pathname === '/api/assistant/funding/batch-approve' && req.method === 'POST') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    const { ids, comment } = body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      sendResponse(res, 400, { success: false, error: '请选择要操作的经费申请' });
      return;
    }
    
    console.log('批量批准经费申请，数量:', ids.length, '操作人:', user.id);
    
    // 检查所有申请是否可操作
    const placeholders = ids.map(() => '?').join(',');
    const [applications] = await pool.query(`
      SELECT * FROM \`FundingApplication\` 
      WHERE id IN (${placeholders}) AND status IN ('submitted', 'under_review')
    `, ids);
    
    if (applications.length === 0) {
      sendResponse(res, 400, { success: false, error: '没有可操作的经费申请' });
      return;
    }
    
    let successCount = 0;
    const failedApplications = [];
    
    // 逐个处理经费申请
    for (const funding of applications) {
      try {
        // 更新经费申请状态
        await pool.query(
          'UPDATE `FundingApplication` SET status = "approved", reviewer_id = ?, review_date = CURDATE(), review_comment = ?, updated_at = NOW() WHERE id = ?',
          [user.id, comment || '批量批准', funding.id]
        );
        
        // 获取项目信息
        const [projectInfo] = await pool.query(`
          SELECT p.applicant_id, p.title 
          FROM \`Project\` p
          WHERE p.id = ?
        `, [funding.project_id]);
        
        if (projectInfo.length > 0) {
          const applicantId = projectInfo[0].applicant_id;
          const projectTitle = projectInfo[0].title;
          
          // 创建审核任务记录
          const taskId = generateUUID();
          await pool.query(`
            INSERT INTO \`AuditTask\` (
              id, task_type, title, description,
              applicant_id, project_id, related_table, related_id,
              priority, status, processed_by, processed_at,
              review_result, review_comment, created_at
            ) VALUES (?, 'funding_review', ?, ?, ?, ?, 'FundingApplication', ?, 'medium', 'completed', ?, NOW(), 'approved', ?, NOW())
          `, [
            taskId,
            `批量经费申请审核：${funding.application_no}`,
            `科研助理批量审核经费申请"${funding.application_no}"，项目：${projectTitle}`,
            applicantId,
            funding.project_id,
            funding.id,
            user.id,
            comment || '批量批准'
          ]);
          
          // 创建通知
          const notificationId = generateUUID();
          await pool.query(`
            INSERT INTO \`Notification\` (
              id, user_id, type, title, content,
              related_id, related_type, priority,
              is_read, expires_at, created_at
            ) VALUES (?, ?, 'funding', ?, ?, ?, 'FundingApplication', 'medium', FALSE, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())
          `, [
            notificationId,
            applicantId,
            '经费申请批量审核通过',
            `您的经费申请 ${funding.application_no}（项目：${projectTitle}）已通过批量审核`,
            funding.id
          ]);
        }
        
        successCount++;
        
      } catch (error) {
        console.error(`批量批准经费申请 ${funding.id} 失败:`, error);
        failedApplications.push({
          funding_id: funding.id,
          application_no: funding.application_no,
          error: error.message
        });
      }
    }
    
    // 记录操作日志
    await pool.query(`
      INSERT INTO \`AuditLog\` (user_id, action, table_name, new_values, created_at)
      VALUES (?, 'batch_funding_approve', 'FundingApplication', ?, NOW())
    `, [user.id, JSON.stringify({
      ids,
      comment,
      successCount,
      failedCount: failedApplications.length,
      totalCount: applications.length
    })]);
    
    sendResponse(res, 200, {
      success: true,
      message: `批量批准完成，成功处理 ${successCount} 个经费申请`,
      data: {
        successCount,
        failedApplications,
        failedCount: failedApplications.length,
        totalCount: applications.length
      }
    });
    
  } catch (error) {
    console.error('批量批准经费申请失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '批量批准失败',
      message: error.message
    });
  }
  return;
}

// 批量拒绝经费申请
if (pathname === '/api/assistant/funding/batch-reject' && req.method === 'POST') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    const { ids, comment } = body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      sendResponse(res, 400, { success: false, error: '请选择要操作的经费申请' });
      return;
    }
    
    if (!comment) {
      sendResponse(res, 400, { success: false, error: '请填写拒绝原因' });
      return;
    }
    
    console.log('批量拒绝经费申请，数量:', ids.length, '操作人:', user.id);
    
    // 检查所有申请是否可操作
    const placeholders = ids.map(() => '?').join(',');
    const [applications] = await pool.query(`
      SELECT * FROM \`FundingApplication\` 
      WHERE id IN (${placeholders}) AND status IN ('submitted', 'under_review')
    `, ids);
    
    if (applications.length === 0) {
      sendResponse(res, 400, { success: false, error: '没有可操作的经费申请' });
      return;
    }
    
    let successCount = 0;
    const failedApplications = [];
    
    // 逐个处理经费申请
    for (const funding of applications) {
      try {
        // 更新经费申请状态
        await pool.query(
          'UPDATE `FundingApplication` SET status = "rejected", reviewer_id = ?, review_date = CURDATE(), review_comment = ?, updated_at = NOW() WHERE id = ?',
          [user.id, comment, funding.id]
        );
        
        // 获取项目信息
        const [projectInfo] = await pool.query(`
          SELECT p.applicant_id, p.title 
          FROM \`Project\` p
          WHERE p.id = ?
        `, [funding.project_id]);
        
        if (projectInfo.length > 0) {
          const applicantId = projectInfo[0].applicant_id;
          const projectTitle = projectInfo[0].title;
          
          // 创建审核任务记录
          const taskId = generateUUID();
          await pool.query(`
            INSERT INTO \`AuditTask\` (
              id, task_type, title, description,
              applicant_id, project_id, related_table, related_id,
              priority, status, processed_by, processed_at,
              review_result, review_comment, created_at
            ) VALUES (?, 'funding_review', ?, ?, ?, ?, 'FundingApplication', ?, 'medium', 'completed', ?, NOW(), 'rejected', ?, NOW())
          `, [
            taskId,
            `批量经费申请审核：${funding.application_no}`,
            `科研助理批量审核经费申请"${funding.application_no}"，项目：${projectTitle}`,
            applicantId,
            funding.project_id,
            funding.id,
            user.id,
            comment
          ]);
          
          // 创建通知
          const notificationId = generateUUID();
          await pool.query(`
            INSERT INTO \`Notification\` (
              id, user_id, type, title, content,
              related_id, related_type, priority,
              is_read, expires_at, created_at
            ) VALUES (?, ?, 'funding', ?, ?, ?, 'FundingApplication', 'medium', FALSE, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())
          `, [
            notificationId,
            applicantId,
            '经费申请批量审核拒绝',
            `您的经费申请 ${funding.application_no}（项目：${projectTitle}）批量审核结果为：拒绝`,
            funding.id
          ]);
        }
        
        successCount++;
        
      } catch (error) {
        console.error(`批量拒绝经费申请 ${funding.id} 失败:`, error);
        failedApplications.push({
          funding_id: funding.id,
          application_no: funding.application_no,
          error: error.message
        });
      }
    }
    
    // 记录操作日志
    await pool.query(`
      INSERT INTO \`AuditLog\` (user_id, action, table_name, new_values, created_at)
      VALUES (?, 'batch_funding_reject', 'FundingApplication', ?, NOW())
    `, [user.id, JSON.stringify({
      ids,
      comment,
      successCount,
      failedCount: failedApplications.length,
      totalCount: applications.length
    })]);
    
    sendResponse(res, 200, {
      success: true,
      message: `批量拒绝完成，成功处理 ${successCount} 个经费申请`,
      data: {
        successCount,
        failedApplications,
        failedCount: failedApplications.length,
        totalCount: applications.length
      }
    });
    
  } catch (error) {
    console.error('批量拒绝经费申请失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '批量拒绝失败',
      message: error.message
    });
  }
  return;
}

// 获取经费申请统计数据
if (pathname === '/api/assistant/funding/stats' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('获取经费申请统计数据，用户ID:', user.id);
    
    // 获取基本统计数据
    const [basicStats] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as reviewing,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid,
        SUM(CASE WHEN status IN ('approved', 'paid') THEN apply_amount ELSE 0 END) as total_approved_amount,
        SUM(CASE WHEN status = 'paid' THEN apply_amount ELSE 0 END) as total_paid_amount,
        AVG(CASE WHEN status IN ('approved', 'paid') THEN apply_amount ELSE NULL END) as avg_approved_amount
      FROM \`FundingApplication\`
    `);
    
    // 获取按月份的统计
    const [monthlyStats] = await pool.query(`
      SELECT 
        DATE_FORMAT(apply_date, '%Y-%m') as month,
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('approved', 'paid') THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status IN ('approved', 'paid') THEN apply_amount ELSE 0 END) as approved_amount
      FROM \`FundingApplication\`
      WHERE apply_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(apply_date, '%Y-%m')
      ORDER BY month DESC
    `);
    
    // 获取按项目的统计
    const [projectStats] = await pool.query(`
      SELECT 
        p.title as project_title,
        p.project_code,
        COUNT(fa.id) as funding_count,
        SUM(CASE WHEN fa.status IN ('approved', 'paid') THEN fa.apply_amount ELSE 0 END) as total_approved_amount,
        SUM(CASE WHEN fa.status = 'paid' THEN fa.apply_amount ELSE 0 END) as total_paid_amount
      FROM \`FundingApplication\` fa
      LEFT JOIN \`Project\` p ON fa.project_id = p.id
      GROUP BY fa.project_id, p.title, p.project_code
      ORDER BY total_approved_amount DESC
      LIMIT 10
    `);
    
    // 获取按申请人的统计
    const [applicantStats] = await pool.query(`
      SELECT 
        u.name as applicant_name,
        u.department,
        COUNT(fa.id) as funding_count,
        SUM(CASE WHEN fa.status IN ('approved', 'paid') THEN fa.apply_amount ELSE 0 END) as total_approved_amount
      FROM \`FundingApplication\` fa
      LEFT JOIN \`Project\` p ON fa.project_id = p.id
      LEFT JOIN \`User\` u ON p.applicant_id = u.id
      GROUP BY p.applicant_id, u.name, u.department
      ORDER BY total_approved_amount DESC
      LIMIT 10
    `);
    
    const stats = {
      summary: {
        total: basicStats[0]?.total || 0,
        pending: basicStats[0]?.pending || 0,
        reviewing: basicStats[0]?.reviewing || 0,
        approved: basicStats[0]?.approved || 0,
        rejected: basicStats[0]?.rejected || 0,
        paid: basicStats[0]?.paid || 0,
        total_approved_amount: parseFloat(basicStats[0]?.total_approved_amount || 0),
        total_paid_amount: parseFloat(basicStats[0]?.total_paid_amount || 0),
        avg_approved_amount: parseFloat(basicStats[0]?.avg_approved_amount || 0)
      },
      by_month: monthlyStats.map(stat => ({
        month: stat.month,
        total: stat.total || 0,
        approved: stat.approved || 0,
        rejected: stat.rejected || 0,
        approved_amount: parseFloat(stat.approved_amount || 0)
      })),
      by_project: projectStats.map(stat => ({
        project_title: stat.project_title,
        project_code: stat.project_code,
        funding_count: stat.funding_count || 0,
        total_approved_amount: parseFloat(stat.total_approved_amount || 0),
        total_paid_amount: parseFloat(stat.total_paid_amount || 0)
      })),
      by_applicant: applicantStats.map(stat => ({
        applicant_name: stat.applicant_name,
        department: stat.department,
        funding_count: stat.funding_count || 0,
        total_approved_amount: parseFloat(stat.total_approved_amount || 0)
      }))
    };
    
    sendResponse(res, 200, {
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('获取经费申请统计数据失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取统计数据失败',
      message: error.message
    });
  }
  return;
}

// 导出经费申请数据
if (pathname === '/api/assistant/funding/export' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const query = url.parse(req.url, true).query;
    
    console.log('导出经费申请数据，用户ID:', user.id);
    
    // 构建基础查询条件（与列表查询一致）
    let whereClauses = [];
    let queryParams = [];
    
    // 按申请状态筛选
    if (query.status && query.status !== 'all') {
      const statuses = query.status.split(',');
      const placeholders = statuses.map(() => '?').join(',');
      whereClauses.push(`fa.status IN (${placeholders})`);
      queryParams.push(...statuses);
    }
    
    // 关键词搜索
    if (query.search) {
      whereClauses.push('(fa.application_no LIKE ? OR p.title LIKE ? OR p.project_code LIKE ? OR u.name LIKE ?)');
      const keyword = `%${query.search}%`;
      queryParams.push(keyword, keyword, keyword, keyword);
    }
    
    const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    
    // 获取所有符合条件的申请
    const [applications] = await pool.query(`
      SELECT 
        fa.application_no as '申请编号',
        p.project_code as '项目编号',
        p.title as '项目名称',
        p.category as '项目类别',
        u.name as '申请人',
        u.department as '申请人部门',
        fa.apply_amount as '申请金额(元)',
        fa.purpose as '申请用途',
        CASE fa.status
          WHEN 'draft' THEN '草稿'
          WHEN 'submitted' THEN '待审核'
          WHEN 'under_review' THEN '审核中'
          WHEN 'approved' THEN '已批准'
          WHEN 'rejected' THEN '已拒绝'
          WHEN 'paid' THEN '已拨款'
          ELSE fa.status
        END as '申请状态',
        DATE_FORMAT(fa.apply_date, '%Y-%m-%d') as '申请日期',
        ur.name as '审核人',
        DATE_FORMAT(fa.review_date, '%Y-%m-%d') as '审核日期',
        fa.review_comment as '审核意见',
        DATE_FORMAT(fa.payment_date, '%Y-%m-%d') as '拨款日期',
        fa.payment_voucher as '拨款凭证'
      FROM \`FundingApplication\` fa
      LEFT JOIN \`Project\` p ON fa.project_id = p.id
      LEFT JOIN \`User\` u ON p.applicant_id = u.id
      LEFT JOIN \`User\` ur ON fa.reviewer_id = ur.id
      ${whereClause}
      ORDER BY fa.apply_date DESC
    `, queryParams);
    
    sendResponse(res, 200, {
      success: true,
      data: applications,
      message: '导出数据准备完成'
    });
    
  } catch (error) {
    console.error('导出经费申请数据失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '导出失败',
      message: error.message
    });
  }
  return;
}

// ==================== 科研助理支出审核相关API ====================
// 获取支出审核列表
if (pathname === '/api/assistant/expenditures/list' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const query = url.parse(req.url, true).query;
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    
    console.log('科研助理获取支出审核列表，用户ID:', user.id);
    
    // 构建基础查询条件
    let whereClauses = [];
    let queryParams = [];
    
    // 按申请状态筛选
    if (query.status && query.status !== 'all') {
      const statuses = query.status.split(',');
      const placeholders = statuses.map(() => '?').join(',');
      whereClauses.push(`er.status IN (${placeholders})`);
      queryParams.push(...statuses);
    }
    
    // 按支出类别筛选
    if (query.category) {
      whereClauses.push('er.category = ?');
      queryParams.push(query.category);
    }
    
    // 按支出时间筛选
    if (query.dateRange) {
      let dateCondition = '';
      
      switch (query.dateRange) {
        case 'today':
          dateCondition = 'DATE(er.expense_date) = CURDATE()';
          break;
        case 'week':
          dateCondition = 'er.expense_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
          break;
        case 'month':
          dateCondition = 'er.expense_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
          break;
        case 'quarter':
          dateCondition = 'er.expense_date >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
          break;
        default:
          // 处理自定义日期范围
          if (query.startDate && query.endDate) {
            whereClauses.push('er.expense_date BETWEEN ? AND ?');
            queryParams.push(query.startDate, query.endDate);
          }
      }
      
      if (dateCondition) {
        whereClauses.push(dateCondition);
      }
    }
    
    // 关键词搜索
    if (query.search) {
      whereClauses.push('(er.expense_no LIKE ? OR p.title LIKE ? OR p.project_code LIKE ? OR u.name LIKE ? OR er.payee LIKE ? OR er.item_name LIKE ?)');
      const keyword = `%${query.search}%`;
      queryParams.push(keyword, keyword, keyword, keyword, keyword, keyword);
    }
    
    const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    
    // 获取支出总数
    const [totalResult] = await pool.query(`
      SELECT COUNT(*) as total 
      FROM \`ExpenditureRecord\` er
      LEFT JOIN \`Project\` p ON er.project_id = p.id
      LEFT JOIN \`User\` u ON p.applicant_id = u.id
      ${whereClause}
    `, queryParams);
    
    const total = totalResult[0]?.total || 0;
    
    // 获取支出数据
    const [expenditures] = await pool.query(`
      SELECT 
        er.id,
        er.expense_no,
        er.project_id,
        er.funding_app_id,
        er.category,
        er.item_name,
        er.amount,
        er.expense_date,
        er.payee,
        er.description,
        er.supporting_docs,
        er.status,
        er.reviewer_id,
        er.review_date,
        er.review_comment,
        
        p.title as project_title,
        p.project_code,
        p.category as project_category,
        
        u.id as applicant_id,
        u.name as applicant_name,
        u.department as applicant_department,
        
        ur.name as reviewer_name,
        
        fa.application_no as funding_app_no,
        fa.apply_amount as funding_app_amount,
        fa.status as funding_app_status
      FROM \`ExpenditureRecord\` er
      LEFT JOIN \`Project\` p ON er.project_id = p.id
      LEFT JOIN \`User\` u ON p.applicant_id = u.id
      LEFT JOIN \`User\` ur ON er.reviewer_id = ur.id
      LEFT JOIN \`FundingApplication\` fa ON er.funding_app_id = fa.id
      ${whereClause}
      ORDER BY er.expense_date DESC, er.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, pageSize, offset]);
    
    // 格式化数据
    const formattedExpenditures = expenditures.map(exp => ({
      id: exp.id,
      expense_no: exp.expense_no,
      project_id: exp.project_id,
      funding_app_id: exp.funding_app_id,
      category: exp.category,
      item_name: exp.item_name,
      amount: parseFloat(exp.amount) || 0,
      expense_date: exp.expense_date ? exp.expense_date.toISOString().split('T')[0] : null,
      payee: exp.payee,
      description: exp.description,
      //supporting_docs: exp.supporting_docs ? JSON.parse(exp.supporting_docs) : [],
      status: exp.status,
      reviewer_id: exp.reviewer_id,
      review_date: exp.review_date ? exp.review_date.toISOString().split('T')[0] : null,
      review_comment: exp.review_comment,
      project_info: {
        id: exp.project_id,
        title: exp.project_title,
        project_code: exp.project_code,
        category: exp.project_category
      },
      applicant_info: {
        id: exp.applicant_id,
        name: exp.applicant_name,
        department: exp.applicant_department
      },
      reviewer_info: exp.reviewer_name ? {
        id: exp.reviewer_id,
        name: exp.reviewer_name
      } : null,
      funding_app_info: exp.funding_app_no ? {
        id: exp.funding_app_id,
        application_no: exp.funding_app_no,
        apply_amount: parseFloat(exp.funding_app_amount) || 0,
        status: exp.funding_app_status
      } : null
    }));
    
    // 获取统计数据
    const [statsResult] = await pool.query(`
      SELECT 
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as reviewing,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(amount) as total_amount,
        SUM(CASE WHEN status IN ('submitted', 'under_review') THEN amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_amount,
        SUM(CASE WHEN status = 'rejected' THEN amount ELSE 0 END) as rejected_amount
      FROM \`ExpenditureRecord\`
    `);
    
    const stats = {
      pending: statsResult[0]?.pending || 0,
      reviewing: statsResult[0]?.reviewing || 0,
      approved: statsResult[0]?.approved || 0,
      rejected: statsResult[0]?.rejected || 0,
      total_amount: parseFloat(statsResult[0]?.total_amount || 0),
      pending_amount: parseFloat(statsResult[0]?.pending_amount || 0),
      approved_amount: parseFloat(statsResult[0]?.approved_amount || 0),
      rejected_amount: parseFloat(statsResult[0]?.rejected_amount || 0)
    };
    
    sendResponse(res, 200, {
      success: true,
      data: {
        list: formattedExpenditures,
        pagination: {
          current: page,
          pageSize,
          total
        },
        stats
      }
    });
    
  } catch (error) {
    console.error('获取支出审核列表失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取支出审核列表失败',
      message: error.message
    });
  }
  return;
}

// 获取支出记录详情
if (pathname.startsWith('/api/assistant/expenditures/') && !pathname.includes('/review') && req.method === 'GET') {
  const match = pathname.match(/\/api\/assistant\/expenditures\/(.+)/);
  if (!match) return;
  
  const expenditureId = match[1];
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('获取支出记录详情，记录ID:', expenditureId);
    
    // 获取支出记录基本信息
    const [expenditures] = await pool.query(`
      SELECT 
        er.*,
        p.title as project_title,
        p.project_code,
        p.category as project_category,
        p.status as project_status,
        p.budget_total as project_budget_total,
        
        u.id as applicant_id,
        u.name as applicant_name,
        u.department,
        u.email as applicant_email,
        u.phone as applicant_phone,
        
        ur.name as reviewer_name,
        ur.email as reviewer_email,
        
        fa.application_no as funding_app_no,
        fa.apply_amount as funding_app_amount,
        fa.status as funding_app_status,
        fa.apply_date as funding_app_date
      FROM \`ExpenditureRecord\` er
      LEFT JOIN \`Project\` p ON er.project_id = p.id
      LEFT JOIN \`User\` u ON p.applicant_id = u.id
      LEFT JOIN \`User\` ur ON er.reviewer_id = ur.id
      LEFT JOIN \`FundingApplication\` fa ON er.funding_app_id = fa.id
      WHERE er.id = ?
    `, [expenditureId]);
    
    if (expenditures.length === 0) {
      sendResponse(res, 404, { success: false, error: '支出记录不存在' });
      return;
    }
    
    const expenditure = expenditures[0];
    
    // 获取项目预算明细（用于参考）
    const [budgetItems] = await pool.query(`
      SELECT 
        category,
        item_name,
        description,
        amount,
        justification
      FROM \`ProjectBudget\`
      WHERE project_id = ?
      ORDER BY sequence ASC
    `, [expenditure.project_id]);
    
    // 获取类似支出记录
    const [similarExpenditures] = await pool.query(`
      SELECT 
        expense_no,
        category,
        item_name,
        amount,
        expense_date,
        status,
        review_comment
      FROM \`ExpenditureRecord\`
      WHERE project_id = ? AND id != ?
      ORDER BY expense_date DESC
      LIMIT 5
    `, [expenditure.project_id, expenditureId]);
    
    // 获取审核任务记录
    const [tasks] = await pool.query(`
      SELECT 
        id,
        task_type,
        title,
        description,
        priority,
        status,
        processed_at,
        review_result,
        review_comment,
        created_at
      FROM \`AuditTask\`
      WHERE related_table = 'ExpenditureRecord' AND related_id = ?
      ORDER BY created_at DESC
    `, [expenditureId]);
    
    sendResponse(res, 200, {
      success: true,
      data: {
        expenditure: {
          id: expenditure.id,
          expense_no: expenditure.expense_no,
          project_id: expenditure.project_id,
          funding_app_id: expenditure.funding_app_id,
          category: expenditure.category,
          item_name: expenditure.item_name,
          amount: parseFloat(expenditure.amount),
          expense_date: expenditure.expense_date ? expenditure.expense_date.toISOString().split('T')[0] : null,
          payee: expenditure.payee,
          description: expenditure.description,
          supporting_docs: expenditure.supporting_docs ? JSON.parse(expenditure.supporting_docs) : [],
          status: expenditure.status,
          reviewer_id: expenditure.reviewer_id,
          review_date: expenditure.review_date ? expenditure.review_date.toISOString().split('T')[0] : null,
          review_comment: expenditure.review_comment,
          created_at: expenditure.created_at ? expenditure.created_at.toISOString() : null,
          
          project_info: {
            id: expenditure.project_id,
            title: expenditure.project_title,
            project_code: expenditure.project_code,
            category: expenditure.project_category,
            status: expenditure.project_status,
            budget_total: parseFloat(expenditure.project_budget_total)
          },
          
          applicant_info: {
            id: expenditure.applicant_id,
            name: expenditure.applicant_name,
            department: expenditure.department,
            email: expenditure.applicant_email,
            phone: expenditure.applicant_phone
          },
          
          reviewer_info: expenditure.reviewer_name ? {
            id: expenditure.reviewer_id,
            name: expenditure.reviewer_name,
            email: expenditure.reviewer_email
          } : null,
          
          funding_app_info: expenditure.funding_app_no ? {
            id: expenditure.funding_app_id,
            application_no: expenditure.funding_app_no,
            apply_amount: parseFloat(expenditure.funding_app_amount),
            status: expenditure.funding_app_status,
            apply_date: expenditure.funding_app_date ? expenditure.funding_app_date.toISOString().split('T')[0] : null
          } : null
        },
        budget_items: budgetItems.map(item => ({
          category: item.category,
          item_name: item.item_name,
          description: item.description,
          amount: parseFloat(item.amount),
          justification: item.justification
        })),
        similar_expenditures: similarExpenditures.map(exp => ({
          expense_no: exp.expense_no,
          category: exp.category,
          item_name: exp.item_name,
          amount: parseFloat(exp.amount),
          expense_date: exp.expense_date ? exp.expense_date.toISOString().split('T')[0] : null,
          status: exp.status,
          review_comment: exp.review_comment
        })),
        tasks: tasks.map(task => ({
          id: task.id,
          task_type: task.task_type,
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          processed_at: task.processed_at ? task.processed_at.toISOString() : null,
          review_result: task.review_result,
          review_comment: task.review_comment,
          created_at: task.created_at ? task.created_at.toISOString() : null
        }))
      }
    });
    
  } catch (error) {
    console.error('获取支出记录详情失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取支出记录详情失败',
      message: error.message
    });
  }
  return;
}

// 审核支出记录
if (pathname.startsWith('/api/assistant/expenditures/') && pathname.includes('/review') && req.method === 'POST') {
  const match = pathname.match(/\/api\/assistant\/expenditures\/(.+)\/review/);
  if (!match) return;
  
  const expenditureId = match[1];
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    const { recommendation, comment } = body;
    
    if (!recommendation) {
      sendResponse(res, 400, { success: false, error: '请选择审核结果' });
      return;
    }
    
    if (!comment) {
      sendResponse(res, 400, { success: false, error: '请填写审核意见' });
      return;
    }
    
    console.log('审核支出记录，记录ID:', expenditureId, '操作人:', user.id, '审核结果:', recommendation);
    
    // 检查支出记录状态
    const [expenditureRecords] = await pool.query(
      'SELECT * FROM `ExpenditureRecord` WHERE id = ? AND status IN ("submitted", "under_review")',
      [expenditureId]
    );
    
    if (expenditureRecords.length === 0) {
      sendResponse(res, 400, { 
        success: false, 
        error: '支出记录不存在或不能审核' 
      });
      return;
    }
    
    const expenditure = expenditureRecords[0];
    
    // 确定新状态
    let newStatus = '';
    if (recommendation === 'approve') {
      newStatus = 'approved';
    } else if (recommendation === 'reject') {
      newStatus = 'rejected';
    } else {
      sendResponse(res, 400, { success: false, error: '无效的审核结果' });
      return;
    }
    
    // 更新支出记录状态
    await pool.query(
      'UPDATE `ExpenditureRecord` SET status = ?, reviewer_id = ?, review_date = CURDATE(), review_comment = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, user.id, comment, expenditureId]
    );
    
    // 获取项目信息用于创建通知
    const [projectInfo] = await pool.query(`
      SELECT p.applicant_id, p.title 
      FROM \`Project\` p
      WHERE p.id = ?
    `, [expenditure.project_id]);
    
    if (projectInfo.length > 0) {
      const applicantId = projectInfo[0].applicant_id;
      const projectTitle = projectInfo[0].title;
      
      // 创建审核任务记录
      const taskId = generateUUID();
      await pool.query(`
        INSERT INTO \`AuditTask\` (
          id, task_type, title, description,
          applicant_id, project_id, related_table, related_id,
          priority, status, processed_by, processed_at,
          review_result, review_comment, created_at
        ) VALUES (?, 'expenditure_review', ?, ?, ?, ?, 'ExpenditureRecord', ?, 'medium', 'completed', ?, NOW(), ?, ?, NOW())
      `, [
        taskId,
        `支出记录审核：${expenditure.expense_no}`,
        `科研助理审核支出记录"${expenditure.expense_no}"，项目：${projectTitle}`,
        applicantId,
        expenditure.project_id,
        expenditureId,
        user.id,
        newStatus,
        comment
      ]);
      
      // 创建通知
      const notificationId = generateUUID();
      const notificationTitle = newStatus === 'approved' 
        ? '支出记录审核通过' 
        : '支出记录审核拒绝';
      
      const notificationContent = newStatus === 'approved'
        ? `您的支出记录 ${expenditure.expense_no}（项目：${projectTitle}，金额：¥${expenditure.amount}）已通过审核`
        : `您的支出记录 ${expenditure.expense_no}（项目：${projectTitle}，金额：¥${expenditure.amount}）审核结果为：拒绝`;
      
      await pool.query(`
        INSERT INTO \`Notification\` (
          id, user_id, type, title, content,
          related_id, related_type, priority,
          is_read, expires_at, created_at
        ) VALUES (?, ?, 'expenditure', ?, ?, ?, 'ExpenditureRecord', 'high', FALSE, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())
      `, [
        notificationId,
        applicantId,
        notificationTitle,
        notificationContent,
        expenditureId
      ]);
    }
    
    // 记录操作日志
    await pool.query(`
      INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, new_values, created_at)
      VALUES (?, 'expenditure_review', 'ExpenditureRecord', ?, ?, NOW())
    `, [user.id, expenditureId, JSON.stringify({ 
      status: newStatus, 
      recommendation,
      comment,
      reviewer_id: user.id
    })]);
    
    sendResponse(res, 200, {
      success: true,
      message: `支出记录已${newStatus === 'approved' ? '批准' : '拒绝'}`,
      data: { 
        expenditureId, 
        status: newStatus,
        taskId: taskId || null
      }
    });
    
  } catch (error) {
    console.error('审核支出记录失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '审核支出记录失败',
      message: error.message
    });
  }
  return;
}

// 批量批准支出记录
if (pathname === '/api/assistant/expenditures/batch-approve' && req.method === 'POST') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    const { ids, comment } = body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      sendResponse(res, 400, { success: false, error: '请选择要操作的支出记录' });
      return;
    }
    
    console.log('批量批准支出记录，数量:', ids.length, '操作人:', user.id);
    
    // 检查所有记录是否可操作
    const placeholders = ids.map(() => '?').join(',');
    const [expenditures] = await pool.query(`
      SELECT * FROM \`ExpenditureRecord\` 
      WHERE id IN (${placeholders}) AND status IN ('submitted', 'under_review')
    `, ids);
    
    if (expenditures.length === 0) {
      sendResponse(res, 400, { success: false, error: '没有可操作的支出记录' });
      return;
    }
    
    let successCount = 0;
    const failedExpenditures = [];
    
    // 逐个处理支出记录
    for (const expenditure of expenditures) {
      try {
        // 更新支出记录状态
        await pool.query(
          'UPDATE `ExpenditureRecord` SET status = "approved", reviewer_id = ?, review_date = CURDATE(), review_comment = ?, updated_at = NOW() WHERE id = ?',
          [user.id, comment || '批量批准', expenditure.id]
        );
        
        // 获取项目信息
        const [projectInfo] = await pool.query(`
          SELECT p.applicant_id, p.title 
          FROM \`Project\` p
          WHERE p.id = ?
        `, [expenditure.project_id]);
        
        if (projectInfo.length > 0) {
          const applicantId = projectInfo[0].applicant_id;
          const projectTitle = projectInfo[0].title;
          
          // 创建审核任务记录
          const taskId = generateUUID();
          await pool.query(`
            INSERT INTO \`AuditTask\` (
              id, task_type, title, description,
              applicant_id, project_id, related_table, related_id,
              priority, status, processed_by, processed_at,
              review_result, review_comment, created_at
            ) VALUES (?, 'expenditure_review', ?, ?, ?, ?, 'ExpenditureRecord', ?, 'medium', 'completed', ?, NOW(), 'approved', ?, NOW())
          `, [
            taskId,
            `批量支出记录审核：${expenditure.expense_no}`,
            `科研助理批量审核支出记录"${expenditure.expense_no}"，项目：${projectTitle}`,
            applicantId,
            expenditure.project_id,
            expenditure.id,
            user.id,
            comment || '批量批准'
          ]);
          
          // 创建通知
          const notificationId = generateUUID();
          await pool.query(`
            INSERT INTO \`Notification\` (
              id, user_id, type, title, content,
              related_id, related_type, priority,
              is_read, expires_at, created_at
            ) VALUES (?, ?, 'expenditure', ?, ?, ?, 'ExpenditureRecord', 'medium', FALSE, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())
          `, [
            notificationId,
            applicantId,
            '支出记录批量审核通过',
            `您的支出记录 ${expenditure.expense_no}（项目：${projectTitle}）已通过批量审核`,
            expenditure.id
          ]);
        }
        
        successCount++;
        
      } catch (error) {
        console.error(`批量批准支出记录 ${expenditure.id} 失败:`, error);
        failedExpenditures.push({
          expenditure_id: expenditure.id,
          expense_no: expenditure.expense_no,
          error: error.message
        });
      }
    }
    
    // 记录操作日志
    await pool.query(`
      INSERT INTO \`AuditLog\` (user_id, action, table_name, new_values, created_at)
      VALUES (?, 'batch_expenditure_approve', 'ExpenditureRecord', ?, NOW())
    `, [user.id, JSON.stringify({
      ids,
      comment,
      successCount,
      failedCount: failedExpenditures.length,
      totalCount: expenditures.length
    })]);
    
    sendResponse(res, 200, {
      success: true,
      message: `批量批准完成，成功处理 ${successCount} 条支出记录`,
      data: {
        successCount,
        failedExpenditures,
        failedCount: failedExpenditures.length,
        totalCount: expenditures.length
      }
    });
    
  } catch (error) {
    console.error('批量批准支出记录失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '批量批准失败',
      message: error.message
    });
  }
  return;
}

// 批量拒绝支出记录
if (pathname === '/api/assistant/expenditures/batch-reject' && req.method === 'POST') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    const { ids, comment } = body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      sendResponse(res, 400, { success: false, error: '请选择要操作的支出记录' });
      return;
    }
    
    if (!comment) {
      sendResponse(res, 400, { success: false, error: '请填写拒绝原因' });
      return;
    }
    
    console.log('批量拒绝支出记录，数量:', ids.length, '操作人:', user.id);
    
    // 检查所有记录是否可操作
    const placeholders = ids.map(() => '?').join(',');
    const [expenditures] = await pool.query(`
      SELECT * FROM \`ExpenditureRecord\` 
      WHERE id IN (${placeholders}) AND status IN ('submitted', 'under_review')
    `, ids);
    
    if (expenditures.length === 0) {
      sendResponse(res, 400, { success: false, error: '没有可操作的支出记录' });
      return;
    }
    
    let successCount = 0;
    const failedExpenditures = [];
    
    // 逐个处理支出记录
    for (const expenditure of expenditures) {
      try {
        // 更新支出记录状态
        await pool.query(
          'UPDATE `ExpenditureRecord` SET status = "rejected", reviewer_id = ?, review_date = CURDATE(), review_comment = ?, updated_at = NOW() WHERE id = ?',
          [user.id, comment, expenditure.id]
        );
        
        // 获取项目信息
        const [projectInfo] = await pool.query(`
          SELECT p.applicant_id, p.title 
          FROM \`Project\` p
          WHERE p.id = ?
        `, [expenditure.project_id]);
        
        if (projectInfo.length > 0) {
          const applicantId = projectInfo[0].applicant_id;
          const projectTitle = projectInfo[0].title;
          
          // 创建审核任务记录
          const taskId = generateUUID();
          await pool.query(`
            INSERT INTO \`AuditTask\` (
              id, task_type, title, description,
              applicant_id, project_id, related_table, related_id,
              priority, status, processed_by, processed_at,
              review_result, review_comment, created_at
            ) VALUES (?, 'expenditure_review', ?, ?, ?, ?, 'ExpenditureRecord', ?, 'medium', 'completed', ?, NOW(), 'rejected', ?, NOW())
          `, [
            taskId,
            `批量支出记录审核：${expenditure.expense_no}`,
            `科研助理批量审核支出记录"${expenditure.expense_no}"，项目：${projectTitle}`,
            applicantId,
            expenditure.project_id,
            expenditure.id,
            user.id,
            comment
          ]);
          
          // 创建通知
          const notificationId = generateUUID();
          await pool.query(`
            INSERT INTO \`Notification\` (
              id, user_id, type, title, content,
              related_id, related_type, priority,
              is_read, expires_at, created_at
            ) VALUES (?, ?, 'expenditure', ?, ?, ?, 'ExpenditureRecord', 'medium', FALSE, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())
          `, [
            notificationId,
            applicantId,
            '支出记录批量审核拒绝',
            `您的支出记录 ${expenditure.expense_no}（项目：${projectTitle}）批量审核结果为：拒绝`,
            expenditure.id
          ]);
        }
        
        successCount++;
        
      } catch (error) {
        console.error(`批量拒绝支出记录 ${expenditure.id} 失败:`, error);
        failedExpenditures.push({
          expenditure_id: expenditure.id,
          expense_no: expenditure.expense_no,
          error: error.message
        });
      }
    }
    
    // 记录操作日志
    await pool.query(`
      INSERT INTO \`AuditLog\` (user_id, action, table_name, new_values, created_at)
      VALUES (?, 'batch_expenditure_reject', 'ExpenditureRecord', ?, NOW())
    `, [user.id, JSON.stringify({
      ids,
      comment,
      successCount,
      failedCount: failedExpenditures.length,
      totalCount: expenditures.length
    })]);
    
    sendResponse(res, 200, {
      success: true,
      message: `批量拒绝完成，成功处理 ${successCount} 条支出记录`,
      data: {
        successCount,
        failedExpenditures,
        failedCount: failedExpenditures.length,
        totalCount: expenditures.length
      }
    });
    
  } catch (error) {
    console.error('批量拒绝支出记录失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '批量拒绝失败',
      message: error.message
    });
  }
  return;
}

// 获取支出记录统计数据
if (pathname === '/api/assistant/expenditures/stats' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('获取支出记录统计数据，用户ID:', user.id);
    
    // 获取基本统计数据
    const [basicStats] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as reviewing,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(amount) as total_amount,
        SUM(CASE WHEN status IN ('submitted', 'under_review') THEN amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_amount,
        SUM(CASE WHEN status = 'rejected' THEN amount ELSE 0 END) as rejected_amount,
        AVG(amount) as avg_amount
      FROM \`ExpenditureRecord\`
    `);
    
    // 获取按月份的统计
    const [monthlyStats] = await pool.query(`
      SELECT 
        DATE_FORMAT(expense_date, '%Y-%m') as month,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(amount) as total_amount,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_amount
      FROM \`ExpenditureRecord\`
      WHERE expense_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(expense_date, '%Y-%m')
      ORDER BY month DESC
    `);
    
    // 获取按类别的统计
    const [categoryStats] = await pool.query(`
      SELECT 
        category,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_amount,
        SUM(CASE WHEN status = 'rejected' THEN amount ELSE 0 END) as rejected_amount
      FROM \`ExpenditureRecord\`
      GROUP BY category
      ORDER BY total_amount DESC
    `);
    
    // 获取按项目的统计
    const [projectStats] = await pool.query(`
      SELECT 
        p.title as project_title,
        p.project_code,
        COUNT(er.id) as expenditure_count,
        SUM(er.amount) as total_amount,
        SUM(CASE WHEN er.status = 'approved' THEN er.amount ELSE 0 END) as approved_amount
      FROM \`ExpenditureRecord\` er
      LEFT JOIN \`Project\` p ON er.project_id = p.id
      GROUP BY er.project_id, p.title, p.project_code
      ORDER BY total_amount DESC
      LIMIT 10
    `);
    
    // 获取按申请人的统计
    const [applicantStats] = await pool.query(`
      SELECT 
        u.name as applicant_name,
        u.department,
        COUNT(er.id) as expenditure_count,
        SUM(er.amount) as total_amount,
        SUM(CASE WHEN er.status = 'approved' THEN er.amount ELSE 0 END) as approved_amount
      FROM \`ExpenditureRecord\` er
      LEFT JOIN \`Project\` p ON er.project_id = p.id
      LEFT JOIN \`User\` u ON p.applicant_id = u.id
      GROUP BY p.applicant_id, u.name, u.department
      ORDER BY total_amount DESC
      LIMIT 10
    `);
    
    const stats = {
      summary: {
        total: basicStats[0]?.total || 0,
        pending: basicStats[0]?.pending || 0,
        reviewing: basicStats[0]?.reviewing || 0,
        approved: basicStats[0]?.approved || 0,
        rejected: basicStats[0]?.rejected || 0,
        total_amount: parseFloat(basicStats[0]?.total_amount || 0),
        pending_amount: parseFloat(basicStats[0]?.pending_amount || 0),
        approved_amount: parseFloat(basicStats[0]?.approved_amount || 0),
        rejected_amount: parseFloat(basicStats[0]?.rejected_amount || 0),
        avg_amount: parseFloat(basicStats[0]?.avg_amount || 0)
      },
      by_month: monthlyStats.map(stat => ({
        month: stat.month,
        total: stat.total || 0,
        approved: stat.approved || 0,
        rejected: stat.rejected || 0,
        total_amount: parseFloat(stat.total_amount || 0),
        approved_amount: parseFloat(stat.approved_amount || 0)
      })),
      by_category: categoryStats.map(stat => ({
        category: stat.category,
        count: stat.count || 0,
        total_amount: parseFloat(stat.total_amount || 0),
        avg_amount: parseFloat(stat.avg_amount || 0),
        approved_amount: parseFloat(stat.approved_amount || 0),
        rejected_amount: parseFloat(stat.rejected_amount || 0)
      })),
      by_project: projectStats.map(stat => ({
        project_title: stat.project_title,
        project_code: stat.project_code,
        expenditure_count: stat.expenditure_count || 0,
        total_amount: parseFloat(stat.total_amount || 0),
        approved_amount: parseFloat(stat.approved_amount || 0)
      })),
      by_applicant: applicantStats.map(stat => ({
        applicant_name: stat.applicant_name,
        department: stat.department,
        expenditure_count: stat.expenditure_count || 0,
        total_amount: parseFloat(stat.total_amount || 0),
        approved_amount: parseFloat(stat.approved_amount || 0)
      }))
    };
    
    sendResponse(res, 200, {
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('获取支出记录统计数据失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取统计数据失败',
      message: error.message
    });
  }
  return;
}

// 导出支出记录数据
if (pathname === '/api/assistant/expenditures/export' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const query = url.parse(req.url, true).query;
    
    console.log('导出支出记录数据，用户ID:', user.id);
    
    // 构建基础查询条件（与列表查询一致）
    let whereClauses = [];
    let queryParams = [];
    
    // 按申请状态筛选
    if (query.status && query.status !== 'all') {
      const statuses = query.status.split(',');
      const placeholders = statuses.map(() => '?').join(',');
      whereClauses.push(`er.status IN (${placeholders})`);
      queryParams.push(...statuses);
    }
    
    // 按支出类别筛选
    if (query.category) {
      whereClauses.push('er.category = ?');
      queryParams.push(query.category);
    }
    
    // 关键词搜索
    if (query.search) {
      whereClauses.push('(er.expense_no LIKE ? OR p.title LIKE ? OR p.project_code LIKE ? OR u.name LIKE ? OR er.payee LIKE ? OR er.item_name LIKE ?)');
      const keyword = `%${query.search}%`;
      queryParams.push(keyword, keyword, keyword, keyword, keyword, keyword);
    }
    
    const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    
    // 获取所有符合条件的支出记录
    const [expenditures] = await pool.query(`
      SELECT 
        er.expense_no as '支出编号',
        p.project_code as '项目编号',
        p.title as '项目名称',
        p.category as '项目类别',
        u.name as '申请人',
        u.department as '申请人部门',
        er.category as '支出类别',
        er.item_name as '支出项目',
        er.amount as '支出金额(元)',
        er.expense_date as '支出日期',
        er.payee as '收款方',
        er.description as '支出说明',
        CASE er.status
          WHEN 'draft' THEN '草稿'
          WHEN 'submitted' THEN '待审核'
          WHEN 'under_review' THEN '审核中'
          WHEN 'approved' THEN '已批准'
          WHEN 'rejected' THEN '已拒绝'
          ELSE er.status
        END as '审核状态',
        ur.name as '审核人',
        er.review_date as '审核日期',
        er.review_comment as '审核意见',
        CASE WHEN er.funding_app_id IS NOT NULL THEN '是' ELSE '否' END as '是否关联经费申请'
      FROM \`ExpenditureRecord\` er
      LEFT JOIN \`Project\` p ON er.project_id = p.id
      LEFT JOIN \`User\` u ON p.applicant_id = u.id
      LEFT JOIN \`User\` ur ON er.reviewer_id = ur.id
      ${whereClause}
      ORDER BY er.expense_date DESC
    `, queryParams);
    
    sendResponse(res, 200, {
      success: true,
      data: expenditures,
      message: '导出数据准备完成'
    });
    
  } catch (error) {
    console.error('导出支出记录数据失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '导出失败',
      message: error.message
    });
  }
  return;
}

// ==================== 科研成果审核相关API ====================

// 获取科研成果列表
if (pathname === '/api/assistant/achievements/list' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const query = url.parse(req.url, true).query;
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    
    console.log('科研助理获取科研成果列表，用户ID:', user.id);
    
    // 构建基础查询条件
    let whereClauses = [];
    let queryParams = [];
    
    // 按审核状态筛选
    if (query.status && query.status !== 'all') {
      const statuses = query.status.split(',');
      const placeholders = statuses.map(() => '?').join(',');
      whereClauses.push(`pa.status IN (${placeholders})`);
      queryParams.push(...statuses);
    }
    
    // 按成果类型筛选
    if (query.type) {
      whereClauses.push('pa.type = ?');
      queryParams.push(query.type);
    }
    
    // 按成果年份筛选
    if (query.year) {
      whereClauses.push('YEAR(pa.achievement_date) = ?');
      queryParams.push(query.year);
    }
    
    // 关键词搜索
    if (query.search) {
      whereClauses.push('(pa.title LIKE ? OR pa.keywords LIKE ? OR p.title LIKE ? OR p.project_code LIKE ? OR u.name LIKE ?)');
      const keyword = `%${query.search}%`;
      queryParams.push(keyword, keyword, keyword, keyword, keyword);
    }
    
    const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    
    // 获取成果总数
    const [totalResult] = await pool.query(`
      SELECT COUNT(*) as total 
      FROM \`ProjectAchievement\` pa
      LEFT JOIN \`Project\` p ON pa.project_id = p.id
      LEFT JOIN \`User\` u ON pa.created_by = u.id
      ${whereClause}
    `, queryParams);
    
    const total = totalResult[0]?.total || 0;
    
    // 获取成果数据
    const [achievements] = await pool.query(`
      SELECT 
        pa.id,
        pa.project_id,
        pa.type,
        pa.title,
        pa.description,
        pa.keywords,
        pa.status,
        pa.achievement_date,
        pa.authors,
        pa.attachment_urls,
        pa.external_link,
        pa.verified_by,
        pa.verified_date,
        pa.verification_comment,
        
        p.title as project_title,
        p.project_code,
        p.category as project_category,
        
        u.id as creator_id,
        u.name as creator_name,
        u.department as creator_department,
        
        uv.name as verifier_name
      FROM \`ProjectAchievement\` pa
      LEFT JOIN \`Project\` p ON pa.project_id = p.id
      LEFT JOIN \`User\` u ON pa.created_by = u.id
      LEFT JOIN \`User\` uv ON pa.verified_by = uv.id
      ${whereClause}
      ORDER BY pa.achievement_date DESC, pa.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, pageSize, offset]);
    
    // 格式化数据
    const formattedAchievements = achievements.map(ach => ({
      id: ach.id,
      project_id: ach.project_id,
      type: ach.type,
      title: ach.title,
      description: ach.description,
      keywords: ach.keywords,
      status: ach.status,
      achievement_date: ach.achievement_date ? ach.achievement_date.toISOString().split('T')[0] : null,
      authors: ach.authors,
      attachment_urls: ach.attachment_urls ? JSON.parse(ach.attachment_urls) : [],
      external_link: ach.external_link,
      verified_by: ach.verified_by,
      verified_date: ach.verified_date ? ach.verified_date.toISOString().split('T')[0] : null,
      verification_comment: ach.verification_comment,
      published_date: ach.published_date ? ach.published_date.toISOString().split('T')[0] : null,
      publish_link: ach.publish_link,
      project_info: {
        id: ach.project_id,
        title: ach.project_title,
        project_code: ach.project_code,
        category: ach.project_category
      },
      creator_info: {
        id: ach.creator_id,
        name: ach.creator_name,
        department: ach.creator_department
      },
      verifier_info: ach.verifier_name ? {
        id: ach.verified_by,
        name: ach.verifier_name
      } : null
    }));
    
    // 获取统计数据
    const [statsResult] = await pool.query(`
      SELECT 
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as reviewing,
        SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM \`ProjectAchievement\`
    `);
    
    // 获取按类型统计
    const [typeStats] = await pool.query(`
      SELECT 
        SUM(CASE WHEN type = 'paper' THEN 1 ELSE 0 END) as paper,
        SUM(CASE WHEN type = 'patent' THEN 1 ELSE 0 END) as patent,
        SUM(CASE WHEN type = 'software' THEN 1 ELSE 0 END) as software,
        SUM(CASE WHEN type NOT IN ('paper', 'patent', 'software') THEN 1 ELSE 0 END) as others
      FROM \`ProjectAchievement\`
    `);
    
    const stats = {
      pending: statsResult[0]?.pending || 0,
      reviewing: statsResult[0]?.reviewing || 0,
      verified: statsResult[0]?.verified || 0,
      published: statsResult[0]?.published || 0,
      rejected: statsResult[0]?.rejected || 0,
      by_type: {
        paper: typeStats[0]?.paper || 0,
        patent: typeStats[0]?.patent || 0,
        software: typeStats[0]?.software || 0,
        others: typeStats[0]?.others || 0
      }
    };
    
    sendResponse(res, 200, {
      success: true,
      data: {
        list: formattedAchievements,
        pagination: {
          current: page,
          pageSize,
          total
        },
        stats
      }
    });
    
  } catch (error) {
    console.error('获取科研成果列表失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取科研成果列表失败',
      message: error.message
    });
  }
  return;
}

// 获取科研成果详情
if (pathname.startsWith('/api/assistant/achievements/') && 
    !pathname.includes('/review') && 
    !pathname.includes('/publish') && 
    !pathname.includes('/transfer') && 
    req.method === 'GET') {
  const match = pathname.match(/\/api\/assistant\/achievements\/(.+)/);
  if (!match) return;
  
  const achievementId = match[1];
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('获取科研成果详情，成果ID:', achievementId);
    
    // 获取成果基本信息
    const [achievements] = await pool.query(`
      SELECT 
        pa.*,
        p.title as project_title,
        p.project_code,
        p.category as project_category,
        p.status as project_status,
        p.budget_total as project_budget_total,
        
        u.id as creator_id,
        u.name as creator_name,
        u.department,
        u.email as creator_email,
        u.phone as creator_phone,
        
        uv.name as verifier_name,
        uv.email as verifier_email,
        
        (SELECT COUNT(*) FROM \`AchievementTransfer\` WHERE achievement_id = pa.id) as transfer_count
      FROM \`ProjectAchievement\` pa
      LEFT JOIN \`Project\` p ON pa.project_id = p.id
      LEFT JOIN \`User\` u ON pa.created_by = u.id
      LEFT JOIN \`User\` uv ON pa.verified_by = uv.id
      WHERE pa.id = ?
    `, [achievementId]);
    
    if (achievements.length === 0) {
      sendResponse(res, 404, { success: false, error: '科研成果不存在' });
      return;
    }
    
    const achievement = achievements[0];
    
    // 获取转化记录
    const [transferRecords] = await pool.query(`
      SELECT 
        id,
        transfer_type,
        transferee,
        transfer_date,
        contract_no,
        contract_amount,
        actual_amount,
        transfer_status,
        description,
        contract_file
      FROM \`AchievementTransfer\`
      WHERE achievement_id = ?
      ORDER BY transfer_date DESC
    `, [achievementId]);
    
    // 获取类似成果记录
    const [similarAchievements] = await pool.query(`
      SELECT 
        title,
        type,
        achievement_date,
        status
      FROM \`ProjectAchievement\`
      WHERE project_id = ? AND id != ?
      ORDER BY achievement_date DESC
      LIMIT 5
    `, [achievement.project_id, achievementId]);
    
    // 获取审核任务记录
    const [tasks] = await pool.query(`
      SELECT 
        id,
        task_type,
        title,
        description,
        priority,
        status,
        processed_at,
        review_result,
        review_comment,
        created_at
      FROM \`AuditTask\`
      WHERE related_table = 'ProjectAchievement' AND related_id = ?
      ORDER BY created_at DESC
    `, [achievementId]);
    
    sendResponse(res, 200, {
      success: true,
      data: {
        achievement: {
          id: achievement.id,
          project_id: achievement.project_id,
          type: achievement.type,
          title: achievement.title,
          description: achievement.description,
          keywords: achievement.keywords,
          status: achievement.status,
          achievement_date: achievement.achievement_date ? achievement.achievement_date.toISOString().split('T')[0] : null,
          authors: achievement.authors ? JSON.parse(achievement.authors) : [],
          attachment_urls: achievement.attachment_urls ? JSON.parse(achievement.attachment_urls) : [],
          external_link: achievement.external_link,
          verified_by: achievement.verified_by,
          verified_date: achievement.verified_date ? achievement.verified_date.toISOString().split('T')[0] : null,
          verification_comment: achievement.verification_comment,
          published_date: achievement.published_date ? achievement.published_date.toISOString().split('T')[0] : null,
          publish_link: achievement.publish_link,
          transfer_count: achievement.transfer_count || 0,
          created_at: achievement.created_at ? achievement.created_at.toISOString() : null,
          
          project_info: {
            id: achievement.project_id,
            title: achievement.project_title,
            project_code: achievement.project_code,
            category: achievement.project_category,
            status: achievement.project_status,
            budget_total: parseFloat(achievement.project_budget_total)
          },
          
          creator_info: {
            id: achievement.creator_id,
            name: achievement.creator_name,
            department: achievement.department,
            email: achievement.creator_email,
            phone: achievement.creator_phone
          },
          
          verifier_info: achievement.verifier_name ? {
            id: achievement.verified_by,
            name: achievement.verifier_name,
            email: achievement.verifier_email
          } : null
        },
        transfer_records: transferRecords.map(transfer => ({
          id: transfer.id,
          transfer_type: transfer.transfer_type,
          transferee: transfer.transferee,
          transfer_date: transfer.transfer_date ? transfer.transfer_date.toISOString().split('T')[0] : null,
          contract_no: transfer.contract_no,
          contract_amount: parseFloat(transfer.contract_amount),
          actual_amount: parseFloat(transfer.actual_amount),
          transfer_status: transfer.transfer_status,
          description: transfer.description,
          contract_file: transfer.contract_file
        })),
        similar_achievements: similarAchievements.map(ach => ({
          title: ach.title,
          type: ach.type,
          achievement_date: ach.achievement_date ? ach.achievement_date.toISOString().split('T')[0] : null,
          status: ach.status
        })),
        tasks: tasks.map(task => ({
          id: task.id,
          task_type: task.task_type,
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          processed_at: task.processed_at ? task.processed_at.toISOString() : null,
          review_result: task.review_result,
          review_comment: task.review_comment,
          created_at: task.created_at ? task.created_at.toISOString() : null
        }))
      }
    });
    
  } catch (error) {
    console.error('获取科研成果详情失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取科研成果详情失败',
      message: error.message
    });
  }
  return;
}

// 审核科研成果
if (pathname.startsWith('/api/assistant/achievements/') && pathname.includes('/review') && req.method === 'POST') {
  const match = pathname.match(/\/api\/assistant\/achievements\/(.+)\/review/);
  if (!match) return;
  
  const achievementId = match[1];
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    const { recommendation, comment } = body;
    
    if (!recommendation) {
      sendResponse(res, 400, { success: false, error: '请选择审核结果' });
      return;
    }
    
    if (!comment) {
      sendResponse(res, 400, { success: false, error: '请填写审核意见' });
      return;
    }
    
    console.log('审核科研成果，成果ID:', achievementId, '操作人:', user.id, '审核结果:', recommendation);
    
    // 检查成果状态
    const [achievements] = await pool.query(
      'SELECT * FROM `ProjectAchievement` WHERE id = ? AND status IN ("submitted", "under_review")',
      [achievementId]
    );
    
    if (achievements.length === 0) {
      sendResponse(res, 400, { 
        success: false, 
        error: '科研成果不存在或不能审核' 
      });
      return;
    }
    
    const achievement = achievements[0];
    
    // 确定新状态
    let newStatus = '';
    if (recommendation === 'verify') {
      newStatus = 'verified';
    } else if (recommendation === 'reject') {
      newStatus = 'rejected';
    } else if (recommendation === 'return') {
      newStatus = 'returned';
    } else {
      sendResponse(res, 400, { success: false, error: '无效的审核结果' });
      return;
    }
    
    // 更新成果状态
    await pool.query(
      'UPDATE `ProjectAchievement` SET status = ?, verified_by = ?, verified_date = CURDATE(), verification_comment = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, user.id, comment, achievementId]
    );
    
    // 获取项目信息用于创建通知
    const [projectInfo] = await pool.query(`
      SELECT p.applicant_id, p.title 
      FROM \`Project\` p
      WHERE p.id = ?
    `, [achievement.project_id]);
    
    if (projectInfo.length > 0) {
      const applicantId = projectInfo[0].applicant_id;
      const projectTitle = projectInfo[0].title;
      
      // 创建审核任务记录
      const taskId = generateUUID();
      await pool.query(`
        INSERT INTO \`AuditTask\` (
          id, task_type, title, description,
          applicant_id, project_id, related_table, related_id,
          priority, status, processed_by, processed_at,
          review_result, review_comment, created_at
        ) VALUES (?, 'achievement_review', ?, ?, ?, ?, 'ProjectAchievement', ?, 'medium', 'completed', ?, NOW(), ?, ?, NOW())
      `, [
        taskId,
        `科研成果审核：${achievement.title}`,
        `科研助理审核科研成果"${achievement.title}"，项目：${projectTitle}`,
        applicantId,
        achievement.project_id,
        achievementId,
        user.id,
        newStatus,
        comment
      ]);
      
      // 创建通知
      const notificationId = generateUUID();
      let notificationTitle = '';
      let notificationContent = '';
      
      if (newStatus === 'verified') {
        notificationTitle = '科研成果审核通过';
        notificationContent = `您的科研成果"${achievement.title}"（项目：${projectTitle}）已通过审核并核实`;
      } else if (newStatus === 'rejected') {
        notificationTitle = '科研成果审核驳回';
        notificationContent = `您的科研成果"${achievement.title}"（项目：${projectTitle}）审核结果为：驳回，请查看审核意见`;
      } else if (newStatus === 'returned') {
        notificationTitle = '科研成果需要补充';
        notificationContent = `您的科研成果"${achievement.title}"（项目：${projectTitle}）需要补充材料后才能继续审核`;
      }
      
      await pool.query(`
        INSERT INTO \`Notification\` (
          id, user_id, type, title, content,
          related_id, related_type, priority,
          is_read, expires_at, created_at
        ) VALUES (?, ?, 'achievement', ?, ?, ?, 'ProjectAchievement', 'high', FALSE, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())
      `, [
        notificationId,
        applicantId,
        notificationTitle,
        notificationContent,
        achievementId
      ]);
    }
    
    // 记录操作日志
    await pool.query(`
      INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, new_values, created_at)
      VALUES (?, 'achievement_review', 'ProjectAchievement', ?, ?, NOW())
    `, [user.id, achievementId, JSON.stringify({ 
      status: newStatus, 
      recommendation,
      comment,
      reviewer_id: user.id
    })]);
    
    sendResponse(res, 200, {
      success: true,
      message: `科研成果审核${newStatus === 'verified' ? '通过' : newStatus === 'rejected' ? '驳回' : '退回补充'}成功`,
      data: { 
        achievementId, 
        status: newStatus,
        taskId: taskId || null
      }
    });
    
  } catch (error) {
    console.error('审核科研成果失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '审核科研成果失败',
      message: error.message
    });
  }
  return;
}

// 发布科研成果
if (pathname.startsWith('/api/assistant/achievements/') && pathname.includes('/publish') && req.method === 'POST') {
  const match = pathname.match(/\/api\/assistant\/achievements\/(.+)\/publish/);
  if (!match) return;
  
  const achievementId = match[1];
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    const { publish_link, publish_date, remark } = body;
    
    if (!publish_link) {
      sendResponse(res, 400, { success: false, error: '请填写发布链接' });
      return;
    }
    
    console.log('发布科研成果，成果ID:', achievementId, '操作人:', user.id);
    
    // 检查成果状态
    const [achievements] = await pool.query(
      'SELECT * FROM `ProjectAchievement` WHERE id = ? AND status = "verified"',
      [achievementId]
    );
    
    if (achievements.length === 0) {
      sendResponse(res, 400, { 
        success: false, 
        error: '科研成果不存在或未核实，不能发布' 
      });
      return;
    }
    
    const achievement = achievements[0];
    
    // 更新成果状态
    const publishDate = publish_date || new Date().toISOString().split('T')[0];
    await pool.query(
      'UPDATE `ProjectAchievement` SET status = "published", publish_link = ?, published_date = ?, updated_at = NOW() WHERE id = ?',
      [publish_link, publishDate, achievementId]
    );
    
    // 获取项目信息
    const [projectInfo] = await pool.query(`
      SELECT p.applicant_id, p.title 
      FROM \`Project\` p
      WHERE p.id = ?
    `, [achievement.project_id]);
    
    if (projectInfo.length > 0) {
      const applicantId = projectInfo[0].applicant_id;
      const projectTitle = projectInfo[0].title;
      
      // 创建审核任务记录
      const taskId = generateUUID();
      await pool.query(`
        INSERT INTO \`AuditTask\` (
          id, task_type, title, description,
          applicant_id, project_id, related_table, related_id,
          priority, status, processed_by, processed_at,
          review_result, review_comment, created_at
        ) VALUES (?, 'achievement_publish', ?, ?, ?, ?, 'ProjectAchievement', ?, 'medium', 'completed', ?, NOW(), 'published', ?, NOW())
      `, [
        taskId,
        `科研成果发布：${achievement.title}`,
        `科研助理发布科研成果"${achievement.title}"，项目：${projectTitle}`,
        applicantId,
        achievement.project_id,
        achievementId,
        user.id,
        remark || `发布链接：${publish_link}`
      ]);
      
      // 创建通知
      const notificationId = generateUUID();
      await pool.query(`
        INSERT INTO \`Notification\` (
          id, user_id, type, title, content,
          related_id, related_type, priority,
          is_read, expires_at, created_at
        ) VALUES (?, ?, 'achievement', ?, ?, ?, 'ProjectAchievement', 'high', FALSE, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())
      `, [
        notificationId,
        applicantId,
        '科研成果已发布',
        `您的科研成果"${achievement.title}"（项目：${projectTitle}）已正式发布`,
        achievementId
      ]);
    }
    
    // 记录操作日志
    await pool.query(`
      INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, new_values, created_at)
      VALUES (?, 'achievement_publish', 'ProjectAchievement', ?, ?, NOW())
    `, [user.id, achievementId, JSON.stringify({ 
      status: 'published', 
      publish_link,
      publish_date: publishDate,
      remark: remark || '',
      published_by: user.id
    })]);
    
    sendResponse(res, 200, {
      success: true,
      message: '科研成果发布成功',
      data: { 
        achievementId, 
        status: 'published',
        publish_link,
        publish_date: publishDate,
        taskId: taskId || null
      }
    });
    
  } catch (error) {
    console.error('发布科研成果失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '发布科研成果失败',
      message: error.message
    });
  }
  return;
}

// 创建成果转化记录
if (pathname.startsWith('/api/assistant/achievements/') && pathname.includes('/transfer') && req.method === 'POST') {
  const match = pathname.match(/\/api\/assistant\/achievements\/(.+)\/transfer/);
  if (!match) return;
  
  const achievementId = match[1];
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    const { 
      transfer_type, 
      transferee, 
      transfer_date, 
      contract_no, 
      contract_amount, 
      actual_amount, 
      transfer_status, 
      description 
    } = body;
    
    // 验证必填字段
    if (!transfer_type || !transferee || !transfer_date || !transfer_status) {
      sendResponse(res, 400, { success: false, error: '请填写完整的转化信息' });
      return;
    }
    
    console.log('创建成果转化记录，成果ID:', achievementId, '操作人:', user.id);
    
    // 检查成果状态
    const [achievements] = await pool.query(
      'SELECT * FROM `ProjectAchievement` WHERE id = ? AND status IN ("verified", "published")',
      [achievementId]
    );
    
    if (achievements.length === 0) {
      sendResponse(res, 400, { 
        success: false, 
        error: '科研成果不存在或不能创建转化记录' 
      });
      return;
    }
    
    const achievement = achievements[0];
    
    // 创建转化记录
    const transferId = generateUUID();
    await pool.query(`
      INSERT INTO \`AchievementTransfer\` (
        id, achievement_id, transfer_type, transferee, transfer_date,
        contract_no, contract_amount, actual_amount, transfer_status,
        description, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      transferId,
      achievementId,
      transfer_type,
      transferee,
      transfer_date,
      contract_no || null,
      contract_amount || 0,
      actual_amount || 0,
      transfer_status,
      description || '',
      user.id
    ]);
    
    // 如果这是第一项转化记录，更新成果状态
    const [transferCount] = await pool.query(
      'SELECT COUNT(*) as count FROM `AchievementTransfer` WHERE achievement_id = ?',
      [achievementId]
    );
    
    if (transferCount[0]?.count === 1) {
      await pool.query(
        'UPDATE `ProjectAchievement` SET status = "transferred", updated_at = NOW() WHERE id = ?',
        [achievementId]
      );
    }
    
    // 获取项目信息
    const [projectInfo] = await pool.query(`
      SELECT p.applicant_id, p.title 
      FROM \`Project\` p
      WHERE p.id = ?
    `, [achievement.project_id]);
    
    if (projectInfo.length > 0) {
      const applicantId = projectInfo[0].applicant_id;
      const projectTitle = projectInfo[0].title;
      
      // 创建审核任务记录
      const taskId = generateUUID();
      await pool.query(`
        INSERT INTO \`AuditTask\` (
          id, task_type, title, description,
          applicant_id, project_id, related_table, related_id,
          priority, status, processed_by, processed_at,
          review_result, review_comment, created_at
        ) VALUES (?, 'achievement_transfer', ?, ?, ?, ?, 'AchievementTransfer', ?, 'medium', 'completed', ?, NOW(), 'created', ?, NOW())
      `, [
        taskId,
        `成果转化记录：${achievement.title}`,
        `科研助理创建成果转化记录"${achievement.title}"，项目：${projectTitle}`,
        applicantId,
        achievement.project_id,
        transferId,
        user.id,
        `转化类型：${transfer_type}，受让方：${transferee}`
      ]);
      
      // 创建通知
      const notificationId = generateUUID();
      await pool.query(`
        INSERT INTO \`Notification\` (
          id, user_id, type, title, content,
          related_id, related_type, priority,
          is_read, expires_at, created_at
        ) VALUES (?, ?, 'achievement', ?, ?, ?, 'AchievementTransfer', 'medium', FALSE, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())
      `, [
        notificationId,
        applicantId,
        '成果转化记录创建',
        `您的科研成果"${achievement.title}"（项目：${projectTitle}）已创建转化记录`,
        transferId
      ]);
    }
    
    // 记录操作日志
    await pool.query(`
      INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, new_values, created_at)
      VALUES (?, 'achievement_transfer_create', 'AchievementTransfer', ?, ?, NOW())
    `, [user.id, transferId, JSON.stringify({ 
      achievement_id: achievementId,
      transfer_type,
      transferee,
      transfer_date,
      contract_no: contract_no || null,
      contract_amount: contract_amount || 0,
      actual_amount: actual_amount || 0,
      transfer_status,
      description: description || ''
    })]);
    
    sendResponse(res, 200, {
      success: true,
      message: '成果转化记录创建成功',
      data: { 
        achievementId, 
        transferId,
        status: transferCount[0]?.count === 1 ? 'transferred' : achievement.status
      }
    });
    
  } catch (error) {
    console.error('创建成果转化记录失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '创建成果转化记录失败',
      message: error.message
    });
  }
  return;
}

// 批量核实科研成果
if (pathname === '/api/assistant/achievements/batch-verify' && req.method === 'POST') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    const { ids, comment } = body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      sendResponse(res, 400, { success: false, error: '请选择要操作的科研成果' });
      return;
    }
    
    console.log('批量核实科研成果，数量:', ids.length, '操作人:', user.id);
    
    // 检查所有成果是否可操作
    const placeholders = ids.map(() => '?').join(',');
    const [achievements] = await pool.query(`
      SELECT * FROM \`ProjectAchievement\` 
      WHERE id IN (${placeholders}) AND status IN ('submitted', 'under_review')
    `, ids);
    
    if (achievements.length === 0) {
      sendResponse(res, 400, { success: false, error: '没有可操作的科研成果' });
      return;
    }
    
    let successCount = 0;
    const failedAchievements = [];
    
    // 逐个处理成果
    for (const achievement of achievements) {
      try {
        // 更新成果状态
        await pool.query(
          'UPDATE `ProjectAchievement` SET status = "verified", verified_by = ?, verified_date = CURDATE(), verification_comment = ?, updated_at = NOW() WHERE id = ?',
          [user.id, comment || '批量核实通过', achievement.id]
        );
        
        // 获取项目信息
        const [projectInfo] = await pool.query(`
          SELECT p.applicant_id, p.title 
          FROM \`Project\` p
          WHERE p.id = ?
        `, [achievement.project_id]);
        
        if (projectInfo.length > 0) {
          const applicantId = projectInfo[0].applicant_id;
          const projectTitle = projectInfo[0].title;
          
          // 创建审核任务记录
          const taskId = generateUUID();
          await pool.query(`
            INSERT INTO \`AuditTask\` (
              id, task_type, title, description,
              applicant_id, project_id, related_table, related_id,
              priority, status, processed_by, processed_at,
              review_result, review_comment, created_at
            ) VALUES (?, 'achievement_review', ?, ?, ?, ?, 'ProjectAchievement', ?, 'medium', 'completed', ?, NOW(), 'verified', ?, NOW())
          `, [
            taskId,
            `批量科研成果审核：${achievement.title}`,
            `科研助理批量审核科研成果"${achievement.title}"，项目：${projectTitle}`,
            applicantId,
            achievement.project_id,
            achievement.id,
            user.id,
            comment || '批量核实通过'
          ]);
          
          // 创建通知
          const notificationId = generateUUID();
          await pool.query(`
            INSERT INTO \`Notification\` (
              id, user_id, type, title, content,
              related_id, related_type, priority,
              is_read, expires_at, created_at
            ) VALUES (?, ?, 'achievement', ?, ?, ?, 'ProjectAchievement', 'medium', FALSE, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())
          `, [
            notificationId,
            applicantId,
            '科研成果批量审核通过',
            `您的科研成果"${achievement.title}"（项目：${projectTitle}）已通过批量审核并核实`,
            achievement.id
          ]);
        }
        
        successCount++;
        
      } catch (error) {
        console.error(`批量核实科研成果 ${achievement.id} 失败:`, error);
        failedAchievements.push({
          achievement_id: achievement.id,
          title: achievement.title,
          error: error.message
        });
      }
    }
    
    // 记录操作日志
    await pool.query(`
      INSERT INTO \`AuditLog\` (user_id, action, table_name, new_values, created_at)
      VALUES (?, 'batch_achievement_verify', 'ProjectAchievement', ?, NOW())
    `, [user.id, JSON.stringify({
      ids,
      comment,
      successCount,
      failedCount: failedAchievements.length,
      totalCount: achievements.length
    })]);
    
    sendResponse(res, 200, {
      success: true,
      message: `批量核实完成，成功处理 ${successCount} 项科研成果`,
      data: {
        successCount,
        failedAchievements,
        failedCount: failedAchievements.length,
        totalCount: achievements.length
      }
    });
    
  } catch (error) {
    console.error('批量核实科研成果失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '批量核实失败',
      message: error.message
    });
  }
  return;
}

// 批量驳回科研成果
if (pathname === '/api/assistant/achievements/batch-reject' && req.method === 'POST') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    const { ids, comment } = body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      sendResponse(res, 400, { success: false, error: '请选择要操作的科研成果' });
      return;
    }
    
    if (!comment) {
      sendResponse(res, 400, { success: false, error: '请填写驳回原因' });
      return;
    }
    
    console.log('批量驳回科研成果，数量:', ids.length, '操作人:', user.id);
    
    // 检查所有成果是否可操作
    const placeholders = ids.map(() => '?').join(',');
    const [achievements] = await pool.query(`
      SELECT * FROM \`ProjectAchievement\` 
      WHERE id IN (${placeholders}) AND status IN ('submitted', 'under_review')
    `, ids);
    
    if (achievements.length === 0) {
      sendResponse(res, 400, { success: false, error: '没有可操作的科研成果' });
      return;
    }
    
    let successCount = 0;
    const failedAchievements = [];
    
    // 逐个处理成果
    for (const achievement of achievements) {
      try {
        // 更新成果状态
        await pool.query(
          'UPDATE `ProjectAchievement` SET status = "rejected", verified_by = ?, verified_date = CURDATE(), verification_comment = ?, updated_at = NOW() WHERE id = ?',
          [user.id, comment, achievement.id]
        );
        
        // 获取项目信息
        const [projectInfo] = await pool.query(`
          SELECT p.applicant_id, p.title 
          FROM \`Project\` p
          WHERE p.id = ?
        `, [achievement.project_id]);
        
        if (projectInfo.length > 0) {
          const applicantId = projectInfo[0].applicant_id;
          const projectTitle = projectInfo[0].title;
          
          // 创建审核任务记录
          const taskId = generateUUID();
          await pool.query(`
            INSERT INTO \`AuditTask\` (
              id, task_type, title, description,
              applicant_id, project_id, related_table, related_id,
              priority, status, processed_by, processed_at,
              review_result, review_comment, created_at
            ) VALUES (?, 'achievement_review', ?, ?, ?, ?, 'ProjectAchievement', ?, 'medium', 'completed', ?, NOW(), 'rejected', ?, NOW())
          `, [
            taskId,
            `批量科研成果审核：${achievement.title}`,
            `科研助理批量审核科研成果"${achievement.title}"，项目：${projectTitle}`,
            applicantId,
            achievement.project_id,
            achievement.id,
            user.id,
            comment
          ]);
          
          // 创建通知
          const notificationId = generateUUID();
          await pool.query(`
            INSERT INTO \`Notification\` (
              id, user_id, type, title, content,
              related_id, related_type, priority,
              is_read, expires_at, created_at
            ) VALUES (?, ?, 'achievement', ?, ?, ?, 'ProjectAchievement', 'medium', FALSE, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())
          `, [
            notificationId,
            applicantId,
            '科研成果批量审核驳回',
            `您的科研成果"${achievement.title}"（项目：${projectTitle}）批量审核结果为：驳回`,
            achievement.id
          ]);
        }
        
        successCount++;
        
      } catch (error) {
        console.error(`批量驳回科研成果 ${achievement.id} 失败:`, error);
        failedAchievements.push({
          achievement_id: achievement.id,
          title: achievement.title,
          error: error.message
        });
      }
    }
    
    // 记录操作日志
    await pool.query(`
      INSERT INTO \`AuditLog\` (user_id, action, table_name, new_values, created_at)
      VALUES (?, 'batch_achievement_reject', 'ProjectAchievement', ?, NOW())
    `, [user.id, JSON.stringify({
      ids,
      comment,
      successCount,
      failedCount: failedAchievements.length,
      totalCount: achievements.length
    })]);
    
    sendResponse(res, 200, {
      success: true,
      message: `批量驳回完成，成功处理 ${successCount} 项科研成果`,
      data: {
        successCount,
        failedAchievements,
        failedCount: failedAchievements.length,
        totalCount: achievements.length
      }
    });
    
  } catch (error) {
    console.error('批量驳回科研成果失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '批量驳回失败',
      message: error.message
    });
  }
  return;
}

// 批量发布科研成果
if (pathname === '/api/assistant/achievements/batch-publish' && req.method === 'POST') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    const { ids } = body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      sendResponse(res, 400, { success: false, error: '请选择要操作的科研成果' });
      return;
    }
    
    console.log('批量发布科研成果，数量:', ids.length, '操作人:', user.id);
    
    // 检查所有成果是否可操作
    const placeholders = ids.map(() => '?').join(',');
    const [achievements] = await pool.query(`
      SELECT * FROM \`ProjectAchievement\` 
      WHERE id IN (${placeholders}) AND status = 'verified'
    `, ids);
    
    if (achievements.length === 0) {
      sendResponse(res, 400, { success: false, error: '没有可发布的科研成果' });
      return;
    }
    
    let successCount = 0;
    const failedAchievements = [];
    const publishDate = new Date().toISOString().split('T')[0];
    
    // 逐个处理成果
    for (const achievement of achievements) {
      try {
        // 生成默认发布链接
        const publishLink = `https://research-system.example.com/achievements/${achievement.id}`;
        
        // 更新成果状态
        await pool.query(
          'UPDATE `ProjectAchievement` SET status = "published", publish_link = ?, published_date = ?, updated_at = NOW() WHERE id = ?',
          [publishLink, publishDate, achievement.id]
        );
        
        // 获取项目信息
        const [projectInfo] = await pool.query(`
          SELECT p.applicant_id, p.title 
          FROM \`Project\` p
          WHERE p.id = ?
        `, [achievement.project_id]);
        
        if (projectInfo.length > 0) {
          const applicantId = projectInfo[0].applicant_id;
          const projectTitle = projectInfo[0].title;
          
          // 创建审核任务记录
          const taskId = generateUUID();
          await pool.query(`
            INSERT INTO \`AuditTask\` (
              id, task_type, title, description,
              applicant_id, project_id, related_table, related_id,
              priority, status, processed_by, processed_at,
              review_result, review_comment, created_at
            ) VALUES (?, 'achievement_publish', ?, ?, ?, ?, 'ProjectAchievement', ?, 'medium', 'completed', ?, NOW(), 'published', ?, NOW())
          `, [
            taskId,
            `批量科研成果发布：${achievement.title}`,
            `科研助理批量发布科研成果"${achievement.title}"，项目：${projectTitle}`,
            applicantId,
            achievement.project_id,
            achievement.id,
            user.id,
            `批量发布，发布链接：${publishLink}`
          ]);
          
          // 创建通知
          const notificationId = generateUUID();
          await pool.query(`
            INSERT INTO \`Notification\` (
              id, user_id, type, title, content,
              related_id, related_type, priority,
              is_read, expires_at, created_at
            ) VALUES (?, ?, 'achievement', ?, ?, ?, 'ProjectAchievement', 'medium', FALSE, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())
          `, [
            notificationId,
            applicantId,
            '科研成果批量发布',
            `您的科研成果"${achievement.title}"（项目：${projectTitle}）已批量发布`,
            achievement.id
          ]);
        }
        
        successCount++;
        
      } catch (error) {
        console.error(`批量发布科研成果 ${achievement.id} 失败:`, error);
        failedAchievements.push({
          achievement_id: achievement.id,
          title: achievement.title,
          error: error.message
        });
      }
    }
    
    // 记录操作日志
    await pool.query(`
      INSERT INTO \`AuditLog\` (user_id, action, table_name, new_values, created_at)
      VALUES (?, 'batch_achievement_publish', 'ProjectAchievement', ?, NOW())
    `, [user.id, JSON.stringify({
      ids,
      successCount,
      failedCount: failedAchievements.length,
      totalCount: achievements.length
    })]);
    
    sendResponse(res, 200, {
      success: true,
      message: `批量发布完成，成功处理 ${successCount} 项科研成果`,
      data: {
        successCount,
        failedAchievements,
        failedCount: failedAchievements.length,
        totalCount: achievements.length
      }
    });
    
  } catch (error) {
    console.error('批量发布科研成果失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '批量发布失败',
      message: error.message
    });
  }
  return;
}

// 获取科研成果统计数据
if (pathname === '/api/assistant/achievements/stats' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('获取科研成果统计数据，用户ID:', user.id);
    
    // 获取基本统计数据
    const [basicStats] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as reviewing,
        SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
        SUM(CASE WHEN status = 'transferred' THEN 1 ELSE 0 END) as transferred,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM \`ProjectAchievement\`
    `);
    
    // 获取按类型的统计
    const [typeStats] = await pool.query(`
      SELECT 
        type,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published_count,
        SUM(CASE WHEN status = 'transferred' THEN 1 ELSE 0 END) as transferred_count
      FROM \`ProjectAchievement\`
      GROUP BY type
      ORDER BY count DESC
    `);
    
    // 获取按月份的统计
    const [monthlyStats] = await pool.query(`
      SELECT 
        DATE_FORMAT(achievement_date, '%Y-%m') as month,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published
      FROM \`ProjectAchievement\`
      WHERE achievement_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(achievement_date, '%Y-%m')
      ORDER BY month DESC
    `);
    
    // 获取按项目的统计
    const [projectStats] = await pool.query(`
      SELECT 
        p.title as project_title,
        p.project_code,
        COUNT(pa.id) as achievement_count,
        SUM(CASE WHEN pa.status = 'published' THEN 1 ELSE 0 END) as published_count,
        SUM(CASE WHEN pa.status = 'transferred' THEN 1 ELSE 0 END) as transferred_count
      FROM \`ProjectAchievement\` pa
      LEFT JOIN \`Project\` p ON pa.project_id = p.id
      GROUP BY pa.project_id, p.title, p.project_code
      ORDER BY achievement_count DESC
      LIMIT 10
    `);
    
    // 获取转化统计
    const [transferStats] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(contract_amount) as total_contract_amount,
        SUM(actual_amount) as total_actual_amount,
        AVG(contract_amount) as avg_contract_amount,
        AVG(actual_amount) as avg_actual_amount
      FROM \`AchievementTransfer\`
    `);
    
    const stats = {
      summary: {
        total: basicStats[0]?.total || 0,
        pending: basicStats[0]?.pending || 0,
        reviewing: basicStats[0]?.reviewing || 0,
        verified: basicStats[0]?.verified || 0,
        published: basicStats[0]?.published || 0,
        transferred: basicStats[0]?.transferred || 0,
        rejected: basicStats[0]?.rejected || 0
      },
      by_type: typeStats.map(stat => ({
        type: stat.type,
        count: stat.count || 0,
        published_count: stat.published_count || 0,
        transferred_count: stat.transferred_count || 0
      })),
      by_month: monthlyStats.map(stat => ({
        month: stat.month,
        total: stat.total || 0,
        verified: stat.verified || 0,
        published: stat.published || 0
      })),
      by_project: projectStats.map(stat => ({
        project_title: stat.project_title,
        project_code: stat.project_code,
        achievement_count: stat.achievement_count || 0,
        published_count: stat.published_count || 0,
        transferred_count: stat.transferred_count || 0
      })),
      transfer_summary: {
        total: transferStats[0]?.total || 0,
        total_contract_amount: parseFloat(transferStats[0]?.total_contract_amount || 0),
        total_actual_amount: parseFloat(transferStats[0]?.total_actual_amount || 0),
        avg_contract_amount: parseFloat(transferStats[0]?.avg_contract_amount || 0),
        avg_actual_amount: parseFloat(transferStats[0]?.avg_actual_amount || 0)
      }
    };
    
    sendResponse(res, 200, {
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('获取科研成果统计数据失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取统计数据失败',
      message: error.message
    });
  }
  return;
}

// 导出科研成果数据
if (pathname === '/api/assistant/achievements/export' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || (user.role !== 'assistant' && user.role !== 'admin')) {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const query = url.parse(req.url, true).query;
    
    console.log('导出科研成果数据，用户ID:', user.id);
    
    // 构建基础查询条件（与列表查询一致）
    let whereClauses = [];
    let queryParams = [];
    
    // 按审核状态筛选
    if (query.status && query.status !== 'all') {
      const statuses = query.status.split(',');
      const placeholders = statuses.map(() => '?').join(',');
      whereClauses.push(`pa.status IN (${placeholders})`);
      queryParams.push(...statuses);
    }
    
    // 按成果类型筛选
    if (query.type) {
      whereClauses.push('pa.type = ?');
      queryParams.push(query.type);
    }
    
    // 按成果年份筛选
    if (query.year) {
      whereClauses.push('YEAR(pa.achievement_date) = ?');
      queryParams.push(query.year);
    }
    
    // 关键词搜索
    if (query.search) {
      whereClauses.push('(pa.title LIKE ? OR pa.keywords LIKE ? OR p.title LIKE ? OR p.project_code LIKE ? OR u.name LIKE ?)');
      const keyword = `%${query.search}%`;
      queryParams.push(keyword, keyword, keyword, keyword, keyword);
    }
    
    const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    
    // 获取所有符合条件的成果
    const [achievements] = await pool.query(`
      SELECT 
        pa.title as '成果标题',
        CASE pa.type
          WHEN 'paper' THEN '论文'
          WHEN 'patent' THEN '专利'
          WHEN 'software' THEN '软件著作权'
          WHEN 'report' THEN '研究报告'
          WHEN 'prototype' THEN '原型样机'
          WHEN 'standard' THEN '技术标准'
          ELSE '其他'
        END as '成果类型',
        p.project_code as '项目编号',
        p.title as '项目名称',
        pa.keywords as '关键词',
        pa.achievement_date as '成果日期',
        CASE pa.status
          WHEN 'draft' THEN '草稿'
          WHEN 'submitted' THEN '待审核'
          WHEN 'under_review' THEN '审核中'
          WHEN 'verified' THEN '已核实'
          WHEN 'published' THEN '已发布'
          WHEN 'transferred' THEN '已转化'
          WHEN 'rejected' THEN '已驳回'
          ELSE pa.status
        END as '审核状态',
        u.name as '创建人',
        u.department as '创建人部门',
        uv.name as '审核人',
        pa.verified_date as '核实日期',
        pa.verification_comment as '审核意见',
        pa.publish_link as '发布链接',
        pa.published_date as '发布日期',
        (SELECT COUNT(*) FROM \`AchievementTransfer\` WHERE achievement_id = pa.id) as '转化记录数量'
      FROM \`ProjectAchievement\` pa
      LEFT JOIN \`Project\` p ON pa.project_id = p.id
      LEFT JOIN \`User\` u ON pa.created_by = u.id
      LEFT JOIN \`User\` uv ON pa.verified_by = uv.id
      ${whereClause}
      ORDER BY pa.achievement_date DESC
    `, queryParams);
    
    sendResponse(res, 200, {
      success: true,
      data: achievements,
      message: '导出数据准备完成'
    });
    
  } catch (error) {
    console.error('导出科研成果数据失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '导出失败',
      message: error.message
    });
  }
  return;
}

// ==================== 科研助理用户管理API ====================

// 获取用户列表
if (pathname === '/api/assistant/users' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'assistant') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const query = url.parse(req.url, true).query;
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    
    console.log('获取用户列表，助理ID:', user.id);
    
    // 构建查询条件
    let whereClauses = ['1=1'];
    let queryParams = [];
    
    // 关键词搜索
    if (query.keyword) {
      whereClauses.push('(username LIKE ? OR name LIKE ? OR email LIKE ? OR department LIKE ?)');
      const keyword = `%${query.keyword}%`;
      queryParams.push(keyword, keyword, keyword, keyword);
    }
    
    // 角色筛选
    if (query.role) {
      whereClauses.push('role = ?');
      queryParams.push(query.role);
    }
    
    // 状态筛选
    if (query.status) {
      whereClauses.push('status = ?');
      queryParams.push(query.status);
    }
    
    // 部门筛选
    if (query.department) {
      whereClauses.push('department LIKE ?');
      queryParams.push(`%${query.department}%`);
    }
    
    const whereClause = whereClauses.join(' AND ');
    
    // 获取用户总数
    const [totalResult] = await pool.query(`
      SELECT COUNT(*) as total 
      FROM \`User\`
      WHERE ${whereClause}
    `, queryParams);
    
    const total = totalResult[0]?.total || 0;
    
    // 获取用户数据
    const [users] = await pool.query(`
      SELECT 
        id,
        username,
        name,
        email,
        role,
        department,
        title,
        research_field,
        phone,
        status,
        last_login,
        created_at,
        updated_at
      FROM \`User\`
      WHERE ${whereClause}
      ORDER BY 
        CASE role
          WHEN 'admin' THEN 1
          WHEN 'assistant' THEN 2
          WHEN 'reviewer' THEN 3
          WHEN 'applicant' THEN 4
          ELSE 5
        END,
        created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, pageSize, offset]);
    
    // 获取统计数据
    const [statsResult] = await pool.query(`
      SELECT 
        COUNT(*) as totalUsers,
        SUM(CASE WHEN role = 'applicant' THEN 1 ELSE 0 END) as totalApplicants,
        SUM(CASE WHEN role = 'reviewer' THEN 1 ELSE 0 END) as totalReviewers,
        SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as totalAssistants,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as totalAdmins,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeUsers
      FROM \`User\`
      WHERE ${whereClause}
    `, queryParams);
    
    const stats = {
      totalUsers: statsResult[0]?.totalUsers || 0,
      totalApplicants: statsResult[0]?.totalApplicants || 0,
      totalReviewers: statsResult[0]?.totalReviewers || 0,
      totalAssistants: statsResult[0]?.totalAssistants || 0,
      totalAdmins: statsResult[0]?.totalAdmins || 0,
      activeUsers: statsResult[0]?.activeUsers || 0,
    };
    
    sendResponse(res, 200, {
      success: true,
      data: {
        users,
        pagination: {
          current: page,
          pageSize,
          total
        },
        stats
      }
    });
    
  } catch (error) {
    console.error('获取用户列表失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取用户列表失败'
    });
  }
  return;
}

// 获取用户统计
if (pathname === '/api/assistant/users/stats' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'assistant') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('获取用户统计，助理ID:', user.id);
    
    const [statsResult] = await pool.query(`
      SELECT 
        COUNT(*) as totalUsers,
        SUM(CASE WHEN role = 'applicant' THEN 1 ELSE 0 END) as totalApplicants,
        SUM(CASE WHEN role = 'reviewer' THEN 1 ELSE 0 END) as totalReviewers,
        SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as totalAssistants,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as totalAdmins,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeUsers,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactiveUsers,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingUsers,
        DATE(created_at) as date,
        COUNT(*) as daily_registrations
      FROM \`User\`
      WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date
    `);
    
    // 按角色分组统计
    const [roleStats] = await pool.query(`
      SELECT 
        role,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_count,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        DATE(created_at) as latest_registration
      FROM \`User\`
      GROUP BY role
      ORDER BY count DESC
    `);
    
    // 按部门统计
    const [deptStats] = await pool.query(`
      SELECT 
        COALESCE(department, '未设置') as department,
        COUNT(*) as count
      FROM \`User\`
      GROUP BY department
      ORDER BY count DESC
      LIMIT 10
    `);
    
    sendResponse(res, 200, {
      success: true,
      data: {
        overview: {
          totalUsers: statsResult[0]?.totalUsers || 0,
          totalApplicants: statsResult[0]?.totalApplicants || 0,
          totalReviewers: statsResult[0]?.totalReviewers || 0,
          totalAssistants: statsResult[0]?.totalAssistants || 0,
          totalAdmins: statsResult[0]?.totalAdmins || 0,
          activeUsers: statsResult[0]?.activeUsers || 0,
          inactiveUsers: statsResult[0]?.inactiveUsers || 0,
          pendingUsers: statsResult[0]?.pendingUsers || 0,
        },
        roleStats,
        deptStats,
        registrationTrend: statsResult.map(row => ({
          date: row.date,
          count: row.daily_registrations
        }))
      }
    });
    
  } catch (error) {
    console.error('获取用户统计失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取用户统计失败'
    });
  }
  return;
}

// 创建用户
if (pathname === '/api/assistant/users' && req.method === 'POST') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'assistant') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    
    console.log('创建用户，助理ID:', user.id, '用户名:', body.username);
    
    // 验证必填字段
    if (!body.username || !body.password || !body.name || !body.email || !body.role) {
      sendResponse(res, 400, { 
        success: false, 
        error: '请填写完整信息' 
      });
      return;
    }
    
    // 检查用户名是否已存在
    const [existingUsers] = await pool.query(
      'SELECT id FROM `User` WHERE username = ? OR email = ?',
      [body.username, body.email]
    );
    
    if (existingUsers.length > 0) {
      sendResponse(res, 400, { 
        success: false, 
        error: '用户名或邮箱已存在' 
      });
      return;
    }
    
    // 密码加密
    const hashedPassword = await bcrypt.hash(body.password, 10);
    
    // 创建用户
    const newUserId = uuidv4();
    const now = new Date();
    
    await pool.query(
      `INSERT INTO \`User\` (
        id, username, password, name, email, role, department, title,
        research_field, phone, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newUserId,
        body.username,
        hashedPassword,
        body.name,
        body.email,
        body.role,
        body.department || '',
        body.title || '',
        body.research_field || '',
        body.phone || '',
        body.status || 'active',
        now,
        now
      ]
    );
    
    // 记录操作日志
    await pool.query(
      `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, new_values, created_at)
       VALUES (?, 'create_user', 'User', ?, ?, NOW())`,
      [user.id, newUserId, JSON.stringify({
        username: body.username,
        name: body.name,
        email: body.email,
        role: body.role
      })]
    );
    
    sendResponse(res, 201, {
      success: true,
      message: '用户创建成功',
      data: { userId: newUserId }
    });
    
  } catch (error) {
    console.error('创建用户失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '创建用户失败'
    });
  }
  return;
}

// 更新用户信息
if (pathname.startsWith('/api/assistant/users/') && req.method === 'PUT') {
  const match = pathname.match(/\/api\/assistant\/users\/(.+)/);
  if (!match) return;
  
  const userId = match[1];
  const token = req.headers.authorization;
  const assistant = await verifyToken(token);
  
  if (!assistant || assistant.role !== 'assistant') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    
    console.log('更新用户信息，用户ID:', userId, '助理ID:', assistant.id);
    
    // 获取原用户信息
    const [users] = await pool.query(
      'SELECT * FROM `User` WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      sendResponse(res, 404, { success: false, error: '用户不存在' });
      return;
    }
    
    const oldUser = users[0];
    
    // 构建更新数据
    const updates = {};
    const updateFields = [
      'name', 'email', 'role', 'department', 'title', 
      'research_field', 'phone', 'status'
    ];
    
    updateFields.forEach(field => {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    });
    
    // 如果是更新角色，需要特殊权限检查
    if (body.role && body.role !== oldUser.role) {
      // 检查是否有权限修改角色
      if (body.role === 'admin' && assistant.role !== 'admin') {
        sendResponse(res, 403, { 
          success: false, 
          error: '没有权限修改为管理员角色' 
        });
        return;
      }
    }
    
    // 更新用户信息
    await pool.query(
      'UPDATE `User` SET ?, updated_at = NOW() WHERE id = ?',
      [updates, userId]
    );
    
    // 记录操作日志
    await pool.query(
      `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, old_values, new_values, created_at)
       VALUES (?, 'update_user', 'User', ?, ?, ?, NOW())`,
      [assistant.id, userId, JSON.stringify(oldUser), JSON.stringify(updates)]
    );
    
    sendResponse(res, 200, {
      success: true,
      message: '用户信息更新成功'
    });
    
  } catch (error) {
    console.error('更新用户信息失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '更新用户信息失败'
    });
  }
  return;
}

// 更新用户状态
if (pathname.startsWith('/api/assistant/users/') && pathname.endsWith('/status') && req.method === 'PUT') {
  const match = pathname.match(/\/api\/assistant\/users\/(.+)\/status/);
  if (!match) return;
  
  const userId = match[1];
  const token = req.headers.authorization;
  const assistant = await verifyToken(token);
  
  if (!assistant || assistant.role !== 'assistant') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    
    if (!body.status) {
      sendResponse(res, 400, { success: false, error: '请提供状态值' });
      return;
    }
    
    console.log('更新用户状态，用户ID:', userId, '新状态:', body.status, '助理ID:', assistant.id);
    
    // 获取原用户信息
    const [users] = await pool.query(
      'SELECT status, role FROM `User` WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      sendResponse(res, 404, { success: false, error: '用户不存在' });
      return;
    }
    
    const oldStatus = users[0].status;
    const userRole = users[0].role;
    
    // 检查权限（不能停用自己或管理员）
    if (userId === assistant.id) {
      sendResponse(res, 403, { 
        success: false, 
        error: '不能修改自己的状态' 
      });
      return;
    }
    
    if (userRole === 'admin' && assistant.role !== 'admin') {
      sendResponse(res, 403, { 
        success: false, 
        error: '没有权限修改管理员状态' 
      });
      return;
    }
    
    // 更新状态
    await pool.query(
      'UPDATE `User` SET status = ?, updated_at = NOW() WHERE id = ?',
      [body.status, userId]
    );
    
    // 记录操作日志
    await pool.query(
      `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, old_values, new_values, created_at)
       VALUES (?, 'update_user_status', 'User', ?, ?, ?, NOW())`,
      [assistant.id, userId, JSON.stringify({ status: oldStatus }), JSON.stringify({ status: body.status })]
    );
    
    sendResponse(res, 200, {
      success: true,
      message: `用户状态已更新为${getStatusText(body.status)}`
    });
    
  } catch (error) {
    console.error('更新用户状态失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '更新用户状态失败'
    });
  }
  return;
}

// 重置用户密码
if (pathname.startsWith('/api/assistant/users/') && pathname.endsWith('/password') && req.method === 'PUT') {
  const match = pathname.match(/\/api\/assistant\/users\/(.+)\/password/);
  if (!match) return;
  
  const userId = match[1];
  const token = req.headers.authorization;
  const assistant = await verifyToken(token);
  
  if (!assistant || assistant.role !== 'assistant') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    
    if (!body.newPassword) {
      sendResponse(res, 400, { success: false, error: '请提供新密码' });
      return;
    }
    
    console.log('重置用户密码，用户ID:', userId, '助理ID:', assistant.id);
    
    // 检查权限（不能重置自己的密码）
    if (userId === assistant.id) {
      sendResponse(res, 403, { 
        success: false, 
        error: '不能重置自己的密码' 
      });
      return;
    }
    
    // 检查用户是否存在
    const [users] = await pool.query(
      'SELECT id, role FROM `User` WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      sendResponse(res, 404, { success: false, error: '用户不存在' });
      return;
    }
    
    // 检查权限（不能重置管理员密码）
    const userRole = users[0].role;
    if (userRole === 'admin' && assistant.role !== 'admin') {
      sendResponse(res, 403, { 
        success: false, 
        error: '没有权限重置管理员密码' 
      });
      return;
    }
    
    // 密码加密
    const hashedPassword = await bcrypt.hash(body.newPassword, 10);
    
    // 更新密码
    await pool.query(
      'UPDATE `User` SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, userId]
    );
    
    // 记录操作日志
    await pool.query(
      `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, created_at)
       VALUES (?, 'reset_user_password', 'User', ?, NOW())`,
      [assistant.id, userId]
    );
    
    sendResponse(res, 200, {
      success: true,
      message: '密码重置成功'
    });
    
  } catch (error) {
    console.error('重置密码失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '重置密码失败'
    });
  }
  return;
}

// 导出用户列表
if (pathname === '/api/assistant/users/export' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'assistant') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const query = url.parse(req.url, true).query;
    
    console.log('导出用户列表，助理ID:', user.id);
    
    // 构建查询条件
    let whereClauses = ['1=1'];
    let queryParams = [];
    
    if (query.keyword) {
      whereClauses.push('(username LIKE ? OR name LIKE ? OR email LIKE ? OR department LIKE ?)');
      const keyword = `%${query.keyword}%`;
      queryParams.push(keyword, keyword, keyword, keyword);
    }
    
    if (query.role) {
      whereClauses.push('role = ?');
      queryParams.push(query.role);
    }
    
    if (query.status) {
      whereClauses.push('status = ?');
      queryParams.push(query.status);
    }
    
    const whereClause = whereClauses.join(' AND ');
    
    // 获取所有用户数据
    const [users] = await pool.query(`
      SELECT 
        username,
        name,
        email,
        CASE role
          WHEN 'applicant' THEN '申请人'
          WHEN 'reviewer' THEN '评审专家'
          WHEN 'assistant' THEN '科研助理'
          WHEN 'admin' THEN '管理员'
          ELSE role
        END as role,
        COALESCE(department, '') as department,
        COALESCE(title, '') as title,
        CASE status
          WHEN 'active' THEN '活跃'
          WHEN 'inactive' THEN '非活跃'
          WHEN 'pending' THEN '待激活'
          ELSE status
        END as status,
        DATE(created_at) as registration_date,
        DATE(last_login) as last_login_date
      FROM \`User\`
      WHERE ${whereClause}
      ORDER BY created_at DESC
    `, queryParams);
    
    // 生成CSV内容
    const headers = ['用户名', '姓名', '邮箱', '角色', '部门', '职称', '状态', '注册日期', '最后登录日期'];
    const rows = users.map(user => [
      user.username,
      user.name,
      user.email,
      user.role,
      user.department,
      user.title,
      user.status,
      user.registration_date,
      user.last_login_date || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // 设置响应头
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=users_${new Date().getTime()}.csv`);
    
    res.statusCode = 200;
    res.end(csvContent);
    
  } catch (error) {
    console.error('导出用户列表失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '导出用户列表失败'
    });
  }
  return;
}

// 辅助函数：获取状态文本
function getStatusText(status) {
  const map = {
    'active': '活跃',
    'inactive': '非活跃',
    'pending': '待激活'
  };
  return map[status] || status;
}

// ==================== 科研助理申请管理API ApplicationDetail====================

// 获取申请详情
if (pathname.startsWith('/api/assistant/applications/') && req.method === 'GET') {
  const match = pathname.match(/\/api\/assistant\/applications\/(.+)/);
  if (!match) return;
  
  const applicationId = match[1];
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'assistant') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('获取申请详情，申请ID:', applicationId, '助理ID:', user.id);
    
    // 获取项目申请信息（这里假设applicationId是项目ID）
    const [projects] = await pool.query(`
      SELECT 
        p.*,
        u.name as applicant_name,
        u.email as applicant_email,
        u.department as applicant_department
      FROM \`Project\` p
      JOIN \`User\` u ON p.applicant_id = u.id
      WHERE p.id = ?
    `, [applicationId]);
    
    if (projects.length === 0) {
      sendResponse(res, 404, { success: false, error: '申请不存在' });
      return;
    }
    
    const project = projects[0];
    
    // 获取项目成员
    const [members] = await pool.query(`
      SELECT 
        pm.*,
        u.name as member_name,
        u.email as member_email
      FROM \`ProjectMember\` pm
      JOIN \`User\` u ON pm.user_id = u.id
      WHERE pm.project_id = ?
      ORDER BY 
        CASE pm.role
          WHEN 'principal' THEN 1
          WHEN 'co_researcher' THEN 2
          WHEN 'research_assistant' THEN 3
          WHEN 'student' THEN 4
          ELSE 5
        END
    `, [applicationId]);
    
    // 获取项目阶段
    const [stages] = await pool.query(`
      SELECT * FROM \`ProjectStage\`
      WHERE project_id = ?
      ORDER BY stage_number
    `, [applicationId]);
    
    const applicationDetail = {
      id: project.id,
      project_code: project.project_code,
      title: project.title,
      category: project.category,
      research_field: project.research_field,
      keywords: project.keywords,
      abstract: project.abstract,
      background: project.background,
      objectives: project.objectives,
      methodology: project.methodology,
      expected_outcomes: project.expected_outcomes,
      budget_total: project.budget_total,
      duration_months: project.duration_months,
      status: project.status,
      current_stage: project.current_stage,
      submit_date: project.submit_date,
      start_date: project.start_date,
      end_date: project.end_date,
      approval_date: project.approval_date,
      completion_date: project.completion_date,
      remarks: project.remarks,
      applicant_name: project.applicant_name,
      applicant_email: project.applicant_email,
      applicant_department: project.applicant_department,
      created_at: project.created_at,
      members: members,
      stages: stages
    };
    
    sendResponse(res, 200, {
      success: true,
      data: applicationDetail
    });
    
  } catch (error) {
    console.error('获取申请详情失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取申请详情失败'
    });
  }
  return;
}

// 提交申请审核
if (pathname.startsWith('/api/assistant/applications/') && pathname.endsWith('/review') && req.method === 'POST') {
  const match = pathname.match(/\/api\/assistant\/applications\/(.+)\/review/);
  if (!match) return;
  
  const projectId = match[1];
  const token = req.headers.authorization;
  const assistant = await verifyToken(token);
  
  if (!assistant || assistant.role !== 'assistant') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const body = await getBody(req);
    
    if (!body.result || !body.comment) {
      sendResponse(res, 400, { 
        success: false, 
        error: '请提供完整的审核信息' 
      });
      return;
    }
    
    console.log('提交申请审核，项目ID:', projectId, '助理ID:', assistant.id, '结果:', body.result);
    
    // 获取项目信息
    const [projects] = await pool.query(
      'SELECT * FROM `Project` WHERE id = ?',
      [projectId]
    );
    
    if (projects.length === 0) {
      sendResponse(res, 404, { success: false, error: '项目不存在' });
      return;
    }
    
    const project = projects[0];
    
    // 更新项目状态
    let newStatus = '';
    switch (body.result) {
      case 'approved':
        newStatus = 'approved';
        break;
      case 'rejected':
        newStatus = 'rejected';
        break;
      case 'returned':
        newStatus = 'draft';
        break;
      default:
        newStatus = project.status;
    }
    
    await pool.query(
      'UPDATE `Project` SET status = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, projectId]
    );
    
    // 记录审核日志
    await pool.query(
      `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, new_values, created_at)
       VALUES (?, 'project_review', 'Project', ?, ?, NOW())`,
      [assistant.id, projectId, JSON.stringify({
        result: body.result,
        comment: body.comment,
        old_status: project.status,
        new_status: newStatus
      })]
    );
    
    // 创建通知给申请人
    await pool.query(
      `INSERT INTO \`Notification\` (id, user_id, type, title, content, related_id, related_type, created_at)
       VALUES (?, ?, 'project', '项目审核结果通知', ?, ?, 'Project', NOW())`,
      [uuidv4(), project.applicant_id, 
       `您的项目"${project.title}"审核结果为：${body.result === 'approved' ? '通过' : body.result === 'rejected' ? '不通过' : '需要修改'}。审核意见：${body.comment}`,
       projectId]
    );
    
    // 更新审核任务状态
    await pool.query(
      `UPDATE \`AuditTask\` 
       SET status = 'completed', 
           review_result = ?, 
           review_comment = ?,
           processed_by = ?,
           processed_at = NOW(),
           updated_at = NOW()
       WHERE related_id = ? AND task_type = 'project_review' AND status = 'processing'`,
      [body.result, body.comment, assistant.id, projectId]
    );
    
    sendResponse(res, 200, {
      success: true,
      message: '审核提交成功',
      data: { 
        projectId,
        status: newStatus
      }
    });
    
  } catch (error) {
    console.error('提交审核失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '提交审核失败'
    });
  }
  return;
}

// 获取申请审核历史
if (pathname.startsWith('/api/assistant/applications/') && pathname.endsWith('/history') && req.method === 'GET') {
  const match = pathname.match(/\/api\/assistant\/applications\/(.+)\/history/);
  if (!match) return;
  
  const projectId = match[1];
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'assistant') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('获取申请审核历史，项目ID:', projectId);
    
    const [history] = await pool.query(`
      SELECT 
        al.action,
        al.new_values,
        al.created_at,
        u.name as reviewer_name
      FROM \`AuditLog\` al
      LEFT JOIN \`User\` u ON al.user_id = u.id
      WHERE al.table_name = 'Project' 
        AND al.record_id = ?
        AND al.action IN ('project_review', 'project_submit', 'project_update')
      ORDER BY al.created_at DESC
    `, [projectId]);
    
    // 解析历史记录
    const formattedHistory = history.map(record => {
      const newValues = JSON.parse(record.new_values || '{}');
      return {
        action: record.action.replace('project_', ''),
        comment: newValues.comment,
        old_status: newValues.old_status,
        new_status: newValues.new_status,
        reviewer_name: record.reviewer_name,
        created_at: record.created_at
      };
    });
    
    sendResponse(res, 200, {
      success: true,
      data: formattedHistory
    });
    
  } catch (error) {
    console.error('获取审核历史失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取审核历史失败'
    });
  }
  return;
}

// 获取项目预算明细
if (pathname.startsWith('/api/assistant/projects/') && pathname.endsWith('/budget') && req.method === 'GET') {
  const match = pathname.match(/\/api\/assistant\/projects\/(.+)\/budget/);
  if (!match) return;
  
  const projectId = match[1];
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'assistant') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('获取项目预算明细，项目ID:', projectId);
    
    const [budgetItems] = await pool.query(`
      SELECT 
        category,
        item_name,
        description,
        amount,
        justification,
        sequence
      FROM \`ProjectBudget\`
      WHERE project_id = ?
      ORDER BY sequence, created_at
    `, [projectId]);
    
    sendResponse(res, 200, {
      success: true,
      data: budgetItems
    });
    
  } catch (error) {
    console.error('获取预算明细失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取预算明细失败'
    });
  }
  return;
}

// ==================== 科研助理活动日志API ====================

// 获取活动日志列表
if (pathname === '/api/assistant/activities' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'assistant') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const query = url.parse(req.url, true).query;
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    
    console.log('获取活动日志，助理ID:', user.id);
    
    // 构建查询条件
    let whereClauses = ['1=1'];
    let queryParams = [];
    
    // 操作类型筛选
    if (query.actions) {
      const actions = query.actions.split(',');
      const placeholders = actions.map(() => '?').join(',');
      whereClauses.push(`action IN (${placeholders})`);
      queryParams.push(...actions);
    }
    
    // 表名筛选
    if (query.tables) {
      const tables = query.tables.split(',');
      const placeholders = tables.map(() => '?').join(',');
      whereClauses.push(`table_name IN (${placeholders})`);
      queryParams.push(...tables);
    }
    
    // 操作人筛选
    if (query.user_id) {
      whereClauses.push('user_id = ?');
      queryParams.push(query.user_id);
    }
    
    // 时间范围筛选
    if (query.start_date && query.end_date) {
      whereClauses.push('DATE(created_at) BETWEEN ? AND ?');
      queryParams.push(query.start_date, query.end_date);
    } else if (query.start_date) {
      whereClauses.push('DATE(created_at) >= ?');
      queryParams.push(query.start_date);
    } else if (query.end_date) {
      whereClauses.push('DATE(created_at) <= ?');
      queryParams.push(query.end_date);
    }
    
    // IP地址筛选
    if (query.ip_address) {
      whereClauses.push('ip_address LIKE ?');
      queryParams.push(`%${query.ip_address}%`);
    }
    
    // 关键词搜索
    if (query.keyword) {
      whereClauses.push('(action LIKE ? OR table_name LIKE ? OR old_values LIKE ? OR new_values LIKE ? OR ip_address LIKE ?)');
      const keyword = `%${query.keyword}%`;
      queryParams.push(keyword, keyword, keyword, keyword, keyword);
    }
    
    const whereClause = whereClauses.join(' AND ');
    
    // 获取日志总数
    const [totalResult] = await pool.query(`
      SELECT COUNT(*) as total 
      FROM \`AuditLog\`
      WHERE ${whereClause}
    `, queryParams);
    
    const total = totalResult[0]?.total || 0;
    
    // 获取日志数据
    const [logs] = await pool.query(`
      SELECT 
        al.*,
        u.name as user_name,
        u.username as user_username,
        u.role as user_role,
        u.department as user_department
      FROM \`AuditLog\` al
      LEFT JOIN \`User\` u ON al.user_id = u.id
      WHERE ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, pageSize, offset]);
    
    // 获取统计数据
    const today = new Date().toISOString().split('T')[0];
    
    const [statsResult] = await pool.query(`
      SELECT 
        COUNT(*) as totalCount,
        SUM(CASE WHEN action LIKE '%login%' THEN 1 ELSE 0 END) as loginCount,
        SUM(CASE WHEN table_name = 'Project' THEN 1 ELSE 0 END) as projectCount,
        SUM(CASE WHEN table_name IN ('FundingApplication', 'ExpenditureRecord') THEN 1 ELSE 0 END) as fundingCount,
        SUM(CASE WHEN table_name IN ('ProjectAchievement', 'AchievementTransfer') THEN 1 ELSE 0 END) as achievementCount,
        SUM(CASE WHEN DATE(created_at) = ? THEN 1 ELSE 0 END) as todayCount
      FROM \`AuditLog\`
      WHERE ${whereClause}
    `, [today, ...queryParams]);
    
    const stats = {
      totalCount: statsResult[0]?.totalCount || 0,
      loginCount: statsResult[0]?.loginCount || 0,
      projectCount: statsResult[0]?.projectCount || 0,
      fundingCount: statsResult[0]?.fundingCount || 0,
      achievementCount: statsResult[0]?.achievementCount || 0,
      todayCount: statsResult[0]?.todayCount || 0,
    };
    
    // 格式化日志数据
    const formattedLogs = logs.map(log => {
      let description = '';
      
      // 根据不同的操作类型生成描述
      switch (log.action) {
        case 'login':
          description = `${log.user_name || '用户'} 登录系统`;
          break;
        case 'logout':
          description = `${log.user_name || '用户'} 退出系统`;
          break;
        case 'create_user':
          description = `${log.user_name} 创建了用户账户`;
          break;
        case 'update_user':
          description = `${log.user_name} 更新了用户信息`;
          break;
        case 'project_submit':
          description = `${log.user_name} 提交了项目申请`;
          break;
        case 'project_review':
          try {
            const newValues = JSON.parse(log.new_values || '{}');
            description = `${log.user_name} ${newValues.result === 'approved' ? '批准' : '拒绝'}了项目申请`;
            if (newValues.comment) {
              description += `：${newValues.comment}`;
            }
          } catch {
            description = `${log.user_name} 审核了项目申请`;
          }
          break;
        default:
          description = `${log.user_name || '系统'} 执行了 ${log.action} 操作`;
      }
      
      return {
        ...log,
        description,
        old_values: log.old_values,
        new_values: log.new_values,
      };
    });
    
    sendResponse(res, 200, {
      success: true,
      data: {
        logs: formattedLogs,
        pagination: {
          current: page,
          pageSize,
          total
        },
        stats
      }
    });
    
  } catch (error) {
    console.error('获取活动日志失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取活动日志失败'
    });
  }
  return;
}

// 获取活动日志统计
if (pathname === '/api/assistant/activities/stats' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'assistant') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('获取活动日志统计，助理ID:', user.id);
    
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    
    // 获取概览统计
    const [overviewStats] = await pool.query(`
      SELECT 
        COUNT(*) as totalCount,
        COUNT(DISTINCT user_id) as uniqueUserCount,
        COUNT(DISTINCT ip_address) as uniqueIpCount,
        COUNT(CASE WHEN DATE(created_at) = ? THEN 1 END) as todayCount,
        COUNT(CASE WHEN DATE(created_at) >= ? THEN 1 END) as weekCount,
        COUNT(CASE WHEN action LIKE '%login%' THEN 1 END) as loginCount,
        COUNT(CASE WHEN action LIKE '%create%' THEN 1 END) as createCount,
        COUNT(CASE WHEN action LIKE '%update%' THEN 1 END) as updateCount,
        COUNT(CASE WHEN action LIKE '%delete%' THEN 1 END) as deleteCount
      FROM \`AuditLog\`
    `, [today, weekAgoStr]);
    
    // 获取按操作类型统计
    const [actionStats] = await pool.query(`
      SELECT 
        action,
        COUNT(*) as count,
        DATE(created_at) as date
      FROM \`AuditLog\`
      WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY action, DATE(created_at)
      ORDER BY date DESC, count DESC
    `);
    
    // 获取按表名统计
    const [tableStats] = await pool.query(`
      SELECT 
        table_name,
        COUNT(*) as count,
        COUNT(CASE WHEN action = 'create' THEN 1 END) as create_count,
        COUNT(CASE WHEN action = 'update' THEN 1 END) as update_count,
        COUNT(CASE WHEN action = 'delete' THEN 1 END) as delete_count
      FROM \`AuditLog\`
      WHERE table_name IS NOT NULL
      GROUP BY table_name
      ORDER BY count DESC
      LIMIT 10
    `);
    
    // 获取用户操作统计
    const [userStats] = await pool.query(`
      SELECT 
        u.name as user_name,
        u.username as user_username,
        u.role as user_role,
        COUNT(*) as operation_count,
        COUNT(DISTINCT DATE(al.created_at)) as active_days,
        MAX(al.created_at) as last_operation
      FROM \`AuditLog\` al
      JOIN \`User\` u ON al.user_id = u.id
      WHERE al.user_id IS NOT NULL
      GROUP BY al.user_id
      ORDER BY operation_count DESC
      LIMIT 15
    `);
    
    // 获取按小时分布统计
    const [hourlyStats] = await pool.query(`
      SELECT 
        HOUR(created_at) as hour,
        COUNT(*) as count
      FROM \`AuditLog\`
      WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY HOUR(created_at)
      ORDER BY hour
    `);
    
    sendResponse(res, 200, {
      success: true,
      data: {
        overview: overviewStats[0] || {},
        actionStats: groupStatsByDate(actionStats),
        tableStats,
        userStats,
        hourlyStats
      }
    });
    
  } catch (error) {
    console.error('获取日志统计失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取日志统计失败'
    });
  }
  return;
}

// 导出活动日志
if (pathname === '/api/assistant/activities/export' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'assistant') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    const query = url.parse(req.url, true).query;
    
    console.log('导出活动日志，助理ID:', user.id);
    
    // 构建查询条件
    let whereClauses = ['1=1'];
    let queryParams = [];
    
    if (query.actions) {
      const actions = query.actions.split(',');
      const placeholders = actions.map(() => '?').join(',');
      whereClauses.push(`action IN (${placeholders})`);
      queryParams.push(...actions);
    }
    
    if (query.tables) {
      const tables = query.tables.split(',');
      const placeholders = tables.map(() => '?').join(',');
      whereClauses.push(`table_name IN (${placeholders})`);
      queryParams.push(...tables);
    }
    
    if (query.user_id) {
      whereClauses.push('user_id = ?');
      queryParams.push(query.user_id);
    }
    
    if (query.start_date && query.end_date) {
      whereClauses.push('DATE(created_at) BETWEEN ? AND ?');
      queryParams.push(query.start_date, query.end_date);
    }
    
    if (query.keyword) {
      whereClauses.push('(action LIKE ? OR table_name LIKE ? OR ip_address LIKE ?)');
      const keyword = `%${query.keyword}%`;
      queryParams.push(keyword, keyword, keyword);
    }
    
    const whereClause = whereClauses.join(' AND ');
    
    // 获取日志数据
    const [logs] = await pool.query(`
      SELECT 
        al.id,
        al.created_at,
        u.name as user_name,
        u.username as user_username,
        u.role as user_role,
        al.action,
        al.table_name,
        al.record_id,
        al.ip_address,
        CASE 
          WHEN al.old_values IS NULL AND al.new_values IS NULL THEN '无数据变更'
          WHEN al.old_values IS NULL THEN '新增数据'
          WHEN al.new_values IS NULL THEN '删除数据'
          ELSE '修改数据'
        END as change_type
      FROM \`AuditLog\` al
      LEFT JOIN \`User\` u ON al.user_id = u.id
      WHERE ${whereClause}
      ORDER BY al.created_at DESC
    `, queryParams);
    
    // 生成CSV内容
    const headers = [
      '日志ID', '操作时间', '操作人', '用户名', '角色', 
      '操作类型', '操作表', '记录ID', 'IP地址', '变更类型'
    ];
    
    const rows = logs.map(log => [
      log.id,
      new Date(log.created_at).toLocaleString('zh-CN'),
      log.user_name || '系统',
      log.user_username || '',
      log.user_role ? getRoleText(log.user_role) : '',
      getActionText(log.action),
      getTableText(log.table_name),
      log.record_id || '',
      log.ip_address || '',
      log.change_type
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // 设置响应头
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${new Date().getTime()}.csv`);
    
    res.statusCode = 200;
    res.end(csvContent);
    
  } catch (error) {
    console.error('导出活动日志失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '导出活动日志失败'
    });
  }
  return;
}

// 辅助函数：按日期分组统计
function groupStatsByDate(stats) {
  const grouped = {};
  
  stats.forEach(stat => {
    if (!grouped[stat.date]) {
      grouped[stat.date] = {};
    }
    grouped[stat.date][stat.action] = stat.count;
  });
  
  return grouped;
}

// 辅助函数：获取操作类型文本
function getActionText(action) {
  const map = {
    'login': '登录',
    'logout': '登出',
    'create': '创建',
    'update': '更新',
    'delete': '删除',
    'submit': '提交',
    'review': '审核',
    'approve': '批准',
    'reject': '拒绝',
    'export': '导出',
    'import': '导入',
    'create_user': '创建用户',
    'update_user': '更新用户',
    'project_submit': '提交项目',
    'project_review': '审核项目',
  };
  return map[action] || action;
}

// 辅助函数：获取表名文本
function getTableText(table) {
  const map = {
    'User': '用户表',
    'Project': '项目表',
    'ProjectMember': '项目成员表',
    'ProjectBudget': '项目预算表',
    'FundingApplication': '经费申请表',
    'ExpenditureRecord': '支出记录表',
    'ProjectAchievement': '项目成果表',
    'AchievementTransfer': '成果转化表',
    'ProjectReview': '项目评审表',
    'ProjectStage': '项目阶段表',
    'Notification': '通知表',
    'FileStorage': '文件存储表',
    'AuditTask': '审核任务表',
  };
  return map[table] || table;
}

// 辅助函数：获取角色文本
function getRoleText(role) {
  const map = {
    'applicant': '申请人',
    'reviewer': '评审专家',
    'assistant': '科研助理',
    'admin': '管理员',
  };
  return map[role] || role;
}
  // 辅助函数：计算时间差
  function getTimeAgo(date) {
    if (!date) return '未知时间';
    
    const now = new Date();
    const inputDate = new Date(date);
    const diffMs = now - inputDate;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return '刚刚';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}分钟前`;
    } else if (diffHours < 24) {
      return `${diffHours}小时前`;
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)}周前`;
    } else if (diffDays < 365) {
      return `${Math.floor(diffDays / 30)}个月前`;
    } else {
      return `${Math.floor(diffDays / 365)}年前`;
    }
  }

    // 获取最近活动 API（如果前端需要单独的API）
    if (pathname === '/api/activities/recent' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      try {
        const { limit = 20 } = query;
        
        const [activities] = await pool.query(`
          SELECT 
            id,
            action,
            table_name,
            record_id,
            old_values,
            new_values,
            ip_address,
            created_at
          FROM \`AuditLog\`
          WHERE user_id = ? OR table_name IN ('Project', 'User', 'FundingApplication', 'ExpenditureRecord', 'ProjectAchievement')
          ORDER BY created_at DESC
          LIMIT ?
        `, [user.id, parseInt(limit)]);
        
        const formattedActivities = activities.map((activity, index) => {
          let description = '';
          let icon = '📝';
          let color = '#e6f7ff';
          
          // 根据操作类型生成描述
          if (activity.table_name === 'Project') {
            if (activity.action === 'create') {
              description = `创建了新项目 "${activity.new_values?.title || '未知项目'}"`;
              icon = '📋';
              color = '#e6f7ff';
            } else if (activity.action === 'update') {
              description = `更新了项目 "${activity.new_values?.title || activity.old_values?.title || '未知项目'}"`;
              icon = '✏️';
              color = '#fff7e6';
            }
          } else if (activity.table_name === 'User') {
            if (activity.action === 'create') {
              description = `新用户 "${activity.new_values?.name || activity.new_values?.username}" 注册`;
              icon = '👤';
              color = '#f6ffed';
            }
          } else if (activity.table_name === 'ExpenditureRecord') {
            description = `处理了支出申请 "${activity.new_values?.item_name || '未知支出'}"`;
            icon = '💰';
            color = '#f0faff';
          } else if (activity.table_name === 'ProjectAchievement') {
            description = `处理了成果 "${activity.new_values?.title || '未知成果'}"`;
            icon = '🏆';
            color = '#fff0f6';
          } else {
            description = `${activity.action} ${activity.table_name} 记录`;
          }
          
          return {
            id: activity.id || index + 1,
            icon,
            color,
            description,
            time: getTimeAgo(activity.created_at)
          };
        });
        
        sendResponse(res, 200, {
          success: true,
          data: formattedActivities
        });
        
      } catch (error) {
        console.error('获取活动记录失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取活动记录失败',
          message: error.message
        });
      }
      return;
    }

    // 获取通知详情 API
    if (pathname === '/api/notifications' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      try {
        const { limit = 50, unread_only } = query;
        
        let sql = `
          SELECT 
            id,
            type,
            title,
            content as message,
            is_read,
            action_url,
            created_at
          FROM \`Notification\`
          WHERE user_id = ? OR user_id IS NULL
        `;
        
        const params = [user.id];
        
        if (unread_only === 'true') {
          sql += ' AND is_read = FALSE';
        }
        
        sql += ' ORDER BY created_at DESC LIMIT ?';
        params.push(parseInt(limit));
        
        const [notifications] = await pool.query(sql, params);
        
        const formattedNotifications = notifications.map(notif => {
          let icon = '📢';
          if (notif.type === 'warning') icon = '⚠️';
          if (notif.type === 'success') icon = '✅';
          if (notif.type === 'info') icon = 'ℹ️';
          if (notif.type === 'project') icon = '📋';
          if (notif.type === 'review') icon = '⭐';
          if (notif.type === 'funding') icon = '💰';
          if (notif.type === 'achievement') icon = '🏆';
          if (notif.type === 'reminder') icon = '⏰';
          
          return {
            id: notif.id,
            icon,
            title: notif.title,
            message: notif.message,
            time: getTimeAgo(notif.created_at),
            read: notif.is_read === 1,
            action_url: notif.action_url
          };
        });
        
        sendResponse(res, 200, {
          success: true,
          data: formattedNotifications
        });
        
      } catch (error) {
        console.error('获取通知失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取通知失败',
          message: error.message
        });
      }
      return;
    }
    // 获取科研助理快速统计
    if (pathname === '/api/assistant/quick-stats' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const isAssistant = user.role === 'assistant' || user.role === 'admin';
      if (!isAssistant) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限访问'
        });
        return;
      }
      
      try {
        console.log('📊 获取科研助理快速统计，用户ID:', user.id);
        
        // 获取各类型统计
        const [stats] = await pool.query(`
          SELECT 
            (SELECT COUNT(*) FROM \`Project\` WHERE status = 'under_review') as pending_reviews,
            (SELECT COUNT(*) FROM \`ExpenditureRecord\` WHERE status = 'submitted') as pending_expenditures,
            (SELECT COUNT(*) FROM \`ProjectAchievement\` WHERE status = 'under_review') as pending_achievements,
            (SELECT COUNT(*) FROM \`User\` WHERE status = 'pending') as pending_users,
            (SELECT COUNT(*) FROM \`Project\` WHERE status IN ('in_progress', 'stage_review')) as active_projects
        `);
        
        sendResponse(res, 200, {
          success: true,
          data: stats[0] || {
            pending_reviews: 0,
            pending_expenditures: 0,
            pending_achievements: 0,
            pending_users: 0,
            active_projects: 0
          }
        });
        
      } catch (error) {
        console.error('获取快速统计失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取统计数据失败',
          message: error.message
        });
      }
      return;
    }

    // 获取待处理任务列表
    if (pathname === '/api/assistant/pending-tasks' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const isAssistant = user.role === 'assistant' || user.role === 'admin';
      if (!isAssistant) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限访问'
        });
        return;
      }
      
      try {
        console.log('📋 获取待处理任务列表，用户ID:', user.id);
        
        const pendingTasks = [];
        
        // 获取待处理项目申请
        const [projectTasks] = await pool.query(`
          SELECT 
            p.id,
            p.title,
            'project_review' as type,
            p.created_at,
            u.name as applicant_name
          FROM \`Project\` p
          LEFT JOIN \`User\` u ON p.applicant_id = u.id
          WHERE p.status = 'under_review'
          ORDER BY p.created_at ASC
          LIMIT 5
        `);
        
        projectTasks.forEach(task => {
          pendingTasks.push({
            id: `project_${task.id}`,
            title: `项目审核: ${task.title}`,
            type: 'project_review',
            applicant: task.applicant_name,
            created_at: task.created_at,
            priority: 'high'
          });
        });
        
        // 获取待处理支出申请
        const [expenditureTasks] = await pool.query(`
          SELECT 
            er.id,
            er.item_name,
            'expenditure_review' as type,
            er.created_at,
            p.title as project_title,
            er.amount
          FROM \`ExpenditureRecord\` er
          LEFT JOIN \`Project\` p ON er.project_id = p.id
          WHERE er.status = 'submitted'
          ORDER BY er.created_at ASC
          LIMIT 5
        `);
        
        expenditureTasks.forEach(task => {
          pendingTasks.push({
            id: `expenditure_${task.id}`,
            title: `支出审核: ${task.item_name}`,
            type: 'expenditure_review',
            project: task.project_title,
            amount: task.amount,
            created_at: task.created_at,
            priority: 'medium'
          });
        });
        
        // 获取待处理成果审核
        const [achievementTasks] = await pool.query(`
          SELECT 
            pa.id,
            pa.title,
            'achievement_review' as type,
            pa.created_at,
            p.title as project_title,
            pa.type as achievement_type
          FROM \`ProjectAchievement\` pa
          LEFT JOIN \`Project\` p ON pa.project_id = p.id
          WHERE pa.status = 'under_review'
          ORDER BY pa.created_at ASC
          LIMIT 5
        `);
        
        achievementTasks.forEach(task => {
          pendingTasks.push({
            id: `achievement_${task.id}`,
            title: `成果审核: ${task.title}`,
            type: 'achievement_review',
            project: task.project_title,
            achievement_type: task.achievement_type,
            created_at: task.created_at,
            priority: 'medium'
          });
        });
        
        // 按创建时间排序
        pendingTasks.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        sendResponse(res, 200, {
          success: true,
          data: pendingTasks.slice(0, 10) // 限制最多返回10个
        });
        
      } catch (error) {
        console.error('获取待处理任务失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取任务列表失败',
          message: error.message
        });
      }
      return;
    }

    // 获取项目统计图表数据
    if (pathname === '/api/assistant/project-chart-data' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const isAssistant = user.role === 'assistant' || user.role === 'admin';
      if (!isAssistant) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限访问'
        });
        return;
      }
      
      const { period = '30' } = query;
      const days = parseInt(period);
      
      try {
        console.log('📈 获取项目统计图表数据，用户ID:', user.id, '天数:', days);
        
        // 获取最近N天的项目创建趋势
        const [trendData] = await pool.query(`
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as count,
            SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as pending_count
          FROM \`Project\`
          WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          GROUP BY DATE(created_at)
          ORDER BY date
        `, [days]);
        
        // 补全缺失的日期
        const result = [];
        const today = new Date();
        
        for (let i = days; i >= 0; i--) {
          const date = new Date();
          date.setDate(today.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          const dayData = trendData.find(d => d.date.toISOString().split('T')[0] === dateStr);
          
          result.push({
            date: dateStr,
            count: dayData ? parseInt(dayData.count) : 0,
            pending_count: dayData ? parseInt(dayData.pending_count) : 0
          });
        }
        
        sendResponse(res, 200, {
          success: true,
          data: result
        });
        
      } catch (error) {
        console.error('获取项目图表数据失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取图表数据失败',
          message: error.message
        });
      }
      return;
    }

    // 获取用户增长数据
    if (pathname === '/api/assistant/user-growth' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const isAssistant = user.role === 'assistant' || user.role === 'admin';
      if (!isAssistant) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限访问'
        });
        return;
      }
      
      const { period = '30' } = query;
      const days = parseInt(period);
      
      try {
        console.log('📈 获取用户增长数据，用户ID:', user.id, '天数:', days);
        
        // 获取最近N天的用户增长趋势
        const [growthData] = await pool.query(`
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as count,
            SUM(CASE WHEN role = 'applicant' THEN 1 ELSE 0 END) as applicants,
            SUM(CASE WHEN role = 'reviewer' THEN 1 ELSE 0 END) as reviewers
          FROM \`User\`
          WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          GROUP BY DATE(created_at)
          ORDER BY date
        `, [days]);
        
        // 补全缺失的日期
        const result = [];
        const today = new Date();
        
        for (let i = days; i >= 0; i--) {
          const date = new Date();
          date.setDate(today.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          const dayData = growthData.find(d => d.date.toISOString().split('T')[0] === dateStr);
          
          result.push({
            date: dateStr,
            count: dayData ? parseInt(dayData.count) : 0,
            applicants: dayData ? parseInt(dayData.applicants) : 0,
            reviewers: dayData ? parseInt(dayData.reviewers) : 0
          });
        }
        
        sendResponse(res, 200, {
          success: true,
          data: result
        });
        
      } catch (error) {
        console.error('获取用户增长数据失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取用户增长数据失败',
          message: error.message
        });
      }
      return;
    }
    // ==================== 用户注册API ====================
    
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const body = await parseRequestBody(req);
      
      console.log('注册请求收到:', body);
      
      // 验证必填字段
      if (!body.username || !body.password || !body.email) {
        sendResponse(res, 400, {
          success: false,
          error: '用户名、密码和邮箱不能为空'
        });
        return;
      }
      
      // 验证密码长度
      if (body.password.length < 6) {
        sendResponse(res, 400, {
          success: false,
          error: '密码至少需要6个字符'
        });
        return;
      }
      
      try {
        // 检查用户名是否已存在
        const [existingUsers] = await pool.query(
          'SELECT id FROM `User` WHERE username = ? OR email = ?',
          [body.username, body.email]
        );
        
        if (existingUsers.length > 0) {
          sendResponse(res, 409, {
            success: false,
            error: '用户名或邮箱已存在'
          });
          return;
        }
        
        // 生成UUID作为id
        const userId = randomUUID();
        
        // 转换和验证角色
        const roleMap = {
          'APPLICANT': 'applicant',
          'REVIEWER': 'reviewer',
          'ASSISTANT': 'assistant',
          'ADMIN': 'admin'
        };
        
        let userRole = (body.role || 'APPLICANT').toUpperCase();
        if (!roleMap[userRole]) {
          userRole = 'APPLICANT';
        }
        const dbRole = roleMap[userRole];
        
        // 获取前端传递的其他字段
        const name = body.name || body.username || '';
        const department = body.college || body.department || '';
        const title = body.title || '';
        
        // 插入数据到正确的表结构
        const sql = `
          INSERT INTO \`User\` (
            id, username, password, name, email, role,
            department, title, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        const params = [
          userId,
          body.username,
          body.password, // 注意：这里应该存储哈希值，但为简化直接存储
          name,
          body.email,
          dbRole,
          department,
          title,
          'active'
        ];
        
        console.log('执行SQL:', sql);
        console.log('参数:', params);
        
        const [result] = await pool.query(sql, params);
        
        console.log('用户插入成功，结果:', result);
        
        // 获取新用户信息（不包含密码）
        const [newUsers] = await pool.query(
          `SELECT 
            id, username, email, role, name,
            department, title, status, 
            last_login, created_at
           FROM \`User\` WHERE id = ?`,
          [userId]
        );
        
        console.log('查询到新用户:', newUsers[0]);
        
        // 生成token
        const token = Buffer.from(`${userId}:${body.username}:${Date.now()}`).toString('base64');
        
        sendResponse(res, 201, {
          success: true,
          message: '注册成功',
          token: token,
          user: newUsers[0]
        });
        
      } catch (error) {
        console.error('========== 注册错误详情 ==========');
        console.error('错误信息:', error.message);
        console.error('SQL错误:', error.sqlMessage);
        console.error('错误代码:', error.code);
        console.error('SQL状态:', error.sqlState);
        console.error('SQL语句:', error.sql);
        console.error('堆栈:', error.stack);
        console.error('==================================');
        
        sendResponse(res, 500, {
          success: false,
          error: '注册失败',
          message: error.message,
          sqlMessage: error.sqlMessage || '无SQL错误信息',
          code: error.code
        });
      }
      return;
    }
    
    if (pathname === '/api/auth/profile' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      try {
        const [users] = await pool.query(
          'SELECT id, username, email, role, created_at, last_login FROM `User` WHERE id = ?',
          [user.id]
        );
        
        if (users.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '用户不存在'
          });
          return;
        }
        
        sendResponse(res, 200, {
          success: true,
          user: users[0]
        });
      } catch (error) {
        sendResponse(res, 500, {
          success: false,
          error: '获取用户信息失败',
          message: error.message
        });
      }
      return;
    }
    
    // ==================== 项目管理API ====================
    
    // 创建项目
    if ((pathname === '/api/project' || pathname === '/api/projects') && req.method === 'POST') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      console.log(`🔄 ${pathname} - 用户尝试创建项目:`, {
        userId: user.id,
        username: user.username,
        role: user.role
      });
      
      const body = await parseRequestBody(req);
      
      console.log('📥 接收到的原始数据:', body);
      
      // 数据转换
      const transformedData = {
        title: body.title || '未命名项目',
        abstract: body.abstract || body.description || body.title + '的项目摘要',
        category: body.category || '其他',
        research_field: body.research_field || body.researchField || '未指定领域',
        objectives: body.objectives || body.title + '的研究目标',
        budget_total: body.budget_total || body.budget || 0,
        duration_months: body.duration_months || body.duration || 12,
        keywords: body.keywords || body.title,
        background: body.background || '暂无研究背景说明',
        methodology: body.methodology || '暂无研究方法说明',
        expected_outcomes: body.expected_outcomes || body.expectedOutcomes || '预期取得重要研究成果'
      };
      
      console.log('🔄 转换后的数据:', transformedData);
      
      // 验证必填字段
      if (!transformedData.title) {
        sendResponse(res, 400, {
          success: false,
          error: '项目标题不能为空'
        });
        return;
      }
      
      try {
        // 使用UUID作为项目ID
        const projectId = randomUUID();
        const projectCode = `PROJ-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        
        console.log('🆔 生成项目ID:', projectId, '项目编号:', projectCode);
        
        // 插入数据 - 使用正确的表名 Project
        const sql = `
          INSERT INTO \`Project\` (
            id, applicant_id, project_code, title, category, research_field, 
            keywords, abstract, background, objectives, methodology, 
            expected_outcomes, budget_total, duration_months, status, 
            current_stage, start_date, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        const params = [
          projectId,
          user.id,
          projectCode,
          transformedData.title,
          transformedData.category,
          transformedData.research_field,
          transformedData.keywords,
          transformedData.abstract,
          transformedData.background,
          transformedData.objectives,
          transformedData.methodology,
          transformedData.expected_outcomes,
          parseFloat(transformedData.budget_total) || 0,
          parseInt(transformedData.duration_months) || 12,
          body.status || 'draft',
          1,
          body.start_date || new Date().toISOString().split('T')[0]
        ];
        
        console.log('📝 执行SQL:', sql);
        console.log('📝 参数:', params);
        
        const [result] = await pool.query(sql, params);
        
        console.log('✅ 项目插入成功，ID:', projectId, '结果:', result);
        
        // 将申请者添加为项目成员（负责人）
        await pool.query(
          'INSERT INTO `ProjectMember` (id, project_id, user_id, role, join_date, created_at) VALUES (?, ?, ?, ?, CURDATE(), NOW())',
          [randomUUID(), projectId, user.id, 'principal']
        );
        
        console.log('✅ 添加项目成员成功');
        
        sendResponse(res, 201, {
          success: true,
          message: '项目创建成功',
          data: {
            id: projectId,
            project_code: projectCode,
            applicant_id: user.id,
            title: transformedData.title
          }
        });
      } catch (error) {
        console.error('❌ 创建项目失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '创建项目失败',
          message: error.message,
          sqlMessage: error.sqlMessage,
          sql: error.sql
        });
      }
      return;
    }
    
    // 获取项目列表
    if ((pathname === '/api/project' || pathname === '/api/projects') && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const { limit = 50, page = 1, status, search } = query;
      const offset = (page - 1) * limit;
      
      try {
        // 使用正确的表名 Project
        let sql = 'SELECT * FROM `Project` WHERE 1=1';
        let countSql = 'SELECT COUNT(*) as total FROM `Project` WHERE 1=1';
        const params = [];
        const countParams = [];
        
        // 根据用户角色过滤
        if (!checkPermission(user.role, ['admin', 'assistant'])) {
          sql += ' AND (applicant_id = ? OR id IN (SELECT project_id FROM `ProjectMember` WHERE user_id = ?))';
          countSql += ' AND (applicant_id = ? OR id IN (SELECT project_id FROM `ProjectMember` WHERE user_id = ?))';
          params.push(user.id, user.id);
          countParams.push(user.id, user.id);
        }
        
        // 状态过滤
        if (status) {
          sql += ' AND status = ?';
          countSql += ' AND status = ?';
          params.push(status);
          countParams.push(status);
        }
        
        // 搜索
        if (search) {
          sql += ' AND (title LIKE ? OR abstract LIKE ?)';
          countSql += ' AND (title LIKE ? OR abstract LIKE ?)';
          params.push(`%${search}%`, `%${search}%`);
          countParams.push(`%${search}%`, `%${search}%`);
        }
        
        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);
        
        console.log('🔍 执行项目查询:', sql);
        console.log('🔍 查询参数:', params);
        
        const [rows] = await pool.query(sql, params);
        const [totalResult] = await pool.query(countSql, countParams);
        const total = totalResult[0].total;
        
        console.log(`📊 查询结果: ${rows.length} 条记录，总共 ${total} 条`);
        
        // 获取每个项目的成员信息
        for (const project of rows) {
          const [members] = await pool.query(
            `SELECT u.id, u.username, u.email, u.role, pm.role as member_role
             FROM \`ProjectMember\` pm
             JOIN \`User\` u ON pm.user_id = u.id
             WHERE pm.project_id = ?`,
            [project.id]
          );
          project.members = members;
        }
        
        sendResponse(res, 200, {
          success: true,
          count: rows.length,
          total: total,
          data: rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        });
      } catch (error) {
        console.error('获取项目列表失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取项目列表失败',
          message: error.message
        });
      }
      return;
    }
    
    // ==================== 项目进度API（必须放在项目详情API之前） ====================
    
    // 1. 获取项目进度总览（放在项目详情API前面）
    if (pathname.match(/^\/api\/projects\/[^\/]+\/progress$/) && req.method === 'GET') {
      console.log('🎯 进入项目进度API处理');
      
      // 使用正则提取项目ID
      const match = pathname.match(/^\/api\/projects\/([^\/]+)\/progress$/);
      const projectId = match[1];
      
      console.log('📋 提取的项目ID:', projectId);
      
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      console.log('👤 用户验证成功:', user.id);
      
      try {
        // 1. 查询项目是否存在
        console.log('🔍 查询项目，ID:', projectId);
        const [projects] = await pool.query(
          'SELECT * FROM `Project` WHERE id = ?',
          [projectId]
        );
        
        console.log('📊 查询结果数量:', projects.length);
        
        if (projects.length === 0) {
          console.log('❌ 项目不存在');
          sendResponse(res, 404, {
            success: false,
            error: '项目未找到',
            projectId: projectId
          });
          return;
        }
        
        const project = projects[0];
        console.log('✅ 项目找到:', {
          id: project.id,
          title: project.title,
          applicant_id: project.applicant_id,
          status: project.status
        });
        
        // 2. 检查权限
        console.log('🔐 检查权限...');
        console.log('   项目申请人ID:', project.applicant_id);
        console.log('   当前用户ID:', user.id);
        console.log('   用户角色:', user.role);
        
        const isOwner = project.applicant_id === user.id;
        const hasAdminAccess = checkPermission(user.role, ['admin', 'assistant']);
        
        console.log('   是否是项目所有者:', isOwner);
        console.log('   是否有管理员权限:', hasAdminAccess);
        
        if (!isOwner && !hasAdminAccess) {
          console.error('❌ 权限不足');
          sendResponse(res, 403, {
            success: false,
            error: '没有权限查看此项目',
            details: {
              userId: user.id,
              applicantId: project.applicant_id,
              userRole: user.role
            }
          });
          return;
        }
        
        console.log('✅ 权限检查通过');
        
        // 3. 获取项目阶段时间线
        const [stages] = await pool.query(
          `SELECT 
            stage_number,
            stage_name,
            description,
            start_date,
            planned_end_date,
            actual_end_date,
            required_deliverables,
            review_required,
            status,
            approval_date
           FROM \`ProjectStage\` 
           WHERE project_id = ? 
           ORDER BY stage_number`,
          [projectId]
        );
        
        // 4. 获取经费支出记录
        const [expenditures] = await pool.query(
          `SELECT 
            id,
            expense_no,
            category,
            item_name,
            amount,
            expense_date,
            payee,
            description,
            status,
            review_comment
           FROM \`ExpenditureRecord\` 
           WHERE project_id = ? 
           ORDER BY expense_date DESC`,
          [projectId]
        );
        
        // 5. 获取项目成果
        const [achievements] = await pool.query(
          `SELECT 
            id,
            type,
            title,
            description,
            achievement_date,
            status,
            created_by
           FROM \`ProjectAchievement\` 
           WHERE project_id = ? 
           ORDER BY achievement_date DESC`,
          [projectId]
        );
        
        // 6. 获取项目预算总额
        const [budgetResult] = await pool.query(
          'SELECT COALESCE(SUM(amount), 0) as total_budget FROM `ProjectBudget` WHERE project_id = ?',
          [projectId]
        );
        const totalBudget = budgetResult[0]?.total_budget || 0;
        
        // 7. 获取已批准的支出总额
        const [expenditureResult] = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) as total_used 
           FROM \`ExpenditureRecord\` 
           WHERE project_id = ? AND status = 'approved'`,
          [projectId]
        );
        const usedAmount = expenditureResult[0]?.total_used || 0;
        
        // 8. 获取项目通知提醒
        const [notifications] = await pool.query(
          `SELECT 
            id,
            type,
            title,
            content,
            priority,
            is_read,
            created_at
           FROM \`Notification\` 
           WHERE user_id = ? 
             AND related_id = ? 
             AND related_type = 'project'
             AND (expires_at IS NULL OR expires_at > NOW())
           ORDER BY created_at DESC 
           LIMIT 10`,
          [user.id, projectId]
        );
        
        // 9. 获取项目评审记录
        const [reviews] = await pool.query(
          `SELECT 
            review_type,
            review_date,
            total_score,
            recommendation,
            comments,
            u.name as reviewer_name
           FROM \`ProjectReview\` pr
           LEFT JOIN \`User\` u ON pr.reviewer_id = u.id
           WHERE project_id = ?
           ORDER BY review_date DESC`,
          [projectId]
        );
        
        // 10. 获取创建者信息用于成果
        for (const achievement of achievements) {
          if (achievement.created_by) {
            const [creators] = await pool.query(
              'SELECT name FROM `User` WHERE id = ?',
              [achievement.created_by]
            );
            if (creators.length > 0) {
              achievement.author = creators[0].name;
            }
          }
        }
        
        // 构建响应数据
        const responseData = {
          success: true,
          data: {
            project: project,
            stages: stages.map(stage => ({
              key: `stage_${stage.stage_number}`,
              title: stage.stage_name,
              description: stage.description,
              status: stage.status,
              estimatedTime: stage.planned_end_date ? 
                `预计 ${stage.planned_end_date} 完成` : '未设定',
              actualTime: stage.actual_end_date || null,
              completed: stage.status === 'completed' || stage.status === 'approved',
              current: stage.status === 'in_progress' || stage.status === 'under_review',
              pending: stage.status === 'not_started' || stage.status === 'delayed'
            })),
            expenditures: expenditures.map(exp => ({
              id: exp.id,
              date: exp.expense_date,
              category: exp.category,
              purpose: exp.description || exp.item_name,
              amount: exp.amount,
              status: exp.status,
              payee: exp.payee,
              review_comment: exp.review_comment
            })),
            achievements: achievements.map(ach => ({
              id: ach.id,
              type: ach.type,
              title: ach.title,
              description: ach.description,
              date: ach.achievement_date,
              author: ach.author || '项目组',
              status: ach.status
            })),
            notifications: notifications.map(notif => ({
              id: notif.id,
              type: notif.type,
              title: notif.title,
              content: notif.content,
              priority: notif.priority,
              is_read: notif.is_read,
              created_at: notif.created_at
            })),
            reviews: reviews,
            budget_summary: {
              total: totalBudget,
              used: usedAmount,
              balance: totalBudget - usedAmount
            }
          }
        };
        
        console.log(`✅ 获取项目进度成功，数据量:`, {
          阶段数: stages.length,
          支出记录: expenditures.length,
          成果数: achievements.length,
          通知数: notifications.length
        });
        
        sendResponse(res, 200, responseData);
        
      } catch (error) {
        console.error('进度API错误:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取项目进度失败',
          message: error.message
        });
      }
      return;
    }
    
    // ==================== 项目详情API（放在进度API之后） ====================
    
    // 获取单个项目详情
    if ((pathname.startsWith('/api/project/') || pathname.startsWith('/api/projects/')) && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 提取项目ID
      let projectId;
      if (pathname.startsWith('/api/project/')) {
        projectId = pathname.replace('/api/project/', '');
      } else {
        projectId = pathname.replace('/api/projects/', '');
      }
      
      // 检查是否包含/progress，如果是，已经在上面的代码处理了
      if (projectId.includes('/progress')) {
        // 这里不应该到达，因为进度API已经在上面处理了
        console.log('⚠️ 路径包含/progress，但进度API未匹配，路径:', pathname);
        sendResponse(res, 404, {
          success: false,
          error: 'API路径错误',
          received_path: pathname
        });
        return;
      }
      
      console.log('📋 处理项目详情API，项目ID:', projectId);
      
      try {
        // 获取项目基本信息
        const [projects] = await pool.query(
          'SELECT * FROM `Project` WHERE id = ?',
          [projectId]
        );
        
        if (projects.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '项目未找到'
          });
          return;
        }
        
        const project = projects[0];
        
        // 检查权限
        if (!checkPermission(user.role, ['admin', 'assistant'])) {
          const [memberCheck] = await pool.query(
            'SELECT id FROM `ProjectMember` WHERE project_id = ? AND user_id = ?',
            [projectId, user.id]
          );
          if (project.applicant_id !== user.id && memberCheck.length === 0) {
            sendResponse(res, 403, {
              success: false,
              error: '没有权限查看此项目'
            });
            return;
          }
        }
        
        // 获取项目成员
        const [members] = await pool.query(
          `SELECT u.id, u.username, u.email, u.role, pm.role as member_role, pm.join_date
           FROM \`ProjectMember\` pm
           JOIN \`User\` u ON pm.user_id = u.id
           WHERE pm.project_id = ?`,
          [projectId]
        );
        
        // 获取项目预算
        const [budgets] = await pool.query(
          'SELECT * FROM `ProjectBudget` WHERE project_id = ?',
          [projectId]
        );
        
        sendResponse(res, 200, {
          success: true,
          data: {
            project: project,
            members: members,
            budgets: budgets
          }
        });
      } catch (error) {
        console.error('获取项目详情失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取项目详情失败',
          message: error.message
        });
      }
      return;
    }
    
    // 更新项目
    if ((pathname.startsWith('/api/project/') || pathname.startsWith('/api/projects/')) && req.method === 'PUT') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 提取项目ID
      let projectId;
      if (pathname.startsWith('/api/project/')) {
        projectId = pathname.replace('/api/project/', '');
      } else {
        projectId = pathname.replace('/api/projects/', '');
      }
      
      try {
        // 检查项目是否存在
        const [projects] = await pool.query(
          'SELECT * FROM `Project` WHERE id = ?',
          [projectId]
        );
        
        if (projects.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '项目未找到'
          });
          return;
        }
        
        const project = projects[0];
        
        // 检查权限：只有项目申请人或管理员可以更新
        const isOwner = project.applicant_id === user.id;
        const isAdmin = checkPermission(user.role, 'admin');
        
        if (!isOwner && !isAdmin) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限更新此项目',
            details: {
              userId: user.id,
              applicantId: project.applicant_id,
              userRole: user.role,
              isOwner: isOwner,
              isAdmin: isAdmin
            }
          });
          return;
        }
        
        const body = await parseRequestBody(req);
        
        console.log('🔄 更新项目请求:', {
          projectId: projectId,
          userId: user.id,
          userRole: user.role,
          data: body
        });
        
        // 构建更新字段
        const updateFields = [];
        const updateValues = [];
        
        // 允许更新的字段
        const allowedFields = [
          'title', 'category', 'research_field', 'keywords', 'abstract',
          'background', 'objectives', 'methodology', 'expected_outcomes',
          'budget_total', 'duration_months', 'status', 'start_date', 'end_date',
          'current_stage'
        ];
        
        allowedFields.forEach(field => {
          if (body[field] !== undefined) {
            updateFields.push(`${field} = ?`);
            updateValues.push(body[field]);
          }
        });
        
        // 如果没有更新数据
        if (updateFields.length === 0) {
          sendResponse(res, 400, {
            success: false,
            error: '没有提供更新数据'
          });
          return;
        }
        
        updateValues.push(projectId);
        
        const updateSql = `UPDATE \`Project\` SET ${updateFields.join(', ')} WHERE id = ?`;
        
        console.log('更新项目SQL:', updateSql);
        console.log('参数:', updateValues);
        
        await pool.query(updateSql, updateValues);
        
        sendResponse(res, 200, {
          success: true,
          message: '项目更新成功',
          id: projectId
        });
        
      } catch (error) {
        console.error('更新项目失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '更新项目失败',
          message: error.message,
          sqlMessage: error.sqlMessage
        });
      }
      return;
    }
    
    // 删除项目API
    if ((pathname.startsWith('/api/project/') || pathname.startsWith('/api/projects/')) && req.method === 'DELETE') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 提取项目ID
      let projectId;
      if (pathname.startsWith('/api/project/')) {
        projectId = pathname.replace('/api/project/', '');
      } else {
        projectId = pathname.replace('/api/projects/', '');
      }
      
      console.log('🗑️ 删除项目请求:', {
        projectId: projectId,
        userId: user.id,
        userRole: user.role
      });
      
      try {
        // 检查项目是否存在
        const [projects] = await pool.query(
          'SELECT * FROM `Project` WHERE id = ?',
          [projectId]
        );
        
        if (projects.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '项目未找到'
          });
          return;
        }
        
        const project = projects[0];
        
        // 检查权限：只有项目申请人、管理员或助理可以删除
        const isOwner = project.applicant_id === user.id;
        const isAdmin = checkPermission(user.role, 'admin');
        const isAssistant = checkPermission(user.role, 'assistant');
        
        if (!isOwner && !isAdmin && !isAssistant) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限删除此项目',
            details: {
              userId: user.id,
              applicantId: project.applicant_id,
              userRole: user.role,
              projectStatus: project.status
            }
          });
          return;
        }
        
        // 检查项目状态：只有草稿状态可以删除
        if (project.status !== 'draft') {
          sendResponse(res, 409, {
            success: false,
            error: '只能删除草稿状态的项目',
            currentStatus: project.status,
            allowedStatus: 'draft'
          });
          return;
        }
        
        console.log('✅ 验证通过，开始删除项目...');
        
        // 删除项目成员
        await pool.query('DELETE FROM `ProjectMember` WHERE project_id = ?', [projectId]);
        
        // 删除项目预算
        await pool.query('DELETE FROM `ProjectBudget` WHERE project_id = ?', [projectId]);
        
        // 删除项目
        const [result] = await pool.query('DELETE FROM `Project` WHERE id = ?', [projectId]);
        
        console.log('✅ 项目删除成功，影响行数:', result.affectedRows);
        
        sendResponse(res, 200, {
          success: true,
          message: '项目删除成功',
          id: projectId
        });
        
      } catch (error) {
        console.error('删除项目失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '删除项目失败',
          message: error.message,
          sqlMessage: error.sqlMessage
        });
      }
      return;
    }
    
    // 2. 创建项目阶段记录
    if (pathname.startsWith('/api/projects/') && pathname.endsWith('/stages') && req.method === 'POST') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 只有管理员和科研助理可以设置项目阶段
      if (!checkPermission(user.role, ['admin', 'assistant'])) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限设置项目阶段'
        });
        return;
      }
      
      const pathParts = pathname.split('/');
      const projectId = pathParts[pathParts.length - 2];
      const body = await parseRequestBody(req);
      
      try {
        // 验证项目存在
        const [projects] = await pool.query('SELECT id FROM `Project` WHERE id = ?', [projectId]);
        if (projects.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '项目未找到'
          });
          return;
        }
        
        // 创建新阶段
        const stageId = randomUUID();
        const sql = `
          INSERT INTO \`ProjectStage\` (
            id, project_id, stage_number, stage_name, description,
            start_date, planned_end_date, required_deliverables,
            review_required, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        const params = [
          stageId,
          projectId,
          body.stage_number,
          body.stage_name,
          body.description,
          body.start_date,
          body.planned_end_date,
          body.required_deliverables ? JSON.stringify(body.required_deliverables) : null,
          body.review_required !== undefined ? body.review_required : true,
          body.status || 'not_started'
        ];
        
        await pool.query(sql, params);
        
        sendResponse(res, 201, {
          success: true,
          message: '项目阶段创建成功',
          stage_id: stageId
        });
        
      } catch (error) {
        console.error('创建项目阶段失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '创建项目阶段失败',
          message: error.message
        });
      }
      return;
    }
    
    // 3. 更新项目阶段状态
    if (pathname.startsWith('/api/projects/') && pathname.includes('/stages/') && req.method === 'PUT') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const pathParts = pathname.split('/');
      const projectId = pathParts[pathParts.length - 3];
      const stageId = pathParts[pathParts.length - 1];
      const body = await parseRequestBody(req);
      
      try {
        // 检查权限：项目申请人或管理员/助理
        const [projects] = await pool.query('SELECT applicant_id FROM `Project` WHERE id = ?', [projectId]);
        if (projects.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '项目未找到'
          });
          return;
        }
        
        const project = projects[0];
        const isOwner = project.applicant_id === user.id;
        const hasAdminAccess = checkPermission(user.role, ['admin', 'assistant']);
        
        if (!isOwner && !hasAdminAccess) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限更新项目阶段'
          });
          return;
        }
        
        // 构建更新字段
        const updateFields = [];
        const updateValues = [];
        
        const allowedFields = ['status', 'actual_end_date', 'description'];
        allowedFields.forEach(field => {
          if (body[field] !== undefined) {
            updateFields.push(`${field} = ?`);
            updateValues.push(body[field]);
          }
        });
        
        if (body.status === 'completed' && body.actual_end_date === undefined) {
          updateFields.push('actual_end_date = ?');
          updateValues.push(new Date().toISOString().split('T')[0]);
        }
        
        if (updateFields.length === 0) {
          sendResponse(res, 400, {
            success: false,
            error: '没有提供更新数据'
          });
          return;
        }
        
        updateValues.push(stageId);
        
        const updateSql = `UPDATE \`ProjectStage\` SET ${updateFields.join(', ')} WHERE id = ?`;
        
        await pool.query(updateSql, updateValues);
        
        // 如果阶段完成，更新项目当前阶段
        if (body.status === 'completed') {
          const [stageResult] = await pool.query(
            'SELECT stage_number FROM `ProjectStage` WHERE id = ?',
            [stageId]
          );
          if (stageResult.length > 0) {
            const nextStage = stageResult[0].stage_number + 1;
            await pool.query(
              'UPDATE `Project` SET current_stage = ? WHERE id = ?',
              [nextStage, projectId]
            );
          }
        }
        
        sendResponse(res, 200, {
          success: true,
          message: '项目阶段更新成功'
        });
        
      } catch (error) {
        console.error('更新项目阶段失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '更新项目阶段失败',
          message: error.message
        });
      }
      return;
    }
    
    // ==================== 用户管理API ====================
    
    if ((pathname === '/api/user' || pathname === '/api/users') && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 只有管理员可以查看所有用户
      if (!checkPermission(user.role, ['admin', 'assistant'])) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限查看用户列表'
        });
        return;
      }
      
      const { limit = 100, page = 1, role, search } = query;
      const offset = (page - 1) * limit;
      
      try {
        let sql = 'SELECT id, username, email, role, created_at, last_login FROM `User` WHERE 1=1';
        let countSql = 'SELECT COUNT(*) as total FROM `User` WHERE 1=1';
        const params = [];
        const countParams = [];
        
        if (role) {
          sql += ' AND role = ?';
          countSql += ' AND role = ?';
          params.push(role);
          countParams.push(role);
        }
        
        if (search) {
          sql += ' AND (username LIKE ? OR email LIKE ?)';
          countSql += ' AND (username LIKE ? OR email LIKE ?)';
          params.push(`%${search}%`, `%${search}%`);
          countParams.push(`%${search}%`, `%${search}%`);
        }
        
        sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);
        
        const [rows] = await pool.query(sql, params);
        const [totalResult] = await pool.query(countSql, countParams);
        const total = totalResult[0].total;
        
        sendResponse(res, 200, {
          success: true,
          data: rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        });
      } catch (error) {
        sendResponse(res, 500, {
          success: false,
          error: '获取用户列表失败',
          message: error.message
        });
      }
      return;
    }
    
    // ==================== 项目相关API（用于获取用户可用的项目列表） ====================
    
    // 获取用户可参与的项目列表（用于成果创建时的项目选择）
    if (pathname === '/api/projects' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      try {
        // 获取用户创建的项目和参与的项目
        const sql = `
          SELECT 
            p.id, 
            p.title, 
            p.project_code,
            p.status,
            'owner' as relation
          FROM \`Project\` p
          WHERE p.applicant_id = ?
          UNION
          SELECT 
            p.id, 
            p.title, 
            p.project_code,
            p.status,
            'member' as relation
          FROM \`Project\` p
          JOIN \`ProjectMember\` pm ON p.id = pm.project_id
          WHERE pm.user_id = ?
          ORDER BY relation DESC, title ASC
        `;
        
        const [rows] = await pool.query(sql, [user.id, user.id]);
        
        sendResponse(res, 200, {
          success: true,
          data: rows
        });
        
      } catch (error) {
        console.error('获取用户项目失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取项目列表失败',
          message: error.message
        });
      }
      return;
    }
    
    // ==================== 成果管理API ====================
    
    // 1. 获取成果列表
    if (pathname === '/api/achievements' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const { page = 1, limit = 10, type, status, search } = query;
      const offset = (page - 1) * limit;
      
      try {
        let sql = `
          SELECT pa.*, p.title as project_title, p.project_code,
                 u1.name as created_by_name, u2.name as verified_by_name
          FROM \`ProjectAchievement\` pa
          LEFT JOIN \`Project\` p ON pa.project_id = p.id
          LEFT JOIN \`User\` u1 ON pa.created_by = u1.id
          LEFT JOIN \`User\` u2 ON pa.verified_by = u2.id
          WHERE pa.created_by = ?
        `;
        let countSql = 'SELECT COUNT(*) as total FROM `ProjectAchievement` WHERE created_by = ?';
        const params = [user.id];
        const countParams = [user.id];
        
        // 管理员可以查看所有成果
        if (checkPermission(user.role, ['admin', 'assistant'])) {
          sql = sql.replace('WHERE pa.created_by = ?', 'WHERE 1=1');
          countSql = countSql.replace('WHERE created_by = ?', 'WHERE 1=1');
          params.shift();
          countParams.shift();
        }
        
        // 类型过滤
        if (type) {
          sql += ' AND pa.type = ?';
          countSql += ' AND type = ?';
          params.push(type);
          countParams.push(type);
        }
        
        // 状态过滤
        if (status) {
          sql += ' AND pa.status = ?';
          countSql += ' AND status = ?';
          params.push(status);
          countParams.push(status);
        }
        
        // 搜索
        if (search) {
          sql += ' AND (pa.title LIKE ? OR pa.keywords LIKE ? OR pa.description LIKE ?)';
          countSql += ' AND (title LIKE ? OR keywords LIKE ? OR description LIKE ?)';
          const searchParam = `%${search}%`;
          params.push(searchParam, searchParam, searchParam);
          countParams.push(searchParam, searchParam, searchParam);
        }
        
        sql += ' ORDER BY pa.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);
        
        const [rows] = await pool.query(sql, params);
        const [totalResult] = await pool.query(countSql, countParams);
        const total = totalResult[0].total;
        
        sendResponse(res, 200, {
          success: true,
          data: rows,
          total: total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        });
        
      } catch (error) {
        console.error('获取成果列表失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取成果列表失败',
          message: error.message
        });
      }
      return;
    }
    
    // 2. 创建项目成果
    if (pathname === '/api/achievements' && req.method === 'POST') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      try {
        const body = await parseRequestBody(req);
        
        console.log('📥 创建成果请求数据:', body);
        
        // 验证必填字段
        if (!body.title || !body.type) {
          sendResponse(res, 400, {
            success: false,
            error: '成果标题和成果类型是必填字段'
          });
          return;
        }
        
        // 验证项目是否存在（如果有项目ID）
        if (body.project_id) {
          const [projects] = await pool.query(
            'SELECT id, applicant_id FROM `Project` WHERE id = ?',
            [body.project_id]
          );
          
          if (projects.length === 0) {
            sendResponse(res, 404, {
              success: false,
              error: '项目不存在'
            });
            return;
          }
          
          const project = projects[0];
          
          // 检查权限：只有项目成员或管理员可以创建成果
          const isOwner = project.applicant_id === user.id;
          const isAdmin = checkPermission(user.role, ['admin', 'assistant']);
          const [isMember] = await pool.query(
            'SELECT id FROM `ProjectMember` WHERE project_id = ? AND user_id = ?',
            [body.project_id, user.id]
          );
          
          if (!isOwner && !isAdmin && isMember.length === 0) {
            sendResponse(res, 403, {
              success: false,
              error: '没有权限为此项目创建成果'
            });
            return;
          }
        }
        
        // 生成成果ID
        const achievementId = randomUUID();
        
        // 插入成果记录
        const sql = `
          INSERT INTO \`ProjectAchievement\` (
            id, project_id, type, title, description, achievement_date,
            keywords, authors, publisher, publication_date, publication_source,
            impact_factor, patent_number, patent_type, patent_authority,
            award_name, award_level, award_date, award_organization,
            attachment_urls, external_link,
            status, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        const params = [
          achievementId,
          body.project_id || null,
          body.type,
          body.title,
          body.description || '',
          body.achievement_date || new Date().toISOString().split('T')[0],
          body.keywords || '',
          body.authors || '',
          body.publisher || '',
          body.publication_date || null,
          body.publication_source || '',
          body.impact_factor || null,
          body.patent_number || '',
          body.patent_type || '',
          body.patent_authority || '',
          body.award_name || '',
          body.award_level || '',
          body.award_date || null,
          body.award_organization || '',
          body.attachment_urls || '[]',
          body.external_link || '',
          body.status || 'draft',
          user.id
        ];
        
        console.log('📝 执行创建成果SQL:', sql);
        console.log('📝 参数:', params);
        
        await pool.query(sql, params);
        
        // 获取创建的成果详情
        const [achievements] = await pool.query(
          `SELECT pa.*, p.title as project_title, p.project_code,
                  u.name as created_by_name
           FROM \`ProjectAchievement\` pa
           LEFT JOIN \`Project\` p ON pa.project_id = p.id
           LEFT JOIN \`User\` u ON pa.created_by = u.id
           WHERE pa.id = ?`,
          [achievementId]
        );
        
        sendResponse(res, 201, {
          success: true,
          message: '成果创建成功',
          data: achievements[0]
        });
        
      } catch (error) {
        console.error('创建成果失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '创建成果失败',
          message: error.message,
          sqlMessage: error.sqlMessage
        });
      }
      return;
    }
    
    // 3. 获取单个成果详情
    if (pathname.startsWith('/api/achievements/') && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const achievementId = pathname.replace('/api/achievements/', '');
      
      console.log('🔍 获取成果详情，ID:', achievementId);
      
      try {
        // 查询成果详情
        const sql = `
          SELECT pa.*, p.title as project_title, p.project_code, p.applicant_id,
                 u1.name as created_by_name, u1.email as created_by_email,
                 u2.name as verified_by_name, u2.email as verified_by_email
          FROM \`ProjectAchievement\` pa
          LEFT JOIN \`Project\` p ON pa.project_id = p.id
          LEFT JOIN \`User\` u1 ON pa.created_by = u1.id
          LEFT JOIN \`User\` u2 ON pa.verified_by = u2.id
          WHERE pa.id = ?
        `;
        
        const [achievements] = await pool.query(sql, [achievementId]);
        
        if (achievements.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '成果不存在'
          });
          return;
        }
        
        const achievement = achievements[0];
        
        console.log('📊 找到成果:', {
          id: achievement.id,
          title: achievement.title,
          project_id: achievement.project_id,
          created_by: achievement.created_by,
          user_id: user.id
        });
        
        // 检查权限
        const isOwner = achievement.created_by === user.id;
        const isProjectOwner = achievement.applicant_id === user.id;
        const isAdmin = checkPermission(user.role, ['admin', 'assistant']);
        
        // 检查是否是项目成员（如果有项目）
        let isMember = false;
        if (achievement.project_id) {
          const [memberCheck] = await pool.query(
            'SELECT id FROM `ProjectMember` WHERE project_id = ? AND user_id = ?',
            [achievement.project_id, user.id]
          );
          isMember = memberCheck.length > 0;
        }
        
        console.log('🔐 权限检查:', {
          isOwner, isProjectOwner, isAdmin, isMember,
          userRole: user.role,
          achievementOwner: achievement.created_by,
          projectOwner: achievement.applicant_id
        });
        
        if (!isOwner && !isProjectOwner && !isAdmin && !isMember) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限查看此成果'
          });
          return;
        }
        
        // 解析附件URL
        let attachments = [];
        if (achievement.attachment_urls) {
          try {
            attachments = JSON.parse(achievement.attachment_urls);
          } catch (e) {
            console.error('解析附件失败:', e);
            attachments = [];
          }
        }
        
        // 构建响应数据
        const responseData = {
          ...achievement,
          attachments: attachments,
          permissions: {
            can_edit: isOwner || isAdmin,
            can_delete: isOwner || isAdmin,
            can_verify: isAdmin,
            can_comment: true
          }
        };
        
        console.log('✅ 成功获取成果详情');
        
        sendResponse(res, 200, {
          success: true,
          data: responseData
        });
        
      } catch (error) {
        console.error('获取成果详情失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取成果详情失败',
          message: error.message
        });
      }
      return;
    }
    
    // 4. 更新成果信息
    if (pathname.startsWith('/api/achievements/') && req.method === 'PUT') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const achievementId = pathname.replace('/api/achievements/', '');
      const body = await parseRequestBody(req);
      
      console.log('🔄 更新成果请求:', {
        achievementId: achievementId,
        userId: user.id,
        userRole: user.role,
        data: body
      });
      
      try {
        // 检查成果是否存在
        const [achievements] = await pool.query(
          'SELECT * FROM `ProjectAchievement` WHERE id = ?',
          [achievementId]
        );
        
        if (achievements.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '成果不存在'
          });
          return;
        }
        
        const achievement = achievements[0];
        
        // 检查权限：只有创建者或管理员可以修改
        const isOwner = achievement.created_by === user.id;
        const isAdmin = checkPermission(user.role, ['admin', 'assistant']);
        
        if (!isOwner && !isAdmin) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限修改此成果'
          });
          return;
        }
        
        // 检查状态：只有草稿或退回状态的成果可以修改（管理员除外）
        if (!isAdmin && !['draft', 'returned'].includes(achievement.status)) {
          sendResponse(res, 409, {
            success: false,
            error: '当前状态不允许修改',
            current_status: achievement.status
          });
          return;
        }
        
        // 构建更新字段
        const updateFields = [];
        const updateValues = [];
        
        // 允许更新的字段
        const allowedFields = [
          'title', 'description', 'achievement_date', 'keywords',
          'authors', 'publisher', 'publication_date', 'publication_source',
          'impact_factor', 'patent_number', 'patent_type', 'patent_authority',
          'award_name', 'award_level', 'award_date', 'award_organization',
          'attachment_urls', 'external_link', 'status', 'project_id'
        ];
        
        allowedFields.forEach(field => {
          if (body[field] !== undefined) {
            updateFields.push(`${field} = ?`);
            updateValues.push(body[field]);
          }
        });
        
        // 提交审核时更新状态
        if (body.submit_for_review === true) {
          updateFields.push('status = ?');
          updateValues.push('under_review');
          updateFields.push('submitted_at = NOW()');
        }
        
        if (updateFields.length === 0) {
          sendResponse(res, 400, {
            success: false,
            error: '没有提供更新数据'
          });
          return;
        }
        
        updateFields.push('submitted_at = NOW()');
        updateValues.push(achievementId);
        
        const updateSql = `UPDATE \`ProjectAchievement\` SET ${updateFields.join(', ')} WHERE id = ?`;
        
        console.log('📝 执行更新SQL:', updateSql);
        console.log('📝 参数:', updateValues);
        
        await pool.query(updateSql, updateValues);
        
        sendResponse(res, 200, {
          success: true,
          message: '成果更新成功',
          achievement_id: achievementId
        });
        
      } catch (error) {
        console.error('更新成果失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '更新成果失败',
          message: error.message,
          sqlMessage: error.sqlMessage
        });
      }
      return;
    }
    
    // 5. 删除成果
    if (pathname.startsWith('/api/achievements/') && req.method === 'DELETE') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const achievementId = pathname.replace('/api/achievements/', '');
      
      console.log('🗑️ 删除成果请求:', {
        achievementId: achievementId,
        userId: user.id,
        userRole: user.role
      });
      
      try {
        // 检查成果是否存在
        const [achievements] = await pool.query(
          'SELECT * FROM `ProjectAchievement` WHERE id = ?',
          [achievementId]
        );
        
        if (achievements.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '成果不存在'
          });
          return;
        }
        
        const achievement = achievements[0];
        
        // 检查权限：只有创建者或管理员可以删除
        const isOwner = achievement.created_by === user.id;
        const isAdmin = checkPermission(user.role, ['admin', 'assistant']);
        
        if (!isOwner && !isAdmin) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限删除此成果'
          });
          return;
        }
        
        // 检查状态：只有草稿状态的成果可以删除（管理员除外）
        if (!isAdmin && achievement.status !== 'draft') {
          sendResponse(res, 409, {
            success: false,
            error: '只能删除草稿状态的成果',
            current_status: achievement.status
          });
          return;
        }
        
        console.log('✅ 验证通过，开始删除成果...');
        
        // 删除成果
        const [result] = await pool.query('DELETE FROM `ProjectAchievement` WHERE id = ?', [achievementId]);
        
        console.log('✅ 成果删除成功，影响行数:', result.affectedRows);
        
        sendResponse(res, 200, {
          success: true,
          message: '成果删除成功',
          achievement_id: achievementId
        });
        
      } catch (error) {
        console.error('删除成果失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '删除成果失败',
          message: error.message,
          sqlMessage: error.sqlMessage
        });
      }
      return;
    }
    
    // 6. 提交成果审核
    if (pathname.startsWith('/api/achievements/') && pathname.includes('/submit') && req.method === 'POST') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const achievementId = pathname.replace('/api/achievements/', '').replace('/submit', '');
      
      console.log('📨 提交成果审核:', achievementId);
      
      try {
        const [achievements] = await pool.query(
          'SELECT * FROM `ProjectAchievement` WHERE id = ?',
          [achievementId]
        );
        
        if (achievements.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '成果不存在'
          });
          return;
        }
        
        const achievement = achievements[0];
        
        // 检查权限：只有创建者或管理员可以提交审核
        const isOwner = achievement.created_by === user.id;
        const isAdmin = checkPermission(user.role, ['admin', 'assistant']);
        
        if (!isOwner && !isAdmin) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限提交审核'
          });
          return;
        }
        
        // 检查当前状态
        if (!['draft', 'returned'].includes(achievement.status)) {
          sendResponse(res, 409, {
            success: false,
            error: '当前状态不允许提交审核',
            current_status: achievement.status
          });
          return;
        }
        
        // 更新状态为审核中
        await pool.query(
          'UPDATE `ProjectAchievement` SET status = ?, submitted_at = NOW() WHERE id = ?',
          ['under_review', achievementId]
        );
        
        sendResponse(res, 200, {
          success: true,
          message: '成果已提交审核',
          achievement_id: achievementId,
          new_status: 'under_review'
        });
        
      } catch (error) {
        console.error('提交审核失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '提交审核失败',
          message: error.message
        });
      }
      return;
    }
    
    // 7. 审核成果
    if (pathname.startsWith('/api/achievements/') && pathname.includes('/review') && req.method === 'POST') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 只有管理员和评审员可以审核成果
      if (!checkPermission(user.role, ['admin', 'assistant', 'reviewer'])) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限审核成果'
        });
        return;
      }
      
      const achievementId = pathname.replace('/api/achievements/', '').replace('/review', '');
      const body = await parseRequestBody(req);
      
      console.log('📝 审核成果请求:', {
        achievementId: achievementId,
        reviewerId: user.id,
        action: body.action,
        reason: body.reason
      });
      
      if (!body.action || !['approve', 'reject', 'return'].includes(body.action)) {
        sendResponse(res, 400, {
          success: false,
          error: '审核动作不正确，必须是 approve、reject 或 return'
        });
        return;
      }
      
      if (body.action === 'reject' && !body.reason) {
        sendResponse(res, 400, {
          success: false,
          error: '驳回成果必须提供理由'
        });
        return;
      }
      
      try {
        const [achievements] = await pool.query(
          'SELECT * FROM `ProjectAchievement` WHERE id = ?',
          [achievementId]
        );
        
        if (achievements.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '成果不存在'
          });
          return;
        }
        
        const achievement = achievements[0];
        
        // 检查当前状态是否为审核中
        if (achievement.status !== 'under_review') {
          sendResponse(res, 409, {
            success: false,
            error: '当前状态不允许审核',
            current_status: achievement.status
          });
          return;
        }
        
        // 确定新的状态
        let newStatus;
        let statusText;
        switch (body.action) {
          case 'approve':
            newStatus = 'approved';
            statusText = '已通过';
            break;
          case 'reject':
            newStatus = 'rejected';
            statusText = '已驳回';
            break;
          case 'return':
            newStatus = 'returned';
            statusText = '已退回修改';
            break;
        }
        
        // 更新成果状态
        await pool.query(
          'UPDATE `ProjectAchievement` SET status = ?, verified_by = ?, verified_at = NOW(), verification_comment = ? WHERE id = ?',
          [newStatus, user.id, body.reason || body.comments || '', achievementId]
        );
        
        sendResponse(res, 200, {
          success: true,
          message: `成果${statusText}`,
          achievement_id: achievementId,
          new_status: newStatus,
          review_action: body.action
        });
        
      } catch (error) {
        console.error('审核成果失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '审核成果失败',
          message: error.message
        });
      }
      return;
    }
    
    // 8. 获取项目下的所有成果
    if (pathname.startsWith('/api/projects/') && pathname.includes('/achievements') && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const pathParts = pathname.split('/');
      const projectId = pathParts[pathParts.length - 2];
      
      const { type, status, limit = 50, page = 1 } = query;
      const offset = (page - 1) * limit;
      
      console.log('🔍 获取项目成果:', {
        projectId: projectId,
        type: type,
        status: status,
        userId: user.id
      });
      
      try {
        // 检查项目是否存在和权限
        const [projects] = await pool.query(
          'SELECT * FROM `Project` WHERE id = ?',
          [projectId]
        );
        
        if (projects.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '项目不存在'
          });
          return;
        }
        
        const project = projects[0];
        
        // 检查权限
        const isOwner = project.applicant_id === user.id;
        const isAdmin = checkPermission(user.role, ['admin', 'assistant']);
        const [isMember] = await pool.query(
          'SELECT id FROM `ProjectMember` WHERE project_id = ? AND user_id = ?',
          [projectId, user.id]
        );
        
        if (!isOwner && !isAdmin && isMember.length === 0) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限查看此项目的成果'
          });
          return;
        }
        
        // 构建查询
        let sql = `
          SELECT pa.*, u.name as created_by_name
          FROM \`ProjectAchievement\` pa
          LEFT JOIN \`User\` u ON pa.created_by = u.id
          WHERE pa.project_id = ?
        `;
        
        let countSql = 'SELECT COUNT(*) as total FROM `ProjectAchievement` WHERE project_id = ?';
        const params = [projectId];
        const countParams = [projectId];
        
        if (type) {
          sql += ' AND pa.type = ?';
          countSql += ' AND type = ?';
          params.push(type);
          countParams.push(type);
        }
        
        if (status) {
          sql += ' AND pa.status = ?';
          countSql += ' AND status = ?';
          params.push(status);
          countParams.push(status);
        }
        
        sql += ' ORDER BY pa.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);
        
        const [rows] = await pool.query(sql, params);
        const [totalResult] = await pool.query(countSql, countParams);
        const total = totalResult[0].total;
        
        sendResponse(res, 200, {
          success: true,
          project_id: projectId,
          project_title: project.title,
          data: rows,
          total: total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        });
        
      } catch (error) {
        console.error('获取项目成果失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取项目成果失败',
          message: error.message
        });
      }
      return;
    }
    
    // 9. 成果统计API
    if (pathname === '/api/achievements/stats' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      try {
        let statsQuery = '';
        let statsParams = [];
        
        if (checkPermission(user.role, ['admin', 'assistant'])) {
          // 管理员查看所有统计数据
          statsQuery = `
            SELECT 
              COUNT(*) as total,
              SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
              SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as under_review,
              SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
              SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returned,
              SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
              COUNT(DISTINCT project_id) as project_count,
              COUNT(DISTINCT created_by) as user_count
            FROM \`ProjectAchievement\`
          `;
        } else {
          // 普通用户查看自己的统计数据
          statsQuery = `
            SELECT 
              COUNT(*) as total,
              SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
              SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as under_review,
              SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
              SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returned,
              SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
              COUNT(DISTINCT project_id) as project_count
            FROM \`ProjectAchievement\`
            WHERE created_by = ?
          `;
          statsParams = [user.id];
        }
        
        const [stats] = await pool.query(statsQuery, statsParams);
        
        // 按类型统计
        let typeQuery = '';
        if (checkPermission(user.role, ['admin', 'assistant'])) {
          typeQuery = `
            SELECT type, COUNT(*) as count 
            FROM \`ProjectAchievement\`
            GROUP BY type
            ORDER BY count DESC
          `;
        } else {
          typeQuery = `
            SELECT type, COUNT(*) as count 
            FROM \`ProjectAchievement\`
            WHERE created_by = ?
            GROUP BY type
            ORDER BY count DESC
          `;
          statsParams = [user.id];
        }
        
        const [typeStats] = await pool.query(typeQuery, statsParams);
        
        // 月度统计
        const monthlyQuery = `
          SELECT 
            DATE_FORMAT(created_at, '%Y-%m') as month,
            COUNT(*) as count
          FROM \`ProjectAchievement\`
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
          ${!checkPermission(user.role, ['admin', 'assistant']) ? 'AND created_by = ?' : ''}
          GROUP BY DATE_FORMAT(created_at, '%Y-%m')
          ORDER BY month
        `;
        
        const monthlyParams = checkPermission(user.role, ['admin', 'assistant']) ? [] : [user.id];
        const [monthlyStats] = await pool.query(monthlyQuery, monthlyParams);
        
        sendResponse(res, 200, {
          success: true,
          data: {
            overview: stats[0],
            by_type: typeStats,
            monthly: monthlyStats
          }
        });
        
      } catch (error) {
        console.error('获取成果统计失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取成果统计失败',
          message: error.message
        });
      }
      return;
    }
    // ==================== 成果转化API ====================

  // 1. 获取成果转化列表
  if (pathname === '/api/transfers' && req.method === 'GET') {
    const token = req.headers.authorization;
    const user = await verifyToken(token);
    
    if (!user) {
      sendResponse(res, 401, {
        success: false,
        error: '认证失败'
      });
      return;
    }
    
    const { page = 1, limit = 10, type, status, achievement_id, search } = query;
    const offset = (page - 1) * limit;
    
    try {
      // 构建查询SQL
      let sql = `
        SELECT 
          at.*,
          pa.title as achievement_title,
          pa.type as achievement_type,
          pa.project_id,
          p.title as project_title,
          p.project_code,
          u.name as created_by_name
        FROM \`AchievementTransfer\` at
        INNER JOIN \`ProjectAchievement\` pa ON at.achievement_id = pa.id
        LEFT JOIN \`Project\` p ON pa.project_id = p.id
        LEFT JOIN \`User\` u ON at.created_by = u.id
        WHERE at.created_by = ?
      `;
      
      let countSql = 'SELECT COUNT(*) as total FROM `AchievementTransfer` WHERE created_by = ?';
      const params = [user.id];
      const countParams = [user.id];
      
      // 管理员可以查看所有转化记录
      if (checkPermission(user.role, ['admin', 'assistant'])) {
        sql = sql.replace('WHERE at.created_by = ?', 'WHERE 1=1');
        countSql = countSql.replace('WHERE created_by = ?', 'WHERE 1=1');
        params.shift();
        countParams.shift();
      }
      
      // 按成果筛选
      if (achievement_id) {
        sql += ' AND at.achievement_id = ?';
        countSql += ' AND achievement_id = ?';
        params.push(achievement_id);
        countParams.push(achievement_id);
      }
      
      // 类型筛选
      if (type) {
        sql += ' AND at.transfer_type = ?';
        countSql += ' AND transfer_type = ?';
        params.push(type);
        countParams.push(type);
      }
      
      // 状态筛选
      if (status) {
        sql += ' AND at.transfer_status = ?';
        countSql += ' AND transfer_status = ?';
        params.push(status);
        countParams.push(status);
      }
      
      // 搜索
      if (search) {
        sql += ' AND (pa.title LIKE ? OR at.transferee LIKE ? OR at.contract_no LIKE ?)';
        countSql += ' AND EXISTS (SELECT 1 FROM `ProjectAchievement` pa WHERE pa.id = achievement_id AND (pa.title LIKE ? OR ?)) OR transferee LIKE ? OR contract_no LIKE ?';
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam);
        countParams.push(searchParam, searchParam, searchParam, searchParam);
      }
      
      sql += ' ORDER BY at.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);
      
      console.log('🔍 执行转化查询:', sql);
      console.log('🔍 查询参数:', params);
      
      const [rows] = await pool.query(sql, params);
      const [totalResult] = await pool.query(countSql, countParams);
      const total = totalResult[0].total;
      
      // 处理收入记录
      for (const transfer of rows) {
        if (transfer.income_records) {
          try {
            transfer.income_records = JSON.parse(transfer.income_records);
          } catch (e) {
            console.error('解析收入记录失败:', e);
            transfer.income_records = [];
          }
        }
      }
      
      sendResponse(res, 200, {
        success: true,
        data: rows,
        total: total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      });
      
    } catch (error) {
      console.error('获取成果转化列表失败:', error);
      sendResponse(res, 500, {
        success: false,
        error: '获取成果转化列表失败',
        message: error.message
      });
    }
    return;
  }

  // 2. 创建成果转化记录
  if (pathname === '/api/transfers' && req.method === 'POST') {
    const token = req.headers.authorization;
    const user = await verifyToken(token);
    
    if (!user) {
      sendResponse(res, 401, {
        success: false,
        error: '认证失败'
      });
      return;
    }
    
    try {
      const body = await parseRequestBody(req);
      
      console.log('📥 创建转化记录请求:', body);
      
      // 验证必填字段
      if (!body.achievement_id || !body.transfer_type || !body.transferee) {
        sendResponse(res, 400, {
          success: false,
          error: '成果ID、转化类型和受让方是必填字段'
        });
        return;
      }
      
      // 验证成果是否存在
      const [achievements] = await pool.query(
        'SELECT id, project_id, created_by, status FROM `ProjectAchievement` WHERE id = ?',
        [body.achievement_id]
      );
      
      if (achievements.length === 0) {
        sendResponse(res, 404, {
          success: false,
          error: '成果不存在'
        });
        return;
      }
      
      const achievement = achievements[0];
      
      // 检查权限：只有成果创建者或管理员可以创建转化记录
      const isOwner = achievement.created_by === user.id;
      const isAdmin = checkPermission(user.role, ['admin', 'assistant']);
      
      if (!isOwner && !isAdmin) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限为此成果创建转化记录'
        });
        return;
      }
      
      // 生成转化ID
      const transferId = randomUUID();
      
      // 插入转化记录
      const sql = `
        INSERT INTO \`AchievementTransfer\` (
          id, achievement_id, transfer_type, transferee, transfer_date,
          contract_no, contract_amount, actual_amount, transfer_status,
          description, contract_file, income_records, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      
      const params = [
        transferId,
        body.achievement_id,
        body.transfer_type,
        body.transferee,
        body.transfer_date || null,
        body.contract_no || null,
        body.contract_amount || null,
        body.actual_amount || null,
        body.transfer_status || 'negotiating',
        body.description || '',
        body.contract_file || '',
        body.income_records ? JSON.stringify(body.income_records) : null,
        user.id
      ];
      
      console.log('📝 执行插入转化记录SQL:', sql);
      console.log('📝 参数:', params);
      
      await pool.query(sql, params);
      
      // 如果转化状态是已完成，更新成果状态
      if (body.transfer_status === 'completed') {
        await pool.query(
          'UPDATE `ProjectAchievement` SET status = ? WHERE id = ?',
          ['transferred', body.achievement_id]
        );
      }
      
      // 获取新创建的转化记录详情
      const [newTransfers] = await pool.query(
        `SELECT 
          at.*,
          pa.title as achievement_title,
          pa.type as achievement_type,
          pa.project_id,
          p.title as project_title,
          p.project_code,
          u.name as created_by_name
        FROM \`AchievementTransfer\` at
        INNER JOIN \`ProjectAchievement\` pa ON at.achievement_id = pa.id
        LEFT JOIN \`Project\` p ON pa.project_id = p.id
        LEFT JOIN \`User\` u ON at.created_by = u.id
        WHERE at.id = ?`,
        [transferId]
      );
      
      sendResponse(res, 201, {
        success: true,
        message: '成果转化记录创建成功',
        data: newTransfers[0]
      });
      
    } catch (error) {
      console.error('创建成果转化记录失败:', error);
      sendResponse(res, 500, {
        success: false,
        error: '创建成果转化记录失败',
        message: error.message,
        sqlMessage: error.sqlMessage
      });
    }
    return;
  }

  // 3. 获取单个转化记录详情
  if (pathname.startsWith('/api/transfers/') && req.method === 'GET') {
    const token = req.headers.authorization;
    const user = await verifyToken(token);
    
    if (!user) {
      sendResponse(res, 401, {
        success: false,
        error: '认证失败'
      });
      return;
    }
    
    const transferId = pathname.replace('/api/transfers/', '');
    
    console.log('🔍 获取转化记录详情，ID:', transferId);
    
    try {
      const sql = `
        SELECT 
          at.*,
          pa.title as achievement_title,
          pa.type as achievement_type,
          pa.project_id,
          pa.description as achievement_description,
          pa.keywords as achievement_keywords,
          pa.achievement_date,
          pa.authors,
          pa.attachment_urls as achievement_attachments,
          p.title as project_title,
          p.project_code,
          u1.name as created_by_name,
          u2.name as applicant_name
        FROM \`AchievementTransfer\` at
        INNER JOIN \`ProjectAchievement\` pa ON at.achievement_id = pa.id
        LEFT JOIN \`Project\` p ON pa.project_id = p.id
        LEFT JOIN \`User\` u1 ON at.created_by = u1.id
        LEFT JOIN \`User\` u2 ON p.applicant_id = u2.id
        WHERE at.id = ?
      `;
      
      const [transfers] = await pool.query(sql, [transferId]);
      
      if (transfers.length === 0) {
        sendResponse(res, 404, {
          success: false,
          error: '转化记录不存在'
        });
        return;
      }
      
      const transfer = transfers[0];
      
      // 检查权限：只有创建者或管理员可以查看
      const isOwner = transfer.created_by === user.id;
      const isAdmin = checkPermission(user.role, ['admin', 'assistant']);
      
      if (!isOwner && !isAdmin) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限查看此转化记录'
        });
        return;
      }
      
      // 处理JSON字段
      if (transfer.income_records) {
        try {
          transfer.income_records = JSON.parse(transfer.income_records);
        } catch (e) {
          console.error('解析收入记录失败:', e);
          transfer.income_records = [];
        }
      }
      
      if (transfer.authors) {
        try {
          transfer.authors = JSON.parse(transfer.authors);
        } catch (e) {
          console.error('解析作者失败:', e);
          transfer.authors = [];
        }
      }
      
      if (transfer.achievement_attachments) {
        try {
          transfer.achievement_attachments = JSON.parse(transfer.achievement_attachments);
        } catch (e) {
          console.error('解析成果附件失败:', e);
          transfer.achievement_attachments = [];
        }
      }
      
      sendResponse(res, 200, {
        success: true,
        data: transfer
      });
      
    } catch (error) {
      console.error('获取转化记录详情失败:', error);
      sendResponse(res, 500, {
        success: false,
        error: '获取转化记录详情失败',
        message: error.message
      });
    }
    return;
  }

  // 4. 更新转化记录
  if (pathname.startsWith('/api/transfers/') && req.method === 'PUT') {
    const token = req.headers.authorization;
    const user = await verifyToken(token);
    
    if (!user) {
      sendResponse(res, 401, {
        success: false,
        error: '认证失败'
      });
      return;
    }
    
    const transferId = pathname.replace('/api/transfers/', '');
    const body = await parseRequestBody(req);
    
    console.log('🔄 更新转化记录:', transferId, body);
    
    try {
      // 检查转化记录是否存在
      const [transfers] = await pool.query(
        'SELECT * FROM `AchievementTransfer` WHERE id = ?',
        [transferId]
      );
      
      if (transfers.length === 0) {
        sendResponse(res, 404, {
          success: false,
          error: '转化记录不存在'
        });
        return;
      }
      
      const transfer = transfers[0];
      
      // 检查权限：只有创建者或管理员可以修改
      const isOwner = transfer.created_by === user.id;
      const isAdmin = checkPermission(user.role, ['admin', 'assistant']);
      
      if (!isOwner && !isAdmin) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限修改此转化记录'
        });
        return;
      }
      
      // 构建更新字段
      const updateFields = [];
      const updateValues = [];
      
      const allowedFields = [
        'transfer_type', 'transferee', 'transfer_date', 'contract_no',
        'contract_amount', 'actual_amount', 'transfer_status',
        'description', 'contract_file', 'income_records'
      ];
      
      allowedFields.forEach(field => {
        if (body[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          if (field === 'income_records') {
            updateValues.push(JSON.stringify(body[field]));
          } else {
            updateValues.push(body[field]);
          }
        }
      });
      
      if (updateFields.length === 0) {
        sendResponse(res, 400, {
          success: false,
          error: '没有提供更新数据'
        });
        return;
      }
      
      updateValues.push(transferId);
      
      const updateSql = `UPDATE \`AchievementTransfer\` SET ${updateFields.join(', ')} WHERE id = ?`;
      
      console.log('📝 执行更新SQL:', updateSql);
      console.log('📝 参数:', updateValues);
      
      await pool.query(updateSql, updateValues);
      
      // 如果转化状态发生变化，更新成果状态
      if (body.transfer_status) {
        if (body.transfer_status === 'completed') {
          await pool.query(
            'UPDATE `ProjectAchievement` SET status = ? WHERE id = ?',
            ['transferred', transfer.achievement_id]
          );
        }
      }
      
      sendResponse(res, 200, {
        success: true,
        message: '转化记录更新成功',
        transfer_id: transferId
      });
      
    } catch (error) {
      console.error('更新转化记录失败:', error);
      sendResponse(res, 500, {
        success: false,
        error: '更新转化记录失败',
        message: error.message,
        sqlMessage: error.sqlMessage
      });
    }
    return;
  }

  // 5. 删除转化记录
  if (pathname.startsWith('/api/transfers/') && req.method === 'DELETE') {
    const token = req.headers.authorization;
    const user = await verifyToken(token);
    
    if (!user) {
      sendResponse(res, 401, {
        success: false,
        error: '认证失败'
      });
      return;
    }
    
    const transferId = pathname.replace('/api/transfers/', '');
    
    console.log('🗑️ 删除转化记录:', transferId);
    
    try {
      // 检查转化记录是否存在
      const [transfers] = await pool.query(
        'SELECT * FROM `AchievementTransfer` WHERE id = ?',
        [transferId]
      );
      
      if (transfers.length === 0) {
        sendResponse(res, 404, {
          success: false,
          error: '转化记录不存在'
        });
        return;
      }
      
      const transfer = transfers[0];
      
      // 检查权限：只有创建者或管理员可以删除
      const isOwner = transfer.created_by === user.id;
      const isAdmin = checkPermission(user.role, ['admin', 'assistant']);
      
      if (!isOwner && !isAdmin) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限删除此转化记录'
        });
        return;
      }
      
      // 检查状态：只有洽谈中的记录可以删除
      if (transfer.transfer_status !== 'negotiating' && !isAdmin) {
        sendResponse(res, 409, {
          success: false,
          error: '只能删除洽谈中的转化记录',
          current_status: transfer.transfer_status
        });
        return;
      }
      
      // 删除转化记录
      const [result] = await pool.query('DELETE FROM `AchievementTransfer` WHERE id = ?', [transferId]);
      
      console.log('✅ 转化记录删除成功，影响行数:', result.affectedRows);
      
      sendResponse(res, 200, {
        success: true,
        message: '转化记录删除成功',
        transfer_id: transferId
      });
      
    } catch (error) {
      console.error('删除转化记录失败:', error);
      sendResponse(res, 500, {
        success: false,
        error: '删除转化记录失败',
        message: error.message,
        sqlMessage: error.sqlMessage
      });
    }
    return;
  }

     // ==================== 经费管理API ====================

    // 1. 获取经费统计
    if (pathname === '/api/funding/stats' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      console.log('📊 获取经费统计，用户:', user.id, '角色:', user.role);
      
      try {
        let totalBudget = 0;
        let usedAmount = 0;
        let pendingApplications = 0;
        let pendingReimbursements = 0;
        
        // 获取用户的所有项目（包含各种状态）
        let projectsSql = `
          SELECT p.id, p.budget_total, p.status
          FROM \`Project\` p
          WHERE p.applicant_id = ?
            AND p.status NOT IN ('draft', 'rejected', 'cancelled')
        `;
        
        console.log('🔍 执行项目查询SQL:', projectsSql);
        console.log('🔍 查询参数:', user.id);
        
        const [projects] = await pool.query(projectsSql, [user.id]);
        
        console.log(`📁 找到 ${projects.length} 个项目`);
        
        // 计算总预算
        projects.forEach(project => {
          const budget = parseFloat(project.budget_total || 0);
          totalBudget += budget;
          console.log(`  - 项目 ${project.id}: budget_total = ${budget}, 状态 = ${project.status}`);
        });
        
        console.log(`📊 总预算计算: ${totalBudget}`);
        
        // 获取已批准的支出总额
        if (projects.length > 0) {
          const projectIds = projects.map(p => p.id);
          const placeholders = projectIds.map(() => '?').join(',');
          
          const [expenditures] = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as total_used 
            FROM \`ExpenditureRecord\` 
            WHERE project_id IN (${placeholders}) 
              AND status = 'approved'`,
            projectIds
          );
          
          usedAmount = parseFloat(expenditures[0]?.total_used || 0);
          console.log(`📊 已使用金额: ${usedAmount}`);
          
          // 获取待处理的支出申请
          const [pendingApps] = await pool.query(
            `SELECT COUNT(*) as count 
            FROM \`ExpenditureRecord\` 
            WHERE project_id IN (${placeholders}) 
              AND status IN ('draft', 'submitted')`,
            projectIds
          );
          
          pendingApplications = parseInt(pendingApps[0]?.count || 0);
          console.log(`📊 待处理申请数: ${pendingApplications}`);
        }
        
        // 获取待处理的经费申请（使用 FundingApplication 表）
        try {
          const [applications] = await pool.query(
            `SELECT COUNT(*) as count 
            FROM \`FundingApplication\` 
            WHERE project_id IN (
              SELECT id FROM \`Project\` WHERE applicant_id = ?
            ) AND status = 'submitted'`,
            [user.id]
          );
          pendingReimbursements = parseInt(applications[0]?.count || 0);
          console.log(`📊 待处理经费申请数: ${pendingReimbursements}`);
        } catch (error) {
          console.log('经费申请表查询失败，跳过:', error.message);
        }
        
        const availableBalance = totalBudget - usedAmount;
        const usedPercentage = totalBudget > 0 ? ((usedAmount / totalBudget) * 100).toFixed(1) : 0;
        
        console.log('📊 统计结果:', {
          totalBudget,
          usedAmount,
          availableBalance,
          pendingApplications,
          pendingReimbursements
        });
        
        sendResponse(res, 200, {
          success: true,
          data: {
            total_budget: totalBudget,
            used_amount: usedAmount,
            available_balance: availableBalance,
            used_percentage: parseFloat(usedPercentage),
            pending_applications: pendingApplications,
            pending_reimbursements: pendingReimbursements
          }
        });
        
      } catch (error) {
        console.error('获取经费统计失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取经费统计失败',
          message: error.message,
          sql: error.sql
        });
      }
      return;
    }

    // 2. 获取支出记录列表
    if (pathname === '/api/expenditures' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const { 
        page = 1, 
        limit = 10, 
        status, 
        project_id, 
        category,
        start_date,
        end_date,
        sort_by = 'expense_date',
        sort_order = 'desc'
      } = query;
      
      const offset = (page - 1) * limit;
      
      console.log('📋 获取支出记录，用户:', user.id, '查询参数:', query);
      
      try {
        // 构建查询 - 使用正确的表名和字段
        let sql = `
          SELECT 
            er.*,
            p.title as project_title,
            p.project_code,
            u.name as applicant_name,
            r.name as reviewer_name
          FROM \`ExpenditureRecord\` er
          LEFT JOIN \`Project\` p ON er.project_id = p.id
          LEFT JOIN \`User\` u ON p.applicant_id = u.id
          LEFT JOIN \`User\` r ON er.reviewer_id = r.id
          WHERE 1=1
        `;
        
        let countSql = 'SELECT COUNT(*) as total FROM `ExpenditureRecord` er WHERE 1=1';
        const params = [];
        const countParams = [];
        
        // 根据用户角色过滤
        if (!checkPermission(user.role, ['admin', 'assistant'])) {
          // 普通用户只能查看自己项目的支出
          sql += ` AND er.project_id IN (
            SELECT id FROM \`Project\` WHERE applicant_id = ?
            UNION
            SELECT project_id FROM \`ProjectMember\` WHERE user_id = ?
          )`;
          countSql += ` AND er.project_id IN (
            SELECT id FROM \`Project\` WHERE applicant_id = ?
            UNION
            SELECT project_id FROM \`ProjectMember\` WHERE user_id = ?
          )`;
          params.push(user.id, user.id);
          countParams.push(user.id, user.id);
        }
        
        // 项目筛选
        if (project_id) {
          sql += ' AND er.project_id = ?';
          countSql += ' AND er.project_id = ?';
          params.push(project_id);
          countParams.push(project_id);
        }
        
        // 状态筛选 - 使用你的数据库中的状态值
        if (status) {
          const statusList = status.split(',');
          sql += ` AND er.status IN (${statusList.map(() => '?').join(',')})`;
          countSql += ` AND er.status IN (${statusList.map(() => '?').join(',')})`;
          params.push(...statusList);
          countParams.push(...statusList);
        }
        
        // 分类筛选 - 使用你的数据库中的分类枚举
        if (category) {
          sql += ' AND er.category = ?';
          countSql += ' AND er.category = ?';
          params.push(category);
          countParams.push(category);
        }
        
        // 日期范围筛选
        if (start_date) {
          sql += ' AND er.expense_date >= ?';
          countSql += ' AND er.expense_date >= ?';
          params.push(start_date);
          countParams.push(start_date);
        }
        
        if (end_date) {
          sql += ' AND er.expense_date <= ?';
          countSql += ' AND er.expense_date <= ?';
          params.push(end_date);
          countParams.push(end_date);
        }
        
        // 排序
        const validSortFields = ['expense_date', 'created_at', 'amount'];
        const sortField = validSortFields.includes(sort_by) ? sort_by : 'expense_date';
        const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        sql += ` ORDER BY er.${sortField} ${sortDirection}`;
        
        // 分页
        sql += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);
        
        console.log('🔍 执行支出查询SQL:', sql);
        
        const [rows] = await pool.query(sql, params);
        const [totalResult] = await pool.query(countSql, countParams);
        const total = totalResult[0]?.total || 0;
        
        // 处理JSON字段
        rows.forEach(row => {
          if (row.supporting_docs) {
            try {
              row.supporting_docs = JSON.parse(row.supporting_docs);
            } catch (e) {
              console.error('解析支持文档失败:', e);
              row.supporting_docs = [];
            }
          }
        });
        
        sendResponse(res, 200, {
          success: true,
          data: rows,
          total: total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        });
        
      } catch (error) {
        console.error('获取支出记录失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取支出记录失败',
          message: error.message,
          sql: error.sql
        });
      }
      return;
    }

    // 3. 创建支出记录
    if (pathname === '/api/expenditures' && req.method === 'POST') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      console.log('📝 创建支出记录，用户:', user.id);
      
      try {
        const body = await parseRequestBody(req);
        
        console.log('📥 支出记录数据:', body);
        
        // 验证必填字段
        if (!body.project_id || !body.category || !body.item_name || !body.amount) {
          sendResponse(res, 400, {
            success: false,
            error: '项目ID、类别、项目名称和金额是必填字段'
          });
          return;
        }
        
        // 验证项目是否存在且用户有权限
        const [projects] = await pool.query(
          'SELECT id, applicant_id, status FROM `Project` WHERE id = ?',
          [body.project_id]
        );
        
        if (projects.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '项目不存在'
          });
          return;
        }
        
        const project = projects[0];
        
        // 检查权限
        const isOwner = project.applicant_id === user.id;
        const isAdmin = checkPermission(user.role, ['admin', 'assistant']);
        const [isMember] = await pool.query(
          'SELECT id FROM `ProjectMember` WHERE project_id = ? AND user_id = ?',
          [body.project_id, user.id]
        );
        
        if (!isOwner && !isAdmin && isMember.length === 0) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限为此项目创建支出记录'
          });
          return;
        }
        
        // 检查项目状态是否允许添加支出
        if (!['approved', 'in_progress', 'stage_review', 'completed'].includes(project.status)) {
          sendResponse(res, 409, {
            success: false,
            error: '项目当前状态不允许添加支出记录',
            project_status: project.status
          });
          return;
        }
        
        // 生成支出ID和编号
        const expenditureId = randomUUID();
        const expenseNo = `EXP-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        
        // 准备支持文档
        let supportingDocs = [];
        if (body.supporting_docs) {
          if (Array.isArray(body.supporting_docs)) {
            supportingDocs = body.supporting_docs;
          } else if (typeof body.supporting_docs === 'string') {
            try {
              supportingDocs = JSON.parse(body.supporting_docs);
            } catch (e) {
              console.error('解析支持文档失败:', e);
            }
          }
        }
        
        // 验证支出类别是否有效
        const validCategories = ['设备费', '材料费', '测试费', '差旅费', '会议费', '劳务费', '专家咨询费', '出版费', '管理费', '其他'];
        if (!validCategories.includes(body.category)) {
          sendResponse(res, 400, {
            success: false,
            error: '无效的支出类别',
            valid_categories: validCategories
          });
          return;
        }
        
        // 插入支出记录
        const sql = `
          INSERT INTO \`ExpenditureRecord\` (
            id, project_id, expense_no, category, item_name, amount,
            expense_date, payee, description, supporting_docs, status,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        const params = [
          expenditureId,
          body.project_id,
          expenseNo,
          body.category,
          body.item_name,
          parseFloat(body.amount),
          body.expense_date || new Date().toISOString().split('T')[0],
          body.payee || '',
          body.description || '',
          JSON.stringify(supportingDocs),
          body.status || 'draft'
        ];
        
        console.log('📝 执行创建支出SQL:', sql);
        
        await pool.query(sql, params);
        
        // 获取新创建的支出记录
        const [newExpenditures] = await pool.query(
          `SELECT 
            er.*,
            p.title as project_title,
            p.project_code
           FROM \`ExpenditureRecord\` er
           LEFT JOIN \`Project\` p ON er.project_id = p.id
           WHERE er.id = ?`,
          [expenditureId]
        );
        
        sendResponse(res, 201, {
          success: true,
          message: '支出记录创建成功',
          data: newExpenditures[0]
        });
        
      } catch (error) {
        console.error('创建支出记录失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '创建支出记录失败',
          message: error.message,
          sqlMessage: error.sqlMessage
        });
      }
      return;
    }

    // 4. 获取预算分类统计
    if (pathname === '/api/budget/categories' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const { project_id } = query;
      
      console.log('📊 获取预算分类统计，用户:', user.id, '项目:', project_id);
      
      try {
        // 获取用户的所有项目
        let projectsSql = `
          SELECT p.id, p.title, p.budget_total
          FROM \`Project\` p
          WHERE p.applicant_id = ?
            AND p.status IN ('approved', 'in_progress', 'stage_review', 'completed')
        `;
        let projectsParams = [user.id];
        
        if (project_id) {
          projectsSql += ' AND p.id = ?';
          projectsParams.push(project_id);
        }
        
        const [projects] = await pool.query(projectsSql, projectsParams);
        
        if (projects.length === 0) {
          sendResponse(res, 200, {
            success: true,
            data: []
          });
          return;
        }
        
        const projectIds = projects.map(p => p.id);
        const placeholders = projectIds.map(() => '?').join(',');
        
        // 按分类统计支出 - 使用正确的支出类别枚举
        const [categoryStats] = await pool.query(
          `SELECT 
            category,
            COUNT(*) as record_count,
            SUM(amount) as total_amount,
            SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_amount,
            SUM(CASE WHEN status = 'draft' THEN amount ELSE 0 END) as draft_amount,
            SUM(CASE WHEN status = 'submitted' THEN amount ELSE 0 END) as submitted_amount
          FROM \`ExpenditureRecord\`
          WHERE project_id IN (${placeholders})
          GROUP BY category
          ORDER BY total_amount DESC`,
          projectIds
        );
        
        // 获取项目的预算分配
        let budgetAllocations = [];
        try {
          const [budgets] = await pool.query(
            `SELECT 
              category,
              SUM(amount) as budget_amount
            FROM \`ProjectBudget\`
            WHERE project_id IN (${placeholders})
            GROUP BY category`,
            projectIds
          );
          budgetAllocations = budgets;
        } catch (error) {
          console.log('项目预算表可能没有数据，跳过:', error.message);
        }
        
        // 合并数据
        const result = categoryStats.map(stat => {
          const budgetItem = budgetAllocations.find(b => b.category === stat.category);
          const budget = budgetItem ? parseFloat(budgetItem.budget_amount) : 0;
          const used = parseFloat(stat.approved_amount || 0);
          const percentage = budget > 0 ? Math.round((used / budget) * 100) : 0;
          
          // 如果没有预算数据，从项目总预算按比例分配
          let finalBudget = budget;
          if (budget === 0) {
            // 尝试从项目总预算中估算
            const totalProjectsBudget = projects.reduce((sum, p) => sum + parseFloat(p.budget_total || 0), 0);
            const categoryCount = categoryStats.length;
            finalBudget = totalProjectsBudget / categoryCount;
          }
          
          return {
            id: stat.category,
            name: stat.category,
            budget: finalBudget,
            used: used,
            balance: finalBudget - used,
            percentage: percentage,
            status: getCategoryStatusByPercentage(percentage),
            record_count: stat.record_count,
            draft_amount: parseFloat(stat.draft_amount || 0),
            submitted_amount: parseFloat(stat.submitted_amount || 0)
          };
        });
        
        console.log(`📊 预算分类统计结果: ${result.length} 个分类`);
        
        sendResponse(res, 200, {
          success: true,
          data: result,
          total_projects: projects.length
        });
        
      } catch (error) {
        console.error('获取预算分类统计失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取预算分类统计失败',
          message: error.message
        });
      }
      return;
    }

    // 辅助函数：根据百分比获取分类状态
    function getCategoryStatusByPercentage(percentage) {
      if (percentage >= 90) return 'danger';
      if (percentage >= 70) return 'warning';
      return 'normal';
    }
        // 8. 获取支出趋势数据
    if (pathname === '/api/expenditures/trend' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const { period = 30 } = query;
      const days = parseInt(period);
      
      try {
        // 获取用户的项目
        const [projects] = await pool.query(
          'SELECT id FROM `Project` WHERE applicant_id = ?',
          [user.id]
        );
        
        if (projects.length === 0) {
          sendResponse(res, 200, {
            success: true,
            data: []
          });
          return;
        }
        
        const projectIds = projects.map(p => p.id);
        const placeholders = projectIds.map(() => '?').join(',');
        
        // 查询最近N天的支出趋势
        const [trendData] = await pool.query(
          `SELECT 
            DATE(expense_date) as date,
            COUNT(*) as count,
            SUM(amount) as amount
          FROM \`ExpenditureRecord\`
          WHERE project_id IN (${placeholders})
            AND expense_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            AND status = 'approved'
          GROUP BY DATE(expense_date)
          ORDER BY date`,
          [...projectIds, days]
        );
        
        // 补全缺失的日期
        const result = [];
        const today = new Date();
        
        for (let i = days; i >= 0; i--) {
          const date = new Date();
          date.setDate(today.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          const dayData = trendData.find(d => d.date.toISOString().split('T')[0] === dateStr);
          
          result.push({
            date: dateStr,
            amount: dayData ? parseFloat(dayData.amount) : 0,
            count: dayData ? parseInt(dayData.count) : 0
          });
        }
        
        sendResponse(res, 200, {
          success: true,
          data: result
        });
        
      } catch (error) {
        console.error('获取支出趋势失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取支出趋势失败',
          message: error.message
        });
      }
      return;
    }

    // 9. 获取预算执行数据
    if (pathname === '/api/budget/execution' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      try {
        // 获取用户的项目
        const [projects] = await pool.query(
          'SELECT id FROM `Project` WHERE applicant_id = ?',
          [user.id]
        );
        
        if (projects.length === 0) {
          sendResponse(res, 200, {
            success: true,
            data: []
          });
          return;
        }
        
        const projectIds = projects.map(p => p.id);
        const placeholders = projectIds.map(() => '?').join(',');
        
        // 获取每个分类的预算和执行情况
        const [executionData] = await pool.query(
          `SELECT 
            category,
            COALESCE(SUM(budget_amount), 0) as budget,
            COALESCE(SUM(approved_amount), 0) as spent,
            MAX(last_spent_date) as last_spent_date
          FROM (
            -- 预算数据
            SELECT 
              pb.category,
              pb.amount as budget_amount,
              0 as approved_amount,
              NULL as last_spent_date
            FROM \`ProjectBudget\` pb
            WHERE pb.project_id IN (${placeholders})
            
            UNION ALL
            
            -- 支出数据
            SELECT 
              er.category,
              0 as budget_amount,
              er.amount as approved_amount,
              er.expense_date as last_spent_date
            FROM \`ExpenditureRecord\` er
            WHERE er.project_id IN (${placeholders})
              AND er.status = 'approved'
          ) as combined
          GROUP BY category
          HAVING budget > 0
          ORDER BY spent DESC`,
          [...projectIds, ...projectIds]
        );
        
        // 处理数据
        const result = executionData.map(item => {
          const budget = parseFloat(item.budget || 0);
          const spent = parseFloat(item.spent || 0);
          const percentage = budget > 0 ? Math.round((spent / budget) * 100) : 0;
          
          return {
            category: item.category,
            budget: budget,
            spent: spent,
            percentage: percentage,
            status: getCategoryStatusByPercentage(percentage),
            lastSpent: item.last_spent_date ? item.last_spent_date.toISOString().split('T')[0] : '暂无',
            nextPlan: getNextPlanByCategory(item.category)
          };
        });
        
        sendResponse(res, 200, {
          success: true,
          data: result
        });
        
      } catch (error) {
        console.error('获取预算执行数据失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取预算执行数据失败',
          message: error.message
        });
      }
      return;
    }

    // 辅助函数：根据分类获取下一步计划
    function getNextPlanByCategory(category) {
      const plans = {
        '设备费': '设备维护/采购',
        '材料费': '实验耗材补充',
        '差旅费': '学术会议/调研',
        '会议费': '学术研讨会',
        '劳务费': '人员劳务支付',
        '专家咨询费': '专家咨询',
        '出版费': '论文发表',
        '管理费': '项目管理',
        '其他': '其他支出'
      };
      return plans[category] || '待安排';
    }

    // ==================== 预算管理API ====================

    // 1. 获取预算列表
    if (pathname === '/api/budgets' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const { 
        page = 1, 
        limit = 10, 
        project_id, 
        category,
        search 
      } = query;
      
      const offset = (page - 1) * limit;
      
      console.log('📋 获取预算列表，用户:', user.id, '查询参数:', query);
      
      try {
        // 构建查询SQL
        let sql = `
          SELECT 
            pb.*,
            p.title as project_title,
            p.project_code
          FROM \`ProjectBudget\` pb
          LEFT JOIN \`Project\` p ON pb.project_id = p.id
          WHERE p.applicant_id = ?
        `;
        
        let countSql = 'SELECT COUNT(*) as total FROM `ProjectBudget` pb LEFT JOIN `Project` p ON pb.project_id = p.id WHERE p.applicant_id = ?';
        const params = [user.id];
        const countParams = [user.id];
        
        // 管理员可以查看所有预算
        if (checkPermission(user.role, ['admin', 'assistant'])) {
          sql = sql.replace('WHERE p.applicant_id = ?', 'WHERE 1=1');
          countSql = countSql.replace('WHERE p.applicant_id = ?', 'WHERE 1=1');
          params.shift();
          countParams.shift();
        }
        
        // 项目筛选
        if (project_id) {
          sql += ' AND pb.project_id = ?';
          countSql += ' AND pb.project_id = ?';
          params.push(project_id);
          countParams.push(project_id);
        }
        
        // 类别筛选
        if (category) {
          sql += ' AND pb.category = ?';
          countSql += ' AND pb.category = ?';
          params.push(category);
          countParams.push(category);
        }
        
        // 搜索
        if (search) {
          sql += ' AND (p.title LIKE ? OR pb.item_name LIKE ? OR pb.description LIKE ?)';
          countSql += ' AND (p.title LIKE ? OR pb.item_name LIKE ? OR pb.description LIKE ?)';
          const searchParam = `%${search}%`;
          params.push(searchParam, searchParam, searchParam);
          countParams.push(searchParam, searchParam, searchParam);
        }
        
        sql += ' ORDER BY pb.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);
        
        console.log('🔍 执行预算查询SQL:', sql);
        console.log('🔍 查询参数:', params);
        
        const [rows] = await pool.query(sql, params);
        const [totalResult] = await pool.query(countSql, countParams);
        const total = totalResult[0]?.total || 0;
        
        // 计算每个预算项目的使用情况
        for (const budget of rows) {
          // 获取该预算类别的已批准支出
          const [expenditures] = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as used_amount 
            FROM \`ExpenditureRecord\` 
            WHERE project_id = ? 
              AND category = ? 
              AND status = 'approved'`,
            [budget.project_id, budget.category]
          );
          
          budget.used_amount = parseFloat(expenditures[0]?.used_amount || 0);
          budget.balance = budget.amount - budget.used_amount;
          budget.usage_rate = budget.amount > 0 ? Math.round((budget.used_amount / budget.amount) * 100) : 0;
        }
        
        sendResponse(res, 200, {
          success: true,
          data: rows,
          total: total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        });
        
      } catch (error) {
        console.error('获取预算列表失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取预算列表失败',
          message: error.message
        });
      }
      return;
    }

    // 2. 创建预算
    if (pathname === '/api/budgets' && req.method === 'POST') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      console.log('📝 创建预算，用户:', user.id);
      
      try {
        const body = await parseRequestBody(req);
        
        console.log('📥 预算数据:', body);
        
        // 验证必填字段
        if (!body.project_id || !body.category || !body.item_name || !body.amount) {
          sendResponse(res, 400, {
            success: false,
            error: '项目ID、类别、预算项目和金额是必填字段'
          });
          return;
        }
        
        // 验证项目权限
        const [projects] = await pool.query(
          'SELECT applicant_id FROM `Project` WHERE id = ?',
          [body.project_id]
        );
        
        if (projects.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '项目不存在'
          });
          return;
        }
        
        const project = projects[0];
        
        // 检查权限：只有项目负责人或管理员可以创建预算
        const isOwner = project.applicant_id === user.id;
        const isAdmin = checkPermission(user.role, ['admin', 'assistant']);
        
        if (!isOwner && !isAdmin) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限为此项目创建预算'
          });
          return;
        }
        
        // 生成预算ID
        const budgetId = randomUUID();
        
        // 插入预算记录
        const sql = `
          INSERT INTO \`ProjectBudget\` (
            id, project_id, category, item_name, description,
            amount, justification, sequence, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        const params = [
          budgetId,
          body.project_id,
          body.category,
          body.item_name,
          body.description || '',
          parseFloat(body.amount),
          body.justification || '',
          body.sequence || 1
        ];
        
        console.log('📝 执行创建预算SQL:', sql);
        
        await pool.query(sql, params);
        
        // 获取新创建的预算
        const [newBudgets] = await pool.query(
          `SELECT 
            pb.*,
            p.title as project_title,
            p.project_code
          FROM \`ProjectBudget\` pb
          LEFT JOIN \`Project\` p ON pb.project_id = p.id
          WHERE pb.id = ?`,
          [budgetId]
        );
        
        sendResponse(res, 201, {
          success: true,
          message: '预算创建成功',
          data: newBudgets[0]
        });
        
      } catch (error) {
        console.error('创建预算失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '创建预算失败',
          message: error.message,
          sqlMessage: error.sqlMessage
        });
      }
      return;
    }

    // 3. 更新预算
    if (pathname.startsWith('/api/budgets/') && req.method === 'PUT') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const budgetId = pathname.replace('/api/budgets/', '');
      const body = await parseRequestBody(req);
      
      console.log('🔄 更新预算:', budgetId, '数据:', body);
      
      try {
        // 检查预算是否存在
        const [budgets] = await pool.query(
          `SELECT pb.*, p.applicant_id 
          FROM \`ProjectBudget\` pb
          LEFT JOIN \`Project\` p ON pb.project_id = p.id
          WHERE pb.id = ?`,
          [budgetId]
        );
        
        if (budgets.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '预算不存在'
          });
          return;
        }
        
        const budget = budgets[0];
        
        // 检查权限：只有项目负责人或管理员可以更新
        const isOwner = budget.applicant_id === user.id;
        const isAdmin = checkPermission(user.role, ['admin', 'assistant']);
        
        if (!isOwner && !isAdmin) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限修改此预算'
          });
          return;
        }
        
        // 构建更新字段
        const updateFields = [];
        const updateValues = [];
        
        const allowedFields = [
          'category', 'item_name', 'description', 
          'amount', 'justification', 'sequence'
        ];
        
        allowedFields.forEach(field => {
          if (body[field] !== undefined) {
            updateFields.push(`${field} = ?`);
            updateValues.push(body[field]);
          }
        });
        
        if (updateFields.length === 0) {
          sendResponse(res, 400, {
            success: false,
            error: '没有提供更新数据'
          });
          return;
        }
        
        updateValues.push(budgetId);
        
        const updateSql = `UPDATE \`ProjectBudget\` SET ${updateFields.join(', ')} WHERE id = ?`;
        
        console.log('📝 执行更新SQL:', updateSql);
        console.log('📝 参数:', updateValues);
        
        await pool.query(updateSql, updateValues);
        
        sendResponse(res, 200, {
          success: true,
          message: '预算更新成功',
          budget_id: budgetId
        });
        
      } catch (error) {
        console.error('更新预算失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '更新预算失败',
          message: error.message,
          sqlMessage: error.sqlMessage
        });
      }
      return;
    }

    // 4. 删除预算
    if (pathname.startsWith('/api/budgets/') && req.method === 'DELETE') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const budgetId = pathname.replace('/api/budgets/', '');
      
      console.log('🗑️ 删除预算:', budgetId);
      
      try {
        // 检查预算是否存在
        const [budgets] = await pool.query(
          `SELECT pb.*, p.applicant_id 
          FROM \`ProjectBudget\` pb
          LEFT JOIN \`Project\` p ON pb.project_id = p.id
          WHERE pb.id = ?`,
          [budgetId]
        );
        
        if (budgets.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '预算不存在'
          });
          return;
        }
        
        const budget = budgets[0];
        
        // 检查权限：只有项目负责人或管理员可以删除
        const isOwner = budget.applicant_id === user.id;
        const isAdmin = checkPermission(user.role, ['admin', 'assistant']);
        
        if (!isOwner && !isAdmin) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限删除此预算'
          });
          return;
        }
        
        // 检查是否有相关的支出记录
        const [expenditures] = await pool.query(
          'SELECT COUNT(*) as count FROM `ExpenditureRecord` WHERE project_id = ? AND category = ?',
          [budget.project_id, budget.category]
        );
        
        if (expenditures[0]?.count > 0) {
          sendResponse(res, 409, {
            success: false,
            error: '该预算类别已有支出记录，不能删除',
            expenditure_count: expenditures[0].count
          });
          return;
        }
        
        // 删除预算
        const [result] = await pool.query('DELETE FROM `ProjectBudget` WHERE id = ?', [budgetId]);
        
        console.log('✅ 预算删除成功，影响行数:', result.affectedRows);
        
        sendResponse(res, 200, {
          success: true,
          message: '预算删除成功',
          budget_id: budgetId
        });
        
      } catch (error) {
        console.error('删除预算失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '删除预算失败',
          message: error.message,
          sqlMessage: error.sqlMessage
        });
      }
      return;
    }

    // 5. 获取项目预算详情
    if (pathname.startsWith('/api/projects/') && pathname.endsWith('/budgets') && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const projectId = pathname.replace('/api/projects/', '').replace('/budgets', '');
      
      console.log('📊 获取项目预算详情，项目ID:', projectId);
      
      try {
        // 检查项目权限
        const [projects] = await pool.query(
          'SELECT * FROM `Project` WHERE id = ?',
          [projectId]
        );
        
        if (projects.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '项目不存在'
          });
          return;
        }
        
        const project = projects[0];
        
        // 检查权限
        const isOwner = project.applicant_id === user.id;
        const isAdmin = checkPermission(user.role, ['admin', 'assistant']);
        const [isMember] = await pool.query(
          'SELECT id FROM `ProjectMember` WHERE project_id = ? AND user_id = ?',
          [projectId, user.id]
        );
        
        if (!isOwner && !isAdmin && isMember.length === 0) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限查看此项目的预算'
          });
          return;
        }
        
        // 获取项目预算
        const [budgets] = await pool.query(
          'SELECT * FROM `ProjectBudget` WHERE project_id = ? ORDER BY category, sequence',
          [projectId]
        );
        
        // 计算每个预算的使用情况
        for (const budget of budgets) {
          const [expenditures] = await pool.query(
            `SELECT 
              COALESCE(SUM(amount), 0) as used_amount,
              COUNT(*) as record_count
            FROM \`ExpenditureRecord\` 
            WHERE project_id = ? 
              AND category = ? 
              AND status = 'approved'`,
            [projectId, budget.category]
          );
          
          budget.used_amount = parseFloat(expenditures[0]?.used_amount || 0);
          budget.balance = budget.amount - budget.used_amount;
          budget.usage_rate = budget.amount > 0 ? Math.round((budget.used_amount / budget.amount) * 100) : 0;
          budget.record_count = expenditures[0]?.record_count || 0;
        }
        
        sendResponse(res, 200, {
          success: true,
          data: budgets,
          project: {
            id: project.id,
            title: project.title,
            project_code: project.project_code
          }
        });
        
      } catch (error) {
        console.error('获取项目预算失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取项目预算失败',
          message: error.message
        });
      }
      return;
    }
    // ==================== 支出管理API补充 ====================

    // 1. 获取支出统计
    if (pathname === '/api/expenditures/stats' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      try {
        // 获取用户的项目
        const [projects] = await pool.query(
          'SELECT id FROM `Project` WHERE applicant_id = ?',
          [user.id]
        );
        
        let stats = {
          total_expenditure: 0,
          pending_amount: 0,
          pending_count: 0,
          approved_amount: 0,
          approved_count: 0,
          avg_amount: 0,
          total_trend: 0
        };
        
        if (projects.length > 0) {
          const projectIds = projects.map(p => p.id);
          const placeholders = projectIds.map(() => '?').join(',');
          
          // 总支出金额
          const [totalResult] = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as total_amount, COUNT(*) as count
            FROM \`ExpenditureRecord\` 
            WHERE project_id IN (${placeholders}) AND status = 'approved'`,
            projectIds
          );
          
          stats.total_expenditure = parseFloat(totalResult[0]?.total_amount || 0);
          stats.approved_count = parseInt(totalResult[0]?.count || 0);
          
          // 待审批金额
          const [pendingResult] = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as pending_amount, COUNT(*) as count
            FROM \`ExpenditureRecord\` 
            WHERE project_id IN (${placeholders}) AND status = 'submitted'`,
            projectIds
          );
          
          stats.pending_amount = parseFloat(pendingResult[0]?.pending_amount || 0);
          stats.pending_count = parseInt(pendingResult[0]?.count || 0);
          
          // 已批准金额
          const [approvedResult] = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as approved_amount, COUNT(*) as count
            FROM \`ExpenditureRecord\` 
            WHERE project_id IN (${placeholders}) AND status = 'approved'`,
            projectIds
          );
          
          stats.approved_amount = parseFloat(approvedResult[0]?.approved_amount || 0);
          stats.approved_count = parseInt(approvedResult[0]?.count || 0);
          
          // 平均金额
          if (stats.approved_count > 0) {
            stats.avg_amount = stats.approved_amount / stats.approved_count;
          }
          
          // 趋势计算（与上月比较）
          const currentMonth = new Date().getMonth() + 1;
          const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
          const currentYear = new Date().getFullYear();
          const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
          
          // 本月支出
          const [currentMonthResult] = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as current_amount
            FROM \`ExpenditureRecord\` 
            WHERE project_id IN (${placeholders}) 
              AND status = 'approved'
              AND YEAR(expense_date) = ? 
              AND MONTH(expense_date) = ?`,
            [...projectIds, currentYear, currentMonth]
          );
          
          // 上月支出
          const [lastMonthResult] = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as last_amount
            FROM \`ExpenditureRecord\` 
            WHERE project_id IN (${placeholders}) 
              AND status = 'approved'
              AND YEAR(expense_date) = ? 
              AND MONTH(expense_date) = ?`,
            [...projectIds, lastMonthYear, lastMonth]
          );
          
          const currentAmount = parseFloat(currentMonthResult[0]?.current_amount || 0);
          const lastAmount = parseFloat(lastMonthResult[0]?.last_amount || 0);
          
          if (lastAmount > 0) {
            stats.total_trend = ((currentAmount - lastAmount) / lastAmount * 100).toFixed(1);
          }
        }
        
        sendResponse(res, 200, {
          success: true,
          data: stats
        });
        
      } catch (error) {
        console.error('获取支出统计失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取支出统计失败',
          message: error.message
        });
      }
      return;
    }

    // 2. 获取支出分类统计
    if (pathname === '/api/expenditures/category-stats' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      try {
        // 获取用户的项目
        const [projects] = await pool.query(
          'SELECT id FROM `Project` WHERE applicant_id = ?',
          [user.id]
        );
        
        let categoryStats = [];
        
        if (projects.length > 0) {
          const projectIds = projects.map(p => p.id);
          const placeholders = projectIds.map(() => '?').join(',');
          
          // 按分类统计
          const [stats] = await pool.query(
            `SELECT 
              category,
              COUNT(*) as count,
              COALESCE(SUM(amount), 0) as total_amount
            FROM \`ExpenditureRecord\` 
            WHERE project_id IN (${placeholders}) AND status = 'approved'
            GROUP BY category
            ORDER BY total_amount DESC`,
            projectIds
          );
          
          // 计算总金额
          const totalAmount = stats.reduce((sum, item) => sum + parseFloat(item.total_amount), 0);
          
          // 计算百分比
          categoryStats = stats.map(item => ({
            category: item.category,
            count: parseInt(item.count),
            total_amount: parseFloat(item.total_amount),
            percentage: totalAmount > 0 ? Math.round((parseFloat(item.total_amount) / totalAmount) * 100) : 0
          }));
        }
        
        sendResponse(res, 200, {
          success: true,
          data: categoryStats
        });
        
      } catch (error) {
        console.error('获取支出分类统计失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取支出分类统计失败',
          message: error.message
        });
      }
      return;
    }

    // 3. 提交支出申请
    if (pathname.startsWith('/api/expenditures/') && pathname.includes('/submit') && req.method === 'POST') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const expenditureId = pathname.replace('/api/expenditures/', '').replace('/submit', '');
      
      console.log('📨 提交支出申请:', expenditureId);
      
      try {
        const [expenditures] = await pool.query(
          'SELECT * FROM `ExpenditureRecord` WHERE id = ?',
          [expenditureId]
        );
        
        if (expenditures.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '支出记录不存在'
          });
          return;
        }
        
        const expenditure = expenditures[0];
        
        // 检查权限：只有创建者可以提交
        const [projects] = await pool.query(
          'SELECT applicant_id FROM `Project` WHERE id = ?',
          [expenditure.project_id]
        );
        
        if (projects.length === 0 || projects[0].applicant_id !== user.id) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限提交此支出申请'
          });
          return;
        }
        
        // 检查当前状态
        if (expenditure.status !== 'draft') {
          sendResponse(res, 409, {
            success: false,
            error: '当前状态不允许提交',
            current_status: expenditure.status
          });
          return;
        }
        
        // 更新状态为待审批
        await pool.query(
          'UPDATE `ExpenditureRecord` SET status = ?, submitted_at = NOW() WHERE id = ?',
          ['submitted', expenditureId]
        );
        
        sendResponse(res, 200, {
          success: true,
          message: '支出申请已提交审核',
          expenditure_id: expenditureId,
          new_status: 'submitted'
        });
        
      } catch (error) {
        console.error('提交支出申请失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '提交支出申请失败',
          message: error.message
        });
      }
      return;
    }

    // 4. 审核支出申请
    if (pathname.startsWith('/api/expenditures/') && pathname.includes('/review') && req.method === 'POST') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 只有管理员和科研助理可以审核
      if (!checkPermission(user.role, ['admin', 'assistant'])) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限审核支出申请'
        });
        return;
      }
      
      const expenditureId = pathname.replace('/api/expenditures/', '').replace('/review', '');
      const body = await parseRequestBody(req);
      
      console.log('📝 审核支出申请:', {
        expenditureId: expenditureId,
        reviewerId: user.id,
        action: body.action,
        reason: body.reason
      });
      
      if (!body.action || !['approve', 'reject'].includes(body.action)) {
        sendResponse(res, 400, {
          success: false,
          error: '审核动作不正确，必须是 approve 或 reject'
        });
        return;
      }
      
      if (body.action === 'reject' && !body.reason) {
        sendResponse(res, 400, {
          success: false,
          error: '驳回支出申请必须提供理由'
        });
        return;
      }
      
      try {
        const [expenditures] = await pool.query(
          'SELECT * FROM `ExpenditureRecord` WHERE id = ?',
          [expenditureId]
        );
        
        if (expenditures.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '支出记录不存在'
          });
          return;
        }
        
        const expenditure = expenditures[0];
        
        // 检查当前状态是否为待审批
        if (expenditure.status !== 'submitted') {
          sendResponse(res, 409, {
            success: false,
            error: '当前状态不允许审核',
            current_status: expenditure.status
          });
          return;
        }
        
        // 确定新的状态
        const newStatus = body.action === 'approve' ? 'approved' : 'rejected';
        
        // 更新支出记录状态
        await pool.query(
          'UPDATE `ExpenditureRecord` SET status = ?, reviewer_id = ?, review_date = NOW(), review_comment = ? WHERE id = ?',
          [newStatus, user.id, body.reason || '', expenditureId]
        );
        
        sendResponse(res, 200, {
          success: true,
          message: `支出申请${body.action === 'approve' ? '已通过' : '已驳回'}`,
          expenditure_id: expenditureId,
          new_status: newStatus,
          review_action: body.action
        });
        
      } catch (error) {
        console.error('审核支出申请失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '审核支出申请失败',
          message: error.message
        });
      }
      return;
    }

    // 5. 标记为已支付
    if (pathname.startsWith('/api/expenditures/') && pathname.includes('/mark-paid') && req.method === 'POST') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 只有管理员和科研助理可以标记支付
      if (!checkPermission(user.role, ['admin', 'assistant'])) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限标记支付'
        });
        return;
      }
      
      const expenditureId = pathname.replace('/api/expenditures/', '').replace('/mark-paid', '');
      
      console.log('💰 标记为已支付:', expenditureId);
      
      try {
        const [expenditures] = await pool.query(
          'SELECT * FROM `ExpenditureRecord` WHERE id = ?',
          [expenditureId]
        );
        
        if (expenditures.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '支出记录不存在'
          });
          return;
        }
        
        const expenditure = expenditures[0];
        
        // 检查当前状态是否为已批准
        if (expenditure.status !== 'approved') {
          sendResponse(res, 409, {
            success: false,
            error: '只有已批准的支出可以标记为已支付',
            current_status: expenditure.status
          });
          return;
        }
        
        // 更新为已支付状态
        await pool.query(
          'UPDATE `ExpenditureRecord` SET status = ? WHERE id = ?',
          ['paid', expenditureId]
        );
        
        sendResponse(res, 200, {
          success: true,
          message: '已标记为已支付',
          expenditure_id: expenditureId,
          new_status: 'paid'
        });
        
      } catch (error) {
        console.error('标记支付失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '标记支付失败',
          message: error.message
        });
      }
      return;
    }

    // 6. 取消支出申请
    if (pathname.startsWith('/api/expenditures/') && pathname.includes('/cancel') && req.method === 'POST') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const expenditureId = pathname.replace('/api/expenditures/', '').replace('/cancel', '');
      
      console.log('❌ 取消支出申请:', expenditureId);
      
      try {
        const [expenditures] = await pool.query(
          'SELECT * FROM `ExpenditureRecord` WHERE id = ?',
          [expenditureId]
        );
        
        if (expenditures.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '支出记录不存在'
          });
          return;
        }
        
        const expenditure = expenditures[0];
        
        // 检查权限：只有创建者可以取消
        const [projects] = await pool.query(
          'SELECT applicant_id FROM `Project` WHERE id = ?',
          [expenditure.project_id]
        );
        
        if (projects.length === 0 || projects[0].applicant_id !== user.id) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限取消此支出申请'
          });
          return;
        }
        
        // 检查当前状态是否允许取消
        if (!['draft', 'submitted'].includes(expenditure.status)) {
          sendResponse(res, 409, {
            success: false,
            error: '当前状态不允许取消',
            current_status: expenditure.status
          });
          return;
        }
        
        // 更新为草稿状态
        await pool.query(
          'UPDATE `ExpenditureRecord` SET status = ? WHERE id = ?',
          ['draft', expenditureId]
        );
        
        sendResponse(res, 200, {
          success: true,
          message: '支出申请已取消',
          expenditure_id: expenditureId,
          new_status: 'draft'
        });
        
      } catch (error) {
        console.error('取消支出申请失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '取消支出申请失败',
          message: error.message
        });
      }
      return;
    }

    // 7. 删除支出记录
    if (pathname.startsWith('/api/expenditures/') && req.method === 'DELETE') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const expenditureId = pathname.replace('/api/expenditures/', '');
      
      console.log('🗑️ 删除支出记录:', expenditureId);
      
      try {
        const [expenditures] = await pool.query(
          'SELECT * FROM `ExpenditureRecord` WHERE id = ?',
          [expenditureId]
        );
        
        if (expenditures.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '支出记录不存在'
          });
          return;
        }
        
        const expenditure = expenditures[0];
        
        // 检查权限：只有创建者或管理员可以删除
        const [projects] = await pool.query(
          'SELECT applicant_id FROM `Project` WHERE id = ?',
          [expenditure.project_id]
        );
        
        const isOwner = projects.length > 0 && projects[0].applicant_id === user.id;
        const isAdmin = checkPermission(user.role, ['admin', 'assistant']);
        
        if (!isOwner && !isAdmin) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限删除此支出记录'
          });
          return;
        }
        
        // 检查状态：只有草稿状态可以删除
        if (expenditure.status !== 'draft' && !isAdmin) {
          sendResponse(res, 409, {
            success: false,
            error: '只能删除草稿状态的支出记录',
            current_status: expenditure.status
          });
          return;
        }
        
        // 删除支出记录
        const [result] = await pool.query('DELETE FROM `ExpenditureRecord` WHERE id = ?', [expenditureId]);
        
        console.log('✅ 支出记录删除成功，影响行数:', result.affectedRows);
        
        sendResponse(res, 200, {
          success: true,
          message: '支出记录删除成功',
          expenditure_id: expenditureId
        });
        
      } catch (error) {
        console.error('删除支出记录失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '删除支出记录失败',
          message: error.message,
          sqlMessage: error.sqlMessage
        });
      }
      return;
    }

    // ==================== 文件上传API ====================
    if (pathname === '/api/upload' && req.method === 'POST') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      try {
        // 这里应该处理文件上传逻辑
        // 由于文件上传需要处理multipart/form-data，这里简化处理
        let body = '';
        
        req.on('data', chunk => {
          body += chunk.toString();
        });
        
        req.on('end', async () => {
          try {
            // 解析表单数据（实际项目应该使用multer等中间件）
            const contentType = req.headers['content-type'] || '';
            
            if (contentType.includes('multipart/form-data')) {
              // 简化处理，实际项目应该解析文件
              const fileName = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              const filePath = `/uploads/${fileName}`
              
              // 模拟文件存储
              const fileData = {
                original_name: 'uploaded_file',
                stored_name: fileName,
                file_path: filePath,
                file_size: 1024,
                mime_type: 'application/octet-stream',
                uploaded_by: user.id,
                created_at: new Date().toISOString()
              };
              
              // 如果前端传入了文件信息，可以在这里处理
              sendResponse(res, 200, {
                success: true,
                data: {
                  name: '上传的文件',
                  url: filePath,
                  size: 1024
                }
              });
            } else {
              sendResponse(res, 400, {
                success: false,
                error: '请使用multipart/form-data格式上传文件'
              });
            }
          } catch (error) {
            console.error('文件上传处理失败:', error);
            sendResponse(res, 500, {
              success: false,
              error: '文件上传处理失败',
              message: error.message
            });
          }
        });
        
      } catch (error) {
        console.error('文件上传失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '文件上传失败',
          message: error.message
        });
      }
      return;
    }

    // ==================== 获取项目支出统计 ====================

    if (pathname.startsWith('/api/projects/') && pathname.includes('/expenditure-stats') && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const pathParts = pathname.split('/');
      const projectId = pathParts[pathParts.length - 2];
      
      console.log('📊 获取项目支出统计，项目ID:', projectId);
      
      try {
        // 检查项目权限
        const [projects] = await pool.query(
          'SELECT applicant_id FROM `Project` WHERE id = ?',
          [projectId]
        );
        
        if (projects.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '项目不存在'
          });
          return;
        }
        
        const project = projects[0];
        
        // 检查权限
        const isOwner = project.applicant_id === user.id;
        const isAdmin = checkPermission(user.role, ['admin', 'assistant']);
        
        if (!isOwner && !isAdmin) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限查看此项目的支出统计'
          });
          return;
        }
        
        // 获取已批准的支出总额
        const [expenditureResult] = await pool.query(
          `SELECT 
            COALESCE(SUM(amount), 0) as total_used,
            COUNT(*) as count
          FROM \`ExpenditureRecord\` 
          WHERE project_id = ? AND status = 'approved'`,
          [projectId]
        );
        
        // 获取按分类统计
        const [categoryResult] = await pool.query(
          `SELECT 
            category,
            COUNT(*) as count,
            COALESCE(SUM(amount), 0) as total_amount
          FROM \`ExpenditureRecord\` 
          WHERE project_id = ? AND status = 'approved'
          GROUP BY category
          ORDER BY total_amount DESC`,
          [projectId]
        );
        
        // 获取最近支出
        const [recentResult] = await pool.query(
          `SELECT 
            expense_no,
            item_name,
            amount,
            expense_date,
            status
          FROM \`ExpenditureRecord\` 
          WHERE project_id = ?
          ORDER BY created_at DESC
          LIMIT 5`,
          [projectId]
        );
        
        sendResponse(res, 200, {
          success: true,
          data: {
            total_used: parseFloat(expenditureResult[0]?.total_used || 0),
            count: parseInt(expenditureResult[0]?.count || 0),
            by_category: categoryResult.map(item => ({
              category: item.category,
              count: parseInt(item.count),
              total_amount: parseFloat(item.total_amount)
            })),
            recent: recentResult
          }
        });
        
      } catch (error) {
        console.error('获取项目支出统计失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取项目支出统计失败',
          message: error.message
        });
      }
      return;
    }
    // ==================== 报表统计API ====================

    // 1. 获取成果统计摘要
    if (pathname === '/api/reports/achievements/summary' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const { 
        start_date, 
        end_date, 
        project_ids,
        period = 'month' 
      } = query;
      
      try {
        console.log('📊 获取成果统计摘要，用户:', user.id, '参数:', query);
        
        // 确定时间范围
        let dateRange = {};
        const now = new Date();
        let startDate, endDate;
        
        switch(period) {
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          case 'quarter':
            startDate = new Date(now.setMonth(now.getMonth() - 3));
            break;
          case 'year':
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
          default:
            if (start_date && end_date) {
              startDate = new Date(start_date);
              endDate = new Date(end_date);
            } else {
              startDate = new Date(now.setMonth(now.getMonth() - 1));
              endDate = new Date();
            }
        }
        
        if (!endDate) {
          endDate = new Date();
        }
        
        // 格式化日期
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        console.log('📅 统计时间范围:', startDateStr, '至', endDateStr);
        
        // 构建查询条件
        let whereClause = 'WHERE pa.created_at BETWEEN ? AND ?';
        const params = [startDateStr, endDateStr];
        let projectFilter = '';
        
        if (project_ids && !checkPermission(user.role, ['admin', 'assistant'])) {
          const projectIds = project_ids.split(',');
          projectFilter = ` AND pa.project_id IN (${projectIds.map(() => '?').join(',')})`;
          params.push(...projectIds);
        }
        
        // 获取当前周期数据
        const currentSummaryQuery = `
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN pa.status = 'verified' THEN 1 ELSE 0 END) as verified,
            SUM(CASE WHEN pa.status = 'published' THEN 1 ELSE 0 END) as published,
            SUM(CASE WHEN pa.status = 'submitted' THEN 1 ELSE 0 END) as submitted,
            SUM(CASE WHEN pa.status = 'draft' THEN 1 ELSE 0 END) as draft,
            SUM(CASE WHEN pa.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
            ROUND(
              SUM(CASE WHEN pa.status IN ('verified', 'published') THEN 1 ELSE 0 END) * 100.0 / 
              NULLIF(SUM(CASE WHEN pa.status IN ('verified', 'published', 'rejected') THEN 1 ELSE 0 END), 0), 
              1
            ) as approval_rate
          FROM \`ProjectAchievement\` pa
          ${whereClause}
          ${projectFilter}
          ${!checkPermission(user.role, ['admin', 'assistant']) ? 'AND pa.created_by = ?' : ''}
        `;
        
        if (!checkPermission(user.role, ['admin', 'assistant'])) {
          params.push(user.id);
        }
        
        console.log('🔍 执行当前周期统计SQL:', currentSummaryQuery);
        console.log('🔍 参数:', params);
        
        const [currentSummary] = await pool.query(currentSummaryQuery, params);
        const current = currentSummary[0] || {
          total: 0, verified: 0, published: 0, submitted: 0, draft: 0, rejected: 0, approval_rate: 0
        };
        
        // 获取上一周期数据用于比较
        const prevStartDate = new Date(startDate);
        const prevEndDate = new Date(endDate);
        
        // 根据周期计算上一周期
        switch(period) {
          case 'week':
            prevStartDate.setDate(prevStartDate.getDate() - 7);
            prevEndDate.setDate(prevEndDate.getDate() - 7);
            break;
          case 'month':
            prevStartDate.setMonth(prevStartDate.getMonth() - 1);
            prevEndDate.setMonth(prevEndDate.getMonth() - 1);
            break;
          case 'quarter':
            prevStartDate.setMonth(prevStartDate.getMonth() - 3);
            prevEndDate.setMonth(prevEndDate.getMonth() - 3);
            break;
          case 'year':
            prevStartDate.setFullYear(prevStartDate.getFullYear() - 1);
            prevEndDate.setFullYear(prevEndDate.getFullYear() - 1);
            break;
        }
        
        const prevStartDateStr = prevStartDate.toISOString().split('T')[0];
        const prevEndDateStr = prevEndDate.toISOString().split('T')[0];
        
        const prevParams = [
          prevStartDateStr,
          prevEndDateStr,
          ...(project_ids ? project_ids.split(',') : [])
        ];
        
        if (!checkPermission(user.role, ['admin', 'assistant'])) {
          prevParams.push(user.id);
        }
        
        const prevSummaryQuery = `
          SELECT 
            COUNT(*) as prev_total,
            SUM(CASE WHEN pa.status IN ('verified', 'published') THEN 1 ELSE 0 END) as prev_approved
          FROM \`ProjectAchievement\` pa
          WHERE pa.created_at BETWEEN ? AND ?
          ${projectFilter}
          ${!checkPermission(user.role, ['admin', 'assistant']) ? 'AND pa.created_by = ?' : ''}
        `;
        
        const [prevSummary] = await pool.query(prevSummaryQuery, prevParams);
        const prev = prevSummary[0] || { prev_total: 0, prev_approved: 0 };
        
        // 计算增长趋势
        const growthRate = prev.prev_total > 0 ? 
          ((current.total - prev.prev_total) / prev.prev_total * 100).toFixed(1) : 0;
        
        const approved = (current.verified || 0) + (current.published || 0);
        const prevApproved = prev.prev_approved || 0;
        const totalCompare = current.total - prev.prev_total;
        const approvedCompare = approved - prevApproved;
        const approvalRate = current.approval_rate || 0;
        
        // 计算通过率变化
        const prevApprovalRate = prev.prev_total > 0 ? 
          (prevApproved * 100.0 / prev.prev_total).toFixed(1) : 0;
        const rateCompare = (approvalRate - prevApprovalRate).toFixed(1);
        
        // 构建响应数据
        const summaryData = {
          total: current.total || 0,
          approved: approved,
          pending: current.submitted || 0,
          rejected: current.rejected || 0,
          approvalRate: parseFloat(approvalRate),
          growthRate: parseFloat(growthRate),
          totalCompare: totalCompare,
          approvedCompare: approvedCompare,
          pendingCompare: 0, // 需要更复杂的查询
          rateCompare: parseFloat(rateCompare),
          startDate: startDateStr,
          endDate: endDateStr
        };
        
        console.log('📊 统计结果:', summaryData);
        
        sendResponse(res, 200, {
          success: true,
          data: {
            summary: summaryData,
            timeRange: {
              start: startDateStr,
              end: endDateStr,
              period: period
            }
          }
        });
        
      } catch (error) {
        console.error('获取成果统计摘要失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取成果统计摘要失败',
          message: error.message,
          sql: error.sql
        });
      }
      return;
    }

    // 2. 获取成果类型分布
    if (pathname === '/api/reports/achievements/distribution' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const { 
        start_date, 
        end_date, 
        dimension = 'type',
        project_ids 
      } = query;
      
      try {
        console.log('📊 获取成果分布，用户:', user.id, '维度:', dimension);
        
        // 确定时间范围
        const now = new Date();
        let startDate, endDate;
        
        if (start_date && end_date) {
          startDate = new Date(start_date);
          endDate = new Date(end_date);
        } else {
          endDate = new Date();
          startDate = new Date(endDate);
          startDate.setMonth(startDate.getMonth() - 1);
        }
        
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        // 构建查询
        let groupByField = 'pa.type';
        let labelField = 'pa.type as label';
        
        switch(dimension) {
          case 'project':
            groupByField = 'pa.project_id, p.title';
            labelField = 'p.title as label';
            break;
          case 'author':
            groupByField = 'pa.created_by, u.name';
            labelField = 'u.name as label';
            break;
          case 'status':
            groupByField = 'pa.status';
            labelField = 'pa.status as label';
            break;
        }
        
        let whereClause = 'WHERE pa.created_at BETWEEN ? AND ?';
        const params = [startDateStr, endDateStr];
        let projectFilter = '';
        
        if (project_ids) {
          const projectIds = project_ids.split(',');
          projectFilter = ` AND pa.project_id IN (${projectIds.map(() => '?').join(',')})`;
          params.push(...projectIds);
        }
        
        // 获取总数用于计算百分比
        const totalQuery = `
          SELECT COUNT(*) as total
          FROM \`ProjectAchievement\` pa
          ${whereClause}
          ${projectFilter}
          ${!checkPermission(user.role, ['admin', 'assistant']) ? 'AND pa.created_by = ?' : ''}
        `;
        
        if (!checkPermission(user.role, ['admin', 'assistant'])) {
          params.push(user.id);
        }
        
        const [totalResult] = await pool.query(totalQuery, params);
        const total = totalResult[0]?.total || 1;
        
        // 获取分布数据
        const distributionQuery = `
          SELECT 
            ${labelField},
            ${groupByField === 'pa.type' ? 'pa.type as type' : "'category' as type"},
            COUNT(*) as count,
            ROUND(COUNT(*) * 100.0 / ?, 1) as percentage
          FROM \`ProjectAchievement\` pa
          ${groupByField.includes('p.title') ? 'LEFT JOIN `Project` p ON pa.project_id = p.id' : ''}
          ${groupByField.includes('u.name') ? 'LEFT JOIN `User` u ON pa.created_by = u.id' : ''}
          ${whereClause}
          ${projectFilter}
          ${!checkPermission(user.role, ['admin', 'assistant']) ? 'AND pa.created_by = ?' : ''}
          GROUP BY ${groupByField}
          ORDER BY count DESC
        `;
        
        const distributionParams = [total, ...params.slice(2)];
        
        if (!checkPermission(user.role, ['admin', 'assistant'])) {
          distributionParams.push(user.id);
        }
        
        console.log('🔍 执行分布查询SQL:', distributionQuery);
        
        const [distribution] = await pool.query(distributionQuery, distributionParams);
        
        // 处理标签
        const processedData = distribution.map(item => {
          const label = dimension === 'status' ? 
            getStatusLabel(item.label) : 
            (dimension === 'type' ? getAchievementTypeLabel(item.label) : item.label);
          
          return {
            ...item,
            label: label,
            percentage: parseFloat(item.percentage)
          };
        });
        
        sendResponse(res, 200, {
          success: true,
          data: processedData,
          dimension: dimension,
          total: total
        });
        
      } catch (error) {
        console.error('获取成果分布失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取成果分布失败',
          message: error.message
        });
      }
      return;
    }

    // 3. 获取成果趋势数据
    if (pathname === '/api/reports/achievements/trend' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const { 
        period = '30', 
        group_by = 'day',
        project_ids 
      } = query;
      
      const days = parseInt(period);
      
      try {
        console.log('📈 获取成果趋势，用户:', user.id, '天数:', days);
        
        // 确定时间范围
        const endDate = new Date();
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - days);
        
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        // 构建查询
        let dateFormat, interval;
        switch(group_by) {
          case 'day':
            dateFormat = '%Y-%m-%d';
            break;
          case 'week':
            dateFormat = '%Y-%u';
            break;
          case 'month':
            dateFormat = '%Y-%m';
            break;
          default:
            dateFormat = '%Y-%m-%d';
        }
        
        let whereClause = 'WHERE pa.created_at BETWEEN ? AND ?';
        const params = [startDateStr, endDateStr];
        let projectFilter = '';
        
        if (project_ids) {
          const projectIds = project_ids.split(',');
          projectFilter = ` AND pa.project_id IN (${projectIds.map(() => '?').join(',')})`;
          params.push(...projectIds);
        }
        
        // 获取趋势数据
        const trendQuery = `
          SELECT 
            DATE_FORMAT(pa.created_at, '${dateFormat}') as date,
            COUNT(*) as total,
            SUM(CASE WHEN pa.status IN ('verified', 'published') THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN pa.status = 'submitted' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN pa.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
            ROUND(
              SUM(CASE WHEN pa.status IN ('verified', 'published') THEN 1 ELSE 0 END) * 100.0 / 
              NULLIF(SUM(CASE WHEN pa.status IN ('verified', 'published', 'rejected') THEN 1 ELSE 0 END), 0), 
              1
            ) as rate
          FROM \`ProjectAchievement\` pa
          ${whereClause}
          ${projectFilter}
          ${!checkPermission(user.role, ['admin', 'assistant']) ? 'AND pa.created_by = ?' : ''}
          GROUP BY DATE_FORMAT(pa.created_at, '${dateFormat}')
          ORDER BY date
        `;
        
        if (!checkPermission(user.role, ['admin', 'assistant'])) {
          params.push(user.id);
        }
        
        console.log('🔍 执行趋势查询SQL:', trendQuery);
        
        const [trendData] = await pool.query(trendQuery, params);
        
        // 补全缺失的日期
        const result = [];
        let currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
          let dateStr;
          switch(group_by) {
            case 'day':
              dateStr = currentDate.toISOString().split('T')[0];
              break;
            case 'week':
              const year = currentDate.getFullYear();
              const week = Math.ceil(((currentDate - new Date(year, 0, 1)) / 86400000 + 1) / 7);
              dateStr = `${year}-${week.toString().padStart(2, '0')}`;
              break;
            case 'month':
              const month = currentDate.getMonth() + 1;
              dateStr = `${currentDate.getFullYear()}-${month.toString().padStart(2, '0')}`;
              break;
          }
          
          const dayData = trendData.find(d => d.date === dateStr);
          
          result.push({
            date: dateStr,
            total: dayData ? parseInt(dayData.total) : 0,
            approved: dayData ? parseInt(dayData.approved) : 0,
            pending: dayData ? parseInt(dayData.pending) : 0,
            rejected: dayData ? parseInt(dayData.rejected) : 0,
            rate: dayData ? parseFloat(dayData.rate) : 0
          });
          
          // 递增日期
          switch(group_by) {
            case 'day':
              currentDate.setDate(currentDate.getDate() + 1);
              break;
            case 'week':
              currentDate.setDate(currentDate.getDate() + 7);
              break;
            case 'month':
              currentDate.setMonth(currentDate.getMonth() + 1);
              break;
          }
        }
        
        sendResponse(res, 200, {
          success: true,
          data: result,
          period: days,
          group_by: group_by
        });
        
      } catch (error) {
        console.error('获取成果趋势失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取成果趋势失败',
          message: error.message
        });
      }
      return;
    }

    // 4. 获取项目成果排名
    if (pathname === '/api/reports/projects/ranking' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const { 
        limit = 10, 
        order_by = 'count',
        start_date, 
        end_date 
      } = query;
      
      const topLimit = parseInt(limit);
      
      try {
        console.log('🏆 获取项目排名，用户:', user.id, '数量:', topLimit);
        
        // 确定时间范围
        let startDate, endDate;
        const now = new Date();
        
        if (start_date && end_date) {
          startDate = new Date(start_date);
          endDate = new Date(end_date);
        } else {
          endDate = new Date();
          startDate = new Date(endDate);
          startDate.setFullYear(startDate.getFullYear() - 1);
        }
        
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        // 确定排序字段
        let orderField;
        switch(order_by) {
          case 'rate':
            orderField = 'approval_rate DESC';
            break;
          case 'count':
          default:
            orderField = 'achievement_count DESC';
        }
        
        // 获取项目排名
        let rankingQuery = '';
        let params = [startDateStr, endDateStr];
        
        if (checkPermission(user.role, ['admin', 'assistant'])) {
          // 管理员查看所有项目
          rankingQuery = `
            SELECT 
              p.id,
              p.title as name,
              p.project_code,
              COUNT(pa.id) as achievement_count,
              SUM(CASE WHEN pa.status IN ('verified', 'published') THEN 1 ELSE 0 END) as approved_count,
              ROUND(
                SUM(CASE WHEN pa.status IN ('verified', 'published') THEN 1 ELSE 0 END) * 100.0 / 
                NULLIF(COUNT(CASE WHEN pa.status IN ('verified', 'published', 'rejected') THEN 1 END), 0), 
                1
              ) as approval_rate
            FROM \`Project\` p
            LEFT JOIN \`ProjectAchievement\` pa ON p.id = pa.project_id 
              AND pa.created_at BETWEEN ? AND ?
            GROUP BY p.id, p.title, p.project_code
            HAVING achievement_count > 0
            ORDER BY ${orderField}
            LIMIT ?
          `;
          params.push(topLimit);
        } else {
          // 普通用户只能查看自己参与的项目
          rankingQuery = `
            SELECT 
              p.id,
              p.title as name,
              p.project_code,
              COUNT(pa.id) as achievement_count,
              SUM(CASE WHEN pa.status IN ('verified', 'published') THEN 1 ELSE 0 END) as approved_count,
              ROUND(
                SUM(CASE WHEN pa.status IN ('verified', 'published') THEN 1 ELSE 0 END) * 100.0 / 
                NULLIF(COUNT(CASE WHEN pa.status IN ('verified', 'published', 'rejected') THEN 1 END), 0), 
                1
              ) as approval_rate
            FROM \`Project\` p
            LEFT JOIN \`ProjectAchievement\` pa ON p.id = pa.project_id 
              AND pa.created_at BETWEEN ? AND ?
            WHERE p.applicant_id = ? OR p.id IN (
              SELECT project_id FROM \`ProjectMember\` WHERE user_id = ?
            )
            GROUP BY p.id, p.title, p.project_code
            HAVING achievement_count > 0
            ORDER BY ${orderField}
            LIMIT ?
          `;
          params.push(user.id, user.id, topLimit);
        }
        
        console.log('🔍 执行排名查询SQL:', rankingQuery);
        
        const [rankingData] = await pool.query(rankingQuery, params);
        
        // 处理数据
        const processedData = rankingData.map(item => ({
          id: item.id,
          name: item.name,
          project_code: item.project_code,
          count: parseInt(item.achievement_count),
          approved_count: parseInt(item.approved_count),
          rate: parseFloat(item.approval_rate) || 0
        }));
        
        sendResponse(res, 200, {
          success: true,
          data: processedData,
          limit: topLimit,
          order_by: order_by
        });
        
      } catch (error) {
        console.error('获取项目排名失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取项目排名失败',
          message: error.message
        });
      }
      return;
    }

    // 5. 获取详细统计表格数据
    if (pathname === '/api/reports/achievements/detailed' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const { 
        page = 1, 
        limit = 10,
        sort_by = 'total',
        sort_order = 'desc',
        start_date, 
        end_date 
      } = query;
      
      const pageNum = parseInt(page);
      const pageSize = parseInt(limit);
      const offset = (pageNum - 1) * pageSize;
      
      try {
        console.log('📋 获取详细统计表格，用户:', user.id, '分页:', {page, limit});
        
        // 确定时间范围
        let startDate, endDate;
        const now = new Date();
        
        if (start_date && end_date) {
          startDate = new Date(start_date);
          endDate = new Date(end_date);
        } else {
          endDate = new Date();
          startDate = new Date(endDate);
          startDate.setMonth(startDate.getMonth() - 3);
        }
        
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        // 获取按类型统计的详细数据
        let detailedQuery = `
          SELECT 
            pa.type,
            COUNT(*) as total,
            SUM(CASE WHEN pa.status IN ('verified', 'published') THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN pa.status = 'submitted' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN pa.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
            ROUND(
              SUM(CASE WHEN pa.status IN ('verified', 'published') THEN 1 ELSE 0 END) * 100.0 / 
              NULLIF(SUM(CASE WHEN pa.status IN ('verified', 'published', 'rejected') THEN 1 ELSE 0 END), 0), 
              1
            ) as approval_rate,
            ROUND(AVG(DATEDIFF(COALESCE(pa.verified_at, pa.created_at), pa.created_at)), 1) as avg_review_days
          FROM \`ProjectAchievement\` pa
          WHERE pa.created_at BETWEEN ? AND ?
          ${!checkPermission(user.role, ['admin', 'assistant']) ? 'AND pa.created_by = ?' : ''}
          GROUP BY pa.type
        `;
        
        let countQuery = `
          SELECT COUNT(DISTINCT pa.type) as total
          FROM \`ProjectAchievement\` pa
          WHERE pa.created_at BETWEEN ? AND ?
          ${!checkPermission(user.role, ['admin', 'assistant']) ? 'AND pa.created_by = ?' : ''}
        `;
        
        const params = [startDateStr, endDateStr];
        const countParams = [startDateStr, endDateStr];
        
        if (!checkPermission(user.role, ['admin', 'assistant'])) {
          params.push(user.id);
          countParams.push(user.id);
        }
        
        // 添加排序
        let orderBy = '';
        switch(sort_by) {
          case 'type':
            orderBy = `type ${sort_order === 'asc' ? 'ASC' : 'DESC'}`;
            break;
          case 'approval_rate':
            orderBy = `approval_rate ${sort_order === 'asc' ? 'ASC' : 'DESC'}`;
            break;
          case 'total':
          default:
            orderBy = `total ${sort_order === 'asc' ? 'ASC' : 'DESC'}`;
        }
        
        detailedQuery += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
        params.push(pageSize, offset);
        
        console.log('🔍 执行详细统计查询SQL:', detailedQuery);
        
        const [detailedData] = await pool.query(detailedQuery, params);
        const [countResult] = await pool.query(countQuery, countParams);
        const total = countResult[0]?.total || 0;
        
        // 计算趋势（与上一周期比较）
        const prevStartDate = new Date(startDate);
        const prevEndDate = new Date(endDate);
        prevStartDate.setMonth(prevStartDate.getMonth() - 3);
        prevEndDate.setMonth(prevEndDate.getMonth() - 3);
        
        const prevStartDateStr = prevStartDate.toISOString().split('T')[0];
        const prevEndDateStr = prevEndDate.toISOString().split('T')[0];
        
        const prevQuery = `
          SELECT 
            pa.type,
            COUNT(*) as prev_total
          FROM \`ProjectAchievement\` pa
          WHERE pa.created_at BETWEEN ? AND ?
          ${!checkPermission(user.role, ['admin', 'assistant']) ? 'AND pa.created_by = ?' : ''}
          GROUP BY pa.type
        `;
        
        const prevParams = [prevStartDateStr, prevEndDateStr];
        if (!checkPermission(user.role, ['admin', 'assistant'])) {
          prevParams.push(user.id);
        }
        
        const [prevData] = await pool.query(prevQuery, prevParams);
        
        // 处理最终数据
        const processedData = detailedData.map(item => {
          const prevItem = prevData.find(p => p.type === item.type);
          const prevTotal = prevItem ? parseInt(prevItem.prev_total) : 0;
          const currentTotal = parseInt(item.total);
          
          const trend = prevTotal > 0 ? 
            ((currentTotal - prevTotal) / prevTotal * 100).toFixed(1) : 0;
          
          return {
            type: item.type,
            type_label: getAchievementTypeLabel(item.type),
            total: currentTotal,
            approved: parseInt(item.approved),
            pending: parseInt(item.pending),
            rejected: parseInt(item.rejected),
            approval_rate: parseFloat(item.approval_rate) || 0,
            avg_review_time: parseFloat(item.avg_review_days) || 0,
            trend: parseFloat(trend)
          };
        });
        
        // 计算平均数据
        const avgApprovalRate = processedData.length > 0 ? 
          processedData.reduce((sum, item) => sum + item.approval_rate, 0) / processedData.length : 0;
        
        const avgReviewTime = processedData.length > 0 ? 
          processedData.reduce((sum, item) => sum + item.avg_review_time, 0) / processedData.length : 0;
        
        sendResponse(res, 200, {
          success: true,
          data: {
            table_data: processedData,
            summary: {
              avg_approval_rate: avgApprovalRate.toFixed(1),
              avg_review_time: avgReviewTime.toFixed(1),
              total_items: total
            },
            pagination: {
              page: pageNum,
              limit: pageSize,
              total: total,
              pages: Math.ceil(total / pageSize)
            }
          }
        });
        
      } catch (error) {
        console.error('获取详细统计失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取详细统计失败',
          message: error.message
        });
      }
      return;
    }

    // 6. 导出报表数据
    if (pathname === '/api/reports/export' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const { report_type = 'achievements', ...filters } = query;
      
      try {
        console.log('📤 导出报表，用户:', user.id, '类型:', report_type);
        
        // 根据报表类型获取数据
        let exportData;
        
        switch(report_type) {
          case 'achievements':
            // 获取成果统计数据
            const [achievements] = await pool.query(`
              SELECT 
                pa.type,
                pa.title,
                pa.status,
                DATE_FORMAT(pa.created_at, '%Y-%m-%d') as created_date,
                p.title as project_title,
                u.name as created_by_name
              FROM \`ProjectAchievement\` pa
              LEFT JOIN \`Project\` p ON pa.project_id = p.id
              LEFT JOIN \`User\` u ON pa.created_by = u.id
              WHERE 1=1
              ${!checkPermission(user.role, ['admin', 'assistant']) ? 'AND pa.created_by = ?' : ''}
              ORDER BY pa.created_at DESC
            `, checkPermission(user.role, ['admin', 'assistant']) ? [] : [user.id]);
            
            exportData = achievements.map(item => ({
              成果类型: getAchievementTypeLabel(item.type),
              成果标题: item.title,
              状态: getStatusLabel(item.status),
              创建日期: item.created_date,
              所属项目: item.project_title || '未关联项目',
              创建人: item.created_by_name
            }));
            break;
            
          case 'projects':
            // 获取项目统计数据
            const [projects] = await pool.query(`
              SELECT 
                p.title,
                p.project_code,
                p.category,
                p.status,
                p.budget_total,
                DATE_FORMAT(p.created_at, '%Y-%m-%d') as created_date,
                u.name as applicant_name
              FROM \`Project\` p
              LEFT JOIN \`User\` u ON p.applicant_id = u.id
              WHERE 1=1
              ${!checkPermission(user.role, ['admin', 'assistant']) ? 'AND p.applicant_id = ?' : ''}
              ORDER BY p.created_at DESC
            `, checkPermission(user.role, ['admin', 'assistant']) ? [] : [user.id]);
            
            exportData = projects.map(item => ({
              项目名称: item.title,
              项目编号: item.project_code,
              项目类别: item.category,
              项目状态: getProjectStatusLabel(item.status),
              项目预算: item.budget_total,
              创建日期: item.created_date,
              申请人: item.applicant_name
            }));
            break;
            
          default:
            exportData = [];
        }
        
        const filename = `${report_type}_report_${new Date().toISOString().split('T')[0]}.json`;
        
        sendResponse(res, 200, {
          success: true,
          data: exportData,
          filename: filename,
          count: exportData.length
        });
        
      } catch (error) {
        console.error('导出报表失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '导出报表失败',
          message: error.message
        });
      }
      return;
    }

    // 辅助函数：获取成果类型标签
    function getAchievementTypeLabel(type) {
      const typeMap = {
        'paper': '论文',
        'patent': '专利',
        'software': '软件著作权',
        'monograph': '专著',
        'award': '奖项',
        'report': '报告',
        'prototype': '原型',
        'standard': '标准',
        'other': '其他'
      };
      return typeMap[type] || type;
    }

    // 辅助函数：获取项目状态标签
    function getProjectStatusLabel(status) {
      const statusMap = {
        'draft': '草稿',
        'submitted': '已提交',
        'under_review': '评审中',
        'approved': '已批准',
        'rejected': '已拒绝',
        'in_progress': '进行中',
        'stage_review': '阶段评审',
        'completed': '已完成',
        'terminated': '已终止'
      };
      return statusMap[status] || status;
    }

    // 辅助函数：获取成果状态标签
    function getStatusLabel(status) {
      const statusMap = {
        'draft': '草稿',
        'submitted': '已提交',
        'under_review': '审核中',
        'verified': '已验证',
        'published': '已发布',
        'rejected': '已驳回',
        'returned': '已退回',
        'transferred': '已转化',
        'applied': '已应用'
      };
      return statusMap[status] || status;
    }
    // 辅助函数：获取相对时间描述
    function getTimeAgo(dateStr) {
      if (!dateStr) return '未知时间';
      
      const now = new Date();
      const date = new Date(dateStr);
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return '刚刚';
      if (diffMins < 60) return `${diffMins}分钟前`;
      if (diffHours < 24) return `${diffHours}小时前`;
      if (diffDays < 30) return `${diffDays}天前`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;
      return `${Math.floor(diffDays / 365)}年前`;
    }

    // 辅助函数：根据通知类型获取图标
    function getNotificationIcon(type) {
      const iconMap = {
        'system': '⚙️',
        'project': '📋',
        'review': '⭐',
        'funding': '💰',
        'expenditure': '💳',
        'achievement': '🏆',
        'reminder': '⏰',
        'warning': '⚠️',
        'info': 'ℹ️',
        'success': '✅',
        'error': '❌'
      };
      return iconMap[type] || '📢';
    }
        // ==================== 通知中心API ====================

    // 1. 获取通知列表（带分页和过滤）
    if (pathname === '/api/notifications' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 解析查询参数
      const {
        page = 1,
        limit = 20,
        type = '',
        priority = '',
        unread_only = 'false',
        start_date = '',
        end_date = ''
      } = query;
      
      const offset = (page - 1) * limit;
      
      console.log('🔔 获取通知列表，用户:', user.id, '参数:', {
        page, limit, type, priority, unread_only, start_date, end_date
      });
      
      try {
        // 构建查询条件
        let sql = `
          SELECT 
            id,
            type,
            title,
            content as description,
            related_id,
            related_type,
            priority,
            action_url,
            is_read,
            read_at,
            expires_at,
            DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
          FROM \`Notification\`
          WHERE user_id = ?
        `;
        
        let countSql = 'SELECT COUNT(*) as total FROM `Notification` WHERE user_id = ?';
        const params = [user.id];
        const countParams = [user.id];
        
        // 类型过滤
        if (type) {
          sql += ' AND type = ?';
          countSql += ' AND type = ?';
          params.push(type);
          countParams.push(type);
        }
        
        // 优先级过滤
        if (priority) {
          sql += ' AND priority = ?';
          countSql += ' AND priority = ?';
          params.push(priority);
          countParams.push(priority);
        }
        
        // 未读过滤
        if (unread_only === 'true') {
          sql += ' AND is_read = FALSE';
          countSql += ' AND is_read = FALSE';
        }
        
        // 日期范围过滤
        if (start_date) {
          sql += ' AND DATE(created_at) >= ?';
          countSql += ' AND DATE(created_at) >= ?';
          params.push(start_date);
          countParams.push(start_date);
        }
        
        if (end_date) {
          sql += ' AND DATE(created_at) <= ?';
          countSql += ' AND DATE(created_at) <= ?';
          params.push(end_date);
          countParams.push(end_date);
        }
        
        // 排序和分页
        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);
        
        console.log('🔍 执行通知查询SQL:', sql);
        console.log('🔍 参数:', params);
        
        // 执行查询
        const [notifications] = await pool.query(sql, params);
        const [totalResult] = await pool.query(countSql, countParams);
        const total = totalResult[0]?.total || 0;
        
        // 获取未读数量
        const [unreadResult] = await pool.query(
          'SELECT COUNT(*) as unread_count FROM `Notification` WHERE user_id = ? AND is_read = FALSE',
          [user.id]
        );
        
        const unreadCount = unreadResult[0]?.unread_count || 0;
        
        // 格式化响应数据
        const formattedNotifications = notifications.map(notification => ({
          id: notification.id,
          title: notification.title,
          description: notification.content || notification.description,
          type: notification.type,
          priority: notification.priority,
          related_id: notification.related_id,
          related_type: notification.related_type,
          action_url: notification.action_url,
          is_read: notification.is_read === 1,
          read_at: notification.read_at,
          expires_at: notification.expires_at,
          created_at: notification.created_at,
          time_ago: getTimeAgo(notification.created_at)
        }));
        
        console.log(`✅ 获取通知成功，共 ${formattedNotifications.length} 条，总共 ${total} 条`);
        
        sendResponse(res, 200, {
          success: true,
          data: {
            notifications: formattedNotifications,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: total,
              total_pages: Math.ceil(total / limit)
            },
            unread_count: unreadCount
          }
        });
        
      } catch (error) {
        console.error('获取通知列表失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取通知列表失败',
          message: error.message,
          sqlMessage: error.sqlMessage
        });
      }
      return;
    }

    // 2. 获取通知统计
    if (pathname === '/api/notifications/stats' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      try {
        console.log('📊 获取通知统计，用户:', user.id);
        
        // 获取各类统计
        const [stats] = await pool.query(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) as unread,
            SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent,
            SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high,
            SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as medium,
            SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as low,
            SUM(CASE WHEN type = 'system' THEN 1 ELSE 0 END) as system,
            SUM(CASE WHEN type = 'project' THEN 1 ELSE 0 END) as project,
            SUM(CASE WHEN type = 'review' THEN 1 ELSE 0 END) as review,
            SUM(CASE WHEN type = 'funding' THEN 1 ELSE 0 END) as funding,
            SUM(CASE WHEN type = 'expenditure' THEN 1 ELSE 0 END) as expenditure,
            SUM(CASE WHEN type = 'achievement' THEN 1 ELSE 0 END) as achievement,
            SUM(CASE WHEN type = 'reminder' THEN 1 ELSE 0 END) as reminder,
            SUM(CASE WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 1 ELSE 0 END) as expired
          FROM \`Notification\`
          WHERE user_id = ?
        `, [user.id]);
        
        // 获取最近7天的通知趋势
        const [trendData] = await pool.query(`
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as count,
            SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) as unread_count
          FROM \`Notification\`
          WHERE user_id = ? 
            AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          GROUP BY DATE(created_at)
          ORDER BY date
        `, [user.id]);
        
        // 补全最近7天的数据
        const trend = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          const dayData = trendData.find(d => d.date.toISOString().split('T')[0] === dateStr);
          
          trend.push({
            date: dateStr,
            count: dayData ? parseInt(dayData.count) : 0,
            unread_count: dayData ? parseInt(dayData.unread_count) : 0
          });
        }
        
        console.log('📊 通知统计结果:', stats[0]);
        
        sendResponse(res, 200, {
          success: true,
          data: {
            summary: stats[0] || {
              total: 0, unread: 0, urgent: 0, high: 0, medium: 0, low: 0,
              system: 0, project: 0, review: 0, funding: 0, expenditure: 0, 
              achievement: 0, reminder: 0, expired: 0
            },
            trend: trend,
            last_updated: new Date().toISOString()
          }
        });
        
      } catch (error) {
        console.error('获取通知统计失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取通知统计失败',
          message: error.message
        });
      }
      return;
    }

    // 3. 标记通知为已读
    if (pathname.startsWith('/api/notifications/') && pathname.endsWith('/read') && req.method === 'PUT') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const notificationId = pathname.replace('/api/notifications/', '').replace('/read', '');
      
      console.log('✅ 标记通知为已读，通知ID:', notificationId, '用户:', user.id);
      
      try {
        const [result] = await pool.query(
          'UPDATE `Notification` SET is_read = TRUE, read_at = NOW() WHERE id = ? AND user_id = ?',
          [notificationId, user.id]
        );
        
        if (result.affectedRows === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '通知不存在或没有权限'
          });
          return;
        }
        
        sendResponse(res, 200, {
          success: true,
          message: '通知已标记为已读',
          notification_id: notificationId
        });
        
      } catch (error) {
        console.error('标记通知已读失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '标记通知失败',
          message: error.message
        });
      }
      return;
    }

    // 4. 标记所有通知为已读
    if (pathname === '/api/notifications/mark-all-read' && req.method === 'PUT') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      console.log('✅ 标记所有通知为已读，用户:', user.id);
      
      try {
        const [result] = await pool.query(
          'UPDATE `Notification` SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND is_read = FALSE',
          [user.id]
        );
        
        sendResponse(res, 200, {
          success: true,
          message: `已标记 ${result.affectedRows} 条通知为已读`,
          affected_rows: result.affectedRows
        });
        
      } catch (error) {
        console.error('标记所有通知已读失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '标记通知失败',
          message: error.message
        });
      }
      return;
    }

    // 5. 删除通知
    if (pathname.startsWith('/api/notifications/') && req.method === 'DELETE') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const notificationId = pathname.replace('/api/notifications/', '');
      
      console.log('🗑️ 删除通知，通知ID:', notificationId, '用户:', user.id);
      
      try {
        const [result] = await pool.query(
          'DELETE FROM `Notification` WHERE id = ? AND user_id = ?',
          [notificationId, user.id]
        );
        
        if (result.affectedRows === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '通知不存在或没有权限'
          });
          return;
        }
        
        sendResponse(res, 200, {
          success: true,
          message: '通知已删除',
          notification_id: notificationId
        });
        
      } catch (error) {
        console.error('删除通知失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '删除通知失败',
          message: error.message
        });
      }
      return;
    }

    // 6. 清空所有已读通知
    if (pathname === '/api/notifications/clear-read' && req.method === 'DELETE') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      console.log('🗑️ 清空已读通知，用户:', user.id);
      
      try {
        const [result] = await pool.query(
          'DELETE FROM `Notification` WHERE user_id = ? AND is_read = TRUE',
          [user.id]
        );
        
        sendResponse(res, 200, {
          success: true,
          message: `已删除 ${result.affectedRows} 条已读通知`,
          affected_rows: result.affectedRows
        });
        
      } catch (error) {
        console.error('清空已读通知失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '清空已读通知失败',
          message: error.message
        });
      }
      return;
    }

    // 7. 获取通知详情
    if (pathname.startsWith('/api/notifications/') && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const notificationId = pathname.replace('/api/notifications/', '');
      
      console.log('🔍 获取通知详情，通知ID:', notificationId, '用户:', user.id);
      
      try {
        const [notifications] = await pool.query(
          `SELECT 
            id,
            type,
            title,
            content as description,
            related_id,
            related_type,
            priority,
            action_url,
            is_read,
            read_at,
            expires_at,
            DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
          FROM \`Notification\`
          WHERE id = ? AND user_id = ?`,
          [notificationId, user.id]
        );
        
        if (notifications.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '通知不存在或没有权限'
          });
          return;
        }
        
        const notification = notifications[0];
        
        // 自动标记为已读（如果未读）
        if (!notification.is_read) {
          await pool.query(
            'UPDATE `Notification` SET is_read = TRUE, read_at = NOW() WHERE id = ?',
            [notificationId]
          );
          notification.is_read = true;
          notification.read_at = new Date().toISOString();
        }
        
        // 获取相关数据（如果有）
        let related_data = null;
        if (notification.related_id && notification.related_type) {
          try {
            switch(notification.related_type) {
              case 'project':
                const [projects] = await pool.query(
                  'SELECT id, title, project_code FROM `Project` WHERE id = ?',
                  [notification.related_id]
                );
                if (projects.length > 0) {
                  related_data = {
                    type: 'project',
                    data: projects[0]
                  };
                }
                break;
                
              case 'achievement':
                const [achievements] = await pool.query(
                  'SELECT id, title, type FROM `ProjectAchievement` WHERE id = ?',
                  [notification.related_id]
                );
                if (achievements.length > 0) {
                  related_data = {
                    type: 'achievement',
                    data: achievements[0]
                  };
                }
                break;
                
              case 'expenditure':
                const [expenditures] = await pool.query(
                  'SELECT id, item_name, amount, status FROM `ExpenditureRecord` WHERE id = ?',
                  [notification.related_id]
                );
                if (expenditures.length > 0) {
                  related_data = {
                    type: 'expenditure',
                    data: expenditures[0]
                  };
                }
                break;
            }
          } catch (error) {
            console.error('获取相关数据失败:', error);
          }
        }
        
        const formattedNotification = {
          id: notification.id,
          title: notification.title,
          description: notification.description,
          content: notification.description,
          type: notification.type,
          priority: notification.priority,
          related_id: notification.related_id,
          related_type: notification.related_type,
          action_url: notification.action_url,
          is_read: notification.is_read === 1,
          read_at: notification.read_at,
          expires_at: notification.expires_at,
          created_at: notification.created_at,
          time_ago: getTimeAgo(notification.created_at),
          related_data: related_data
        };
        
        console.log('✅ 获取通知详情成功:', notificationId);
        
        sendResponse(res, 200, {
          success: true,
          data: formattedNotification
        });
        
      } catch (error) {
        console.error('获取通知详情失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取通知详情失败',
          message: error.message
        });
      }
      return;
    }

    // 8. 创建系统通知（内部API，用于其他模块创建通知）
    if (pathname === '/api/notifications/create' && req.method === 'POST') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      // 只有管理员和系统可以创建通知
      if (!user || !checkPermission(user.role, ['admin', 'assistant'])) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限创建系统通知'
        });
        return;
      }
      
      try {
        const body = await parseRequestBody(req);
        
        console.log('📝 创建系统通知:', body);
        
        // 验证必要字段
        if (!body.user_id || !body.title || !body.content) {
          sendResponse(res, 400, {
            success: false,
            error: '用户ID、标题和内容不能为空'
          });
          return;
        }
        
        // 生成通知ID
        const notificationId = randomUUID();
        
        // 插入通知记录
        const sql = `
          INSERT INTO \`Notification\` (
            id, user_id, type, title, content,
            related_id, related_type, priority,
            action_url, is_read, expires_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        const params = [
          notificationId,
          body.user_id,
          body.type || 'system',
          body.title,
          body.content,
          body.related_id || null,
          body.related_type || null,
          body.priority || 'medium',
          body.action_url || null,
          false, // is_read
          body.expires_at || null
        ];
        
        await pool.query(sql, params);
        
        sendResponse(res, 201, {
          success: true,
          message: '通知创建成功',
          notification_id: notificationId
        });
        
      } catch (error) {
        console.error('创建通知失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '创建通知失败',
          message: error.message
        });
      }
      return;
    }
        // ==================== 评审专家历史API ====================

    // 1. 获取评审历史列表
    if (pathname === '/api/reviewer/history' && req.method === 'GET') {
      console.log('1');
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 检查是否是评审专家
      const isReviewer = user.role === 'reviewer' || user.role === 'admin';
      if (!isReviewer) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限访问评审专家数据'
        });
        return;
      }
      
      // 解析查询参数
      const {
        page = 1,
        limit = 10,
        search = '',
        review_type = '',
        recommendation = '',
        start_date = '',
        end_date = '',
        sort_by = 'review_date',
        sort_order = 'desc'
      } = query;
      
      const offset = (page - 1) * limit;
      
      console.log('📊 获取评审历史，专家ID:', user.id, '参数:', {
        page, limit, search, review_type, recommendation, start_date, end_date, sort_by, sort_order
      });
      
      try {
        // 构建查询条件
        let sql = `
          SELECT 
            pr.id,
            pr.project_id,
            pr.review_type,
            pr.review_date,
            pr.innovation_score,
            pr.feasibility_score,
            pr.significance_score,
            pr.team_score,
            pr.budget_score,
            pr.total_score,
            pr.strengths,
            pr.weaknesses,
            pr.recommendation,
            pr.comments,
            pr.suggestions,
            pr.is_confidential,
            pr.status,
            pr.submitted_at,
            pr.created_at,
            p.title as project_title,
            p.project_code,
            u.name as applicant_name
          FROM \`ProjectReview\` pr
          LEFT JOIN \`Project\` p ON pr.project_id = p.id
          LEFT JOIN \`User\` u ON p.applicant_id = u.id
          WHERE pr.reviewer_id = ?
        `;
        
        let countSql = 'SELECT COUNT(*) as total FROM `ProjectReview` pr WHERE pr.reviewer_id = ?';
        const params = [user.id];
        const countParams = [user.id];
        
        // 搜索条件
        if (search) {
          sql += ' AND (p.title LIKE ? OR p.project_code LIKE ?)';
          countSql += ' AND (SELECT 1 FROM `Project` p WHERE p.id = pr.project_id AND (p.title LIKE ? OR p.project_code LIKE ?))';
          const searchParam = `%${search}%`;
          params.push(searchParam, searchParam);
          countParams.push(searchParam, searchParam);
        }
        
        // 评审类型过滤
        if (review_type) {
          sql += ' AND pr.review_type = ?';
          countSql += ' AND review_type = ?';
          params.push(review_type);
          countParams.push(review_type);
        }
        
        // 结论过滤
        if (recommendation) {
          sql += ' AND pr.recommendation = ?';
          countSql += ' AND recommendation = ?';
          params.push(recommendation);
          countParams.push(recommendation);
        }
        
        // 日期范围过滤
        if (start_date) {
          sql += ' AND DATE(pr.review_date) >= ?';
          countSql += ' AND DATE(review_date) >= ?';
          params.push(start_date);
          countParams.push(start_date);
        }
        
        if (end_date) {
          sql += ' AND DATE(pr.review_date) <= ?';
          countSql += ' AND DATE(review_date) <= ?';
          params.push(end_date);
          countParams.push(end_date);
        }
        
        // 排序
        const validSortFields = ['review_date', 'total_score', 'project_code'];
        const sortField = validSortFields.includes(sort_by) ? sort_by : 'review_date';
        const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        sql += ` ORDER BY pr.${sortField} ${sortDirection}`;
        
        // 分页
        sql += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);
        
        console.log('🔍 执行评审历史查询SQL:', sql);
        
        // 执行查询
        const [reviews] = await pool.query(sql, params);
        const [totalResult] = await pool.query(countSql, countParams);
        const total = totalResult[0]?.total || 0;
        
        // 获取统计数据
        const [stats] = await pool.query(`
          SELECT 
            COUNT(*) as total_reviews,
            AVG(pr.total_score) as average_score,
            SUM(CASE WHEN pr.recommendation = 'approve' THEN 1 ELSE 0 END) as approve_count,
            (SELECT COUNT(*) FROM \`ProjectReview\` pr2 
             WHERE pr2.reviewer_id = ? AND pr2.status = 'draft'
             AND pr2.project_id IN (SELECT id FROM \`Project\` WHERE status = 'under_review')) as pending_reviews
          FROM \`ProjectReview\` pr
          WHERE pr.reviewer_id = ?
        `, [user.id, user.id]);
        
        console.log(`✅ 获取评审历史成功，共 ${reviews.length} 条，总共 ${total} 条`);
        
        sendResponse(res, 200, {
          success: true,
          data: {
            reviews: reviews,
            stats: stats[0] || {
              total_reviews: 0,
              average_score: 0,
              approve_count: 0,
              pending_reviews: 0
            },
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: total,
              total_pages: Math.ceil(total / limit)
            }
          }
        });
        
      } catch (error) {
        console.error('获取评审历史失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取评审历史失败',
          message: error.message,
          sqlMessage: error.sqlMessage
        });
      }
      return;
    }

    // 2. 获取评审详情(工作台)
    // 获取评审专家待评审的项目列表
    if (pathname.startsWith('/api/reviewer/review') && req.method === 'GET') {
      console.log('2');
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, { success: false, error: '认证失败' });
        return;
      }
      
      const isReviewer = user.role === 'reviewer' || user.role === 'admin';
      if (!isReviewer) {
        sendResponse(res, 403, { success: false, error: '没有权限' });
        return;
      }
      
      try {
        console.log(`📋 获取评审专家 ${user.id} 的待评审项目`);
        
        const sql = `
          SELECT 
            p.*,
            u.name as applicant_name,
            u.department as applicant_department,
            u.title as applicant_title,
            pr.id as review_id,
            pr.status as review_status,
            pr.created_at as review_created_at,
            -- 计算紧急程度
            CASE 
              WHEN p.end_date IS NULL THEN 'medium'
              WHEN p.end_date < CURDATE() THEN 'urgent'
              WHEN DATEDIFF(p.end_date, CURDATE()) <= 3 THEN 'high'
              WHEN DATEDIFF(p.end_date, CURDATE()) <= 7 THEN 'medium'
              ELSE 'low'
            END as priority,
            -- 计算剩余天数
            IF(p.end_date IS NULL, NULL, 
              DATEDIFF(p.end_date, CURDATE())) as days_remaining
          FROM \`Project\` p
          LEFT JOIN \`User\` u ON p.applicant_id = u.id
          LEFT JOIN \`ProjectReview\` pr ON p.id = pr.project_id AND pr.reviewer_id = ?
          WHERE p.status IN ('under_review', 'stage_review')
            AND (pr.id IS NULL OR pr.status = 'draft')
          ORDER BY 
            CASE priority
              WHEN 'urgent' THEN 1
              WHEN 'high' THEN 2
              WHEN 'medium' THEN 3
              ELSE 4
            END,
            p.end_date ASC,
            p.created_at DESC
          LIMIT 20
        `;
        
        const [projects] = await pool.query(sql, [user.id]);
        console.log(`✅ 获取到 ${projects.length} 个待评审项目`);
        
        sendResponse(res, 200, {
          success: true,
          data: projects,
          count: projects.length
        });
        
      } catch (error) {
        console.error('获取待评审项目失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取待评审项目失败',
          message: error.message
        });
      }
      return;
    }

    // 4. 获取最近评审记录（用于工作台）
    if (pathname === '/api/reviewer/recent-reviews' && req.method === 'GET') {
      console.log('4');
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 检查是否是评审专家
      const isReviewer = user.role === 'reviewer' || user.role === 'admin';
      if (!isReviewer) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限访问评审记录'
        });
        return;
      }
      
      const { limit = 5 } = query;
      
      console.log('📋 获取最近评审记录，专家ID:', user.id, '数量:', limit);
      
      try {
        const sql = `
          SELECT 
            pr.id,
            pr.project_id,
            pr.review_date,
            pr.total_score,
            pr.recommendation,
            pr.comments,
            pr.status,
            p.title as project_title,
            p.project_code
          FROM \`ProjectReview\` pr
          LEFT JOIN \`Project\` p ON pr.project_id = p.id
          WHERE pr.reviewer_id = ? AND pr.status = 'submitted'
          ORDER BY pr.review_date DESC
          LIMIT ?
        `;
        
        const [recentReviews] = await pool.query(sql, [user.id, parseInt(limit)]);
        
        console.log(`✅ 获取最近评审记录成功，共 ${recentReviews.length} 条`);
        
        sendResponse(res, 200, {
          success: true,
          data: recentReviews
        });
        
      } catch (error) {
        console.error('获取最近评审记录失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取最近评审记录失败',
          message: error.message
        });
      }
      return;
    }
    // ==================== 评审专家API ====================

    function formatDateForMySQL(dateString) {
      if (!dateString) {
        return new Date().toISOString().split('T')[0];
      }
      
      try {
        // 如果已经是 YYYY-MM-DD 格式，直接返回
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
          return dateString;
        }
        
        // 尝试解析日期
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date');
        }
        
        // 格式化为 YYYY-MM-DD
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
        
      } catch (error) {
        console.error('日期格式转换失败，使用今天:', error);
        return new Date().toISOString().split('T')[0];
      }
    }

    // 辅助函数：计算平均分（用于手动计算，因为total_score是计算列）
    function calculateAverageScore(...scores) {
      const validScores = scores.filter(score => score > 0);
      if (validScores.length === 0) return 0;
      const sum = validScores.reduce((a, b) => a + b, 0);
      return Number((sum / validScores.length).toFixed(2));
    }

    // 辅助函数：更新项目评审状态
    async function updateProjectReviewStatus(projectId) {
      try {
        // 检查该项目是否所有评审都已提交
        const [reviews] = await pool.query(`
          SELECT status, COUNT(*) as count
          FROM \`ProjectReview\`
          WHERE project_id = ?
          GROUP BY status
        `, [projectId]);
        
        const totalReviews = reviews.reduce((sum, r) => sum + r.count, 0);
        const submittedReviews = reviews.find(r => r.status === 'submitted')?.count || 0;
        
        console.log(`📊 项目 ${projectId} 评审状态: 总数 ${totalReviews}, 已提交 ${submittedReviews}`);
        
        // 如果所有评审都已提交，更新项目状态为待决策
        if (totalReviews > 0 && totalReviews === submittedReviews) {
          await pool.query(
            'UPDATE `Project` SET status = ? WHERE id = ?',
            ['review_completed', projectId]
          );
          
          console.log(`✅ 项目 ${projectId} 所有评审已完成，状态更新为 review_completed`);
        }
      } catch (error) {
        console.error('更新项目评审状态失败:', error);
      }
    }

    // 辅助函数：创建评审通知
    async function createReviewNotification(projectId, reviewerId, reviewId, action, projectTitle) {
      try {
        // 获取项目信息
        const [projects] = await pool.query(
          'SELECT title, applicant_id FROM `Project` WHERE id = ?',
          [projectId]
        );
        
        if (projects.length === 0) return;
        
        const project = projects[0];
        const notificationId = randomUUID();
        
        if (action === 'submitted') {
          // 给项目申请人发送评审完成通知
          await pool.query(`
            INSERT INTO \`Notification\` (id, user_id, type, title, content, related_id, related_type, priority, created_at)
            VALUES (?, ?, 'review', '评审完成通知', ?, ?, 'ProjectReview', 'medium', NOW())
          `, [
            notificationId,
            project.applicant_id,
            `您的项目"${projectTitle}"收到新的评审意见，请查看详情。`,
            reviewId
          ]);
          
          console.log(`📢 已为申请人 ${project.applicant_id} 创建评审完成通知`);
        } else if (action === 'draft_saved') {
          // 给评审专家自己发送保存提醒
          await pool.query(`
            INSERT INTO \`Notification\` (id, user_id, type, title, content, related_id, related_type, priority, created_at)
            VALUES (?, ?, 'reminder', '评审草稿保存提醒', ?, ?, 'ProjectReview', 'low', NOW())
          `, [
            notificationId,
            reviewerId,
            `您的评审草稿已保存，请及时提交。`,
            reviewId
          ]);
          
          console.log(`📢 已为评审专家 ${reviewerId} 创建草稿保存通知`);
        }
      } catch (error) {
        console.error('创建评审通知失败:', error);
      }
    }

    // 1. 获取评审任务列表
    if (pathname.startsWith('/api/reviewer/viewreview/') && req.method === 'GET') {
      console.log('5');
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 检查是否是评审专家
      const isReviewer = user.role === 'reviewer' || user.role === 'admin';
      if (!isReviewer) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限访问评审功能'
        });
        return;
      }
      
      const { 
        page = 1, 
        limit = 10, 
        status = '', 
        review_type = '',
        search = '' 
      } = query;
      
      const offset = (page - 1) * limit;
      
      try {
        console.log('📋 获取评审任务列表，专家ID:', user.id, '状态:', status);
        
        // 构建查询条件
        let sql = `
          SELECT 
            pr.id,
            pr.project_id,
            pr.review_type,
            pr.review_date,
            pr.total_score,
            pr.recommendation,
            pr.status as review_status,
            pr.submitted_at,
            pr.created_at,
            p.title as project_title,
            p.project_code,
            p.status as project_status,
            p.category,
            p.research_field,
            p.budget_total,
            p.duration_months,
            u.name as applicant_name,
            u.department as applicant_department
          FROM \`ProjectReview\` pr
          LEFT JOIN \`Project\` p ON pr.project_id = p.id
          LEFT JOIN \`User\` u ON p.applicant_id = u.id
          WHERE pr.reviewer_id = ?
        `;
        
        let countSql = 'SELECT COUNT(*) as total FROM `ProjectReview` WHERE reviewer_id = ?';
        const params = [user.id];
        const countParams = [user.id];
        
        // 状态过滤
        if (status) {
          sql += ' AND pr.status = ?';
          countSql += ' AND status = ?';
          params.push(status);
          countParams.push(status);
        }
        
        // 评审类型过滤
        if (review_type) {
          sql += ' AND pr.review_type = ?';
          countSql += ' AND review_type = ?';
          params.push(review_type);
          countParams.push(review_type);
        }
        
        // 搜索条件
        if (search) {
          sql += ' AND (p.title LIKE ? OR p.project_code LIKE ? OR u.name LIKE ?)';
          countSql += ' AND project_id IN (SELECT id FROM `Project` WHERE title LIKE ? OR project_code LIKE ?)';
          const searchParam = `%${search}%`;
          params.push(searchParam, searchParam, searchParam);
          countParams.push(searchParam, searchParam);
        }
        
        sql += ' ORDER BY pr.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);
        
        console.log('🔍 执行评审任务查询SQL:', sql);
        
        const [reviews] = await pool.query(sql, params);
        const [totalResult] = await pool.query(countSql, countParams);
        const total = totalResult[0]?.total || 0;
        
        // 获取统计数据
        const [stats] = await pool.query(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_count,
            SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted_count,
            SUM(CASE WHEN status = 'locked' THEN 1 ELSE 0 END) as locked_count,
            AVG(total_score) as average_score
          FROM \`ProjectReview\`
          WHERE reviewer_id = ?
        `, [user.id]);
        
        console.log(`✅ 获取评审任务成功，共 ${reviews.length} 条`);
        
        sendResponse(res, 200, {
          success: true,
          data: {
            reviews: reviews,
            stats: stats[0] || {
              total: 0,
              draft_count: 0,
              submitted_count: 0,
              locked_count: 0,
              average_score: 0
            },
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: total,
              pages: Math.ceil(total / limit)
            }
          }
        });
        
      } catch (error) {
        console.error('获取评审任务失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取评审任务失败',
          message: error.message
        });
      }
      return;
    }

    // 2. 获取单个评审详情（带项目信息）
    if (pathname.startsWith('/api/reviewer/viewreview/') && req.method === 'GET') {
      console.log('6');
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 检查是否是评审专家
      const isReviewer = user.role === 'reviewer' || user.role === 'admin';
      if (!isReviewer) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限访问评审详情'
        });
        return;
      }
      
      const reviewId = pathname.replace('/api/reviewer/review/', '');
      if (!reviewId) {
          sendResponse(res, 400, {
            success: false,
            error: '评审ID不能为空'
          });
          return;
        }
      console.log('🔍 获取评审详情，评审ID:', reviewId, '专家ID:', user.id);
      
      try {
        // 获取评审基本信息
        const sql = `
          SELECT 
            pr.*,
            p.title as project_title,
            p.project_code,
            p.abstract,
            p.category,
            p.research_field,
            p.keywords,
            p.budget_total,
            p.duration_months,
            p.status as project_status,
            p.start_date,
            p.end_date,
            u.name as applicant_name,
            u.department as applicant_department,
            u.title as applicant_title,
            u.research_field as applicant_research_field
          FROM \`ProjectReview\` pr
          LEFT JOIN \`Project\` p ON pr.project_id = p.id
          LEFT JOIN \`User\` u ON p.applicant_id = u.id
          WHERE pr.id = ? AND pr.reviewer_id = ?
        `;
        
        const [reviews] = await pool.query(sql, [reviewId, user.id]);
        
        if (reviews.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '评审记录不存在或没有权限'
          });
          return;
        }
        
        const review = reviews[0];
        
        // 获取项目预算
        const [budgets] = await pool.query(
          'SELECT category, item_name, description, amount, justification FROM `ProjectBudget` WHERE project_id = ? ORDER BY sequence',
          [review.project_id]
        );
        
        // 获取项目成员
        const [members] = await pool.query(`
          SELECT 
            u.name,
            u.title,
            u.research_field,
            pm.role as member_role,
            pm.responsibility,
            pm.workload_percentage
          FROM \`ProjectMember\` pm
          LEFT JOIN \`User\` u ON pm.user_id = u.id
          WHERE pm.project_id = ?
          ORDER BY 
            CASE pm.role
              WHEN 'principal' THEN 1
              WHEN 'co_researcher' THEN 2
              WHEN 'research_assistant' THEN 3
              WHEN 'student' THEN 4
              ELSE 5
            END
        `, [review.project_id]);
        
        // 处理分数字段，确保是数字类型
        const reviewData = {
          ...review,
          // 转换分数字段为数字
          innovation_score: parseFloat(review.innovation_score) || 0,
          feasibility_score: parseFloat(review.feasibility_score) || 0,
          significance_score: parseFloat(review.significance_score) || 0,
          team_score: parseFloat(review.team_score) || 0,
          budget_score: parseFloat(review.budget_score) || 0,
          total_score: parseFloat(review.total_score) || 0,
          // 布尔字段
          is_confidential: Boolean(review.is_confidential),
          // 项目相关信息
          project_info: {
            abstract: review.abstract,
            category: review.category,
            research_field: review.research_field,
            keywords: review.keywords,
            budget_total: review.budget_total,
            duration_months: review.duration_months,
            status: review.project_status,
            start_date: review.start_date,
            end_date: review.end_date,
            budgets: budgets,
            members: members
          },
          applicant_info: {
            name: review.applicant_name,
            department: review.applicant_department,
            title: review.applicant_title,
            research_field: review.applicant_research_field
          }
        };
        
        // 移除重复字段
        delete reviewData.abstract;
        delete reviewData.category;
        delete reviewData.research_field;
        delete reviewData.keywords;
        delete reviewData.applicant_name;
        delete reviewData.applicant_department;
        delete reviewData.applicant_title;
        delete reviewData.applicant_research_field;
        
        console.log('✅ 获取评审详情成功');
        
        sendResponse(res, 200, {
          success: true,
          data: reviewData
        });
        
      } catch (error) {
        console.error('获取评审详情失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取评审详情失败',
          message: error.message
        });
      }
      return;
    }

    // 3. 创建评审记录
    if (pathname.startsWith('/api/reviewer/viewreview/') && req.method === 'POST') {
      console.log('7');
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 检查是否是评审专家
      const isReviewer = user.role === 'reviewer' || user.role === 'admin';
      if (!isReviewer) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限创建评审'
        });
        return;
      }
      
      try {
        const body = await parseRequestBody(req);
        
        console.log('📝 创建评审请求:', {
          reviewerId: user.id,
          data: body
        });
        
        // ========== 验证必要字段 ==========
        if (!body.project_id) {
          sendResponse(res, 400, {
            success: false,
            error: '项目ID不能为空'
          });
          return;
        }
        
        // 处理日期格式
        if (body.review_date) {
          body.review_date = formatDateForMySQL(body.review_date);
        } else {
          body.review_date = new Date().toISOString().split('T')[0];
        }
        
        // 验证 recommendation 字段
        const validRecommendations = ['approve', 'approve_with_revision', 'reject', 'resubmit'];
        if (body.recommendation !== undefined && body.recommendation !== null) {
          // 如果是空字符串，转为 null
          if (typeof body.recommendation === 'string' && body.recommendation.trim() === '') {
            body.recommendation = null;
          } else if (!validRecommendations.includes(body.recommendation)) {
            sendResponse(res, 400, {
              success: false,
              error: '评审结论必须是以下值之一：approve, approve_with_revision, reject, resubmit',
              received_value: body.recommendation
            });
            return;
          }
        }
        
        // 如果是提交评审，recommendation 和 comments 必填
        if (body.status === 'submitted') {
          if (!body.recommendation) {
            sendResponse(res, 400, {
              success: false,
              error: '提交评审时必须选择评审结论'
            });
            return;
          }
          
          if (!body.comments || body.comments.trim() === '') {
            sendResponse(res, 400, {
              success: false,
              error: '提交评审时必须填写评审意见'
            });
            return;
          }
        }
        // ==================================
        
        // 检查项目是否存在
        const [projects] = await pool.query(
          'SELECT id, status, title FROM `Project` WHERE id = ?',
          [body.project_id]
        );
        
        if (projects.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '项目不存在'
          });
          return;
        }
        
        const project = projects[0];
        
        // 检查项目状态是否允许评审
        if (!['under_review', 'stage_review'].includes(project.status)) {
          sendResponse(res, 400, {
            success: false,
            error: '项目当前状态不允许评审',
            project_status: project.status
          });
          return;
        }
        
        // 检查是否已存在该项目的评审记录
        const [existingReviews] = await pool.query(
          'SELECT id FROM `ProjectReview` WHERE project_id = ? AND reviewer_id = ? AND review_type = ?',
          [body.project_id, user.id, body.review_type || 'initial']
        );
        
        if (existingReviews.length > 0) {
          sendResponse(res, 409, {
            success: false,
            error: '该项目的评审记录已存在'
          });
          return;
        }
        
        // 生成评审ID
        const reviewId = randomUUID();
        
        // 插入评审记录
        const sql = `
          INSERT INTO \`ProjectReview\` (
            id, project_id, reviewer_id, review_type, review_date,
            innovation_score, feasibility_score, significance_score,
            team_score, budget_score,
            strengths, weaknesses, recommendation, comments, suggestions,
            is_confidential, status, submitted_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        const params = [
          reviewId,
          body.project_id,
          user.id,
          body.review_type || 'initial',
          body.review_date,
          parseFloat(body.innovation_score) || 0,
          parseFloat(body.feasibility_score) || 0,
          parseFloat(body.significance_score) || 0,
          parseFloat(body.team_score) || 0,
          parseFloat(body.budget_score) || 0,
          body.strengths || '',
          body.weaknesses || '',
          body.recommendation || null,
          body.comments || '',
          body.suggestions || '',
          body.is_confidential ? 1 : 0,
          body.status || 'draft',
          body.status === 'submitted' ? new Date().toISOString() : null
        ];
        
        console.log('📝 执行创建评审SQL:', sql);
        console.log('📝 参数:', params);
        
        await pool.query(sql, params);
        
        // 如果是提交评审，更新项目状态
        if (body.status === 'submitted') {
          await updateProjectReviewStatus(body.project_id);
          
          // 创建通知
          await createReviewNotification(body.project_id, user.id, reviewId, 'submitted', project.title);
        } else if (body.status === 'draft') {
          // 创建草稿保存通知
          await createReviewNotification(body.project_id, user.id, reviewId, 'draft_saved', project.title);
        }
        
        sendResponse(res, 201, {
          success: true,
          message: body.status === 'submitted' ? '评审创建并提交成功' : '评审创建成功',
          review_id: reviewId
        });
        
      } catch (error) {
        console.error('创建评审失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '创建评审失败',
          message: error.message,
          sqlMessage: error.sqlMessage
        });
      }
      return;
    }

    // 4. 更新评审记录
    if (pathname.startsWith('/api/reviewer/viewreview/') && req.method === 'PUT') {
      console.log('8');
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 检查是否是评审专家
      const isReviewer = user.role === 'reviewer' || user.role === 'admin';
      if (!isReviewer) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限更新评审'
        });
        return;
      }
      
      const reviewId = pathname.replace('/api/reviewer/review', '');
      
      console.log('🔄 更新评审请求，评审ID:', reviewId, '专家ID:', user.id);
      
      try {
        const body = await parseRequestBody(req);
        
        console.log('📝 更新数据:', body);
        
        // ========== 处理日期格式 ==========
        if (body.review_date) {
          body.review_date = formatDateForMySQL(body.review_date);
        }
        // ==================================
        
        // ========== 验证 recommendation 字段 ==========
        // 确保 recommendation 是有效的四个值之一或 null
        const validRecommendations = ['approve', 'approve_with_revision', 'reject', 'resubmit', null];
        if (body.recommendation !== undefined && body.recommendation !== null) {
          // 如果是空字符串，转为 null
          if (typeof body.recommendation === 'string' && body.recommendation.trim() === '') {
            body.recommendation = null;
          } else if (!validRecommendations.includes(body.recommendation)) {
            sendResponse(res, 400, {
              success: false,
              error: '评审结论必须是以下值之一：approve, approve_with_revision, reject, resubmit',
              received_value: body.recommendation
            });
            return;
          }
        }
        // ==============================================
        
        // 检查评审是否存在且属于该专家
        const [existingReviews] = await pool.query(
          'SELECT id, project_id, status, submitted_at FROM `ProjectReview` WHERE id = ? AND reviewer_id = ?',
          [reviewId, user.id]
        );
        
        if (existingReviews.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '评审记录不存在或没有权限'
          });
          return;
        }
        
        const existingReview = existingReviews[0];
        
        // 检查状态：已提交的评审不能修改（管理员除外）
        if (existingReview.status === 'submitted' && !checkPermission(user.role, 'admin')) {
          sendResponse(res, 409, {
            success: false,
            error: '已提交的评审不能修改',
            current_status: existingReview.status
          });
          return;
        }
        
        // 如果是提交评审，验证必填字段
        if (body.status === 'submitted') {
          if (!body.comments || body.comments.trim() === '') {
            sendResponse(res, 400, {
              success: false,
              error: '评审意见不能为空'
            });
            return;
          }
          
          if (!body.recommendation) {
            sendResponse(res, 400, {
              success: false,
              error: '请选择评审结论'
            });
            return;
          }
          
          // 检查是否至少有一个评分
          const hasScore = body.innovation_score || body.feasibility_score || 
                          body.significance_score || body.team_score || body.budget_score;
          if (!hasScore) {
            sendResponse(res, 400, {
              success: false,
              error: '请至少完成一项评分'
            });
            return;
          }
        }
        
        // 构建更新字段
        const updateFields = [];
        const updateValues = [];
        
        // 允许更新的字段 - 不要包含 total_score 和 updated_at
        const allowedFields = [
          'innovation_score', 'feasibility_score', 'significance_score',
          'team_score', 'budget_score',
          'strengths', 'weaknesses', 'recommendation',
          'comments', 'suggestions', 'is_confidential',
          'status', 'review_date', 'review_type'
        ];
        
        allowedFields.forEach(field => {
          if (body[field] !== undefined) {
            updateFields.push(`${field} = ?`);
            if (field.includes('_score')) {
              updateValues.push(parseFloat(body[field]) || 0);
            } else if (field === 'is_confidential') {
              updateValues.push(body[field] ? 1 : 0);
            } else {
              updateValues.push(body[field]);
            }
          }
        });
        
        // 如果是提交评审，设置提交时间
        if (body.status === 'submitted') {
          updateFields.push('submitted_at = ?');
          updateValues.push(new Date().toISOString());
        }
        
        if (updateFields.length === 0) {
          sendResponse(res, 400, {
            success: false,
            error: '没有提供更新数据'
          });
          return;
        }
        
        updateValues.push(reviewId);
        
        const updateSql = `UPDATE \`ProjectReview\` SET ${updateFields.join(', ')} WHERE id = ?`;
        
        console.log('📝 执行更新SQL:', updateSql);
        console.log('📝 参数:', updateValues);
        
        const [result] = await pool.query(updateSql, updateValues);
        
        console.log('✅ 更新评审成功，影响行数:', result.affectedRows);
        
        if (result.affectedRows === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '评审记录不存在'
          });
          return;
        }
        
        // 如果是提交评审，更新项目状态
        if (body.status === 'submitted') {
          await updateProjectReviewStatus(existingReview.project_id);
          
          // 创建通知
          const [project] = await pool.query('SELECT title FROM `Project` WHERE id = ?', [existingReview.project_id]);
          await createReviewNotification(existingReview.project_id, user.id, reviewId, 'submitted', project[0]?.title || '项目');
        }
        
        sendResponse(res, 200, {
          success: true,
          message: body.status === 'submitted' ? '评审已提交' : '评审已保存',
          review_id: reviewId,
          affected_rows: result.affectedRows
        });
        
      } catch (error) {
        console.error('更新评审失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '更新评审失败',
          message: error.message,
          sqlMessage: error.sqlMessage
        });
      }
      return;
    }

    // 5. 提交评审
    if (pathname.startsWith('/api/reviewer/viewreview/') && pathname.endsWith('/submit') && req.method === 'POST') {
      console.log('8');
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 只有评审专家可以审核
      const isReviewer = user.role === 'reviewer' || user.role === 'admin';
      if (!isReviewer) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限提交评审'
        });
        return;
      }
      
      const reviewId = pathname.replace('/api/reviewer/review', '').replace('/submit', '');
      
      console.log('📤 提交评审请求，评审ID:', reviewId, '专家ID:', user.id);
      
      try {
        const body = await parseRequestBody(req);
        
        console.log('📝 提交数据:', body);
        
        // ========== 验证必填字段 ==========
        // 提交时 recommendation 不能为空
        if (!body.recommendation) {
          sendResponse(res, 400, {
            success: false,
            error: '请选择评审结论（approve、approve_with_revision、reject、resubmit）'
          });
          return;
        }
        
        // 验证 recommendation 的有效性
        const validRecommendations = ['approve', 'approve_with_revision', 'reject', 'resubmit'];
        if (!validRecommendations.includes(body.recommendation)) {
          sendResponse(res, 400, {
            success: false,
            error: '评审结论必须是以下值之一：approve, approve_with_revision, reject, resubmit',
            received_value: body.recommendation
          });
          return;
        }
        
        // comments 不能为空
        if (!body.comments || body.comments.trim() === '') {
          sendResponse(res, 400, {
            success: false,
            error: '评审意见不能为空'
          });
          return;
        }
        
        // 检查是否至少有一个评分
        const hasScore = body.innovation_score || body.feasibility_score || 
                        body.significance_score || body.team_score || body.budget_score;
        if (!hasScore) {
          sendResponse(res, 400, {
            success: false,
            error: '请至少完成一项评分'
          });
          return;
        }
        // ==================================
        
        // ========== 处理日期格式 ==========
        if (body.review_date) {
          body.review_date = formatDateForMySQL(body.review_date);
        } else {
          body.review_date = new Date().toISOString().split('T')[0];
        }
        // ==================================
        
        // 检查评审是否存在
        const [existingReviews] = await pool.query(
          'SELECT id, project_id, status, submitted_at FROM `ProjectReview` WHERE id = ? AND reviewer_id = ?',
          [reviewId, user.id]
        );
        
        if (existingReviews.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '评审记录不存在或没有权限'
          });
          return;
        }
        
        const existingReview = existingReviews[0];
        
        // 检查是否已提交
        if (existingReview.status === 'submitted') {
          sendResponse(res, 409, {
            success: false,
            error: '评审已提交，不能重复提交'
          });
          return;
        }
        
        console.log('🔍 检查评审是否存在:')
        console.log('  评审ID:', reviewId)
        console.log('  专家ID:', user.id)
        console.log('  当前状态:', existingReview.status)
        
        // 更新评审状态为已提交 - 不要包含 total_score 和 updated_at
        const updateSql = `
          UPDATE \`ProjectReview\` 
          SET 
            status = 'submitted',
            submitted_at = NOW(),
            comments = ?,
            recommendation = ?,
            innovation_score = ?,
            feasibility_score = ?,
            significance_score = ?,
            team_score = ?,
            budget_score = ?,
            strengths = ?,
            weaknesses = ?,
            suggestions = ?,
            is_confidential = ?,
            review_date = ?,
            review_type = ?
          WHERE id = ? AND reviewer_id = ?
        `;
        
        const params = [
          body.comments,
          body.recommendation,
          parseFloat(body.innovation_score) || 0,
          parseFloat(body.feasibility_score) || 0,
          parseFloat(body.significance_score) || 0,
          parseFloat(body.team_score) || 0,
          parseFloat(body.budget_score) || 0,
          body.strengths || '',
          body.weaknesses || '',
          body.suggestions || '',
          body.is_confidential ? 1 : 0,
          body.review_date,
          body.review_type || 'initial',
          reviewId,
          user.id
        ];
        
        console.log('📝 执行提交评审SQL:', updateSql);
        console.log('📝 参数:', params);
        
        const [result] = await pool.query(updateSql, params);
        
        console.log('✅ 提交评审成功，影响行数:', result.affectedRows);
        
        if (result.affectedRows === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '评审记录不存在或没有权限'
          });
          return;
        }
        
        // 更新项目评审状态
        await updateProjectReviewStatus(existingReview.project_id);
        
        // 创建通知
        const [project] = await pool.query('SELECT title FROM `Project` WHERE id = ?', [existingReview.project_id]);
        await createReviewNotification(existingReview.project_id, user.id, reviewId, 'submitted', project[0]?.title || '项目');
        
        sendResponse(res, 200, {
          success: true,
          message: '评审提交成功',
          review_id: reviewId,
          affected_rows: result.affectedRows
        });
        
      } catch (error) {
        console.error('提交评审失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '提交评审失败',
          message: error.message,
          sqlMessage: error.sqlMessage
        });
      }
      return;
    }

    // 7. 获取最近评审记录（用于工作台）
    if (pathname === '/api/reviewer/recent-reviews' && req.method === 'GET') {
      console.log('10');
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 检查是否是评审专家
      const isReviewer = user.role === 'reviewer' || user.role === 'admin';
      if (!isReviewer) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限访问评审记录'
        });
        return;
      }
      
      const { limit = 5 } = query;
      
      console.log('📋 获取最近评审记录，专家ID:', user.id, '数量:', limit);
      
      try {
        const sql = `
          SELECT 
            pr.id,
            pr.project_id,
            pr.review_date,
            pr.total_score,
            pr.recommendation,
            pr.comments,
            pr.status,
            p.title as project_title,
            p.project_code
          FROM \`ProjectReview\` pr
          LEFT JOIN \`Project\` p ON pr.project_id = p.id
          WHERE pr.reviewer_id = ? AND pr.status = 'submitted'
          ORDER BY pr.review_date DESC
          LIMIT ?
        `;
        
        const [recentReviews] = await pool.query(sql, [user.id, parseInt(limit)]);
        
        console.log(`✅ 获取最近评审记录成功，共 ${recentReviews.length} 条`);
        
        sendResponse(res, 200, {
          success: true,
          data: recentReviews
        });
        
      } catch (error) {
        console.error('获取最近评审记录失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取最近评审记录失败',
          message: error.message
        });
      }
      return;
    }
    // 辅助函数：验证管理员权限
    async function verifyAdmin(token) {
      if (!token || !token.startsWith('Bearer ')) {
        console.log('❌ Token格式错误或缺失');
        return null;
      }
      
      try {
        const tokenData = Buffer.from(token.replace('Bearer ', ''), 'base64').toString();
        const [userId, username, timestamp] = tokenData.split(':');
        
        const [users] = await pool.query(
          'SELECT id, username, email, role, name, department, status FROM `User` WHERE id = ? AND username = ?',
          [userId, username]
        );
        
        if (users.length === 0) {
          return null;
        }
        
        const user = users[0];
        
        // 检查是否是管理员
        if (user.role !== 'admin' && user.role !== 'assistant') {
          console.log('❌ 用户不是管理员，角色:', user.role);
          return null;
        }
        
        return user;
      } catch (error) {
        console.error('❌ 管理员验证失败:', error);
        return null;
      }
    }
    // ================================管理员仪表板 API================================
    // 获取管理员仪表板数据
    if (pathname === '/api/admin/dashboard' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      const adminUser = await verifyAdmin(token);
      
      if (!user || !adminUser) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败或无管理员权限'
        });
        return;
      }
      
      console.log('📊 获取管理员仪表板数据，用户ID:', user.id, '角色:', user.role);
      
      try {
        // 获取系统汇总数据
        const [totalUsers] = await pool.query(
          'SELECT COUNT(*) as count FROM `User` WHERE status = "active"'
        );
        
        const [totalProjects] = await pool.query(
          'SELECT COUNT(*) as count FROM `Project`'
        );
        
        const [pendingReviews] = await pool.query(
          'SELECT COUNT(*) as count FROM `Project` WHERE status = "under_review"'
        );
        
        const [totalBudget] = await pool.query(
          'SELECT COALESCE(SUM(budget_total), 0) as total FROM `Project` WHERE status IN ("approved", "in_progress", "completed")'
        );
        
        const summary = {
          totalUsers: totalUsers[0]?.count || 0,
          totalProjects: totalProjects[0]?.count || 0,
          pendingReviews: pendingReviews[0]?.count || 0,
          totalBudget: totalBudget[0]?.total || 0
        };
        
        console.log('📊 系统汇总数据:', summary);
        
        // 1. 用户统计
        const [userStats] = await pool.query(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN role = 'applicant' THEN 1 ELSE 0 END) as applicants,
            SUM(CASE WHEN role = 'reviewer' THEN 1 ELSE 0 END) as reviewers,
            SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as assistants,
            SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
            12.5 as userGrowth  -- 示例增长数据，实际应从数据库计算
          FROM \`User\`
          WHERE status = 'active'
        `);
        
        console.log('👥 用户统计:', userStats[0]);
        
        // 2. 项目状态统计
        const [projectStats] = await pool.query(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
            SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
            SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as under_review,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN status = 'stage_review' THEN 1 ELSE 0 END) as stage_review,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'terminated' THEN 1 ELSE 0 END) as terminated_count
          FROM \`Project\`
        `);
        
        console.log('📋 项目统计:', projectStats[0]);
        
        // 3. 经费统计
        const [financeStats] = await pool.query(`
          SELECT 
            COALESCE(SUM(p.budget_total), 0) as totalBudget,
            COALESCE(SUM(pb.amount), 0) as allocated,
            COALESCE(SUM(er.amount), 0) as expended,
            15.7 as fundGrowth  -- 示例增长数据
          FROM \`Project\` p
          LEFT JOIN \`ProjectBudget\` pb ON p.id = pb.project_id
          LEFT JOIN \`ExpenditureRecord\` er ON p.id = er.project_id AND er.status = 'approved'
          WHERE p.status IN ('approved', 'in_progress', 'completed')
        `);
        
        // 计算剩余预算
        if (financeStats[0]) {
          financeStats[0].remaining = financeStats[0].totalBudget - financeStats[0].expended;
        }
        
        console.log('💰 经费统计:', financeStats[0]);
        
        // 4. 成果统计
        const [achievementStats] = await pool.query(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN type = 'paper' THEN 1 ELSE 0 END) as papers,
            SUM(CASE WHEN type = 'patent' THEN 1 ELSE 0 END) as patents,
            SUM(CASE WHEN type = 'software' THEN 1 ELSE 0 END) as software,
            SUM(CASE WHEN type = 'report' THEN 1 ELSE 0 END) as reports,
            SUM(CASE WHEN type = 'prototype' THEN 1 ELSE 0 END) as prototypes,
            10.2 as achievementGrowth  -- 示例增长数据
          FROM \`ProjectAchievement\`
          WHERE status IN ('verified', 'published')
        `);
        
        // 单独查询成果转化数量
        const [transfersResult] = await pool.query(
          'SELECT COUNT(*) as count FROM `AchievementTransfer` WHERE transfer_status = "completed"'
        );
        
        // 合并成果统计数据
        const achievementData = achievementStats[0] || {
          total: 0,
          papers: 0,
          patents: 0,
          software: 0,
          reports: 0,
          prototypes: 0,
          achievementGrowth: 0
        };
        
        achievementData.transfers = transfersResult[0]?.count || 0;
        
        console.log('🏆 成果统计:', achievementData);
        
        // 5. 最近项目
        const [recentProjects] = await pool.query(`
          SELECT 
            p.id,
            p.project_code,
            p.title,
            p.category,
            p.status,
            p.created_at,
            u.name as applicant_name
          FROM \`Project\` p
          LEFT JOIN \`User\` u ON p.applicant_id = u.id
          ORDER BY p.created_at DESC
          LIMIT 10
        `);
        
        console.log('📋 最近项目:', recentProjects.length);
        
        // 6. 最近用户
        const [recentUsers] = await pool.query(`
          SELECT 
            id,
            name,
            username,
            email,
            role,
            department,
            title,
            status,
            created_at
          FROM \`User\`
          WHERE status = 'active'
          ORDER BY created_at DESC
          LIMIT 10
        `);
        
        console.log('👤 最近用户:', recentUsers.length);
        
        // 7. 系统日志 - 使用 AuditLog 表
        const [recentLogs] = await pool.query(`
          SELECT 
            id,
            user_id,
            (SELECT name FROM \`User\` WHERE id = al.user_id) as user_name,
            action,
            table_name,
            record_id,
            old_values,
            new_values,
            ip_address,
            created_at
          FROM \`AuditLog\` al
          ORDER BY created_at DESC
          LIMIT 20
        `);
        
        console.log('📜 系统日志:', recentLogs.length);
        
        // 8. 待处理任务统计
        const [pendingProjects] = await pool.query(
          'SELECT COUNT(*) as count FROM `Project` WHERE status = "under_review"'
        );
        
        // 使用 FundingApplication 表
        const [pendingFunding] = await pool.query(
          'SELECT COUNT(*) as count FROM `FundingApplication` WHERE status = "submitted"'
        );
        
        // 使用 ExpenditureRecord 表
        const [pendingExpenditures] = await pool.query(
          'SELECT COUNT(*) as count FROM `ExpenditureRecord` WHERE status = "submitted"'
        );
        
        // 使用 ProjectAchievement 表
        const [pendingAchievements] = await pool.query(
          'SELECT COUNT(*) as count FROM `ProjectAchievement` WHERE status = "submitted"'
        );
        
        const pendingTasks = {
          projects: pendingProjects[0]?.count || 0,
          funding: pendingFunding[0]?.count || 0,
          expenditures: pendingExpenditures[0]?.count || 0,
          achievements: pendingAchievements[0]?.count || 0
        };
        
        console.log('⏳ 待处理任务:', pendingTasks);
        
        // 9. 获取未读通知数量
        const [unreadCountResult] = await pool.query(
          'SELECT COUNT(*) as count FROM `Notification` WHERE user_id = ? AND is_read = FALSE',
          [user.id]
        );
        
        const unreadCount = unreadCountResult[0]?.count || 0;
        
        console.log('🔔 未读通知:', unreadCount);
        
        // 构建响应数据
        const responseData = {
          success: true,
          data: {
            summary: summary,
            user_stats: userStats[0] || {
              total: 0,
              applicants: 0,
              reviewers: 0,
              assistants: 0,
              admins: 0,
              userGrowth: 0
            },
            project_stats: projectStats[0] || {
              total: 0,
              draft: 0,
              submitted: 0,
              under_review: 0,
              approved: 0,
              in_progress: 0,
              stage_review: 0,
              completed: 0,
              terminated: 0,
              projectGrowth: 0
            },
            finance_stats: financeStats[0] || {
              totalBudget: 0,
              allocated: 0,
              expended: 0,
              remaining: 0,
              fundGrowth: 0
            },
            achievement_stats: achievementData,
            recent_projects: recentProjects,
            recent_users: recentUsers,
            recent_logs: recentLogs,
            pending_tasks: pendingTasks,
            unread_count: unreadCount
          }
        };
        
        console.log('✅ 管理员仪表板数据获取成功');
        
        sendResponse(res, 200, responseData);
        
      } catch (error) {
        console.error('获取管理员仪表板数据失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取管理员仪表板数据失败',
          message: error.message,
          sqlMessage: error.sqlMessage,
          sql: error.sql
        });
      }
      return;
    }
    // ==================== 用户管理API ====================

    // 1. 获取用户列表（管理员专用）
    if ((pathname === '/api/admin/users' ) && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 检查是否是管理员
      if (!checkPermission(user.role, ['admin', 'assistant'])) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限查看用户列表'
        });
        return;
      }
      
      const { 
        page = 1, 
        limit = 20, 
        search, 
        role, 
        status,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = query;
      
      const offset = (page - 1) * limit;
      
      try {
        console.log('📋 获取用户列表，管理员:', user.id);
        
        // 构建查询条件
        let sql = 'SELECT * FROM `User` WHERE 1=1';
        let countSql = 'SELECT COUNT(*) as total FROM `User` WHERE 1=1';
        const params = [];
        const countParams = [];
        
        // 搜索条件
        if (search) {
          sql += ' AND (username LIKE ? OR name LIKE ? OR email LIKE ? OR department LIKE ?)';
          countSql += ' AND (username LIKE ? OR name LIKE ? OR email LIKE ? OR department LIKE ?)';
          const searchParam = `%${search}%`;
          params.push(searchParam, searchParam, searchParam, searchParam);
          countParams.push(searchParam, searchParam, searchParam, searchParam);
        }
        
        // 角色筛选
        if (role) {
          sql += ' AND role = ?';
          countSql += ' AND role = ?';
          params.push(role);
          countParams.push(role);
        }
        
        // 状态筛选
        if (status) {
          sql += ' AND status = ?';
          countSql += ' AND status = ?';
          params.push(status);
          countParams.push(status);
        }
        
        // 排序（防止SQL注入）
        const allowedSortFields = ['username', 'name', 'email', 'role', 'status', 'created_at', 'last_login'];
        const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
        const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        sql += ` ORDER BY ${sortField} ${sortDirection}`;
        
        // 分页
        sql += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);
        
        console.log('🔍 执行用户查询SQL:', sql);
        console.log('🔍 参数:', params);
        
        // 执行查询
        const [rows] = await pool.query(sql, params);
        const [totalResult] = await pool.query(countSql, countParams);
        const total = totalResult[0]?.total || 0;
        
        // 隐藏密码字段
        const users = rows.map(user => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        });
        
        console.log(`✅ 获取用户列表成功，共 ${users.length} 条`);
        
        sendResponse(res, 200, {
          success: true,
          data: users,
          total: total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        });
        
      } catch (error) {
        console.error('获取用户列表失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取用户列表失败',
          message: error.message,
          sqlMessage: error.sqlMessage
        });
      }
      return;
    }

    // 2. 获取用户统计（管理员专用）
    if (pathname === '/api/admin/users/stats' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 检查是否是管理员
      if (!checkPermission(user.role, ['admin', 'assistant'])) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限查看用户统计'
        });
        return;
      }
      
      try {
        console.log('📊 获取用户统计，管理员:', user.id);
        
        const [stats] = await pool.query(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN role = 'applicant' THEN 1 ELSE 0 END) as applicants,
            SUM(CASE WHEN role = 'reviewer' THEN 1 ELSE 0 END) as reviewers,
            SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as assistants,
            SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_users,
            SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_users,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_users,
            DATE_FORMAT(MIN(created_at), '%Y-%m-%d') as first_user_date,
            DATE_FORMAT(MAX(created_at), '%Y-%m-%d') as last_user_date
          FROM \`User\`
        `);
        
        // 获取月度增长数据
        const [monthlyGrowth] = await pool.query(`
          SELECT 
            DATE_FORMAT(created_at, '%Y-%m') as month,
            COUNT(*) as count
          FROM \`User\`
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
          GROUP BY DATE_FORMAT(created_at, '%Y-%m')
          ORDER BY month
        `);
        
        console.log('✅ 获取用户统计成功');
        
        sendResponse(res, 200, {
          success: true,
          data: {
            overview: stats[0] || {},
            monthly_growth: monthlyGrowth
          }
        });
        
      } catch (error) {
        console.error('获取用户统计失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取用户统计失败',
          message: error.message
        });
      }
      return;
    }

    // 3. 创建用户（管理员专用）
    if (pathname === '/api/users' && req.method === 'POST') {
      const body = await parseRequestBody(req);
      
      // 转换角色
      const normalizedRole = normalizeRole(body.role);
      console.log('角色转换:', { original: body.role, normalized: normalizedRole });
      
      // 使用转换后的角色
      body.role = normalizedRole;

      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 检查是否是管理员
      if (!checkPermission(user.role, ['admin', 'assistant'])) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限创建用户'
        });
        return;
      }
      
      try {
        const body = await parseRequestBody(req);
        
        console.log('📝 创建用户请求，管理员:', user.id, '数据:', body);
        
        // 验证必填字段
        if (!body.username || !body.password || !body.email || !body.name || !body.role) {
          sendResponse(res, 400, {
            success: false,
            error: '用户名、密码、邮箱、姓名和角色是必填字段'
          });
          return;
        }
        
        // 验证密码长度
        if (body.password.length < 6) {
          sendResponse(res, 400, {
            success: false,
            error: '密码长度不能少于6位'
          });
          return;
        }
        
        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(body.email)) {
          sendResponse(res, 400, {
            success: false,
            error: '邮箱格式不正确'
          });
          return;
        }
        
        // 验证角色
        const validRoles = ['applicant', 'reviewer', 'assistant', 'admin'];
        if (!validRoles.includes(body.role)) {
          sendResponse(res, 400, {
            success: false,
            error: '角色不正确',
            valid_roles: validRoles
          });
          return;
        }
        
        // 检查用户名是否已存在
        const [existingUsername] = await pool.query(
          'SELECT id FROM `User` WHERE username = ?',
          [body.username]
        );
        
        if (existingUsername.length > 0) {
          sendResponse(res, 409, {
            success: false,
            error: '用户名已存在'
          });
          return;
        }
        
        // 检查邮箱是否已存在
        const [existingEmail] = await pool.query(
          'SELECT id FROM `User` WHERE email = ?',
          [body.email]
        );
        
        if (existingEmail.length > 0) {
          sendResponse(res, 409, {
            success: false,
            error: '邮箱已存在'
          });
          return;
        }
        
        // 生成用户ID
        const userId = randomUUID();
        
        // 插入用户数据
        const sql = `
          INSERT INTO \`User\` (
            id, username, password, name, email, role,
            department, title, research_field, phone,
            status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        const params = [
          userId,
          body.username,
          body.password, // 注意：实际项目中应该对密码进行哈希处理
          body.name,
          body.email,
          body.role,
          body.department || '',
          body.title || '',
          body.research_field || '',
          body.phone || '',
          body.status || 'active'
        ];
        
        console.log('📝 执行创建用户SQL:', sql);
        console.log('📝 参数:', params);
        
        await pool.query(sql, params);
        
        // 获取新创建的用户（不包含密码）
        const [newUsers] = await pool.query(
          'SELECT id, username, name, email, role, department, title, status, created_at FROM `User` WHERE id = ?',
          [userId]
        );
        
        console.log('✅ 创建用户成功，ID:', userId);
        
        sendResponse(res, 201, {
          success: true,
          message: '用户创建成功',
          data: newUsers[0]
        });
        
      } catch (error) {
        console.error('创建用户失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '创建用户失败',
          message: error.message,
          sqlMessage: error.sqlMessage
        });
      }
      return;
    }
    
    // 4. 获取单个用户详情（管理员专用）
    if (pathname.startsWith('/api/admin/users/') && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 检查是否是管理员
      if (!checkPermission(user.role, ['admin', 'assistant'])) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限查看用户详情'
        });
        return;
      }
      
      const userId = pathname.replace('/api/admin/users/', '');
      
      console.log('🔍 获取用户详情，管理员:', user.id, '目标用户:', userId);
      
      try {
        const [users] = await pool.query(
          'SELECT id, username, name, email, role, department, title, research_field, phone, status, last_login, created_at, updated_at FROM `User` WHERE id = ?',
          [userId]
        );
        
        if (users.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '用户不存在'
          });
          return;
        }
        
        const userData = users[0];
        
        // 根据用户角色获取额外信息
        let additionalInfo = {};
        
        if (userData.role === 'applicant') {
          // 获取用户的项目信息
          const [projects] = await pool.query(
            'SELECT COUNT(*) as project_count FROM `Project` WHERE applicant_id = ?',
            [userId]
          );
          additionalInfo.project_count = projects[0]?.project_count || 0;
          
        } else if (userData.role === 'reviewer') {
          // 获取用户的评审记录
          const [reviews] = await pool.query(
            'SELECT COUNT(*) as review_count FROM `ProjectReview` WHERE reviewer_id = ?',
            [userId]
          );
          additionalInfo.review_count = reviews[0]?.review_count || 0;
        }
        
        console.log('✅ 获取用户详情成功');
        
        sendResponse(res, 200, {
          success: true,
          data: {
            ...userData,
            ...additionalInfo
          }
        });
        
      } catch (error) {
        console.error('获取用户详情失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取用户详情失败',
          message: error.message
        });
      }
      return;
    }

    // 5. 更新用户信息（管理员专用）
    if (pathname.startsWith('/api/admin/users/') && req.method === 'PUT') {
      const token = req.headers.authorization;
      const adminUser = await verifyToken(token);
      
      if (!adminUser) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 检查是否是管理员
      if (!checkPermission(adminUser.role, ['admin', 'assistant'])) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限更新用户信息'
        });
        return;
      }
      
      const userId = pathname.replace('/api/admin/users/', '');
      const body = await parseRequestBody(req);
      
      console.log('🔄 更新用户信息，管理员:', adminUser.id, '目标用户:', userId, '数据:', body);
      
      try {
        // 检查用户是否存在
        const [existingUsers] = await pool.query(
          'SELECT id FROM `User` WHERE id = ?',
          [userId]
        );
        
        if (existingUsers.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '用户不存在'
          });
          return;
        }
        
        // 不允许更新自己的角色和状态（防止管理员误操作）
        if (userId === adminUser.id) {
          if (body.role && body.role !== adminUser.role) {
            sendResponse(res, 403, {
              success: false,
              error: '不能修改自己的角色'
            });
            return;
          }
          
          if (body.status && body.status !== 'active') {
            sendResponse(res, 403, {
              success: false,
              error: '不能禁用自己'
            });
            return;
          }
        }
        
        // 构建更新字段
        const updateFields = [];
        const updateValues = [];
        
        // 允许更新的字段
        const allowedFields = [
          'name', 'email', 'role', 'department', 'title', 
          'research_field', 'phone', 'status'
        ];
        
        // 如果是管理员，允许更新所有字段（除了密码）
        if (checkPermission(adminUser.role, 'admin')) {
          allowedFields.push('password');
        }
        
        allowedFields.forEach(field => {
          if (body[field] !== undefined && body[field] !== null) {
            updateFields.push(`${field} = ?`);
            updateValues.push(body[field]);
          }
        });
        
        // 如果没有更新数据
        if (updateFields.length === 0) {
          sendResponse(res, 400, {
            success: false,
            error: '没有提供更新数据'
          });
          return;
        }
        
        updateValues.push(userId);
        
        const updateSql = `UPDATE \`User\` SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`;
        
        console.log('📝 执行更新用户SQL:', updateSql);
        console.log('📝 参数:', updateValues);
        
        await pool.query(updateSql, updateValues);
        
        // 获取更新后的用户信息
        const [updatedUsers] = await pool.query(
          'SELECT id, username, name, email, role, department, title, research_field, phone, status, updated_at FROM `User` WHERE id = ?',
          [userId]
        );
        
        console.log('✅ 更新用户信息成功');
        
        sendResponse(res, 200, {
          success: true,
          message: '用户信息更新成功',
          data: updatedUsers[0]
        });
        
      } catch (error) {
        console.error('更新用户信息失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '更新用户信息失败',
          message: error.message,
          sqlMessage: error.sqlMessage
        });
      }
      return;
    }

    // 6. 删除用户（管理员专用）
    if (pathname.startsWith('/api/admin/users/') && req.method === 'DELETE') {
      const token = req.headers.authorization;
      const adminUser = await verifyToken(token);
      
      if (!adminUser) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 检查是否是管理员
      if (!checkPermission(adminUser.role, ['admin'])) { // 只有超级管理员可以删除用户
        sendResponse(res, 403, {
          success: false,
          error: '没有权限删除用户'
        });
        return;
      }
      
      const userId = pathname.replace('/api/admin/users/', '');
      
      console.log('🗑️ 删除用户请求，管理员:', adminUser.id, '目标用户:', userId);
      
      try {
        // 检查用户是否存在
        const [existingUsers] = await pool.query(
          'SELECT id, username, role FROM `User` WHERE id = ?',
          [userId]
        );
        
        if (existingUsers.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '用户不存在'
          });
          return;
        }
        
        const targetUser = existingUsers[0];
        
        // 不能删除自己
        if (userId === adminUser.id) {
          sendResponse(res, 403, {
            success: false,
            error: '不能删除自己'
          });
          return;
        }
        
        // 不能删除其他管理员（只有超级管理员可以删除）
        if (targetUser.role === 'admin' && adminUser.role !== 'admin') {
          sendResponse(res, 403, {
            success: false,
            error: '不能删除其他管理员'
          });
          return;
        }
        
        // 检查用户是否有关联数据
        let hasRelatedData = false;
        let relatedTables = [];
        
        // 检查是否有项目
        const [projects] = await pool.query(
          'SELECT COUNT(*) as count FROM `Project` WHERE applicant_id = ?',
          [userId]
        );
        
        if (projects[0]?.count > 0) {
          hasRelatedData = true;
          relatedTables.push('项目');
        }
        
        // 检查是否有评审记录
        const [reviews] = await pool.query(
          'SELECT COUNT(*) as count FROM `ProjectReview` WHERE reviewer_id = ?',
          [userId]
        );
        
        if (reviews[0]?.count > 0) {
          hasRelatedData = true;
          relatedTables.push('评审记录');
        }
        
        if (hasRelatedData) {
          sendResponse(res, 409, {
            success: false,
            error: '用户存在关联数据，无法删除',
            related_tables: relatedTables
          });
          return;
        }
        
        // 删除用户（从User表删除）
        const [result] = await pool.query('DELETE FROM `User` WHERE id = ?', [userId]);
        
        console.log('✅ 删除用户成功，影响行数:', result.affectedRows);
        
        sendResponse(res, 200, {
          success: true,
          message: '用户删除成功',
          affected_rows: result.affectedRows
        });
        
      } catch (error) {
        console.error('删除用户失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '删除用户失败',
          message: error.message,
          sqlMessage: error.sqlMessage
        });
      }
      return;
    }

    // 7. 更新用户状态（启用/禁用）
    if (pathname.startsWith('/api/admin/users/') && pathname.includes('/status') && req.method === 'PUT') {
      const token = req.headers.authorization;
      const adminUser = await verifyToken(token);
      
      if (!adminUser) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 检查是否是管理员
      if (!checkPermission(adminUser.role, ['admin', 'assistant'])) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限更新用户状态'
        });
        return;
      }
      
      const userId = pathname.replace('/api/admin/users/', '').replace('/status', '');
      const body = await parseRequestBody(req);
      
      console.log('🔄 更新用户状态，管理员:', adminUser.id, '目标用户:', userId, '状态:', body.status);
      
      if (!body.status || !['active', 'inactive', 'pending'].includes(body.status)) {
        sendResponse(res, 400, {
          success: false,
          error: '状态不正确，必须是 active、inactive 或 pending'
        });
        return;
      }
      
      try {
        // 检查用户是否存在
        const [existingUsers] = await pool.query(
          'SELECT id, role FROM `User` WHERE id = ?',
          [userId]
        );
        
        if (existingUsers.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '用户不存在'
          });
          return;
        }
        
        // 不能修改自己的状态
        if (userId === adminUser.id) {
          sendResponse(res, 403, {
            success: false,
            error: '不能修改自己的状态'
          });
          return;
        }
        
        // 不能禁用其他管理员（除非是超级管理员）
        const targetUser = existingUsers[0];
        if (targetUser.role === 'admin' && adminUser.role !== 'admin' && body.status !== 'active') {
          sendResponse(res, 403, {
            success: false,
            error: '不能禁用其他管理员'
          });
          return;
        }
        
        // 更新用户状态
        await pool.query(
          'UPDATE `User` SET status = ?, updated_at = NOW() WHERE id = ?',
          [body.status, userId]
        );
        
        console.log('✅ 更新用户状态成功');
        
        sendResponse(res, 200, {
          success: true,
          message: '用户状态更新成功'
        });
        
      } catch (error) {
        console.error('更新用户状态失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '更新用户状态失败',
          message: error.message
        });
      }
      return;
    }

    // 8. 重置用户密码（管理员专用）
    if (pathname.startsWith('/api/admin/users/') && pathname.includes('/reset-password') && req.method === 'POST') {
      const token = req.headers.authorization;
      const adminUser = await verifyToken(token);
      
      if (!adminUser) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 检查是否是管理员
      if (!checkPermission(adminUser.role, ['admin'])) { // 只有超级管理员可以重置密码
        sendResponse(res, 403, {
          success: false,
          error: '没有权限重置用户密码'
        });
        return;
      }
      
      const userId = pathname.replace('/api/admin/users/', '').replace('/reset-password', '');
      
      console.log('🔐 重置用户密码，管理员:', adminUser.id, '目标用户:', userId);
      
      try {
        // 检查用户是否存在
        const [existingUsers] = await pool.query(
          'SELECT id, username FROM `User` WHERE id = ?',
          [userId]
        );
        
        if (existingUsers.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '用户不存在'
          });
          return;
        }
        
        // 生成默认密码（通常是用户名+123456）
        const targetUser = existingUsers[0];
        const defaultPassword = targetUser.username + '123456';
        
        // 更新密码
        await pool.query(
          'UPDATE `User` SET password = ?, updated_at = NOW() WHERE id = ?',
          [defaultPassword, userId]
        );
        
        console.log('✅ 重置用户密码成功');
        
        sendResponse(res, 200, {
          success: true,
          message: '用户密码重置成功',
          default_password: defaultPassword // 在实际生产环境中，不应该返回默认密码
        });
        
      } catch (error) {
        console.error('重置用户密码失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '重置用户密码失败',
          message: error.message
        });
      }
      return;
    }

    // 9. 获取用户的项目列表
    if (pathname.startsWith('/api/admin/users/') && pathname.includes('/projects') && req.method === 'GET') {
      const token = req.headers.authorization;
      const adminUser = await verifyToken(token);
      
      if (!adminUser) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 检查是否是管理员
      if (!checkPermission(adminUser.role, ['admin', 'assistant'])) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限查看用户项目'
        });
        return;
      }
      
      const userId = pathname.replace('/api/admin/users/', '').replace('/projects', '');
      
      console.log('📋 获取用户项目，管理员:', adminUser.id, '目标用户:', userId);
      
      try {
        // 检查用户是否存在且是申请人
        const [existingUsers] = await pool.query(
          'SELECT id, role FROM `User` WHERE id = ?',
          [userId]
        );
        
        if (existingUsers.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '用户不存在'
          });
          return;
        }
        
        if (existingUsers[0].role !== 'applicant') {
          sendResponse(res, 200, {
            success: true,
            data: []
          });
          return;
        }
        
        // 获取用户的项目列表
        const [projects] = await pool.query(`
          SELECT 
            p.*,
            u.name as applicant_name
          FROM \`Project\` p
          LEFT JOIN \`User\` u ON p.applicant_id = u.id
          WHERE p.applicant_id = ?
          ORDER BY p.created_at DESC
        `, [userId]);
        
        console.log(`✅ 获取用户项目成功，共 ${projects.length} 个项目`);
        
        sendResponse(res, 200, {
          success: true,
          data: projects
        });
        
      } catch (error) {
        console.error('获取用户项目失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取用户项目失败',
          message: error.message
        });
      }
      return;
    }

    // 10. 获取用户的评审记录
    if (pathname.startsWith('/api/admin/users/') && pathname.includes('/reviews') && req.method === 'GET') {
      const token = req.headers.authorization;
      const adminUser = await verifyToken(token);
      
      if (!adminUser) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 检查是否是管理员
      if (!checkPermission(adminUser.role, ['admin', 'assistant'])) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限查看用户评审记录'
        });
        return;
      }
      
      const userId = pathname.replace('/api/admin/users/', '').replace('/reviews', '');
      
      console.log('⭐ 获取用户评审记录，管理员:', adminUser.id, '目标用户:', userId);
      
      try {
        // 检查用户是否存在且是评审专家
        const [existingUsers] = await pool.query(
          'SELECT id, role FROM `User` WHERE id = ?',
          [userId]
        );
        
        if (existingUsers.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '用户不存在'
          });
          return;
        }
        
        if (existingUsers[0].role !== 'reviewer') {
          sendResponse(res, 200, {
            success: true,
            data: []
          });
          return;
        }
        
        // 获取用户的评审记录
        const [reviews] = await pool.query(`
          SELECT 
            pr.*,
            p.title as project_title,
            p.project_code,
            u.name as applicant_name
          FROM \`ProjectReview\` pr
          LEFT JOIN \`Project\` p ON pr.project_id = p.id
          LEFT JOIN \`User\` u ON p.applicant_id = u.id
          WHERE pr.reviewer_id = ?
          ORDER BY pr.review_date DESC, pr.created_at DESC
        `, [userId]);
        
        console.log(`✅ 获取用户评审记录成功，共 ${reviews.length} 条记录`);
        
        sendResponse(res, 200, {
          success: true,
          data: reviews
        });
        
      } catch (error) {
        console.error('获取用户评审记录失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取用户评审记录失败',
          message: error.message
        });
      }
      return;
    }

    // 11. 获取用户的操作日志
    if (pathname.startsWith('/api/admin/users/') && pathname.includes('/logs') && req.method === 'GET') {
      const token = req.headers.authorization;
      const adminUser = await verifyToken(token);
      
      if (!adminUser) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 检查是否是管理员
      if (!checkPermission(adminUser.role, ['admin', 'assistant'])) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限查看用户操作日志'
        });
        return;
      }
      
      const userId = pathname.replace('/api/admin/users/', '').replace('/logs', '');
      const { start_date, end_date, limit = 100 } = query;
      
      console.log('📜 获取用户操作日志，管理员:', adminUser.id, '目标用户:', userId);
      
      try {
        // 检查用户是否存在
        const [existingUsers] = await pool.query(
          'SELECT id, name FROM `User` WHERE id = ?',
          [userId]
        );
        
        if (existingUsers.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '用户不存在'
          });
          return;
        }
        
        // 构建查询条件
        let sql = 'SELECT * FROM `AuditLog` WHERE user_id = ?';
        const params = [userId];
        
        if (start_date) {
          sql += ' AND DATE(created_at) >= ?';
          params.push(start_date);
        }
        
        if (end_date) {
          sql += ' AND DATE(created_at) <= ?';
          params.push(end_date);
        }
        
        sql += ' ORDER BY created_at DESC LIMIT ?';
        params.push(parseInt(limit));
        
        // 获取用户操作日志
        const [logs] = await pool.query(sql, params);
        
        console.log(`✅ 获取用户操作日志成功，共 ${logs.length} 条记录`);
        
        sendResponse(res, 200, {
          success: true,
          data: logs
        });
        
      } catch (error) {
        console.error('获取用户操作日志失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取用户操作日志失败',
          message: error.message
        });
      }
      return;
    }


    // ==================== 404处理 ====================
    
    sendResponse(res, 404, {
      success: false,
      error: 'Endpoint not found',
      path: pathname,
      available_endpoints: [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/profile',
        '/api/db/test',
        '/api/projects',
        '/api/projects/{id}',
        '/api/projects/{id}/progress',
        '/api/users',
        '/api/projects',
        '/api/achievements',
        '/api/achievements/{id}',
        '/api/achievements/stats',
        '/api/projects/{id}/achievements',
        '/api/dashboard/applicant',
        '/api/dashboard/admin',
        '/api/funding',
        '/api/notifications',
        '/api/notifications/stats',
        '/api/notifications/{id}',
        '/api/notifications/{id}/read',
        '/api/notifications/mark-all-read',
        '/api/notifications/clear-read',
        '/api/reviewer',
        '/api/reviewer/review',
        '/api/admin/dashboard',
        '/api/admin/users',
        '/api/admin/projects',
        '/api/admin/logs',
        '/api/admin',
      ]
    });
    
  } catch (error) {
    console.error('服务器错误:', error);
    sendResponse(res, 500, {
      success: false,
      error: '服务器内部错误',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 启动服务器
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log('='.repeat(70));
  console.log(`✅ 研究项目管理系统API启动成功！`);
  console.log('='.repeat(70));
  console.log(`📍 API地址: http://localhost:${PORT}`);
  console.log(`📊 数据库: research_system`);
  console.log(`👤 连接用户: root@localhost`);
  console.log('');
  console.log('📡 主要API端点:');
  console.log(`   POST /api/auth/login        - 用户登录`);
  console.log(`   POST /api/auth/register     - 用户注册`);
  console.log(`   GET  /api/auth/profile      - 获取用户信息`);
  console.log(`   POST /api/projects          - 创建项目`);
  console.log(`   GET  /api/projects          - 获取项目列表`);
  console.log(`   GET  /api/projects/{id}     - 获取项目详情`);
  console.log(`   PUT  /api/projects/{id}     - 更新项目`);
  console.log(`   DELETE /api/projects/{id}   - 删除项目`);
  console.log(`   GET  /api/projects/{id}/progress - 获取项目进度`);
  console.log(`   GET  /api/users             - 获取用户列表（需管理员权限）`);
  console.log(`   GET  /api/projects     - 获取用户可参与的项目列表`);
  console.log('');
  console.log('🏆 成果管理API:');
  console.log(`   GET  /api/achievements      - 获取成果列表`);
  console.log(`   POST /api/achievements      - 创建成果`);
  console.log(`   GET  /api/achievements/{id} - 获取成果详情`);
  console.log(`   PUT  /api/achievements/{id} - 更新成果`);
  console.log(`   DELETE /api/achievements/{id} - 删除成果`);
  console.log(`   POST /api/achievements/{id}/submit - 提交成果审核`);
  console.log(`   POST /api/achievements/{id}/review - 审核成果`);
  console.log(`   GET  /api/projects/{id}/achievements - 获取项目成果列表`);
  console.log(`   GET  /api/achievements/stats - 获取成果统计`);
  console.log('');
  console.log('📊 仪表板API:');
  console.log(`   GET  /api/dashboard/applicant  - 申请人仪表板`);
  console.log(`   GET  /api/dashboard/reviewer   - 评审专家仪表板`);
  console.log(`   GET  /api/dashboard/admin      - 管理员仪表板`);
  console.log(`   GET  /api/dashboard/assistant  - 科研助理仪表板`);
  console.log(`   PUT  /api/notifications/{id}/read - 标记通知已读`);
  console.log(`   PUT  /api/notifications/mark-all-read - 标记所有通知已读`);
  console.log('');
  console.log('📢 通知中心API:');
  console.log(`   GET  /api/notifications      - 获取通知列表（带分页过滤）`);
  console.log(`   GET  /api/notifications/{id} - 获取通知详情`);
  console.log(`   GET  /api/notifications/stats - 获取通知统计`);
  console.log(`   PUT  /api/notifications/{id}/read - 标记通知已读`);
  console.log(`   PUT  /api/notifications/mark-all-read - 标记所有通知已读`);
  console.log(`   DELETE /api/notifications/{id} - 删除通知`);
  console.log(`   DELETE /api/notifications/clear-read - 清空已读通知`);
  console.log(`   POST /api/notifications/create - 创建系统通知（管理员）`);
  console.log('👑 管理员API:');
  console.log(`   GET  /api/admin/dashboard     - 管理员仪表板数据`);
  console.log(`   GET  /api/admin/users         - 管理员用户管理`);
  console.log(`   GET  /api/admin/projects      - 管理员项目管理`);
  console.log(`   GET  /api/admin/logs          - 管理员系统日志`);
    console.log('🔧 测试命令:');
  console.log(`   curl http://localhost:${PORT}/api/db/test`);
  console.log(`   curl http://localhost:${PORT}/api/auth/profile`);
  console.log('='.repeat(70));
  console.log('');
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n正在关闭服务器...');
  try {
    await pool.end();
    console.log('数据库连接池已关闭');
    process.exit(0);
  } catch (error) {
    console.error('关闭数据库连接池失败:', error);
    process.exit(1);
  }
});