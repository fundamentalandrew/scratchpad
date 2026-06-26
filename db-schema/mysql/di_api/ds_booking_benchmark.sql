CREATE TABLE `ds_booking_benchmark` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `media_type` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `client_type` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `region` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `budget_code` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT 'GBP',
  `cost` decimal(15,5) NOT NULL DEFAULT '0.00000',
  `agency_fee_percentage` decimal(15,5) NOT NULL DEFAULT '0.00000',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `date_media_type_client_type_region_budget_code` (`date`,`media_type`,`client_type`,`region`,`budget_code`,`currency`) USING BTREE,
  KEY `date` (`date`) USING BTREE,
  KEY `client_type` (`client_type`) USING BTREE,
  KEY `region` (`region`) USING BTREE,
  KEY `budget_code` (`budget_code`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=22283968 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
