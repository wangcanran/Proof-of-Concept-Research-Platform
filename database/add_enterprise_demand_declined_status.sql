-- 企业需求推送：增加「项目方拒绝承接」状态
-- 用法：Get-Content .\database\add_enterprise_demand_declined_status.sql -Raw -Encoding UTF8 | mysql -u root -p research_system

USE research_system;

ALTER TABLE `ProjectEnterpriseDemand`
  MODIFY COLUMN `status` ENUM('pushed', 'claimed', 'withdrawn', 'declined') NOT NULL DEFAULT 'pushed'
    COMMENT 'pushed=已推送待承接；claimed=已承接；withdrawn=项目经理撤回；declined=项目方拒绝承接';
