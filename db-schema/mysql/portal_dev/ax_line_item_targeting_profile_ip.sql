CREATE TABLE `ax_line_item_targeting_profile_ip` (
  `ax_line_item_id` int(10) unsigned NOT NULL,
  `targeting_profile_ip_id` int(10) unsigned NOT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`ax_line_item_id`,`targeting_profile_ip_id`),
  KEY `targeting_profile_ip_id` (`targeting_profile_ip_id`),
  CONSTRAINT `ax_line_item_targeting_profile_ip_ibfk_1` FOREIGN KEY (`targeting_profile_ip_id`) REFERENCES `targeting_profile_ip` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
