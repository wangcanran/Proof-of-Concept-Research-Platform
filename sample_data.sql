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