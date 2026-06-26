CREATE TABLE `vote_answer` (
  `id` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `question_id` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `ip` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `vote` int(11) NOT NULL,
  `voted` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `voted` (`voted`),
  KEY `question_id` (`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
