-- 企业需求：项目申请人主动申请直接承接（无需项目经理确认）
-- 用法：Get-Content .\database\add_enterprise_demand_applied_status.sql -Raw -Encoding UTF8 | mysql -u root -p research_system

USE research_system;

-- 若尚未执行过本脚本，先允许 pushed_by 为空（主动申请无推送人）
ALTER TABLE `ProjectEnterpriseDemand`
  MODIFY COLUMN `pushed_by` VARCHAR(36) DEFAULT NULL COMMENT '推送人（项目经理）；申请人主动申请时为空';

-- 历史「待确认申请」直接视为已承接
UPDATE `ProjectEnterpriseDemand` SET `status` = 'claimed' WHERE `status` = 'applied';
