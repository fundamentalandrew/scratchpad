CREATE TABLE `campaign_log` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `metric` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `user_id` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `title` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8_unicode_ci,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `type` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `temp_message_id` int(10) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `date` (`date`),
  KEY `metric` (`metric`),
  KEY `created_at` (`created_at`),
  KEY `type` (`type`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=37218 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
