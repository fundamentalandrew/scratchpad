CREATE TABLE `creative_campaign` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `client_uuid` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `creator` int(10) unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `name` (`name`),
  KEY `created_at` (`created_at`),
  KEY `client_uuid` (`client_uuid`),
  KEY `creator` (`creator`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
