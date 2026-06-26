CREATE TABLE `dc_benchmark_placement` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `siteId` int(11) NOT NULL,
  `placementId` int(11) NOT NULL,
  `clientType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `impressions` int(11) NOT NULL,
  `clicks` int(11) NOT NULL,
  `viewable_impressions` int(11) NOT NULL,
  `measurable_impressions` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `placementUnique` (`date`,`clientType`,`siteId`,`placementId`),
  KEY `placementId` (`placementId`),
  KEY `clientType` (`clientType`),
  KEY `date` (`date`)
) ENGINE=InnoDB AUTO_INCREMENT=1113650 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
