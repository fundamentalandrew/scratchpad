CREATE TABLE `creative_set_creative` (
  `creative_set_id` int(10) unsigned NOT NULL,
  `creative_type` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `creative_id` int(10) unsigned NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`creative_set_id`,`creative_type`,`creative_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
