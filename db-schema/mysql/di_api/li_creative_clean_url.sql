CREATE TABLE `li_creative_clean_url` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `creative_id` bigint(20) unsigned NOT NULL,
  `url_clean_id` int(10) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `creative_id,url_clean_id` (`creative_id`,`url_clean_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=9179 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
