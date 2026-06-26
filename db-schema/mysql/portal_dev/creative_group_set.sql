CREATE TABLE `creative_group_set` (
  `creative_group_id` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `creative_set_id` int(10) unsigned NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`creative_group_id`,`creative_set_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
