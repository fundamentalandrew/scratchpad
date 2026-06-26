CREATE TABLE `dbm_insertion_orders_targeting` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `insertionOrderId` bigint(20) unsigned NOT NULL,
  `type` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `include_exclude` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `targeting` longtext COLLATE utf8_unicode_ci,
  `updated_at` datetime DEFAULT NULL,
  `accountId` int(10) unsigned DEFAULT NULL,
  `profileId` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `accountId` (`accountId`),
  KEY `profileId` (`profileId`)
) ENGINE=InnoDB AUTO_INCREMENT=256202208 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
