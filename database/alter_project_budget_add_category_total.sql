-- 在已有库上为 ProjectBudget.category 增加枚举值「总计」（与 research_system_db.sql 一致）
-- 原线上枚举为 10 项，本脚本在其后追加「总计」。
--
-- 若第二步 ENUM 仍报 ERROR 1265：说明 VARCHAR 阶段某行的文字与枚举字面量不一致。
-- 可先单独执行排查：
--   SELECT id, category, CHAR_LENGTH(category), HEX(category) FROM ProjectBudget;
--   SELECT DISTINCT category FROM ProjectBudget;
--
-- Windows 下 mysql 客户端 source 本脚本时，建议会话使用 utf8mb4（避免 ENUM 字面量与数据字节不一致报 1265）

USE research_system;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ① 先改为 VARCHAR（按文字保存，避免扩 ENUM 时序号错位）
ALTER TABLE `ProjectBudget`
  MODIFY COLUMN `category` VARCHAR(32) NOT NULL COMMENT '预算类别';

-- ①b 清洗后再转 ENUM（解决空格、别名、异常历史值）
UPDATE `ProjectBudget` SET `category` = TRIM(`category`);

UPDATE `ProjectBudget` SET `category` = '其他' WHERE `category` IN ('其它', '');

UPDATE `ProjectBudget` SET `category` = '其他'
WHERE `category` NOT IN (
  '设备费',
  '材料费',
  '测试费',
  '差旅费',
  '会议费',
  '劳务费',
  '专家咨询费',
  '出版费',
  '管理费',
  '其他',
  '总计'
);

-- ② 目标 ENUM（原 10 项 + 总计）
ALTER TABLE `ProjectBudget`
  MODIFY COLUMN `category` ENUM(
    '设备费',
    '材料费',
    '测试费',
    '差旅费',
    '会议费',
    '劳务费',
    '专家咨询费',
    '出版费',
    '管理费',
    '其他',
    '总计'
  ) NOT NULL COMMENT '预算类别';
