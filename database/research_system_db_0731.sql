-- =============================================
-- 数据库: research_system
-- 版本: 2026-07-31
-- 说明: 基于 research_system_db_0703.sql 的 0731 版本
--       仅新增专家评审综合分字段 score
--
-- 使用方法（MySQL 客户端）:
--   mysql -u root -p --default-character-set=utf8mb4 < research_system_db_0731.sql
-- =============================================

CREATE DATABASE IF NOT EXISTS research_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE research_system;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 如果当前库已经存在 0703 版结构，则只补充 0731 新增字段
SET @has_expert_assignment_score := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ExpertAssignment'
    AND COLUMN_NAME = 'score'
);

SET @expert_assignment_score_sql := IF(
  @has_expert_assignment_score = 0,
  'ALTER TABLE `ExpertAssignment` ADD COLUMN `score` DECIMAL(5,1) DEFAULT NULL COMMENT ''专家综合评分（0-100分）'' AFTER `comment`',
  'SELECT ''ExpertAssignment.score already exists'' AS message'
);

PREPARE expert_assignment_score_stmt FROM @expert_assignment_score_sql;
EXECUTE expert_assignment_score_stmt;
DEALLOCATE PREPARE expert_assignment_score_stmt;

UPDATE `ExpertAssignment`
SET `score` = NULL
WHERE `score` IS NULL;

