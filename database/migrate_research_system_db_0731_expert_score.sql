USE research_system;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

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
