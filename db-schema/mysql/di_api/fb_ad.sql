CREATE TABLE `fb_ad` (
  `ad_id` bigint(20) unsigned NOT NULL,
  `account_id` bigint(20) unsigned NOT NULL,
  `adset_id` bigint(20) unsigned NOT NULL,
  `creative_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_ad_id` bigint(20) unsigned DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_time` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`ad_id`),
  KEY `account_id` (`account_id`),
  KEY `status` (`status`),
  KEY `adset_id` (`adset_id`),
  KEY `creative_id` (`creative_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
