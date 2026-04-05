const mysql = require('mysql2/promise');

const YOUR_PASSWORD = 'f2971404639';

async function comprehensiveTest() {
  console.log('🔍 综合连接测试...\n');
  
  const configs = [
    {
      name: '测试1: 标准配置',
      config: {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: YOUR_PASSWORD,
        database: 'research_system'
      }
    },
    {
      name: '测试2: 无数据库连接',
      config: {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: YOUR_PASSWORD
        // 没有指定 database
      }
    },
    {
      name: '测试3: 创建连接池',
      config: {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: YOUR_PASSWORD,
        database: 'research_system',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      }
    }
  ];
  
  for (const test of configs) {
    console.log(`\n--- ${test.name} ---`);
    try {
      if (test.name.includes('连接池')) {
        const pool = mysql.createPool(test.config);
        const conn = await pool.getConnection();
        const [result] = await conn.query('SELECT 1 + 1 AS solution');
        console.log(`✅ ${test.name} 成功: ${result[0].solution}`);
        conn.release();
        pool.end();
      } else {
        const conn = await mysql.createConnection(test.config);
        const [result] = await conn.query('SELECT 1 + 1 AS solution');
        console.log(`✅ ${test.name} 成功: ${result[0].solution}`);
        await conn.end();
      }
    } catch (error) {
      console.error(`❌ ${test.name} 失败: ${error.code || error.message}`);
      console.error(`   详细: ${error.message}`);
    }
  }
  
  // 测试网络连接
  console.log('\n--- 网络连接测试 ---');
  const net = require('net');
  const socket = new net.Socket();
  
  socket.setTimeout(3000);
  
  socket.on('connect', () => {
    console.log('✅ 可以连接到 localhost:3306');
    socket.destroy();
  });
  
  socket.on('timeout', () => {
    console.log('❌ 连接超时 - MySQL 服务可能未运行');
    socket.destroy();
  });
  
  socket.on('error', (err) => {
    console.log(`❌ 网络错误: ${err.message}`);
  });
  
  socket.connect(3306, 'localhost');
}

comprehensiveTest();