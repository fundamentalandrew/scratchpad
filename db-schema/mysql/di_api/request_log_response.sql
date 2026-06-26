CREATE TABLE `request_log_response` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `reqMasterId` int(10) unsigned DEFAULT NULL,
  `reqResContentType` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reqResCode` int(10) unsigned DEFAULT NULL,
  `reqResStatus` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reqResBodyPlain` mediumtext COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `request_log_response_id_unique` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3993 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
