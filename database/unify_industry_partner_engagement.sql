-- 统一产业资源库「承接」记录：对接申请确认 与 项目经理服务分配 共用 IndustryPartnerConnectionRequest
-- PowerShell: Get-Content .\database\unify_industry_partner_engagement.sql -Raw -Encoding UTF8 | mysql -u root -p --default-character-set=utf8mb4 research_system

ALTER TABLE `IndustryPartnerConnectionRequest`
    ADD COLUMN `source` ENUM('applicant_apply', 'pm_service_assign') NOT NULL DEFAULT 'applicant_apply'
        COMMENT '承接来源：项目方申请 / 项目经理服务分配' AFTER `status`,
    ADD COLUMN `incubation_progress_id` VARCHAR(36) DEFAULT NULL
        COMMENT '服务申请ID（项目经理分配时关联）' AFTER `source`,
    ADD INDEX idx_source (`source`),
    ADD INDEX idx_incubation_progress (`incubation_progress_id`);

-- 将历史服务分配写入承接记录（仅补 confirmed，且避免重复）
INSERT INTO `IndustryPartnerConnectionRequest`
    (`id`, `partner_id`, `project_id`, `applicant_id`, `intention_note`, `status`, `source`,
     `handled_by`, `handled_at`, `incubation_progress_id`, `created_at`)
SELECT UUID(), ipip.industry_partner_id, ip.project_id, p.applicant_id,
       '历史服务申请分配（数据迁移）', 'confirmed', 'pm_service_assign',
       ipip.assigned_by, ipip.created_at, ipip.progress_id, ipip.created_at
FROM `IncubationProgressIndustryPartner` ipip
INNER JOIN `IncubationProgress` ip ON ipip.progress_id = ip.id
INNER JOIN `Project` p ON ip.project_id = p.id
WHERE NOT EXISTS (
    SELECT 1 FROM `IndustryPartnerConnectionRequest` r
    WHERE r.project_id = ip.project_id
      AND r.partner_id = ipip.industry_partner_id
      AND r.status = 'confirmed'
);
