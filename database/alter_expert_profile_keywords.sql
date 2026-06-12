-- =============================================
-- 增量升级：专家扩展表增加关键词字段
-- 专家填写 expertise_description 后，由接入的大模型自动提取关键词写入本字段，供检索匹配专家。
-- 勿直接改 research_system_db.sql
--
-- 用法：
--   mysql -u用户 -p research_system < alter_expert_profile_keywords.sql
-- =============================================

USE research_system;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ExpertProfile`
  ADD COLUMN `keywords` VARCHAR(500) DEFAULT NULL
    COMMENT '专业关键词（大模型根据 expertise_description 自动提取，逗号分隔，用于专家检索）'
  AFTER `expertise_description`;
