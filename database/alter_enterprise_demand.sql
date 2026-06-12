-- =============================================
-- 增量升级脚本（勿直接改 research_system_db.sql）
-- 企业需求：独立发布 + 与项目（Project）关联
--
-- 业务说明：
--   1. 项目经理在平台转载/发布企业需求（富文本正文）
--   2. 项目经理将合适的企业需求推送给指定项目（项目方；仅 approved=已入库、incubating=孵化中）
--   3. 项目申请人在项目侧「认领」已推送的需求
--
-- 【EnterpriseDemand.status】仅描述需求本身的发布可见性：
--   draft → published → closed / offline
--
-- 【ProjectEnterpriseDemand.status】推送与承接状态：
--   pushed    → 项目经理已推送，待项目申请人承接
--   claimed   → 项目申请人已承接
--   withdrawn → 项目经理撤回推送（承接前）
--   declined  → 项目申请人拒绝承接
--
-- 用法：
--   mysql -u用户 -p research_system < alter_enterprise_demand.sql
-- 执行前请备份数据库。
--
-- 若曾执行过关联 IncubationProgress 的中间版本，本脚本会先删除旧关联表。
-- =============================================

USE research_system;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------
-- 一、企业需求主表（独立于项目）
-- ---------------------------------------------

CREATE TABLE IF NOT EXISTS `EnterpriseDemand` (
    `id` VARCHAR(36) PRIMARY KEY,
    `title` VARCHAR(200) NOT NULL COMMENT '需求标题',
    `summary` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '摘要（列表展示）',
    `content` LONGTEXT NOT NULL COMMENT '富文本 HTML 正文（含图片/链接等）',
    `enterprise_name` VARCHAR(200) DEFAULT NULL COMMENT '企业/单位名称',
    `industry` VARCHAR(100) DEFAULT NULL COMMENT '行业或领域标签',
    `source_url` VARCHAR(1000) DEFAULT NULL COMMENT '转载来源链接',
    `source_note` VARCHAR(500) DEFAULT NULL COMMENT '转载说明',
    `contact_name` VARCHAR(100) DEFAULT NULL COMMENT '联系人',
    `contact_phone` VARCHAR(50) DEFAULT NULL COMMENT '联系电话',
    `contact_email` VARCHAR(100) DEFAULT NULL COMMENT '联系邮箱',
    `status` ENUM('draft', 'published', 'closed', 'offline') NOT NULL DEFAULT 'draft'
        COMMENT 'draft=草稿；published=已发布；closed=已关闭；offline=下架隐藏',
    `publisher_id` VARCHAR(36) NOT NULL COMMENT '发布人（项目经理）用户ID',
    `published_at` DATETIME DEFAULT NULL COMMENT '发布时间',
    `deadline` DATE DEFAULT NULL COMMENT '需求有效期/截止日期',
    `view_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '浏览次数',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (`publisher_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    INDEX idx_status (`status`),
    INDEX idx_publisher (`publisher_id`),
    INDEX idx_published_at (`published_at`),
    INDEX idx_deadline (`deadline`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企业需求表（项目经理发布，独立于项目）';

CREATE TABLE IF NOT EXISTS `EnterpriseDemandMedia` (
    `id` VARCHAR(36) PRIMARY KEY,
    `demand_id` VARCHAR(36) NOT NULL COMMENT '所属企业需求ID',
    `file_type` ENUM('image', 'video', 'audio', 'attachment') NOT NULL COMMENT '媒体类型',
    `file_url` VARCHAR(1000) NOT NULL COMMENT '访问路径或 URL',
    `file_name` VARCHAR(500) NOT NULL COMMENT '原始文件名',
    `file_size` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '文件大小（字节）',
    `mime_type` VARCHAR(200) NOT NULL DEFAULT 'application/octet-stream' COMMENT 'MIME 类型',
    `description` VARCHAR(500) DEFAULT NULL COMMENT '说明',
    `sort_order` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '排序',
    `uploaded_by` VARCHAR(36) NOT NULL COMMENT '上传人用户ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
    FOREIGN KEY (`demand_id`) REFERENCES `EnterpriseDemand`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`uploaded_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    INDEX idx_demand (`demand_id`),
    INDEX idx_demand_type (`demand_id`, `file_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企业需求富文本媒体附件表';

-- ---------------------------------------------
-- 二、企业需求 ↔ 项目 关联表（推送 + 认领）
-- ---------------------------------------------

-- 移除曾关联孵化申请的旧表
DROP TABLE IF EXISTS `EnterpriseDemandIncubationProgress`;

-- 若本地存在无 status 的旧版 ProjectEnterpriseDemand，需先删除再重建
DROP TABLE IF EXISTS `ProjectEnterpriseDemand`;

CREATE TABLE `ProjectEnterpriseDemand` (
    `id` VARCHAR(36) PRIMARY KEY,
    `project_id` VARCHAR(36) NOT NULL COMMENT '项目ID',
    `demand_id` VARCHAR(36) NOT NULL COMMENT '企业需求ID',
    `pushed_by` VARCHAR(36) NOT NULL COMMENT '推送人（项目经理）用户ID',
    `remark` VARCHAR(500) DEFAULT NULL COMMENT '推送备注（可选）',
    `status` ENUM('pushed', 'claimed', 'withdrawn', 'declined') NOT NULL DEFAULT 'pushed'
        COMMENT 'pushed=已推送待承接；claimed=项目申请人已承接；withdrawn=项目经理撤回；declined=项目方拒绝承接',
    `claimed_by` VARCHAR(36) DEFAULT NULL COMMENT '认领人（项目申请人）用户ID',
    `claimed_at` DATETIME DEFAULT NULL COMMENT '认领时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '推送时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY `unique_project_demand` (`project_id`, `demand_id`),
    FOREIGN KEY (`project_id`) REFERENCES `Project`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`demand_id`) REFERENCES `EnterpriseDemand`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`pushed_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`claimed_by`) REFERENCES `User`(`id`) ON DELETE SET NULL,
    INDEX idx_project (`project_id`),
    INDEX idx_demand (`demand_id`),
    INDEX idx_status (`status`),
    INDEX idx_pushed_by (`pushed_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企业需求与项目关联表（项目经理推送，项目申请人认领）';

SET FOREIGN_KEY_CHECKS = 1;
