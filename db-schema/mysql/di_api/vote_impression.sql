CREATE TABLE `vote_impression` (
  `id` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `question_id` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `ip` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `viewed` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `viewed` (`viewed`),
  KEY `question_id` (`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
