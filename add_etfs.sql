-- ========================================================================
-- 添加ETF到监控列表
-- ========================================================================

INSERT INTO `watchlist` (`userId`, `symbol`, `name`, `market`)
SELECT 1, '159380.SZ', 'A500ETF东财', 'A股' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `watchlist` WHERE `symbol` = '159380.SZ');

INSERT INTO `watchlist` (`userId`, `symbol`, `name`, `market`)
SELECT 1, '159530.SZ', '机器人ETF易方达', 'A股' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `watchlist` WHERE `symbol` = '159530.SZ');

INSERT INTO `watchlist` (`userId`, `symbol`, `name`, `market`)
SELECT 1, '159742.SZ', '恒指科技ETF博时', 'A股' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `watchlist` WHERE `symbol` = '159742.SZ');

INSERT INTO `watchlist` (`userId`, `symbol`, `name`, `market`)
SELECT 1, '159915.SZ', '创业板ETF易方达', 'A股' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `watchlist` WHERE `symbol` = '159915.SZ');

INSERT INTO `watchlist` (`userId`, `symbol`, `name`, `market`)
SELECT 1, '510300.SS', '沪深300ETF华泰柏瑞', 'A股' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `watchlist` WHERE `symbol` = '510300.SS');

INSERT INTO `watchlist` (`userId`, `symbol`, `name`, `market`)
SELECT 1, '589850.SS', '科创50ETF东财', 'A股' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `watchlist` WHERE `symbol` = '589850.SS');

-- 验证插入结果
SELECT id, symbol, name, market FROM `watchlist` WHERE `symbol` IN (
  '159380.SZ', '159530.SZ', '159732.SZ', '159915.SZ', '510300.SS', '589850.SS'
);