USE research_system;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `IncubationProgressFile`
MODIFY COLUMN `attachment_type` ENUM('application', 'feedback') NOT NULL COMMENT '附件类型：申请附件/反馈附件';

ALTER TABLE `IncubationProgressExpert`
DROP COLUMN `expert_type`;

ALTER TABLE `FundsRequest`
DROP COLUMN `result_date`,
DROP COLUMN `result_description`;

ALTER TABLE `FundsRequest`
MODIFY COLUMN `status` ENUM('pending', 'feedback_given') NOT NULL DEFAULT 'pending' COMMENT '状态：待反馈/已反馈';

ALTER TABLE `FundsRequestFile`
MODIFY COLUMN `attachment_type` ENUM('application', 'feedback') NOT NULL COMMENT '附件类型：申请附件/反馈附件';

INSERT IGNORE INTO `IndustryResource` (
    `id`, `title`, `summary`, `content`, `enterprise_name`, `industry`,
    `source_url`, `source_note`, `contact_name`, `contact_phone`, `contact_email`,
    `status`, `publisher_id`, `published_at`, `deadline`, `view_count`,
    `created_at`, `updated_at`
)
SELECT
    `id`, `title`, `summary`, `content`, `enterprise_name`, `industry`,
    `source_url`, `source_note`, `contact_name`, `contact_phone`, `contact_email`,
    `status`, `publisher_id`, `published_at`, `deadline`, `view_count`,
    `created_at`, `updated_at`
FROM `EnterpriseDemand`;

INSERT IGNORE INTO `IndustryResourceMedia` (
    `id`, `resource_id`, `file_type`, `file_url`, `file_name`,
    `file_size`, `mime_type`, `description`, `sort_order`, `uploaded_by`, `created_at`
)
SELECT
    `id`, `demand_id`, `file_type`, `file_url`, `file_name`,
    `file_size`, `mime_type`, `description`, `sort_order`, `uploaded_by`, `created_at`
FROM `EnterpriseDemandMedia`;

INSERT IGNORE INTO `ProjectIndustryResource` (
    `id`, `project_id`, `resource_id`, `pushed_by`, `remark`,
    `status`, `claimed_by`, `claimed_at`, `created_at`, `updated_at`
)
SELECT
    `id`, `project_id`, `demand_id`, `pushed_by`, `remark`,
    `status`, `claimed_by`, `claimed_at`, `created_at`, `updated_at`
FROM `ProjectEnterpriseDemand`;

INSERT IGNORE INTO `ResearchAchievement` (
    `id`, `type`, `name`, `project_id`, `output_date`, `authors`,
    `description`, `status`, `submission_type`, `created_by`, `verified_by`,
    `verified_date`, `verification_comment`, `created_at`, `updated_at`
)
SELECT
    `id`, `type`, `title`, `project_id`, `achievement_date`, NULL,
    CONCAT(IFNULL(`abstract`, ''), '\n', IFNULL(`content`, '')),
    `status`, 'applicant', `created_by`, `verified_by`,
    `verified_date`, `verification_comment`, `created_at`, `created_at`
FROM `ProjectAchievement`;

UPDATE `ResearchAchievement` SET `name` = LEFT(`name`, 500) WHERE LENGTH(`name`) > 500;

INSERT IGNORE INTO `ResearchAchievementFile` (
    `id`, `achievement_id`, `file_name`, `file_path`, `file_size`,
    `mime_type`, `sort_order`, `uploaded_by`, `created_at`
)
SELECT
    `id`, `achievement_id`, `file_name`, `file_path`, `file_size`,
    `mime_type`, `sort_order`, `uploaded_by`, `created_at`
FROM `ProjectAchievementFile`;

INSERT IGNORE INTO `ActivityRecord` (
    `id`, `project_id`, `title`, `description`, `record_date`,
    `status`, `submission_type`, `reviewed_by`, `reviewed_at`, `review_comment`,
    `created_by`, `created_at`, `updated_at`
)
SELECT
    `id`, `project_id`, `title`, `description`, `record_date`,
    `status`, 'applicant', `reviewed_by`, `reviewed_at`, `review_comment`,
    `created_by`, `created_at`, `updated_at`
FROM `IncubationAchievementRecord`;

INSERT IGNORE INTO `ActivityRecordFile` (
    `id`, `record_id`, `file_name`, `file_path`, `file_size`,
    `mime_type`, `sort_order`, `uploaded_by`, `created_at`
)
SELECT
    `id`, `record_id`, `file_name`, `file_path`, `file_size`,
    `mime_type`, `sort_order`, `uploaded_by`, `created_at`
FROM `IncubationAchievementRecordFile`;

DROP TABLE IF EXISTS `ExpertExpertType`;
DROP TABLE IF EXISTS `ProjectEnterpriseDemand`;
DROP TABLE IF EXISTS `EnterpriseDemandMedia`;
DROP TABLE IF EXISTS `EnterpriseDemand`;
DROP TABLE IF EXISTS `ProjectAchievementFile`;
DROP TABLE IF EXISTS `ProjectAchievement`;
DROP TABLE IF EXISTS `IncubationAchievementRecordFile`;
DROP TABLE IF EXISTS `IncubationAchievementRecord`;
