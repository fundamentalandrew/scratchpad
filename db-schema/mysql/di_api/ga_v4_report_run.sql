CREATE TABLE `ga_v4_report_run` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `report_reference` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `property_id` bigint(20) unsigned NOT NULL,
  `date` date NOT NULL,
  `created_at` date NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `report_reference` (`report_reference`) USING BTREE,
  KEY `date` (`date`) USING BTREE,
  KEY `property_id` (`property_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=685600 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
