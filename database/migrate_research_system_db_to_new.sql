-- =============================================
-- 从 research_system_db.sql → research_system_db_new.sql
-- 在已有库上增量升级（ALTER + 新建表）
-- 执行前请先备份：mysqldump + backend/uploads/
-- 用法：mysql -u用户 -p research_system < migrate_research_system_db_to_new.sql
-- =============================================

USE research_system;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------
-- 1. User：角色增加 funds_manager
-- ---------------------------------------------
ALTER TABLE `User`
  MODIFY COLUMN `role` ENUM(
    'applicant',
    'reviewer',
    'project_manager',
    'admin',
    'funds_manager'
  ) DEFAULT 'applicant' COMMENT '系统角色';

-- ---------------------------------------------
-- 2. Invitation：邀请目标角色增加 funds_manager
-- ---------------------------------------------
ALTER TABLE `Invitation`
  MODIFY COLUMN `target_role` ENUM(
    'reviewer',
    'project_manager',
    'admin',
    'funds_manager'
  ) NOT NULL COMMENT '邀请注册的角色';


-- ---------------------------------------------
-- 4. ProjectMember：成员简介
-- ---------------------------------------------
ALTER TABLE `ProjectMember`
  ADD COLUMN `member_introduction` TEXT NULL COMMENT '成员简介'
  AFTER `phone`;

-- ---------------------------------------------
-- 5. ProjectAttachment：附件类型增加 video / audio
-- ---------------------------------------------
ALTER TABLE `ProjectAttachment`
  MODIFY COLUMN `type` ENUM('image', 'video', 'audio', 'attachment') NOT NULL COMMENT '分类';


-- ---------------------------------------------
-- 7. 新建：项目经费申请相关表
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS `FundsRequest` (
    `id` VARCHAR(36) PRIMARY KEY,
    `project_id` VARCHAR(36) NOT NULL COMMENT '项目ID',
    `applicant_id` VARCHAR(36) NOT NULL COMMENT '申请人ID（项目负责人/申请人）',
    `application_date` DATETIME DEFAULT NULL COMMENT '申请日期',
    `service_requirement` TEXT NOT NULL COMMENT '经费使用需求描述（整体说明）',
    `feedback_date` DATETIME DEFAULT NULL COMMENT '反馈日期',
    `feedback_by` VARCHAR(36) DEFAULT NULL COMMENT '反馈人ID（经费管理员）',
    `feedback_action` ENUM('approved', 'rejected', 'partial_approved') DEFAULT NULL COMMENT '反馈动作：approved=全部批准，rejected=全部拒绝，partial_approved=部分批准',
    `feedback_comment` TEXT DEFAULT NULL COMMENT '反馈文字说明（含部分批准的说明）',
    `result_date` DATETIME DEFAULT NULL COMMENT '成果提交日期',
    `result_description` TEXT DEFAULT NULL COMMENT '成果描述',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
    `status` ENUM('pending', 'feedback_given', 'result_submitted') NOT NULL DEFAULT 'pending' COMMENT '状态：待反馈/已反馈/已提交成果',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
    FOREIGN KEY (`project_id`) REFERENCES `Project`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`applicant_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`feedback_by`) REFERENCES `User`(`id`) ON DELETE SET NULL,
    INDEX idx_project (`project_id`),
    INDEX idx_applicant (`applicant_id`),
    INDEX idx_status (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目经费申请主记录表（一次申请一条记录）';

CREATE TABLE IF NOT EXISTS `FundsRequestItem` (
    `id` VARCHAR(36) PRIMARY KEY,
    `funds_request_id` VARCHAR(36) NOT NULL COMMENT '经费申请主记录ID',
    `category` ENUM('设备费', '材料费', '测试费', '差旅费', '会议费', '劳务费', '专家咨询费', '出版费', '管理费', '其他') NOT NULL COMMENT '预算类别',
    `item_name` VARCHAR(200) NOT NULL COMMENT '预算项目名称',
    `description` TEXT COMMENT '详细说明',
    `amount` DECIMAL(12,2) NOT NULL COMMENT '申请金额',
    `feedback_amount` DECIMAL(12,2) DEFAULT NULL COMMENT '反馈批准金额',
    `feedback_comment` TEXT DEFAULT NULL COMMENT '对该明细项的单独反馈说明',
    `sort_order` INT DEFAULT 0 COMMENT '排序',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`funds_request_id`) REFERENCES `FundsRequest`(`id`) ON DELETE CASCADE,
    INDEX idx_funds_request (`funds_request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目经费申请明细表（一次申请下的多条经费条目）';

CREATE TABLE IF NOT EXISTS `FundsRequestFile` (
    `id` VARCHAR(36) PRIMARY KEY,
    `funds_request_id` VARCHAR(36) NOT NULL COMMENT '经费申请主记录ID',
    `attachment_type` ENUM('application', 'feedback', 'result') NOT NULL COMMENT '附件类型：申请附件/反馈附件/成果附件',
    `file_name` VARCHAR(500) NOT NULL COMMENT '原始文件名',
    `file_path` VARCHAR(1000) NOT NULL COMMENT '存储路径',
    `file_size` BIGINT NOT NULL COMMENT '文件大小（字节）',
    `mime_type` VARCHAR(100) NOT NULL COMMENT 'MIME类型',
    `sort_order` INT DEFAULT 0 COMMENT '排序序号',
    `uploaded_by` VARCHAR(36) NOT NULL COMMENT '上传人ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
    FOREIGN KEY (`funds_request_id`) REFERENCES `FundsRequest`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`uploaded_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    INDEX idx_funds_request (`funds_request_id`),
    INDEX idx_type (`attachment_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目经费申请附件表';

-- 8. 经费申请来源字段（申请人待审 / 管理员直接登记）
ALTER TABLE `FundsRequest`
  ADD COLUMN `submission_type` ENUM('applicant_request', 'manager_direct') NOT NULL DEFAULT 'applicant_request'
  COMMENT '提交方式：申请人申请待审 / 管理员直接登记（免审）'
  AFTER `applicant_id`;

SET FOREIGN_KEY_CHECKS = 1;

-- 完成。其余表（ResearchDomain、Expert*、ProjectBudget、News 等）新旧一致，无需 ALTER。
