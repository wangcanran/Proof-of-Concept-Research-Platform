const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 数据库配置 - ⚠️ 修改这里的密码！
const DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'f2971404639',  // ⬅️ 改成你的 MySQL 密码
  database: 'research_system'
};

console.log('='.repeat(60));
console.log('🚀 启动科研管理系统后端服务器...');
console.log('='.repeat(60));
console.log(`数据库: ${DB_CONFIG.database}`);
console.log(`主机: ${DB_CONFIG.host}:${DB_CONFIG.port}`);
console.log(`用户: ${DB_CONFIG.user}`);
console.log('='.repeat(60));

// 创建数据库连接池
let pool;
try {
  pool = mysql.createPool(DB_CONFIG);
  console.log('✅ 数据库连接池创建成功');
} catch (error) {
  console.error('❌ 创建数据库连接池失败:', error.message);
  process.exit(1);
}

// ============ 路由定义 ============

// 1. 首页
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '科研管理系统 API 服务器',
    endpoints: [
      'GET  /api/health',
      'GET  /api/test',
      'GET  /api/db/test',
      'GET  /api/tables',
      'GET  /api/tables/:name/structure',
      'GET  /api/tables/:name/preview'
    ]
  });
});

// 2. 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: '运行中',
    timestamp: new Date().toISOString()
  });
});

// 3. 简单测试
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: '服务器测试成功',
    data: { test: 'OK' }
  });
});

// 4. 数据库连接测试
app.get('/api/db/test', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.query('SELECT 1 + 1 AS calc');
    connection.release();
    
    res.json({
      success: true,
      message: '数据库连接成功',
      calculation: result[0].calc,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('数据库错误:', error.message);
    res.status(500).json({
      success: false,
      message: '数据库连接失败',
      error: error.message
    });
  }
});

// 5. 获取所有表
app.get('/api/tables', async (req, res) => {
  try {
    const [tables] = await pool.query(`
      SELECT TABLE_NAME as name, TABLE_ROWS as rows
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'research_system'
      ORDER BY TABLE_NAME
    `);
    
    res.json({
      success: true,
      database: 'research_system',
      tables: tables,
      count: tables.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取表失败',
      error: error.message
    });
  }
});

