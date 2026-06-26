CREATE TABLE `event_consent` (
  `uuid` varchar(36) NOT NULL,
  `clientUuid` varchar(36) NOT NULL,
  `type` varchar(50) NOT NULL,
  `reference` varchar(355) NOT NULL,
  `status` varchar(20) NOT NULL,
  `eventTagConsentShown` json NOT NULL,
  `eventTagConsentPassed` json NOT NULL,
  `pageReloadOnConsentPass` tinyint(1) NOT NULL,
  `enabledOn` date DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`uuid`),
  KEY `clientUuid` (`clientUuid`) USING BTREE,
  KEY `type` (`type`) USING BTREE,
  KEY `status` (`status`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
