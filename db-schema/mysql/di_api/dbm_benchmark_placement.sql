CREATE TABLE `dbm_benchmark_placement` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `siteDbmId` bigint(20) NOT NULL,
  `placementId` int(11) NOT NULL,
  `clientType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `impressions` bigint(20) NOT NULL,
  `clicks` int(11) NOT NULL,
  `viewable_impressions` bigint(20) NOT NULL,
  `measurable_impressions` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `placementUnique` (`date`,`clientType`,`siteDbmId`,`placementId`),
  KEY `placementId` (`placementId`),
  KEY `clientType` (`clientType`),
  KEY `date` (`date`)
) ENGINE=InnoDB AUTO_INCREMENT=6417646 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
