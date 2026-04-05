USE research_system;
UPDATE `User` SET password = '$2b$10$qiYskpd.W0PMHtLFHj725eMR5h6ES92iSMb.7LtFIi68GD5RKjRMO';
SELECT username, name, role, LEFT(password, 10) as pwd_prefix FROM `User`;
