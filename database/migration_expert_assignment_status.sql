-- 已有数据库升级：去掉 ExpertAssignment.status 的 expired，与 research_system_db.sql 一致
-- 执行前请备份。

UPDATE `ExpertAssignment` SET `status` = 'reviewing' WHERE `status` = 'expired';

ALTER TABLE `ExpertAssignment`
  MODIFY COLUMN `status` ENUM('reviewing', 'accepted', 'declined') DEFAULT 'reviewing'
  COMMENT '进行中/通过/不通过；超期由 deadline 判断，不设单独状态';
