@echo off
REM 重建库并导入表结构 + 示例数据（Windows 下须指定 utf8mb4，否则中文可能乱码/报错）
cd /d "%~dp0"
set MYSQL=mysql --default-character-set=utf8mb4 -u root -pwn20041008
%MYSQL% < init.sql
%MYSQL% < research_system_db.sql
%MYSQL% < sample_data.sql
echo Done.
pause
