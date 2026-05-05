-- =============================================
-- 数据库: research_system
-- 创建时间: 2026-04-10
-- 说明: 科研项目管理系统数据库
-- =============================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS research_system;
USE research_system;

-- =============================================
-- 一、基础数据表
-- =============================================

-- 1. 研究领域字典（项目与专家共用，扁平无层级）
CREATE TABLE IF NOT EXISTS `ResearchDomain` (
    `id` VARCHAR(36) PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL COMMENT '领域名称',
    `code` VARCHAR(50) UNIQUE NOT NULL COMMENT '领域代码',
    `sort_order` INT DEFAULT 0 COMMENT '排序',
    `enabled` BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='研究领域（项目多选与专家标签共用）';

-- 2. 用户表
CREATE TABLE IF NOT EXISTS `User` (
    `id` VARCHAR(36) PRIMARY KEY,
    `username` VARCHAR(50) UNIQUE COMMENT '用户名',
    `password` VARCHAR(255) COMMENT '密码',
    `name` VARCHAR(100) NOT NULL COMMENT '真实姓名',
    `email` VARCHAR(100) UNIQUE NOT NULL COMMENT '邮箱',
    `role` ENUM('applicant', 'reviewer', 'project_manager', 'admin') DEFAULT 'applicant' COMMENT '系统角色',
    `department` VARCHAR(100) COMMENT '所属部门/单位',
    `title` VARCHAR(100) COMMENT '职称/职务',
    `phone` VARCHAR(20) COMMENT '联系电话',
    `status` ENUM('active', 'inactive') DEFAULT 'inactive' COMMENT '账号状态',
    `last_login` DATETIME COMMENT '最后登录时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_role (`role`),
    INDEX idx_status (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 3. 专家扩展表
CREATE TABLE IF NOT EXISTS `ExpertProfile` (
    `id` VARCHAR(36) PRIMARY KEY COMMENT '关联用户ID',
    `expertise_description` TEXT COMMENT '专业特长描述',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`id`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='专家扩展信息表';

-- 4. 专家-擅长领域关联表（关联 ResearchDomain）
CREATE TABLE IF NOT EXISTS `ExpertDomain` (
    `id` VARCHAR(36) PRIMARY KEY,
    `expert_id` VARCHAR(36) NOT NULL COMMENT '专家用户ID',
    `domain_id` VARCHAR(36) NOT NULL COMMENT '研究领域ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_expert_domain` (`expert_id`, `domain_id`),
    FOREIGN KEY (`expert_id`) REFERENCES `User`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`domain_id`) REFERENCES `ResearchDomain`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='专家擅长领域关联表';

-- 5. 内部邀请记录表
CREATE TABLE IF NOT EXISTS `Invitation` (
    `id` VARCHAR(36) PRIMARY KEY,
    `inviter_id` VARCHAR(36) COMMENT '邀请人ID',
    `target_role` ENUM('reviewer', 'project_manager', 'admin') NOT NULL COMMENT '邀请注册的角色',
    `invitation_code` VARCHAR(100) UNIQUE NOT NULL COMMENT '邀请码',
    `status` ENUM('pending', 'accepted', 'expired', 'cancelled') DEFAULT 'pending',
    `accepted_at` DATETIME COMMENT '接受时间',
    `registered_user_id` VARCHAR(36) COMMENT '注册用户ID',
    `expires_at` DATETIME NOT NULL COMMENT '邀请过期时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`inviter_id`) REFERENCES `User`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`registered_user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE,
    INDEX idx_code (`invitation_code`),
    INDEX idx_status (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内部邀请记录表';

-- =============================================
-- 二、项目申请相关
-- =============================================

-- 6. 项目表
CREATE TABLE IF NOT EXISTS `Project` (
    `id` VARCHAR(36) PRIMARY KEY,
    `applicant_id` VARCHAR(36) NOT NULL COMMENT '申请者ID',
    `manager_id` VARCHAR(36) COMMENT '项目经理ID',
    `project_code` VARCHAR(50) UNIQUE COMMENT '项目编号',
    `title` VARCHAR(200) NOT NULL COMMENT '项目名称',
    `project_domain_other_text` VARCHAR(500) COMMENT '所属领域含「其他」时请注明具体内容',
    `tech_maturity` ENUM(
        'rd',
        'pilot',
        'intermediate_trial',
        'small_batch_prod'
    ) COMMENT '技术成熟度（单选）：研发/小试/中试/小批量生产',
    `achievement_transform` SET(
        'tech_transfer',
        'tech_license',
        'equity_investment',
        'joint_dev',
        'other'
    ) COMMENT '预期成果转化形式（可多选）',
    `achievement_transform_other_text` VARCHAR(500) COMMENT '成果转化选「其他」时请注明',
    `poc_stage_requirement` SET(
        'creative_verify',
        'feasibility_verify',
        'commercial_verify',
        'multi_stage_combo'
    ) COMMENT '概念验证阶段需求（可多选）',
    `poc_multi_stage_note` VARCHAR(500) COMMENT '选「多阶段组合」时请说明',
    `implementation_plan` TEXT COMMENT '实施计划',
    `supplementary_info` TEXT COMMENT '其他补充说明',
    `keywords` VARCHAR(300) COMMENT '关键词',
    `abstract` TEXT NOT NULL COMMENT '项目摘要',
    `detailed_introduction_part1` TEXT COMMENT '项目详细介绍-一、成果简介（背景、痛点、技术方案、竞争优势、创新点等）',
    `detailed_introduction_part2` TEXT COMMENT '项目详细介绍-二、知识产权（权属、专利/软著数量、核心知识产权摘要等，自由填写）',
    `detailed_introduction_part3` TEXT COMMENT '项目详细介绍-三、已有应用/试点情况（无则填「无」）',
    `status` ENUM(
        'draft',
        'submitted',
        'under_review',
        'approved',
        'incubating',
        'rejected',
        'completed'
    ) DEFAULT 'draft' COMMENT '项目状态',
    `submit_date` DATE COMMENT '提交日期',
    `approval_date` DATE COMMENT '批准日期',
    `start_date` DATE COMMENT '开始日期',
    `end_date` DATE COMMENT '结束日期',
    `remarks` TEXT COMMENT '备注',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`applicant_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`manager_id`) REFERENCES `User`(`id`) ON DELETE SET NULL,
    INDEX idx_status (`status`),
    INDEX idx_applicant (`applicant_id`),
    INDEX idx_manager (`manager_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='科研项目表';

-- 7. 项目与领域多选关联（每条对应 ResearchDomain 中一项）
CREATE TABLE IF NOT EXISTS `ProjectResearchDomain` (
    `project_id` VARCHAR(36) NOT NULL COMMENT '项目ID',
    `research_domain_id` VARCHAR(36) NOT NULL COMMENT '研究领域ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`project_id`, `research_domain_id`),
    FOREIGN KEY (`project_id`) REFERENCES `Project`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`research_domain_id`) REFERENCES `ResearchDomain`(`id`) ON DELETE RESTRICT,
    INDEX idx_project_rd_domain (`research_domain_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目所属领域（多选）';

-- 8. 项目附件表
CREATE TABLE IF NOT EXISTS `ProjectAttachment` (
    `id` VARCHAR(36) PRIMARY KEY,
    `project_id` VARCHAR(36) NOT NULL COMMENT '项目ID',
    `file_name` VARCHAR(500) NOT NULL COMMENT '原始文件名',
    `file_path` VARCHAR(1000) NOT NULL COMMENT '存储路径',
    `file_size` BIGINT NOT NULL COMMENT '文件大小（字节）',
    `mime_type` VARCHAR(100) NOT NULL COMMENT 'MIME类型',
    `type` ENUM('image', 'attachment') NOT NULL COMMENT '分类',
    `description` VARCHAR(500) COMMENT '描述注解（如图片文字注解）',
    `sort_order` INT DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`project_id`) REFERENCES `Project`(`id`) ON DELETE CASCADE,
    INDEX idx_project (`project_id`),
    INDEX idx_media_type (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目附件表';

-- 9. 项目团队成员表
CREATE TABLE IF NOT EXISTS `ProjectMember` (
    `id` VARCHAR(36) PRIMARY KEY,
    `project_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL COMMENT '成员姓名',
    `user_id` VARCHAR(36) COMMENT '关联用户ID',
    `role` ENUM('principal', 'contact', 'other') NOT NULL COMMENT '项目角色',
    `title` VARCHAR(100) COMMENT '职称/职务',
    `organization` VARCHAR(200) COMMENT '所属单位',
    `email` VARCHAR(100) NOT NULL COMMENT '邮箱',
    `phone` VARCHAR(20) COMMENT '联系电话',
    `sort_order` INT DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`project_id`) REFERENCES `Project`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL,
    UNIQUE KEY `uk_project_email` (`project_id`, `email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目团队成员表';

-- 10. 项目预算明细表
CREATE TABLE IF NOT EXISTS `ProjectBudget` (
    `id` VARCHAR(36) PRIMARY KEY,
    `project_id` VARCHAR(36) NOT NULL,
    `category` ENUM('设备费', '材料费', '测试费', '差旅费', '会议费', '劳务费', '专家咨询费', '出版费', '管理费', '其他','总计') NOT NULL COMMENT '预算类别',
    `item_name` VARCHAR(200) NOT NULL COMMENT '预算项目名称',
    `description` TEXT COMMENT '详细说明',
    `amount` DECIMAL(12,2) NOT NULL COMMENT '总金额',
    `sort_order` INT DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`project_id`) REFERENCES `Project`(`id`) ON DELETE CASCADE,
    INDEX idx_project (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目预算明细表';

-- =============================================
-- 三、专家评审相关
-- =============================================

-- 11. 专家分配表
CREATE TABLE IF NOT EXISTS `ExpertAssignment` (
    `id` VARCHAR(36) PRIMARY KEY,
    `project_id` VARCHAR(36) NOT NULL,
    `expert_id` VARCHAR(36) NOT NULL,
    `assigned_by` VARCHAR(36),
    `assigned_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `status` ENUM('reviewing', 'accepted', 'declined') DEFAULT 'reviewing' COMMENT '进行中/通过/不通过；超期由 deadline 判断，不设单独状态',
    `comment` TEXT,
    `deadline` DATETIME,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_assignment` (`project_id`, `expert_id`),
    FOREIGN KEY (`project_id`) REFERENCES `Project`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`expert_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`assigned_by`) REFERENCES `User`(`id`) ON DELETE SET NULL,
    INDEX idx_expert (`expert_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='专家分配表';

-- =============================================
-- 四、孵化服务相关
-- =============================================

-- 12. 孵化服务记录表
CREATE TABLE `IncubationProgress` (
    `id` VARCHAR(36) PRIMARY KEY,
    `project_id` VARCHAR(36) NOT NULL COMMENT '项目ID',
    `applicant_id` VARCHAR(36) NOT NULL COMMENT '申请人ID',
    `application_date` DATETIME DEFAULT NULL COMMENT '申请日期',
    `service_requirement` TEXT NOT NULL COMMENT '服务需求描述',
    `feedback_date` DATETIME DEFAULT NULL COMMENT '反馈日期',
    `feedback_by` VARCHAR(36) DEFAULT NULL COMMENT '反馈人（项目经理）ID',
    `feedback_action` ENUM('approved', 'rejected') DEFAULT NULL COMMENT '反馈动作：approved=给予服务，rejected=拒绝服务',
    `feedback_comment` TEXT DEFAULT NULL COMMENT '反馈文字说明',
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='孵化服务记录表（申请-反馈-成果）';

-- 13. 孵化服务记录附件表
CREATE TABLE `IncubationProgressFile` (
    `id` VARCHAR(36) PRIMARY KEY,
    `progress_id` VARCHAR(36) NOT NULL,
    `attachment_type` ENUM('application', 'feedback', 'result') NOT NULL COMMENT '附件类型：申请附件/反馈附件/成果附件',
    `file_name` VARCHAR(500) NOT NULL COMMENT '原始文件名',
    `file_path` VARCHAR(1000) NOT NULL COMMENT '存储路径',
    `file_size` BIGINT NOT NULL COMMENT '文件大小（字节）',
    `mime_type` VARCHAR(100) NOT NULL COMMENT 'MIME类型',
    `sort_order` INT DEFAULT 0 COMMENT '排序序号',
    `uploaded_by` VARCHAR(36) NOT NULL COMMENT '上传人ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
    FOREIGN KEY (`progress_id`) REFERENCES `IncubationProgress`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`uploaded_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    INDEX idx_progress (`progress_id`),
    INDEX idx_type (`attachment_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='孵化服务记录附件表';

-- =============================================
-- 五、项目成果
-- =============================================

-- 14. 项目成果表
CREATE TABLE IF NOT EXISTS `ProjectAchievement` (
    `id` VARCHAR(36) PRIMARY KEY,
    `project_id` VARCHAR(36) NOT NULL,
    `type` ENUM('paper', 'patent', 'software', 'report', 'prototype', 'standard', 'award', 'other') NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `abstract` TEXT NOT NULL,
    `content` TEXT NOT NULL,
    `achievement_date` DATE,
    `created_by` VARCHAR(36) NOT NULL,
    `verified_by` VARCHAR(36),
    `verified_date` DATE,
    `verification_comment` TEXT,
    `status` ENUM('draft', 'submitted', 'verified', 'rejected') DEFAULT 'draft',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`project_id`) REFERENCES `Project`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`verified_by`) REFERENCES `User`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目成果表';

-- 15. 项目成果附件表
CREATE TABLE IF NOT EXISTS `ProjectAchievementFile` (
    `id` VARCHAR(36) PRIMARY KEY,
    `achievement_id` VARCHAR(36) NOT NULL,
    `file_name` VARCHAR(500) NOT NULL,
    `file_path` VARCHAR(1000) NOT NULL,
    `file_size` BIGINT NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `sort_order` INT DEFAULT 0,
    `uploaded_by` VARCHAR(36) NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`achievement_id`) REFERENCES `ProjectAchievement`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`uploaded_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    INDEX idx_achievement (`achievement_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目成果附件表';

-- =============================================
-- 六、新闻公告
-- =============================================

-- 16. 新闻公告主表（富文本整体存储）
CREATE TABLE IF NOT EXISTS `News` (
    `id` VARCHAR(36) PRIMARY KEY COMMENT '新闻ID',
    `title` VARCHAR(200) NOT NULL COMMENT '标题',
    `summary` VARCHAR(500) NOT NULL COMMENT '摘要（列表页显示）',
    `content` LONGTEXT NOT NULL COMMENT '富文本HTML内容，包含图片/音视频标签',
    `author_id` VARCHAR(36) NOT NULL COMMENT '作者ID（项目经理），关联User.id',
    `status` ENUM('draft', 'published', 'offline') NOT NULL DEFAULT 'draft' COMMENT '状态：草稿、已发布、下架',
    `is_top` ENUM('yes', 'no') NOT NULL DEFAULT 'no' COMMENT '是否置顶',
    `is_carousel` ENUM('yes', 'no') NOT NULL DEFAULT 'no' COMMENT '是否首页轮播',
    `view_count` INT UNSIGNED DEFAULT 0 COMMENT '浏览次数',
    `published_at` DATETIME COMMENT '发布时间（status=published时必填）',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (`author_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    INDEX idx_status (`status`),
    INDEX idx_published (`published_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='新闻公告主表';

-- 17. 新闻媒体文件表（记录上传的图片/音视频）
CREATE TABLE IF NOT EXISTS `NewsMedia` (
    `id` VARCHAR(36) PRIMARY KEY COMMENT '媒体文件ID',
    `news_id` VARCHAR(36) NOT NULL COMMENT '所属新闻ID',
    `file_type` ENUM('image', 'video', 'audio') NOT NULL COMMENT '媒体类型',
    `file_url` VARCHAR(512) NOT NULL COMMENT '访问URL（相对或绝对）',
    `file_name` VARCHAR(200) NOT NULL COMMENT '原始文件名',
    `file_size` BIGINT UNSIGNED NOT NULL COMMENT '文件大小（字节）',
    `mime_type` VARCHAR(100) NOT NULL COMMENT 'MIME类型',
    `description` VARCHAR(500) DEFAULT '' COMMENT '说明（可选）',
    `sort_order` INT UNSIGNED DEFAULT 0 COMMENT '在内容中出现的顺序（用于展示）',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
    FOREIGN KEY (`news_id`) REFERENCES `News`(`id`) ON DELETE CASCADE,
    INDEX idx_news_type (`news_id`, `file_type`),
    INDEX idx_news_url (`news_id`, `file_url`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='新闻媒体文件表';

-- 18. 首页轮播配置表
CREATE TABLE IF NOT EXISTS `CarouselConfig` (
    `id` VARCHAR(36) PRIMARY KEY COMMENT '轮播项ID',
    `news_id` VARCHAR(36) NOT NULL COMMENT '关联的新闻ID（必须是已发布状态）',
    `image_url` VARCHAR(512) NOT NULL COMMENT '轮播展示的图片URL（通常取自NewsMedia.file_url）',
    `display_order` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '排序，数字越小越靠前',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (`news_id`) REFERENCES `News`(`id`) ON DELETE CASCADE,
    INDEX idx_news_order (`news_id`, `display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='首页轮播配置表';

-- =============================================
-- 七、系统与通用
-- =============================================

-- 19. 通知消息表
CREATE TABLE IF NOT EXISTS `Notification` (
    `id` VARCHAR(36) PRIMARY KEY,
    `user_id` VARCHAR(36) NOT NULL,
    `type` ENUM('project', 'review', 'funding', 'incubation', 'system', 'reminder', 'invitation') NOT NULL, --
    `title` VARCHAR(200) NOT NULL,
    `content` TEXT NOT NULL,
    `related_id` VARCHAR(36) COMMENT '关联记录ID',
    `related_type` VARCHAR(50) COMMENT '关联记录类型',
    `priority` ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    `action_url` VARCHAR(500),
    `is_read` BOOLEAN DEFAULT FALSE,
    `read_at` DATETIME,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE,
    INDEX idx_user_read (`user_id`, `is_read`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知消息表';

-- 20. 操作日志表
CREATE TABLE IF NOT EXISTS `AuditLog` (
    `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
    `user_id` VARCHAR(36),
    `action` VARCHAR(100) NOT NULL,
    `table_name` VARCHAR(50) NOT NULL,
    `record_id` VARCHAR(36),
    `old_values` JSON,
    `new_values` JSON,
    `ip_address` VARCHAR(45),
    `user_agent` VARCHAR(500),
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (`user_id`),
    INDEX idx_table (`table_name`, `record_id`),
    INDEX idx_time (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- 21. 数据导出日志表
CREATE TABLE IF NOT EXISTS `ExportLog` (
    `id` VARCHAR(36) PRIMARY KEY,
    `user_id` VARCHAR(36) COMMENT '导出人',
    `export_type` VARCHAR(50) NOT NULL COMMENT '导出类型',
    `export_params` JSON COMMENT '导出筛选条件',
    `file_name` VARCHAR(500) NOT NULL COMMENT '导出文件名',
    `file_path` VARCHAR(1000) NOT NULL COMMENT '导出文件路径',
    `file_size` BIGINT COMMENT '文件大小',
    `record_count` INT COMMENT '导出记录数',
    `status` ENUM('processing', 'completed', 'failed') DEFAULT 'processing',
    `error_message` TEXT COMMENT '失败原因',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `completed_at` DATETIME,
    FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL,
    INDEX idx_user (`user_id`),
    INDEX idx_type (`export_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据导出日志表';