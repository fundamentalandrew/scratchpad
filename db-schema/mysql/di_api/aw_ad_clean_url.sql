CREATE TABLE `aw_ad_clean_url` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `ad_id` bigint(20) unsigned NOT NULL,
  `url_clean_id` int(10) unsigned NOT NULL,
  `campaign_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `ad_id,url_clean_id` (`ad_id`,`url_clean_id`) USING BTREE,
  KEY `campaign_id` (`campaign_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11919631 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
