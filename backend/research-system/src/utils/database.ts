import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// 测试连接
export async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ MySQL 数据库连接成功');
    
    // 创建测试数据
    await createTestData();
    
    return true;
  } catch (error) {
    console.error('❌ MySQL 数据库连接失败:', error);
    return false;
  }
}

// 创建测试数据
async function createTestData() {
  try {
    // 检查是否有用户
    const userCount = await prisma.user.count();
    
    if (userCount === 0) {
      console.log('📝 创建测试用户...');
      
      // 创建测试用户
      const users = await prisma.user.createMany({
        data: [
          {
            username: 'applicant1',
            password: '$2a$10$YourHashedPasswordHere', // 实际使用bcrypt
            email: 'applicant1@test.com',
            realName: '张三',
            role: 'APPLICANT',
            college: '计算机学院'
          },
          {
            username: 'reviewer1',
            password: '$2a$10$YourHashedPasswordHere',
            email: 'reviewer1@test.com',
            realName: '李教授',
            role: 'REVIEWER',
            college: '科研处'
          },
          {
            username: 'admin1',
            password: '$2a$10$YourHashedPasswordHere',
            email: 'admin1@test.com',
            realName: '王管理员',
            role: 'ADMIN',
            college: '科研处'
          }
        ]
      });
      
      console.log(`✅ 创建了 ${users.count} 个测试用户`);
    }
  } catch (error) {
    console.log('测试数据创建跳过:', error.message);
  }
}

export default prisma;