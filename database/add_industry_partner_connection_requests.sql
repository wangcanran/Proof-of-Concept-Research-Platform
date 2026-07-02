-- 产业资源库对接申请
-- PowerShell: Get-Content .\database\add_industry_partner_connection_requests.sql -Raw -Encoding UTF8 | mysql -u root -p --default-character-set=utf8mb4 research_system

CREATE TABLE IF NOT EXISTS `IndustryPartnerConnectionRequest` (
    `id` VARCHAR(36) PRIMARY KEY,
    `partner_id` VARCHAR(36) NOT NULL COMMENT '产业合作伙伴ID',
    `project_id` VARCHAR(36) NOT NULL COMMENT '关联项目ID',
    `applicant_id` VARCHAR(36) NOT NULL COMMENT '申请人ID',
    `intention_note` TEXT NOT NULL COMMENT '对接意向说明',
    `status` ENUM('pending', 'confirmed', 'deferred', 'rejected') NOT NULL DEFAULT 'pending' COMMENT '待处理/已确认/暂缓/不合适',
    `handled_by` VARCHAR(36) DEFAULT NULL COMMENT '处理项目经理ID',
    `partner_intention` TEXT COMMENT '对方对接意向（确认时填写）',
    `handle_note` TEXT COMMENT '处理说明（暂缓/不合适等原因）',
    `handled_at` DATETIME DEFAULT NULL COMMENT '处理时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`partner_id`) REFERENCES `IndustryPartner`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`project_id`) REFERENCES `Project`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`applicant_id`) REFERENCES `User`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`handled_by`) REFERENCES `User`(`id`) ON DELETE SET NULL,
    INDEX idx_partner (`partner_id`),
    INDEX idx_project (`project_id`),
    INDEX idx_applicant (`applicant_id`),
    INDEX idx_status (`status`),
    INDEX idx_handled_by (`handled_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产业资源库对接申请';
