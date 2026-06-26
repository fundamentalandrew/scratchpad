CREATE TABLE `client_link` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `client_uuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `link_type` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `link_id` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `client_office_id` int(10) unsigned NOT NULL,
  `type` varchar(20) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `linkUnique` (`client_uuid`,`client_office_id`,`link_type`,`link_id`),
  KEY `client_uuid` (`client_uuid`),
  KEY `link_type` (`link_type`),
  KEY `link_id` (`link_id`),
  KEY `client_office_id` (`client_office_id`)
) ENGINE=InnoDB AUTO_INCREMENT=284651 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
