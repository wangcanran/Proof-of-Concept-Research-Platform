-- =============================================
-- 示例数据插入脚本
-- =============================================

USE research_system;

-- =============================================
-- 一、基础数据示例
-- =============================================

-- 1. 研究领域数据
INSERT INTO `ResearchDomain` (`id`, `name`, `code`, `sort_order`, `enabled`) VALUES
('dom-001', '人工智能与大数据', 'AI_BIGDATA', 1, TRUE),
('dom-002', '生物医药', 'BIOMED', 2, TRUE),
('dom-003', '新材料', 'NEW_MATERIAL', 3, TRUE),
('dom-004', '新能源与节能环保', 'NEW_ENERGY', 4, TRUE),
('dom-005', '高端装备制造', 'HIGH_END_EQUIP', 5, TRUE),
('dom-006', '现代农业', 'AGRICULTURE', 6, TRUE),
('dom-007', '信息技术与软件', 'IT_SOFTWARE', 7, TRUE),
('dom-008', '其他', 'OTHER', 99, TRUE);

-- 2. 用户数据（密码使用 bcrypt 加密后的 '123456'，实际使用时需替换）
INSERT INTO `User` (`id`, `username`, `password`, `name`, `email`, `role`, `department`, `title`, `phone`, `status`, `last_login`) VALUES
-- 管理员
('usr-admin', 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrJ6QqXqH7qXqH7qXqH7qXqH7qXqH7q', '系统管理员', 'admin@research.cn', 'admin', '科研管理处', '高级工程师', '13800000000', 'active', NOW()),
-- 项目经理
('usr-pm1', 'zhangwei', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrJ6QqXqH7qXqH7qXqH7qXqH7qXqH7q', '张伟', 'zhangwei@research.cn', 'project_manager', '科研管理处', '项目主管', '13800000001', 'active', NOW()),
('usr-pm2', 'lihua', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrJ6QqXqH7qXqH7qXqH7qXqH7qXqH7q', '李华', 'lihua@research.cn', 'project_manager', '技术转移中心', '高级项目经理', '13800000002', 'active', NULL),
-- 申请人
('usr-app1', 'wangqiang', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrJ6QqXqH7qXqH7qXqH7qXqH7qXqH7q', '王强', 'wangqiang@lab.cn', 'applicant', '人工智能研究院', '教授', '13900000001', 'active', NOW()),
('usr-app2', 'chenjing', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrJ6QqXqH7qXqH7qXqH7qXqH7qXqH7q', '陈静', 'chenjing@lab.cn', 'applicant', '生物医学工程学院', '副教授', '13900000002', 'active', NULL),
('usr-app3', 'liuming', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrJ6QqXqH7qXqH7qXqH7qXqH7qXqH7q', '刘明', 'liuming@lab.cn', 'applicant', '材料科学与工程学院', '研究员', '13900000003', 'active', NULL),
('usr-app4', 'zhaoyan', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrJ6QqXqH7qXqH7qXqH7qXqH7qXqH7q', '赵燕', 'zhaoyan@lab.cn', 'applicant', '新能源研究院', '教授', '13900000004', 'inactive', NULL),
-- 评审专家
('usr-exp1', 'liuyang', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrJ6QqXqH7qXqH7qXqH7qXqH7qXqH7q', '刘洋', 'liuyang@expert.cn', 'reviewer', '计算机学院', '教授', '13700000001', 'active', NOW()),
('usr-exp2', 'zhoujie', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrJ6QqXqH7qXqH7qXqH7qXqH7qXqH7q', '周杰', 'zhoujie@expert.cn', 'reviewer', '生命科学学院', '研究员', '13700000002', 'active', NULL),
('usr-exp3', 'wumin', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrJ6QqXqH7qXqH7qXqH7qXqH7qXqH7q', '吴敏', 'wumin@expert.cn', 'reviewer', '材料学院', '教授', '13700000003', 'active', NULL),
('usr-exp4', 'zhenghao', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrJ6QqXqH7qXqH7qXqH7qXqH7qXqH7q', '郑浩', 'zhenghao@expert.cn', 'reviewer', '机械工程学院', '副教授', '13700000004', 'active', NULL);

-- 3. 专家扩展信息
INSERT INTO `ExpertProfile` (`id`, `expertise_description`) VALUES
('usr-exp1', '主要从事机器学习、深度学习、计算机视觉研究，主持国家级项目3项，发表SCI论文40余篇'),
('usr-exp2', '专注于基因编辑、细胞治疗领域，拥有多项发明专利，担任多个国际期刊审稿人'),
('usr-exp3', '研究领域包括高性能复合材料、纳米材料，获得省部级科技奖励2项'),
('usr-exp4', '智能制造、工业机器人方向专家，产学研合作经验丰富');

-- 4. 专家擅长领域关联
INSERT INTO `ExpertDomain` (`id`, `expert_id`, `domain_id`) VALUES
('expdom-001', 'usr-exp1', 'dom-001'),
('expdom-002', 'usr-exp1', 'dom-007'),
('expdom-003', 'usr-exp2', 'dom-002'),
('expdom-004', 'usr-exp3', 'dom-003'),
('expdom-005', 'usr-exp4', 'dom-005'),
('expdom-006', 'usr-exp4', 'dom-007');

-- 5. 邀请记录
INSERT INTO `Invitation` (`id`, `inviter_id`, `target_role`, `invitation_code`, `status`, `expires_at`) VALUES
('inv-001', 'usr-admin', 'reviewer', 'INV-2026-001', 'pending', DATE_ADD(NOW(), INTERVAL 7 DAY)),
('inv-002', 'usr-admin', 'project_manager', 'INV-2026-002', 'accepted', DATE_ADD(NOW(), INTERVAL 7 DAY)),
('inv-003', 'usr-pm1', 'reviewer', 'INV-2026-003', 'expired', DATE_SUB(NOW(), INTERVAL 1 DAY));

-- =============================================
-- 二、项目数据示例
-- =============================================

-- 6. 项目数据
INSERT INTO `Project` (`id`, `applicant_id`, `manager_id`, `project_code`, `title`, `tech_maturity`, `achievement_transform`, `poc_stage_requirement`, `implementation_plan`, `abstract`, `detailed_introduction_part1`, `detailed_introduction_part2`, `detailed_introduction_part3`, `status`, `approved_budget`, `submit_date`, `approval_date`, `start_date`, `end_date`, `created_at`) VALUES
('prj-001', 'usr-app1', 'usr-pm1', 'PRJ-2026-001', '基于深度学习的医学影像智能诊断系统研发', 'pilot', 'tech_transfer,tech_license', 'feasibility_verify', '第一阶段：算法模型开发（1-6月）；第二阶段：系统平台搭建（7-12月）；第三阶段：临床试点应用（13-18月）', '本项目旨在开发一套基于深度学习的医学影像智能诊断系统，辅助医生进行肺结节、乳腺癌等疾病的早期筛查和诊断。', '成果简介：针对当前医学影像诊断依赖医生经验、效率低的问题，本项目采用最新的深度学习算法，开发智能诊断系统。技术方案包括：多模态影像处理、病灶自动检测、良恶性分类等。创新点在于提出了一种新型的注意力机制网络，显著提高了检测准确率。', '知识产权：本项目已申请发明专利2项（申请号：202410000001.X、202410000002.8），软件著作权1项（2024SR000001）。核心知识产权为基于注意力机制的医学影像分割方法。', '已有应用/试点情况：已在某三甲医院进行小范围试点，处理了500余例肺部CT影像，检测准确率达到92%。', 'approved', 1500000.00, '2026-01-15', '2026-02-01', '2026-03-01', '2027-02-28', '2026-01-10 10:00:00'),

('prj-002', 'usr-app2', 'usr-pm1', 'PRJ-2026-002', '新型CAR-T细胞治疗技术开发及临床应用研究', 'intermediate_trial', 'equity_investment,joint_dev', 'commercial_verify', '1-12月：CAR载体设计与优化；13-24月：临床前研究及IND申报准备', '开发针对实体瘤的新型CAR-T细胞治疗产品，解决现有CAR-T治疗实体瘤效果不佳的问题。', '背景：CAR-T细胞治疗在血液肿瘤中效果显著，但在实体瘤中效果有限。本项目开发新型CAR结构，增强T细胞浸润和杀伤能力。竞争优势：独特的肿瘤微环境响应元件。', '知识产权：核心技术已申请发明专利3项，其中1项已授权（ZL202310000001.X）。拥有自主知识产权的CAR载体平台。', '已有应用/试点情况：已完成动物实验验证，在荷瘤小鼠模型中肿瘤抑制率达到80%。', 'approved', 2800000.00, '2026-01-20', '2026-02-10', '2026-03-15', '2028-03-14', '2026-01-15 14:30:00'),

('prj-003', 'usr-app3', 'usr-pm2', 'PRJ-2026-003', '高性能碳纤维复合材料制备关键技术研究', 'rd', 'tech_transfer,other', 'creative_verify', '1-18月：碳纤维表面改性技术研究；19-30月：复合材料界面优化及性能评价', '研究高性能碳纤维复合材料的制备工艺，开发新型界面增强技术。', '成果简介：针对航空航天等领域对高性能复合材料的需求，本项目研究碳纤维表面改性新方法。技术方案：等离子体处理结合纳米材料接枝。创新点：绿色环保的改性工艺。', '知识产权：相关技术正在申请专利2项，已发表SCI论文5篇。核心知识产权为碳纤维表面接枝改性技术。', '已有应用/试点情况：已完成实验室小试，制备的复合材料力学性能提升30%。', 'submitted', NULL, '2026-02-10', NULL, NULL, NULL, '2026-02-05 09:00:00'),

('prj-004', 'usr-app1', NULL, NULL, '智能语音识别与情感分析系统', 'rd', 'tech_license', 'feasibility_verify', '项目计划12个月内完成原型系统开发', '开发多语种智能语音识别系统，集成情感分析功能。', '面向智能客服场景，开发高精度语音识别和情感理解系统。', '拥有相关软件著作权2项。', '暂无', 'draft', NULL, NULL, NULL, NULL, NULL, '2026-03-01 11:00:00'),

('prj-005', 'usr-app2', 'usr-pm2', 'PRJ-2026-005', '生物可降解医用材料研发', 'pilot', 'tech_transfer', 'commercial_verify', '1年完成材料配方优化，第2年完成中试生产', '开发用于骨科植入物的可降解医用材料。', '项目介绍：开发新型聚乳酸基复合材料，具有良好的生物相容性和可调控的降解速率。', '已申请发明专利1项。', '已完成动物实验初步验证。', 'under_review', NULL, '2026-02-20', NULL, NULL, NULL, '2026-02-18 15:00:00');

-- 7. 项目-研究领域关联
INSERT INTO `ProjectResearchDomain` (`project_id`, `research_domain_id`) VALUES
('prj-001', 'dom-001'),
('prj-001', 'dom-002'),
('prj-002', 'dom-002'),
('prj-003', 'dom-003'),
('prj-003', 'dom-005'),
('prj-004', 'dom-001'),
('prj-004', 'dom-007'),
('prj-005', 'dom-002'),
('prj-005', 'dom-003');

-- 8. 项目附件
INSERT INTO `ProjectAttachment` (`id`, `project_id`, `file_name`, `file_path`, `file_size`, `mime_type`, `type`, `description`, `sort_order`) VALUES
('att-001', 'prj-001', '项目申报书.pdf', '/uploads/projects/prj-001/申报书.pdf', 2457600, 'application/pdf', 'attachment', '完整项目申报书', 1),
('att-002', 'prj-001', '技术架构图.png', '/uploads/projects/prj-001/架构图.png', 512000, 'image/png', 'image', '系统技术架构示意图', 2),
('att-003', 'prj-002', '研究方案.pdf', '/uploads/projects/prj-002/研究方案.pdf', 3120000, 'application/pdf', 'attachment', '详细研究方案', 1);

-- 9. 项目团队成员
INSERT INTO `ProjectMember` (`id`, `project_id`, `name`, `user_id`, `role`, `title`, `organization`, `email`, `sort_order`) VALUES
('mem-001', 'prj-001', '王强', 'usr-app1', 'principal', '教授', '人工智能研究院', 'wangqiang@lab.cn', 1),
('mem-002', 'prj-001', '张明', NULL, 'contact', '副教授', '人工智能研究院', 'zhangming@lab.cn', 2),
('mem-003', 'prj-001', '李芳', NULL, 'other', '博士后', '人工智能研究院', 'lifang@lab.cn', 3),
('mem-004', 'prj-002', '陈静', 'usr-app2', 'principal', '副教授', '生物医学工程学院', 'chenjing@lab.cn', 1),
('mem-005', 'prj-002', '王建国', NULL, 'contact', '主治医师', '附属医院', 'wangjg@hospital.cn', 2),
('mem-006', 'prj-003', '刘明', 'usr-app3', 'principal', '研究员', '材料科学与工程学院', 'liuming@lab.cn', 1),
('mem-007', 'prj-005', '陈静', 'usr-app2', 'principal', '副教授', '生物医学工程学院', 'chenjing@lab.cn', 1);

-- 10. 项目预算明细
INSERT INTO `ProjectBudget` (`id`, `project_id`, `category`, `item_name`, `description`, `amount`, `sort_order`) VALUES
('bud-001', 'prj-001', '设备费', 'GPU服务器采购', '用于深度学习模型训练的高性能服务器', 450000.00, 1),
('bud-002', 'prj-001', '材料费', '数据采集与标注', '医学影像数据采集及专业医生标注费用', 200000.00, 2),
('bud-003', 'prj-001', '测试费', '第三方测试验证', '系统性能及安全性第三方测试', 100000.00, 3),
('bud-004', 'prj-001', '劳务费', '研究生劳务费', '参与项目研究的研究生劳务报酬', 300000.00, 4),
('bud-005', 'prj-001', '差旅费', '学术交流差旅', '参加学术会议及合作单位交流', 80000.00, 5),
('bud-006', 'prj-001', '专家咨询费', '专家咨询', '邀请专家进行技术指导', 50000.00, 6),
('bud-007', 'prj-001', '出版费', '论文发表及专利申请', 'SCI论文版面费、专利申请维护费', 120000.00, 7),
('bud-008', 'prj-001', '其他', '不可预见费', '项目执行过程中的其他支出', 200000.00, 8),

('bud-009', 'prj-002', '设备费', '流式细胞仪使用费', '流式细胞检测服务', 300000.00, 1),
('bud-010', 'prj-002', '材料费', '试剂耗材', '细胞培养试剂、抗体等', 800000.00, 2),
('bud-011', 'prj-002', '测试费', '动物实验', '小鼠模型构建及药效评价', 500000.00, 3),
('bud-012', 'prj-002', '劳务费', '技术人员劳务费', '实验技术人员劳务报酬', 600000.00, 4),
('bud-013', 'prj-002', '差旅费', '临床试验协调', '合作医院协调及监查差旅', 150000.00, 5),
('bud-014', 'prj-002', '专家咨询费', '临床专家咨询', '临床方案设计专家咨询', 100000.00, 6),
('bud-015', 'prj-002', '出版费', '专利申请', '国内外专利申请费用', 150000.00, 7),
('bud-016', 'prj-002', '其他', '不可预见费', '项目执行过程中的其他支出', 300000.00, 8);

-- =============================================
-- 三、专家评审数据示例
-- =============================================

-- 11. 专家分配
INSERT INTO `ExpertAssignment` (`id`, `project_id`, `expert_id`, `assigned_by`, `status`, `deadline`) VALUES
('assign-001', 'prj-001', 'usr-exp1', 'usr-pm1', 'reviewing', DATE_ADD(NOW(), INTERVAL 14 DAY)),
('assign-002', 'prj-001', 'usr-exp4', 'usr-pm1', 'accepted', DATE_ADD(NOW(), INTERVAL 14 DAY)),
('assign-003', 'prj-002', 'usr-exp2', 'usr-pm1', 'reviewing', DATE_ADD(NOW(), INTERVAL 14 DAY)),
('assign-004', 'prj-003', 'usr-exp3', 'usr-pm2', 'declined', DATE_ADD(NOW(), INTERVAL 14 DAY)),
('assign-005', 'prj-005', 'usr-exp2', 'usr-pm2', 'reviewing', DATE_ADD(NOW(), INTERVAL 14 DAY));

-- =============================================
-- 四、孵化服务数据示例
-- =============================================

-- 12. 孵化跟进记录
INSERT INTO `IncubationProgress` (`id`, `project_id`, `recorded_by`, `progress_date`, `title`, `abstract`, `content`, `next_steps`, `comment`, `reviewed_by`) VALUES
('inc-001', 'prj-001', 'usr-pm1', '2026-03-15', '项目启动会及团队组建完成', '项目团队已组建，召开项目启动会，明确各成员分工', '2026年3月15日召开项目启动会，参会人员包括项目负责人王强教授、核心成员5人及项目管理办公室代表。会议明确了项目目标、技术路线和人员分工。已建立项目沟通机制，每周召开例会。', '1. 完成GPU服务器采购招标\n2. 启动医学影像数据收集工作\n3. 安排算法团队进行前期调研', '团队组建顺利，建议加快设备采购流程', 'usr-pm1'),

('inc-002', 'prj-001', 'usr-pm1', '2026-04-05', '数据收集及标注工作进展', '已完成首批1000例影像数据收集，标注工作正在进行', '本月数据收集进展：\n- 已从合作医院获取肺部CT影像1000例\n- 已安排3名放射科医生进行标注，完成300例\n- 数据预处理流程已建立', '1. 继续收集数据至2000例\n2. 开发数据增强工具\n3. 搭建模型训练环境', '数据质量良好，标注一致性需要定期校验', NULL),

('inc-003', 'prj-002', 'usr-pm1', '2026-03-20', 'CAR载体构建进展', '已完成第三代CAR载体设计，进入质粒构建阶段', '项目团队已完成CAR结构的序列设计和优化，采用慢病毒载体系统。目前正在进行质粒构建和测序验证。预计4月中旬完成载体构建。', '1. 完成质粒大量制备\n2. 包装慢病毒\n3. 进行T细胞转导效率测试', '技术路线可行，建议同时准备备选方案', 'usr-pm1');

-- 13. 跟进记录附件
INSERT INTO `IncubationProgressFile` (`id`, `progress_id`, `file_name`, `file_path`, `file_size`, `mime_type`, `uploaded_by`, `sort_order`) VALUES
('incfile-001', 'inc-001', '启动会会议纪要.pdf', '/uploads/incubation/inc-001/会议纪要.pdf', 245760, 'application/pdf', 'usr-pm1', 1),
('incfile-002', 'inc-001', '团队分工表.xlsx', '/uploads/incubation/inc-001/分工表.xlsx', 51200, 'application/vnd.ms-excel', 'usr-pm1', 2);

-- =============================================
-- 五、项目成果数据示例
-- =============================================

-- 14. 项目成果
INSERT INTO `ProjectAchievement` (`id`, `project_id`, `type`, `title`, `abstract`, `content`, `achievement_date`, `created_by`, `status`) VALUES
('ach-001', 'prj-001', 'paper', 'Attention-Based Multi-Scale Network for Lung Nodule Detection', '提出一种基于注意力机制的多尺度网络用于肺结节检测，在公开数据集上取得SOTA结果', '详细内容：本文提出了一种新的深度学习网络架构，结合通道注意力和空间注意力机制，有效提升了肺结节检测的准确率。在LUNA16数据集上取得了97.2%的敏感度。', '2026-03-10', 'usr-app1', 'submitted'),

('ach-002', 'prj-001', 'patent', '一种医学影像病灶检测方法及系统', '本发明公开了一种基于深度学习的医学影像病灶检测方法，通过多尺度特征提取和注意力机制增强，提高检测准确性', '专利权利要求书：1. 一种医学影像病灶检测方法，其特征在于包括以下步骤...', '2026-02-15', 'usr-app1', 'submitted'),

('ach-003', 'prj-001', 'software', 'MediDiag智能诊断系统V1.0', '医学影像智能诊断软件，支持肺结节检测和分类', '软件功能：影像导入、自动检测、结果展示、报告生成。支持DICOM格式，检测速度<2秒/例。', '2026-03-20', 'usr-app1', 'draft'),

('ach-004', 'prj-002', 'patent', '靶向实体瘤的嵌合抗原受体及其应用', '本发明涉及一种新型CAR结构，能够有效识别实体瘤相关抗原，提高T细胞浸润能力', '专利详细描述：CAR结构包含特异性抗原结合域、铰链区、跨膜区和信号传导域...', '2026-02-28', 'usr-app2', 'submitted');

-- 15. 成果附件
INSERT INTO `ProjectAchievementFile` (`id`, `achievement_id`, `file_name`, `file_path`, `file_size`, `mime_type`, `uploaded_by`, `sort_order`) VALUES
('achfile-001', 'ach-001', '论文稿.pdf', '/uploads/achievements/ach-001/论文稿.pdf', 1024000, 'application/pdf', 'usr-app1', 1),
('achfile-002', 'ach-001', '实验数据.zip', '/uploads/achievements/ach-001/实验数据.zip', 5120000, 'application/zip', 'usr-app1', 2),
('achfile-003', 'ach-002', '专利申请文件.pdf', '/uploads/achievements/ach-002/专利申请文件.pdf', 2048000, 'application/pdf', 'usr-app1', 1);

-- =============================================
-- 六、公告通知数据示例
-- =============================================

-- 16. 公告
INSERT INTO `Notice` (`id`, `title`, `abstract`, `category`, `created_by`, `is_top`, `show_on_homepage`, `status`, `view_count`, `published_at`) VALUES
('not-001', '2026年度科研项目申报指南发布', '本年度科研项目申报工作正式启动，申报截止日期为2026年5月31日，请各申请人按时提交', 'notice', 'usr-admin', 'yes', 'yes', 'published', 156, '2026-03-01 09:00:00'),

('not-002', '关于召开项目中期检查会的通知', '定于2026年4月20日召开2025年度立项项目中期检查会，请各项目负责人准备汇报材料', 'notice', 'usr-pm1', 'no', 'yes', 'published', 89, '2026-03-20 10:30:00'),

('not-003', '祝贺我中心3个项目获得省级科技奖励', '在刚刚公布的省级科技奖励名单中，我中心推荐的3个项目分别获得一等奖1项、二等奖2项', 'result', 'usr-admin', 'yes', 'yes', 'published', 245, '2026-02-15 14:00:00'),

('not-004', '关于征集产学研合作项目的通知', '为促进科技成果转化，现面向全校征集可转化的产业化项目，将优先推荐给合作企业', 'recruitment', 'usr-pm2', 'no', 'yes', 'published', 67, '2026-03-10 11:00:00'),

('not-005', '2026年第一季度项目经费执行情况通报', '截至2026年3月31日，各类项目经费执行率总体良好，具体数据见附件', 'notice', 'usr-admin', 'no', 'no', 'published', 45, '2026-04-01 16:30:00'),

('not-006', '专家库扩充征聘通知', '为进一步完善专家评审机制，现面向社会公开征聘各领域评审专家', 'news', 'usr-admin', 'no', 'yes', 'published', 123, '2026-03-05 09:00:00'),

('not-007', '项目管理平台使用培训通知', '定于4月10日举办项目管理平台使用培训会，欢迎各位老师和同学参加', 'notice', 'usr-pm1', 'no', 'yes', 'draft', 0, NULL);

-- 17. 公告内容区块
INSERT INTO `NoticeBlock` (`id`, `notice_id`, `block_type`, `content`, `sort_order`) VALUES
('blk-001', 'not-001', 'text', '一、申报条件\n1. 项目负责人应具有副高级以上职称或博士学位\n2. 项目团队应包含至少2名具有相关研究背景的成员\n3. 申报项目应具有明确的创新性和应用前景\n\n二、资助额度\n重点项目不超过100万元，一般项目不超过30万元\n\n三、申报流程\n1. 在线填写申报书\n2. 上传相关附件材料\n3. 单位审核推荐\n4. 专家评审\n\n四、时间安排\n申报截止：2026年5月31日\n形式审查：2026年6月1-10日\n专家评审：2026年6月11-30日', 1),

('blk-002', 'not-001', 'text', '联系人：张伟 电话：13800000001 邮箱：zhangwei@research.cn', 2),

('blk-003', 'not-003', 'text', '获奖项目名单：\n1. "基于深度学习的医学影像诊断系统" 获得科技进步一等奖\n2. "新型CAR-T细胞治疗技术" 获得技术发明二等奖\n3. "高性能复合材料制备工艺" 获得科技进步二等奖\n\n向以上项目团队表示热烈祝贺！', 1),

('blk-004', 'not-006', 'text', '征聘领域：\n- 人工智能与大数据\n- 生物医药\n- 新材料\n- 新能源\n- 高端装备制造\n\n申请方式：登录平台填写专家信息表', 1);

-- 18. 公告附件
INSERT INTO `NoticeAttachment` (`id`, `notice_id`, `file_name`, `file_path`, `file_size`, `mime_type`, `download_count`, `sort`) VALUES
('notatt-001', 'not-001', '申报指南附件.pdf', '/uploads/notices/not-001/申报指南附件.pdf', 1024000, 'application/pdf', 45, 1),
('notatt-002', 'not-001', '申报书模板.docx', '/uploads/notices/not-001/申报书模板.docx', 256000, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 78, 2),
('notatt-003', 'not-005', '经费执行情况表.xlsx', '/uploads/notices/not-005/经费执行情况表.xlsx', 128000, 'application/vnd.ms-excel', 23, 1);

-- =============================================
-- 七、系统与通用数据示例
-- =============================================

-- 19. 通知消息
INSERT INTO `Notification` (`id`, `user_id`, `type`, `title`, `content`, `related_id`, `related_type`, `priority`, `action_url`, `is_read`, `read_at`) VALUES
('notif-001', 'usr-app1', 'project', '项目审核通过通知', '您的项目"基于深度学习的医学影像智能诊断系统研发"已通过审核，项目编号：PRJ-2026-001', 'prj-001', 'Project', 'high', '/project/detail/prj-001', TRUE, '2026-02-02 10:00:00'),

('notif-002', 'usr-app1', 'review', '项目进入评审阶段', '您的项目已被分配至评审专家，请关注后续评审意见', 'prj-001', 'Project', 'medium', '/project/detail/prj-001', FALSE, NULL),

('notif-003', 'usr-exp1', 'review', '评审任务分配', '您有一个新的项目需要评审："基于深度学习的医学影像智能诊断系统研发"，请于14天内完成', 'assign-001', 'ExpertAssignment', 'high', '/review/assignments', FALSE, NULL),

('notif-004', 'usr-app2', 'project', '项目提交成功', '您的项目"新型CAR-T细胞治疗技术开发及临床应用研究"已成功提交', 'prj-002', 'Project', 'medium', '/project/detail/prj-002', TRUE, '2026-01-21 09:30:00'),

('notif-005', 'usr-pm1', 'incubation', '新增孵化跟进记录', '项目PRJ-2026-001新增孵化跟进记录，请查看', 'inc-001', 'IncubationProgress', 'low', '/incubation/project/prj-001', TRUE, '2026-03-16 14:00:00'),

('notif-006', 'usr-admin', 'system', '系统升级通知', '系统将于2026年4月15日22:00-24:00进行升级维护，届时暂停服务', NULL, NULL, 'medium', NULL, FALSE, NULL),

('notif-007', 'usr-app3', 'reminder', '项目材料补充提醒', '您的项目缺少预算明细表，请于3个工作日内补充提交', 'prj-003', 'Project', 'high', '/project/edit/prj-003', FALSE, NULL),

('notif-008', 'usr-exp3', 'invitation', '专家邀请', '您已被邀请加入专家库，请点击链接确认', 'inv-003', 'Invitation', 'medium', '/invitation/accept/inv-003', FALSE, NULL);

-- 20. 操作日志
INSERT INTO `AuditLog` (`user_id`, `action`, `table_name`, `record_id`, `old_values`, `new_values`, `ip_address`, `user_agent`) VALUES
('usr-app1', 'INSERT', 'Project', 'prj-001', NULL, '{"title":"基于深度学习的医学影像智能诊断系统研发","applicant":"usr-app1"}', '192.168.1.100', 'Mozilla/5.0 Chrome/120.0'),

('usr-pm1', 'UPDATE', 'Project', 'prj-001', '{"status":"submitted"}', '{"status":"approved","approved_budget":1500000}', '192.168.1.50', 'Mozilla/5.0 Chrome/120.0'),

('usr-admin', 'INSERT', 'User', 'usr-exp1', NULL, '{"username":"liuyang","role":"reviewer"}', '192.168.1.1', 'Mozilla/5.0 Safari/17.0'),

('usr-pm1', 'INSERT', 'ExpertAssignment', 'assign-001', NULL, '{"project_id":"prj-001","expert_id":"usr-exp1"}', '192.168.1.50', 'Mozilla/5.0 Chrome/120.0'),

('usr-app1', 'INSERT', 'ProjectAchievement', 'ach-001', NULL, '{"type":"paper","title":"Attention-Based Multi-Scale Network"}', '192.168.1.100', 'Mozilla/5.0 Chrome/120.0');

-- 21. 数据导出日志
INSERT INTO `ExportLog` (`id`, `user_id`, `export_type`, `export_params`, `file_name`, `file_path`, `file_size`, `record_count`, `status`, `completed_at`) VALUES
('exp-001', 'usr-admin', 'project_export', '{"status":"approved","year":2026}', '2026年获批项目清单.xlsx', '/exports/2026-03-15/获批项目清单.xlsx', 256000, 2, 'completed', '2026-03-15 10:30:00'),

('exp-002', 'usr-pm1', 'budget_export', '{"project_id":"prj-001"}', 'PRJ-2026-001预算明细.xlsx', '/exports/2026-03-20/预算明细.xlsx', 51200, 8, 'completed', '2026-03-20 15:00:00'),

('exp-003', 'usr-app1', 'achievement_export', '{"project_id":"prj-001"}', '我的成果列表.xlsx', '/exports/2026-04-01/成果列表.xlsx', 102400, 3, 'completed', '2026-04-01 09:00:00');

-- 22. 支出申请记录
INSERT INTO `ExpenditureRecord` (`id`, `project_id`, `budget_id`, `expense_no`, `category`, `item_name`, `amount`, `description`, `calculation_method`, `payee_name`, `payee_type`, `bank_account`, `bank_name`, `status`, `applicant_id`, `reviewer_id`, `review_comment`, `review_date`, `paid_date`) VALUES
('exp-rec-001', 'prj-001', 'bud-001', 'EXP-2026-001', '设备费', 'GPU服务器采购', 450000.00, '采购用于深度学习模型训练的高性能GPU服务器，配置：2颗Intel Xeon Gold处理器、256GB内存、4块NVIDIA A100显卡', '市场询价，比价后选择最优方案', '浪潮电子信息产业股份有限公司', 'company', '123456789012345', '中国银行北京分行', 'paid', 'usr-app1', 'usr-pm1', '预算合理，同意采购', '2026-02-20 10:00:00', '2026-03-01 14:30:00'),

('exp-rec-002', 'prj-001', 'bud-002', 'EXP-2026-002', '材料费', '数据采集与标注', 100000.00, '支付合作医院数据采集费及医生标注费（第一批）', '按合同约定，首付款50%', '某某医院', 'company', '987654321098765', '工商银行', 'approved', 'usr-app1', 'usr-pm1', '同意支付首期款', '2026-03-10 09:00:00', NULL),

('exp-rec-003', 'prj-001', 'bud-004', 'EXP-2026-003', '劳务费', '研究生劳务费', 30000.00, '3月份参与项目的研究生劳务报酬发放', '按参与工时计算，共5名研究生', '王强等', 'personal', NULL, NULL, 'approved', 'usr-app1', 'usr-pm1', '核实无误，同意发放', '2026-04-01 11:00:00', NULL),

('exp-rec-004', 'prj-002', 'bud-010', 'EXP-2026-004', '材料费', '试剂耗材采购', 150000.00, '采购细胞培养试剂、抗体等实验耗材', '根据实验进度分批采购', '赛默飞世尔科技', 'company', '555555555555555', '招商银行', 'submitted', 'usr-app2', NULL, NULL, NULL, NULL),

('exp-rec-005', 'prj-002', 'bud-011', 'EXP-2026-005', '测试费', '动物实验费用', 200000.00, '支付合作单位动物实验服务费（小鼠模型构建及药效评价）', '按合同约定支付中期款', '某某生物技术有限公司', 'company', '444444444444444', '建设银行', 'draft', 'usr-app2', NULL, NULL, NULL, NULL);


use research_system;
-- 孙殿森（校外用户）
INSERT INTO `User` (`id`, `username`, `password`, `name`, `email`, `role`, `department`, `title`, `phone`, `status`, `created_at`) VALUES
('usr-sundiansen', 'sundiansen', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrJ6QqXqH7qXqH7qXqH7qXqH7qXqH7q', '孙殿森', 'diansensun@gmail.com', 'applicant', 'CodeNexus.AI', 'CEO', '13693675505', 'active', NOW());

-- 王元淳（人大博士生）
INSERT INTO `User` (`id`, `username`, `password`, `name`, `email`, `role`, `department`, `title`, `phone`, `status`, `created_at`) VALUES
('usr-wangyuanchun', 'wangyuanchun', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrJ6QqXqH7qXqH7qXqH7qXqH7qXqH7q', '王元淳', 'wangyuanchun@ruc.edu.cn', 'applicant', '中国人民大学', '博士生', '15303293784', 'active', NOW());

-- 杨畅（独立团队）
INSERT INTO `User` (`id`, `username`, `password`, `name`, `email`, `role`, `department`, `title`, `phone`, `status`, `created_at`) VALUES
('usr-yangchang', 'yangchang', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrJ6QqXqH7qXqH7qXqH7qXqH7qXqH7q', '杨畅', 'yc0131@qq.com', 'applicant', '中国人民大学未来人类联合研究院Sonusync X桥音工作室', '团队负责人', '13599913167', 'active', NOW());

-- 程絮森（人大教授）
INSERT INTO `User` (`id`, `username`, `password`, `name`, `email`, `role`, `department`, `title`, `phone`, `status`, `created_at`) VALUES
('usr-chengxusen', 'chengxusen', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrJ6QqXqH7qXqH7qXqH7qXqH7qXqH7q', '程絮森', 'xusen.cheng@ruc.edu.cn', 'applicant', '中国人民大学首都发展与战略研究院', '副院长/副总工程师', '18611385243', 'active', NOW());

-- 添加核心成员作为普通用户（可选）
INSERT INTO `User` (`id`, `username`, `password`, `name`, `email`, `role`, `department`, `title`, `status`, `created_at`) VALUES
('usr-zhangjing', 'zhangjing', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrJ6QqXqH7qXqH7qXqH7qXqH7qXqH7q', '张静', 'zhangjing@ruc.edu.cn', 'applicant', '中国人民大学', '教授', 'active', NOW()),
('usr-leisiyu', 'leisiyu', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrJ6QqXqH7qXqH7qXqH7qXqH7qXqH7q', '雷思羽', 'leisiyu@ruc.edu.cn', 'applicant', '中国人民大学', '本科生', 'active', NOW()),
('usr-qinzhenhan', 'qinzhenhan', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrJ6QqXqH7qXqH7qXqH7qXqH7qXqH7q', '秦禛涵', 'qinzhenhan@ruc.edu.cn', 'applicant', '中国人民大学', '本科生', 'active', NOW()),
('usr-huangtianle', 'huangtianle', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrJ6QqXqH7qXqH7qXqH7qXqH7qXqH7q', '黄天乐', 'tianle.huang@qq.com', 'applicant', '中国人民大学', '博士研究生', 'active', NOW());

-- 补充研究领域
INSERT INTO `ResearchDomain` (`id`, `name`, `code`, `sort_order`, `enabled`) VALUES
('dom-009', '数字孪生与元宇宙', 'DIGITAL_TWIN_METAVERSE', 9, TRUE),
('dom-010', '音乐科技', 'MUSIC_TECH', 10, TRUE),
('dom-011', '体育科技', 'SPORTS_TECH', 11, TRUE)
ON DUPLICATE KEY UPDATE id = id;
-- =============================================
-- 插入项目数据
-- =============================================

-- 项目1：CodeNexus.AI 超大型代码仓资产管理系统
INSERT INTO `Project` (
    `id`, `applicant_id`, `project_code`, `title`, 
    `tech_maturity`, `achievement_transform`, `poc_stage_requirement`,
    `implementation_plan`, `abstract`, `detailed_introduction_part1`,
    `detailed_introduction_part2`, `detailed_introduction_part3`,
    `status`, `submit_date`, `created_at`
) VALUES (
    'prj-code-001', 
    'usr-sundiansen',
    'PRJ-CODE-2025-001',
    'CodeNexus.AI 超大型代码仓资产管理系统',
    'pilot',
    'tech_license,joint_dev',
    'feasibility_verify',
    '第一阶段：代码知识图谱构建（1-6月）；第二阶段：交互式代码探索系统开发（7-12月）；第三阶段：健康度评估体系建立（13-18月）',
    'CodeNexus.AI是一个针对超大型代码仓库的智能资产管理系统，通过代码知识图谱构建、交互式代码探索和代码资产健康度评估，解决AI编程中的"正确性雪崩"问题，使AI具备对百万行级代码库的全局准确理解。',
    '成果简介：\n\n研发背景：AI初始代码生成准确率可以达到80-90%，但随着复杂度增加，错误累积效应显著。AI在修复bug时引入新的bug，形成"越改越错"的恶性循环。统计数据表示，AI生成代码的二次修改率高达40%，在复杂项目中AI代码测试通过率仅60%。\n\n核心问题：正确性雪崩存在于AI编程活动的所有环节，包括需求分析、设计、代码理解、编码、测试、debug、重构、审查、文档撰写、版本管理等。\n\n技术创新性：\n1. 代码知识图谱构建：用于防止系统知识流失\n2. 交互式代码探索：加速系统理解和维护\n3. 代码资产健康度评估：为决策提供数据支持\n\n推广应用价值：\n- 商业价值：显著提升研发效率与质量，降低开发成本\n- 战略价值：保障核心系统稳定与安全，支持信创/国产化战略\n\n前期应用情况：\n- 2025.07：入围第十二届深圳宝安创新创业大赛决赛\n- 2025.09-10：与华为技术有限公司联合验证，在鸿蒙内核百万级C代码库完成代码资产重构\n- 2025.10：入围第一届中国人民大学AI智能体创新应用大赛决赛\n- 2025.10-11：与青岛泛钛客科技有限公司在金融科技领域展开百万级Java代码资产重构',
    '知识产权：暂无专利，计划未来1年拟新增专利5项，主要用于代码资产构建以及后续的工具产品方向。',
    '已有应用/试点情况：成果已在多个标杆场景验证，包括与华为技术有限公司联合验证鸿蒙内核代码资产重构，与青岛泛钛客科技有限公司合作金融科技领域代码资产重构。',
    'submitted',
    '2025-11-01',
    NOW()
);

-- 项目2：MyCoach智练
INSERT INTO `Project` (
    `id`, `applicant_id`, `project_code`, `title`,
    `tech_maturity`, `achievement_transform`, `poc_stage_requirement`,
    `implementation_plan`, `abstract`, `detailed_introduction_part1`,
    `detailed_introduction_part2`, `detailed_introduction_part3`,
    `status`, `submit_date`, `created_at`
) VALUES (
    'prj-coach-001',
    'usr-wangyuanchun',
    'PRJ-COACH-2025-001',
    'MyCoach智练 - AI个性化训练引擎',
    'pilot',
    'equity_investment',
    'commercial_verify',
    '第一阶段：产品打磨期（2024.11-2025.02），完成全平台数据对接；第二阶段：市场验证期（2025.03-2025.08），启动收费订阅；第三阶段：规模化增长期（2025.09-2026.06），拓展安卓版；第四阶段：生态拓展期（2026.07-2026.12），探索海外市场',
    'MyCoach智练是一款基于大模型智能体系统的个性化训练引擎APP，通过多源异构运动数据融合与治理，为用户提供练前计划生成、练中智能答疑、练后教练点评的全链路闭环服务。',
    '成果简介：\n\n行业痛点：\n1. 专业教练资源稀缺且成本高昂：国内专业有氧教练供给严重不足，教练服务价格高达¥10,000/人/季度\n2. 多设备数据孤岛导致训练断层：运动者普遍使用Garmin、Apple、Coros等多品牌可穿戴设备，数据分散在各品牌App中\n\n核心技术：\n1. 基于大模型智能体系统的个性化训练引擎\n2. 多源异构运动数据融合与治理架构\n3. 时间-运动数据-课表关联的专用模型训练方法\n4. 闭环反馈优化算法\n\n技术成熟度：已完成原型系统开发，iOS应用MyCoach智练v1.0已发布至Apple TestFlight平台\n\n市场前景：中国有氧运动市场正处于爆发增长期，2023年全国举办认证马拉松赛事超500场，参赛人次突破500万。预计未来3年AI运动训练服务市场规模将达80-100亿元。',
    '知识产权：计划申请软件著作权6项（iOS客户端、Android客户端、数据治理平台、智能问答引擎、训练计划生成系统、用户画像分析系统），发明专利申请3项。',
    '已有应用/试点情况：已发版至Apple官方APP测试平台TestFlight，实现Garmin中国区账号同步，Apple Healthkit与Garmin国际区同步功能正在内测。',
    'under_review',
    '2025-10-15',
    NOW()
);

-- 项目3：乾·乐 - 音乐理解与演奏辅助多功能智能体
INSERT INTO `Project` (
    `id`, `applicant_id`, `project_code`, `title`,
    `tech_maturity`, `achievement_transform`, `poc_stage_requirement`,
    `implementation_plan`, `abstract`, `detailed_introduction_part1`,
    `detailed_introduction_part2`, `detailed_introduction_part3`,
    `status`, `submit_date`, `created_at`
) VALUES (
    'prj-music-001',
    'usr-yangchang',
    'PRJ-MUSIC-2025-001',
    '乾·乐 - 基于多模态大模型的音乐理解与演奏辅助多功能智能体',
    'rd',
    'equity_investment',
    'creative_verify,feasibility_verify',
    '第1-2月：市场调研及技术研发；第2-5月：产品开发与内部验证；第5-6月：产品试点与商业模式验证',
    '乾·乐是一款基于多模态大模型的音乐理解与演奏辅助智能体，支持五线谱、简谱、减字谱等多谱种双向转换，提供智能作曲推荐与演奏指导。',
    '成果简介：\n\n研发背景：从中国人民大学赋予的工作室长期愿景来说，希望打造一款推动发展跨文化乃至世界交响格局的音乐智能体。大众需求从音乐审美普及逐渐转变为参与音乐演奏。\n\n痛点问题：\n1. 市面上音乐软件中没有同时支持西洋乐、民乐的AI实时协作体系\n2. 模型识别乐谱准确率较低\n3. 民乐特殊记谱法的数字转换需求被国际市场长期忽视\n\n技术解决方案：\n- 多模态谱面解析引擎：支持PDF、MIDI、MusicXML及图像格式，基于CNN+Transformer架构的OMR技术\n- 音乐理解与分析系统：基于MusicXML的统一音乐表示框架\n- 智能作曲推荐与演奏：支持情绪、风格、场景驱动的音乐创作推荐\n\n前期应用情况：2025年10月10日于中国人民大学"平声·和鸣"中西音乐对话实验音乐会中首次全面落地应用。',
    '知识产权：暂无，需专业指导。计划申请相关专利和软件著作权。',
    '已有应用/试点情况：在《渔舟唱晚》现代改编、《山溪月》创作、《檐滴水》创排、《梁祝》改编等作品中成功应用验证。',
    'draft',
    '2025-10-20',
    NOW()
);

-- 项目4：元宇宙智慧校园
INSERT INTO `Project` (
    `id`, `applicant_id`, `manager_id`, `project_code`, `title`,
    `tech_maturity`, `achievement_transform`, `poc_stage_requirement`,
    `implementation_plan`, `abstract`, `detailed_introduction_part1`,
    `detailed_introduction_part2`, `detailed_introduction_part3`,
    `status`, `submit_date`, `created_at`
) VALUES (
    'prj-metaverse-001',
    'usr-chengxusen',
    NULL,
    'PRJ-META-2025-001',
    '中国人民大学元宇宙智慧校园',
    'pilot',
    'joint_dev',
    'feasibility_verify',
    '第1-3月：完成首批知识产权布局；第4-6月：达成首家标杆客户签约；第7-12月：完成产品平台化升级',
    '元宇宙智慧校园项目综合运用UE5引擎与Blender进行高精度场景建模，融合大语言模型技术开发AI助教，打造沉浸式虚拟校园环境，实现多校区联动教学。',
    '成果简介：\n\n研发背景：响应国家教育数字化战略，把握元宇宙产业发展机遇，开发具有人大特色的元宇宙校园场景。\n\n核心问题：\n1. 现有线上教学平台功能单一，缺乏沉浸式交互体验\n2. 高校多校区办学普遍存在的"信息孤岛"与资源分配不均问题\n\n技术创新性：\n- 综合运用UE5引擎与Blender进行高精度场景建模\n- 融合大语言模型技术开发AI助教\n- 网络可见性控制、分层关卡加载及实例化关卡技术\n\n前期应用情况：\n- 已在人大新生研讨课中作为教学平台投入使用\n- 于通州校区智慧教室完成系统本地化部署\n- 参展国家级大型展会中国科幻大会\n- 获第十届"创客中国"元宇宙中小企业创新创业大赛创业组优胜奖',
    '知识产权：已获得软件著作权Metadebc数字协作空间软件V1.0（登记号：2023SR1260277），计划申请1项发明专利和2项软件著作权。',
    '已有应用/试点情况：2025年3月-5月已在人大新生研讨课中投入使用，大大提高学生小组研讨效率，广受好评。',
    'approved',
    '2025-09-01',
    NOW()
);
-- 项目1关联领域
INSERT INTO `ProjectResearchDomain` (`project_id`, `research_domain_id`) VALUES
('prj-code-001', 'dom-001'),  -- 人工智能与机器学习
('prj-code-001', 'dom-007');  -- 信息技术与软件

-- 项目2关联领域
INSERT INTO `ProjectResearchDomain` (`project_id`, `research_domain_id`) VALUES
('prj-coach-001', 'dom-001'),  -- 人工智能与机器学习
('prj-coach-001', 'dom-011');  -- 体育科技

-- 项目3关联领域
INSERT INTO `ProjectResearchDomain` (`project_id`, `research_domain_id`) VALUES
('prj-music-001', 'dom-001'),  -- 人工智能与机器学习
('prj-music-001', 'dom-010');  -- 音乐科技

-- 项目4关联领域
INSERT INTO `ProjectResearchDomain` (`project_id`, `research_domain_id`) VALUES
('prj-metaverse-001', 'dom-009');  -- 数字孪生与元宇宙
-- 项目1成员
INSERT INTO `ProjectMember` (`id`, `project_id`, `name`, `user_id`, `role`, `title`, `organization`, `email`, `sort_order`) VALUES
('mem-code-001', 'prj-code-001', '孙殿森', 'usr-sundiansen', 'principal', 'CEO', 'CodeNexus.AI', 'diansensun@gmail.com', 1);

-- 项目2成员
INSERT INTO `ProjectMember` (`id`, `project_id`, `name`, `user_id`, `role`, `title`, `organization`, `email`, `sort_order`) VALUES
('mem-coach-001', 'prj-coach-001', '王元淳', 'usr-wangyuanchun', 'principal', '博士生', '中国人民大学', 'wangyuanchun@ruc.edu.cn', 1),
('mem-coach-002', 'prj-coach-001', '张静', 'usr-zhangjing', 'other', '教授', '中国人民大学', 'zhangjing@ruc.edu.cn', 2);

-- 项目3成员
INSERT INTO `ProjectMember` (`id`, `project_id`, `name`, `user_id`, `role`, `title`, `organization`, `email`, `sort_order`) VALUES
('mem-music-001', 'prj-music-001', '杨畅', 'usr-yangchang', 'principal', '团队负责人', 'Sonusync X桥音工作室', 'yc0131@qq.com', 1);

-- 项目4成员
INSERT INTO `ProjectMember` (`id`, `project_id`, `name`, `user_id`, `role`, `title`, `organization`, `email`, `sort_order`) VALUES
('mem-meta-001', 'prj-metaverse-001', '程絮森', 'usr-chengxusen', 'principal', '副院长/副总工程师', '中国人民大学', 'xusen.cheng@ruc.edu.cn', 1),
('mem-meta-002', 'prj-metaverse-001', '雷思羽', 'usr-leisiyu', 'other', '本科生', '中国人民大学', 'leisiyu@ruc.edu.cn', 2),
('mem-meta-003', 'prj-metaverse-001', '秦禛涵', 'usr-qinzhenhan', 'other', '本科生', '中国人民大学', 'qinzhenhan@ruc.edu.cn', 3),
('mem-meta-004', 'prj-metaverse-001', '黄天乐', 'usr-huangtianle', 'contact', '博士研究生', '中国人民大学', 'tianle.huang@qq.com', 4);
-- 项目4预算（元宇宙智慧校园）
INSERT INTO `ProjectBudget` (`id`, `project_id`, `category`, `item_name`, `description`, `amount`, `sort_order`) VALUES
('bud-meta-001', 'prj-metaverse-001', '其他', '知识产权费用', '申请1项发明专利和2项软件著作权', 20000.00, 1),
('bud-meta-002', 'prj-metaverse-001', '差旅费', '调研费用', '问卷设计、样本收集、数据分析工具及差旅费用', 50000.00, 2),
('bud-meta-003', 'prj-metaverse-001', '其他', '系统开发费用', '开发平台测试版本、搭建演示环境及购置开发工具', 30000.00, 3);

-- =============================================
-- 插入项目附件记录
-- =============================================

-- 项目1：CodeNexus.AI 的图片附件
INSERT INTO `ProjectAttachment` (`id`, `project_id`, `file_name`, `file_path`, `file_size`, `mime_type`, `type`, `description`, `sort_order`) VALUES
(UUID(), 'prj-code-001', 'CodeNexus技术架构图.png', '/uploads/projects/prj-code-001/技术架构图.png', 512000, 'image/png', 'image', 'CodeNexus技术架构图', 1),
(UUID(), 'prj-code-001', '衍生产品spec说明文档.png', '/uploads/projects/prj-code-001/说明文档.png', 456789, 'image/png', 'image', '根据github开源项目生成的衍生产品spec说明文档', 2),
(UUID(), 'prj-code-001', '应用场景示意图.png', '/uploads/projects/prj-code-001/应用场景示意图.png', 389012, 'image/png', 'image', '应用场景示意图', 3),
(UUID(), 'prj-code-001', '项目产品目标示意图.png', '/uploads/projects/prj-code-001/项目产品目标示意图.png', 234567, 'image/png', 'image', '项目产品目标示意图', 4);

-- 项目2：MyCoach智练 的图片附件
INSERT INTO `ProjectAttachment` (`id`, `project_id`, `file_name`, `file_path`, `file_size`, `mime_type`, `type`, `description`, `sort_order`) VALUES
(UUID(), 'prj-coach-001', '练后分析.png', '/uploads/projects/prj-coach-001/数据分析.png', 345678, 'image/png', 'image', '练后分析界面截图', 1),
(UUID(), 'prj-coach-001', '综合统计.png', '/uploads/projects/prj-coach-001/综合统计.png', 456789, 'image/png', 'image', '综合统计界面', 2),
(UUID(), 'prj-coach-001', '练前计划.png', '/uploads/projects/prj-coach-001/练前计划.png', 234567, 'image/png', 'image', '练前计划生成界面', 3),
(UUID(), 'prj-coach-001', '智能问答.png', '/uploads/projects/prj-coach-001/智能问答.png', 345678, 'image/png', 'image', '智能问答界面', 4),
(UUID(), 'prj-coach-001', '数据治理.png', '/uploads/projects/prj-coach-001/数据治理.png', 456789, 'image/png', 'image', '数据治理架构', 5),
(UUID(), 'prj-coach-001', '测试平台.png', '/uploads/projects/prj-coach-001/测试平台.png', 345678, 'image/png', 'image', ' 测试平台', 6);
-- 项目3：乾·乐 的图片附件
INSERT INTO `ProjectAttachment` (`id`, `project_id`, `file_name`, `file_path`, `file_size`, `mime_type`, `type`, `description`, `sort_order`) VALUES
(UUID(), 'prj-music-001', '音乐会海报.png', '/uploads/projects/prj-music-001/宣传海报.png', 789012, 'image/png', 'image', '平声·和鸣实验音乐会海报', 1),
(UUID(), 'prj-music-001', '线谱转简谱验证样例.png', '/uploads/projects/prj-music-001/简谱转换.png', 567890, 'image/png', 'image', '线谱转简谱功能研发阶段验证样例', 2),
(UUID(), 'prj-music-001', '五线谱PDF分析样例.png', '/uploads/projects/prj-music-001/五线谱分析案例.png', 678901, 'image/png', 'image', '使用CV对五线谱PDF进行分析的样例', 3),
(UUID(), 'prj-music-001', '梁祝改编实验版.png', '/uploads/projects/prj-music-001/人工智能大会.png', 456789, 'image/png', 'image', '11.15人工智能大会成功演绎《梁祝》改编实验版', 4);

-- 项目4：元宇宙智慧校园 的图片附件
INSERT INTO `ProjectAttachment` (`id`, `project_id`, `file_name`, `file_path`, `file_size`, `mime_type`, `type`, `description`, `sort_order`) VALUES
(UUID(), 'prj-metaverse-001', '智慧教室场景.png', '/uploads/projects/prj-metaverse-001/元宇宙教室.png', 890123, 'image/png', 'image', '系统中的多功能智慧教室场景，支持在线互动研讨与沉浸式线上教学', 1),
(UUID(), 'prj-metaverse-001', '课堂应用截图.png', '/uploads/projects/prj-metaverse-001/教学平台.png', 678901, 'image/png', 'image', '系统已在人大新生研讨课中作为教学平台投入使用', 2),
(UUID(), 'prj-metaverse-001', '获奖证书.png', '/uploads/projects/prj-metaverse-001/奖状.png', 345678, 'image/png', 'image', '获第十届"创客中国"元宇宙中小企业创新创业大赛创业组优胜奖', 3);