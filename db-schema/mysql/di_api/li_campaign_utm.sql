CREATE TABLE `li_campaign_utm` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `linkedin_campaign_id` int(10) unsigned NOT NULL,
  `dynamic_parameter_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dynamic_parameter_value` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `excluded` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=226521 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
