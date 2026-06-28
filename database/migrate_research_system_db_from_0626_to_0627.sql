-- =============================================
-- 数据库迁移脚本: research_system
-- 迁移日期: 2026-06-28
-- 说明: 从0626版本迁移到0627版本，保留已有数据
-- =============================================

USE research_system;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================
-- 一、新增表
-- =============================================

-- 1. 服务资源表
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

-- 2. 孵化服务申请服务机构分配表
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

-- 3. 产业资源主表 (原 EnterpriseDemand)
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

-- 4. 产业资源媒体附件表 (原 EnterpriseDemandMedia)
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

-- 5. 产业资源与项目关联表 (原 ProjectEnterpriseDemand)
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

-- 6. 科研成果登记表 (原 ProjectAchievement)
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
    `submission_type` ENUM('applicant', 'project_manager', 'admin') NOT NULL DEFAULT 'applicant' COMMENT '提交人类型：申请人/项目经理/管理员',
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

-- 7. 科研成果登记附件表 (原 ProjectAchievementFile)
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

-- 8. 活动登记表 (原 IncubationAchievementRecord)
CREATE TABLE IF NOT EXISTS `ActivityRecord` (
    `id` VARCHAR(36) PRIMARY KEY,
    `project_id` VARCHAR(36) NOT NULL COMMENT '项目ID',
    `title` VARCHAR(200) NOT NULL COMMENT '活动标题',
    `description` TEXT COMMENT '活动说明',
    `record_date` DATE DEFAULT NULL COMMENT '活动记录日期',
    `status` ENUM('submitted', 'approved', 'rejected') NOT NULL DEFAULT 'submitted' COMMENT '审批状态',
    `submission_type` ENUM('applicant', 'project_manager', 'admin') NOT NULL DEFAULT 'applicant' COMMENT '提交人类型：申请人/项目经理/管理员',
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

-- 9. 活动登记附件表 (原 IncubationAchievementRecordFile)
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

-- 10. 转化成果登记表
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
    `submission_type` ENUM('applicant', 'project_manager', 'admin') NOT NULL DEFAULT 'applicant' COMMENT '提交人类型：申请人/项目经理/管理员',
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

-- 11. 转化成果登记附件表
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

-- 12. 企业服务成果登记表
CREATE TABLE IF NOT EXISTS `EnterpriseServiceAchievement` (
    `id` VARCHAR(36) PRIMARY KEY,
    `achievement_type` ENUM('tech_cooperation', 'qualification_certification') NOT NULL COMMENT '成果类型：技术合作/资质认定',
    `created_by` VARCHAR(36) NOT NULL COMMENT '创建人ID',
    `status` ENUM('draft', 'submitted', 'verified', 'rejected') DEFAULT 'draft' COMMENT '状态',
    `submission_type` ENUM('applicant', 'project_manager', 'admin') NOT NULL DEFAULT 'applicant' COMMENT '提交人类型：申请人/项目经理/管理员',
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

-- 13. 企业服务成果-涉及项目关联表
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

-- 14. 企业服务成果-样品/产品记录表
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

-- 15. 企业服务成果登记附件表
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
-- 二、修改已有表 (ALTER TABLE)
-- =============================================

-- 2.1 ExpertProfile 表：新增 expert_types 字段
ALTER TABLE `ExpertProfile` 
ADD COLUMN `expert_types` SET('technical', 'investment', 'industry', 'tech_service') DEFAULT NULL COMMENT '专家类型：技术专家/投资专家/产业专家/科技服务专家' AFTER `keywords`;

-- 2.2 将 ExpertExpertType 表中的数据迁移到 ExpertProfile.expert_types
UPDATE `ExpertProfile` ep
SET ep.`expert_types` = (
    SELECT GROUP_CONCAT(DISTINCT eet.`expert_type` SEPARATOR ',')
    FROM `ExpertExpertType` eet
    WHERE eet.`expert_id` = ep.`id`
)
WHERE EXISTS (
    SELECT 1 FROM `ExpertExpertType` eet WHERE eet.`expert_id` = ep.`id`
);

-- 2.3 IncubationProgress 表：删除成果相关字段和状态值
ALTER TABLE `IncubationProgress`
DROP COLUMN `result_date`,
DROP COLUMN `result_description`;

-- 修改 status 字段的 ENUM 值
ALTER TABLE `IncubationProgress` 
MODIFY COLUMN `status` ENUM('pending', 'feedback_given') NOT NULL DEFAULT 'pending' COMMENT '状态：待反馈/已反馈';

-- 2.4 IncubationProgressFile 表：删除 result 附件类型
ALTER TABLE `IncubationProgressFile` 
MODIFY COLUMN `attachment_type` ENUM('application', 'feedback') NOT NULL COMMENT '附件类型：申请附件/反馈附件';

-- 2.5 IncubationProgressExpert 表：删除 expert_type 字段
ALTER TABLE `IncubationProgressExpert`
DROP COLUMN `expert_type`;

-- 2.6 FundsRequest 表：删除成果相关字段和状态值
ALTER TABLE `FundsRequest`
DROP COLUMN `result_date`,
DROP COLUMN `result_description`;

ALTER TABLE `FundsRequest` 
MODIFY COLUMN `status` ENUM('pending', 'feedback_given') NOT NULL DEFAULT 'pending' COMMENT '状态：待反馈/已反馈';

-- 2.7 FundsRequestFile 表：删除 result 附件类型
ALTER TABLE `FundsRequestFile` 
MODIFY COLUMN `attachment_type` ENUM('application', 'feedback') NOT NULL COMMENT '附件类型：申请附件/反馈附件';


-- =============================================
-- 三、数据迁移（旧表 -> 新表）
-- =============================================

-- 3.1 迁移企业需求数据到产业资源表 (EnterpriseDemand -> IndustryResource)
INSERT INTO `IndustryResource` (
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

-- 3.2 迁移企业需求媒体到产业资源媒体 (EnterpriseDemandMedia -> IndustryResourceMedia)
INSERT INTO `IndustryResourceMedia` (
    `id`, `resource_id`, `file_type`, `file_url`, `file_name`,
    `file_size`, `mime_type`, `description`, `sort_order`, `uploaded_by`, `created_at`
)
SELECT 
    `id`, `demand_id`, `file_type`, `file_url`, `file_name`,
    `file_size`, `mime_type`, `description`, `sort_order`, `uploaded_by`, `created_at`
FROM `EnterpriseDemandMedia`;

-- 3.3 迁移企业需求-项目关联到产业资源-项目关联 (ProjectEnterpriseDemand -> ProjectIndustryResource)
INSERT INTO `ProjectIndustryResource` (
    `id`, `project_id`, `resource_id`, `pushed_by`, `remark`,
    `status`, `claimed_by`, `claimed_at`, `created_at`, `updated_at`
)
SELECT 
    `id`, `project_id`, `demand_id`, `pushed_by`, `remark`,
    `status`, `claimed_by`, `claimed_at`, `created_at`, `updated_at`
FROM `ProjectEnterpriseDemand`;

-- 3.4 迁移项目成果到科研成果登记 (ProjectAchievement -> ResearchAchievement)
INSERT INTO `ResearchAchievement` (
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

-- 截断过长的 name
UPDATE `ResearchAchievement` SET `name` = LEFT(`name`, 500) WHERE LENGTH(`name`) > 500;

-- 3.5 迁移项目成果附件到科研成果登记附件 (ProjectAchievementFile -> ResearchAchievementFile)
INSERT INTO `ResearchAchievementFile` (
    `id`, `achievement_id`, `file_name`, `file_path`, `file_size`,
    `mime_type`, `sort_order`, `uploaded_by`, `created_at`
)
SELECT 
    `id`, `achievement_id`, `file_name`, `file_path`, `file_size`,
    `mime_type`, `sort_order`, `uploaded_by`, `created_at`
FROM `ProjectAchievementFile`;

-- 3.6 迁移孵化中成果记录到活动登记 (IncubationAchievementRecord -> ActivityRecord)
INSERT INTO `ActivityRecord` (
    `id`, `project_id`, `title`, `description`, `record_date`,
    `status`, `submission_type`, `reviewed_by`, `reviewed_at`, `review_comment`,
    `created_by`, `created_at`, `updated_at`
)
SELECT 
    `id`, `project_id`, `title`, `description`, `record_date`,
    `status`, 'applicant', `reviewed_by`, `reviewed_at`, `review_comment`,
    `created_by`, `created_at`, `updated_at`
FROM `IncubationAchievementRecord`;

-- 3.7 迁移孵化中成果记录附件到活动登记附件 (IncubationAchievementRecordFile -> ActivityRecordFile)
INSERT INTO `ActivityRecordFile` (
    `id`, `record_id`, `file_name`, `file_path`, `file_size`,
    `mime_type`, `sort_order`, `uploaded_by`, `created_at`
)
SELECT 
    `id`, `record_id`, `file_name`, `file_path`, `file_size`,
    `mime_type`, `sort_order`, `uploaded_by`, `created_at`
FROM `IncubationAchievementRecordFile`;


-- =============================================
-- 四、删除旧表（数据已迁移完成后执行）
-- =============================================

-- 4.1 删除 ExpertExpertType 表
DROP TABLE IF EXISTS `ExpertExpertType`;

-- 4.2 删除原企业需求相关表
DROP TABLE IF EXISTS `ProjectEnterpriseDemand`;
DROP TABLE IF EXISTS `EnterpriseDemandMedia`;
DROP TABLE IF EXISTS `EnterpriseDemand`;

-- 4.3 删除原项目成果相关表
DROP TABLE IF EXISTS `ProjectAchievementFile`;
DROP TABLE IF EXISTS `ProjectAchievement`;

-- 4.4 删除原孵化中成果记录相关表
DROP TABLE IF EXISTS `IncubationAchievementRecordFile`;
DROP TABLE IF EXISTS `IncubationAchievementRecord`;

-- =============================================
-- 迁移完成
-- =============================================