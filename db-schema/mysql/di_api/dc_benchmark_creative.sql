CREATE TABLE `dc_benchmark_creative` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `siteId` int(11) NOT NULL,
  `creativeId` int(11) NOT NULL,
  `clientType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `impressions` int(11) NOT NULL,
  `clicks` int(11) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `viewable_impressions` int(11) NOT NULL,
  `measurable_impressions` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `creativeUnique` (`date`,`siteId`,`clientType`,`creativeId`),
  KEY `creativeId` (`creativeId`),
  KEY `clientType` (`clientType`),
  KEY `date` (`date`)
) ENGINE=InnoDB AUTO_INCREMENT=832428 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
