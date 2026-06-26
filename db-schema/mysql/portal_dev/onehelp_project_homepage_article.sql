CREATE TABLE `onehelp_project_homepage_article` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_code` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `order` tinyint(3) unsigned NOT NULL,
  `onehelp_category_id` int(10) unsigned DEFAULT NULL,
  `onehelp_article_id` int(10) unsigned DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_code_order` (`project_code`,`order`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
