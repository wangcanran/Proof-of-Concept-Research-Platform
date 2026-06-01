-- 经费申请来源：申请人提交待审 / 经费管理员直接登记
-- 在目标库执行一次；若列已存在会报错，可忽略

ALTER TABLE `FundsRequest`
  ADD COLUMN `submission_type` ENUM('applicant_request', 'manager_direct') NOT NULL DEFAULT 'applicant_request'
  COMMENT '提交方式：申请人申请待审 / 管理员直接登记（免审）'
  AFTER `applicant_id`;
