CREATE TABLE `alphix_topic_cluster` (
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `adminClientUuidList` text COLLATE utf8mb4_unicode_ci,
  `clientUuid` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gicsCode` int(10) unsigned DEFAULT NULL,
  `creator` int(10) unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `conjunction` mediumtext COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'live',
  `accessLevel` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'private',
  PRIMARY KEY (`uuid`),
  KEY `clientUuid` (`clientUuid`),
  KEY `gicsCode` (`gicsCode`),
  KEY `creator` (`creator`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
