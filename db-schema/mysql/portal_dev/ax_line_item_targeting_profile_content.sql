CREATE TABLE `ax_line_item_targeting_profile_content` (
  `ax_line_item_id` int(10) unsigned NOT NULL,
  `targeting_profile_content_id` int(10) unsigned NOT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`ax_line_item_id`,`targeting_profile_content_id`),
  KEY `targeting_profile_content_id` (`targeting_profile_content_id`),
  CONSTRAINT `ax_line_item_targeting_profile_content_ibfk_1` FOREIGN KEY (`targeting_profile_content_id`) REFERENCES `targeting_profile_content` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
