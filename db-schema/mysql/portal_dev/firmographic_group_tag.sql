CREATE TABLE `firmographic_group_tag` (
  `firmographic_group_id` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `tag` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`firmographic_group_id`,`tag`),
  KEY `firmographic_group_id_idx` (`firmographic_group_id`),
  KEY `tag_idx` (`tag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
