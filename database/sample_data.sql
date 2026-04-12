-- =============================================
-- 示例数据插入脚本（仅包含基础用户与领域数据）
-- =============================================
-- Windows 下 mysql 客户端默认可能为 GBK，请用 UTF-8 导入，否则会乱码或 ENUM 报错：
--   mysql -u root -p --default-character-set=utf8mb4 < sample_data.sql
-- 建库建表脚本 research_system_db.sql 也请同样加上 --default-character-set=utf8mb4

SET NAMES utf8mb4;
USE research_system;

-- =============================================
-- 一、研究领域数据
-- =============================================
-- 根据系统规范，只有以下6个标准领域+其他
INSERT IGNORE INTO `ResearchDomain` (`id`, `name`, `code`, `sort_order`, `enabled`) VALUES
('ai-ml', '人工智能与机器学习', 'AI_ML', 1, TRUE),
('bigdata-gov', '大数据与数据治理', 'BIGDATA_GOV', 2, TRUE),
('ic-design', '集成电路设计与应用', 'IC_DESIGN', 3, TRUE),
('digital-twin', '数字孪生与元宇宙', 'DIGITAL_TWIN', 4, TRUE),
('industrial-sw', '工业软件与智能制造', 'INDUSTRIAL_SW', 5, TRUE),
('cyber-security', '网络安全与数据安全', 'CYBER_SECURITY', 6, TRUE),
('other', '其他', 'OTHER', 7, TRUE);
-- 非平台标准方向不新增 ResearchDomain 行；项目选「其他」后在 Project.project_domain_other_text 填写说明（见库表注释）。

-- =============================================
-- 二、用户数据
-- =============================================
-- 密码使用 bcrypt 加密后的 '123456'
INSERT INTO `User` (`id`, `username`, `password`, `name`, `email`, `role`, `department`, `title`, `phone`, `status`, `last_login`) VALUES
-- 管理员
('usr-admin', 'admin', '$2b$10$bvmvtUaa/wW29fvCSDUYdOj/c5KPhUowfzsTV/QkJRQ56VqWvfI1S', '系统管理员', 'admin@research.cn', 'admin', '科研管理处', '高级工程师', '13800000000', 'active', NOW()),
-- 项目经理
('usr-pm1', 'zhangwei', '$2b$10$bvmvtUaa/wW29fvCSDUYdOj/c5KPhUowfzsTV/QkJRQ56VqWvfI1S', '张伟', 'zhangwei@research.cn', 'project_manager', '科研管理处', '项目主管', '13800000001', 'active', NOW()),
('usr-pm2', 'lihua', '$2b$10$bvmvtUaa/wW29fvCSDUYdOj/c5KPhUowfzsTV/QkJRQ56VqWvfI1S', '李华', 'lihua@research.cn', 'project_manager', '技术转移中心', '高级项目经理', '13800000002', 'active', NULL),
-- 申请人
('usr-app1', 'wangqiang', '$2b$10$bvmvtUaa/wW29fvCSDUYdOj/c5KPhUowfzsTV/QkJRQ56VqWvfI1S', '王强', 'wangqiang@lab.cn', 'applicant', '人工智能研究院', '教授', '13900000001', 'active', NOW()),
('usr-app2', 'chenjing', '$2b$10$bvmvtUaa/wW29fvCSDUYdOj/c5KPhUowfzsTV/QkJRQ56VqWvfI1S', '陈静', 'chenjing@lab.cn', 'applicant', '生物医学工程学院', '副教授', '13900000002', 'active', NULL),
('usr-app3', 'liuming', '$2b$10$bvmvtUaa/wW29fvCSDUYdOj/c5KPhUowfzsTV/QkJRQ56VqWvfI1S', '刘明', 'liuming@lab.cn', 'applicant', '材料科学与工程学院', '研究员', '13900000003', 'active', NULL),
('usr-app4', 'zhaoyan', '$2b$10$bvmvtUaa/wW29fvCSDUYdOj/c5KPhUowfzsTV/QkJRQ56VqWvfI1S', '赵燕', 'zhaoyan@lab.cn', 'applicant', '新能源研究院', '教授', '13900000004', 'inactive', NULL),
-- 评审专家
('usr-exp1', 'liuyang', '$2b$10$bvmvtUaa/wW29fvCSDUYdOj/c5KPhUowfzsTV/QkJRQ56VqWvfI1S', '刘洋', 'liuyang@expert.cn', 'reviewer', '计算机学院', '教授', '13700000001', 'active', NOW()),
('usr-exp2', 'zhoujie', '$2b$10$bvmvtUaa/wW29fvCSDUYdOj/c5KPhUowfzsTV/QkJRQ56VqWvfI1S', '周杰', 'zhoujie@expert.cn', 'reviewer', '生命科学学院', '研究员', '13700000002', 'active', NULL),
('usr-exp3', 'wumin', '$2b$10$bvmvtUaa/wW29fvCSDUYdOj/c5KPhUowfzsTV/QkJRQ56VqWvfI1S', '吴敏', 'wumin@expert.cn', 'reviewer', '材料学院', '教授', '13700000003', 'active', NULL),
('usr-exp4', 'zhenghao', '$2b$10$bvmvtUaa/wW29fvCSDUYdOj/c5KPhUowfzsTV/QkJRQ56VqWvfI1S', '郑浩', 'zhenghao@expert.cn', 'reviewer', '机械工程学院', '副教授', '13700000004', 'active', NULL);

-- =============================================
-- 三、专家扩展信息
-- =============================================
INSERT INTO `ExpertProfile` (`id`, `expertise_description`) VALUES
('usr-exp1', '主要从事机器学习、深度学习、计算机视觉研究，主持国家级项目3项，发表SCI论文40余篇'),
('usr-exp2', '专注于基因编辑、细胞治疗领域，拥有多项发明专利，担任多个国际期刊审稿人'),
('usr-exp3', '研究领域包括高性能复合材料、纳米材料，获得省部级科技奖励2项'),
('usr-exp4', '智能制造、工业机器人方向专家，产学研合作经验丰富');

-- =============================================
-- 四、专家擅长领域关联
-- =============================================
INSERT INTO `ExpertDomain` (`id`, `expert_id`, `domain_id`) VALUES
('expdom-001', 'usr-exp1', 'ai-ml'),
('expdom-002', 'usr-exp1', 'bigdata-gov'),
('expdom-003', 'usr-exp2', 'cyber-security'),
('expdom-004', 'usr-exp3', 'ic-design'),
('expdom-005', 'usr-exp4', 'industrial-sw'),
('expdom-006', 'usr-exp4', 'digital-twin');
