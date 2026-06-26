CREATE TABLE `dc_benchmark_opportunity` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `siteId` int(11) NOT NULL,
  `opportunity` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clientType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `impressions` int(11) NOT NULL,
  `viewable_impressions` int(11) NOT NULL,
  `clicks` int(11) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `measurable_impressions` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `opportunityUnique` (`date`,`opportunity`,`siteId`,`clientType`),
  KEY `opportunity` (`opportunity`),
  KEY `clientType` (`clientType`),
  KEY `date` (`date`)
) ENGINE=InnoDB AUTO_INCREMENT=44901 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
