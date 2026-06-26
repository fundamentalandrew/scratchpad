CREATE TABLE `ax_line_item_targeting_profile_firmo` (
  `ax_line_item_id` int(10) unsigned NOT NULL,
  `targeting_profile_firmo_id` int(10) unsigned NOT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`ax_line_item_id`,`targeting_profile_firmo_id`),
  KEY `targeting_profile_firmo_id` (`targeting_profile_firmo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
