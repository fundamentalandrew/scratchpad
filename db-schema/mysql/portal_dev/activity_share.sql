CREATE TABLE `activity_share` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `aa_uuid` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `shared_with` int(11) NOT NULL,
  `shared_by` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `aa_uuid` (`aa_uuid`),
  KEY `shared_with` (`shared_with`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=3046 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
