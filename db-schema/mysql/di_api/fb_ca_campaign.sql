CREATE TABLE `fb_ca_campaign` (
  `campaign_id` bigint(20) unsigned NOT NULL,
  `bookingUniqueNumber` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `runIndex` int(11) NOT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`campaign_id`,`bookingUniqueNumber`),
  KEY `campaign_id` (`campaign_id`) USING BTREE,
  KEY `bookingUniqueNumber` (`bookingUniqueNumber`) USING BTREE,
  KEY `runIndex` (`runIndex`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
