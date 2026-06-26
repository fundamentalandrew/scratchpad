CREATE TABLE `dcs_campaign` (
  `id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `agency_id` bigint(20) unsigned NOT NULL,
  `advertiser_id` bigint(20) unsigned NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `delivery_method` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `account_id` bigint(20) unsigned DEFAULT NULL,
  `account_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `campaign_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `name` (`name`),
  KEY `status` (`status`),
  KEY `advertiser_id` (`advertiser_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
