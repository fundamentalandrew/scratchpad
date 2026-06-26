CREATE TABLE `activity_optimisation` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `aa_uuid` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `date` date NOT NULL,
  `metric` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `userId` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `note` text COLLATE utf8_unicode_ci,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `current_account_id` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `channel` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `metric` (`metric`),
  KEY `userId` (`userId`),
  KEY `created_at` (`created_at`),
  KEY `aa_uuid` (`aa_uuid`),
  KEY `current_account_id` (`current_account_id`),
  KEY `date` (`date`)
) ENGINE=InnoDB AUTO_INCREMENT=4583 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
