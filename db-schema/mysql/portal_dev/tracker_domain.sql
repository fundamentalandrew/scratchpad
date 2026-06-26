CREATE TABLE `tracker_domain` (
  `domain_id` int(10) unsigned NOT NULL,
  `analytics_type` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `analytics_ref` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`domain_id`),
  KEY `analytics_ref` (`analytics_ref`),
  KEY `analytics_type` (`analytics_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
