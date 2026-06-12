-- =============================================
-- 增量升级：孵化服务申请专家分配
-- 项目经理在同意服务申请后，可为该申请分配技术/产业/投资专家
--
-- PowerShell:
--   Get-Content .\alter_incubation_progress_expert.sql -Raw -Encoding UTF8 | mysql -u root -p --default-character-set=utf8mb4 research_system
-- 执行前请备份数据库。
-- =============================================

USE research_system;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `IncubationProgressExpert` (
    `id` VARCHAR(36) PRIMARY KEY,
    `progress_id` VARCHAR(36) NOT NULL COMMENT '孵化服务申请ID（IncubationProgress）',
    `expert_id` VARCHAR(36) NOT NULL COMMENT '专家用户ID（role=reviewer）',
    `expert_type` ENUM('technical', 'investment', 'industry') NOT NULL
        COMMENT '分配角色：technical=技术专家，investment=投资专家，industry=产业专家',
    `assigned_by` VARCHAR(36) NOT NULL COMMENT '分配人（项目经理）',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '分配时间',
    UNIQUE KEY `unique_progress_expert` (`progress_id`, `expert_id`),
    FOREIGN KEY (`progress_id`) REFERENCES `IncubationProgress`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`expert_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`assigned_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    INDEX idx_progress (`progress_id`),
    INDEX idx_expert (`expert_id`),
    INDEX idx_expert_type (`expert_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='孵化服务申请专家分配表';

SET FOREIGN_KEY_CHECKS = 1;
