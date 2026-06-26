CREATE TABLE `onehelp_article` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `content` text COLLATE utf8_unicode_ci,
  `link` varchar(2048) COLLATE utf8_unicode_ci DEFAULT NULL,
  `fundamentalOnly` tinyint(1) NOT NULL,
  `status` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `search` text COLLATE utf8_unicode_ci,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `title` (`title`),
  KEY `status` (`status`),
  KEY `fundamentalOnly` (`fundamentalOnly`),
  FULLTEXT KEY `search` (`search`)
) ENGINE=InnoDB AUTO_INCREMENT=200 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
