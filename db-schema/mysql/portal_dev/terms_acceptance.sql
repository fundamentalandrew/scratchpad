CREATE TABLE `terms_acceptance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `type` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `version` int(10) unsigned NOT NULL,
  `accepted_at` datetime DEFAULT NULL,
  `clientUuid` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `termsAcceptanceUnique` (`user_id`,`version`,`type`,`clientUuid`)
) ENGINE=InnoDB AUTO_INCREMENT=802 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
