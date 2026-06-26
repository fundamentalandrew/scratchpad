CREATE TABLE `ga_v4_account` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `account_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `region_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `google_created` datetime NOT NULL,
  `google_updated` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'live',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `account_id` (`account_id`),
  KEY `status` (`status`) USING BTREE,
  KEY `display_name` (`display_name`) USING BTREE,
  KEY `region_code` (`region_code`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=516637 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
