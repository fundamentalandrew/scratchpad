CREATE TABLE `dc_placement_clean_url` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `placement_id` int(11) NOT NULL,
  `creative_id` int(11) NOT NULL,
  `url_clean_id` int(10) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `placement_id_creative_id_url_clean_id` (`placement_id`,`creative_id`,`url_clean_id`)
) ENGINE=InnoDB AUTO_INCREMENT=349703 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
