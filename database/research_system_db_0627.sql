-- =============================================
-- 数据库: research_system
-- 汇总日期: 2026-06-27
-- 说明: 科研项目管理系统完整建表脚本
-- =============================================

CREATE DATABASE IF NOT EXISTS research_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE research_system;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================
-- 一、基础数据表
-- =============================================

-- 1. 研究领域字典
CREATE TABLE IF NOT EXISTS `ResearchDomain` (
    `id` VARCHAR(36) PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL COMMENT '领域名称',
    `code` VARCHAR(50) UNIQUE NOT NULL COMMENT '领域代码',
    `sort_order` INT DEFAULT 0 COMMENT '排序',
    `enabled` BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='研究领域字典';

-- 2. 用户表
CREATE TABLE IF NOT EXISTS `User` (
    `id` VARCHAR(36) PRIMARY KEY,
    `username` VARCHAR(50) UNIQUE COMMENT '用户名',
    `password` VARCHAR(255) COMMENT '密码',
    `name` VARCHAR(100) NOT NULL COMMENT '真实姓名',
    `email` VARCHAR(100) UNIQUE NOT NULL COMMENT '邮箱',
    `role` ENUM('applicant', 'reviewer', 'project_manager', 'admin', 'funds_manager') DEFAULT 'applicant' COMMENT '系统角色',
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
    `keywords` VARCHAR(500) DEFAULT NULL COMMENT '专业关键词，逗号分隔',
    `expert_types` SET('technical', 'investment', 'industry', 'tech_service') DEFAULT NULL COMMENT '专家类型：技术专家/投资专家/产业专家/科技服务专家',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`id`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='专家扩展信息表';

-- 4. 专家-擅长领域关联表
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
    `target_role` ENUM('reviewer', 'project_manager', 'admin', 'funds_manager') NOT NULL COMMENT '邀请注册的角色',
    `invitation_code` VARCHAR(100) UNIQUE NOT NULL COMMENT '邀请码',
    `status` ENUM('pending', 'accepted', 'expired', 'cancelled') DEFAULT 'pending' COMMENT '状态',
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
    `project_domain_other_text` VARCHAR(500) COMMENT '所属领域含「其他」时请注明',
    `tech_maturity` ENUM('rd', 'pilot', 'intermediate_trial', 'small_batch_prod') COMMENT '技术成熟度：研发/小试/中试/小批量生产',
    `achievement_transform` SET('tech_transfer', 'tech_license', 'equity_investment', 'joint_dev', 'other') COMMENT '预期成果转化形式',
    `achievement_transform_other_text` VARCHAR(500) COMMENT '成果转化选「其他」时请注明',
    `poc_stage_requirement` SET('creative_verify', 'feasibility_verify', 'commercial_verify', 'multi_stage_combo') COMMENT '概念验证阶段需求',
    `poc_multi_stage_note` VARCHAR(500) COMMENT '选「多阶段组合」时请说明',
    `implementation_plan` TEXT COMMENT '实施计划',
    `supplementary_info` TEXT COMMENT '其他补充说明',
    `keywords` VARCHAR(300) COMMENT '关键词',
    `abstract` TEXT NOT NULL COMMENT '项目摘要',
    `detailed_introduction_part1` TEXT COMMENT '成果简介',
    `detailed_introduction_part2` TEXT COMMENT '知识产权',
    `detailed_introduction_part3` TEXT COMMENT '已有应用/试点情况',
    `status` ENUM('draft', 'submitted', 'under_review', 'approved', 'incubating', 'rejected', 'completed') DEFAULT 'draft' COMMENT '项目状态',
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

-- 7. 项目与领域多选关联表
CREATE TABLE IF NOT EXISTS `ProjectResearchDomain` (
    `project_id` VARCHAR(36) NOT NULL COMMENT '项目ID',
    `research_domain_id` VARCHAR(36) NOT NULL COMMENT '研究领域ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`project_id`, `research_domain_id`),
    FOREIGN KEY (`project_id`) REFERENCES `Project`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`research_domain_id`) REFERENCES `ResearchDomain`(`id`) ON DELETE RESTRICT,
    INDEX idx_project_rd_domain (`research_domain_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目所属领域关联表';

-- 8. 项目附件表
CREATE TABLE IF NOT EXISTS `ProjectAttachment` (
    `id` VARCHAR(36) PRIMARY KEY,
    `project_id` VARCHAR(36) NOT NULL COMMENT '项目ID',
    `file_name` VARCHAR(500) NOT NULL COMMENT '原始文件名',
    `file_path` VARCHAR(1000) NOT NULL COMMENT '存储路径',
    `file_size` BIGINT NOT NULL COMMENT '文件大小（字节）',
    `mime_type` VARCHAR(100) NOT NULL COMMENT 'MIME类型',
    `type` ENUM('image', 'video', 'audio', 'attachment') NOT NULL COMMENT '文件分类',
    `description` VARCHAR(500) COMMENT '描述说明',
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
    `member_introduction` TEXT COMMENT '成员简介',
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
    `category` ENUM('设备费', '材料费', '测试费', '差旅费', '会议费', '劳务费', '专家咨询费', '出版费', '管理费', '其他', '总计') NOT NULL COMMENT '预算类别',
    `item_name` VARCHAR(200) NOT NULL COMMENT '预算项目名称',
    `description` TEXT COMMENT '详细说明',
    `amount` DECIMAL(12,2) NOT NULL COMMENT '总金额',
    `sort_order` INT DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`project_id`) REFERENCES `Project`(`id`) ON DELETE CASCADE,
    INDEX idx_project (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目预算明细表';

-- =============================================
-- 三、服务资源
-- =============================================

-- 11. 服务资源表
CREATE TABLE IF NOT EXISTS `ServiceProvider` (
    `id` VARCHAR(36) PRIMARY KEY COMMENT '服务机构ID',
    `name` VARCHAR(200) NOT NULL COMMENT '机构名称',
    `unified_social_credit_code` VARCHAR(50) NOT NULL COMMENT '统一社会信用代码',
    `category` SET('财务', '法务', '知识产权', '工商注册', '资质申报', '活动策划组织', '文印制作', '投融资', '测试/样机代工') NOT NULL COMMENT '机构分类',
    `contact_name` VARCHAR(100) NOT NULL COMMENT '联系人',
    `contact_phone` VARCHAR(20) NOT NULL COMMENT '联系电话',
    `contact_email` VARCHAR(100) DEFAULT NULL COMMENT '联系邮箱',
    `description` TEXT COMMENT '机构简介',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='服务资源表';

-- =============================================
-- 四、专家评审相关
-- =============================================

-- 12. 专家分配表
CREATE TABLE IF NOT EXISTS `ExpertAssignment` (
    `id` VARCHAR(36) PRIMARY KEY,
    `project_id` VARCHAR(36) NOT NULL,
    `expert_id` VARCHAR(36) NOT NULL,
    `assigned_by` VARCHAR(36),
    `assigned_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `status` ENUM('reviewing', 'accepted', 'declined') DEFAULT 'reviewing' COMMENT '进行中/通过/不通过',
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
-- 五、孵化服务相关
-- =============================================

-- 13. 孵化服务记录表
CREATE TABLE IF NOT EXISTS `IncubationProgress` (
    `id` VARCHAR(36) PRIMARY KEY,
    `project_id` VARCHAR(36) NOT NULL COMMENT '项目ID',
    `applicant_id` VARCHAR(36) NOT NULL COMMENT '申请人ID',
    `application_date` DATETIME DEFAULT NULL COMMENT '申请日期',
    `service_requirement` TEXT NOT NULL COMMENT '服务需求描述',
    `service_categories` SET('tech', 'business', 'ip', 'resource', 'incubation') DEFAULT NULL COMMENT '服务类别',
    `feedback_date` DATETIME DEFAULT NULL COMMENT '反馈日期',
    `feedback_by` VARCHAR(36) DEFAULT NULL COMMENT '反馈人ID',
    `feedback_action` ENUM('approved', 'rejected') DEFAULT NULL COMMENT '反馈动作：给予服务/拒绝服务',
    `feedback_comment` TEXT DEFAULT NULL COMMENT '反馈说明',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `status` ENUM('pending', 'feedback_given') NOT NULL DEFAULT 'pending' COMMENT '状态：待反馈/已反馈',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (`project_id`) REFERENCES `Project`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`applicant_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`feedback_by`) REFERENCES `User`(`id`) ON DELETE SET NULL,
    INDEX idx_project (`project_id`),
    INDEX idx_applicant (`applicant_id`),
    INDEX idx_status (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='孵化服务记录表';

-- 14. 孵化服务记录附件表
CREATE TABLE IF NOT EXISTS `IncubationProgressFile` (
    `id` VARCHAR(36) PRIMARY KEY,
    `progress_id` VARCHAR(36) NOT NULL,
    `attachment_type` ENUM('application', 'feedback') NOT NULL COMMENT '附件类型：申请附件/反馈附件',
    `file_name` VARCHAR(500) NOT NULL COMMENT '原始文件名',
    `file_path` VARCHAR(1000) NOT NULL COMMENT '存储路径',
    `file_size` BIGINT NOT NULL COMMENT '文件大小（字节）',
    `mime_type` VARCHAR(100) NOT NULL COMMENT 'MIME类型',
    `sort_order` INT DEFAULT 0 COMMENT '排序',
    `uploaded_by` VARCHAR(36) NOT NULL COMMENT '上传人ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
    FOREIGN KEY (`progress_id`) REFERENCES `IncubationProgress`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`uploaded_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    INDEX idx_progress (`progress_id`),
    INDEX idx_type (`attachment_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='孵化服务记录附件表';

-- 15. 孵化服务申请专家分配表
CREATE TABLE IF NOT EXISTS `IncubationProgressExpert` (
    `id` VARCHAR(36) PRIMARY KEY,
    `progress_id` VARCHAR(36) NOT NULL COMMENT '孵化服务申请ID',
    `expert_id` VARCHAR(36) NOT NULL COMMENT '专家用户ID',
    `assigned_by` VARCHAR(36) NOT NULL COMMENT '分配人ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '分配时间',
    UNIQUE KEY `unique_progress_expert` (`progress_id`, `expert_id`),
    FOREIGN KEY (`progress_id`) REFERENCES `IncubationProgress`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`expert_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`assigned_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    INDEX idx_progress (`progress_id`),
    INDEX idx_expert (`expert_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='孵化服务申请专家分配表';

-- 16. 孵化服务申请服务机构分配表
CREATE TABLE IF NOT EXISTS `IncubationProgressServiceProvider` (
    `id` VARCHAR(36) PRIMARY KEY,
    `progress_id` VARCHAR(36) NOT NULL COMMENT '孵化服务申请ID',
    `service_provider_id` VARCHAR(36) NOT NULL COMMENT '服务机构ID',
    `assigned_by` VARCHAR(36) NOT NULL COMMENT '分配人ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '分配时间',
    UNIQUE KEY `unique_progress_provider` (`progress_id`, `service_provider_id`),
    FOREIGN KEY (`progress_id`) REFERENCES `IncubationProgress`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`service_provider_id`) REFERENCES `ServiceProvider`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`assigned_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    INDEX idx_progress (`progress_id`),
    INDEX idx_provider (`service_provider_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='孵化服务申请服务机构分配表';

-- =============================================
-- 六、项目经费申请
-- =============================================

-- 17. 项目经费申请主记录表
CREATE TABLE IF NOT EXISTS `FundsRequest` (
    `id` VARCHAR(36) PRIMARY KEY,
    `project_id` VARCHAR(36) NOT NULL COMMENT '项目ID',
    `applicant_id` VARCHAR(36) NOT NULL COMMENT '申请人ID',
    `submission_type` ENUM('applicant_request', 'manager_direct') NOT NULL DEFAULT 'applicant_request' COMMENT '提交方式',
    `application_date` DATETIME DEFAULT NULL COMMENT '申请日期',
    `service_requirement` TEXT NOT NULL COMMENT '经费使用需求描述',
    `feedback_date` DATETIME DEFAULT NULL COMMENT '反馈日期',
    `feedback_by` VARCHAR(36) DEFAULT NULL COMMENT '反馈人ID',
    `feedback_action` ENUM('approved', 'rejected', 'partial_approved') DEFAULT NULL COMMENT '反馈动作',
    `feedback_comment` TEXT DEFAULT NULL COMMENT '反馈说明',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `status` ENUM('pending', 'feedback_given') NOT NULL DEFAULT 'pending' COMMENT '状态：待反馈/已反馈',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (`project_id`) REFERENCES `Project`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`applicant_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`feedback_by`) REFERENCES `User`(`id`) ON DELETE SET NULL,
    INDEX idx_project (`project_id`),
    INDEX idx_applicant (`applicant_id`),
    INDEX idx_status (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目经费申请主记录表';

-- 18. 项目经费申请明细表
CREATE TABLE IF NOT EXISTS `FundsRequestItem` (
    `id` VARCHAR(36) PRIMARY KEY,
    `funds_request_id` VARCHAR(36) NOT NULL COMMENT '经费申请主记录ID',
    `category` ENUM('设备费', '材料费', '测试费', '差旅费', '会议费', '劳务费', '专家咨询费', '出版费', '管理费', '其他') NOT NULL COMMENT '预算类别',
    `item_name` VARCHAR(200) NOT NULL COMMENT '预算项目名称',
    `description` TEXT COMMENT '详细说明',
    `amount` DECIMAL(12,2) NOT NULL COMMENT '申请金额',
    `feedback_amount` DECIMAL(12,2) DEFAULT NULL COMMENT '批准金额',
    `feedback_comment` TEXT DEFAULT NULL COMMENT '明细反馈说明',
    `sort_order` INT DEFAULT 0 COMMENT '排序',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`funds_request_id`) REFERENCES `FundsRequest`(`id`) ON DELETE CASCADE,
    INDEX idx_funds_request (`funds_request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目经费申请明细表';

-- 19. 项目经费申请附件表
CREATE TABLE IF NOT EXISTS `FundsRequestFile` (
    `id` VARCHAR(36) PRIMARY KEY,
    `funds_request_id` VARCHAR(36) NOT NULL COMMENT '经费申请主记录ID',
    `attachment_type` ENUM('application', 'feedback') NOT NULL COMMENT '附件类型：申请附件/反馈附件',
    `file_name` VARCHAR(500) NOT NULL COMMENT '原始文件名',
    `file_path` VARCHAR(1000) NOT NULL COMMENT '存储路径',
    `file_size` BIGINT NOT NULL COMMENT '文件大小（字节）',
    `mime_type` VARCHAR(100) NOT NULL COMMENT 'MIME类型',
    `sort_order` INT DEFAULT 0 COMMENT '排序',
    `uploaded_by` VARCHAR(36) NOT NULL COMMENT '上传人ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
    FOREIGN KEY (`funds_request_id`) REFERENCES `FundsRequest`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`uploaded_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    INDEX idx_funds_request (`funds_request_id`),
    INDEX idx_type (`attachment_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目经费申请附件表';

-- =============================================
-- 七、产业资源
-- =============================================

-- 20. 产业资源主表
CREATE TABLE IF NOT EXISTS `IndustryResource` (
    `id` VARCHAR(36) PRIMARY KEY,
    `title` VARCHAR(200) NOT NULL COMMENT '资源标题',
    `summary` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '摘要',
    `content` LONGTEXT NOT NULL COMMENT '富文本正文',
    `enterprise_name` VARCHAR(200) DEFAULT NULL COMMENT '企业/单位名称',
    `industry` VARCHAR(100) DEFAULT NULL COMMENT '行业或领域标签',
    `source_url` VARCHAR(1000) DEFAULT NULL COMMENT '转载来源链接',
    `source_note` VARCHAR(500) DEFAULT NULL COMMENT '转载说明',
    `contact_name` VARCHAR(100) DEFAULT NULL COMMENT '联系人',
    `contact_phone` VARCHAR(50) DEFAULT NULL COMMENT '联系电话',
    `contact_email` VARCHAR(100) DEFAULT NULL COMMENT '联系邮箱',
    `status` ENUM('draft', 'published', 'closed', 'offline') NOT NULL DEFAULT 'draft' COMMENT '状态：草稿/已发布/已关闭/下架',
    `publisher_id` VARCHAR(36) NOT NULL COMMENT '发布人ID',
    `published_at` DATETIME DEFAULT NULL COMMENT '发布时间',
    `deadline` DATE DEFAULT NULL COMMENT '有效期',
    `view_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '浏览次数',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (`publisher_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    INDEX idx_status (`status`),
    INDEX idx_publisher (`publisher_id`),
    INDEX idx_published_at (`published_at`),
    INDEX idx_deadline (`deadline`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产业资源主表';

-- 21. 产业资源媒体附件表
CREATE TABLE IF NOT EXISTS `IndustryResourceMedia` (
    `id` VARCHAR(36) PRIMARY KEY,
    `resource_id` VARCHAR(36) NOT NULL COMMENT '产业资源ID',
    `file_type` ENUM('image', 'video', 'audio', 'attachment') NOT NULL COMMENT '媒体类型',
    `file_url` VARCHAR(1000) NOT NULL COMMENT '访问路径',
    `file_name` VARCHAR(500) NOT NULL COMMENT '原始文件名',
    `file_size` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '文件大小（字节）',
    `mime_type` VARCHAR(200) NOT NULL DEFAULT 'application/octet-stream' COMMENT 'MIME类型',
    `description` VARCHAR(500) DEFAULT NULL COMMENT '说明',
    `sort_order` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '排序',
    `uploaded_by` VARCHAR(36) NOT NULL COMMENT '上传人ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
    FOREIGN KEY (`resource_id`) REFERENCES `IndustryResource`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`uploaded_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    INDEX idx_resource (`resource_id`),
    INDEX idx_resource_type (`resource_id`, `file_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产业资源媒体附件表';

-- 22. 产业资源与项目关联表
CREATE TABLE IF NOT EXISTS `ProjectIndustryResource` (
    `id` VARCHAR(36) PRIMARY KEY,
    `project_id` VARCHAR(36) NOT NULL COMMENT '项目ID',
    `resource_id` VARCHAR(36) NOT NULL COMMENT '产业资源ID',
    `pushed_by` VARCHAR(36) DEFAULT NULL COMMENT '推送人ID',
    `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注',
    `status` ENUM('pushed', 'claimed', 'withdrawn', 'declined') NOT NULL DEFAULT 'pushed' COMMENT '状态：已推送/已承接/已撤回/已拒绝',
    `claimed_by` VARCHAR(36) DEFAULT NULL COMMENT '认领人ID',
    `claimed_at` DATETIME DEFAULT NULL COMMENT '认领时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '推送时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY `unique_project_resource` (`project_id`, `resource_id`),
    FOREIGN KEY (`project_id`) REFERENCES `Project`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`resource_id`) REFERENCES `IndustryResource`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`pushed_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`claimed_by`) REFERENCES `User`(`id`) ON DELETE SET NULL,
    INDEX idx_project (`project_id`),
    INDEX idx_resource (`resource_id`),
    INDEX idx_status (`status`),
    INDEX idx_pushed_by (`pushed_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产业资源与项目关联表';

-- =============================================
-- 八、科研成果登记
-- =============================================

-- 23. 科研成果登记表
CREATE TABLE IF NOT EXISTS `ResearchAchievement` (
    `id` VARCHAR(36) PRIMARY KEY,
    `type` ENUM('paper', 'patent', 'software', 'report', 'prototype', 'standard', 'award', 'other') NOT NULL COMMENT '成果类型',
    `name` VARCHAR(500) NOT NULL COMMENT '成果名称',
    `project_id` VARCHAR(36) NOT NULL COMMENT '所属项目ID',
    `output_date` DATE NOT NULL COMMENT '产出日期',
    `authors` VARCHAR(500) DEFAULT NULL COMMENT '作者，逗号分隔',
    `keywords` VARCHAR(500) DEFAULT NULL COMMENT '关键词，逗号分隔',
    `description` TEXT COMMENT '成果描述',
    `external_link` VARCHAR(1000) DEFAULT NULL COMMENT '外部链接',
    `journal_conference_name` VARCHAR(500) DEFAULT NULL COMMENT '期刊/会议名称',
    `doi_number` VARCHAR(200) DEFAULT NULL COMMENT 'DOI号',
    `volume_issue` VARCHAR(200) DEFAULT NULL COMMENT '卷/期',
    `publication_date` DATE DEFAULT NULL COMMENT '发表日期',
    `patent_number` VARCHAR(100) DEFAULT NULL COMMENT '专利号',
    `patent_type` ENUM('invention', 'utility_model', 'design') DEFAULT NULL COMMENT '专利类型',
    `authority` VARCHAR(200) DEFAULT NULL COMMENT '授权机构',
    `status` ENUM('draft', 'submitted', 'verified', 'rejected') DEFAULT 'draft' COMMENT '状态',
    `created_by` VARCHAR(36) NOT NULL COMMENT '创建人ID',
    `verified_by` VARCHAR(36) COMMENT '审核人ID',
    `verified_date` DATE COMMENT '审核日期',
    `verification_comment` TEXT COMMENT '审核意见',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`project_id`) REFERENCES `Project`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`verified_by`) REFERENCES `User`(`id`) ON DELETE SET NULL,
    INDEX idx_type (`type`),
    INDEX idx_project (`project_id`),
    INDEX idx_status (`status`),
    INDEX idx_output_date (`output_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='科研成果登记表';

-- 24. 科研成果登记附件表
CREATE TABLE IF NOT EXISTS `ResearchAchievementFile` (
    `id` VARCHAR(36) PRIMARY KEY,
    `achievement_id` VARCHAR(36) NOT NULL COMMENT '科研成果登记ID',
    `file_name` VARCHAR(500) NOT NULL COMMENT '原始文件名',
    `file_path` VARCHAR(1000) NOT NULL COMMENT '存储路径',
    `file_size` BIGINT NOT NULL COMMENT '文件大小（字节）',
    `mime_type` VARCHAR(100) NOT NULL COMMENT 'MIME类型',
    `sort_order` INT DEFAULT 0 COMMENT '排序',
    `uploaded_by` VARCHAR(36) NOT NULL COMMENT '上传人ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`achievement_id`) REFERENCES `ResearchAchievement`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`uploaded_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    INDEX idx_achievement (`achievement_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='科研成果登记附件表';

-- =============================================
-- 九、活动登记
-- =============================================

-- 25. 活动登记表
CREATE TABLE IF NOT EXISTS `ActivityRecord` (
    `id` VARCHAR(36) PRIMARY KEY,
    `project_id` VARCHAR(36) NOT NULL COMMENT '项目ID',
    `title` VARCHAR(200) NOT NULL COMMENT '活动标题',
    `description` TEXT COMMENT '活动说明',
    `record_date` DATE DEFAULT NULL COMMENT '活动记录日期',
    `status` ENUM('submitted', 'approved', 'rejected') NOT NULL DEFAULT 'submitted' COMMENT '审批状态',
    `reviewed_by` VARCHAR(36) DEFAULT NULL COMMENT '审批人ID',
    `reviewed_at` DATETIME DEFAULT NULL COMMENT '审批时间',
    `review_comment` TEXT DEFAULT NULL COMMENT '审批意见',
    `created_by` VARCHAR(36) NOT NULL COMMENT '创建人ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (`project_id`) REFERENCES `Project`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    INDEX idx_project (`project_id`),
    INDEX idx_created_by (`created_by`),
    INDEX idx_record_date (`record_date`),
    INDEX idx_status (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活动登记表';

-- 26. 活动登记附件表
CREATE TABLE IF NOT EXISTS `ActivityRecordFile` (
    `id` VARCHAR(36) PRIMARY KEY,
    `record_id` VARCHAR(36) NOT NULL COMMENT '活动记录ID',
    `file_name` VARCHAR(500) NOT NULL COMMENT '原始文件名',
    `file_path` VARCHAR(1000) NOT NULL COMMENT '存储路径',
    `file_size` BIGINT NOT NULL COMMENT '文件大小（字节）',
    `mime_type` VARCHAR(200) NOT NULL DEFAULT 'application/octet-stream' COMMENT 'MIME类型',
    `sort_order` INT DEFAULT 0 COMMENT '排序',
    `uploaded_by` VARCHAR(36) NOT NULL COMMENT '上传人ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
    FOREIGN KEY (`record_id`) REFERENCES `ActivityRecord`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`uploaded_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    INDEX idx_record (`record_id`),
    INDEX idx_uploaded_by (`uploaded_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活动登记附件表';

-- =============================================
-- 十、转化成果登记
-- =============================================

-- 27. 转化成果登记表
CREATE TABLE IF NOT EXISTS `TransformationAchievement` (
    `id` VARCHAR(36) PRIMARY KEY,
    `project_id` VARCHAR(36) NOT NULL COMMENT '项目ID',
    `project_leader` VARCHAR(100) NOT NULL COMMENT '项目负责人',
    `transform_method` ENUM('tech_license', 'tech_transfer', 'equity_investment', 'startup_company') NOT NULL COMMENT '转化方式',
    `platform_service_content` TEXT COMMENT '平台提供服务内容',
    `transform_date` DATE COMMENT '转化时间',
    `recipient_company` VARCHAR(200) COMMENT '承接方公司名称',
    `recipient_province` VARCHAR(50) COMMENT '承接方省份',
    `recipient_city` VARCHAR(50) COMMENT '承接方城市',
    `recipient_district` VARCHAR(50) COMMENT '承接方区县',
    `contract_amount` DECIMAL(12,2) COMMENT '合同金额（万元）',
    `company_name` VARCHAR(200) COMMENT '公司名称',
    `company_credit_code` VARCHAR(50) COMMENT '统一社会信用代码',
    `establishment_date` DATE COMMENT '成立时间',
    `registered_address` VARCHAR(500) COMMENT '注册地址',
    `company_introduction` TEXT COMMENT '公司简介',
    `invested_amount` DECIMAL(12,2) COMMENT '获投融资（万元）',
    `paid_in_amount` DECIMAL(12,2) COMMENT '实缴金额（万元）',
    `status` ENUM('draft', 'submitted', 'verified', 'rejected') DEFAULT 'draft' COMMENT '状态',
    `created_by` VARCHAR(36) NOT NULL COMMENT '创建人ID',
    `verified_by` VARCHAR(36) COMMENT '审核人ID',
    `verified_date` DATE COMMENT '审核日期',
    `verification_comment` TEXT COMMENT '审核意见',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`project_id`) REFERENCES `Project`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`verified_by`) REFERENCES `User`(`id`) ON DELETE SET NULL,
    INDEX idx_project (`project_id`),
    INDEX idx_status (`status`),
    INDEX idx_transform_method (`transform_method`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='转化成果登记表';

-- 28. 转化成果登记附件表
CREATE TABLE IF NOT EXISTS `TransformationAchievementFile` (
    `id` VARCHAR(36) PRIMARY KEY,
    `achievement_id` VARCHAR(36) NOT NULL COMMENT '转化成果登记ID',
    `file_name` VARCHAR(500) NOT NULL COMMENT '原始文件名',
    `file_path` VARCHAR(1000) NOT NULL COMMENT '存储路径',
    `file_size` BIGINT NOT NULL COMMENT '文件大小（字节）',
    `mime_type` VARCHAR(100) NOT NULL COMMENT 'MIME类型',
    `sort_order` INT DEFAULT 0 COMMENT '排序',
    `uploaded_by` VARCHAR(36) NOT NULL COMMENT '上传人ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`achievement_id`) REFERENCES `TransformationAchievement`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`uploaded_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    INDEX idx_achievement (`achievement_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='转化成果登记附件表';

-- =============================================
-- 十一、企业服务成果登记
-- =============================================

-- 29. 企业服务成果登记表
CREATE TABLE IF NOT EXISTS `EnterpriseServiceAchievement` (
    `id` VARCHAR(36) PRIMARY KEY,
    `achievement_type` ENUM('tech_cooperation', 'qualification_certification') NOT NULL COMMENT '成果类型：技术合作/资质认定',
    `created_by` VARCHAR(36) NOT NULL COMMENT '创建人ID',
    `status` ENUM('draft', 'submitted', 'verified', 'rejected') DEFAULT 'draft' COMMENT '状态',
    `verified_by` VARCHAR(36) COMMENT '审核人ID',
    `verified_date` DATE COMMENT '审核日期',
    `verification_comment` TEXT COMMENT '审核意见',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `service_enterprise` VARCHAR(200) COMMENT '服务企业全称',
    `start_date` DATE COMMENT '开始时间',
    `completion_date` DATE COMMENT '完成时间',
    `contract_name` VARCHAR(200) COMMENT '合同名称',
    `contract_amount` DECIMAL(12,2) COMMENT '合同金额（万元）',
    `contract_content` TEXT COMMENT '合同内容',
    `is_sample_production` BOOLEAN DEFAULT FALSE COMMENT '是否推动样品化或小批量试制',
    `is_new_product` BOOLEAN DEFAULT FALSE COMMENT '是否推动形成新产品',
    `qualified_enterprise` VARCHAR(200) COMMENT '被认定资质的企业全称',
    `qualification_type` VARCHAR(100) COMMENT '资质认定类型',
    `qualification_date` DATE COMMENT '认定时间',
    `service_provider_id` VARCHAR(36) COMMENT '服务机构ID',
    `service_content_brief` TEXT COMMENT '服务内容简述',
    FOREIGN KEY (`created_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`verified_by`) REFERENCES `User`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`service_provider_id`) REFERENCES `ServiceProvider`(`id`) ON DELETE SET NULL,
    INDEX idx_achievement_type (`achievement_type`),
    INDEX idx_status (`status`),
    INDEX idx_created_by (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企业服务成果登记表';

-- 30. 企业服务成果-涉及项目关联表
CREATE TABLE IF NOT EXISTS `EnterpriseServiceProject` (
    `id` VARCHAR(36) PRIMARY KEY,
    `achievement_id` VARCHAR(36) NOT NULL COMMENT '企业服务成果登记ID',
    `project_id` VARCHAR(36) NOT NULL COMMENT '涉及项目ID',
    `project_leader` VARCHAR(100) NOT NULL COMMENT '项目负责人',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_achievement_project` (`achievement_id`, `project_id`),
    FOREIGN KEY (`achievement_id`) REFERENCES `EnterpriseServiceAchievement`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`project_id`) REFERENCES `Project`(`id`) ON DELETE CASCADE,
    INDEX idx_achievement (`achievement_id`),
    INDEX idx_project (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企业服务成果-涉及项目关联表';

-- 31. 企业服务成果-样品/产品记录表
CREATE TABLE IF NOT EXISTS `EnterpriseServiceSampleProduct` (
    `id` VARCHAR(36) PRIMARY KEY,
    `achievement_id` VARCHAR(36) NOT NULL COMMENT '企业服务成果登记ID',
    `type` ENUM('sample', 'new_product') NOT NULL COMMENT '类型：样品/新产品',
    `name` VARCHAR(200) NOT NULL COMMENT '名称',
    `completion_date` DATE COMMENT '完成时间',
    `output_value_amount` DECIMAL(12,2) COMMENT '产值/销售提升金额（万元）',
    `sort_order` INT DEFAULT 0 COMMENT '排序',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`achievement_id`) REFERENCES `EnterpriseServiceAchievement`(`id`) ON DELETE CASCADE,
    INDEX idx_achievement (`achievement_id`),
    INDEX idx_type (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企业服务成果-样品/产品记录表';

-- 32. 企业服务成果登记附件表
CREATE TABLE IF NOT EXISTS `EnterpriseServiceAchievementFile` (
    `id` VARCHAR(36) PRIMARY KEY,
    `achievement_id` VARCHAR(36) NOT NULL COMMENT '企业服务成果登记ID',
    `file_name` VARCHAR(500) NOT NULL COMMENT '原始文件名',
    `file_path` VARCHAR(1000) NOT NULL COMMENT '存储路径',
    `file_size` BIGINT NOT NULL COMMENT '文件大小（字节）',
    `mime_type` VARCHAR(100) NOT NULL COMMENT 'MIME类型',
    `sort_order` INT DEFAULT 0 COMMENT '排序',
    `uploaded_by` VARCHAR(36) NOT NULL COMMENT '上传人ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`achievement_id`) REFERENCES `EnterpriseServiceAchievement`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`uploaded_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    INDEX idx_achievement (`achievement_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企业服务成果登记附件表';

-- =============================================
-- 十二、新闻公告
-- =============================================

-- 33. 新闻公告主表
CREATE TABLE IF NOT EXISTS `News` (
    `id` VARCHAR(36) PRIMARY KEY COMMENT '新闻ID',
    `title` VARCHAR(200) NOT NULL COMMENT '标题',
    `summary` VARCHAR(500) NOT NULL COMMENT '摘要',
    `content` LONGTEXT NOT NULL COMMENT '富文本内容',
    `author_id` VARCHAR(36) NOT NULL COMMENT '作者ID',
    `status` ENUM('draft', 'published', 'offline') NOT NULL DEFAULT 'draft' COMMENT '状态',
    `is_top` ENUM('yes', 'no') NOT NULL DEFAULT 'no' COMMENT '是否置顶',
    `is_carousel` ENUM('yes', 'no') NOT NULL DEFAULT 'no' COMMENT '是否首页轮播',
    `view_count` INT UNSIGNED DEFAULT 0 COMMENT '浏览次数',
    `published_at` DATETIME COMMENT '发布时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (`author_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    INDEX idx_status (`status`),
    INDEX idx_published (`published_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='新闻公告主表';

-- 34. 新闻媒体文件表
CREATE TABLE IF NOT EXISTS `NewsMedia` (
    `id` VARCHAR(36) PRIMARY KEY COMMENT '媒体文件ID',
    `news_id` VARCHAR(36) NOT NULL COMMENT '所属新闻ID',
    `file_type` ENUM('image', 'video', 'audio') NOT NULL COMMENT '媒体类型',
    `file_url` VARCHAR(512) NOT NULL COMMENT '访问URL',
    `file_name` VARCHAR(200) NOT NULL COMMENT '原始文件名',
    `file_size` BIGINT UNSIGNED NOT NULL COMMENT '文件大小（字节）',
    `mime_type` VARCHAR(100) NOT NULL COMMENT 'MIME类型',
    `description` VARCHAR(500) DEFAULT '' COMMENT '说明',
    `sort_order` INT UNSIGNED DEFAULT 0 COMMENT '排序',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
    FOREIGN KEY (`news_id`) REFERENCES `News`(`id`) ON DELETE CASCADE,
    INDEX idx_news_type (`news_id`, `file_type`),
    INDEX idx_news_url (`news_id`, `file_url`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='新闻媒体文件表';

-- 35. 首页轮播配置表
CREATE TABLE IF NOT EXISTS `CarouselConfig` (
    `id` VARCHAR(36) PRIMARY KEY COMMENT '轮播项ID',
    `news_id` VARCHAR(36) NOT NULL COMMENT '关联新闻ID',
    `image_url` VARCHAR(512) NOT NULL COMMENT '轮播图片URL',
    `display_order` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '排序',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (`news_id`) REFERENCES `News`(`id`) ON DELETE CASCADE,
    INDEX idx_news_order (`news_id`, `display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='首页轮播配置表';

-- =============================================
-- 十三、系统与通用
-- =============================================

-- 36. 通知消息表
CREATE TABLE IF NOT EXISTS `Notification` (
    `id` VARCHAR(36) PRIMARY KEY,
    `user_id` VARCHAR(36) NOT NULL,
    `type` ENUM('project', 'review', 'funding', 'incubation', 'system', 'reminder', 'invitation') NOT NULL COMMENT '通知类型',
    `title` VARCHAR(200) NOT NULL COMMENT '标题',
    `content` TEXT NOT NULL COMMENT '内容',
    `related_id` VARCHAR(36) COMMENT '关联记录ID',
    `related_type` VARCHAR(50) COMMENT '关联记录类型',
    `priority` ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium' COMMENT '优先级',
    `action_url` VARCHAR(500) COMMENT '操作链接',
    `is_read` BOOLEAN DEFAULT FALSE COMMENT '是否已读',
    `read_at` DATETIME COMMENT '阅读时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE,
    INDEX idx_user_read (`user_id`, `is_read`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知消息表';

-- 37. 操作日志表
CREATE TABLE IF NOT EXISTS `AuditLog` (
    `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
    `user_id` VARCHAR(36),
    `action` VARCHAR(100) NOT NULL COMMENT '操作动作',
    `table_name` VARCHAR(50) NOT NULL COMMENT '操作表名',
    `record_id` VARCHAR(36) COMMENT '记录ID',
    `old_values` JSON COMMENT '修改前值',
    `new_values` JSON COMMENT '修改后值',
    `ip_address` VARCHAR(45) COMMENT 'IP地址',
    `user_agent` VARCHAR(500) COMMENT '用户代理',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (`user_id`),
    INDEX idx_table (`table_name`, `record_id`),
    INDEX idx_time (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- 38. 数据导出日志表
CREATE TABLE IF NOT EXISTS `ExportLog` (
    `id` VARCHAR(36) PRIMARY KEY,
    `user_id` VARCHAR(36) COMMENT '导出人ID',
    `export_type` VARCHAR(50) NOT NULL COMMENT '导出类型',
    `export_params` JSON COMMENT '导出参数',
    `file_name` VARCHAR(500) NOT NULL COMMENT '导出文件名',
    `file_path` VARCHAR(1000) NOT NULL COMMENT '导出文件路径',
    `file_size` BIGINT COMMENT '文件大小',
    `record_count` INT COMMENT '导出记录数',
    `status` ENUM('processing', 'completed', 'failed') DEFAULT 'processing' COMMENT '状态',
    `error_message` TEXT COMMENT '错误信息',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `completed_at` DATETIME COMMENT '完成时间',
    FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL,
    INDEX idx_user (`user_id`),
    INDEX idx_type (`export_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据导出日志表';