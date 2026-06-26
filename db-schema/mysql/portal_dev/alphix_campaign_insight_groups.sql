CREATE TABLE `alphix_campaign_insight_groups` (
  `uuid` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `creator` int(10) unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `conjunction` mediumtext COLLATE utf8mb4_unicode_520_ci,
  `status` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT 'live',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`uuid`),
  KEY `creator` (`creator`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
