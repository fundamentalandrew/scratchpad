CREATE TABLE `dc_benchmark_audience` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `siteId` int(11) NOT NULL,
  `audience` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clientType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `impressions` int(11) NOT NULL,
  `viewable_impressions` int(11) NOT NULL,
  `clicks` int(11) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `measurable_impressions` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `audienceUnique` (`date`,`audience`,`siteId`,`clientType`),
  KEY `audience` (`audience`),
  KEY `clientType` (`clientType`),
  KEY `date` (`date`)
) ENGINE=InnoDB AUTO_INCREMENT=64103 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
