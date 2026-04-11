-- 仅用于「从零重建库」：先删库再建空库并指定 utf8mb4。
-- 本文件不包含任何 CREATE TABLE；表结构必须以 research_system_db.sql 为准。
--
-- 完整初始化（会清空所有数据）示例：
--   mysql -u root -p < init.sql
--   mysql -u root -p < research_system_db.sql
--
-- 若只需在已有库上补表（不删库），只执行 research_system_db.sql 即可（其中为 IF NOT EXISTS）。

DROP DATABASE IF EXISTS research_system;
CREATE DATABASE research_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE research_system;
