const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
const PORT = 3001;

// 中间件
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// ============ 硬编码数据库配置 ============
const pool = mysql.createPool({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "051005", // <-- 改成你的密码
  database: "research_system",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
// ========================================

// 健康检查端点
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "科研管理系统 API",
    database: "research_system", // 直接写死
    message: "服务器运行正常"
  });
});

// 数据库连接测试
app.get("/api/db/test", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query("SELECT 1 + 1 AS result");

    // 获取数据库信息
    const [dbInfo] = await pool.query("SELECT DATABASE() as db_name, USER() as db_user");

    connection.release();

    res.json({
      success: true,
      message: "数据库连接成功！",
      result: rows[0].result,
      database: dbInfo[0].db_name,
      user: dbInfo[0].db_user,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('数据库连接错误:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "数据库连接失败"
    });
  }
});

// 获取所有表
app.get("/api/tables", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        TABLE_NAME as name,
        TABLE_COMMENT as comment,
        TABLE_ROWS as rows
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'research_system'
      ORDER BY TABLE_NAME
    `);

    res.json({
      success: true,
      database: "research_system",
      tables: rows,
      count: rows.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 查看表结构
app.get("/api/tables/:tableName/structure", async (req, res) => {
  try {
    const { tableName } = req.params;
    const [rows] = await pool.query(`
      SELECT 
        COLUMN_NAME as name,
        COLUMN_TYPE as type,
        IS_NULLABLE as nullable,
        COLUMN_KEY as key,
        COLUMN_DEFAULT as defaultValue,
        COLUMN_COMMENT as comment
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = 'research_system' AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [tableName]);

    res.json({
      success: true,
      table: tableName,
      columns: rows,
      count: rows.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 预览表数据
app.get("/api/tables/:tableName/preview", async (req, res) => {
  try {
    const { tableName } = req.params;
    const [rows] = await pool.query(
      `SELECT * FROM ?? LIMIT 5`,
      [tableName]
    );

    res.json({
      success: true,
      table: tableName,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "API 端点不存在",
    path: req.originalUrl
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log("🚀 后端服务器启动成功！");
  console.log("=".repeat(50));
  console.log(`📍 端口: ${PORT}`);
  console.log(`🌐 地址: http://localhost:${PORT}`);
  console.log(`🛢️  数据库: research_system`);
  console.log("");
  console.log("📊 测试端点:");
  console.log(`   GET  /api/health          - 健康检查`);
  console.log(`   GET  /api/db/test         - 数据库连接测试`);
  console.log(`   GET  /api/tables          - 获取所有表`);
  console.log(`   GET  /api/tables/:table   - 表结构和数据预览`);
  console.log("=".repeat(50));
  console.log("");
  console.log("💡 打开浏览器访问测试:");
  console.log("   1. http://localhost:3001/api/health");
  console.log("   2. http://localhost:3001/api/db/test");
  console.log("   3. http://localhost:5173/test-db (前端测试)");
});