CREATE TABLE `campaign_log_message` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `campaign_log_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `message` mediumtext,
  `created_at` timestamp NULL DEFAULT NULL,
  KEY `PRIMARY KEY` (`id`) USING BTREE,
  KEY `campaign_log_id` (`campaign_log_id`),
  KEY `user_id` (`user_id`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=28592 DEFAULT CHARSET=utf8mb4;
