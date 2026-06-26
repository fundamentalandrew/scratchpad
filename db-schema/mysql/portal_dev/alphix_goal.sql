CREATE TABLE `alphix_goal` (
  `uuid` varchar(36) NOT NULL,
  `clientUuid` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `eventCode` varchar(100) DEFAULT NULL,
  `eventValue` varchar(100) DEFAULT NULL,
  `cleanPageUrlId` int(10) unsigned DEFAULT NULL,
  `pageMinDurationSecond` mediumint(5) unsigned DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `alphix_goal_clientUuid_name_uniq_IDX` (`clientUuid`,`name`) USING BTREE,
  KEY `alphix_goal_clientUuid_IDX` (`clientUuid`) USING BTREE,
  KEY `alphix_goal_name_IDX` (`name`) USING BTREE,
  KEY `alphix_goal_eventCode_IDX` (`eventCode`) USING BTREE,
  KEY `alphix_goal_eventValue_IDX` (`eventValue`) USING BTREE,
  KEY `alphix_goal_cleanPageUrlId_IDX` (`cleanPageUrlId`) USING BTREE,
  KEY `alphix_goal_pageMinDurationSecond_IDX` (`pageMinDurationSecond`) USING BTREE,
  KEY `alphix_goal_createdAt_IDX` (`createdAt`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
