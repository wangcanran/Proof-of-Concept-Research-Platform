-- =============================================
-- 增量升级脚本（勿直接改 research_system_db.sql）
-- 1. 孵化中成果记录表 + 附件表（支持各类文件）
-- 2. 专家类型多选（技术专家 / 投资专家 / 产业专家）
--
-- 用法（Linux / CMD）：
--   mysql -u用户 -p --default-character-set=utf8mb4 research_system < alter_incubation_achievement_and_expert_types.sql
-- PowerShell 勿用 < 重定向；请进 mysql 后 SOURCE 本文件，或：
--   Get-Content .\alter_incubation_achievement_and_expert_types.sql -Raw -Encoding UTF8 | mysql -u root -p --default-character-set=utf8mb4 research_system
-- expert_type 使用英文枚举避免 Windows 管道中文乱码：technical=技术专家，investment=投资专家，industry=产业专家
-- 执行前请备份数据库。
-- =============================================

USE research_system;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------
-- 一、孵化中成果记录
-- ---------------------------------------------

-- 主表：一条记录对应一次孵化阶段成果登记
CREATE TABLE IF NOT EXISTS `IncubationAchievementRecord` (
    `id` VARCHAR(36) PRIMARY KEY,
    `project_id` VARCHAR(36) NOT NULL COMMENT '项目ID（一般为孵化中项目）',
    `title` VARCHAR(200) NOT NULL COMMENT '成果标题',
    `description` TEXT COMMENT '成果说明',
    `record_date` DATE DEFAULT NULL COMMENT '成果记录日期',
    `created_by` VARCHAR(36) NOT NULL COMMENT '创建人用户ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (`project_id`) REFERENCES `Project`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    INDEX idx_project (`project_id`),
    INDEX idx_created_by (`created_by`),
    INDEX idx_record_date (`record_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='孵化中成果记录表';

-- 附件表：不限制扩展名，由 mime_type / file_extension 描述；一条成果可挂多个文件
CREATE TABLE IF NOT EXISTS `IncubationAchievementRecordFile` (
    `id` VARCHAR(36) PRIMARY KEY,
    `record_id` VARCHAR(36) NOT NULL COMMENT '成果记录ID',
    `file_name` VARCHAR(500) NOT NULL COMMENT '原始文件名',
    `file_path` VARCHAR(1000) NOT NULL COMMENT '存储路径（相对 backend 根目录）',
    `file_size` BIGINT NOT NULL COMMENT '文件大小（字节）',
    `mime_type` VARCHAR(200) NOT NULL DEFAULT 'application/octet-stream' COMMENT 'MIME 类型',
    `file_extension` VARCHAR(32) DEFAULT NULL COMMENT '扩展名（不含点，如 pdf、docx、mp4）',
    `description` VARCHAR(500) DEFAULT NULL COMMENT '附件说明',
    `sort_order` INT DEFAULT 0 COMMENT '排序序号',
    `uploaded_by` VARCHAR(36) NOT NULL COMMENT '上传人用户ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
    FOREIGN KEY (`record_id`) REFERENCES `IncubationAchievementRecord`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`uploaded_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    INDEX idx_record (`record_id`),
    INDEX idx_uploaded_by (`uploaded_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='孵化中成果记录附件表（支持任意类型文件）';

-- ---------------------------------------------
-- 二、专家类型（多选）
-- ---------------------------------------------

-- 关联表：一名专家可拥有多种类型（技术 / 投资 / 产业）
CREATE TABLE IF NOT EXISTS `ExpertExpertType` (
    `id` VARCHAR(36) PRIMARY KEY,
    `expert_id` VARCHAR(36) NOT NULL COMMENT '专家用户ID（role=reviewer）',
    `expert_type` ENUM('technical', 'investment', 'industry') NOT NULL
        COMMENT '专家类型：technical=技术专家，investment=投资专家，industry=产业专家',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY `unique_expert_expert_type` (`expert_id`, `expert_type`),
    FOREIGN KEY (`expert_id`) REFERENCES `User`(`id`) ON DELETE CASCADE,
    INDEX idx_expert_type (`expert_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='专家类型关联表（多选）';

SET FOREIGN_KEY_CHECKS = 1;
