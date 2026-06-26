CREATE TABLE `li_report_run` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `report_reference` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `token_user_id` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `date` date NOT NULL,
  `account_id` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `runUnique` (`report_reference`,`token_user_id`,`account_id`,`date`),
  KEY `report_reference` (`report_reference`),
  KEY `token_user_id` (`token_user_id`),
  KEY `date` (`date`),
  KEY `account_id` (`account_id`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=134420838 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
