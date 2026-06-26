CREATE TABLE `onehelp_article_category` (
  `onehelp_category_id` int(10) unsigned NOT NULL,
  `onehelp_article_id` int(10) unsigned NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`onehelp_category_id`,`onehelp_article_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
