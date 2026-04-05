const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/api/auth/login',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  res.on('data', (d) => {
    console.log('响应数据:', d.toString());
  });
});

req.on('error', (error) => {
  console.error('连接错误:', error.message);
  console.log('请检查：');
  console.log('1. 后端服务是否启动？');
  console.log('2. 端口是否正确？');
  console.log('3. 防火墙是否阻止了连接？');
});

req.end();