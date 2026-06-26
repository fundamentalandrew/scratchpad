CREATE TABLE `alphix_engagement_landing_page` (
  `aaUuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cleanUrl` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mediaTeamAssessment` tinyint(1) unsigned NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`aaUuid`,`cleanUrl`),
  KEY `idx_aaUuid_cleanUrl` (`aaUuid`,`cleanUrl`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
