-- 产业资源库（产业化合作伙伴档案）
-- 用法: mysql -u用户 -p --default-character-set=utf8mb4 research_system < add_industry_partner_library.sql

CREATE TABLE IF NOT EXISTS `IndustryPartner` (
    `id` VARCHAR(36) PRIMARY KEY COMMENT '机构ID',
    `name` VARCHAR(200) NOT NULL COMMENT '机构名称',
    `org_category` ENUM('enterprise', 'government', 'other') NOT NULL DEFAULT 'enterprise' COMMENT '机构分类：企业/政府机构/其它',
    `main_products_services` TEXT COMMENT '主要产品/服务',
    `contact_name` VARCHAR(100) NOT NULL COMMENT '联系人',
    `contact_phone` VARCHAR(20) NOT NULL COMMENT '联系电话',
    `description` TEXT COMMENT '机构简介',
    `created_by` VARCHAR(36) DEFAULT NULL COMMENT '录入人ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`created_by`) REFERENCES `User`(`id`) ON DELETE SET NULL,
    INDEX idx_name (`name`),
    INDEX idx_org_category (`org_category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产业资源库-产业化合作伙伴档案';

CREATE TABLE IF NOT EXISTS `IndustryPartnerDomain` (
    `id` VARCHAR(36) PRIMARY KEY,
    `partner_id` VARCHAR(36) NOT NULL COMMENT '产业合作伙伴ID',
    `domain_id` VARCHAR(36) NOT NULL COMMENT '研究领域ID',
    UNIQUE KEY `unique_partner_domain` (`partner_id`, `domain_id`),
    FOREIGN KEY (`partner_id`) REFERENCES `IndustryPartner`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`domain_id`) REFERENCES `ResearchDomain`(`id`) ON DELETE CASCADE,
    INDEX idx_partner (`partner_id`),
    INDEX idx_domain (`domain_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产业资源库-机构所属领域';

CREATE TABLE IF NOT EXISTS `IncubationProgressIndustryPartner` (
    `id` VARCHAR(36) PRIMARY KEY,
    `progress_id` VARCHAR(36) NOT NULL COMMENT '孵化服务申请ID',
    `industry_partner_id` VARCHAR(36) NOT NULL COMMENT '产业合作伙伴ID',
    `assigned_by` VARCHAR(36) NOT NULL COMMENT '分配人ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '分配时间',
    UNIQUE KEY `unique_progress_partner` (`progress_id`, `industry_partner_id`),
    FOREIGN KEY (`progress_id`) REFERENCES `IncubationProgress`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`industry_partner_id`) REFERENCES `IndustryPartner`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`assigned_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
    INDEX idx_progress (`progress_id`),
    INDEX idx_partner (`industry_partner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='孵化服务申请-产业资源库机构分配';

-- 转化成果：关联产业资源库承接方
ALTER TABLE `TransformationAchievement`
    ADD COLUMN `industry_partner_id` VARCHAR(36) DEFAULT NULL COMMENT '承接方（产业资源库）' AFTER `recipient_district`,
    ADD INDEX idx_industry_partner (`industry_partner_id`);

-- 产业需求：关联需求来源机构
ALTER TABLE `IndustryResource`
    ADD COLUMN `source_partner_id` VARCHAR(36) DEFAULT NULL COMMENT '需求来源（产业资源库）' AFTER `enterprise_name`,
    ADD INDEX idx_source_partner (`source_partner_id`);
