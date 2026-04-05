// fix_urgent.js
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'research_api.js');

fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error('读取文件错误:', err);
        return;
    }
    
    const lines = data.split('\n');
    
    // 修改第 22253 行（数组索引从0开始，所以是22252）
    if (lines.length > 22252) {
        console.log('原始行:', lines[22252]);
        
        // 修改监听语句
        if (lines[22252].includes('server.listen(PORT')) {
            lines[22252] = lines[22252].replace(
                'server.listen(PORT, () => {',
                'server.listen(PORT, \'127.0.0.1\', () => {'
            );
            console.log('修改后:', lines[22252]);
        }
    }
    
    const result = lines.join('\n');
    const fixedPath = path.join(__dirname, 'research_api_fixed_3002.js');
    
    fs.writeFile(fixedPath, result, 'utf8', (err) => {
        if (err) {
            console.error('写入文件错误:', err);
            return;
        }
        console.log('✅ 紧急修复完成！');
        console.log('运行: node research_api_fixed_3002.js');
        console.log('服务器将在: http://127.0.0.1:3002');
    });
});