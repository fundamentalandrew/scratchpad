CREATE TABLE `ax_line_item_targeting_expression` (
  `createDate` date DEFAULT NULL,
  `updateDate` date DEFAULT NULL,
  `active` tinyint(4) DEFAULT '0',
  `alternativeId` varchar(255) DEFAULT NULL,
  `notes` longtext,
  `name` varchar(255) DEFAULT NULL,
  `guaranteed` tinyint(4) DEFAULT NULL,
  `accountId` int(10) unsigned DEFAULT NULL,
  `modules` json DEFAULT NULL,
  `targetingExpressionId` int(11) NOT NULL,
  UNIQUE KEY `ax_line_item_targeting_expression_targetingExpressionId_IDX` (`targetingExpressionId`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
