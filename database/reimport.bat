@echo off
REM 重建库并导入表结构 + 示例数据（Windows 下须指定 utf8mb4，否则中文可能乱码/报错）
cd /d "%~dp0"
REM 与 backend/research_api.js 中 DB 密码一致；若你本机不同，请改此处与代码
set MYSQL=mysql --default-character-set=utf8mb4 -u root -pGainian@2026
%MYSQL% < init.sql
%MYSQL% < research_system_db.sql
%MYSQL% < sample_data.sql
echo Done.
pause
