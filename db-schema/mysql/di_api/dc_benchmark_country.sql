CREATE TABLE `dc_benchmark_country` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `siteId` int(11) NOT NULL,
  `country` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clientType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `impressions` int(11) NOT NULL,
  `clicks` int(11) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `viewable_impressions` int(11) NOT NULL,
  `measurable_impressions` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `countryUnique` (`date`,`siteId`,`clientType`,`country`),
  KEY `country` (`country`),
  KEY `clientType` (`clientType`),
  KEY `date` (`date`)
) ENGINE=InnoDB AUTO_INCREMENT=2015604 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
