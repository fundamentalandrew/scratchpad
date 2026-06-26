CREATE TABLE `request_log_params` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `reqMasterId` int(10) unsigned DEFAULT NULL,
  `reqParamName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reqParamValue` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `request_log_params_id_unique` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=26110 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
