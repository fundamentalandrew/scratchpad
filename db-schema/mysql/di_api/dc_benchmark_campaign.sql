CREATE TABLE `dc_benchmark_campaign` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `siteId` int(11) NOT NULL,
  `campaignId` int(11) NOT NULL,
  `clientType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `impressions` int(11) NOT NULL,
  `clicks` int(11) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `viewable_impressions` int(11) NOT NULL,
  `measurable_impressions` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `campaignUnique` (`date`,`siteId`,`clientType`,`campaignId`),
  KEY `campaignId` (`campaignId`),
  KEY `clientType` (`clientType`),
  KEY `date` (`date`)
) ENGINE=InnoDB AUTO_INCREMENT=118382 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
