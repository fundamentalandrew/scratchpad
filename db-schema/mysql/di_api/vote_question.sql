CREATE TABLE `vote_question` (
  `id` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `ad_question` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `ad_result` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `ad_answer` json DEFAULT NULL COMMENT '(DC2Type:json)',
  `total_vote` int(11) DEFAULT NULL,
  `total_voter` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `client_id` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `total_vote` (`total_vote`),
  KEY `total_voter` (`total_voter`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
