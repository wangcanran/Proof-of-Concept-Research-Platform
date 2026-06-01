-- 已有库升级：为孵化服务申请增加「服务类别」多选（MySQL SET）
-- 执行：mysql -u ... -p research_system < add_incubation_progress_service_categories.sql

USE research_system;

ALTER TABLE `IncubationProgress`
ADD COLUMN `service_categories` SET('tech','business','ip','resource','incubation')
  DEFAULT NULL
  COMMENT '服务类别（多选，与前台勾选一致）'
AFTER `service_requirement`;
