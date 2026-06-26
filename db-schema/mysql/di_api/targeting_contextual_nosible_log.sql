CREATE TABLE `targeting_contextual_nosible_log` (
  `targetingContextualProfileId` bigint(20) unsigned NOT NULL,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `urlPath` varchar(3000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `similarity` decimal(10,8) DEFAULT NULL,
  `date` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `source` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hash` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `term` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `segmentKey` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `urlStatus` tinyint(1) DEFAULT '1',
  KEY `idx_urlPath` (`urlPath`(255)),
  KEY `idx_targetingContextualProfileId` (`targetingContextualProfileId`),
  KEY `idx_segmentKey` (`segmentKey`),
  KEY `idx_term` (`term`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
