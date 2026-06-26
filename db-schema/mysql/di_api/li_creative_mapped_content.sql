CREATE TABLE `li_creative_mapped_content` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `creative_id` int(10) unsigned NOT NULL,
  `reference` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `click_url` text COLLATE utf8mb4_unicode_520_ci,
  `creative_name` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `creative_type` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL COMMENT 'New creative_type map following LinkedIn rules',
  `creative_type_status` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL COMMENT 'Reason for creative_type not being mapped',
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `unique_creative` (`creative_id`) USING BTREE,
  KEY `reference` (`reference`)
) ENGINE=InnoDB AUTO_INCREMENT=230751465 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
