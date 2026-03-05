-- ========================================================================
-- Login System Migration Script
-- 请按顺序执行以下 SQL
-- ========================================================================

-- ==================== 1. 创建 users 表 ====================
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `passwordHash` VARCHAR(255) NOT NULL,
  `displayName` VARCHAR(100) NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'user',
  `isActive` TINYINT NOT NULL DEFAULT 1,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `IDX_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==================== 2. 创建 login_attempts 表 ====================
CREATE TABLE IF NOT EXISTS `login_attempts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `success` TINYINT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `IDX_login_attempts_username` (`username`),
  INDEX `IDX_login_attempts_createdAt` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==================== 3. 插入管理员用户 ====================
-- 用户名: ming.xu  密码: Shopee123 (bcrypt hash, cost=10)
INSERT INTO `users` (`username`, `passwordHash`, `displayName`, `role`, `isActive`)
SELECT 'ming.xu',
       '$2b$10$/qGFU6U1F1Rq/GP3zey4nOeEvZJOOwhxaIrb.mnLrWddMRGc9KQ.G',
       'Ming Xu',
       'admin',
       1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `users` WHERE `username` = 'ming.xu');

-- 用户名: admin  密码: Shopee123 (bcrypt hash, cost=10)
INSERT INTO `users` (`username`, `passwordHash`, `displayName`, `role`, `isActive`)
SELECT 'admin',
       '$2b$10$FEpXUJW5vQqciFYW1PtlZO4l5f5u5Hvn.q0QSeESwJTU2kuFauHTG',
       'Admin',
       'admin',
       1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `users` WHERE `username` = 'admin');

-- ==================== 4. 现有表添加 userId 列 ====================

-- watchlist 表
ALTER TABLE `watchlist` ADD COLUMN `userId` INT NOT NULL DEFAULT 1;
-- 删除旧的 symbol 唯一索引（名称可能不同，先查再删）
-- 如果报错说索引不存在，可以忽略
ALTER TABLE `watchlist` DROP INDEX `IDX_2be82bfbec1e3b8b20e1215e02`;
ALTER TABLE `watchlist` ADD UNIQUE INDEX `IDX_watchlist_user_symbol` (`userId`, `symbol`);

-- alert_rules 表
ALTER TABLE `alert_rules` ADD COLUMN `userId` INT NOT NULL DEFAULT 1;

-- alert_history 表
ALTER TABLE `alert_history` ADD COLUMN `userId` INT NOT NULL DEFAULT 1;

-- screener_strategies 表
ALTER TABLE `screener_strategies` ADD COLUMN `userId` INT NOT NULL DEFAULT 1;

-- ==================== 5. 将所有旧数据关联到管理员(id=1) ====================
UPDATE `watchlist` SET `userId` = 1 WHERE `userId` = 0 OR `userId` IS NULL;
UPDATE `alert_rules` SET `userId` = 1 WHERE `userId` = 0 OR `userId` IS NULL;
UPDATE `alert_history` SET `userId` = 1 WHERE `userId` = 0 OR `userId` IS NULL;
UPDATE `screener_strategies` SET `userId` = 1 WHERE `userId` = 0 OR `userId` IS NULL;

-- ==================== 6. 验证 ====================
SELECT '--- users ---' AS info;
SELECT id, username, displayName, role, isActive FROM users;

SELECT '--- data counts ---' AS info;
SELECT 'watchlist' AS tbl, COUNT(*) AS total, SUM(userId = 1) AS admin_rows FROM watchlist
UNION ALL
SELECT 'alert_rules', COUNT(*), SUM(userId = 1) FROM alert_rules
UNION ALL
SELECT 'alert_history', COUNT(*), SUM(userId = 1) FROM alert_history
UNION ALL
SELECT 'screener_strategies', COUNT(*), SUM(userId = 1) FROM screener_strategies;
