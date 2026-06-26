CREATE TABLE `alert_user` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `alert_id` int(10) unsigned NOT NULL,
  `user_id` int(10) unsigned NOT NULL,
  `escalation_iteration` int(10) unsigned NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `alert_id` (`alert_id`),
  KEY `user_id` (`user_id`),
  KEY `escalation_iteration` (`escalation_iteration`)
) ENGINE=InnoDB AUTO_INCREMENT=128863 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
