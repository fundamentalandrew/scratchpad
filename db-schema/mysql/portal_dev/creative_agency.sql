CREATE TABLE `creative_agency` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `creator` int(10) unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `location` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `client_uuid` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `creator` (`creator`),
  KEY `name` (`name`),
  KEY `location` (`location`),
  KEY `created_at` (`created_at`),
  KEY `client_uuid` (`client_uuid`)
) ENGINE=InnoDB AUTO_INCREMENT=88 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
