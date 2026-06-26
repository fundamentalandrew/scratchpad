CREATE TABLE `ax_creative_line_item` (
  `cliId` int(10) unsigned NOT NULL,
  `accountId` int(10) unsigned NOT NULL,
  `creativeId` int(10) unsigned NOT NULL,
  `lineItemId` int(10) unsigned NOT NULL,
  `weighting` int(10) unsigned DEFAULT NULL,
  `startDate` date DEFAULT NULL,
  `endDate` date DEFAULT NULL,
  `createDate` datetime NOT NULL,
  `updateDate` datetime NOT NULL,
  `active` tinyint(1) NOT NULL,
  `syncd` datetime NOT NULL,
  PRIMARY KEY (`cliId`),
  KEY `accountId` (`accountId`),
  KEY `creativeId` (`creativeId`),
  KEY `lineItemId` (`lineItemId`),
  KEY `active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
