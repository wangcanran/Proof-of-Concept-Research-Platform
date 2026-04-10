// research_api.js - 完整版（包含成果管理API）
const http = require('http');
const url = require('url');
const mysql = require('mysql2/promise');
const { randomUUID } = require('crypto');
const { formidable } = require('formidable');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// MySQL配置
const DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '051005',
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

/** 项目经理「确认立项」前：须已分配专家且各专家任务已结束（非 reviewing）。管理员不受此限。 */
async function assertProjectManagerApprovePreconditions(poolConn, projectId, user) {
  if (!user || user.role === 'admin') {
    return { ok: true };
  }
  if (user.role !== 'project_manager') {
    return { ok: true };
  }
  const [rows] = await poolConn.query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status = 'reviewing' THEN 1 ELSE 0 END) AS still_reviewing
     FROM \`ExpertAssignment\` WHERE project_id = ?`,
    [projectId]
  );
  const total = Number(rows[0]?.total) || 0;
  const still = Number(rows[0]?.still_reviewing) || 0;
  if (total === 0) {
    return {
      ok: false,
      error: '请先分配评审专家；分配后项目将进入「评审中」，专家完成评审后您可在此确认立项通过。',
    };
  }
  if (still > 0) {
    return {
      ok: false,
      error: '尚有评审专家未完成评审，请待全部评审结束后再确认立项通过。',
    };
  }
  return { ok: true };
}

/** 项目经理仅能操作自己已领取（manager_id 为自己）的项目；管理员不受限。 */
function assertProjectManagerProjectOwnership(project, user) {
  if (!user || user.role === 'admin') {
    return { ok: true };
  }
  if (user.role !== 'project_manager') {
    return { ok: true };
  }
  if (!project.manager_id) {
    return {
      ok: false,
      error: '请先在工作台「领取」该项目，领取后由您作为项目经理持续负责后续分配专家与跟进。',
    };
  }
  if (String(project.manager_id) !== String(user.id)) {
    return {
      ok: false,
      error: '该项目由其他项目经理负责，您无法操作。',
    };
  }
  return { ok: true };
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
  const r = (role == null ? '' : String(role)).toLowerCase().trim();
  const roleMap = {
    user: 'applicant',
    applicant: 'applicant',
    admin: 'admin',
    assistant: 'project_manager',
    project_manager: 'project_manager',
    reviewer: 'reviewer',
  };
  return roleMap[r] || r || 'applicant';
}
// 辅助函数：验证token
// Token 验证函数（修复版）
// Token 验证函数 - 确保返回一致的用户对象
async function verifyToken(token) {
  if (!token) {
    console.log('❌ Token为空');
    return null;
  }
  
  try {
    // 移除 Bearer 前缀
    let tokenValue = token;
    if (tokenValue.startsWith('Bearer ')) {
      tokenValue = tokenValue.substring(7);
    }
    
    // Base64解码
    const decoded = Buffer.from(tokenValue, 'base64').toString('utf-8');
    const payload = JSON.parse(decoded);
    
    // 检查是否过期
    if (payload.exp && payload.exp < Date.now()) {
      console.log('❌ Token已过期');
      return null;
    }
    
    // 返回统一的用户对象（同时包含 id 和 userId 字段）
    return {
      id: payload.userId || payload.id,
      userId: payload.userId || payload.id,
      username: payload.username,
      role: normalizeRole(payload.role),
    };
  } catch (error) {
    console.error('❌ Token解析失败:', error.message);
    return null;
  }
}
// 在文件开头添加以下辅助函数

// 解析请求体
async function getBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// 生成UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 计算工作量评分（如果还没有这个函数）
function calculateWorkloadScore(recentReviews) {
  if (recentReviews === 0) return 100; // 无近期评审，工作量最小
  if (recentReviews <= 2) return 80;   // 少量评审
  if (recentReviews <= 5) return 60;   // 中等评审量
  if (recentReviews <= 10) return 40;  // 较多评审
  return 20;                            // 评审量很大
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

/** 用户管理类接口：系统管理员 / 项目经理（与侧边栏「用户管理」入口一致） */
function canManageUsers(role) {
  return checkPermission(role, ['admin', 'project_manager']);
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
        database: 'research_system_new',
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
    // =============================================
// 首页相关 API
// =============================================

// 首页数据接口
if (pathname === '/api/home/data' && req.method === 'GET') {
  try {
    // 获取统计数据
    const [projectStats] = await pool.query(`
      SELECT 
        COUNT(*) as totalProjects,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approvedProjects,
        SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as underReviewProjects
      FROM Project
    `);
    
    const [expertStats] = await pool.query(`
      SELECT COUNT(*) as totalExperts 
      FROM User 
      WHERE role = 'reviewer' AND status = 'active'
    `);
    
    const [achievementStats] = await pool.query(`
      SELECT COUNT(*) as totalAchievements 
      FROM ProjectAchievement 
      WHERE status = 'verified'
    `);
    
    // 获取轮播图数据（可以从数据库读取，或返回默认配置）
    const carouselImages = [
      { id: 1, title: '科研项目管理系统', description: '高效管理科研项目全流程', imageUrl: '/images/carousel1.jpg' },
      { id: 2, title: '专家在线评审', description: '公平、公正、透明的评审机制', imageUrl: '/images/carousel2.jpg' },
      { id: 3, title: '经费全程跟踪', description: '预算编制、支出申请、审核支付一体化', imageUrl: '/images/carousel3.jpg' },
      { id: 4, title: '成果转化服务', description: '推动科研成果产业化', imageUrl: '/images/carousel4.jpg' }
    ];
    
    sendResponse(res, 200, {
      success: true,
      data: {
        stats: {
          totalProjects: projectStats[0]?.totalProjects || 0,
          approvedProjects: projectStats[0]?.approvedProjects || 0,
          underReviewProjects: projectStats[0]?.underReviewProjects || 0,
          totalExperts: expertStats[0]?.totalExperts || 0,
          totalAchievements: achievementStats[0]?.totalAchievements || 0
        },
        carouselImages: carouselImages
      }
    });
  } catch (error) {
    console.error('获取首页数据失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取首页数据失败'
    });
  }
  return;
}

/** 首页「平台数据」：无需登录，由数据库聚合（与列表拉全量再数数相比更准确） */
if (pathname === '/api/home/stats' && req.method === 'GET') {
  try {
    const [projectRows] = await pool.query(`
      SELECT
        COUNT(*) AS total_projects,
        SUM(CASE WHEN status IN ('approved', 'incubating', 'completed') THEN 1 ELSE 0 END) AS approved_projects,
        SUM(CASE WHEN status = 'incubating' THEN 1 ELSE 0 END) AS incubating_projects,
        COALESCE(SUM(COALESCE(approved_budget, 0)), 0) AS total_budget_yuan
      FROM \`Project\`
    `);
    const [reviewerRows] = await pool.query(`
      SELECT COUNT(*) AS reviewer_count
      FROM \`User\`
      WHERE role = 'reviewer'
    `);
    const [achievementRows] = await pool.query(`
      SELECT COUNT(*) AS achievement_count
      FROM \`ProjectAchievement\`
    `);

    const p = projectRows[0] || {};
    const totalBudgetWan = (Number(p.total_budget_yuan) || 0) / 10000;

    sendResponse(res, 200, {
      success: true,
      data: {
        totalProjects: Number(p.total_projects) || 0,
        approvedProjects: Number(p.approved_projects) || 0,
        incubatingProjects: Number(p.incubating_projects) || 0,
        reviewerCount: Number(reviewerRows[0]?.reviewer_count) || 0,
        achievementCount: Number(achievementRows[0]?.achievement_count) || 0,
        totalBudget: String(Math.round(totalBudgetWan)),
      },
    });
  } catch (error) {
    console.error('获取首页平台统计失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取首页平台统计失败',
      message: error.message,
    });
  }
  return;
}

