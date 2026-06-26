CREATE TABLE `dc_benchmark_size` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `siteId` int(11) NOT NULL,
  `size` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clientType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `impressions` int(11) NOT NULL,
  `viewable_impressions` int(11) NOT NULL,
  `clicks` int(11) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `measurable_impressions` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sizeUnique` (`date`,`size`,`siteId`,`clientType`),
  KEY `size` (`size`),
  KEY `clientType` (`clientType`),
  KEY `date` (`date`)
) ENGINE=InnoDB AUTO_INCREMENT=161149 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
