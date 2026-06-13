-- =============================================
-- 增量升级：活动成果登记（IncubationAchievementRecord）项目经理审批
--
-- PowerShell:
--   Get-Content .\alter_incubation_achievement_review.sql -Raw -Encoding UTF8 | mysql -u root -p --default-character-set=utf8mb4 research_system
-- 执行前请备份数据库。若列已存在可跳过对应 ALTER。
-- =============================================

USE research_system;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `IncubationAchievementRecord`
  ADD COLUMN `status` ENUM('submitted', 'approved', 'rejected') NOT NULL DEFAULT 'submitted'
    COMMENT '审批状态' AFTER `record_date`,
  ADD COLUMN `reviewed_by` VARCHAR(36) DEFAULT NULL COMMENT '审批人（项目经理）' AFTER `status`,
  ADD COLUMN `reviewed_at` DATETIME DEFAULT NULL COMMENT '审批时间' AFTER `reviewed_by`,
  ADD COLUMN `review_comment` TEXT DEFAULT NULL COMMENT '审批意见' AFTER `reviewed_at`;

-- 历史记录视为已通过
UPDATE `IncubationAchievementRecord` SET `status` = 'approved' WHERE `reviewed_by` IS NULL;

ALTER TABLE `IncubationAchievementRecord` ADD INDEX idx_iar_status (`status`);