// 6. 获取表结构
app.get('/api/tables/:table/structure', async (req, res) => {
  const tableName = req.params.table;
  
  try {
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME as name, COLUMN_TYPE as type
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = 'research_system' AND TABLE_NAME = ?
    `, [tableName]);
    
    res.json({
      success: true,
      table: tableName,
      columns: columns
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取表结构失败',
      error: error.message
    });
  }
});

// 7. 预览表数据
app.get('/api/tables/:table/preview', async (req, res) => {
  const tableName = req.params.table;
  
  try {
    const [data] = await pool.query('SELECT * FROM ?? LIMIT 3', [tableName]);
    
    res.json({
      success: true,
      table: tableName,
      data: data,
      count: data.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '预览数据失败',
      error: error.message
    });
  }
});

// 8. 测试用户表
app.get('/api/test/users', async (req, res) => {
  try {
    const [users] = await pool.query('SELECT * FROM users LIMIT 5');
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'users 表可能不存在',
      error: error.message
    });
  }
});

// 9. 测试项目表
app.get('/api/test/projects', async (req, res) => {
  try {
    const [projects] = await pool.query('SELECT * FROM projects LIMIT 5');
    res.json({
      success: true,
      data: projects
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'projects 表可能不存在',
      error: error.message
    });
  }
});
// ============ 用户管理API ============

// 1. 获取用户列表（支持分页、搜索、筛选、排序）
app.get('/api/users', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      role = '',
      sort = 'created_at',
      order = 'desc' 
    } = req.query;

    console.log('请求用户列表，参数:', { page, limit, search, role, sort, order });

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const params = [];

    // 搜索条件
    if (search) {
      whereClause += ' AND (username LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // 角色筛选
    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }

    // 排序
    const orderBy = sort ? `ORDER BY ${sort} ${order}` : 'ORDER BY created_at DESC';

    // 分页
    const offset = (page - 1) * limit;

    // 获取总数量
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0].total;

    // 获取数据
    const dataQuery = `
      SELECT id, username, email, role, status, created_at, last_login 
      FROM users 
      ${whereClause} 
      ${orderBy} 
      LIMIT ? OFFSET ?
    `;
    
    const dataParams = [...params, parseInt(limit), offset];
    const [users] = await pool.query(dataQuery, dataParams);

    // 格式化时间
    const formattedUsers = users.map(user => ({
      ...user,
      created_at: user.created_at ? new Date(user.created_at).toISOString() : null,
      last_login: user.last_login ? new Date(user.last_login).toISOString() : null
    }));

    res.json({
      success: true,
      data: formattedUsers,
      total: total,
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败',
      error: error.message
    });
  }
});

// 2. 创建新用户
app.post('/api/users', async (req, res) => {
  try {
    const { username, password, email, role } = req.body;

    console.log('创建用户:', { username, email, role });

    // 验证必填字段
    if (!username || !password || !email || !role) {
      return res.status(400).json({
        success: false,
        message: '用户名、密码、邮箱和角色为必填项'
      });
    }

    // 检查用户名是否已存在
    const [existingUsername] = await pool.query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    if (existingUsername.length > 0) {
      return res.status(400).json({
        success: false,
        message: '用户名已存在'
      });
    }

    // 检查邮箱是否已存在
    const [existingEmail] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (existingEmail.length > 0) {
      return res.status(400).json({
        success: false,
        message: '邮箱已存在'
      });
    }

    // 插入新用户
    const [result] = await pool.query(
      'INSERT INTO users (username, password, email, role, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [username, password, email, role, 'active']
    );

    // 获取刚创建的用户
    const [newUser] = await pool.query(
      'SELECT id, username, email, role, status, created_at, last_login FROM users WHERE id = ?',
      [result.insertId]
    );

    res.json({
      success: true,
      message: '用户创建成功',
      data: {
        ...newUser[0],
        created_at: newUser[0].created_at ? new Date(newUser[0].created_at).toISOString() : null
      }
    });

  } catch (error) {
    console.error('创建用户失败:', error);
    res.status(500).json({
      success: false,
      message: '创建用户失败',
      error: error.message
    });
  }
});

// 3. 更新用户信息
app.put('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { email, role, password } = req.body;

    console.log(`更新用户 ${userId}:`, { email, role, password });

    // 检查用户是否存在
    const [existingUser] = await pool.query(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );
    if (existingUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 构建更新语句
    const updates = [];
    const params = [];

    if (email) {
      // 检查邮箱是否被其他用户使用
      const [emailCheck] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );
      if (emailCheck.length > 0) {
        return res.status(400).json({
          success: false,
          message: '邮箱已被其他用户使用'
        });
      }
      updates.push('email = ?');
      params.push(email);
    }

    if (role) {
      updates.push('role = ?');
      params.push(role);
    }

    if (password) {
      updates.push('password = ?');
      params.push(password);
    }

    if (updates.length === 0) {
      return res.json({
        success: true,
        message: '没有需要更新的字段'
      });
    }

    params.push(userId);

    const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await pool.query(updateQuery, params);

    // 获取更新后的用户信息
    const [updatedUser] = await pool.query(
      'SELECT id, username, email, role, status, created_at, last_login FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: '用户更新成功',
      data: {
        ...updatedUser[0],
        created_at: updatedUser[0].created_at ? new Date(updatedUser[0].created_at).toISOString() : null,
        last_login: updatedUser[0].last_login ? new Date(updatedUser[0].last_login).toISOString() : null
      }
    });

  } catch (error) {
    console.error('更新用户失败:', error);
    res.status(500).json({
      success: false,
      message: '更新用户失败',
      error: error.message
    });
  }
});

// 4. 删除用户
app.delete('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    console.log(`删除用户 ${userId}`);

    // 检查用户是否存在
    const [existingUser] = await pool.query(
      'SELECT id, role FROM users WHERE id = ?',
      [userId]
    );
    if (existingUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 不能删除管理员
    if (existingUser[0].role === 'admin') {
      return res.status(400).json({
        success: false,
        message: '不能删除管理员用户'
      });
    }

    // 删除用户
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);

    res.json({
      success: true,
      message: '用户删除成功'
    });

  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({
      success: false,
      message: '删除用户失败',
      error: error.message
    });
  }
});

// 5. 切换用户状态
app.patch('/api/users/:id/status', async (req, res) => {
  try {
    const userId = req.params.id;
    const { status } = req.body;

    console.log(`切换用户状态 ${userId}:`, { status });

    // 验证状态值
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '状态值无效，只能是 active 或 inactive'
      });
    }

    // 检查用户是否存在
    const [existingUser] = await pool.query(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );
    if (existingUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 更新状态
    await pool.query(
      'UPDATE users SET status = ? WHERE id = ?',
      [status, userId]
    );

    // 获取更新后的用户信息
    const [updatedUser] = await pool.query(
      'SELECT id, username, email, role, status, created_at, last_login FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: `用户状态已更新为 ${status}`,
      data: {
        ...updatedUser[0],
        created_at: updatedUser[0].created_at ? new Date(updatedUser[0].created_at).toISOString() : null,
        last_login: updatedUser[0].last_login ? new Date(updatedUser[0].last_login).toISOString() : null
      }
    });

  } catch (error) {
    console.error('切换用户状态失败:', error);
    res.status(500).json({
      success: false,
      message: '切换用户状态失败',
      error: error.message
    });
  }
});

// ============ 启动服务器 ============

app.listen(PORT, () => {
  console.log('\n✅ 服务器启动成功！');
  console.log(`📍 地址: http://localhost:${PORT}`);
  console.log('\n📡 可用端点:');
  console.log('   GET  /                    - 首页');
  console.log('   GET  /api/health          - 健康检查');
  console.log('   GET  /api/test            - 简单测试');
  console.log('   GET  /api/db/test         - 数据库测试');
  console.log('   GET  /api/tables          - 所有表');
  console.log('   GET  /api/tables/:table/structure - 表结构');
  console.log('   GET  /api/tables/:table/preview   - 预览数据');
  console.log('   GET  /api/test/users      - 测试用户表');
  console.log('   GET  /api/test/projects   - 测试项目表');
  console.log('\n👤 用户管理API:');
  console.log('   GET    /api/users          - 获取用户列表');
  console.log('   POST   /api/users          - 创建用户');
  console.log('   PUT    /api/users/:id      - 更新用户');
  console.log('   DELETE /api/users/:id      - 删除用户');
  console.log('   PATCH  /api/users/:id/status - 切换状态');
  console.log('\n💡 立即测试:');
  console.log(`   1. 前端: http://localhost:3000`);
  console.log(`   2. 后端健康: http://localhost:${PORT}/api/health`);
  console.log(`   3. 用户列表: http://localhost:${PORT}/api/users`);
  console.log('='.repeat(60));
});


// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n\n👋 正在关闭服务器...');
  if (pool) pool.end();
  process.exit(0);
});