// 获取公开的公告列表（首页展示）
if (pathname === '/api/home/notices' && req.method === 'GET') {
  try {
    const [notices] = await pool.query(`
      SELECT id, title, abstract, category, view_count, published_at 
      FROM Notice 
      WHERE status = 'published' AND show_on_homepage = 'yes'
      ORDER BY is_top DESC, published_at DESC 
      LIMIT 5
    `);
    
    sendResponse(res, 200, {
      success: true,
      data: notices
    });
  } catch (error) {
    console.error('获取公告失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取公告失败'
    });
  }
  return;
}
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
    const allowedRoles = ['applicant', 'reviewer', 'project_manager', 'admin'];
    if (!body.role || !allowedRoles.includes(String(body.role).trim())) {
      sendResponse(res, 400, {
        success: false,
        error: '请选择有效的身份类型（项目申请人 / 评审专家 / 项目经理 / 系统管理员）',
      });
      return;
    }

    // 仅用用户名/邮箱查找，避免「身份类型」选错时误报「用户不存在」
    const [users] = await pool.query(
      'SELECT * FROM `User` WHERE username = ? OR email = ? LIMIT 1',
      [body.username, body.username],
    );

    if (users.length === 0) {
      sendResponse(res, 401, {
        success: false,
        error: '用户名或密码错误',
      });
      return;
    }

    const user = users[0];

    // 检查账号状态
    if (user.status === 'inactive') {
      sendResponse(res, 403, {
        success: false,
        error: '账号尚未激活，请联系管理员审核',
      });
      return;
    }

    // 密码验证通过后再校验身份，避免未认证即泄露账号角色
    let passwordValid = false;

    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$')) {
      try {
        const bcrypt = require('bcryptjs');
        passwordValid = await bcrypt.compare(body.password, user.password);
      } catch (bcryptError) {
        console.error('bcrypt验证失败:', bcryptError);
        passwordValid = body.password === user.password;
      }
    } else {
      passwordValid = body.password === user.password;
    }

    if (!passwordValid) {
      sendResponse(res, 401, {
        success: false,
        error: '用户名或密码错误',
      });
      return;
    }

    const requestedRole = String(body.role).trim();
    if (requestedRole !== user.role) {
      const roleLabel = {
        applicant: '项目申请人',
        reviewer: '评审专家',
        project_manager: '项目经理',
        admin: '系统管理员',
      };
      sendResponse(res, 403, {
        success: false,
        error: `身份与账号不符：该账号为「${roleLabel[user.role] || user.role}」，请重新选择身份类型后登录`,
      });
      return;
    }
    
    // 生成JWT token（如果需要使用更标准的JWT）
    const token = generateToken(user);
    
    // 移除密码字段
    const { password, ...userWithoutPassword } = user;
    
    // 更新最后登录时间
    await pool.query('UPDATE `User` SET last_login = NOW() WHERE id = ?', [user.id]);
    
    // 获取用户的额外信息（如果是专家，获取擅长领域）
    let expertDomains = [];
    if (user.role === 'reviewer') {
      try {
        const [domains] = await pool.query(
          `SELECT rd.id, rd.name, rd.code 
           FROM ExpertDomain ed 
           JOIN ResearchDomain rd ON ed.domain_id = rd.id 
           WHERE ed.expert_id = ?`,
          [user.id]
        );
        expertDomains = domains;
      } catch (err) {
        console.log('获取专家领域失败:', err.message);
      }
    }
    
    console.log('✅ 用户登录成功:', { 
      username: user.username, 
      role: user.role,
      userId: user.id,
      loginTime: new Date().toISOString()
    });
    
    sendResponse(res, 200, {
      success: true,
      message: '登录成功',
      token: token,
      user: {
        ...userWithoutPassword,
        expertDomains: expertDomains
      }
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

// 用户注册接口
if (pathname === '/api/auth/register' && req.method === 'POST') {
  const body = await parseRequestBody(req);
  
  // 验证必填字段
  if (!body.username || !body.password || !body.name || !body.email) {
    sendResponse(res, 400, {
      success: false,
      error: '用户名、密码、姓名和邮箱为必填项'
    });
    return;
  }
  
  // 验证密码长度
  if (body.password.length < 6) {
    sendResponse(res, 400, {
      success: false,
      error: '密码长度至少为6位'
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
  
  try {
    // 检查用户名是否已存在
    const [existingUser] = await pool.query(
      'SELECT id FROM `User` WHERE username = ? OR email = ?',
      [body.username, body.email]
    );
    
    if (existingUser.length > 0) {
      sendResponse(res, 409, {
        success: false,
        error: '用户名或邮箱已存在'
      });
      return;
    }
    
    // 验证邀请码（如果有）
    let targetRole = 'applicant'; // 默认角色为申请人
    let invitationInfo = null;
    
    if (body.invitationCode) {
      const [invitations] = await pool.query(
        `SELECT * FROM Invitation 
         WHERE invitation_code = ? 
         AND status = 'pending' 
         AND expires_at > NOW()`,
        [body.invitationCode]
      );
      
      if (invitations.length > 0) {
        invitationInfo = invitations[0];
        targetRole = invitationInfo.target_role;
      } else {
        sendResponse(res, 400, {
          success: false,
          error: '邀请码无效或已过期'
        });
        return;
      }
    }
    
    // 生成用户ID
    const userId = generateUUID();
    
    // 密码加密（使用bcrypt）
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(body.password, 10);
    
    // 插入用户
    await pool.query(
      `INSERT INTO \`User\` 
       (id, username, password, name, email, role, department, title, phone, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        body.username,
        hashedPassword,
        body.name,
        body.email,
        targetRole,
        body.department || null,
        body.title || null,
        body.phone || null,
        'inactive'  // 新注册用户默认未激活，需要管理员审核
      ]
    );
    
    // 如果注册的是专家，创建专家扩展信息
    if (targetRole === 'reviewer') {
      await pool.query(
        `INSERT INTO ExpertProfile (id, expertise_description, created_at) 
         VALUES (?, ?, NOW())`,
        [userId, body.expertiseDescription || null]
      );
    }
    
    // 如果使用了邀请码，更新邀请记录状态
    if (invitationInfo) {
      await pool.query(
        `UPDATE Invitation 
         SET status = 'accepted', 
             registered_user_id = ?, 
             accepted_at = NOW() 
         WHERE id = ?`,
        [userId, invitationInfo.id]
      );
    }
    
    console.log('✅ 用户注册成功:', {
      username: body.username,
      email: body.email,
      role: targetRole,
      userId: userId
    });
    
    sendResponse(res, 201, {
      success: true,
      message: '注册成功，请等待管理员审核',
      userId: userId
    });
  } catch (error) {
    console.error('注册错误:', error);
    sendResponse(res, 500, {
      success: false,
      error: '注册失败',
      message: error.message
    });
  }
  return;
}

// 获取当前用户信息
if (pathname === '/api/auth/me' && req.method === 'GET') {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    sendResponse(res, 401, {
      success: false,
      error: '未提供认证令牌'
    });
    return;
  }
  
  try {
    // 解析token获取用户ID
    const decoded = decodeToken(token);
    
    if (!decoded || !decoded.userId) {
      sendResponse(res, 401, {
        success: false,
        error: '无效的认证令牌'
      });
      return;
    }
    
    // 查询用户信息
    const [users] = await pool.query(
      'SELECT id, username, name, email, role, department, title, phone, status, last_login, created_at FROM `User` WHERE id = ?',
      [decoded.userId]
    );
    
    if (users.length === 0) {
      sendResponse(res, 404, {
        success: false,
        error: '用户不存在'
      });
      return;
    }
    
    const user = users[0];
    
    // 获取专家领域（如果是专家）
    let expertDomains = [];
    if (user.role === 'reviewer') {
      const [domains] = await pool.query(
        `SELECT rd.id, rd.name, rd.code 
         FROM ExpertDomain ed 
         JOIN ResearchDomain rd ON ed.domain_id = rd.id 
         WHERE ed.expert_id = ?`,
        [user.id]
      );
      expertDomains = domains;
    }
    
    sendResponse(res, 200, {
      success: true,
      user: {
        ...user,
        expertDomains
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取用户信息失败'
    });
  }
  return;
}

// 辅助函数：生成UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 登录接口中的 Token 生成（修复版）
function generateToken(user) {
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7天过期
  };
  // 将对象转为 JSON 字符串后再 Base64 编码
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// 辅助函数：解码Token
function decodeToken(token) {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    // 检查是否过期
    if (decoded.exp && decoded.exp < Date.now()) {
      return null;
    }
    return decoded;
  } catch (error) {
    return null;
  }
}
    // ==================== 仪表板API ====================

    // 申请人仪表板数据
if (pathname === '/api/dashboard/applicant' && req.method === 'GET') {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    sendResponse(res, 401, {
      success: false,
      error: '未提供认证令牌'
    });
    return;
  }
  
  const user = await verifyToken(token);
  
  if (!user) {
    sendResponse(res, 401, {
      success: false,
      error: '认证失败'
    });
    return;
  }
  
  try {
    console.log('📊 获取申请人仪表板数据，用户ID:', user.userId);
    const userId = user.userId;
    
    // 1. 获取项目统计
    const [projectStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_projects,
        SUM(CASE WHEN status IN ('draft', 'submitted', 'under_review', 'revision', 'batch_review') THEN 1 ELSE 0 END) as pending_reviews,
        SUM(CASE WHEN status = 'incubating' THEN 1 ELSE 0 END) as ongoing_projects,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted_projects,
        SUM(CASE WHEN status IN ('approved', 'incubating') THEN 1 ELSE 0 END) as approved_projects,
        SUM(CASE WHEN status IN ('under_review', 'revision', 'batch_review') THEN 1 ELSE 0 END) as reviewing_projects,
        COALESCE(SUM(approved_budget), 0) as total_funds
      FROM \`Project\`
      WHERE applicant_id = ?
    `, [userId]);
    
    const statsData = projectStats[0] || {
      total_projects: 0,
      pending_reviews: 0,
      ongoing_projects: 0,
      submitted_projects: 0,
      approved_projects: 0,
      reviewing_projects: 0,
      total_funds: 0
    };
    
    // 2. 获取已使用经费（从支出记录表）
    const [usedFundsResult] = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as used_funds
      FROM \`ExpenditureRecord\` er
      INNER JOIN \`Project\` p ON er.project_id = p.id
      WHERE p.applicant_id = ? AND er.status IN ('approved', 'paid')
    `, [userId]);
    
    const usedFunds = usedFundsResult[0]?.used_funds || 0;
    
    // 3. 获取待办事项
    const pendingTasks = [];
    
    // 3.1 待处理的项目（草稿和需要修改的）
    const [projectTasks] = await pool.query(`
      SELECT 
        id,
        title,
        'project' as type,
        DATE_FORMAT(created_at, '%Y-%m-%d') as deadline
      FROM \`Project\`
      WHERE applicant_id = ? 
        AND status IN ('draft', 'revision')
      ORDER BY created_at DESC
      LIMIT 5
    `, [userId]);
    
    // 3.2 待处理的成果审核
    const [achievementTasks] = await pool.query(`
      SELECT 
        pa.id,
        pa.title,
        'achievement_review' as type,
        DATE_FORMAT(pa.created_at, '%Y-%m-%d') as deadline
      FROM \`ProjectAchievement\` pa
      INNER JOIN \`Project\` p ON pa.project_id = p.id
      WHERE p.applicant_id = ?
        AND pa.status = 'submitted'
      ORDER BY pa.created_at DESC
      LIMIT 5
    `, [userId]);
    
    // 3.3 待处理的经费申请
    const [expenditureTasks] = await pool.query(`
      SELECT 
        er.id,
        er.item_name as title,
        'expenditure' as type,
        DATE_FORMAT(er.created_at, '%Y-%m-%d') as deadline
      FROM \`ExpenditureRecord\` er
      INNER JOIN \`Project\` p ON er.project_id = p.id
      WHERE p.applicant_id = ?
        AND er.status = 'submitted'
      ORDER BY er.created_at DESC
      LIMIT 5
    `, [userId]);
    
    pendingTasks.push(
      ...projectTasks.map(task => ({ 
        id: `proj_${task.id}`, 
        title: `处理项目: ${task.title}`,
        type: 'project',
        deadline: task.deadline,
        priority: 'medium'
      })),
      ...achievementTasks.map(task => ({ 
        id: `ach_${task.id}`, 
        title: `审核成果: ${task.title}`,
        type: 'achievement_review',
        deadline: task.deadline,
        priority: 'medium'
      })),
      ...expenditureTasks.map(task => ({ 
        id: `exp_${task.id}`, 
        title: `经费申请: ${task.title}`,
        type: 'expenditure',
        deadline: task.deadline,
        priority: 'medium'
      }))
    );
    
    // 4. 获取最新通知
    const [notifications] = await pool.query(`
      SELECT 
        id,
        type,
        title,
        content,
        priority,
        action_url,
        related_id,
        related_type,
        is_read,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
      FROM \`Notification\`
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);
    
    // 5. 获取我的项目列表（最近5个）
    const [myProjects] = await pool.query(`
      SELECT 
        p.id,
        p.title,
        p.status,
        p.project_code,
        p.submit_date,
        p.approval_date,
        p.start_date,
        p.end_date,
        u.name as applicant_name
      FROM \`Project\` p
      LEFT JOIN \`User\` u ON p.applicant_id = u.id
      WHERE p.applicant_id = ?
        AND p.status NOT IN ('rejected', 'terminated')
      ORDER BY p.created_at DESC
      LIMIT 5
    `, [userId]);
    
    // 6. 获取趋势数据
    // 本月项目提交数
    const [currentMonthStats] = await pool.query(`
      SELECT COUNT(*) as count
      FROM \`Project\`
      WHERE applicant_id = ? 
        AND DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
    `, [userId]);
    
    // 上月项目提交数
    const [lastMonthStats] = await pool.query(`
      SELECT COUNT(*) as count
      FROM \`Project\`
      WHERE applicant_id = ? 
        AND DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m')
    `, [userId]);
    
    const submissionTrend = lastMonthStats[0]?.count > 0 
      ? ((currentMonthStats[0]?.count - lastMonthStats[0]?.count) / lastMonthStats[0]?.count * 100).toFixed(1)
      : (currentMonthStats[0]?.count > 0 ? 100 : 0);
    
    // 本月批准项目数
    const [currentApprovedStats] = await pool.query(`
      SELECT COUNT(*) as count
      FROM \`Project\`
      WHERE applicant_id = ? 
        AND status IN ('approved', 'incubating')
        AND DATE_FORMAT(approval_date, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
    `, [userId]);
    
    const [lastApprovedStats] = await pool.query(`
      SELECT COUNT(*) as count
      FROM \`Project\`
      WHERE applicant_id = ? 
        AND status IN ('approved', 'incubating')
        AND DATE_FORMAT(approval_date, '%Y-%m') = DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m')
    `, [userId]);
    
    const approvalTrend = lastApprovedStats[0]?.count > 0 
      ? ((currentApprovedStats[0]?.count - lastApprovedStats[0]?.count) / lastApprovedStats[0]?.count * 100).toFixed(1)
      : (currentApprovedStats[0]?.count > 0 ? 100 : 0);
    
    // 本月经费使用趋势
    const [currentFundStats] = await pool.query(`
      SELECT COALESCE(SUM(er.amount), 0) as total
      FROM \`ExpenditureRecord\` er
      INNER JOIN \`Project\` p ON er.project_id = p.id
      WHERE p.applicant_id = ?
        AND er.status IN ('approved', 'paid')
        AND DATE_FORMAT(er.created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
    `, [userId]);
    
    const [lastFundStats] = await pool.query(`
      SELECT COALESCE(SUM(er.amount), 0) as total
      FROM \`ExpenditureRecord\` er
      INNER JOIN \`Project\` p ON er.project_id = p.id
      WHERE p.applicant_id = ?
        AND er.status IN ('approved', 'paid')
        AND DATE_FORMAT(er.created_at, '%Y-%m') = DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m')
    `, [userId]);
    
    const fundTrend = lastFundStats[0]?.total > 0 
      ? ((currentFundStats[0]?.total - lastFundStats[0]?.total) / lastFundStats[0]?.total * 100).toFixed(1)
      : (currentFundStats[0]?.total > 0 ? 100 : 0);
    
    // 7. 获取未读通知数量
    const [unreadCountResult] = await pool.query(`
      SELECT COUNT(*) as count
      FROM \`Notification\`
      WHERE user_id = ? AND is_read = FALSE
    `, [userId]);
    
    const unreadCount = unreadCountResult[0]?.count || 0;
    
    // 8. 获取用户信息
    const [userInfo] = await pool.query(`
      SELECT id, name, username, email, department, title, phone, role
      FROM \`User\`
      WHERE id = ?
    `, [userId]);
    
    const currentUser = userInfo[0] || { name: '用户', username: user.username };
    
    console.log('✅ 申请人仪表板数据获取成功');
    
    sendResponse(res, 200, {
      success: true,
      data: {
        stats: {
          total_projects: parseInt(statsData.total_projects) || 0,
          pending_reviews: parseInt(statsData.pending_reviews) || 0,
          ongoing_projects: parseInt(statsData.ongoing_projects) || 0,
          submitted_projects: parseInt(statsData.submitted_projects) || 0,
          approved_projects: parseInt(statsData.approved_projects) || 0,
          reviewing_projects: parseInt(statsData.reviewing_projects) || 0,
          total_funds: parseFloat(statsData.total_funds) || 0,
          used_funds: parseFloat(usedFunds) || 0,
          remaining_funds: (parseFloat(statsData.total_funds) - parseFloat(usedFunds)) || 0,
          submission_trend: parseFloat(submissionTrend),
          approval_trend: parseFloat(approvalTrend),
          review_trend: -1.5,
          fund_trend: parseFloat(fundTrend)
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
        notifications: notifications.map(notif => ({
          id: notif.id,
          title: notif.title,
          description: notif.content,
          icon: getNotificationIcon(notif.type),
          time: formatRelativeTime(notif.created_at),
          read: notif.is_read === 1,
          priority: notif.priority,
          type: notif.type,
          action_url: notif.action_url,
          related_id: notif.related_id,
          related_type: notif.related_type,
          created_at: notif.created_at
        })),
        my_projects: myProjects.map(project => ({
          id: project.id,
          raw_id: project.id,
          title: project.title,
          code: project.project_code || `PROJ-${project.id.substring(0, 8)}`,
          status: project.status,
          progress: calculateProjectProgress(project.status),
          deadline: project.end_date ? formatDate(project.end_date) : (project.approval_date ? formatDate(project.approval_date) : '未设置'),
          manager: project.applicant_name || '申请人',
          submit_date: project.submit_date ? formatDate(project.submit_date) : null,
          approval_date: project.approval_date ? formatDate(project.approval_date) : null
        })),
        unread_count: unreadCount,
        user_info: {
          id: currentUser.id,
          name: currentUser.name,
          username: currentUser.username,
          email: currentUser.email,
          department: currentUser.department,
          title: currentUser.title,
          phone: currentUser.phone,
          role: currentUser.role
        }
      }
    });
    
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
// 计算项目进度（基于状态）
function calculateProjectProgress(status) {
  const progressMap = {
    'draft': 20,
    'submitted': 40,
    'under_review': 50,
    'revision': 45,
    'batch_review': 55,
    'approved': 70,
    'incubating': 85,
    'completed': 100,
    'rejected': 0,
    'terminated': 0
  };
  return progressMap[status] || 10;
}

// 获取任务类型标签
function getTaskTypeLabel(type) {
  const typeMap = {
    'project': '项目',
    'achievement_review': '成果审核',
    'expenditure': '经费申请'
  };
  return typeMap[type] || type;
}

// 获取通知图标
function getNotificationIcon(type) {
  const iconMap = {
    'project': '📋',
    'review': '⭐',
    'funding': '💰',
    'incubation': '🏭',
    'system': '🔧',
    'reminder': '⏰',
    'invitation': '✉️'
  };
  return iconMap[type] || '📢';
}

// 格式化日期
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 格式化相对时间
function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diff / 60000);
  const diffHours = Math.floor(diff / 3600000);
  const diffDays = Math.floor(diff / 86400000);
  
  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
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
      const isAdmin = user.role === 'admin' || user.role === 'project_manager';
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
  
  if (!user || !canManageUsers(user.role)) {
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
  
  if (!admin || !canManageUsers(admin.role)) {
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
  
  if (!admin || !canManageUsers(admin.role)) {
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
  
  if (!admin || !canManageUsers(admin.role)) {
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
  
  if (!admin || !canManageUsers(admin.role)) {
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
  
  if (!admin || !canManageUsers(admin.role)) {
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
  
  if (!admin || !canManageUsers(admin.role)) {
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
  
  if (!admin || !canManageUsers(admin.role)) {
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
  
  if (!admin || !canManageUsers(admin.role)) {
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
  
  if (!admin || !canManageUsers(admin.role)) {
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
  
  if (!admin || !canManageUsers(admin.role)) {
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
  
  if (!admin || !canManageUsers(admin.role)) {
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
  
  if (!admin || !canManageUsers(admin.role)) {
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
          WHEN 'project_manager' THEN '科研助理'
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
  
  if (!admin || !canManageUsers(admin.role)) {
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
  
  if (!admin || !canManageUsers(admin.role)) {
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
    const allRoles = ['applicant', 'reviewer', 'project_manager', 'admin'];
    
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
  
  // 检查是否是科研助理或管理员
  const isAssistant = user.role === 'project_manager' || user.role === 'admin';
  if (!isAssistant) {
    sendResponse(res, 403, {
      success: false,
      error: '没有权限访问科研助理仪表板'
    });
    return;
  }
  
  try {
    console.log('📊 获取科研助理仪表板数据，用户ID:', user.id);
    
    // 1. 数据概览卡片数据（适配新数据库状态）
    const overview = {
      pendingApplications: 0,
      activeUsers: 0,
      activeProjects: 0,
      unreadMessages: 0,
      applicationChange: 0,
      userChange: 0,
      completedProjects: 0,
      pendingReplies: 0,
      pending_expenditures: 0,
      pending_achievements: 0
    };
    
    // 获取待处理申请数量（submitted, under_review, revision状态）
    const [pendingApps] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM \`Project\` 
      WHERE status IN ('submitted', 'under_review', 'revision', 'batch_review')
    `);
    overview.pendingApplications = pendingApps[0]?.count || 0;
    
    // 获取活跃用户数量（最近7天有登录的用户）
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
    
    // 获取进行中项目数量（孵化中）
    const [activeProjects] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM \`Project\` 
      WHERE status = 'incubating'
    `);
    overview.activeProjects = activeProjects[0]?.count || 0;
    
    // 获取已完成项目数量
    const [completedProjects] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM \`Project\` 
      WHERE status = 'completed'
    `);
    overview.completedProjects = completedProjects[0]?.count || 0;
    
    // 获取未读消息数量
    const [unreadMessages] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM \`Notification\` 
      WHERE user_id = ? AND is_read = FALSE
    `, [user.id]);
    overview.unreadMessages = unreadMessages[0]?.count || 0;
    
    // 获取未处理支出申请
    const [pendingExpenditures] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM \`ExpenditureRecord\` 
      WHERE status = 'submitted'
    `);
    overview.pending_expenditures = pendingExpenditures[0]?.count || 0;
    
    // 获取未审核成果
    const [pendingAchievements] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM \`ProjectAchievement\` 
      WHERE status = 'submitted'
    `);
    overview.pending_achievements = pendingAchievements[0]?.count || 0;
    
    // 2. 获取待处理申请列表
    const [applications] = await pool.query(`
      SELECT 
        p.id,
        p.project_code,
        p.title,
        p.status,
        p.created_at,
        u.name as applicant_name,
        u.email as applicant_email
      FROM \`Project\` p
      LEFT JOIN \`User\` u ON p.applicant_id = u.id
      WHERE p.status IN ('submitted', 'under_review', 'revision', 'batch_review')
      ORDER BY 
        CASE p.status 
          WHEN 'under_review' THEN 1
          WHEN 'submitted' THEN 2
          WHEN 'revision' THEN 3
          WHEN 'batch_review' THEN 4
          ELSE 5
        END,
        p.created_at ASC
      LIMIT 10
    `);
    
    // 格式化申请数据
    const pendingApplications = applications.map(app => ({
      id: app.id,
      project_code: app.project_code,
      title: app.title,
      applicant_name: app.applicant_name || '未知申请人',
      applicant_email: app.applicant_email,
      status: app.status,
      created_at: app.created_at ? new Date(app.created_at).toISOString() : null
    }));
    
    // 3. 获取项目统计（适配新数据库所有状态）
    const [projectStatsResult] = await pool.query(`
      SELECT 
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
        SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as under_review,
        SUM(CASE WHEN status = 'revision' THEN 1 ELSE 0 END) as revision,
        SUM(CASE WHEN status = 'batch_review' THEN 1 ELSE 0 END) as batch_review,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'incubating' THEN 1 ELSE 0 END) as incubating,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'terminated' THEN 1 ELSE 0 END) as terminated
      FROM \`Project\`
    `);
    
    const stats = projectStatsResult[0] || {};
    const totalProjects = Object.values(stats).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    
    // 项目状态列表（只显示有数据的）
    const statusList = [
      { status: 'submitted', label: '已提交', color: '#e6f7ff', textColor: '#1890ff' },
      { status: 'under_review', label: '评审中', color: '#fff7e6', textColor: '#fa8c16' },
      { status: 'revision', label: '修改中', color: '#ffe7ba', textColor: '#d46b00' },
      { status: 'batch_review', label: '集中评审', color: '#ffd591', textColor: '#ad4e00' },
      { status: 'approved', label: '已批准', color: '#f6ffed', textColor: '#52c41a' },
      { status: 'incubating', label: '孵化中', color: '#1890ff', textColor: 'white' },
      { status: 'completed', label: '已完成', color: '#f6ffed', textColor: '#52c41a' },
      { status: 'rejected', label: '已驳回', color: '#fff2f0', textColor: '#ff4d4f' },
      { status: 'terminated', label: '已终止', color: '#f5f5f5', textColor: '#8c8c8c' },
      { status: 'draft', label: '草稿', color: '#f5f5f5', textColor: '#8c8c8c' }
    ];
    
    const projectStats = statusList
      .filter(s => stats[s.status] && stats[s.status] > 0)
      .map(s => ({
        status: s.status,
        label: s.label,
        count: stats[s.status] || 0,
        percentage: totalProjects > 0 ? Math.round((stats[s.status] / totalProjects) * 100) : 0,
        color: s.color,
        textColor: s.textColor
      }));
    
    // 4. 获取最近活动
    const [activities] = await pool.query(`
      SELECT 
        id,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        user_id,
        created_at,
        (SELECT name FROM \`User\` WHERE id = user_id) as user_name
      FROM \`AuditLog\`
      ORDER BY created_at DESC
      LIMIT 15
    `);
    
    // 格式化活动数据
    const getActivityDescription = (log) => {
      const actionMap = {
        'create': '创建了',
        'update': '更新了',
        'delete': '删除了',
        'review': '审核了',
        'approve': '批准了',
        'reject': '驳回了'
      };
      const actionText = actionMap[log.action] || log.action;
      const tableName = log.table_name === 'Project' ? '项目' :
                        log.table_name === 'User' ? '用户' :
                        log.table_name === 'ProjectAchievement' ? '成果' :
                        log.table_name === 'ExpenditureRecord' ? '支出申请' : log.table_name;
      return `${log.user_name || '系统'} ${actionText}${tableName}`;
    };
    
    const getActivityIcon = (action) => {
      const iconMap = {
        'create': '➕', 'update': '✏️', 'delete': '🗑️', 
        'review': '📝', 'approve': '✅', 'reject': '❌'
      };
      return iconMap[action] || '📋';
    };
    
    const getActivityColor = (action) => {
      const colorMap = {
        'create': '#e6f7ff', 'update': '#fff7e6', 'delete': '#fff2f0',
        'review': '#f6ffed', 'approve': '#d9f7be', 'reject': '#ffccc7'
      };
      return colorMap[action] || '#f5f5f5';
    };
    
    const recentActivities = activities.map((activity, index) => ({
      id: index + 1,
      icon: getActivityIcon(activity.action),
      color: getActivityColor(activity.action),
      description: getActivityDescription(activity),
      time: getTimeAgo(activity.created_at)
    }));
    
    // 如果没有活动记录，添加默认活动
    if (recentActivities.length === 0) {
      recentActivities.push(
        { id: 1, icon: '📝', color: '#e6f7ff', description: '欢迎使用科研项目管理系统', time: '刚刚' },
        { id: 2, icon: '👤', color: '#f6ffed', description: '系统已就绪，可以开始工作', time: '刚刚' }
      );
    }
    
    // 5. 获取系统通知
    const [notifications] = await pool.query(`
      SELECT 
        id,
        type,
        title,
        content,
        priority,
        is_read,
        action_url,
        created_at
      FROM \`Notification\`
      WHERE user_id = ? OR user_id IS NULL
      ORDER BY 
        CASE priority 
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END,
        created_at DESC
      LIMIT 10
    `, [user.id]);
    
    // 格式化通知数据
    const getNotificationIcon = (type, priority) => {
      if (priority === 'urgent') return '🚨';
      if (priority === 'high') return '⚠️';
      const iconMap = {
        'project': '📋', 'review': '⭐', 'funding': '💰',
        'incubation': '🏭', 'system': '🔧', 'reminder': '⏰',
        'invitation': '✉️'
      };
      return iconMap[type] || '📢';
    };
    
    const systemNotifications = notifications.map(notif => ({
      id: notif.id,
      icon: getNotificationIcon(notif.type, notif.priority),
      title: notif.title,
      message: notif.content,
      time: getTimeAgo(notif.created_at),
      read: notif.is_read === 1,
      priority: notif.priority,
      action_url: notif.action_url
    }));
    
    // 如果没有通知，添加默认通知
    if (systemNotifications.length === 0) {
      systemNotifications.push(
        { 
          id: 1, icon: '📢', title: '欢迎使用系统', 
          message: '欢迎使用科研项目管理系统', time: '刚刚', read: false 
        }
      );
    }
    
    // 构建响应数据
    const responseData = {
      success: true,
      data: {
        user_info: {
          id: user.id,
          username: user.username || user.name,
          name: user.name,
          role: user.role,
          email: user.email || ''
        },
        overview: overview,
        pending_applications: pendingApplications,
        project_stats: projectStats,
        recent_activities: recentActivities,
        notifications: systemNotifications
      }
    };
    
    console.log('✅ 科研助理仪表板数据获取成功');
    
    sendResponse(res, 200, responseData);
    
  } catch (error) {
    console.error('获取科研助理仪表板数据失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取仪表板数据失败',
      message: error.message,
      stack: error.stack
    });
  }
  return;
}
// 辅助函数：获取时间描述（如"2小时前"）
function getTimeAgo(date) {
  if (!date) return '未知时间';
  
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;
  return `${Math.floor(diffDays / 365)}年前`;
}
// 获取科研助理仪表板概览数据
if (pathname === '/api/assistant/dashboard/overview' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'project_manager') {
    sendResponse(res, 403, { success: false, error: '没有权限' });
    return;
  }
  
  try {
    console.log('获取科研助理仪表板概览，助理ID:', user.id);
    
    // 待领取：已提交且尚未指定项目经理（与申请列表 scope=unassigned 一致）
    const [pendingAppsResult] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM \`Project\` 
      WHERE status = 'submitted' AND manager_id IS NULL
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
  
  if (!user || user.role !== 'project_manager') {
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
  
  if (!user || user.role !== 'project_manager') {
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
  
  if (!user || user.role !== 'project_manager') {
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
  
  if (!user || user.role !== 'project_manager') {
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
// ==================== 获取用户列表API ====================

if (pathname === '/api/users' && req.method === 'GET') {
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
    const query = url.parse(req.url, true).query;
    const role = query.role;
    const status = query.status;
    const keyword = query.keyword || '';
    const domainId = query.domain_id || query.domainId || '';
    const limit = parseInt(query.limit) || 100;
    const page = parseInt(query.page) || 1;
    const offset = (page - 1) * limit;
    
    let sql = 'SELECT id, username, name, email, role, department, title, phone, status, created_at FROM `User` WHERE 1=1';
    const params = [];
    
    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }
    
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (domainId) {
      sql += ` AND EXISTS (SELECT 1 FROM \`ExpertDomain\` ed WHERE ed.expert_id = \`User\`.id AND ed.domain_id = ?)`;
      params.push(domainId);
    }
    
    if (keyword) {
      const kw = `%${keyword}%`;
      // 含部门、职称、专家特长描述、擅长领域名称（否则搜「生物」等无法命中仅写在领域/简介里的专家）
      sql += ` AND (
        name LIKE ? OR username LIKE ? OR email LIKE ?
        OR department LIKE ? OR title LIKE ?
        OR EXISTS (SELECT 1 FROM \`ExpertProfile\` ep WHERE ep.id = \`User\`.id AND ep.expertise_description LIKE ?)
        OR EXISTS (
          SELECT 1 FROM \`ExpertDomain\` ed
          INNER JOIN \`ResearchDomain\` rd ON ed.domain_id = rd.id
          WHERE ed.expert_id = \`User\`.id AND rd.name LIKE ?
        )
      )`;
      params.push(kw, kw, kw, kw, kw, kw, kw);
    }
    
    // 获取总数
    const [totalResult] = await pool.query(sql.replace('SELECT id, username, name, email, role, department, title, phone, status, created_at', 'SELECT COUNT(*) as total'), params);
    const total = totalResult[0]?.total || 0;
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const [users] = await pool.query(sql, params);
    
    // 获取专家的研究领域
    const reviewerIds = users.filter(u => u.role === 'reviewer').map(u => u.id);
    let expertDomains = {};
    
    if (reviewerIds.length > 0) {
      const [domains] = await pool.query(`
        SELECT 
          ed.expert_id,
          rd.name as research_field
        FROM \`ExpertDomain\` ed
        LEFT JOIN \`ResearchDomain\` rd ON ed.domain_id = rd.id
        WHERE ed.expert_id IN (?)
      `, [reviewerIds]);
      
      domains.forEach(d => {
        if (!expertDomains[d.expert_id]) expertDomains[d.expert_id] = [];
        expertDomains[d.expert_id].push(d.research_field);
      });
    }
    
    const formattedUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department,
      title: u.title,
      phone: u.phone,
      status: u.status,
      research_field: expertDomains[u.id] ? expertDomains[u.id].join(', ') : null,
      created_at: u.created_at
    }));
    
    sendResponse(res, 200, {
      success: true,
      data: formattedUsers,
      total: total,
      page: page,
      limit: limit,
      pages: Math.ceil(total / limit)
    });
    
  } catch (error) {
    console.error('获取用户列表失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取用户列表失败',
      message: error.message
    });
  }
  return;
}
// 获取待处理任务统计
if (pathname === '/api/assistant/tasks/pending' && req.method === 'GET') {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'project_manager') {
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
      // 获取需要分配专家的项目数量
  const [reviewerAssignmentResult] = await pool.query(`
    SELECT COUNT(*) as count 
    FROM \`Project\` 
    WHERE status IN ('submitted')
  `);

  const tasks = {
    projects: projectsResult[0]?.count || 0,
    funding: fundingResult[0]?.count || 0,
    expenditures: expendituresResult[0]?.count || 0,
    achievements: achievementsResult[0]?.count || 0,
    reviewerAssignment: reviewerAssignmentResult[0]?.count || 0, // 新增
    total: (projectsResult[0]?.count || 0) + 
           (fundingResult[0]?.count || 0) + 
           (expendituresResult[0]?.count || 0) + 
           (achievementsResult[0]?.count || 0) +
           (reviewerAssignmentResult[0]?.count || 0) // 更新总数
  };
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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


// 提交项目评审
if (pathname.startsWith('/api/projects/') && pathname.includes('/review') && req.method === 'POST') {
  const match = pathname.match(/\/api\/projects\/(.+)\/review/);
  if (!match) return;
  
  const projectId = match[1];
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'admin') {
    sendResponse(res, 403, {
      success: false,
      error: '项目评审须由评审专家在专家工作台提交；仅管理员可使用本接口代录评审。',
    });
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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

    const ownPm = assertProjectManagerProjectOwnership(project, user);
    if (!ownPm.ok) {
      sendResponse(res, 400, { success: false, error: ownPm.error });
      return;
    }

    const preApprove = await assertProjectManagerApprovePreconditions(pool, projectId, user);
    if (!preApprove.ok) {
      sendResponse(res, 400, { success: false, error: preApprove.error });
      return;
    }
    
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
        const ownBatch = assertProjectManagerProjectOwnership(project, user);
        if (!ownBatch.ok) {
          failedProjects.push({
            project_id: project.id,
            project_title: project.title,
            error: ownBatch.error,
          });
          continue;
        }
        if (result === 'approve') {
          const preBatch = await assertProjectManagerApprovePreconditions(pool, project.id, user);
          if (!preBatch.ok) {
            failedProjects.push({
              project_id: project.id,
              project_title: project.title,
              error: preBatch.error,
            });
            continue;
          }
        }

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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
    
    // Project 表无 category 字段，忽略 query.category
    
    // 按提交时间筛选
    if (query.startDate && query.endDate) {
      whereClauses.push('(p.submit_date BETWEEN ? AND ? OR p.created_at BETWEEN ? AND ?)');
      queryParams.push(query.startDate, query.endDate, query.startDate, query.endDate);
    }
    
    // 按预算范围筛选
    if (query.minBudget) {
      whereClauses.push('p.approved_budget >= ?');
      queryParams.push(parseFloat(query.minBudget));
    }
    
    if (query.maxBudget) {
      whereClauses.push('p.approved_budget <= ?');
      queryParams.push(parseFloat(query.maxBudget));
    }
    
    // 关键词搜索
    if (query.keyword) {
      whereClauses.push('(p.title LIKE ? OR p.project_code LIKE ? OR u.name LIKE ? OR p.keywords LIKE ? OR p.abstract LIKE ?)');
      const keyword = `%${query.keyword}%`;
      queryParams.push(keyword, keyword, keyword, keyword, keyword);
    }

    // 我负责的：当前用户为项目经理（manager_id）；科研助理与管理员均适用
    if (query.scope === 'mine') {
      whereClauses.push('p.manager_id = ?');
      queryParams.push(user.id);
    } else if (query.scope === 'unassigned') {
      whereClauses.push('p.manager_id IS NULL');
      whereClauses.push('p.status = "submitted"');
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
      'updated_at': 'p.updated_at',
      'budget_total': 'p.approved_budget',
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
        NULL AS category,
        NULL AS research_field,
        p.keywords,
        p.abstract,
        p.implementation_plan AS objectives,
        p.approved_budget AS budget_total,
        NULL AS duration_months,
        p.status,
        NULL AS current_stage,
        p.submit_date,
        p.approval_date,
        p.end_date AS completion_date,
        p.created_at,
        p.updated_at,
        p.manager_id,
        mgr.name as manager_name,
        u.name as applicant_name,
        u.department,
        u.title as applicant_title,
        u.email as applicant_email,
        u.phone as applicant_phone
      FROM \`Project\` p
      LEFT JOIN \`User\` u ON p.applicant_id = u.id
      LEFT JOIN \`User\` mgr ON p.manager_id = mgr.id
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
          budget_total: app.budget_total != null ? parseFloat(app.budget_total) : null,
          duration_months: app.duration_months,
          status: app.status,
          current_stage: app.current_stage,
          manager_id: app.manager_id,
          manager_name: app.manager_name,
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
        u.phone as applicant_phone,
        mgr.name as manager_name
      FROM \`Project\` p
      LEFT JOIN \`User\` u ON p.applicant_id = u.id
      LEFT JOIN \`User\` mgr ON p.manager_id = mgr.id
      WHERE p.id = ?
    `, [applicationId]);
    
    if (applications.length === 0) {
      sendResponse(res, 404, { success: false, error: '申请不存在' });
      return;
    }
    
    const application = applications[0];
    
    // 获取预算明细（表结构见 ProjectBudget：无 justification/sequence，用 description、sort_order）
    const [budgetItems] = await pool.query(`
      SELECT 
        id,
        category,
        item_name,
        description,
        amount,
        sort_order
      FROM \`ProjectBudget\`
      WHERE project_id = ?
      ORDER BY sort_order ASC, created_at ASC
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
          manager_id: application.manager_id,
          manager_name: application.manager_name,
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
          justification: item.description,
          sequence: item.sort_order
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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

    const ownApp = assertProjectManagerProjectOwnership(application, user);
    if (!ownApp.ok) {
      sendResponse(res, 400, { success: false, error: ownApp.error });
      return;
    }

    const preApproveApp = await assertProjectManagerApprovePreconditions(pool, applicationId, user);
    if (!preApproveApp.ok) {
      sendResponse(res, 400, { success: false, error: preApproveApp.error });
      return;
    }

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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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

    const ownRet = assertProjectManagerProjectOwnership(application, user);
    if (!ownRet.ok) {
      sendResponse(res, 400, { success: false, error: ownRet.error });
      return;
    }
    
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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

    const ownRej = assertProjectManagerProjectOwnership(application, user);
    if (!ownRej.ok) {
      sendResponse(res, 400, { success: false, error: ownRej.error });
      return;
    }
    
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
        sort_order
      FROM \`ProjectBudget\`
      WHERE project_id = ?
      ORDER BY sort_order ASC, created_at ASC
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
          justification: item.description
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
        sort_order
      FROM \`ProjectBudget\`
      WHERE project_id = ?
      ORDER BY sort_order ASC, created_at ASC
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
          justification: item.description
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
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
  
  if (!user || user.role !== 'project_manager') {
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
          WHEN 'project_manager' THEN 2
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
        SUM(CASE WHEN role = 'project_manager' THEN 1 ELSE 0 END) as totalAssistants,
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
  
  if (!user || user.role !== 'project_manager') {
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
        SUM(CASE WHEN role = 'project_manager' THEN 1 ELSE 0 END) as totalAssistants,
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
  
  if (!user || user.role !== 'project_manager') {
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
  
  if (!assistant || assistant.role !== 'project_manager') {
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
  
  if (!assistant || assistant.role !== 'project_manager') {
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
  
  if (!assistant || assistant.role !== 'project_manager') {
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
  
  if (!user || user.role !== 'project_manager') {
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
          WHEN 'project_manager' THEN '科研助理'
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

// 获取申请详情（裸路径 /applications/:id；不得与 /detail、/history 等子路由冲突，否则 history 会被 (.+) 吃成 id）
if (pathname.startsWith('/api/assistant/applications/') && req.method === 'GET'
  && !pathname.endsWith('/history')
  && !pathname.includes('/detail')) {
  const match = pathname.match(/\/api\/assistant\/applications\/([^/]+)\/?$/);
  if (!match) return;
  
  const applicationId = match[1];
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  if (!user || user.role !== 'project_manager') {
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
    
    // 库表无 ProjectStage，阶段信息暂不返回（避免 ER_NO_SUCH_TABLE）
    const stages = [];
    
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
  
  if (!assistant || assistant.role !== 'project_manager') {
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
  
  if (!user || user.role !== 'project_manager') {
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
  
  if (!user || user.role !== 'project_manager') {
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
        sort_order,
        created_at
      FROM \`ProjectBudget\`
      WHERE project_id = ?
      ORDER BY sort_order ASC, created_at ASC
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
  
  if (!user || user.role !== 'project_manager') {
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
  
  if (!user || user.role !== 'project_manager') {
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
  
  if (!user || user.role !== 'project_manager') {
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
    'project_manager': '科研助理',
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
      
      const isAssistant = user.role === 'project_manager' || user.role === 'admin';
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
      
      const isAssistant = user.role === 'project_manager' || user.role === 'admin';
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
      
      const isAssistant = user.role === 'project_manager' || user.role === 'admin';
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
      
      const isAssistant = user.role === 'project_manager' || user.role === 'admin';
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

    // ==================== 评审专家分配相关API（适配新数据库） ====================

    // 辅助函数：生成UUID
    function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    // 辅助函数：获取请求体
    async function getBody(req) {
      return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          try { resolve(body ? JSON.parse(body) : {}); } catch (error) { resolve({}); }
        });
        req.on('error', reject);
      });
    }

    // 辅助函数：创建通知
    async function createNotification(userId, title, content, type, relatedId = null) {
      try {
        const notificationId = generateUUID();
        await pool.query(`
          INSERT INTO \`Notification\` (
            id, user_id, type, title, content, 
            related_id, related_type, priority,
            is_read, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'medium', FALSE, NOW())
        `, [notificationId, userId, type, title, content, relatedId, type]);
        return notificationId;
      } catch (error) {
        console.error('创建通知失败:', error);
        return null;
      }
    }

    // 辅助函数：计算专家工作量评分
    function calculateWorkloadScore(recentReviews) {
      if (recentReviews === 0) return 100;
      if (recentReviews <= 2) return 80;
      if (recentReviews <= 5) return 60;
      if (recentReviews <= 8) return 40;
      return 20;
    }

    // ==================== API 端点 ====================

    // 1. 获取需要分配评审专家的项目列表
    if (pathname === '/api/assistant/projects/need-reviewer' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
        sendResponse(res, 403, { success: false, error: '没有权限' });
        return;
      }
      
      try {
        const query = url.parse(req.url, true).query;
        const page = parseInt(query.page) || 1;
        const pageSize = parseInt(query.pageSize) || 20;
        const offset = (page - 1) * pageSize;
        
        console.log('获取需要分配评审专家的项目列表，助理ID:', user.id);
        
        // 构建查询条件：状态为已提交或评审中（适配新数据库状态）
        let whereClauses = ["p.status IN ('submitted', 'under_review', 'revision', 'batch_review')"];
        let queryParams = [];
        
        // 筛选条件
        if (query.projectCode) {
          whereClauses.push('p.project_code LIKE ?');
          queryParams.push(`%${query.projectCode}%`);
        }
        
        if (query.projectTitle) {
          whereClauses.push('p.title LIKE ?');
          queryParams.push(`%${query.projectTitle}%`);
        }
        
        if (query.applicantName) {
          whereClauses.push('u.name LIKE ?');
          queryParams.push(`%${query.applicantName}%`);
        }
        
        if (query.researchField) {
          whereClauses.push('rd.name LIKE ?');
          queryParams.push(`%${query.researchField}%`);
        }
        
        const whereClause = whereClauses.join(' AND ');
        
        // 获取总数量
        const [totalResult] = await pool.query(`
          SELECT COUNT(*) as total
          FROM \`Project\` p
          LEFT JOIN \`User\` u ON p.applicant_id = u.id
          LEFT JOIN \`ResearchDomain\` rd ON p.domain_id = rd.id
          WHERE ${whereClause}
        `, queryParams);
        
        const total = totalResult[0]?.total || 0;
        
        // 获取项目列表
        const [projects] = await pool.query(`
          SELECT 
            p.id,
            p.project_code,
            p.title,
            rd.name as research_field,
            p.status,
            p.submit_date,
            p.created_at,
            u.name as applicant_name,
            u.department as applicant_department,
            u.title as applicant_title,
            (
              SELECT COUNT(*)
              FROM \`ProjectReview\` pr
              WHERE pr.project_id = p.id
            ) as reviewer_count,
            (
              SELECT GROUP_CONCAT(
                DISTINCT CONCAT(ru.name, '|', ru.id, '|', pr.status, '|', IFNULL(pr.submitted_at, ''))
                SEPARATOR ';'
              )
              FROM \`ProjectReview\` pr
              LEFT JOIN \`User\` ru ON pr.expert_id = ru.id
              WHERE pr.project_id = p.id
            ) as assigned_reviewers
          FROM \`Project\` p
          LEFT JOIN \`User\` u ON p.applicant_id = u.id
          LEFT JOIN \`ResearchDomain\` rd ON p.domain_id = rd.id
          WHERE ${whereClause}
          ORDER BY 
            CASE p.status 
              WHEN 'submitted' THEN 1
              WHEN 'under_review' THEN 2
              WHEN 'revision' THEN 3
              WHEN 'batch_review' THEN 4
              ELSE 5
            END,
            p.submit_date DESC
          LIMIT ? OFFSET ?
        `, [...queryParams, pageSize, offset]);
        
        // 格式化数据
        const formattedProjects = projects.map(project => {
          const reviewers = [];
          if (project.assigned_reviewers) {
            project.assigned_reviewers.split(';').forEach(reviewerStr => {
              if (reviewerStr) {
                const [name, id, status, submittedAt] = reviewerStr.split('|');
                reviewers.push({
                  id,
                  name,
                  status,
                  submitted_at: submittedAt || null
                });
              }
            });
          }
          
          return {
            id: project.id,
            project_code: project.project_code,
            title: project.title,
            research_field: project.research_field || '未指定',
            status: project.status,
            submit_date: project.submit_date ? new Date(project.submit_date).toISOString().split('T')[0] : null,
            created_at: project.created_at ? project.created_at.toISOString() : null,
            applicant_name: project.applicant_name || '未知',
            applicant_department: project.applicant_department || '',
            applicant_title: project.applicant_title || '',
            reviewers,
            reviewer_count: project.reviewer_count || 0
          };
        });
        
        // 获取统计信息
        const [statsResult] = await pool.query(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN p.status = 'submitted' THEN 1 ELSE 0 END) as submitted,
            SUM(CASE WHEN p.status = 'under_review' THEN 1 ELSE 0 END) as under_review
          FROM \`Project\` p
          WHERE p.status IN ('submitted', 'under_review', 'revision', 'batch_review')
        `);
        
        const stats = {
          total: statsResult[0]?.total || 0,
          submitted: statsResult[0]?.submitted || 0,
          under_review: statsResult[0]?.under_review || 0
        };
        
        sendResponse(res, 200, {
          success: true,
          data: {
            projects: formattedProjects,
            pagination: { current: page, pageSize, total },
            stats
          }
        });
        
      } catch (error) {
        console.error('获取项目列表失败:', error);
        sendResponse(res, 500, { success: false, error: '获取项目列表失败' });
      }
      return;
    }

    // 2. 获取可用的评审专家列表
    if (pathname === '/api/assistant/reviewers/available' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
        sendResponse(res, 403, { success: false, error: '没有权限' });
        return;
      }
      
      try {
        const query = url.parse(req.url, true).query;
        const projectId = query.projectId;
        const keyword = query.keyword || '';
        
        console.log('获取可用评审专家列表，助理ID:', user.id, '项目ID:', projectId);
        
        // 获取当前项目已分配的评审专家ID
        let assignedReviewerIds = [];
        if (projectId) {
          const [assigned] = await pool.query(`
            SELECT expert_id 
            FROM \`ProjectReview\` 
            WHERE project_id = ?
          `, [projectId]);
          assignedReviewerIds = assigned.map(item => item.expert_id);
        }
        
        // 查询评审专家
        const [reviewers] = await pool.query(`
          SELECT 
            u.id,
            u.name,
            u.email,
            u.department,
            u.title,
            u.phone,
            u.status,
            u.created_at,
            ep.organization,
            ep.expertise_description,
            ep.is_external,
            (
              SELECT COUNT(*) 
              FROM \`ProjectReview\` pr 
              WHERE pr.expert_id = u.id 
                AND pr.status = 'submitted'
            ) as completed_reviews,
            (
              SELECT COUNT(*) 
              FROM \`ProjectReview\` pr 
              WHERE pr.expert_id = u.id 
                AND pr.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ) as recent_reviews
          FROM \`User\` u
          LEFT JOIN \`ExpertProfile\` ep ON u.id = ep.id
          WHERE u.role = 'reviewer'
            AND u.status = 'active'
            AND (u.name LIKE ? OR u.department LIKE ? OR u.title LIKE ?)
          ORDER BY 
            (u.name LIKE ?) DESC,
            completed_reviews ASC,
            u.name ASC
        `, [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`]);
        
        // 获取专家的研究领域
        const reviewerIds = reviewers.map(r => r.id);
        let expertDomains = {};
        if (reviewerIds.length > 0) {
          const [domains] = await pool.query(`
            SELECT 
              ed.expert_id,
              rd.name as research_field
            FROM \`ExpertDomain\` ed
            LEFT JOIN \`ResearchDomain\` rd ON ed.domain_id = rd.id
            WHERE ed.expert_id IN (?)
          `, [reviewerIds]);
          
          domains.forEach(d => {
            if (!expertDomains[d.expert_id]) expertDomains[d.expert_id] = [];
            expertDomains[d.expert_id].push(d.research_field);
          });
        }
        
        // 格式化专家数据
        const formattedReviewers = reviewers.map(reviewer => ({
          id: reviewer.id,
          name: reviewer.name,
          email: reviewer.email,
          department: reviewer.department,
          title: reviewer.title,
          phone: reviewer.phone,
          research_field: expertDomains[reviewer.id] ? expertDomains[reviewer.id].join(', ') : '未指定',
          organization: reviewer.organization,
          expertise_description: reviewer.expertise_description,
          is_external: reviewer.is_external === 1,
          status: reviewer.status,
          completed_reviews: reviewer.completed_reviews || 0,
          recent_reviews: reviewer.recent_reviews || 0,
          created_at: reviewer.created_at ? reviewer.created_at.toISOString() : null,
          is_assigned: assignedReviewerIds.includes(reviewer.id),
          workload_score: calculateWorkloadScore(reviewer.recent_reviews || 0)
        }));
        
        sendResponse(res, 200, {
          success: true,
          data: {
            reviewers: formattedReviewers,
            total: formattedReviewers.length
          }
        });
        
      } catch (error) {
        console.error('获取评审专家列表失败:', error);
        sendResponse(res, 500, { success: false, error: '获取评审专家列表失败' });
      }
      return;
    }

    // 3. 项目经理领取已提交项目（绑定 manager_id，后续由该经理负责）
    if (pathname === '/api/assistant/projects/claim' && req.method === 'POST') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);

      if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
        sendResponse(res, 403, { success: false, error: '没有权限' });
        return;
      }

      try {
        const body = await getBody(req);
        const { projectId, managerId } = body;

        if (!projectId) {
          sendResponse(res, 400, { success: false, error: '请提供项目ID' });
          return;
        }

        const [projects] = await pool.query('SELECT * FROM `Project` WHERE id = ?', [projectId]);
        if (projects.length === 0) {
          sendResponse(res, 404, { success: false, error: '项目不存在' });
          return;
        }

        const project = projects[0];

        if (project.status !== 'submitted') {
          sendResponse(res, 400, {
            success: false,
            error: '仅「已提交」且尚未进入后续流程的申请可以领取',
          });
          return;
        }

        if (user.role === 'admin') {
          if (!managerId) {
            sendResponse(res, 400, {
              success: false,
              error: '管理员指派时请提供 managerId（项目经理用户 ID）',
            });
            return;
          }
          const [mgr] = await pool.query(
            'SELECT id FROM `User` WHERE id = ? AND role = ?',
            [managerId, 'project_manager']
          );
          if (!mgr.length) {
            sendResponse(res, 400, { success: false, error: '指定的项目经理无效' });
            return;
          }
          await pool.query(
            'UPDATE `Project` SET manager_id = ?, updated_at = NOW() WHERE id = ?',
            [managerId, projectId]
          );
          await pool.query(
            `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, new_values, created_at)
             VALUES (?, 'project_claim', 'Project', ?, ?, NOW())`,
            [user.id, projectId, JSON.stringify({ manager_id: managerId, byAdmin: true })]
          );
          sendResponse(res, 200, {
            success: true,
            message: '已指定项目经理负责人',
            data: { projectId, manager_id: managerId },
          });
          return;
        }

        if (project.manager_id && String(project.manager_id) !== String(user.id)) {
          sendResponse(res, 409, {
            success: false,
            error: '该项目已由其他项目经理领取，您无法再领取',
          });
          return;
        }

        if (project.manager_id && String(project.manager_id) === String(user.id)) {
          sendResponse(res, 200, {
            success: true,
            message: '您已是该项目的项目经理负责人',
            data: { projectId, manager_id: user.id },
          });
          return;
        }

        await pool.query(
          'UPDATE `Project` SET manager_id = ?, updated_at = NOW() WHERE id = ?',
          [user.id, projectId]
        );
        await pool.query(
          `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, new_values, created_at)
           VALUES (?, 'project_claim', 'Project', ?, ?, NOW())`,
          [user.id, projectId, JSON.stringify({ manager_id: user.id })]
        );

        sendResponse(res, 200, {
          success: true,
          message: '领取成功，您将负责该项目的后续分配评审专家与跟进',
          data: { projectId, manager_id: user.id },
        });
      } catch (error) {
        console.error('领取项目失败:', error);
        sendResponse(res, 500, { success: false, error: '领取项目失败', message: error.message });
      }
      return;
    }

    // 4. 为项目分配评审专家（原 3）
    // 为项目分配评审专家
    if (pathname === '/api/assistant/projects/assign-reviewer' && req.method === 'POST') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
        sendResponse(res, 403, { success: false, error: '没有权限' });
        return;
      }
      
      try {
        const body = await getBody(req);
        const { projectId, reviewerIds } = body;
        
        if (!projectId || !reviewerIds || !Array.isArray(reviewerIds) || reviewerIds.length === 0) {
          sendResponse(res, 400, { success: false, error: '请提供项目ID和评审专家ID列表' });
          return;
        }
        
        console.log('分配评审专家，项目ID:', projectId, '专家IDs:', reviewerIds);
        
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

        const ownAssign = assertProjectManagerProjectOwnership(project, user);
        if (!ownAssign.ok) {
          sendResponse(res, 400, { success: false, error: ownAssign.error });
          return;
        }
        
        // 检查专家是否存在
        const [reviewers] = await pool.query(`
          SELECT id, name FROM \`User\` 
          WHERE id IN (?) AND role = 'reviewer' AND status = 'active'
        `, [reviewerIds]);
        
        if (reviewers.length !== reviewerIds.length) {
          sendResponse(res, 400, { 
            success: false, 
            error: '部分评审专家不存在或不是有效专家' 
          });
          return;
        }
        
        const assignmentResults = [];
        
        // 为每个评审专家创建记录（库表仅有 ExpertAssignment，无 ProjectReview）
        for (const reviewer of reviewers) {
          const [existing] = await pool.query(
            `SELECT id FROM \`ExpertAssignment\` WHERE project_id = ? AND expert_id = ?`,
            [projectId, reviewer.id],
          );

          if (existing.length === 0) {
            const assignmentId = generateUUID();

            await pool.query(
              `INSERT INTO \`ExpertAssignment\` (
                id, project_id, expert_id, assigned_by, assigned_at, status, created_at
              ) VALUES (?, ?, ?, ?, NOW(), 'reviewing', NOW())`,
              [assignmentId, projectId, reviewer.id, user.id],
            );

            assignmentResults.push({
              reviewerId: reviewer.id,
              assigned: true,
              assignmentId,
            });
            
            // 创建通知
            await createNotification(
              reviewer.id,
              '新评审任务分配',
              `您已被分配评审项目："${project.title}"，请及时处理。`,
              'review',
              projectId
            );
          } else {
            assignmentResults.push({ reviewerId: reviewer.id, assigned: false, message: '已分配' });
          }
        }
        
        // 更新项目状态
        if (project.status === 'submitted') {
          await pool.query(
            'UPDATE `Project` SET status = "under_review" WHERE id = ?',
            [projectId]
          );
        }
        
        // 为申请人创建通知
        await createNotification(
          project.applicant_id,
          '项目进入评审阶段',
          `您的项目"${project.title}"已分配评审专家，正在评审中。`,
          'project',
          projectId
        );
        
        // 记录操作日志
        await pool.query(
          `INSERT INTO \`AuditLog\` (user_id, action, table_name, record_id, new_values, created_at)
          VALUES (?, 'assign_reviewer', 'Project', ?, ?, NOW())`,
          [user.id, projectId, JSON.stringify({ projectId, reviewerIds, assignedBy: user.id })]
        );
        
        sendResponse(res, 200, {
          success: true,
          message: '评审专家分配成功',
          data: {
            projectId,
            assignmentResults,
            assignedCount: assignmentResults.filter(r => r.assigned).length
          }
        });
        
      } catch (error) {
        console.error('分配评审专家失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '分配评审专家失败',
          message: error.message
        });
      }
      return;
    }

    // 4. 移除已分配的评审专家
    // 移除已分配的评审专家
    if (pathname === '/api/assistant/projects/remove-reviewer' && req.method === 'DELETE') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
        sendResponse(res, 403, { success: false, error: '没有权限' });
        return;
      }
      
      try {
        const body = await getBody(req);
        const { projectId, reviewerId } = body;
        
        if (!projectId || !reviewerId) {
          sendResponse(res, 400, { success: false, error: '请提供项目ID和评审专家ID' });
          return;
        }
        
        console.log('移除评审专家，项目ID:', projectId, '专家ID:', reviewerId);

        const [projForRemove] = await pool.query(
          'SELECT id, manager_id FROM `Project` WHERE id = ?',
          [projectId]
        );
        if (projForRemove.length === 0) {
          sendResponse(res, 404, { success: false, error: '项目不存在' });
          return;
        }
        const ownRemove = assertProjectManagerProjectOwnership(projForRemove[0], user);
        if (!ownRemove.ok) {
          sendResponse(res, 400, { success: false, error: ownRemove.error });
          return;
        }
        
        const [assignRows] = await pool.query(
          `SELECT ea.*, p.title AS project_title, u.name AS reviewer_name
           FROM \`ExpertAssignment\` ea
           LEFT JOIN \`Project\` p ON ea.project_id = p.id
           LEFT JOIN \`User\` u ON ea.expert_id = u.id
           WHERE ea.project_id = ? AND ea.expert_id = ?`,
          [projectId, reviewerId],
        );

        if (assignRows.length === 0) {
          sendResponse(res, 404, { success: false, error: '评审分配记录不存在' });
          return;
        }

        const row = assignRows[0];

        await pool.query('DELETE FROM `ExpertAssignment` WHERE id = ?', [row.id]);

        await createNotification(
          reviewerId,
          '评审任务取消',
          `您对项目"${row.project_title}"的评审任务已被取消。`,
          'review',
          projectId,
        );
        
        sendResponse(res, 200, {
          success: true,
          message: '评审专家移除成功'
        });
        
      } catch (error) {
        console.error('移除评审专家失败:', error);
        sendResponse(res, 500, { success: false, error: '移除评审专家失败' });
      }
      return;
    }

    // 5. 获取项目评审分配详情
    if (pathname.startsWith('/api/projects/') && pathname.endsWith('/assignments') && req.method === 'GET') {
      const match = pathname.match(/\/api\/projects\/(.+)\/assignments/);
      if (match) {
        const projectId = match[1];
        const token = req.headers.authorization;
        const user = await verifyToken(token);
        
        if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
          sendResponse(res, 403, { success: false, error: '没有权限' });
          return;
        }
        
        try {
          console.log('获取项目评审分配详情，项目ID:', projectId);

          const [projAssignRows] = await pool.query(
            'SELECT id, manager_id FROM `Project` WHERE id = ?',
            [projectId]
          );
          if (projAssignRows.length === 0) {
            sendResponse(res, 404, { success: false, error: '项目不存在' });
            return;
          }
          const ownAsg = assertProjectManagerProjectOwnership(projAssignRows[0], user);
          if (!ownAsg.ok) {
            sendResponse(res, 400, { success: false, error: ownAsg.error });
            return;
          }
          
          const [assignedReviewers] = await pool.query(
            `
            SELECT 
              ea.id AS review_id,
              ea.expert_id AS id,
              u.name,
              u.email,
              u.department,
              u.title,
              ep.expertise_description AS research_field,
              ea.status,
              NULL AS submitted_at,
              ea.assigned_at,
              ea.created_at
            FROM \`ExpertAssignment\` ea
            LEFT JOIN \`User\` u ON ea.expert_id = u.id
            LEFT JOIN \`ExpertProfile\` ep ON ep.id = ea.expert_id
            WHERE ea.project_id = ?
            ORDER BY ea.created_at DESC
          `,
            [projectId],
          );
          
          sendResponse(res, 200, {
            success: true,
            data: assignedReviewers
          });
          
        } catch (error) {
          console.error('获取项目评审分配详情失败:', error);
          sendResponse(res, 500, { success: false, error: '获取分配详情失败' });
        }
        return;
      }
    }

    // 6. 获取待分配评审专家的项目统计
    if (pathname === '/api/assistant/stats/reviewer-assignment' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user || (user.role !== 'project_manager' && user.role !== 'admin')) {
        sendResponse(res, 403, { success: false, error: '没有权限' });
        return;
      }
      
      try {
        console.log('获取待分配专家项目统计，助理ID:', user.id);
        
        const [statsResult] = await pool.query(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
            SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as under_review
          FROM \`Project\`
          WHERE status IN ('submitted', 'under_review', 'revision', 'batch_review')
        `);
        
        const stats = {
          total: statsResult[0]?.total || 0,
          submitted: statsResult[0]?.submitted || 0,
          under_review: statsResult[0]?.under_review || 0
        };
        
        sendResponse(res, 200, {
          success: true,
          data: stats
        });
        
      } catch (error) {
        console.error('获取待分配专家项目统计失败:', error);
        sendResponse(res, 500, { success: false, error: '获取统计失败' });
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
          'ASSISTANT': 'project_manager',
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
    // 获取项目列表
if (pathname === '/api/projects' && req.method === 'GET') {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const applicantId = url.searchParams.get('applicant_id');
  const projectId = url.searchParams.get('id');
  const status = url.searchParams.get('status');
  
  // 如果有 applicant_id 参数，直接使用（不验证Token，方便调试）
  if (applicantId) {
    try {
      let query = `
        SELECT 
          p.id,
          p.project_code,
          p.title,
          p.tech_maturity,
          p.achievement_transform,
          p.poc_stage_requirement,
          p.implementation_plan,
          p.keywords,
          p.abstract,
          p.detailed_introduction_part1,
          p.detailed_introduction_part2,
          p.detailed_introduction_part3,
          p.status,
          p.approved_budget,
          p.submit_date,
          p.approval_date,
          p.start_date,
          p.end_date,
          p.created_at,
          p.updated_at,
          u.name as applicant_name
        FROM \`Project\` p
        LEFT JOIN \`User\` u ON p.applicant_id = u.id
        WHERE p.applicant_id = ?
      `;
      const params = [applicantId];
      
      if (status && status !== 'all') {
        query += ' AND p.status = ?';
        params.push(status);
      }
      
      query += ' ORDER BY p.created_at DESC';
      
      const [projects] = await pool.query(query, params);
      
      // 获取每个项目的研究领域
      for (const project of projects) {
        const [domains] = await pool.query(`
          SELECT rd.id, rd.name, rd.code
          FROM \`ProjectResearchDomain\` prd
          JOIN \`ResearchDomain\` rd ON prd.research_domain_id = rd.id
          WHERE prd.project_id = ?
        `, [project.id]);
        project.research_domains = domains;
      }
      
      sendResponse(res, 200, {
        success: true,
        data: projects,
        total: projects.length
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
  
  // 否则需要验证Token
  const authHeader = req.headers.authorization;
  let token = authHeader;
  if (token && token.startsWith('Bearer ')) {
    token = token.substring(7);
  }
  
  const user = await verifyToken(token);
  if (!user) {
    sendResponse(res, 401, {
      success: false,
      error: '认证失败'
    });
    return;
  }
  
  try {
    let query = `
      SELECT 
        p.id,
        p.project_code,
        p.title,
        p.tech_maturity,
        p.achievement_transform,
        p.poc_stage_requirement,
        p.implementation_plan,
        p.keywords,
        p.abstract,
        p.status,
        p.approved_budget,
        p.submit_date,
        p.approval_date,
        p.start_date,
        p.end_date,
        p.created_at,
        u.name as applicant_name
      FROM \`Project\` p
      LEFT JOIN \`User\` u ON p.applicant_id = u.id
      WHERE p.applicant_id = ?
    `;
    const params = [user.userId];
    
    if (status && status !== 'all') {
      query += ' AND p.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY p.created_at DESC';
    
    const [projects] = await pool.query(query, params);
    
    sendResponse(res, 200, {
      success: true,
      data: projects,
      total: projects.length
    });
  } catch (error) {
    console.error('获取项目列表失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取项目列表失败'
    });
  }
  return;
}

    // 辅助函数：计算项目周期（月）
    function calculateDurationMonths(startDate, endDate) {
      if (!startDate || !endDate) return 0;
      const start = new Date(startDate);
      const end = new Date(endDate);
      return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    }
    
    // ==================== 获取研究领域列表API ====================
    // 获取研究领域列表（无需认证）
if (pathname === '/api/research-domains' && req.method === 'GET') {
  try {
    const [domains] = await pool.query(`
      SELECT 
        id,
        name,
        code,
        sort_order
      FROM \`ResearchDomain\`
      WHERE enabled = TRUE
      ORDER BY sort_order ASC, name ASC
    `);
    
    sendResponse(res, 200, {
      success: true,
      data: domains
    });
    
  } catch (error) {
    console.error('获取研究领域失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '获取研究领域失败',
      message: error.message
    });
  }
  return;
}
    // ==================== 更新项目API ====================
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
        
        // 检查权限
        const isOwner = project.applicant_id === user.id;
        const isAdmin = checkPermission(user.role, 'admin');
        
        if (!isOwner && !isAdmin) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限更新此项目'
          });
          return;
        }
        
        const body = await parseRequestBody(req);
        
        // 构建更新字段（适配新数据库字段）
        const updateFields = [];
        const updateValues = [];
        
        // 允许更新的字段
        const allowedFields = [
          'title', 'domain_id', 'keywords', 'abstract', 'background',
          'objectives', 'methodology', 'expected_outcomes', 'budget_total',
          'duration_months', 'start_date', 'end_date', 'status', 'remarks',
          'project_domain_other_text',
        ];
        
        allowedFields.forEach(field => {
          if (body[field] !== undefined) {
            updateFields.push(`${field} = ?`);
            updateValues.push(body[field]);
          }
        });
        
        // 如果有提交操作，添加提交日期
        if (body.status === 'submitted' && project.status === 'draft') {
          updateFields.push('submit_date = ?');
          updateValues.push(new Date().toISOString().split('T')[0]);
        }
        
        // 如果有批准操作，添加批准日期
        if (body.status === 'approved' && project.status !== 'approved') {
          updateFields.push('approval_date = ?');
          updateValues.push(new Date().toISOString().split('T')[0]);
        }
        
        if (updateFields.length === 0) {
          sendResponse(res, 400, {
            success: false,
            error: '没有提供更新数据'
          });
          return;
        }
        
        updateValues.push(projectId);
        
        const updateSql = `UPDATE \`Project\` SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`;
        
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
          message: error.message
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
        if (!checkPermission(user.role, ['admin', 'project_manager'])) {
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
    // ==================== 删除项目API ====================
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
        
        // 检查权限：只有项目申请人、管理员可以删除
        const isOwner = project.applicant_id === user.id;
        const isAdmin = checkPermission(user.role, 'admin');
        
        if (!isOwner && !isAdmin) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限删除此项目'
          });
          return;
        }
        
        // 检查项目状态：只有草稿状态可以删除
        if (project.status !== 'draft') {
          sendResponse(res, 409, {
            success: false,
            error: '只能删除草稿状态的项目',
            currentStatus: project.status
          });
          return;
        }
        
        console.log('✅ 验证通过，开始删除项目...');
        
        // 删除项目成员（ProjectMember表）
        await pool.query('DELETE FROM `ProjectMember` WHERE project_id = ?', [projectId]);
        
        // 删除项目预算（ProjectBudget表）
        await pool.query('DELETE FROM `ProjectBudget` WHERE project_id = ?', [projectId]);
        
        // 删除项目成果（ProjectAchievement表）
        await pool.query('DELETE FROM `ProjectAchievement` WHERE project_id = ?', [projectId]);
        
        // 删除项目附件（ProjectAttachment表）
        await pool.query('DELETE FROM `ProjectAttachment` WHERE project_id = ?', [projectId]);
        
        // 删除项目（Project表）
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
          message: error.message
        });
      }
      return;
    }
    // ==================== 项目进度API（必须放在项目详情API之前） ====================
    
    // 1. 获取项目进度总览（放在项目详情API前面）
    // ==================== 项目进度API ====================

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
        const [projects] = await pool.query(`
          SELECT 
            p.id,
            p.project_code,
            p.title,
            p.domain_id,
            p.keywords,
            p.abstract,
            p.background,
            p.objectives,
            p.methodology,
            p.expected_outcomes,
            p.budget_total,
            p.approved_budget,
            p.duration_months,
            p.status,
            p.start_date,
            p.end_date,
            p.submit_date,
            p.approval_date,
            p.support_level,
            p.remarks,
            p.created_at,
            p.updated_at,
            p.applicant_id,
            p.manager_id,
            u.name as applicant_name,
            m.name as manager_name
          FROM \`Project\` p
          LEFT JOIN \`User\` u ON p.applicant_id = u.id
          LEFT JOIN \`User\` m ON p.manager_id = m.id
          WHERE p.id = ?
        `, [projectId]);
        
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
        const isManager = project.manager_id === user.id;
        const hasAdminAccess = checkPermission(user.role, ['admin', 'project_manager']);
        
        console.log('   是否是项目所有者:', isOwner);
        console.log('   是否是项目经理:', isManager);
        console.log('   是否有管理员权限:', hasAdminAccess);
        
        if (!isOwner && !isManager && !hasAdminAccess) {
          console.error('❌ 权限不足');
          sendResponse(res, 403, {
            success: false,
            error: '没有权限查看此项目',
            details: {
              userId: user.id,
              applicantId: project.applicant_id,
              managerId: project.manager_id,
              userRole: user.role
            }
          });
          return;
        }
        
        console.log('✅ 权限检查通过');
        
        // 3. 获取项目预算明细
        const [budgets] = await pool.query(`
          SELECT 
            id,
            category,
            item_name,
            description,
            amount,
            sort_order,
            created_at
          FROM \`ProjectBudget\`
          WHERE project_id = ?
          ORDER BY sort_order ASC, created_at ASC
        `, [projectId]);
        
        // 4. 获取项目成果
        const [achievements] = await pool.query(`
          SELECT 
            id,
            type,
            title,
            description,
            achievement_date,
            authors,
            external_link,
            status,
            verified_by,
            verified_date,
            verification_comment,
            created_at
          FROM \`ProjectAchievement\`
          WHERE project_id = ?
          ORDER BY achievement_date DESC, created_at DESC
        `, [projectId]);
        
        // 5. 获取项目预算总额
        const [budgetResult] = await pool.query(
          'SELECT COALESCE(SUM(amount), 0) as total_budget FROM `ProjectBudget` WHERE project_id = ?',
          [projectId]
        );
        const totalBudget = budgetResult[0]?.total_budget || 0;
        
        // 6. 获取已批准的预算总额（已立项的项目使用批准预算）
        const approvedBudget = project.approved_budget || totalBudget;
        const usedAmount = 0; // 支出记录暂时没有，设为0
        const balance = approvedBudget - usedAmount;
        
        // 7. 获取项目通知提醒（关联该项目的通知）
        const [notifications] = await pool.query(`
          SELECT 
            id,
            type,
            title,
            content as description,
            priority,
            is_read,
            created_at
          FROM \`Notification\`
          WHERE user_id = ? 
            AND related_id = ? 
            AND related_type = 'project'
          ORDER BY created_at DESC 
          LIMIT 10
        `, [user.id, projectId]);
        
        // 8. 获取专家评审记录（如果有）
        const [reviews] = await pool.query(`
          SELECT 
            pr.id,
            pr.recommendation,
            pr.innovation_score,
            pr.feasibility_score,
            pr.significance_score,
            pr.team_score,
            pr.budget_score,
            pr.total_score,
            pr.comments,
            pr.suggestions,
            pr.submitted_at,
            u.name as expert_name
          FROM \`ProjectReview\` pr
          LEFT JOIN \`User\` u ON pr.expert_id = u.id
          WHERE pr.project_id = ?
            AND pr.status = 'submitted'
          ORDER BY pr.submitted_at DESC
        `, [projectId]);
        
        // 9. 获取批审批次决策（如果有）
        const [batchDecisions] = await pool.query(`
          SELECT 
            bd.decision,
            bd.support_type,
            bd.approved_budget,
            bd.support_details,
            bd.conditions,
            bd.decision_comment,
            bd.decided_at,
            rb.batch_name
          FROM \`BatchReviewDecision\` bd
          LEFT JOIN \`ReviewBatch\` rb ON bd.batch_id = rb.id
          WHERE bd.project_id = ?
          ORDER BY bd.decided_at DESC
          LIMIT 1
        `, [projectId]);
        
        // 10. 获取孵化记录（如果有）
        const [incubation] = await pool.query(`
          SELECT 
            ir.id,
            ir.start_date,
            ir.planned_end_date,
            ir.actual_end_date,
            ir.status as incubation_status,
            ir.created_at,
            ir.updated_at
          FROM \`IncubationRecord\` ir
          WHERE ir.project_id = ?
          ORDER BY ir.created_at DESC
          LIMIT 1
        `, [projectId]);
        
        // 11. 构建项目阶段时间线（根据项目状态动态生成）
        const stages = buildProgressStages(project, incubation[0], batchDecisions[0]);
        
        // 构建响应数据
        const responseData = {
          success: true,
          data: {
            project: project,
            stages: stages,
            budgets: budgets.map(budget => ({
              id: budget.id,
              category: budget.category,
              item_name: budget.item_name,
              description: budget.description,
              amount: budget.amount,
              calculation_method: null,
              justification: budget.description
            })),
            achievements: achievements.map(ach => ({
              id: ach.id,
              type: ach.type,
              title: ach.title,
              description: ach.description,
              achievement_date: ach.achievement_date,
              authors: ach.authors,
              external_link: ach.external_link,
              status: ach.status,
              verified_by: ach.verified_by,
              verified_date: ach.verified_date,
              verification_comment: ach.verification_comment,
              created_at: ach.created_at
            })),
            notifications: notifications.map(notif => ({
              id: notif.id,
              type: notif.type,
              title: notif.title,
              content: notif.description,
              priority: notif.priority,
              is_read: notif.is_read,
              created_at: notif.created_at
            })),
            reviews: reviews.map(review => ({
              id: review.id,
              recommendation: review.recommendation,
              scores: {
                innovation: review.innovation_score,
                feasibility: review.feasibility_score,
                significance: review.significance_score,
                team: review.team_score,
                budget: review.budget_score
              },
              total_score: review.total_score,
              comments: review.comments,
              suggestions: review.suggestions,
              submitted_at: review.submitted_at,
              expert_name: review.expert_name
            })),
            batch_decision: batchDecisions[0] ? {
              decision: batchDecisions[0].decision,
              support_type: batchDecisions[0].support_type,
              approved_budget: batchDecisions[0].approved_budget,
              support_details: batchDecisions[0].support_details,
              conditions: batchDecisions[0].conditions,
              decision_comment: batchDecisions[0].decision_comment,
              decided_at: batchDecisions[0].decided_at,
              batch_name: batchDecisions[0].batch_name
            } : null,
            incubation: incubation[0] ? {
              start_date: incubation[0].start_date,
              planned_end_date: incubation[0].planned_end_date,
              actual_end_date: incubation[0].actual_end_date,
              status: incubation[0].incubation_status,
              created_at: incubation[0].created_at,
              updated_at: incubation[0].updated_at
            } : null,
            budget_summary: {
              total: totalBudget,
              approved: approvedBudget,
              used: usedAmount,
              balance: balance
            }
          }
        };
        
        console.log(`✅ 获取项目进度成功，数据量:`, {
          预算明细: budgets.length,
          成果数: achievements.length,
          通知数: notifications.length,
          评审数: reviews.length
        });
        
        sendResponse(res, 200, responseData);
        
      } catch (error) {
        console.error('进度API错误:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取项目进度失败',
          message: error.message,
          stack: error.stack
        });
      }
      return;
    }

    // ==================== 辅助函数：构建项目阶段时间线 ====================

    function buildProgressStages(project, incubation, batchDecision) {
      const stages = [];
      const status = project.status;
      
      // 阶段1：项目创建
      stages.push({
        stage_number: 1,
        stage_name: '项目创建',
        description: '项目基本信息填写完成',
        status: 'completed',
        estimatedTime: '1-2个工作日',
        actualTime: project.created_at ? formatDate(project.created_at) : null,
        completed: true,
        current: false,
        pending: false
      });
      
      // 阶段2：项目提交
      stages.push({
        stage_number: 2,
        stage_name: '项目申报',
        description: '提交项目申请材料',
        status: project.submit_date ? 'completed' : (status === 'draft' ? 'not_started' : 'in_progress'),
        estimatedTime: '1-3个工作日',
        actualTime: project.submit_date ? formatDate(project.submit_date) : null,
        completed: !!project.submit_date,
        current: status === 'submitted' && !project.submit_date,
        pending: status === 'draft'
      });
      
      // 阶段3：专家评审
      const reviewStatus = getReviewStatus(status);
      stages.push({
        stage_number: 3,
        stage_name: '专家评审',
        description: '专家对项目进行评审',
        status: reviewStatus,
        estimatedTime: '5-7个工作日',
        actualTime: null,
        completed: ['revision', 'batch_review', 'approved', 'incubating', 'completed', 'rejected'].includes(status),
        current: status === 'under_review',
        pending: ['draft', 'submitted'].includes(status)
      });
      
      // 阶段4：修改完善
      if (status === 'revision' || ['batch_review', 'approved', 'incubating', 'completed'].includes(status)) {
        stages.push({
          stage_number: 4,
          stage_name: '修改完善',
          description: '根据评审意见修改项目',
          status: status === 'revision' ? 'in_progress' : 'completed',
          estimatedTime: '3-5个工作日',
          actualTime: null,
          completed: status !== 'revision',
          current: status === 'revision',
          pending: false
        });
      }
      
      // 阶段5：集中评审
      if (status === 'batch_review' || ['approved', 'incubating', 'completed'].includes(status)) {
        stages.push({
          stage_number: 5,
          stage_name: '集中评审',
          description: batchDecision ? `评审批次：${batchDecision.batch_name || '集中评审'}` : '项目进入集中评审环节',
          status: status === 'batch_review' ? 'in_progress' : 'completed',
          estimatedTime: '3-5个工作日',
          actualTime: batchDecision?.decided_at ? formatDate(batchDecision.decided_at) : null,
          completed: status !== 'batch_review',
          current: status === 'batch_review',
          pending: false,
          result: batchDecision?.decision,
          comments: batchDecision?.decision_comment,
          score: batchDecision?.approved_budget ? calculateScore(batchDecision.approved_budget, project.budget_total) : null
        });
      }
      
      // 阶段6：项目立项
      if (status === 'approved' || ['incubating', 'completed'].includes(status)) {
        stages.push({
          stage_number: 6,
          stage_name: '项目立项',
          description: '项目正式批准立项',
          status: 'completed',
          estimatedTime: '1-2个工作日',
          actualTime: project.approval_date ? formatDate(project.approval_date) : null,
          completed: true,
          current: false,
          pending: false
        });
      }
      
      // 阶段7：项目孵化
      if (status === 'incubating' || status === 'completed') {
        stages.push({
          stage_number: 7,
          stage_name: '项目孵化',
          description: incubation ? `孵化期：${formatDate(incubation.start_date)} 至 ${formatDate(incubation.planned_end_date) || '待定'}` : '项目进入孵化阶段',
          status: status === 'incubating' ? 'in_progress' : 'completed',
          estimatedTime: project.end_date ? `至 ${formatDate(project.end_date)}` : '待定',
          actualTime: incubation?.actual_end_date ? formatDate(incubation.actual_end_date) : null,
          completed: status === 'completed',
          current: status === 'incubating',
          pending: false
        });
      }
      
      // 阶段8：项目完成
      if (status === 'completed') {
        stages.push({
          stage_number: 8,
          stage_name: '项目完成',
          description: '项目已完成所有研究工作',
          status: 'completed',
          estimatedTime: '项目结束',
          actualTime: project.end_date ? formatDate(project.end_date) : null,
          completed: true,
          current: false,
          pending: false
        });
      }
      
      // 如果项目被拒绝或终止
      if (status === 'rejected' || status === 'terminated') {
        stages.push({
          stage_number: 9,
          stage_name: status === 'rejected' ? '项目未通过' : '项目已终止',
          description: status === 'rejected' ? '项目未通过评审，不予立项' : '项目孵化期间终止支持',
          status: 'rejected',
          estimatedTime: '--',
          actualTime: null,
          completed: true,
          current: false,
          pending: false
        });
      }
      
      return stages;
    }

    // 获取评审阶段状态文本
    function getReviewStatus(status) {
      switch(status) {
        case 'under_review': return 'in_progress';
        case 'revision': return 'completed';
        case 'batch_review': return 'completed';
        case 'approved': return 'completed';
        case 'incubating': return 'completed';
        case 'completed': return 'completed';
        case 'rejected': return 'rejected';
        default: return 'not_started';
      }
    }

    // 计算评分（用于集中评审）
    function calculateScore(approvedBudget, requestedBudget) {
      if (!requestedBudget || requestedBudget === 0) return null;
      const ratio = approvedBudget / requestedBudget;
      if (ratio >= 0.9) return 90;
      if (ratio >= 0.7) return 70;
      if (ratio >= 0.5) return 50;
      return 30;
    }

    // 格式化日期辅助函数
    function formatDate(date) {
      if (!date) return null;
      const d = new Date(date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    // ==================== 获取项目预算明细API ====================
    if (pathname.match(/^\/api\/projects\/[^\/]+\/budgets$/) && req.method === 'GET') {
      console.log('🎯 进入项目预算明细API');
      
      // 提取项目ID
      const match = pathname.match(/^\/api\/projects\/([^\/]+)\/budgets$/);
      const projectId = match[1];
      
      console.log('📋 项目ID:', projectId);
      
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
        // 检查项目是否存在和权限
        const [projects] = await pool.query(
          'SELECT applicant_id, manager_id FROM `Project` WHERE id = ?',
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
        const isOwner = project.applicant_id === user.id;
        const isManager = project.manager_id === user.id;
        const hasAdminAccess = checkPermission(user.role, ['admin', 'project_manager']);
        
        if (!isOwner && !isManager && !hasAdminAccess) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限查看此项目的预算'
          });
          return;
        }
        
        // 获取预算明细
        const [budgets] = await pool.query(`
          SELECT 
            id,
            category,
            item_name,
            description,
            amount,
            sort_order,
            created_at
          FROM \`ProjectBudget\`
          WHERE project_id = ?
          ORDER BY sort_order ASC, created_at ASC
        `, [projectId]);
        
        console.log(`✅ 获取预算明细成功，共 ${budgets.length} 条`);
        
        sendResponse(res, 200, {
          success: true,
          data: budgets
        });
        
      } catch (error) {
        console.error('获取预算明细失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取预算明细失败',
          message: error.message
        });
      }
      return;
    }
    // ==================== 获取项目成果列表API ====================

    if (pathname.match(/^\/api\/projects\/[^\/]+\/achievements$/) && req.method === 'GET') {
      console.log('🎯 进入项目成果列表API');
      
      // 提取项目ID
      const match = pathname.match(/^\/api\/projects\/([^\/]+)\/achievements$/);
      const projectId = match[1];
      
      console.log('📋 项目ID:', projectId);
      
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
        // 检查项目是否存在和权限
        const [projects] = await pool.query(
          'SELECT applicant_id, manager_id FROM `Project` WHERE id = ?',
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
        const isOwner = project.applicant_id === user.id;
        const isManager = project.manager_id === user.id;
        const hasAdminAccess = checkPermission(user.role, ['admin', 'project_manager']);
        
        if (!isOwner && !isManager && !hasAdminAccess) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限查看此项目的成果'
          });
          return;
        }
        
        // 获取成果列表
        const [achievements] = await pool.query(`
          SELECT 
            id,
            type,
            title,
            description,
            achievement_date,
            authors,
            external_link,
            status,
            verified_by,
            verified_date,
            verification_comment,
            created_at,
            (SELECT name FROM \`User\` WHERE id = created_by) as author_name
          FROM \`ProjectAchievement\`
          WHERE project_id = ?
          ORDER BY achievement_date DESC, created_at DESC
        `, [projectId]);
        
        console.log(`✅ 获取成果列表成功，共 ${achievements.length} 条`);
        
        sendResponse(res, 200, {
          success: true,
          data: achievements
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

    // ==================== 更新项目API ====================

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
            error: '没有权限更新此项目'
          });
          return;
        }
        
        const body = await parseRequestBody(req);
        
        console.log('🔄 更新项目请求:', {
          projectId: projectId,
          userId: user.id,
          data: body
        });
        
        // 构建更新字段（适配新数据库字段）
        const updateFields = [];
        const updateValues = [];
        
        // 新数据库允许更新的字段
        const allowedFields = [
          'title', 'domain_id', 'keywords', 'abstract', 'background',
          'objectives', 'methodology', 'expected_outcomes', 'budget_total',
          'duration_months', 'status', 'start_date', 'end_date',
          'support_level', 'approved_budget', 'remarks',
          'project_domain_other_text',
        ];
        
        allowedFields.forEach(field => {
          if (body[field] !== undefined) {
            updateFields.push(`${field} = ?`);
            updateValues.push(body[field]);
          }
        });
        
        // 如果有提交操作，添加提交日期
        if (body.status === 'submitted' && project.status === 'draft') {
          updateFields.push('submit_date = ?');
          updateValues.push(new Date().toISOString().split('T')[0]);
        }
        
        // 如果有批准操作，添加批准日期
        if (body.status === 'approved' && project.status !== 'approved') {
          updateFields.push('approval_date = ?');
          updateValues.push(new Date().toISOString().split('T')[0]);
        }
        
        // 如果没有更新数据
        if (updateFields.length === 0) {
          sendResponse(res, 400, {
            success: false,
            error: '没有提供更新数据'
          });
          return;
        }
        
        updateValues.push(projectId);
        
        const updateSql = `UPDATE \`Project\` SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`;
        
        console.log('更新项目SQL:', updateSql);
        
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
          message: error.message
        });
      }
      return;
    }

    // ==================== 删除项目API ====================

    // 删除项目
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
        
        // 检查权限：只有项目申请人、管理员可以删除
        const isOwner = project.applicant_id === user.id;
        const isAdmin = checkPermission(user.role, 'admin');
        
        if (!isOwner && !isAdmin) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限删除此项目'
          });
          return;
        }
        
        // 检查项目状态：只有草稿状态可以删除
        if (project.status !== 'draft') {
          sendResponse(res, 409, {
            success: false,
            error: '只能删除草稿状态的项目',
            currentStatus: project.status
          });
          return;
        }
        
        console.log('✅ 验证通过，开始删除项目...');
        
        // 删除项目成员（ProjectMember表）
        await pool.query('DELETE FROM `ProjectMember` WHERE project_id = ?', [projectId]);
        
        // 删除项目预算（ProjectBudget表）
        await pool.query('DELETE FROM `ProjectBudget` WHERE project_id = ?', [projectId]);
        
        // 删除项目成果（ProjectAchievement表）
        await pool.query('DELETE FROM `ProjectAchievement` WHERE project_id = ?', [projectId]);
        
        // 删除项目附件（ProjectAttachment表）
        await pool.query('DELETE FROM `ProjectAttachment` WHERE project_id = ?', [projectId]);
        
        // 删除项目（Project表）
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
          message: error.message
        });
      }
      return;
    }

    // ==================== 创建项目API ====================
