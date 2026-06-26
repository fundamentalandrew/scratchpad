CREATE TABLE `templates_pages` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `templateId` int(10) unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `thumb` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` mediumtext COLLATE utf8mb4_unicode_ci,
  `order` tinyint(3) unsigned NOT NULL,
  `isActive` tinyint(3) unsigned NOT NULL,
  `isDelete` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `templates_pages_id_unique` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
