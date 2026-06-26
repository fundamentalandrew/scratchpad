CREATE TABLE `alphix_actions` (
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clientUuid` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gicsCode` int(10) unsigned DEFAULT NULL,
  `domainIdList` mediumtext COLLATE utf8mb4_unicode_ci,
  `topicUuid` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date` date NOT NULL,
  `type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'event',
  `name` varchar(250) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` mediumtext COLLATE utf8mb4_unicode_ci,
  `creator` int(10) unsigned DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`uuid`) USING BTREE,
  KEY `clientUuid` (`clientUuid`) USING BTREE,
  KEY `gicsCode` (`gicsCode`) USING BTREE,
  KEY `date` (`date`) USING BTREE,
  KEY `topicUuid` (`topicUuid`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
