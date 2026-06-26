CREATE TABLE `ax_line_item_targeting_profile_product_overlay` (
  `ax_line_item_id` int(10) unsigned NOT NULL,
  `targeting_profile_product_overlay_id` int(10) unsigned NOT NULL,
  `overlay_data_id` int(10) unsigned NOT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`ax_line_item_id`,`targeting_profile_product_overlay_id`,`overlay_data_id`),
  KEY `targeting_profile_product_overlay_id` (`targeting_profile_product_overlay_id`),
  CONSTRAINT `ax_line_item_targeting_profile_product_overlay_ibfk_1` FOREIGN KEY (`targeting_profile_product_overlay_id`) REFERENCES `targeting_profile_product_overlay` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