// =============================================
// 重要：更具体的路由必须放在前面
// =============================================

// 1. 附件下载接口（必须放在项目详情接口之前）
if (pathname.startsWith('/api/projects/attachments/') && req.method === 'GET') {
  const attachmentId = pathname.replace('/api/projects/attachments/', '');
  
  console.log('📎 附件下载请求，ID:', attachmentId);
  
  const authHeader = req.headers.authorization;
  let token = authHeader;
  if (token && token.startsWith('Bearer ')) {
    token = token.substring(7);
  }
  
  const user = await verifyToken(token);
  
  if (!user) {
    sendResponse(res, 401, {
      success: false,
      error: '认证失败'
    });
    return;
  }
  
  try {
    // 获取附件信息
    const [attachments] = await pool.query(`
      SELECT id, file_name, file_path, file_size, mime_type, project_id
      FROM \`ProjectAttachment\`
      WHERE id = ?
    `, [attachmentId]);
    
    if (attachments.length === 0) {
      sendResponse(res, 404, {
        success: false,
        error: '附件不存在'
      });
      return;
    }
    
    const attachment = attachments[0];
    
    // 检查权限
    const [projects] = await pool.query(
      'SELECT applicant_id FROM `Project` WHERE id = ?',
      [attachment.project_id]
    );
    
    const userId = user.userId || user.id;
    const isApplicant = projects[0]?.applicant_id === userId;
    const isAdmin = user.role === 'admin';
    const isProjectManager = user.role === 'project_manager';
    
    if (!isApplicant && !isProjectManager && !isAdmin) {
      sendResponse(res, 403, {
        success: false,
        error: '没有权限下载此附件'
      });
      return;
    }
    
    // 构建文件路径
    const filePath = path.join(__dirname, attachment.file_path);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.error('文件不存在:', filePath);
      sendResponse(res, 404, {
        success: false,
        error: '文件不存在'
      });
      return;
    }
    
    // 读取文件并返回
    const fileStream = fs.createReadStream(filePath);
    res.writeHead(200, {
      'Content-Type': attachment.mime_type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(attachment.file_name)}`,
      'Content-Length': attachment.file_size
    });
    
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('下载附件失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '下载附件失败',
      message: error.message
    });
  }
  return;
}

// 2. 上传附件接口（放在项目详情之前）
if (pathname === '/api/projects/upload-attachment' && req.method === 'POST') {
  // 使用 multer 处理文件上传
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('文件上传错误:', err);
      sendResponse(res, 400, {
        success: false,
        error: err.message || '文件上传失败'
      });
      return;
    }
    
    // 验证 Token
    const authHeader = req.headers.authorization;
    let token = authHeader;
    if (token && token.startsWith('Bearer ')) {
      token = token.substring(7);
    }
    
    const user = await verifyToken(token);
    if (!user) {
      sendResponse(res, 401, {
        success: false,
        error: '认证失败'
      });
      return;
    }
    
    if (!req.file) {
      sendResponse(res, 400, {
        success: false,
        error: '请选择要上传的文件'
      });
      return;
    }
    
    // 获取项目ID（从请求体或查询参数）
    const body = await parseRequestBody(req);
    const projectId = body.project_id;
    
    if (!projectId) {
      sendResponse(res, 400, {
        success: false,
        error: '项目ID不能为空'
      });
      return;
    }
    
    try {
      const attachmentId = randomUUID();
      const relativePath = `/uploads/projects/${req.file.filename}`;
      
      await pool.query(`
        INSERT INTO \`ProjectAttachment\` (
          id, project_id, file_name, file_path, file_size, 
          mime_type, type, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        attachmentId,
        projectId,
        req.file.originalname,
        relativePath,
        req.file.size,
        req.file.mimetype,
        req.file.mimetype.startsWith('image/') ? 'image' : 'attachment'
      ]);
      
      const fileInfo = {
        id: attachmentId,
        file_name: req.file.originalname,
        file_path: relativePath,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        type: req.file.mimetype.startsWith('image/') ? 'image' : 'attachment',
        created_at: new Date().toISOString()
      };
      
      sendResponse(res, 200, {
        success: true,
        message: '文件上传成功',
        data: fileInfo
      });
    } catch (error) {
      console.error('保存附件信息失败:', error);
      sendResponse(res, 500, {
        success: false,
        error: '保存附件信息失败'
      });
    }
  });
  return;
}

// 3. 删除附件接口
if (pathname.startsWith('/api/projects/attachments/') && req.method === 'DELETE') {
  const attachmentId = pathname.replace('/api/projects/attachments/', '');
  
  const authHeader = req.headers.authorization;
  let token = authHeader;
  if (token && token.startsWith('Bearer ')) {
    token = token.substring(7);
  }
  
  const user = await verifyToken(token);
  
  if (!user) {
    sendResponse(res, 401, {
      success: false,
      error: '认证失败'
    });
    return;
  }
  
  try {
    // 获取附件信息
    const [attachments] = await pool.query(`
      SELECT id, file_path, project_id
      FROM \`ProjectAttachment\`
      WHERE id = ?
    `, [attachmentId]);
    
    if (attachments.length === 0) {
      sendResponse(res, 404, {
        success: false,
        error: '附件不存在'
      });
      return;
    }
    
    const attachment = attachments[0];
    
    // 检查权限
    const [projects] = await pool.query(
      'SELECT applicant_id FROM `Project` WHERE id = ?',
      [attachment.project_id]
    );
    
    const userId = user.userId || user.id;
    const isApplicant = projects[0]?.applicant_id === userId;
    const isAdmin = user.role === 'admin';
    
    if (!isApplicant && !isAdmin) {
      sendResponse(res, 403, {
        success: false,
        error: '没有权限删除此附件'
      });
      return;
    }
    
    // 删除物理文件
    const filePath = path.join(__dirname, attachment.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // 删除数据库记录
    await pool.query('DELETE FROM `ProjectAttachment` WHERE id = ?', [attachmentId]);
    
    sendResponse(res, 200, {
      success: true,
      message: '附件删除成功'
    });
    
  } catch (error) {
    console.error('删除附件失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '删除附件失败'
    });
  }
  return;
}
// 获取单个项目详情
if ((pathname.startsWith('/api/project/') || pathname.startsWith('/api/projects/')) && req.method === 'GET') {
  const authHeader = req.headers.authorization;
  let token = authHeader;
  if (token && token.startsWith('Bearer ')) {
    token = token.substring(7);
  }
  
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
  
  // 检查是否包含特殊路径
  if (projectId.includes('/progress') || projectId.includes('/attachments')) {
    sendResponse(res, 404, {
      success: false,
      error: 'API路径错误'
    });
    return;
  }
  
  console.log('📋 处理项目详情API，项目ID:', projectId);
  
  try {
    // 获取项目基本信息（适配新数据库字段）
    const [projects] = await pool.query(`
      SELECT 
        p.id,
        p.project_code,
        p.title,
        p.tech_maturity,
        p.achievement_transform,
        p.achievement_transform_other_text,
        p.poc_stage_requirement,
        p.poc_multi_stage_note,
        p.implementation_plan,
        p.supplementary_info,
        p.keywords,
        p.abstract,
        p.detailed_introduction_part1,
        p.detailed_introduction_part2,
        p.detailed_introduction_part3,
        p.project_domain_other_text,
        p.status,
        p.approved_budget,
        p.submit_date,
        p.approval_date,
        p.created_at,
        p.updated_at,
        p.applicant_id,
        u.name as applicant_name
      FROM \`Project\` p
      LEFT JOIN \`User\` u ON p.applicant_id = u.id
      WHERE p.id = ?
    `, [projectId]);
    
    if (projects.length === 0) {
      sendResponse(res, 404, {
        success: false,
        error: '项目未找到'
      });
      return;
    }
    
    const project = projects[0];
    
    // 检查权限：申请人本人、项目经理、管理员可以查看
    const userId = user.userId || user.id;
    const isApplicant = project.applicant_id === userId;
    const isAdmin = checkPermission(user.role, 'admin');
    const isProjectManager = checkPermission(user.role, 'project_manager');
    
    if (!isApplicant && !isProjectManager && !isAdmin) {
      sendResponse(res, 403, {
        success: false,
        error: '没有权限查看此项目'
      });
      return;
    }
    
    // 解析SET类型字段（转为数组）
    let achievementTransform = [];
    let pocStageRequirement = [];
    
    if (project.achievement_transform) {
      achievementTransform = project.achievement_transform.split(',');
    }
    if (project.poc_stage_requirement) {
      pocStageRequirement = project.poc_stage_requirement.split(',');
    }
    
    // 获取项目研究领域（通过关联表）
    const [researchDomains] = await pool.query(`
      SELECT 
        rd.id,
        rd.name,
        rd.code
      FROM \`ProjectResearchDomain\` prd
      JOIN \`ResearchDomain\` rd ON prd.research_domain_id = rd.id
      WHERE prd.project_id = ?
      ORDER BY rd.sort_order ASC
    `, [projectId]);
    
    // 获取项目成员
    const [members] = await pool.query(`
      SELECT 
        pm.id,
        pm.name,
        pm.user_id,
        pm.role,
        pm.title,
        pm.organization,
        pm.email,
        pm.sort_order
      FROM \`ProjectMember\` pm
      WHERE pm.project_id = ?
      ORDER BY pm.sort_order ASC, pm.created_at ASC
    `, [projectId]);
    
    // 获取项目预算
    const [budgets] = await pool.query(`
      SELECT 
        id,
        category,
        item_name,
        description,
        amount,
        sort_order
      FROM \`ProjectBudget\`
      WHERE project_id = ?
      ORDER BY sort_order ASC, created_at ASC
    `, [projectId]);
    
    // 获取项目附件
    const [attachments] = await pool.query(`
      SELECT 
        id,
        file_name,
        file_path,
        file_size,
        mime_type,
        type,
        description,
        sort_order,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
      FROM \`ProjectAttachment\`
      WHERE project_id = ?
      ORDER BY sort_order ASC, created_at DESC
    `, [projectId]);
    
    // 计算总预算
    const totalBudget = budgets.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    sendResponse(res, 200, {
      success: true,
      data: {
        id: project.id,
        project_code: project.project_code,
        title: project.title,
        tech_maturity: project.tech_maturity,
        achievement_transform: achievementTransform,
        achievement_transform_other_text: project.achievement_transform_other_text,
        poc_stage_requirement: pocStageRequirement,
        poc_multi_stage_note: project.poc_multi_stage_note,
        implementation_plan: project.implementation_plan,
        supplementary_info: project.supplementary_info,
        keywords: project.keywords,
        abstract: project.abstract,
        detailed_introduction_part1: project.detailed_introduction_part1,
        detailed_introduction_part2: project.detailed_introduction_part2,
        detailed_introduction_part3: project.detailed_introduction_part3,
        project_domain_other_text: project.project_domain_other_text,
        status: project.status,
        approved_budget: project.approved_budget,
        submit_date: project.submit_date,
        approval_date: project.approval_date,
        created_at: project.created_at,
        updated_at: project.updated_at,
        applicant_id: project.applicant_id,
        applicant_name: project.applicant_name,
        research_domains: researchDomains,
        total_budget: totalBudget,
        team_members: members,
        budget_items: budgets,
        attachments: attachments
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

// 4. 最后才是项目详情接口（使用正则匹配，排除已经匹配的路径）
if ((pathname.match(/^\/api\/project\/[^\/]+$/) || pathname.match(/^\/api\/projects\/[^\/]+$/)) && req.method === 'GET') {
  // 提取项目ID
  let projectId;
  if (pathname.startsWith('/api/project/')) {
    projectId = pathname.replace('/api/project/', '');
  } else {
    projectId = pathname.replace('/api/projects/', '');
  }
  
  console.log('📋 处理项目详情API，项目ID:', projectId);
  
  // 验证项目ID格式（UUID格式）
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(projectId)) {
    sendResponse(res, 400, {
      success: false,
      error: '无效的项目ID格式'
    });
    return;
  }
  
  const authHeader = req.headers.authorization;
  let token = authHeader;
  if (token && token.startsWith('Bearer ')) {
    token = token.substring(7);
  }
  
  const user = await verifyToken(token);
  
  if (!user) {
    sendResponse(res, 401, {
      success: false,
      error: '认证失败'
    });
    return;
  }
  
  try {
    // 获取项目基本信息
    const [projects] = await pool.query(`
      SELECT 
        p.id,
        p.project_code,
        p.title,
        p.tech_maturity,
        p.achievement_transform,
        p.achievement_transform_other_text,
        p.poc_stage_requirement,
        p.poc_multi_stage_note,
        p.implementation_plan,
        p.supplementary_info,
        p.keywords,
        p.abstract,
        p.detailed_introduction_part1,
        p.detailed_introduction_part2,
        p.detailed_introduction_part3,
        p.status,
        p.approved_budget,
        p.submit_date,
        p.approval_date,
        p.created_at,
        p.updated_at,
        p.applicant_id,
        u.name as applicant_name
      FROM \`Project\` p
      LEFT JOIN \`User\` u ON p.applicant_id = u.id
      WHERE p.id = ?
    `, [projectId]);
    
    if (projects.length === 0) {
      sendResponse(res, 404, {
        success: false,
        error: '项目未找到'
      });
      return;
    }
    
    const project = projects[0];
    
    // 检查权限
    const userId = user.userId || user.id;
    const isApplicant = project.applicant_id === userId;
    const isAdmin = user.role === 'admin';
    const isProjectManager = user.role === 'project_manager';
    
    if (!isApplicant && !isProjectManager && !isAdmin) {
      sendResponse(res, 403, {
        success: false,
        error: '没有权限查看此项目'
      });
      return;
    }
    
    // 解析SET类型字段
    let achievementTransform = [];
    let pocStageRequirement = [];
    
    if (project.achievement_transform) {
      achievementTransform = project.achievement_transform.split(',');
    }
    if (project.poc_stage_requirement) {
      pocStageRequirement = project.poc_stage_requirement.split(',');
    }
    
    // 获取研究领域
    const [researchDomains] = await pool.query(`
      SELECT rd.id, rd.name, rd.code
      FROM \`ProjectResearchDomain\` prd
      JOIN \`ResearchDomain\` rd ON prd.research_domain_id = rd.id
      WHERE prd.project_id = ?
    `, [projectId]);
    
    // 获取团队成员
    const [members] = await pool.query(`
      SELECT id, name, user_id, role, title, organization, email, sort_order
      FROM \`ProjectMember\`
      WHERE project_id = ?
      ORDER BY sort_order ASC
    `, [projectId]);
    
    // 获取预算
    const [budgets] = await pool.query(`
      SELECT id, category, item_name, description, amount, sort_order
      FROM \`ProjectBudget\`
      WHERE project_id = ?
      ORDER BY sort_order ASC
    `, [projectId]);
    
    // 获取附件
    const [attachments] = await pool.query(`
      SELECT id, file_name, file_path, file_size, mime_type, type, description, created_at
      FROM \`ProjectAttachment\`
      WHERE project_id = ?
      ORDER BY created_at DESC
    `, [projectId]);
    
    sendResponse(res, 200, {
      success: true,
      data: {
        ...project,
        achievement_transform: achievementTransform,
        poc_stage_requirement: pocStageRequirement,
        research_domains: researchDomains,
        team_members: members,
        budget_items: budgets,
        attachments: attachments
      }
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
// 确保上传目录存在
const uploadDir = path.join(__dirname, 'uploads', 'projects');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：时间戳_随机数_原文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});
// 文件过滤
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB限制
});

// 上传附件接口
if (pathname === '/api/projects/upload-attachment' && req.method === 'POST') {
  // 使用 multer 处理文件上传
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('文件上传错误:', err);
      sendResponse(res, 400, {
        success: false,
        error: err.message || '文件上传失败'
      });
      return;
    }
    
    // 验证 Token
    const authHeader = req.headers.authorization;
    let token = authHeader;
    if (token && token.startsWith('Bearer ')) {
      token = token.substring(7);
    }
    
    const user = await verifyToken(token);
    if (!user) {
      sendResponse(res, 401, {
        success: false,
        error: '认证失败'
      });
      return;
    }
    
    if (!req.file) {
      sendResponse(res, 400, {
        success: false,
        error: '请选择要上传的文件'
      });
      return;
    }
    
    // 返回文件信息
    const fileInfo = {
      originalName: req.file.originalname,
      fileName: req.file.filename,
      filePath: `/uploads/projects/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadTime: new Date().toISOString()
    };
    
    sendResponse(res, 200, {
      success: true,
      message: '文件上传成功',
      data: fileInfo
    });
  });
  return;
}
// 创建项目
if (pathname === '/api/projects' && req.method === 'POST') {
  const authHeader = req.headers.authorization;
  let token = authHeader;
  if (token && token.startsWith('Bearer ')) {
    token = token.substring(7);
  }
  
  const user = await verifyToken(token);
  
  if (!user) {
    sendResponse(res, 401, {
      success: false,
      error: '认证失败'
    });
    return;
  }
  
  const userId = user.userId || user.id;
  const body = await parseRequestBody(req);
  
  console.log('👤 创建项目的用户:', { userId, username: user.username });
  console.log('📥 接收到的数据:', JSON.stringify(body, null, 2));
  
  // 验证必填字段
  if (!body.title) {
    sendResponse(res, 400, {
      success: false,
      error: '项目标题不能为空'
    });
    return;
  }
  
  // 验证研究领域
  if (!body.research_domains || body.research_domains.length === 0) {
    sendResponse(res, 400, {
      success: false,
      error: '请至少选择一个研究领域'
    });
    return;
  }
  
  try {
    const projectId = randomUUID();
    const projectCode = `PROJ-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    console.log('📝 创建项目:', { projectId, projectCode, title: body.title });
    
    // 处理 SET 类型字段：将数组转换为逗号分隔的字符串
    const achievementTransform = body.achievement_transform && body.achievement_transform.length > 0
      ? body.achievement_transform.join(',')
      : null;
    
    const pocStageRequirement = body.poc_stage_requirement && body.poc_stage_requirement.length > 0
      ? body.poc_stage_requirement.join(',')
      : null;
    
    const submitDate = body.submit_date || new Date().toISOString().split('T')[0];
    
    console.log('📝 处理后的SET字段:', {
      achievementTransform,
      pocStageRequirement
    });
    
    // 插入项目数据
    const sql = `
      INSERT INTO \`Project\` (
        id,
        project_code,
        applicant_id,
        title,
        project_domain_other_text,
        tech_maturity,
        achievement_transform,
        achievement_transform_other_text,
        poc_stage_requirement,
        poc_multi_stage_note,
        implementation_plan,
        supplementary_info,
        keywords,
        abstract,
        detailed_introduction_part1,
        detailed_introduction_part2,
        detailed_introduction_part3,
        status,
        submit_date,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    const params = [
      projectId,
      projectCode,
      userId,
      body.title,
      body.project_domain_other_text || null,
      body.tech_maturity || null,
      achievementTransform,  // 使用逗号分隔的字符串
      body.achievement_transform_other_text || null,
      pocStageRequirement,   // 使用逗号分隔的字符串
      body.poc_multi_stage_note || null,
      body.implementation_plan || null,
      body.supplementary_info || null,
      body.keywords || null,
      body.abstract || '',
      body.detailed_introduction_part1 || null,
      body.detailed_introduction_part2 || null,
      body.detailed_introduction_part3 || null,
      'draft',
      submitDate
    ];
    
    await pool.query(sql, params);
    console.log('✅ 项目基本信息插入成功');
    
    // 2. 插入项目-研究领域关联
    if (body.research_domains && body.research_domains.length > 0) {
      console.log('🔗 插入研究领域关联:', body.research_domains);
      for (const domainId of body.research_domains) {
        if (domainId) {
          await pool.query(`
            INSERT INTO \`ProjectResearchDomain\` (project_id, research_domain_id, created_at)
            VALUES (?, ?, NOW())
          `, [projectId, domainId]);
        }
      }
      console.log('✅ 研究领域关联插入成功');
    }
    
    // 3. 插入项目成员
    if (body.team_members && body.team_members.length > 0) {
      console.log('👥 插入项目成员:', body.team_members.length);
      for (let i = 0; i < body.team_members.length; i++) {
        const member = body.team_members[i];
        if (member.name && member.name.trim()) {
          await pool.query(`
            INSERT INTO \`ProjectMember\` (
              id, project_id, name, user_id, role, title, 
              organization, email, sort_order, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `, [
            randomUUID(),
            projectId,
            member.name,
            member.user_id || null,
            member.role || 'other',
            member.title || null,
            member.organization || null,
            member.email || '',
            i
          ]);
        }
      }
      console.log('✅ 项目成员插入成功');
    } else {
      // 默认添加申请人作为负责人
      const [userInfo] = await pool.query(
        'SELECT name, email, department, title FROM `User` WHERE id = ?',
        [userId]
      );
      const currentUser = userInfo[0] || { name: user.username, email: '', department: '', title: '' };
      
      await pool.query(`
        INSERT INTO \`ProjectMember\` (
          id, project_id, name, user_id, role, title, 
          organization, email, sort_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        randomUUID(),
        projectId,
        currentUser.name || user.username,
        userId,
        'principal',
        currentUser.title || null,
        currentUser.department || null,
        currentUser.email || '',
        0
      ]);
      console.log('✅ 默认负责人添加成功');
    }
    
    // 4. 插入预算明细
    if (body.budget_items && body.budget_items.length > 0) {
      console.log('💰 插入预算明细:', body.budget_items.length);
      for (let i = 0; i < body.budget_items.length; i++) {
        const item = body.budget_items[i];
        if (item.category && item.item_name && item.amount > 0) {
          await pool.query(`
            INSERT INTO \`ProjectBudget\` (
              id, project_id, category, item_name, description, 
              amount, sort_order, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
          `, [
            randomUUID(),
            projectId,
            item.category,
            item.item_name,
            item.description || '',
            parseFloat(item.amount) || 0,
            i
          ]);
        }
      }
      console.log('✅ 预算明细插入成功');
    }
    
    sendResponse(res, 201, {
      success: true,
      message: '项目创建成功',
      data: {
        id: projectId,
        project_code: projectCode,
        title: body.title,
        status: 'draft'
      }
    });
    
  } catch (error) {
    console.error('❌ 创建项目失败:', error);
    sendResponse(res, 500, {
      success: false,
      error: '创建项目失败',
      message: error.message,
      sqlMessage: error.sqlMessage
    });
  }
  // 5. 保存项目附件
  if (body.attachments && body.attachments.length > 0) {
    console.log('📎 保存项目附件:', body.attachments.length);
    for (let i = 0; i < body.attachments.length; i++) {
      const att = body.attachments[i];
      await pool.query(`
        INSERT INTO \`ProjectAttachment\` (
          id, project_id, file_name, file_path, file_size, 
          mime_type, type, description, sort_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        randomUUID(),
        projectId,
        att.file_name,
        att.file_path,
        att.file_size,
        att.mime_type,
        att.type || 'attachment',
        att.description || '',
        i
      ]);
    }
    console.log('✅ 项目附件保存成功');
  }
}
// 如果没有 express，添加手动处理
if (pathname.startsWith('/uploads/') && req.method === 'GET') {
  const filePath = path.join(__dirname, pathname);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendResponse(res, 404, { error: '文件不存在' });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf'
    };
    res.writeHead(200, { 'Content-Type': contentType[ext] || 'application/octet-stream' });
    res.end(data);
  });
  return;
}
    // ==================== 获取申请人项目列表API ====================

    // 获取申请人的项目列表
    if (pathname === '/api/applicant/projects' && req.method === 'GET') {
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
        const [projects] = await pool.query(`
          SELECT 
            p.id,
            p.project_code,
            p.title,
            p.status,
            p.budget_total,
            p.duration_months,
            p.start_date,
            p.end_date,
            p.created_at,
            p.updated_at,
            rd.name as research_field
          FROM \`Project\` p
          LEFT JOIN \`ResearchDomain\` rd ON p.domain_id = rd.id
          WHERE p.applicant_id = ?
          ORDER BY p.created_at DESC
        `, [user.id]);
        
        sendResponse(res, 200, {
          success: true,
          data: projects,
          total: projects.length
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

    // ==================== 添加项目成员API ====================

    // 添加项目成员
    if (pathname.startsWith('/api/projects/') && pathname.endsWith('/members') && req.method === 'POST') {
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
      const body = await parseRequestBody(req);
      
      try {
        // 检查项目是否存在和权限
        const [projects] = await pool.query(
          'SELECT applicant_id FROM `Project` WHERE id = ?',
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
        const isOwner = project.applicant_id === user.id;
        const isAdmin = checkPermission(user.role, 'admin');
        
        if (!isOwner && !isAdmin) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限添加成员'
          });
          return;
        }
        
        const memberId = randomUUID();
        
        const sql = `
          INSERT INTO \`ProjectMember\` (
            id, project_id, name, user_id, role, title, organization,
            responsibility, workload_percentage, sort_order, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        const params = [
          memberId,
          projectId,
          body.name,
          body.user_id || null,
          body.role || 'researcher',
          body.title || null,
          body.organization || null,
          body.responsibility || null,
          body.workload_percentage || 0,
          body.sort_order || 0
        ];
        
        await pool.query(sql, params);
        
        sendResponse(res, 201, {
          success: true,
          message: '成员添加成功',
          id: memberId
        });
        
      } catch (error) {
        console.error('添加成员失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '添加成员失败',
          message: error.message
        });
      }
      return;
    }

    // ==================== 添加项目预算API ====================

    // 添加项目预算项
    if (pathname.startsWith('/api/projects/') && pathname.endsWith('/budgets') && req.method === 'POST') {
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
      const body = await parseRequestBody(req);
      
      try {
        // 检查项目是否存在和权限
        const [projects] = await pool.query(
          'SELECT applicant_id FROM `Project` WHERE id = ?',
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
        const isOwner = project.applicant_id === user.id;
        const isAdmin = checkPermission(user.role, 'admin');
        
        if (!isOwner && !isAdmin) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限添加预算'
          });
          return;
        }
        
        const budgetId = randomUUID();
        
        const sql = `
          INSERT INTO \`ProjectBudget\` (
            id, project_id, category, item_name, description,
            amount, sort_order, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        const mergedDesc = [body.description, body.justification].filter(Boolean).join('\n').trim() || body.description || '';
        const params = [
          budgetId,
          projectId,
          body.category,
          body.item_name,
          mergedDesc,
          body.amount,
          body.sort_order || 0
        ];
        
        await pool.query(sql, params);
        
        sendResponse(res, 201, {
          success: true,
          message: '预算项添加成功',
          id: budgetId
        });
        
      } catch (error) {
        console.error('添加预算项失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '添加预算项失败',
          message: error.message
        });
      }
      return;
    }    
// ==================== 附件API ====================

    // ==================== 附件API（独立路径） ====================

    // 1. 下载附件 - GET /api/attachments/:id
    if (pathname.startsWith('/api/attachments/') && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 提取附件ID
      const attachmentId = pathname.split('/')[3];
      console.log('📥 下载附件请求:', { attachmentId, userId: user.id });
      
      try {
        // 获取附件信息
        const [attachments] = await pool.query(`
          SELECT a.*, p.applicant_id, p.manager_id
          FROM \`ProjectAttachment\` a
          JOIN \`Project\` p ON a.project_id = p.id
          WHERE a.id = ?
        `, [attachmentId]);
        
        if (attachments.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '附件未找到'
          });
          return;
        }
        
        const attachment = attachments[0];
        
        // 检查权限
        const isApplicant = attachment.applicant_id === user.id;
        const isManager = attachment.manager_id === user.id;
        const isAdmin = checkPermission(user.role, 'admin');
        const isAssistant = checkPermission(user.role, 'project_manager');
        
        if (!isApplicant && !isManager && !isAdmin && !isAssistant) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限下载此附件'
          });
          return;
        }
        
        // 检查文件是否存在
        const fs = require('fs');
        if (!fs.existsSync(attachment.file_path)) {
          console.error('文件不存在:', attachment.file_path);
          sendResponse(res, 404, {
            success: false,
            error: '文件不存在'
          });
          return;
        }
        
        // 获取文件大小
        const stats = fs.statSync(attachment.file_path);
        
        // 设置响应头
        const fileName = encodeURIComponent(attachment.file_name);
        res.setHeader('Content-Type', attachment.mime_type);
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fileName}`);
        res.setHeader('Content-Length', stats.size);
        
        // 发送文件
        const fileStream = fs.createReadStream(attachment.file_path);
        fileStream.pipe(res);
        
        fileStream.on('error', (error) => {
          console.error('文件流错误:', error);
          if (!res.headersSent) {
            sendResponse(res, 500, {
              success: false,
              error: '文件读取失败'
            });
          }
        });
        
        
        console.log('✅ 文件下载成功:', attachment.file_name);
        
      } catch (error) {
        console.error('❌ 下载附件失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '下载附件失败',
          message: error.message
        });
      }
      return;
    }

    // 2. 删除附件 - DELETE /api/attachments/:id
    if (pathname.startsWith('/api/attachments/') && req.method === 'DELETE') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      // 提取附件ID
      const attachmentId = pathname.split('/')[3];
      console.log('🗑️ 删除附件请求:', { attachmentId, userId: user.id });
      
      try {
        // 获取附件信息
        const [attachments] = await pool.query(`
          SELECT a.*, p.applicant_id, p.status
          FROM \`ProjectAttachment\` a
          JOIN \`Project\` p ON a.project_id = p.id
          WHERE a.id = ?
        `, [attachmentId]);
        
        if (attachments.length === 0) {
          sendResponse(res, 404, {
            success: false,
            error: '附件未找到'
          });
          return;
        }
        
        const attachment = attachments[0];
        
        // 检查权限
        const isOwner = attachment.applicant_id === user.id;
        const isAdmin = checkPermission(user.role, 'admin');
        
        if (!isOwner && !isAdmin) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限删除此附件'
          });
          return;
        }
        
        // 删除物理文件
        const fs = require('fs');
        if (fs.existsSync(attachment.file_path)) {
          fs.unlinkSync(attachment.file_path);
          console.log('✅ 删除物理文件:', attachment.file_path);
        }
        
        // 从数据库删除
        await pool.query('DELETE FROM \`ProjectAttachment\` WHERE id = ?', [attachmentId]);
        
        sendResponse(res, 200, {
          success: true,
          message: '附件删除成功'
        });
        
      } catch (error) {
        console.error('删除附件失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '删除附件失败',
          message: error.message
        });
      }
      return;
    }

    // 3. 上传附件 - POST /api/attachments
    // 上传附件 - POST /api/attachments
    if (pathname === '/api/attachments' && req.method === 'POST') {
      console.log('📤 收到上传请求');
      
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      
      if (!user) {
        sendResponse(res, 401, {
          success: false,
          error: '认证失败'
        });
        return;
      }
      
      const fs = require('fs');
      const path = require('path');
      
      // 创建上传目录
      const uploadDir = path.join(__dirname, 'uploads/temp');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // 正确使用 formidable - 注意：不要用 new
      const form = formidable({
        uploadDir: uploadDir,
        keepExtensions: true,
        maxFileSize: 50 * 1024 * 1024,
        multiples: true,
      });
      
      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error('文件解析失败:', err);
          sendResponse(res, 400, {
            success: false,
            error: '文件上传失败',
            message: err.message
          });
          return;
        }
        
        try {
          // 获取文件
          let file = files.file;
          if (Array.isArray(file)) {
            file = file[0];
          }
          
          // 获取项目ID
          let projectId = fields.project_id;
          if (Array.isArray(projectId)) {
            projectId = projectId[0];
          }
          
          let section = fields.section || 'attachment';
          if (Array.isArray(section)) {
            section = section[0];
          }
          
          let mediaType = fields.media_type || 'other';
          if (Array.isArray(mediaType)) {
            mediaType = mediaType[0];
          }
          
          console.log('📤 上传附件请求:', {
            projectId,
            fileName: file?.originalFilename,
            fileSize: file?.size,
            userId: user.id
          });
          
          if (!file) {
            sendResponse(res, 400, { success: false, error: '未提供文件' });
            return;
          }
          
          if (!projectId) {
            if (file.filepath && fs.existsSync(file.filepath)) {
              fs.unlinkSync(file.filepath);
            }
            sendResponse(res, 400, { success: false, error: '未提供项目ID' });
            return;
          }
          
          // 检查项目是否存在
          const [projects] = await pool.query(
            'SELECT applicant_id FROM `Project` WHERE id = ?',
            [projectId]
          );
          
          if (projects.length === 0) {
            if (file.filepath && fs.existsSync(file.filepath)) {
              fs.unlinkSync(file.filepath);
            }
            sendResponse(res, 404, { success: false, error: '项目未找到' });
            return;
          }
          
          const project = projects[0];
          const isOwner = project.applicant_id === user.id;
          const isAdmin = checkPermission(user.role, 'admin');
          
          if (!isOwner && !isAdmin) {
            if (file.filepath && fs.existsSync(file.filepath)) {
              fs.unlinkSync(file.filepath);
            }
            sendResponse(res, 403, { success: false, error: '没有权限上传附件' });
            return;
          }
          
          // 创建项目专属文件夹
          const projectUploadDir = path.join(__dirname, 'uploads/projects', projectId);
          if (!fs.existsSync(projectUploadDir)) {
            fs.mkdirSync(projectUploadDir, { recursive: true });
            console.log('✅ 创建项目文件夹:', projectUploadDir);
          }
          
          // 生成唯一文件名
          const originalName = file.originalFilename || file.name;
          const ext = path.extname(originalName);
          const storedName = `${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
          const storedPath = path.join(projectUploadDir, storedName);
          
          // 移动文件到项目文件夹
          fs.renameSync(file.filepath, storedPath);
          console.log('✅ 文件已移动到:', storedPath);
          
          // 确定媒体类型
          const mimeType = file.mimetype || file.type;
          let finalMediaType = mediaType;
          if (finalMediaType === 'other') {
            if (mimeType?.startsWith('image/')) finalMediaType = 'image';
            else if (mimeType?.startsWith('audio/')) finalMediaType = 'audio';
            else if (mimeType?.startsWith('video/')) finalMediaType = 'video';
            else if (mimeType?.includes('pdf')) finalMediaType = 'document';
          }
          
          // 保存到数据库
          const attachmentId = randomUUID();
          await pool.query(`
            INSERT INTO \`ProjectAttachment\` (
              id, project_id, file_name, file_path, file_size,
              mime_type, media_type, section, uploaded_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `, [
            attachmentId, projectId, originalName, storedPath, file.size,
            mimeType, finalMediaType, section, user.id
          ]);
          
          console.log('✅ 附件记录已保存到数据库');
          
          sendResponse(res, 201, {
            success: true,
            message: '文件上传成功',
            data: {
              id: attachmentId,
              name: originalName,
              size: file.size,
              type: mimeType,
              media_type: finalMediaType,
              created_at: new Date().toISOString()
            }
          });
          
        } catch (error) {
          console.error('❌ 上传失败:', error);
          // 清理临时文件
          if (files && files.file) {
            let file = files.file;
            if (Array.isArray(file)) file = file[0];
            if (file && file.filepath && fs.existsSync(file.filepath)) {
              try {
                fs.unlinkSync(file.filepath);
              } catch (e) {}
            }
          }
          sendResponse(res, 500, {
            success: false,
            error: '上传失败',
            message: error.message
          });
        }
      });
      return;
    }
    // ==================== 获取项目附件列表API（已包含在项目详情中，但也可以单独提供） ====================

    // 获取项目附件列表
    if (pathname.startsWith('/api/projects/') && pathname.endsWith('/attachments') && req.method === 'GET') {
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
      const projectId = pathname.split('/')[3];
      
      try {
        // 检查权限
        const [projects] = await pool.query(
          'SELECT applicant_id, manager_id FROM `Project` WHERE id = ?',
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
        const isApplicant = project.applicant_id === user.id;
        const isManager = project.manager_id === user.id;
        const isAdmin = checkPermission(user.role, 'admin');
        const isAssistant = checkPermission(user.role, 'project_manager');
        
        if (!isApplicant && !isManager && !isAdmin && !isAssistant) {
          sendResponse(res, 403, {
            success: false,
            error: '没有权限查看附件'
          });
          return;
        }
        
        // 获取附件列表
        const [attachments] = await pool.query(`
          SELECT 
            id, file_name as name, file_size as size,
            mime_type as type, media_type, section, created_at
          FROM \`ProjectAttachment\`
          WHERE project_id = ?
          ORDER BY created_at DESC
        `, [projectId]);
        
        sendResponse(res, 200, {
          success: true,
          data: attachments
        });
        
      } catch (error) {
        console.error('获取附件列表失败:', error);
        sendResponse(res, 500, {
          success: false,
          error: '获取附件列表失败',
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
      if (!checkPermission(user.role, ['admin', 'project_manager'])) {
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
        if (checkPermission(user.role, ['admin', 'project_manager'])) {
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
          const isAdmin = checkPermission(user.role, ['admin', 'project_manager']);
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
        const isAdmin = checkPermission(user.role, ['admin', 'project_manager']);
        
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
        const isAdmin = checkPermission(user.role, ['admin', 'project_manager']);
        
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
        const isAdmin = checkPermission(user.role, ['admin', 'project_manager']);
        
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
        const isAdmin = checkPermission(user.role, ['admin', 'project_manager']);
        
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
      if (!checkPermission(user.role, ['admin', 'project_manager', 'reviewer'])) {
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
        const isAdmin = checkPermission(user.role, ['admin', 'project_manager']);
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
        
        if (checkPermission(user.role, ['admin', 'project_manager'])) {
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
        if (checkPermission(user.role, ['admin', 'project_manager'])) {
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
          ${!checkPermission(user.role, ['admin', 'project_manager']) ? 'AND created_by = ?' : ''}
          GROUP BY DATE_FORMAT(created_at, '%Y-%m')
          ORDER BY month
        `;
        
        const monthlyParams = checkPermission(user.role, ['admin', 'project_manager']) ? [] : [user.id];
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
      if (checkPermission(user.role, ['admin', 'project_manager'])) {
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
      const isAdmin = checkPermission(user.role, ['admin', 'project_manager']);
      
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
      const isAdmin = checkPermission(user.role, ['admin', 'project_manager']);
      
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
      const isAdmin = checkPermission(user.role, ['admin', 'project_manager']);
      
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
      const isAdmin = checkPermission(user.role, ['admin', 'project_manager']);
      
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

  // ==================== 经费管理API（基于新数据库） ====================

  // 1. 获取经费统计（基于 Project 和 ProjectBudget）
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
      let totalApprovedBudget = 0;
      
      // 获取用户的所有项目
      let projectsSql = `
        SELECT 
          p.id, 
          p.budget_total, 
          p.approved_budget,
          p.status
        FROM \`Project\` p
        WHERE p.applicant_id = ?
          AND p.status NOT IN ('draft', 'rejected', 'terminated')
      `;
      
      const [projects] = await pool.query(projectsSql, [user.id]);
      
      console.log(`📁 找到 ${projects.length} 个项目`);
      
      // 计算总预算和批准预算
      projects.forEach(project => {
        const budget = parseFloat(project.budget_total || 0);
        const approved = parseFloat(project.approved_budget || budget);
        totalBudget += budget;
        totalApprovedBudget += approved;
      });
      
      // 计算已使用金额（从预算明细中汇总已批准的支出）
      let usedAmount = 0;
      if (projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        const placeholders = projectIds.map(() => '?').join(',');
        
        // 从 ProjectBudget 获取已批准的预算（作为已使用金额）
        // 实际项目中，已使用金额应从支出记录表获取，这里暂时使用已批准的预算作为参考
        const [budgets] = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) as total
          FROM \`ProjectBudget\`
          WHERE project_id IN (${placeholders})`,
          projectIds
        );
        
        usedAmount = parseFloat(budgets[0]?.total || 0);
      }
      
      // 获取待处理的经费申请（如果需要，可以从 FundingApplication 表获取）
      let pendingApplications = 0;
      let pendingReimbursements = 0;
      
      // 尝试获取待处理的申请（如果有 FundingApplication 表）
      try {
        const [apps] = await pool.query(
          `SELECT COUNT(*) as count 
          FROM \`FundingApplication\` 
          WHERE applicant_id = ? AND status = 'submitted'`,
          [user.id]
        );
        pendingApplications = apps[0]?.count || 0;
      } catch (error) {
        console.log('经费申请表不存在或查询失败，跳过');
      }
      
      const availableBalance = totalApprovedBudget - usedAmount;
      const usedPercentage = totalApprovedBudget > 0 ? ((usedAmount / totalApprovedBudget) * 100).toFixed(1) : 0;
      
      console.log('📊 统计结果:', {
        totalBudget,
        totalApprovedBudget,
        usedAmount,
        availableBalance,
        usedPercentage
      });
      
      sendResponse(res, 200, {
        success: true,
        data: {
          total_budget: totalBudget,
          approved_budget: totalApprovedBudget,
          used_amount: usedAmount,
          available_balance: availableBalance,
          used_percentage: parseFloat(usedPercentage),
          pending_applications: pendingApplications,
          pending_reimbursements: pendingReimbursements,
          project_count: projects.length
        }
      });
      
    } catch (error) {
      console.error('获取经费统计失败:', error);
      sendResponse(res, 500, {
        success: false,
        error: '获取经费统计失败',
        message: error.message
      });
    }
    return;
  }

  // 2. 获取项目预算列表（替代支出记录）
  if (pathname === '/api/budget/items' && req.method === 'GET') {
    const token = req.headers.authorization;
    const user = await verifyToken(token);
    
    if (!user) {
      sendResponse(res, 401, {
        success: false,
        error: '认证失败'
      });
      return;
    }
    
    const { project_id, limit = 10, page = 1 } = query;
    const offset = (page - 1) * limit;
    
    console.log('💰 获取预算明细，用户:', user.id, '项目:', project_id);
    
    try {
      let sql = `
        SELECT 
          pb.id,
          pb.project_id,
          p.title as project_title,
          p.project_code,
          pb.category,
          pb.item_name,
          pb.description,
          pb.amount,
          pb.sort_order,
          pb.created_at
        FROM \`ProjectBudget\` pb
        LEFT JOIN \`Project\` p ON pb.project_id = p.id
        WHERE 1=1
      `;
      
      let countSql = 'SELECT COUNT(*) as total FROM `ProjectBudget` pb WHERE 1=1';
      const params = [];
      const countParams = [];
      
      // 权限过滤：只能查看自己项目的预算
      sql += ` AND pb.project_id IN (
        SELECT id FROM \`Project\` WHERE applicant_id = ?
        UNION
        SELECT project_id FROM \`ProjectMember\` WHERE user_id = ?
      )`;
      countSql += ` AND pb.project_id IN (
        SELECT id FROM \`Project\` WHERE applicant_id = ?
        UNION
        SELECT project_id FROM \`ProjectMember\` WHERE user_id = ?
      )`;
      params.push(user.id, user.id);
      countParams.push(user.id, user.id);
      
      // 项目筛选
      if (project_id) {
        sql += ' AND pb.project_id = ?';
        countSql += ' AND pb.project_id = ?';
        params.push(project_id);
        countParams.push(project_id);
      }
      
      sql += ' ORDER BY pb.sort_order ASC, pb.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);
      
      const [rows] = await pool.query(sql, params);
      const [totalResult] = await pool.query(countSql, countParams);
      const total = totalResult[0]?.total || 0;
      
      sendResponse(res, 200, {
        success: true,
        data: rows,
        total: total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      });
      
    } catch (error) {
      console.error('获取预算明细失败:', error);
      sendResponse(res, 500, {
        success: false,
        error: '获取预算明细失败',
        message: error.message
      });
    }
    return;
  }

  // 3. 获取预算分类统计
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
      // 获取用户的项目
      let projectsSql = `
        SELECT p.id, p.title, p.budget_total, p.approved_budget
        FROM \`Project\` p
        WHERE p.applicant_id = ?
          AND p.status IN ('approved', 'incubating', 'completed')
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
      
      // 按分类统计预算
      const [categoryStats] = await pool.query(
        `SELECT 
          category,
          COUNT(*) as item_count,
          SUM(amount) as total_amount
        FROM \`ProjectBudget\`
        WHERE project_id IN (${placeholders})
        GROUP BY category
        ORDER BY total_amount DESC`,
        projectIds
      );
      
      // 获取各项目的总预算
      const projectBudgets = {};
      projects.forEach(p => {
        projectBudgets[p.id] = parseFloat(p.approved_budget || p.budget_total || 0);
      });
      
      // 计算每个分类的预算分配
      const result = categoryStats.map(stat => {
        const totalBudget = Object.values(projectBudgets).reduce((a, b) => a + b, 0);
        const budget = stat.total_amount;
        const used = stat.total_amount; // 已使用暂时等于预算，实际应从支出表获取
        const percentage = budget > 0 ? Math.round((used / budget) * 100) : 0;
        
        return {
          id: stat.category,
          name: stat.category,
          budget: budget,
          used: used,
          balance: budget - used,
          percentage: percentage,
          status: getCategoryStatusByPercentage(percentage),
          item_count: stat.item_count
        };
      });
      
      console.log(`📊 预算分类统计结果: ${result.length} 个分类`);
      
      sendResponse(res, 200, {
        success: true,
        data: result,
        total_projects: projects.length,
        total_budget: projects.reduce((sum, p) => sum + (p.approved_budget || p.budget_total || 0), 0)
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

  // 4. 获取预算执行数据（按项目）
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
      const [projects] = await pool.query(`
        SELECT 
          p.id,
          p.title,
          p.project_code,
          p.budget_total,
          p.approved_budget,
          p.status,
          p.start_date,
          p.end_date
        FROM \`Project\` p
        WHERE p.applicant_id = ?
        ORDER BY p.created_at DESC
      `, [user.id]);
      
      if (projects.length === 0) {
        sendResponse(res, 200, {
          success: true,
          data: []
        });
        return;
      }
      
      const projectIds = projects.map(p => p.id);
      const placeholders = projectIds.map(() => '?').join(',');
      
      // 获取每个项目的预算明细
      const [budgets] = await pool.query(`
        SELECT 
          project_id,
          category,
          SUM(amount) as total_budget
        FROM \`ProjectBudget\`
        WHERE project_id IN (${placeholders})
        GROUP BY project_id, category
      `, projectIds);
      
      // 按项目组织预算数据
      const projectBudgetsMap = {};
      budgets.forEach(b => {
        if (!projectBudgetsMap[b.project_id]) {
          projectBudgetsMap[b.project_id] = {
            total: 0,
            categories: []
          };
        }
        projectBudgetsMap[b.project_id].total += parseFloat(b.total_budget);
        projectBudgetsMap[b.project_id].categories.push({
          category: b.category,
          amount: parseFloat(b.total_budget)
        });
      });
      
      // 构建结果
      const result = projects.map(project => {
        const approvedBudget = parseFloat(project.approved_budget || project.budget_total || 0);
        const projectBudget = projectBudgetsMap[project.id] || { total: 0, categories: [] };
        const budgetTotal = projectBudget.total;
        const used = 0; // 暂时设为0，实际应从支出表获取
        const percentage = budgetTotal > 0 ? Math.round((used / budgetTotal) * 100) : 0;
        
        return {
          id: project.id,
          title: project.title,
          project_code: project.project_code,
          status: project.status,
          start_date: project.start_date,
          end_date: project.end_date,
          budget: budgetTotal,
          approved_budget: approvedBudget,
          used: used,
          balance: budgetTotal - used,
          percentage: percentage,
          categories: projectBudget.categories,
          progress_status: getProjectProgressStatus(project.status)
        };
      });
      
      sendResponse(res, 200, {
        success: true,
        data: result,
        total_projects: projects.length
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

  // 5. 获取单个项目的预算详情
  if (pathname.match(/^\/api\/projects\/[^\/]+\/budgets$/) && req.method === 'GET') {
    const token = req.headers.authorization;
    const user = await verifyToken(token);
    
    if (!user) {
      sendResponse(res, 401, {
        success: false,
        error: '认证失败'
      });
      return;
    }
    
    const projectId = pathname.split('/')[3];
    
    try {
      // 检查权限
      const [projects] = await pool.query(
        'SELECT applicant_id, manager_id FROM `Project` WHERE id = ?',
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
      const isOwner = project.applicant_id === user.id;
      const isManager = project.manager_id === user.id;
      const hasAdminAccess = checkPermission(user.role, ['admin', 'project_manager']);
      
      if (!isOwner && !isManager && !hasAdminAccess) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限查看此项目的预算'
        });
        return;
      }
      
      // 获取预算明细
      const [budgets] = await pool.query(`
        SELECT 
          id,
          category,
          item_name,
          description,
          amount,
          sort_order,
          created_at
        FROM \`ProjectBudget\`
        WHERE project_id = ?
        ORDER BY sort_order ASC, created_at ASC
      `, [projectId]);
      
      // 计算分类汇总
      const categorySummary = {};
      budgets.forEach(item => {
        if (!categorySummary[item.category]) {
          categorySummary[item.category] = {
            total: 0,
            items: []
          };
        }
        categorySummary[item.category].total += parseFloat(item.amount);
        categorySummary[item.category].items.push(item);
      });
      
      sendResponse(res, 200, {
        success: true,
        data: {
          budgets: budgets,
          category_summary: categorySummary,
          total_budget: budgets.reduce((sum, item) => sum + parseFloat(item.amount), 0)
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

  // 辅助函数
  function getCategoryStatusByPercentage(percentage) {
    if (percentage >= 90) return 'danger';
    if (percentage >= 70) return 'warning';
    return 'normal';
  }

  function getProjectProgressStatus(status) {
    const statusMap = {
      'approved': 'not_started',
      'incubating': 'in_progress',
      'completed': 'completed'
    };
    return statusMap[status] || 'not_started';
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
          pb.id,
          pb.project_id,
          pb.category,
          pb.item_name,
          pb.description,
          pb.amount,
          pb.sort_order,
          pb.created_at,
          p.title as project_title,
          p.project_code,
          p.status as project_status
        FROM \`ProjectBudget\` pb
        LEFT JOIN \`Project\` p ON pb.project_id = p.id
        WHERE 1=1
      `;
      
      let countSql = 'SELECT COUNT(*) as total FROM `ProjectBudget` pb LEFT JOIN `Project` p ON pb.project_id = p.id WHERE 1=1';
      const params = [];
      const countParams = [];
      
      // 权限过滤：普通用户只能看到自己项目的预算
      if (!checkPermission(user.role, ['admin', 'project_manager'])) {
        sql += ' AND p.applicant_id = ?';
        countSql += ' AND p.applicant_id = ?';
        params.push(user.id);
        countParams.push(user.id);
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
      
      sql += ' ORDER BY pb.sort_order ASC, pb.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);
      
      console.log('🔍 执行预算查询SQL:', sql);
      
      const [rows] = await pool.query(sql, params);
      const [totalResult] = await pool.query(countSql, countParams);
      const total = totalResult[0]?.total || 0;
      
      // 计算每个预算项目的使用情况（没有支出记录，使用金额设为0）
      for (const budget of rows) {
        budget.used_amount = 0; // 暂时设为0，实际应从支出表获取
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
      const isAdmin = checkPermission(user.role, ['admin', 'project_manager']);
      
      if (!isOwner && !isAdmin) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限为此项目创建预算'
        });
        return;
      }
      
      // 生成预算ID
      const budgetId = randomUUID();
      
      // 插入预算记录（表仅含 description，无 calculation_method/justification）
      const mergedDescCreate = [body.description, body.justification].filter(Boolean).join('\n').trim() || body.description || '';
      const sql = `
        INSERT INTO \`ProjectBudget\` (
          id, project_id, category, item_name, description,
          amount, sort_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      
      const params = [
        budgetId,
        body.project_id,
        body.category,
        body.item_name,
        mergedDescCreate,
        parseFloat(body.amount),
        body.sort_order || 0
      ];
      
      console.log('📝 执行创建预算SQL:', sql);
      
      await pool.query(sql, params);
      
      // 获取新创建的预算
      const [newBudgets] = await pool.query(
        `SELECT 
          pb.id,
          pb.project_id,
          pb.category,
          pb.item_name,
          pb.description,
          pb.amount,
          pb.sort_order,
          pb.created_at,
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
      const isAdmin = checkPermission(user.role, ['admin', 'project_manager']);
      
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
        'amount', 'sort_order'
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
      const isAdmin = checkPermission(user.role, ['admin', 'project_manager']);
      
      if (!isOwner && !isAdmin) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限删除此预算'
        });
        return;
      }
      
      // 删除预算（新数据库没有支出记录，直接删除）
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
      const isManager = project.manager_id === user.id;
      const isAdmin = checkPermission(user.role, ['admin', 'project_manager']);
      const [isMember] = await pool.query(
        'SELECT id FROM `ProjectMember` WHERE project_id = ? AND user_id = ?',
        [projectId, user.id]
      );
      
      if (!isOwner && !isManager && !isAdmin && isMember.length === 0) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限查看此项目的预算'
        });
        return;
      }
      
      // 获取项目预算
      const [budgets] = await pool.query(
        'SELECT * FROM `ProjectBudget` WHERE project_id = ? ORDER BY sort_order ASC, created_at ASC',
        [projectId]
      );
      
      // 计算每个预算的使用情况（没有支出记录，使用金额设为0）
      for (const budget of budgets) {
        budget.used_amount = 0; // 暂时设为0
        budget.balance = budget.amount - budget.used_amount;
        budget.usage_rate = budget.amount > 0 ? Math.round((budget.used_amount / budget.amount) * 100) : 0;
        budget.record_count = 0;
      }
      
      // 按分类汇总
      const categorySummary = {};
      budgets.forEach(budget => {
        if (!categorySummary[budget.category]) {
          categorySummary[budget.category] = {
            total: 0,
            items: []
          };
        }
        categorySummary[budget.category].total += parseFloat(budget.amount);
        categorySummary[budget.category].items.push(budget);
      });
      
      sendResponse(res, 200, {
        success: true,
        data: {
          budgets: budgets,
          category_summary: categorySummary,
          total_budget: budgets.reduce((sum, item) => sum + parseFloat(item.amount), 0),
          project: {
            id: project.id,
            title: project.title,
            project_code: project.project_code,
            status: project.status
          }
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

  // 6. 获取预算执行进度（按项目汇总）
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
    
    console.log('📊 获取预算执行进度，用户:', user.id);
    
    try {
      // 获取用户的项目（已批准或孵化中）
      let projectsSql = `
        SELECT 
          id,
          title,
          project_code,
          budget_total,
          approved_budget,
          status
        FROM \`Project\`
        WHERE applicant_id = ?
        ORDER BY created_at DESC
      `;
      const params = [user.id];
      
      // 管理员可以查看所有项目
      if (checkPermission(user.role, ['admin', 'project_manager'])) {
        projectsSql = `
          SELECT 
            id,
            title,
            project_code,
            budget_total,
            approved_budget,
            status
          FROM \`Project\`
          WHERE status IN ('approved', 'incubating', 'completed')
          ORDER BY created_at DESC
        `;
        params.length = 0;
      }
      
      const [projects] = await pool.query(projectsSql, params);
      
      if (projects.length === 0) {
        sendResponse(res, 200, {
          success: true,
          data: []
        });
        return;
      }
      
      const projectIds = projects.map(p => p.id);
      const placeholders = projectIds.map(() => '?').join(',');
      
      // 获取每个项目的预算汇总
      const [budgetSummary] = await pool.query(`
        SELECT 
          project_id,
          SUM(amount) as total_budget
        FROM \`ProjectBudget\`
        WHERE project_id IN (${placeholders})
        GROUP BY project_id
      `, projectIds);
      
      const budgetMap = {};
      budgetSummary.forEach(b => {
        budgetMap[b.project_id] = parseFloat(b.total_budget);
      });
      
      // 构建结果
      const result = projects.map(project => {
        const budget = budgetMap[project.id] || 0;
        const approvedBudget = parseFloat(project.approved_budget || project.budget_total || 0);
        const used = 0; // 暂时设为0
        const remaining = budget - used;
        const percentage = budget > 0 ? Math.round((used / budget) * 100) : 0;
        
        return {
          id: project.id,
          title: project.title,
          project_code: project.project_code,
          status: project.status,
          budget: budget,
          approved_budget: approvedBudget,
          used: used,
          remaining: remaining,
          percentage: percentage
        };
      });
      
      sendResponse(res, 200, {
        success: true,
        data: result
      });
      
    } catch (error) {
      console.error('获取预算执行进度失败:', error);
      sendResponse(res, 500, {
        success: false,
        error: '获取预算执行进度失败',
        message: error.message
      });
    }
    return;
  }

  // 7. 获取预算分类统计
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
    
    console.log('📊 获取预算分类统计，用户:', user.id);
    
    try {
      // 获取用户的项目
      let projectsSql = `
        SELECT id FROM \`Project\`
        WHERE applicant_id = ?
          AND status IN ('approved', 'incubating', 'completed')
      `;
      const params = [user.id];
      
      if (checkPermission(user.role, ['admin', 'project_manager'])) {
        projectsSql = `
          SELECT id FROM \`Project\`
          WHERE status IN ('approved', 'incubating', 'completed')
        `;
        params.length = 0;
      }
      
      const [projects] = await pool.query(projectsSql, params);
      
      if (projects.length === 0) {
        sendResponse(res, 200, {
          success: true,
          data: []
        });
        return;
      }
      
      const projectIds = projects.map(p => p.id);
      const placeholders = projectIds.map(() => '?').join(',');
      
      // 按分类统计预算
      const [categoryStats] = await pool.query(`
        SELECT 
          category,
          COUNT(*) as item_count,
          SUM(amount) as total_budget
        FROM \`ProjectBudget\`
        WHERE project_id IN (${placeholders})
        GROUP BY category
        ORDER BY total_budget DESC
      `, projectIds);
      
      // 计算每个分类的使用率（暂时设为0）
      const result = categoryStats.map(stat => ({
        category: stat.category,
        budget: parseFloat(stat.total_budget),
        used: 0,
        balance: parseFloat(stat.total_budget),
        percentage: 0,
        status: 'normal',
        item_count: stat.item_count
      }));
      
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
  // ==================== 预算支出管理API（基于ProjectBudget表） ====================

  // 1. 获取预算支出统计（替代支出统计）
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
      let projectsSql = `
        SELECT id, approved_budget 
        FROM \`Project\` 
        WHERE applicant_id = ?
          AND status IN ('approved', 'incubating', 'completed')
      `;
      const params = [user.id];
      
      if (checkPermission(user.role, ['admin', 'project_manager'])) {
        projectsSql = `
          SELECT id, approved_budget 
          FROM \`Project\` 
          WHERE status IN ('approved', 'incubating', 'completed')
        `;
        params.length = 0;
      }
      
      const [projects] = await pool.query(projectsSql, params);
      
      let totalBudget = 0;
      let totalUsed = 0;
      let budgetCount = 0;
      
      if (projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        const placeholders = projectIds.map(() => '?').join(',');
        
        // 获取预算总额
        const [budgetResult] = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) as total_budget, COUNT(*) as count
          FROM \`ProjectBudget\`
          WHERE project_id IN (${placeholders})`,
          projectIds
        );
        
        totalBudget = parseFloat(budgetResult[0]?.total_budget || 0);
        budgetCount = parseInt(budgetResult[0]?.count || 0);

        // 无 ProjectBudget 明细时，用项目表批准预算汇总（与库表字段一致，无 budget_total 列）
        if (totalBudget <= 0) {
          const fromApproved = projects.reduce(
            (sum, p) => sum + parseFloat(p.approved_budget || 0),
            0,
          );
          if (fromApproved > 0) {
            totalBudget = fromApproved;
            budgetCount = projects.length;
          }
        }
        
        // 获取已使用金额（从预算明细中，实际使用金额需要支出记录，这里暂时设为0）
        totalUsed = 0;
      }
      
      // 计算趋势（简化版）
      const totalTrend = 0;
      
      const stats = {
        total_expenditure: totalUsed,
        total_budget: totalBudget,
        total_trend: totalTrend,
        pending_amount: 0,
        pending_count: 0,
        approved_amount: totalUsed,
        approved_count: budgetCount,
        avg_amount: budgetCount > 0 ? totalBudget / budgetCount : 0,
        budget_count: budgetCount,
        used_percent: totalBudget > 0 ? Math.round((totalUsed / totalBudget) * 100) : 0
      };
      
      sendResponse(res, 200, {
        success: true,
        data: stats
      });
      
    } catch (error) {
      console.error('获取预算统计失败:', error);
      sendResponse(res, 500, {
        success: false,
        error: '获取预算统计失败',
        message: error.message
      });
    }
    return;
  }

  // 2. 获取预算分类统计（替代支出分类统计）
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
      let projectsSql = `
        SELECT id FROM \`Project\` 
        WHERE applicant_id = ?
          AND status IN ('approved', 'incubating', 'completed')
      `;
      const params = [user.id];
      
      if (checkPermission(user.role, ['admin', 'project_manager'])) {
        projectsSql = `
          SELECT id FROM \`Project\` 
          WHERE status IN ('approved', 'incubating', 'completed')
        `;
        params.length = 0;
      }
      
      const [projects] = await pool.query(projectsSql, params);
      
      let categoryStats = [];
      
      if (projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        const placeholders = projectIds.map(() => '?').join(',');
        
        // 按分类统计预算
        const [stats] = await pool.query(
          `SELECT 
            category,
            COUNT(*) as count,
            COALESCE(SUM(amount), 0) as total_amount
          FROM \`ProjectBudget\`
          WHERE project_id IN (${placeholders})
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
      console.error('获取预算分类统计失败:', error);
      sendResponse(res, 500, {
        success: false,
        error: '获取预算分类统计失败',
        message: error.message
      });
    }
    return;
  }

  // 3. 获取预算列表（替代支出列表）
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
      search
    } = query;
    
    const offset = (page - 1) * limit;
    
    try {
      // 构建查询SQL（从ProjectBudget表查询）
      let sql = `
        SELECT 
          pb.id,
          pb.project_id,
          pb.category,
          pb.item_name,
          pb.description,
          pb.amount,
          pb.sort_order,
          pb.created_at,
          p.title as project_title,
          p.project_code,
          p.status as project_status,
          u.name as applicant_name
        FROM \`ProjectBudget\` pb
        LEFT JOIN \`Project\` p ON pb.project_id = p.id
        LEFT JOIN \`User\` u ON p.applicant_id = u.id
        WHERE 1=1
      `;
      
      let countSql = 'SELECT COUNT(*) as total FROM `ProjectBudget` pb LEFT JOIN `Project` p ON pb.project_id = p.id WHERE 1=1';
      const params = [];
      const countParams = [];
      
      // 权限过滤
      if (!checkPermission(user.role, ['admin', 'project_manager'])) {
        sql += ' AND p.applicant_id = ?';
        countSql += ' AND p.applicant_id = ?';
        params.push(user.id);
        countParams.push(user.id);
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
      
      // 状态筛选（预算状态根据使用率判断）
      if (status === 'normal') {
        sql += ' AND pb.amount > 0';
      } else if (status === 'warning') {
        // 预警状态需要根据使用率判断，这里简化处理
        sql += ' AND pb.amount > 0';
      } else if (status === 'danger') {
        sql += ' AND pb.amount > 0';
      }
      
      sql += ' ORDER BY pb.sort_order ASC, pb.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);
      
      const [rows] = await pool.query(sql, params);
      const [totalResult] = await pool.query(countSql, countParams);
      const total = totalResult[0]?.total || 0;
      
      // 计算使用率（暂时设为0）
      for (const budget of rows) {
        budget.used_amount = 0;
        budget.balance = budget.amount - budget.used_amount;
        budget.usage_rate = budget.amount > 0 ? Math.round((budget.used_amount / budget.amount) * 100) : 0;
        budget.status = budget.usage_rate >= 90 ? 'warning' : (budget.usage_rate >= 100 ? 'danger' : 'normal');
        budget.expense_no = `BUD-${budget.id.substring(0, 8).toUpperCase()}`;
        budget.expense_date = formatDate(budget.created_at);
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

  // 4. 提交预算（替代提交支出申请）
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
    
    const budgetId = pathname.replace('/api/expenditures/', '').replace('/submit', '');
    
    console.log('📨 提交预算:', budgetId);
    
    try {
      const [budgets] = await pool.query(
        'SELECT * FROM `ProjectBudget` WHERE id = ?',
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
      
      // 检查权限
      const [projects] = await pool.query(
        'SELECT applicant_id FROM `Project` WHERE id = ?',
        [budget.project_id]
      );
      
      if (projects.length === 0 || projects[0].applicant_id !== user.id) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限提交此预算'
        });
        return;
      }
      
      // 预算已经存在，无需提交，直接返回成功
      sendResponse(res, 200, {
        success: true,
        message: '预算已保存',
        budget_id: budgetId
      });
      
    } catch (error) {
      console.error('提交预算失败:', error);
      sendResponse(res, 500, {
        success: false,
        error: '提交预算失败',
        message: error.message
      });
    }
    return;
  }

  // 5. 删除预算
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
    
    const budgetId = pathname.replace('/api/expenditures/', '');
    
    console.log('🗑️ 删除预算:', budgetId);
    
    try {
      const [budgets] = await pool.query(
        'SELECT * FROM `ProjectBudget` WHERE id = ?',
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
      
      // 检查权限
      const [projects] = await pool.query(
        'SELECT applicant_id FROM `Project` WHERE id = ?',
        [budget.project_id]
      );
      
      const isOwner = projects.length > 0 && projects[0].applicant_id === user.id;
      const isAdmin = checkPermission(user.role, ['admin', 'project_manager']);
      
      if (!isOwner && !isAdmin) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限删除此预算'
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
        message: error.message
      });
    }
    return;
  }

  // 6. 导出预算数据
  if (pathname === '/api/expenditures/export' && req.method === 'GET') {
    const token = req.headers.authorization;
    const user = await verifyToken(token);
    
    if (!user) {
      sendResponse(res, 401, {
        success: false,
        error: '认证失败'
      });
      return;
    }
    
    const { project_id, category, search, ids } = query;
    
    try {
      let sql = `
        SELECT 
          pb.category as 预算类别,
          pb.item_name as 预算事项,
          pb.description as 说明,
          pb.amount as 预算金额,
          p.title as 项目名称,
          p.project_code as 项目编号,
          pb.created_at as 创建时间
        FROM \`ProjectBudget\` pb
        LEFT JOIN \`Project\` p ON pb.project_id = p.id
        WHERE 1=1
      `;
      const params = [];
      
      // 权限过滤
      if (!checkPermission(user.role, ['admin', 'project_manager'])) {
        sql += ' AND p.applicant_id = ?';
        params.push(user.id);
      }
      
      // 按ID列表导出
      if (ids) {
        const idList = ids.split(',');
        const placeholders = idList.map(() => '?').join(',');
        sql += ` AND pb.id IN (${placeholders})`;
        params.push(...idList);
      }
      
      if (project_id) {
        sql += ' AND pb.project_id = ?';
        params.push(project_id);
      }
      
      if (category) {
        sql += ' AND pb.category = ?';
        params.push(category);
      }
      
      if (search) {
        sql += ' AND (p.title LIKE ? OR pb.item_name LIKE ? OR pb.description LIKE ?)';
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam);
      }
      
      sql += ' ORDER BY pb.created_at DESC';
      
      const [rows] = await pool.query(sql, params);
      
      // 设置响应头，返回CSV文件
      const csvRows = [];
      if (rows.length > 0) {
        const headers = Object.keys(rows[0]);
        csvRows.push(headers.join(','));
        
        for (const row of rows) {
          const values = headers.map(header => {
            const value = row[header] || '';
            return `"${String(value).replace(/"/g, '""')}"`;
          });
          csvRows.push(values.join(','));
        }
      }
      
      const csvContent = csvRows.join('\n');
      const fileName = `预算记录_${new Date().toISOString().slice(0, 10)}.csv`;
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf-8'));
      res.end('\uFEFF' + csvContent);
      
    } catch (error) {
      console.error('导出预算数据失败:', error);
      sendResponse(res, 500, {
        success: false,
        error: '导出预算数据失败',
        message: error.message
      });
    }
    return;
  }

  // 辅助函数：格式化日期
  function formatDate(date) {
    if (!date) return null;
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  // ==================== 支出申请API ====================

  // 创建支出申请（新增）
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
    
    console.log('📝 创建支出申请，用户:', user.id);
    
    try {
      const body = await parseRequestBody(req);
      
      console.log('📥 支出申请数据:', body);
      
      // 验证必填字段
      if (!body.project_id || !body.budget_id || !body.category || !body.amount) {
        sendResponse(res, 400, {
          success: false,
          error: '项目ID、预算ID、类别和金额是必填字段'
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
      
      // 检查权限：只有项目申请人可以申请支出
      const isOwner = project.applicant_id === user.id;
      const isAdmin = checkPermission(user.role, ['admin', 'project_manager']);
      
      if (!isOwner && !isAdmin) {
        sendResponse(res, 403, {
          success: false,
          error: '没有权限为此项目申请支出'
        });
        return;
      }
      
      // 检查项目状态是否允许申请支出
      if (!['approved', 'incubating'].includes(project.status)) {
        sendResponse(res, 409, {
          success: false,
          error: '项目当前状态不允许申请支出',
          project_status: project.status
        });
        return;
      }
      
      // 验证预算项是否存在
      const [budgets] = await pool.query(
        'SELECT * FROM `ProjectBudget` WHERE id = ? AND project_id = ?',
        [body.budget_id, body.project_id]
      );
      
      if (budgets.length === 0) {
        sendResponse(res, 404, {
          success: false,
          error: '预算项不存在或不属于该项目'
        });
        return;
      }
      
      const budget = budgets[0];
      const currentUsed = budget.used_amount || 0;
      const newUsed = currentUsed + parseFloat(body.amount);
      
      // 检查预算是否足够
      if (newUsed > budget.amount) {
        sendResponse(res, 409, {
          success: false,
          error: '申请金额超过预算余额',
          budget_amount: budget.amount,
          used_amount: currentUsed,
          available: budget.amount - currentUsed,
          requested: parseFloat(body.amount)
        });
        return;
      }
      
      // 生成支出申请编号
      const expenseNo = `EXP-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const expenditureId = randomUUID();
      
      // 插入支出申请记录
      const sql = `
        INSERT INTO \`ExpenditureRecord\` (
          id, project_id, budget_id, expense_no, category, item_name,
          amount, description, calculation_method, payee_name, payee_type,
          bank_account, bank_name, status, applicant_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      
      const params = [
        expenditureId,
        body.project_id,
        body.budget_id,
        expenseNo,
        body.category,
        body.item_name || budget.item_name,
        parseFloat(body.amount),
        body.description || '',
        body.calculation_method || '',
        body.payee_name || '',
        body.payee_type || 'company',
        body.bank_account || '',
        body.bank_name || '',
        'submitted',
        user.id
      ];
      
      console.log('📝 执行创建支出申请SQL:', sql);
      
      await pool.query(sql, params);
      
      // 可选：更新预算已使用金额（可以在审批通过后更新，这里先不更新）
      
      // 获取新创建的支出申请
      const [newExpenditures] = await pool.query(
        `SELECT 
          er.*,
          p.title as project_title,
          p.project_code,
          b.item_name as budget_item_name,
          u.name as applicant_name
        FROM \`ExpenditureRecord\` er
        LEFT JOIN \`Project\` p ON er.project_id = p.id
        LEFT JOIN \`ProjectBudget\` b ON er.budget_id = b.id
        LEFT JOIN \`User\` u ON er.applicant_id = u.id
        WHERE er.id = ?`,
        [expenditureId]
      );
      
      sendResponse(res, 201, {
        success: true,
        message: '支出申请提交成功',
        data: {
          id: expenditureId,
          expense_no: expenseNo,
          ...newExpenditures[0]
        }
      });
      
    } catch (error) {
      console.error('创建支出申请失败:', error);
      sendResponse(res, 500, {
        success: false,
        error: '创建支出申请失败',
        message: error.message,
        sqlMessage: error.sqlMessage
      });
    }
    return;
  }

  // ==================== 获取支出申请列表 ====================

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
      search
    } = query;
    
    const offset = (page - 1) * limit;
    
    try {
      let sql = `
        SELECT 
          er.*,
          p.title as project_title,
          p.project_code,
          b.item_name as budget_item_name,
          u.name as applicant_name,
          r.name as reviewer_name
        FROM \`ExpenditureRecord\` er
        LEFT JOIN \`Project\` p ON er.project_id = p.id
        LEFT JOIN \`ProjectBudget\` b ON er.budget_id = b.id
        LEFT JOIN \`User\` u ON er.applicant_id = u.id
        LEFT JOIN \`User\` r ON er.reviewer_id = r.id
        WHERE 1=1
      `;
      
      let countSql = 'SELECT COUNT(*) as total FROM `ExpenditureRecord` er WHERE 1=1';
      const params = [];
      const countParams = [];
      
      // 权限过滤
      if (!checkPermission(user.role, ['admin', 'project_manager'])) {
        sql += ' AND er.applicant_id = ?';
        countSql += ' AND er.applicant_id = ?';
        params.push(user.id);
        countParams.push(user.id);
      }
      
      // 状态筛选
      if (status) {
        const statusList = status.split(',');
        sql += ` AND er.status IN (${statusList.map(() => '?').join(',')})`;
        countSql += ` AND er.status IN (${statusList.map(() => '?').join(',')})`;
        params.push(...statusList);
        countParams.push(...statusList);
      }
      
      // 项目筛选
      if (project_id) {
        sql += ' AND er.project_id = ?';
        countSql += ' AND er.project_id = ?';
        params.push(project_id);
        countParams.push(project_id);
      }
      
      // 类别筛选
      if (category) {
        sql += ' AND er.category = ?';
        countSql += ' AND er.category = ?';
        params.push(category);
        countParams.push(category);
      }
      
      // 搜索
      if (search) {
        sql += ' AND (er.item_name LIKE ? OR er.description LIKE ?)';
        countSql += ' AND (er.item_name LIKE ? OR er.description LIKE ?)';
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam);
        countParams.push(searchParam, searchParam);
      }
      
      sql += ' ORDER BY er.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);
      
      const [rows] = await pool.query(sql, params);
      const [totalResult] = await pool.query(countSql, countParams);
      const total = totalResult[0]?.total || 0;
      
      sendResponse(res, 200, {
        success: true,
        data: rows,
        total: total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      });
      
    } catch (error) {
      console.error('获取支出申请列表失败:', error);
      sendResponse(res, 500, {
        success: false,
        error: '获取支出申请列表失败',
        message: error.message
      });
    }
    return;
  }

  // ==================== 获取支出申请统计 ====================

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
      // 获取用户的项目预算
      let projectsSql = `
        SELECT id, approved_budget 
        FROM \`Project\` 
        WHERE applicant_id = ?
          AND status IN ('approved', 'incubating')
      `;
      const params = [user.id];
      
      if (checkPermission(user.role, ['admin', 'project_manager'])) {
        projectsSql = `
          SELECT id, approved_budget 
          FROM \`Project\` 
          WHERE status IN ('approved', 'incubating')
        `;
        params.length = 0;
      }
      
      const [projects] = await pool.query(projectsSql, params);
      
      let totalBudget = 0;
      let totalUsed = 0;
      let budgetCount = 0;
      
      if (projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        const placeholders = projectIds.map(() => '?').join(',');
        
        // 获取预算总额
        const [budgetResult] = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) as total_budget, COUNT(*) as count
          FROM \`ProjectBudget\`
          WHERE project_id IN (${placeholders})`,
          projectIds
        );
        
        totalBudget = parseFloat(budgetResult[0]?.total_budget || 0);
        budgetCount = parseInt(budgetResult[0]?.count || 0);

        if (totalBudget <= 0) {
          const fromApproved = projects.reduce(
            (sum, p) => sum + parseFloat(p.approved_budget || 0),
            0,
          );
          if (fromApproved > 0) {
            totalBudget = fromApproved;
            budgetCount = projects.length;
          }
        }
        
        // 获取已批准的支出总额
        const [expenditureResult] = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) as total_used
          FROM \`ExpenditureRecord\`
          WHERE project_id IN (${placeholders}) AND status = 'approved'`,
          projectIds
        );
        
        totalUsed = parseFloat(expenditureResult[0]?.total_used || 0);
      }
      
      const stats = {
        total_budget: totalBudget,
        used_amount: totalUsed,
        remaining_amount: totalBudget - totalUsed,
        used_percent: totalBudget > 0 ? Math.round((totalUsed / totalBudget) * 100) : 0,
        budget_count: budgetCount,
        pending_count: 0,
        approved_count: 0
      };
      
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
        const isAdmin = checkPermission(user.role, ['admin', 'project_manager']);
        
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
        
        if (project_ids && !checkPermission(user.role, ['admin', 'project_manager'])) {
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
          ${!checkPermission(user.role, ['admin', 'project_manager']) ? 'AND pa.created_by = ?' : ''}
        `;
        
        if (!checkPermission(user.role, ['admin', 'project_manager'])) {
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
        
        if (!checkPermission(user.role, ['admin', 'project_manager'])) {
          prevParams.push(user.id);
        }
        
        const prevSummaryQuery = `
          SELECT 
            COUNT(*) as prev_total,
            SUM(CASE WHEN pa.status IN ('verified', 'published') THEN 1 ELSE 0 END) as prev_approved
          FROM \`ProjectAchievement\` pa
          WHERE pa.created_at BETWEEN ? AND ?
          ${projectFilter}
          ${!checkPermission(user.role, ['admin', 'project_manager']) ? 'AND pa.created_by = ?' : ''}
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
          ${!checkPermission(user.role, ['admin', 'project_manager']) ? 'AND pa.created_by = ?' : ''}
        `;
        
        if (!checkPermission(user.role, ['admin', 'project_manager'])) {
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
          ${!checkPermission(user.role, ['admin', 'project_manager']) ? 'AND pa.created_by = ?' : ''}
          GROUP BY ${groupByField}
          ORDER BY count DESC
        `;
        
        const distributionParams = [total, ...params.slice(2)];
        
        if (!checkPermission(user.role, ['admin', 'project_manager'])) {
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
          ${!checkPermission(user.role, ['admin', 'project_manager']) ? 'AND pa.created_by = ?' : ''}
          GROUP BY DATE_FORMAT(pa.created_at, '${dateFormat}')
          ORDER BY date
        `;
        
        if (!checkPermission(user.role, ['admin', 'project_manager'])) {
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
        
        if (checkPermission(user.role, ['admin', 'project_manager'])) {
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
          ${!checkPermission(user.role, ['admin', 'project_manager']) ? 'AND pa.created_by = ?' : ''}
          GROUP BY pa.type
        `;
        
        let countQuery = `
          SELECT COUNT(DISTINCT pa.type) as total
          FROM \`ProjectAchievement\` pa
          WHERE pa.created_at BETWEEN ? AND ?
          ${!checkPermission(user.role, ['admin', 'project_manager']) ? 'AND pa.created_by = ?' : ''}
        `;
        
        const params = [startDateStr, endDateStr];
        const countParams = [startDateStr, endDateStr];
        
        if (!checkPermission(user.role, ['admin', 'project_manager'])) {
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
          ${!checkPermission(user.role, ['admin', 'project_manager']) ? 'AND pa.created_by = ?' : ''}
          GROUP BY pa.type
        `;
        
        const prevParams = [prevStartDateStr, prevEndDateStr];
        if (!checkPermission(user.role, ['admin', 'project_manager'])) {
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
              ${!checkPermission(user.role, ['admin', 'project_manager']) ? 'AND pa.created_by = ?' : ''}
              ORDER BY pa.created_at DESC
            `, checkPermission(user.role, ['admin', 'project_manager']) ? [] : [user.id]);
            
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
              ${!checkPermission(user.role, ['admin', 'project_manager']) ? 'AND p.applicant_id = ?' : ''}
              ORDER BY p.created_at DESC
            `, checkPermission(user.role, ['admin', 'project_manager']) ? [] : [user.id]);
            
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
      if (!user || !checkPermission(user.role, ['admin', 'project_manager'])) {
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
            SUM(CASE WHEN role = 'project_manager' THEN 1 ELSE 0 END) as assistants,
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
      if (!canManageUsers(user.role)) {
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
      
      // 与 canManageUsers 一致（含项目经理）
      if (!canManageUsers(user.role)) {
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
            SUM(CASE WHEN role = 'project_manager' THEN 1 ELSE 0 END) as assistants,
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
      if (!canManageUsers(user.role)) {
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
        const validRoles = ['applicant', 'reviewer', 'project_manager', 'admin'];
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
      if (!canManageUsers(user.role)) {
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
      if (!canManageUsers(adminUser.role)) {
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
      if (!canManageUsers(adminUser.role)) {
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
      if (!canManageUsers(adminUser.role)) {
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
      if (!canManageUsers(adminUser.role)) {
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
      if (!canManageUsers(adminUser.role)) {
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
      if (!canManageUsers(adminUser.role)) {
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
      if (!canManageUsers(adminUser.role)) {
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
    // ==================== 评审专家仪表板API ====================

    const parseAssignmentReviewComment = (commentText) => {
      if (!commentText || typeof commentText !== 'string') return {};
      try {
        const parsed = JSON.parse(commentText);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return { comments: commentText };
      }
    };
    const buildAssignmentReviewComment = (payload) =>
      JSON.stringify({ type: 'expert_review', updated_at: new Date().toISOString(), ...payload });
    const recommendationToAssignmentStatus = (recommendation) => {
      if (recommendation === 'reject') return 'declined';
      if (
        recommendation === 'approve' ||
        recommendation === 'approve_with_revision' ||
        recommendation === 'resubmit'
      ) {
        return 'accepted';
      }
      return 'reviewing';
    };
    const assignmentStatusToRecommendation = (status, fallback = '') => {
      if (status === 'accepted') return 'approve';
      if (status === 'declined') return 'reject';
      return fallback;
    };

    if (pathname === '/api/reviewer/dashboard' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      if (!user || user.role !== 'reviewer') {
        sendResponse(res, 403, { success: false, error: '没有权限访问评审专家仪表板' });
        return;
      }
      try {
        const [pendingCountResult] = await pool.query(`
          SELECT COUNT(*) as count
          FROM \`ExpertAssignment\` ea
          INNER JOIN \`Project\` p ON ea.project_id = p.id
          WHERE ea.expert_id = ?
            AND ea.status = 'reviewing'
            AND p.status IN ('under_review', 'batch_review')
        `, [user.id]);
        const [completedCountResult] = await pool.query(`
          SELECT COUNT(*) as count
          FROM \`ExpertAssignment\`
          WHERE expert_id = ? AND status IN ('accepted', 'declined')
        `, [user.id]);
        const [approvalRateResult] = await pool.query(`
          SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'accepted' THEN 1 END) as recommended
          FROM \`ExpertAssignment\`
          WHERE expert_id = ? AND status IN ('accepted', 'declined')
        `, [user.id]);
        const [totalCommentsResult] = await pool.query(`
          SELECT SUM(CHAR_LENGTH(comment)) as total_chars
          FROM \`ExpertAssignment\`
          WHERE expert_id = ? AND status IN ('accepted', 'declined') AND comment IS NOT NULL
        `, [user.id]);
        const totalReviewed = approvalRateResult[0]?.total || 0;
        const recommendedCount = approvalRateResult[0]?.recommended || 0;
        const approvalRate = totalReviewed > 0 ? Math.round((recommendedCount / totalReviewed) * 100) : 0;

        const [userInfoResult] = await pool.query(`
          SELECT u.id, u.username, u.name, u.email, u.department, u.title, u.status,
                 ep.expertise_description
          FROM \`User\` u
          LEFT JOIN \`ExpertProfile\` ep ON u.id = ep.id
          WHERE u.id = ?
        `, [user.id]);
        let researchField = null;
        if (userInfoResult[0]?.id) {
          const [expertDomains] = await pool.query(`
            SELECT GROUP_CONCAT(rd.name SEPARATOR ', ') as research_fields
            FROM \`ExpertDomain\` ed
            LEFT JOIN \`ResearchDomain\` rd ON ed.domain_id = rd.id
            WHERE ed.expert_id = ?
          `, [user.id]);
          researchField = expertDomains[0]?.research_fields || null;
        }
        const userInfo = userInfoResult[0] || { name: '评审专家' };
        sendResponse(res, 200, {
          success: true,
          data: {
            userInfo: { ...userInfo, research_field: researchField },
            stats: {
              pendingCount: pendingCountResult[0]?.count || 0,
              completedCount: completedCountResult[0]?.count || 0,
              averageScore: 0,
              approvalRate,
              highestScore: 0,
              avgReviewTime: 0,
              consistencyRate: 0,
              totalComments: totalCommentsResult[0]?.total_chars || 0
            }
          }
        });
      } catch (error) {
        console.error('获取评审专家仪表板数据失败:', error);
        sendResponse(res, 500, { success: false, error: '获取仪表板数据失败', message: error.message });
      }
      return;
    }

    if (pathname === '/api/reviewer/pending-projects' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      if (!user || user.role !== 'reviewer') {
        sendResponse(res, 403, { success: false, error: '没有权限' });
        return;
      }
      try {
        const query = url.parse(req.url, true).query;
        const limit = parseInt(query.limit, 10) || 10;
        const [projects] = await pool.query(`
          SELECT p.id, p.project_code, p.title,
                 (SELECT GROUP_CONCAT(rd2.name ORDER BY rd2.name SEPARATOR ', ')
                  FROM \`ProjectResearchDomain\` prd2
                  INNER JOIN \`ResearchDomain\` rd2 ON prd2.research_domain_id = rd2.id
                  WHERE prd2.project_id = p.id) as research_field,
                 COALESCE(p.approved_budget, 0) as budget_total,
                 p.submit_date,
                 u.name as applicant_name, u.department as applicant_department, ea.assigned_at, ea.deadline as review_deadline,
                 CASE WHEN ea.deadline <= DATE_ADD(NOW(), INTERVAL 3 DAY) THEN 'urgent'
                      WHEN ea.deadline <= DATE_ADD(NOW(), INTERVAL 7 DAY) THEN 'high'
                      ELSE 'medium' END as priority
          FROM \`ExpertAssignment\` ea
          INNER JOIN \`Project\` p ON ea.project_id = p.id
          LEFT JOIN \`User\` u ON p.applicant_id = u.id
          WHERE ea.expert_id = ?
            AND ea.status = 'reviewing'
            AND p.status IN ('under_review', 'batch_review')
          ORDER BY ea.deadline ASC, ea.assigned_at ASC
          LIMIT ?
        `, [user.id, limit]);
        sendResponse(res, 200, {
          success: true,
          data: projects.map((p) => ({
            id: p.id,
            project_code: p.project_code,
            title: p.title,
            research_field: p.research_field || '未指定',
            budget_total: p.budget_total,
            submit_date: p.submit_date ? new Date(p.submit_date).toISOString().split('T')[0] : null,
            applicant_name: p.applicant_name,
            applicant_department: p.applicant_department,
            assigned_at: p.assigned_at ? p.assigned_at.toISOString() : null,
            review_deadline: p.review_deadline ? new Date(p.review_deadline).toISOString().split('T')[0] : null,
            priority: p.priority || 'medium'
          }))
        });
      } catch (error) {
        console.error('获取待评审项目失败:', error);
        sendResponse(res, 500, { success: false, error: '获取待评审项目失败' });
      }
      return;
    }

    // 评审专家：浏览系统中项目列表（项目浏览页）
    if (pathname === '/api/reviewer/all-projects' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      if (!user || user.role !== 'reviewer') {
        sendResponse(res, 403, { success: false, error: '没有权限' });
        return;
      }
      try {
        const q = url.parse(req.url, true).query;
        const page = Math.max(1, parseInt(q.page, 10) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(q.pageSize, 10) || 20));
        const offset = (page - 1) * pageSize;
        const statusFilter = (q.status || '').trim();
        const categoryFilter = (q.category || '').trim();
        const keyword = (q.keyword || '').trim();

        const whereParts = ['1=1'];
        const params = [];

        if (statusFilter) {
          whereParts.push('p.status = ?');
          params.push(statusFilter);
        }
        if (keyword) {
          const like = `%${keyword}%`;
          whereParts.push(
            '(p.title LIKE ? OR p.project_code LIKE ? OR p.abstract LIKE ? OR IFNULL(u.name, "") LIKE ? OR IFNULL(u.department, "") LIKE ?)'
          );
          params.push(like, like, like, like, like);
        }
        if (categoryFilter) {
          whereParts.push(`EXISTS (
            SELECT 1 FROM \`ProjectResearchDomain\` prd_c
            INNER JOIN \`ResearchDomain\` rd_c ON prd_c.research_domain_id = rd_c.id
            WHERE prd_c.project_id = p.id AND rd_c.name = ?
          )`);
          params.push(categoryFilter);
        }

        const whereSql = `WHERE ${whereParts.join(' AND ')}`;

        const [countRows] = await pool.query(
          `
          SELECT COUNT(*) as total
          FROM \`Project\` p
          LEFT JOIN \`User\` u ON p.applicant_id = u.id
          ${whereSql}
        `,
          params
        );
        const total = countRows[0]?.total || 0;

        const [statRows] = await pool.query(`
          SELECT status, COUNT(*) as c
          FROM \`Project\`
          GROUP BY status
        `);
        const stats = {};
        statRows.forEach((row) => {
          stats[row.status] = row.c;
        });

        const listParams = [...params, pageSize, offset];
        const [rows] = await pool.query(
          `
          SELECT
            p.id,
            p.project_code,
            p.title,
            p.abstract,
            p.status,
            COALESCE(p.approved_budget, 0) as budget_total,
            CASE
              WHEN p.start_date IS NOT NULL AND p.end_date IS NOT NULL
              THEN TIMESTAMPDIFF(MONTH, p.start_date, p.end_date)
              ELSE NULL
            END as duration_months,
            u.name as applicant_name,
            u.department as applicant_department,
            (
              SELECT COUNT(*)
              FROM \`ExpertAssignment\` ea
              WHERE ea.project_id = p.id
            ) as review_count,
            (
              SELECT GROUP_CONCAT(rd2.name ORDER BY rd2.name SEPARATOR ', ')
              FROM \`ProjectResearchDomain\` prd2
              INNER JOIN \`ResearchDomain\` rd2 ON prd2.research_domain_id = rd2.id
              WHERE prd2.project_id = p.id
            ) as research_domains,
            NULL as avg_score
          FROM \`Project\` p
          LEFT JOIN \`User\` u ON p.applicant_id = u.id
          ${whereSql}
          ORDER BY p.updated_at DESC, p.created_at DESC
          LIMIT ? OFFSET ?
        `,
          listParams
        );

        const projects = rows.map((r) => ({
          id: r.id,
          project_code: r.project_code,
          title: r.title,
          abstract: r.abstract,
          status: r.status,
          budget_total: r.budget_total != null ? parseFloat(r.budget_total) : 0,
          duration_months: r.duration_months != null ? r.duration_months : null,
          applicant_name: r.applicant_name || '',
          applicant_department: r.applicant_department || '',
          review_count: r.review_count || 0,
          avg_score: r.avg_score,
          category: r.research_domains || '未分类'
        }));

        sendResponse(res, 200, {
          success: true,
          data: {
            projects,
            pagination: { total, page, pageSize },
            stats
          }
        });
      } catch (error) {
        console.error('获取项目浏览列表失败:', error);
        sendResponse(res, 500, { success: false, error: '获取项目列表失败', message: error.message });
      }
      return;
    }

    if (pathname === '/api/reviewer/recent-reviews' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      if (!user || user.role !== 'reviewer') {
        sendResponse(res, 403, { success: false, error: '没有权限' });
        return;
      }
      try {
        const query = url.parse(req.url, true).query;
        const limit = parseInt(query.limit, 10) || 5;
        const [rows] = await pool.query(`
          SELECT ea.id, ea.project_id, ea.status, ea.comment, ea.assigned_at, p.title as project_title, p.project_code
          FROM \`ExpertAssignment\` ea
          INNER JOIN \`Project\` p ON ea.project_id = p.id
          WHERE ea.expert_id = ? AND ea.status IN ('accepted', 'declined')
          ORDER BY ea.assigned_at DESC
          LIMIT ?
        `, [user.id, limit]);
        const data = rows.map((r) => {
          const parsed = parseAssignmentReviewComment(r.comment);
          return {
            id: r.id,
            project_id: r.project_id,
            project_title: r.project_title,
            project_code: r.project_code,
            recommendation: parsed.recommendation || assignmentStatusToRecommendation(r.status, ''),
            comments: parsed.comments || '',
            suggestions: parsed.suggestions || '',
            submitted_at: r.assigned_at ? r.assigned_at.toISOString() : null,
            review_date: r.assigned_at ? r.assigned_at.toISOString() : null,
          };
        });
        sendResponse(res, 200, { success: true, data });
      } catch (error) {
        console.error('获取最近评审记录失败:', error);
        sendResponse(res, 500, { success: false, error: '获取评审记录失败' });
      }
      return;
    }

    if (pathname === '/api/reviewer/score-distribution' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      if (!user || user.role !== 'reviewer') {
        sendResponse(res, 403, { success: false, error: '没有权限' });
        return;
      }
      try {
        // 与「待评审项目」一致：仅当项目仍处于 under_review / batch_review 时，reviewing 才算「待处理」；
        // 否则易出现分配记录未收尾但项目已流转，图表「待处理」与列表不一致。
        const [distribution] = await pool.query(`
          SELECT CASE WHEN ea.status = 'accepted' THEN '已通过'
                      WHEN ea.status = 'declined' THEN '未通过'
                      WHEN ea.status = 'reviewing' AND p.status IN ('under_review', 'batch_review') THEN '待处理'
                      WHEN ea.status = 'reviewing' THEN '其他'
                      WHEN ea.status = 'expired' THEN '其他'
                      ELSE '其他' END as score_range,
                 COUNT(*) as count
          FROM \`ExpertAssignment\` ea
          INNER JOIN \`Project\` p ON ea.project_id = p.id
          WHERE ea.expert_id = ? AND ea.status IN ('reviewing', 'accepted', 'declined', 'expired')
          GROUP BY score_range
        `, [user.id]);
        const allCategories = [
          { range: '已通过', count: 0, color: '#52c41a' },
          { range: '未通过', count: 0, color: '#ff4d4f' },
          { range: '待处理', count: 0, color: '#faad14' },
          { range: '其他', count: 0, color: '#909399' }
        ];
        distribution.forEach((item) => {
          const found = allCategories.find((cat) => cat.range === item.score_range);
          if (found) found.count = item.count;
        });
        const total = allCategories.reduce((sum, item) => sum + item.count, 0);
        sendResponse(res, 200, {
          success: true,
          data: allCategories.map((item) => ({
            range: item.range,
            count: item.count,
            percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
            color: item.color
          }))
        });
      } catch (error) {
        console.error('获取状态分布失败:', error);
        sendResponse(res, 500, { success: false, error: '获取状态分布失败' });
      }
      return;
    }

    if (pathname === '/api/reviewer/reviews' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      if (!user || user.role !== 'reviewer') {
        sendResponse(res, 403, { success: false, error: '没有权限' });
        return;
      }
      try {
        const query = url.parse(req.url, true).query;
        const page = parseInt(query.page, 10) || 1;
        const limit = parseInt(query.limit, 10) || parseInt(query.pageSize, 10) || 20;
        const offset = (page - 1) * limit;
        const status = query.status;
        let sql = `
          SELECT ea.id, ea.project_id, ea.status as assignment_status, ea.comment, ea.assigned_at,
                 p.project_code, p.title as project_title, p.status as project_status,
                 (SELECT GROUP_CONCAT(rd2.name ORDER BY rd2.name SEPARATOR ', ')
                  FROM \`ProjectResearchDomain\` prd2
                  INNER JOIN \`ResearchDomain\` rd2 ON prd2.research_domain_id = rd2.id
                  WHERE prd2.project_id = p.id) as research_field,
                 u.name as applicant_name, u.department as applicant_department
          FROM \`ExpertAssignment\` ea
          INNER JOIN \`Project\` p ON ea.project_id = p.id
          LEFT JOIN \`User\` u ON p.applicant_id = u.id
          WHERE ea.expert_id = ?
        `;
        const params = [user.id];
        if (status) {
          sql += ' AND ea.status = ?';
          params.push(status);
        } else {
          sql += ' AND ea.status IN ("accepted", "declined")';
        }
        sql += ' ORDER BY ea.assigned_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        let countSql = 'SELECT COUNT(*) as total FROM `ExpertAssignment` ea WHERE ea.expert_id = ?';
        const countParams = [user.id];
        if (status) {
          countSql += ' AND ea.status = ?';
          countParams.push(status);
        } else {
          countSql += ' AND ea.status IN ("accepted", "declined")';
        }
        const [rows] = await pool.query(sql, params);
        const [countRows] = await pool.query(countSql, countParams);
        const total = countRows[0]?.total || 0;
        const data = rows.map((r) => {
          const parsed = parseAssignmentReviewComment(r.comment);
          return {
            id: r.id,
            project_id: r.project_id,
            project_code: r.project_code,
            project_title: r.project_title,
            research_field: r.research_field || '未指定',
            recommendation: parsed.recommendation || assignmentStatusToRecommendation(r.assignment_status, ''),
            comments: parsed.comments || '',
            suggestions: parsed.suggestions || '',
            submitted_at: r.assigned_at ? r.assigned_at.toISOString() : null,
            review_date: r.assigned_at ? r.assigned_at.toISOString() : null,
            applicant_name: r.applicant_name,
            applicant_department: r.applicant_department,
            project_status: r.project_status,
          };
        });
        sendResponse(res, 200, { success: true, data, total, page, limit, pages: Math.ceil(total / limit) });
      } catch (error) {
        console.error('获取评审历史失败:', error);
        sendResponse(res, 500, { success: false, error: '获取评审历史失败' });
      }
      return;
    }

    if (pathname === '/api/reviewer/stats' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      if (!user || user.role !== 'reviewer') {
        sendResponse(res, 403, { success: false, error: '没有权限' });
        return;
      }
      try {
        const [pendingResult] = await pool.query(`
          SELECT COUNT(*) as count FROM \`ExpertAssignment\` ea
          INNER JOIN \`Project\` p ON ea.project_id = p.id
          WHERE ea.expert_id = ? AND ea.status = 'reviewing' AND p.status IN ('under_review','batch_review')
        `, [user.id]);
        const [completedResult] = await pool.query(`
          SELECT COUNT(*) as count FROM \`ExpertAssignment\`
          WHERE expert_id = ? AND status IN ('accepted', 'declined')
        `, [user.id]);
        const [commentsResult] = await pool.query(`
          SELECT SUM(CHAR_LENGTH(comment)) as total_chars FROM \`ExpertAssignment\`
          WHERE expert_id = ? AND status IN ('accepted', 'declined') AND comment IS NOT NULL
        `, [user.id]);
        const [approvalResult] = await pool.query(`
          SELECT COUNT(*) as total, COUNT(CASE WHEN status='accepted' THEN 1 END) as recommended
          FROM \`ExpertAssignment\`
          WHERE expert_id = ? AND status IN ('accepted', 'declined')
        `, [user.id]);
        const totalReviewed = approvalResult[0]?.total || 0;
        const approvalRate = totalReviewed > 0 ? Math.round(((approvalResult[0]?.recommended || 0) / totalReviewed) * 100) : 0;
        sendResponse(res, 200, {
          success: true,
          data: {
            pendingCount: pendingResult[0]?.count || 0,
            completedCount: completedResult[0]?.count || 0,
            averageScore: 0,
            approvalRate,
            highestScore: 0,
            avgReviewTime: 0,
            consistencyRate: 0,
            totalComments: commentsResult[0]?.total_chars || 0
          }
        });
      } catch (error) {
        console.error('获取评审专家统计数据失败:', error);
        sendResponse(res, 500, { success: false, error: '获取评审专家统计数据失败' });
      }
      return;
    }

    if (pathname === '/api/reviewer/project-for-review' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      if (!user || user.role !== 'reviewer') {
        sendResponse(res, 403, { success: false, error: '没有权限' });
        return;
      }
      try {
        const { projectId } = url.parse(req.url, true).query;
        if (!projectId) {
          sendResponse(res, 400, { success: false, error: '项目ID不能为空' });
          return;
        }
        const [projectResult] = await pool.query(`
          SELECT p.id, p.project_code, p.title,
                 (SELECT GROUP_CONCAT(rd2.name ORDER BY rd2.name SEPARATOR ', ')
                  FROM \`ProjectResearchDomain\` prd2
                  INNER JOIN \`ResearchDomain\` rd2 ON prd2.research_domain_id = rd2.id
                  WHERE prd2.project_id = p.id) as research_field,
                 p.abstract,
                 p.detailed_introduction_part1 as background,
                 p.implementation_plan as objectives,
                 p.detailed_introduction_part2 as methodology,
                 p.detailed_introduction_part3 as expected_outcomes,
                 COALESCE(p.approved_budget, 0) as budget_total,
                 CASE WHEN p.start_date IS NOT NULL AND p.end_date IS NOT NULL
                      THEN TIMESTAMPDIFF(MONTH, p.start_date, p.end_date)
                      ELSE NULL END as duration_months,
                 p.submit_date, u.name as applicant_name, u.department as applicant_department, u.title as applicant_title,
                 u.email as applicant_email
          FROM \`Project\` p
          LEFT JOIN \`User\` u ON p.applicant_id = u.id
          WHERE p.id = ?
        `, [projectId]);
        if (!projectResult.length) {
          sendResponse(res, 404, { success: false, error: '项目不存在' });
          return;
        }
        const [assignmentRows] = await pool.query(`
          SELECT id, status, comment, assigned_at, deadline
          FROM \`ExpertAssignment\`
          WHERE project_id = ? AND expert_id = ?
          LIMIT 1
        `, [projectId, user.id]);
        if (!assignmentRows.length) {
          sendResponse(res, 403, { success: false, error: '您未被分配该项目评审任务' });
          return;
        }
        const assignment = assignmentRows[0];
        const parsedSelf = parseAssignmentReviewComment(assignment.comment);

        const [membersResult] = await pool.query(`
          SELECT pm.name, pm.role, pm.title, pm.organization, pm.email
          FROM \`ProjectMember\` pm
          WHERE pm.project_id = ?
          ORDER BY CASE pm.role WHEN 'principal' THEN 1 WHEN 'contact' THEN 2 WHEN 'other' THEN 3 ELSE 4 END,
                   pm.sort_order ASC
        `, [projectId]);
        const [budgetResult] = await pool.query(`
          SELECT * FROM \`ProjectBudget\` WHERE project_id = ? ORDER BY sort_order ASC
        `, [projectId]);
        const [otherRows] = await pool.query(`
          SELECT ea.id, ea.expert_id, ea.status, ea.comment, ea.assigned_at as review_date,
                 u.name as reviewer_name, u.title as reviewer_title
          FROM \`ExpertAssignment\` ea
          LEFT JOIN \`User\` u ON ea.expert_id = u.id
          WHERE ea.project_id = ? AND ea.expert_id != ? AND ea.status IN ('accepted', 'declined')
        `, [projectId, user.id]);
        const otherReviews = otherRows.map((item) => {
          const parsed = parseAssignmentReviewComment(item.comment);
          return {
            id: item.id,
            expert_id: item.expert_id,
            review_date: item.review_date ? item.review_date.toISOString() : null,
            recommendation: parsed.recommendation || assignmentStatusToRecommendation(item.status, ''),
            comments: parsed.comments || '',
            suggestions: parsed.suggestions || '',
            strengths: parsed.strengths || '',
            weaknesses: parsed.weaknesses || '',
            reviewer_name: item.reviewer_name,
            reviewer_title: item.reviewer_title,
            is_confidential: !!parsed.is_confidential,
          };
        });

        sendResponse(res, 200, {
          success: true,
          data: {
            project: {
              ...projectResult[0],
              research_field: projectResult[0].research_field || '未指定',
              submit_date: projectResult[0].submit_date ? projectResult[0].submit_date.toISOString().split('T')[0] : null
            },
            members: membersResult,
            budget: budgetResult,
            existingReview: {
              id: assignment.id,
              status: assignment.status,
              assigned_at: assignment.assigned_at
                ? assignment.assigned_at.toISOString()
                : null,
              deadline: assignment.deadline ? assignment.deadline.toISOString() : null,
              strengths: parsedSelf.strengths || '',
              weaknesses: parsedSelf.weaknesses || '',
              recommendation: parsedSelf.recommendation || assignmentStatusToRecommendation(assignment.status, ''),
              comments: parsedSelf.comments || '',
              suggestions: parsedSelf.suggestions || '',
              is_confidential: !!parsedSelf.is_confidential,
            },
            otherReviews
          }
        });
      } catch (error) {
        console.error('获取项目详情失败:', error);
        sendResponse(res, 500, { success: false, error: '获取项目详情失败' });
      }
      return;
    }

    if (pathname === '/api/reviewer/submit-review' && req.method === 'POST') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      if (!user || user.role !== 'reviewer') {
        sendResponse(res, 403, { success: false, error: '没有权限' });
        return;
      }
      try {
        const body = await getBody(req);
        const { project_id, recommendation, comments } = body;
        if (!project_id || !comments) {
          sendResponse(res, 400, { success: false, error: '项目和评审意见不能为空' });
          return;
        }
        const [projectResult] = await pool.query(`
          SELECT status, title, applicant_id FROM \`Project\` WHERE id = ?
        `, [project_id]);
        if (!projectResult.length) {
          sendResponse(res, 400, { success: false, error: '项目不存在' });
          return;
        }
        const [assignmentRows] = await pool.query(`
          SELECT id, status FROM \`ExpertAssignment\` WHERE project_id = ? AND expert_id = ? LIMIT 1
        `, [project_id, user.id]);
        if (!assignmentRows.length) {
          sendResponse(res, 403, { success: false, error: '您未被分配该项目评审任务' });
          return;
        }
        if (['accepted', 'declined'].includes(assignmentRows[0].status)) {
          sendResponse(res, 400, { success: false, error: '该评审任务已结束，无法再次提交' });
          return;
        }
        const reviewComment = buildAssignmentReviewComment({
          recommendation,
          comments: body.comments,
          suggestions: body.suggestions || '',
          strengths: body.strengths || '',
          weaknesses: body.weaknesses || '',
          is_confidential: !!body.is_confidential,
          submitted: true,
        });
        const nextStatus = recommendationToAssignmentStatus(recommendation);
        const reviewId = assignmentRows[0].id;
        await pool.query(`
          UPDATE \`ExpertAssignment\` SET status = ?, comment = ? WHERE id = ?
        `, [nextStatus, reviewComment, reviewId]);

        await createNotification(
          projectResult[0].applicant_id,
          '评审意见已提交',
          `您的项目"${projectResult[0].title}"的评审意见已提交，请查看详细评审结果。`,
          'review',
          project_id
        );
        sendResponse(res, 200, { success: true, message: '评审提交成功', data: { review_id: reviewId } });
      } catch (error) {
        console.error('提交评审失败:', error);
        sendResponse(res, 500, { success: false, error: '提交评审失败' });
      }
      return;
    }

    if (pathname === '/api/reviewer/save-review-draft' && req.method === 'POST') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      if (!user || user.role !== 'reviewer') {
        sendResponse(res, 403, { success: false, error: '没有权限' });
        return;
      }
      try {
        const body = await getBody(req);
        const { project_id } = body;
        if (!project_id) {
          sendResponse(res, 400, { success: false, error: '项目ID不能为空' });
          return;
        }
        const [assignmentRows] = await pool.query(`
          SELECT id, status FROM \`ExpertAssignment\` WHERE project_id = ? AND expert_id = ? LIMIT 1
        `, [project_id, user.id]);
        if (!assignmentRows.length) {
          sendResponse(res, 403, { success: false, error: '您未被分配该项目评审任务' });
          return;
        }
        if (['accepted', 'declined'].includes(assignmentRows[0].status)) {
          sendResponse(res, 400, { success: false, error: '该评审任务已结束，无法保存草稿' });
          return;
        }
        const reviewComment = buildAssignmentReviewComment({
          recommendation: body.recommendation || '',
          comments: body.comments || '',
          suggestions: body.suggestions || '',
          strengths: body.strengths || '',
          weaknesses: body.weaknesses || '',
          is_confidential: !!body.is_confidential,
          submitted: false,
        });
        await pool.query(`
          UPDATE \`ExpertAssignment\` SET status = 'reviewing', comment = ? WHERE id = ?
        `, [reviewComment, assignmentRows[0].id]);
        sendResponse(res, 200, { success: true, message: '草稿保存成功' });
      } catch (error) {
        console.error('保存评审草稿失败:', error);
        sendResponse(res, 500, { success: false, error: '保存评审草稿失败' });
      }
      return;
    }

    if (pathname === '/api/reviewer/review-detail' && req.method === 'GET') {
      const token = req.headers.authorization;
      const user = await verifyToken(token);
      if (!user || user.role !== 'reviewer') {
        sendResponse(res, 403, { success: false, error: '没有权限' });
        return;
      }
      try {
        const { reviewId } = url.parse(req.url, true).query;
        if (!reviewId) {
          sendResponse(res, 400, { success: false, error: '评审ID不能为空' });
          return;
        }
        const [rows] = await pool.query(`
          SELECT ea.id, ea.status as assignment_status, ea.comment, ea.assigned_at, ea.project_id, ea.expert_id,
                 p.title as project_title, p.project_code, p.abstract,
                 u_app.name as applicant_name, u_rev.name as reviewer_name, u_rev.title as reviewer_title
          FROM \`ExpertAssignment\` ea
          JOIN \`Project\` p ON ea.project_id = p.id
          JOIN \`User\` u_app ON p.applicant_id = u_app.id
          JOIN \`User\` u_rev ON ea.expert_id = u_rev.id
          WHERE ea.id = ?
        `, [reviewId]);
        if (!rows.length) {
          sendResponse(res, 404, { success: false, error: '评审记录不存在' });
          return;
        }
        const row = rows[0];
        const parsed = parseAssignmentReviewComment(row.comment);
        const review = {
          id: row.id,
          project_id: row.project_id,
          expert_id: row.expert_id,
          project_title: row.project_title,
          project_code: row.project_code,
          abstract: row.abstract,
          applicant_name: row.applicant_name,
          reviewer_name: row.reviewer_name,
          reviewer_title: row.reviewer_title,
          review_type: 'initial',
          strengths: parsed.strengths || '',
          weaknesses: parsed.weaknesses || '',
          recommendation: parsed.recommendation || assignmentStatusToRecommendation(row.assignment_status, ''),
          comments: parsed.comments || '',
          suggestions: parsed.suggestions || '',
          is_confidential: !!parsed.is_confidential,
          submitted_at: row.assigned_at ? row.assigned_at.toISOString() : null,
        };
        sendResponse(res, 200, {
          success: true,
          data: {
            review: {
              ...review,
              review_date: review.submitted_at
            }
          }
        });
      } catch (error) {
        console.error('获取评审详情失败:', error);
        sendResponse(res, 500, { success: false, error: '获取评审详情失败' });
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
server.listen(PORT,'127.0.0.1', () => {
  console.log('='.repeat(70));
  console.log(`✅ 研究项目管理系统API启动成功！`);
  console.log('='.repeat(70));
  console.log(`📍 API地址: http://localhost:${PORT}`);
  console.log(`📊 数据库: research_system_new`);
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