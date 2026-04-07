USE research_system;
-- 与 sample_data.sql 一致：明文密码 123456（bcrypt）
UPDATE `User` SET password = '$2b$10$bvmvtUaa/wW29fvCSDUYdOj/c5KPhUowfzsTV/QkJRQ56VqWvfI1S';
SELECT username, name, role, LEFT(password, 20) AS pwd_prefix FROM `User`;
